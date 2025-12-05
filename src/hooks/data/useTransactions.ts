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
    }, [user, toast]) // Removed transactions.length dependency

    useEffect(() => {
        fetchTransactions()
    }, [user, fetchTransactions])

    const addTransaction = async (newTransaction: Omit<Transaction, 'id'>) => {
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
    }

    const addCommissionTransaction = async (
        boletoId: string,
        clientName: string,
        amount: number,
        paymentDate: Date,
        representacaoId?: string,
        representacaoNome?: string
    ) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        // A comissão deve ser registrada no mês seguinte ao pagamento.
        const commissionDate = addMonths(paymentDate, 1);
        
        // Verifica se a transação de comissão já existe para este boleto (para evitar duplicidade)
        const existingTransaction = transactions.find(t => 
            t.description.includes(`Comissão Boleto #${boletoId}`)
        );

        if (existingTransaction) {
            console.log(`Comissão para Boleto #${boletoId} já existe. Pulando criação.`);
            return { data: existingTransaction };
        }

        const newTransaction: Omit<Transaction, 'id'> = {
            description: `Comissão Boleto #${boletoId} - ${clientName}`,
            amount: amount,
            type: "income",
            category: "Comissão",
            date: commissionDate,
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

        // Adiciona ao estado local imediatamente
        setTransactions(prev => [addedTransaction, ...prev])
        
        return { data: addedTransaction }
    }

    const updateTransaction = async (updatedTransaction: Transaction) => {
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
        toast({ title: "Sucesso", description: "Transação atualizada com sucesso." })
        return { data: updatedTransaction }
    }

    const deleteTransaction = async (id: string) => {
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
    }

    return { transactions, loading, isRefetching, fetchTransactions, addTransaction, addCommissionTransaction, updateTransaction, deleteTransaction }
}