import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import type { Transaction } from "@/components/financeiro/new-transaction-modal"
import { addMonths, format } from "date-fns"
import { useDashboardDataContext } from "./DashboardDataProvider" // Importando o contexto central

// Helper function to map DB object to Transaction type
const mapDbToTransaction = (dbTransaction: any): Transaction => ({
    id: dbTransaction.id,
    description: dbTransaction.description,
    amount: parseFloat(dbTransaction.amount),
    type: dbTransaction.type,
    category: dbTransaction.category,
    date: new Date(dbTransaction.date),
    isRecurrent: dbTransaction.is_recurrent,
    installments: dbTransaction.installments,
    recurrenceId: dbTransaction.recurrence_id,
    representacaoId: dbTransaction.representacao_id,
    // NOTE: representacaoNome is not stored in DB, must be derived or ignored here
    representacaoNome: undefined, 
})

export function useTransactions() {
    const { user } = useAuth()
    const { toast } = useToast()
    const { data, loading, isRefetching, refetchData } = useDashboardDataContext() // Consumindo o contexto central

    // Mapeia os dados brutos para o formato Transaction[]
    const transactions: Transaction[] = useMemo(() => {
        if (!data?.transactions) return []
        return data.transactions.map(mapDbToTransaction)
    }, [data])

    // A função fetchTransactions agora apenas chama o refetchData do provedor
    const fetchTransactions = useCallback(async () => {
        await refetchData()
    }, [refetchData])

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
                date: format(updatedTransaction.date, 'yyyy-MM-dd'),
            })
            .eq('id', id)
            .select()

        if (error) {
            console.error("Erro ao atualizar transação:", error);
            toast({ title: "Erro", description: "Falha ao atualizar transação.", variant: "destructive" })
            return { error }
        }

        // Força o recarregamento de todos os dados para sincronizar o estado global
        await refetchData()
        
        // Note: We skip the toast here if called internally by addExpectedCommissionTransaction
        if (!updatedTransaction.description.includes("Comissão Esperada Boleto")) {
            toast({ title: "Sucesso", description: "Transação atualizada com sucesso." })
        }
        return { data: updatedTransaction }
    }, [user, toast, refetchData])

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

        // Força o recarregamento de todos os dados para sincronizar o estado global
        await refetchData()
        
        toast({ title: "Sucesso", description: "Transação excluída com sucesso." })
        return { data: true }
    }, [user, toast, refetchData])
    
    const deleteExpectedCommissionTransaction = useCallback(async (boletoId: string) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        const descriptionPrefix = `Comissão Esperada Boleto #${boletoId}`;
        
        // 1. Encontrar a transação esperada no DB
        const { data: existingData, error: fetchError } = await supabase
            .from('transactions')
            .select('id')
            .like('description', `${descriptionPrefix}%`)
            .eq('category', 'Comissão Esperada')
            .eq('user_id', user.id);

        if (fetchError) {
            console.error("Erro ao buscar transação esperada para exclusão:", fetchError);
            return { error: fetchError };
        }

        if (existingData && existingData.length > 0) {
            const idsToDelete = existingData.map(d => d.id);
            
            // 2. Deletar do DB
            const { error: deleteError } = await supabase
                .from('transactions')
                .delete()
                .in('id', idsToDelete);

            if (deleteError) {
                console.error("Erro ao excluir transação esperada:", deleteError);
                return { error: deleteError };
            }
            
            // 3. Força o recarregamento de todos os dados para sincronizar o estado global
            await refetchData()
            
            return { data: true };
        }
        
        return { data: false }; // Nenhuma transação esperada encontrada
    }, [user, refetchData])


    // --- Add Logic ---

    const addTransaction = useCallback(async (newTransaction: Omit<Transaction, 'id'>) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }
        
        // Ensure amount is a number before formatting
        const numericAmount = typeof newTransaction.amount === 'number' ? newTransaction.amount : parseFloat(newTransaction.amount as any);

        const { error } = await supabase
            .from('transactions')
            .insert({
                ...newTransaction,
                user_id: user.id,
                amount: numericAmount.toFixed(2), // Ensure amount is stored as numeric/string
                date: format(newTransaction.date, 'yyyy-MM-dd'),
            })
            .select()
            .single()

        if (error) {
            console.error("Erro ao adicionar transação:", error);
            toast({ title: "Erro", description: "Falha ao adicionar transação.", variant: "destructive" })
            return { error }
        }

        // Força o recarregamento de todos os dados para sincronizar o estado global
        await refetchData()
        
        // Note: We skip the toast here if called from addCommissionTransaction to avoid spamming the user.
        return { data: true }
    }, [user, toast, refetchData])

    const addCommissionTransaction = useCallback(async (
        boletoId: string,
        clientName: string,
        amount: number,
        commissionDueDate: Date, // Data de vencimento da comissão confirmada
        representacaoId?: string,
        representacaoNome?: string
    ) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        const descriptionPrefix = `Comissão Boleto #${boletoId}`;
        const commissionDateString = format(commissionDueDate, 'yyyy-MM-dd');
        
        // Usamos o estado atual de transactions (consumido via useMemo) para verificar a existência
        const existingTransaction = transactions.find(t => 
            t.description.includes(descriptionPrefix) && 
            format(t.date, 'yyyy-MM-dd') === commissionDateString &&
            t.category === 'Comissão'
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
            category: "Comissão",
            date: commissionDueDate,
            isRecurrent: false,
            representacaoId: representacaoId,
            representacaoNome: representacaoNome,
        }

        const { error } = await supabase
            .from('transactions')
            .insert({
                ...newTransaction,
                user_id: user.id,
                amount: numericAmount.toFixed(2),
                date: format(newTransaction.date, 'yyyy-MM-dd'),
            })
            .select()
            .single()

        if (error) {
            console.error("Falha ao adicionar transação de comissão:", error);
            return { error }
        }

        // Força o recarregamento de todos os dados para sincronizar o estado global
        await refetchData()
        
        return { data: true }
    }, [user, transactions, refetchData])
    
    const addExpectedCommissionTransaction = useCallback(async (
        boletoId: string,
        clientName: string,
        amount: number,
        expectedDueDate: Date,
        representacaoId?: string,
        representacaoNome?: string
    ) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        const descriptionPrefix = `Comissão Esperada Boleto #${boletoId}`;
        const expectedDateString = format(expectedDueDate, 'yyyy-MM-dd');
        
        const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount as any);

        // 1. Tenta encontrar uma transação existente com a mesma descrição e data
        let existingTransaction = transactions.find(t => 
            t.description.includes(descriptionPrefix) && 
            format(t.date, 'yyyy-MM-dd') === expectedDateString &&
            t.category === 'Comissão Esperada'
        );

        if (existingTransaction) {
            if (existingTransaction.amount !== numericAmount) {
                const updatedTransaction = { ...existingTransaction, amount: numericAmount };
                await updateTransaction(updatedTransaction); 
                console.log(`Comissão ESPERADA para Boleto #${boletoId} atualizada.`);
                return { data: updatedTransaction };
            }
            return { data: existingTransaction };
        }

        const newTransaction: Omit<Transaction, 'id'> = {
            description: `${descriptionPrefix} - ${clientName}`,
            amount: numericAmount,
            type: "income",
            category: "Comissão Esperada",
            date: expectedDueDate,
            isRecurrent: false,
            representacaoId: representacaoId,
            representacaoNome: representacaoNome,
        }

        const { error } = await supabase
            .from('transactions')
            .insert({
                ...newTransaction,
                user_id: user.id,
                amount: numericAmount.toFixed(2),
                date: format(newTransaction.date, 'yyyy-MM-dd'),
            })
            .select()
            .single()

        if (error) {
            console.error("Falha ao adicionar transação de comissão esperada:", error);
            return { error }
        }

        // Força o recarregamento de todos os dados para sincronizar o estado global
        await refetchData()
        
        return { data: true }
    }, [user, transactions, updateTransaction, refetchData])

    return { 
        transactions, 
        loading, 
        isRefetching, 
        fetchTransactions, 
        addTransaction, 
        addCommissionTransaction, 
        addExpectedCommissionTransaction, 
        updateTransaction, 
        deleteTransaction,
        deleteExpectedCommissionTransaction
    }
}