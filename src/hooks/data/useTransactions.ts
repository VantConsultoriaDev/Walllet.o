import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import type { Transaction } from "@/components/financeiro/new-transaction-modal"
import { addMonths, format } from "date-fns" // Importando 'format'

export function useTransactions() {
    const { user } = useAuth()
    const { toast } = useToast()
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)
    const [isRefetching, setIsRefetching] = useState(false)

    // --- Core CRUD Functions (Defined first for stability) ---

    const updateTransaction = useCallback(async (updatedTransaction: Transaction) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        const { id, ...updateData } = updatedTransaction;
        
        // Ensure amount is a number before formatting
        const numericAmount = typeof updatedTransaction.amount === 'number' ? updatedTransaction.amount : parseFloat(updatedTransaction.amount as any);

        const { error } = await supabase
            .from('transactions')
            .update({
                ...updateData,
                amount: numericAmount.toFixed(2),
                // CORREÇÃO: Usar format para garantir YYYY-MM-DD local
                date: format(updatedTransaction.date, 'yyyy-MM-dd'),
            })
            .eq('id', id)
            .select()

        if (error) {
            console.error("Erro ao atualizar transação:", error);
            toast({ title: "Erro", description: "Falha ao atualizar transação.", variant: "destructive" })
            return { error }
        }

        setTransactions(prev => prev.map(t => t.id === id ? updatedTransaction : t))
        // Note: We skip the toast here if called internally by addExpectedCommissionTransaction
        if (!updatedTransaction.description.includes("Comissão Esperada Boleto")) {
            toast({ title: "Sucesso", description: "Transação atualizada com sucesso." })
        }
        return { data: updatedTransaction }
    }, [user, toast])

    const deleteTransaction = useCallback(async (id: string) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', id)

        if (error) {
            console.error("Erro ao excluir transação:", error);
            toast({ title: "Erro", description: "Falha ao excluir transação.", variant: "destructive" })
            return { error }
        }

        setTransactions(prev => prev.filter(t => t.id !== id))
        toast({ title: "Sucesso", description: "Transação excluída com sucesso." })
        return { data: true }
    }, [user, toast])

    // --- Fetching Logic ---

    const fetchTransactions = useCallback(async () => {
        if (!user) {
            setLoading(false)
            console.log("fetchTransactions: User not authenticated.")
            return
        }

        console.log("fetchTransactions: Starting data fetch...")

        // Only show full loading spinner if the list is empty
        if (transactions.length === 0) {
            setLoading(true)
        } else {
            setIsRefetching(true)
        }

        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false })

        if (error) {
            console.error("fetchTransactions Error:", error)
            toast({
                title: "Erro ao carregar transações",
                description: error.message,
                variant: "destructive",
            })
            setTransactions([])
        } else {
            // Convert date strings back to Date objects
            const formattedData = data.map(t => ({
                ...t,
                date: new Date(t.date),
                amount: parseFloat(t.amount),
            })) as Transaction[]
            
            console.log(`fetchTransactions: Successfully loaded ${formattedData.length} transactions.`)
            formattedData.filter(t => t.category === 'Comissão Esperada').forEach(t => {
                console.log(`[Expected Commission] ID: ${t.id}, Date: ${t.date.toISOString().split('T')[0]}, Amount: ${t.amount}`);
            });

            setTransactions(formattedData)
        }
        setLoading(false)
        setIsRefetching(false)
    }, [user, toast, transactions.length]) // Mantendo transactions.length aqui para re-executar fetchTransactions quando o array muda

    useEffect(() => {
        fetchTransactions()
    }, [user, fetchTransactions])

    // --- Add Logic ---

    const addTransaction = useCallback(async (newTransaction: Omit<Transaction, 'id'>) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }
        
        // Ensure amount is a number before formatting
        const numericAmount = typeof newTransaction.amount === 'number' ? newTransaction.amount : parseFloat(newTransaction.amount as any);

        const { data, error } = await supabase
            .from('transactions')
            .insert({
                ...newTransaction,
                user_id: user.id,
                amount: numericAmount.toFixed(2), // Ensure amount is stored as numeric/string
                // CORREÇÃO: Usar format para garantir YYYY-MM-DD local
                date: format(newTransaction.date, 'yyyy-MM-dd'),
            })
            .select()
            .single()

        if (error) {
            console.error("Erro ao adicionar transação:", error);
            toast({ title: "Erro", description: "Falha ao adicionar transação.", variant: "destructive" })
            return { error }
        }

        const addedTransaction: Transaction = {
            ...data,
            date: new Date(data.date),
            amount: parseFloat(data.amount),
        }

        setTransactions(prev => [addedTransaction, ...prev])
        // Note: We skip the toast here if called from addCommissionTransaction to avoid spamming the user.
        return { data: addedTransaction }
    }, [user, toast])

    const addCommissionTransaction = useCallback(async (
        boletoId: string,
        clientName: string,
        amount: number,
        commissionDueDate: Date, // Data de vencimento da comissão confirmada
        representacaoId?: string,
        representacaoNome?: string
    ) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        // Verifica se a transação de comissão CONFIRMADA já existe para este boleto
        const descriptionPrefix = `Comissão Boleto #${boletoId}`;
        const commissionDateString = format(commissionDueDate, 'yyyy-MM-dd'); // Usando format
        
        // Usamos o estado atual de transactions (capturado pelo useCallback) para verificar a existência
        const existingTransaction = transactions.find(t => 
            t.description.includes(descriptionPrefix) && 
            format(t.date, 'yyyy-MM-dd') === commissionDateString && // Usando format para comparação
            t.category === 'Comissão' // Confirmação
        );

        if (existingTransaction) {
            console.log(`Comissão CONFIRMADA para Boleto #${boletoId} já existe. Pulando criação.`);
            return { data: existingTransaction };
        }
        
        const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount as any);

        const newTransaction: Omit<Transaction, 'id'> = {
            description: `${descriptionPrefix} - ${clientName}`,
            amount: numericAmount,
            type: "income",
            category: "Comissão", // Categoria para CONFIRMADA
            date: commissionDueDate, // Usa a data calculada
            isRecurrent: false,
            representacaoId: representacaoId,
            representacaoNome: representacaoNome,
        }

        const { data, error } = await supabase
            .from('transactions')
            .insert({
                ...newTransaction,
                user_id: user.id,
                amount: numericAmount.toFixed(2),
                date: format(newTransaction.date, 'yyyy-MM-dd'), // Usando format
            })
            .select()
            .single()

        if (error) {
            console.error("Falha ao adicionar transação de comissão:", error);
            return { error }
        }

        const addedTransaction: Transaction = {
            ...data,
            date: new Date(data.date),
            amount: parseFloat(data.amount),
        }

        // CRITICAL FIX: Adiciona ao estado local imediatamente
        setTransactions(prev => [addedTransaction, ...prev])
        
        return { data: addedTransaction }
    }, [user, transactions]) // Adicionando transactions como dependência para a verificação de existência
    
    const addExpectedCommissionTransaction = useCallback(async (
        boletoId: string,
        clientName: string,
        amount: number,
        expectedDueDate: Date, // Data de vencimento da comissão esperada
        representacaoId?: string,
        representacaoNome?: string
    ) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        // Verifica se a transação de comissão ESPERADA já existe para este boleto
        const descriptionPrefix = `Comissão Esperada Boleto #${boletoId}`;
        const expectedDateString = format(expectedDueDate, 'yyyy-MM-dd'); // Usando format
        
        const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount as any);

        // 1. Tenta encontrar uma transação existente com a mesma descrição e data
        let existingTransaction = transactions.find(t => 
            t.description.includes(descriptionPrefix) && 
            format(t.date, 'yyyy-MM-dd') === expectedDateString && // Usando format para comparação
            t.category === 'Comissão Esperada' // Nova categoria
        );

        if (existingTransaction) {
            // Se a transação esperada já existe, verifica se o valor mudou.
            if (existingTransaction.amount !== numericAmount) {
                // Se o valor mudou, atualiza a transação existente.
                const updatedTransaction = { ...existingTransaction, amount: numericAmount };
                // Chamada para a função de atualização definida acima
                await updateTransaction(updatedTransaction); 
                console.log(`Comissão ESPERADA para Boleto #${boletoId} atualizada.`);
                return { data: updatedTransaction };
            }
            // console.log(`Comissão ESPERADA para Boleto #${boletoId} já existe e valor é o mesmo. Pulando criação.`);
            return { data: existingTransaction };
        }

        const newTransaction: Omit<Transaction, 'id'> = {
            description: `${descriptionPrefix} - ${clientName}`,
            amount: numericAmount,
            type: "income",
            category: "Comissão Esperada", // Nova Categoria
            date: expectedDueDate,
            isRecurrent: false,
            representacaoId: representacaoId,
            representacaoNome: representacaoNome,
        }

        const { data, error } = await supabase
            .from('transactions')
            .insert({
                ...newTransaction,
                user_id: user.id,
                amount: numericAmount.toFixed(2),
                date: format(newTransaction.date, 'yyyy-MM-dd'), // Usando format
            })
            .select()
            .single()

        if (error) {
            console.error("Falha ao adicionar transação de comissão esperada:", error);
            return { error }
        }

        const addedTransaction: Transaction = {
            ...data,
            date: new Date(data.date),
            amount: parseFloat(data.amount),
        }

        setTransactions(prev => [addedTransaction, ...prev])
        return { data: addedTransaction }
    }, [user, transactions, updateTransaction]) // updateTransaction agora é uma dependência estável

    return { 
        transactions, 
        loading, 
        isRefetching, 
        fetchTransactions, 
        addTransaction, 
        addCommissionTransaction, 
        addExpectedCommissionTransaction, 
        updateTransaction, 
        deleteTransaction 
    }
}