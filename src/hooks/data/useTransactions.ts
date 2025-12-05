import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import type { Transaction } from "@/components/financeiro/new-transaction-modal"
import { addMonths } from "date-fns"

export function useTransactions() {
    const { user } = useAuth()
    const { toast } = useToast()
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)
    const [isRefetching, setIsRefetching] = useState(false)

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
            setTransactions(formattedData)
            console.log(`fetchTransactions: Successfully loaded ${formattedData.length} transactions.`)
        }
        setLoading(false)
        setIsRefetching(false)
    }, [user, toast, transactions.length]) // Mantendo transactions.length aqui para re-executar fetchTransactions quando o array muda

    useEffect(() => {
        fetchTransactions()
    }, [user, fetchTransactions])

    const addTransaction = useCallback(async (newTransaction: Omit<Transaction, 'id'>) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        const { data, error } = await supabase
            .from('transactions')
            .insert({
                ...newTransaction,
                user_id: user.id,
                amount: newTransaction.amount.toFixed(2), // Ensure amount is stored as numeric/string
                date: newTransaction.date.toISOString().split('T')[0], // Store date as YYYY-MM-DD
            })
            .select()
            .single()

        if (error) {
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
        const commissionDateString = commissionDueDate.toISOString().split('T')[0];

        // Usamos o estado atual de transactions (capturado pelo useCallback) para verificar a existência
        const existingTransaction = transactions.find(t => 
            t.description.includes(descriptionPrefix) && 
            t.date.toISOString().split('T')[0] === commissionDateString &&
            t.category === 'Comissão' // Confirmação
        );

        if (existingTransaction) {
            console.log(`Comissão CONFIRMADA para Boleto #${boletoId} já existe. Pulando criação.`);
            return { data: existingTransaction };
        }

        const newTransaction: Omit<Transaction, 'id'> = {
            description: `${descriptionPrefix} - ${clientName}`,
            amount: amount,
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
                amount: newTransaction.amount.toFixed(2),
                date: newTransaction.date.toISOString().split('T')[0],
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
        const expectedDateString = expectedDueDate.toISOString().split('T')[0];

        // 1. Tenta encontrar uma transação existente com a mesma descrição e data
        let existingTransaction = transactions.find(t => 
            t.description.includes(descriptionPrefix) && 
            t.date.toISOString().split('T')[0] === expectedDateString &&
            t.category === 'Comissão Esperada' // Nova categoria
        );

        if (existingTransaction) {
            // Se a transação esperada já existe, verifica se o valor mudou.
            if (existingTransaction.amount !== amount) {
                // Se o valor mudou, atualiza a transação existente.
                const updatedTransaction = { ...existingTransaction, amount: amount };
                await updateTransaction(updatedTransaction);
                console.log(`Comissão ESPERADA para Boleto #${boletoId} atualizada.`);
                return { data: updatedTransaction };
            }
            // console.log(`Comissão ESPERADA para Boleto #${boletoId} já existe e valor é o mesmo. Pulando criação.`);
            return { data: existingTransaction };
        }

        const newTransaction: Omit<Transaction, 'id'> = {
            description: `${descriptionPrefix} - ${clientName}`,
            amount: amount,
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
                amount: newTransaction.amount.toFixed(2),
                date: newTransaction.date.toISOString().split('T')[0],
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
    }, [user, transactions, updateTransaction]) // Adicionando transactions e updateTransaction como dependências

    const updateTransaction = useCallback(async (updatedTransaction: Transaction) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        const { id, ...updateData } = updatedTransaction;

        const { error } = await supabase
            .from('transactions')
            .update({
                ...updateData,
                amount: updatedTransaction.amount.toFixed(2),
                date: updatedTransaction.date.toISOString().split('T')[0],
            })
            .eq('id', id)
            .select()

        if (error) {
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
            toast({ title: "Erro", description: "Falha ao excluir transação.", variant: "destructive" })
            return { error }
        }

        setTransactions(prev => prev.filter(t => t.id !== id))
        toast({ title: "Sucesso", description: "Transação excluída com sucesso." })
        return { data: true }
    }, [user, toast])

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