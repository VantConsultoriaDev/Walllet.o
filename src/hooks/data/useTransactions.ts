import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import type { Transaction } from "@/components/financeiro/new-transaction-modal"

export function useTransactions() {
    const { user } = useAuth()
    const { toast } = useToast()
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)
    const [isRefetching, setIsRefetching] = useState(false)

    const fetchTransactions = useCallback(async () => {
        if (!user) {
            setLoading(false)
            return
        }

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
        }
        setLoading(false)
        setIsRefetching(false)
    }, [user, toast, transactions.length])

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
        toast({ title: "Sucesso", description: "Transação adicionada com sucesso." })
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

    return { transactions, loading, isRefetching, fetchTransactions, addTransaction, updateTransaction, deleteTransaction }
}