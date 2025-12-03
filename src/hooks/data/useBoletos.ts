import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import type { Boleto } from "@/types/agenda"
import { addMonths } from "date-fns"

// Helper function to map DB object to Boleto type
const mapDbToBoleto = (dbBoleto: any): Boleto => ({
    id: dbBoleto.id,
    title: dbBoleto.title,
    valor: parseFloat(dbBoleto.valor),
    vencimento: new Date(dbBoleto.vencimento),
    dueDate: new Date(dbBoleto.vencimento), // Alias for compatibility
    clientId: dbBoleto.client_id,
    clientName: dbBoleto.client_name || "N/A", // Assuming clientName might be denormalized or fetched later
    placas: dbBoleto.placas || [],
    representacao: dbBoleto.representacao_nome || "N/A", // Assuming name is denormalized or fetched later
    status: dbBoleto.status,
    dataPagamento: dbBoleto.data_pagamento ? new Date(dbBoleto.data_pagamento) : undefined,
    isRecurring: dbBoleto.is_recurring,
    recurrenceType: dbBoleto.recurrence_type,
    recurrenceMonths: dbBoleto.recurrence_months,
    recurrenceGroupId: dbBoleto.recurrence_group_id,
    comissaoRecorrente: dbBoleto.comissao_recorrente ? parseFloat(dbBoleto.comissao_recorrente) : undefined,
    comissaoTipo: dbBoleto.comissao_tipo,
})

// Helper function to map Boleto type to DB object
const mapBoletoToDb = (boleto: Partial<Boleto>, userId: string) => ({
    user_id: userId,
    client_id: boleto.clientId,
    title: boleto.title || `Boleto ${boleto.clientName}`, // Ensure title exists
    valor: boleto.valor?.toFixed(2),
    vencimento: boleto.vencimento?.toISOString().split('T')[0],
    placas: boleto.placas,
    representacao_id: boleto.representacaoId, // This must be present
    status: boleto.status,
    data_pagamento: boleto.dataPagamento?.toISOString().split('T')[0],
    is_recurring: boleto.isRecurring,
    recurrence_type: boleto.recurrenceType,
    recurrence_months: boleto.recurrenceMonths,
    recurrence_group_id: boleto.recurrenceGroupId,
    comissao_recorrente: boleto.comissaoRecorrente?.toFixed(2),
    comissao_tipo: boleto.comissaoTipo,
})

export function useBoletos() {
    const { user } = useAuth()
    const { toast } = useToast()
    const [boletos, setBoletos] = useState<Boleto[]>([])
    const [loading, setLoading] = useState(true)

    const fetchBoletos = async (clientId?: string) => {
        if (!user) {
            setLoading(false)
            return
        }

        setLoading(true)
        let query = supabase
            .from('boletos')
            .select('*')
            .eq('user_id', user.id)
            .order('vencimento', { ascending: true })

        if (clientId) {
            query = query.eq('client_id', clientId)
        }

        const { data, error } = await query

        if (error) {
            toast({
                title: "Erro ao carregar boletos",
                description: error.message,
                variant: "destructive",
            })
            setBoletos([])
        } else {
            const formattedData = data.map(mapDbToBoleto)
            setBoletos(formattedData)
        }
        setLoading(false)
    }

    // Fetch all boletos on mount
    useEffect(() => {
        fetchBoletos()
    }, [user])

    const addBoletos = async (newBoletosData: Omit<Boleto, 'id' | 'representacao' | 'dueDate'>[]) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        // Prepare data for batch insertion
        const dbData = newBoletosData.map(b => mapBoletoToDb({
            ...b,
            status: b.status || 'pending',
            representacaoId: b.representacaoId, // Ensure ID is passed
        }, user.id))

        const { data, error } = await supabase
            .from('boletos')
            .insert(dbData)
            .select()

        if (error) {
            toast({ title: "Erro", description: error.message || "Falha ao adicionar boletos.", variant: "destructive" })
            return { error }
        }

        const addedBoletos = data.map(mapDbToBoleto)

        // Update local state by adding new boletos
        setBoletos(prev => [...addedBoletos, ...prev].sort((a, b) => a.vencimento.getTime() - b.vencimento.getTime()))
        toast({ title: "Sucesso", description: `${addedBoletos.length} boleto(s) adicionado(s) com sucesso.` })
        return { data: addedBoletos }
    }

    const deleteBoleto = async (id: string) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        const { error } = await supabase
            .from('boletos')
            .delete()
            .eq('id', id)

        if (error) {
            toast({ title: "Erro", description: "Falha ao excluir boleto.", variant: "destructive" })
            return { error }
        }

        setBoletos(prev => prev.filter(b => b.id !== id))
        toast({ title: "Sucesso", description: "Boleto excluído com sucesso." })
        return { data: true }
    }

    return { boletos, loading, fetchBoletos, addBoletos, deleteBoleto }
}