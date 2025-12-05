import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import type { Boleto } from "@/types/agenda"
import { addMonths, isBefore, isToday } from "date-fns"
import { v4 as uuidv4 } from 'uuid'

// Helper function to map DB object to Boleto type
const mapDbToBoleto = (dbBoleto: any, clientName: string, representationName: string): Boleto => ({
    id: dbBoleto.id,
    title: dbBoleto.title,
    valor: parseFloat(dbBoleto.valor),
    vencimento: new Date(dbBoleto.vencimento),
    dueDate: new Date(dbBoleto.vencimento), // Alias for compatibility
    clientId: dbBoleto.client_id,
    clientName: clientName,
    placas: dbBoleto.placas || [],
    representacao: representationName,
    status: dbBoleto.status,
    dataPagamento: dbBoleto.data_pagamento ? new Date(dbBoleto.data_pagamento) : undefined,
    isRecurring: dbBoleto.is_recurring,
    recurrenceType: dbBoleto.recurrence_type,
    recurrenceMonths: dbBoleto.recurrence_months,
    recurrenceGroupId: dbBoleto.recurrence_group_id,
    comissaoRecorrente: dbBoleto.comissao_recorrente ? parseFloat(dbBoleto.comissao_recorrente) : undefined,
    comissaoTipo: dbBoleto.comissao_tipo,
    // Add representacaoId for internal use
    representacaoId: dbBoleto.representacao_id,
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
    const [isRefetching, setIsRefetching] = useState(false)

    const fetchBoletos = useCallback(async (clientId?: string) => {
        if (!user) {
            setLoading(false)
            return
        }

        if (boletos.length === 0) {
            setLoading(true)
        } else {
            setIsRefetching(true)
        }
        
        // Fetch necessary lookup data first
        const [{ data: clientsData }, { data: representationsData }] = await Promise.all([
            supabase.from('clients').select('id, name').eq('user_id', user.id),
            supabase.from('representations').select('id, name').eq('user_id', user.id),
        ])

        const clientMap = new Map(clientsData?.map(c => [c.id, c.name]))
        const representationMap = new Map(representationsData?.map(r => [r.id, r.name]))

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
            const today = new Date()
            today.setHours(0, 0, 0, 0) // Normalize today's date

            const formattedData = data.map(dbBoleto => {
                const clientName = clientMap.get(dbBoleto.client_id) || "Cliente Desconhecido"
                const representationId = dbBoleto.representacao_id
                const representationName = representationMap.get(representationId) || "N/A"
                const boleto = mapDbToBoleto(dbBoleto, clientName, representationName)
                
                // Logic to mark as overdue if status is 'pending' and date is before today
                if (boleto.status === 'pending' && isBefore(boleto.vencimento, today) && !isToday(boleto.vencimento)) {
                    boleto.status = 'overdue'
                }
                return boleto
            })
            setBoletos(formattedData)
        }
        setLoading(false)
        setIsRefetching(false)
    }, [user, toast, boletos.length])

    const addBoletos = async (newBoletosData: Omit<Boleto, 'id' | 'representacao' | 'dueDate'>[]) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        // Prepare data for batch insertion
        const dbData = newBoletosData.map(b => mapBoletoToDb({
            ...b,
            status: b.status || 'pending',
            representacaoId: b.representacaoId,
        }, user.id))

        const { data, error } = await supabase
            .from('boletos')
            .insert(dbData)
            .select()

        if (error) {
            toast({ title: "Erro", description: error.message || "Falha ao adicionar boletos.", variant: "destructive" })
            return { error }
        }

        // Re-fetch all boletos to ensure names are correctly mapped after insertion
        await fetchBoletos() 
        
        toast({ title: "Sucesso", description: `${data.length} boleto(s) adicionado(s) com sucesso.` })
        // We return the raw data from the DB, but since we just called fetchBoletos, the state is updated.
        // To satisfy the return type, we map the raw data using the helper function, but we need client/rep names.
        // Since we don't have them easily here, we return a simplified success object.
        return { data: true } 
    }

    const updateBoletoStatus = async (boletoId: string, newStatus: Boleto['status']) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        const updateData: Partial<Boleto> = { status: newStatus }
        if (newStatus === 'paid') {
            updateData.dataPagamento = new Date()
        }

        const dbData = {
            status: newStatus,
            data_pagamento: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : null,
        }

        const { data, error } = await supabase
            .from('boletos')
            .update(dbData)
            .eq('id', boletoId)
            .select()
            .single()

        if (error) {
            toast({ title: "Erro", description: "Falha ao atualizar status do boleto.", variant: "destructive" })
            return { error }
        }

        // Update local state
        setBoletos(prev => prev.map(b => {
            if (b.id === boletoId) {
                return {
                    ...b,
                    status: newStatus,
                    dataPagamento: newStatus === 'paid' ? new Date() : undefined,
                }
            }
            return b
        }))
        
        toast({ title: "Sucesso", description: `Status do boleto atualizado para ${newStatus === 'paid' ? 'Pago' : newStatus}.` })
        return { data: data }
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

    const deleteRecurrenceGroup = async (groupId: string) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        const { error } = await supabase
            .from('boletos')
            .delete()
            .eq('recurrence_group_id', groupId)
            .eq('user_id', user.id) // Safety check

        if (error) {
            toast({ title: "Erro", description: "Falha ao excluir grupo de boletos recorrentes.", variant: "destructive" })
            return { error }
        }

        setBoletos(prev => prev.filter(b => b.recurrenceGroupId !== groupId))
        toast({ title: "Sucesso", description: "Grupo de boletos recorrentes excluído com sucesso." })
        return { data: true }
    }

    // --- Recurrence Monitoring Logic ---
    const generateNextRecurrenceBatch = useCallback(async (groupBoletos: Boleto[]) => {
        if (!user || groupBoletos.length === 0) return

        const group = groupBoletos[0]
        const lastBoleto = groupBoletos[groupBoletos.length - 1]
        const nextVencimento = addMonths(lastBoleto.vencimento, 1)
        
        // Generate 12 more months
        const newBoletosData: Omit<Boleto, 'id' | 'representacao' | 'dueDate'>[] = []
        const batchSize = 12;

        for (let i = 0; i < batchSize; i++) {
            newBoletosData.push({
                valor: group.valor,
                vencimento: addMonths(nextVencimento, i),
                placas: group.placas,
                representacaoId: group.representacaoId,
                status: "pending",
                isRecurring: true,
                recurrenceType: "indefinite",
                recurrenceMonths: undefined,
                recurrenceGroupId: group.recurrenceGroupId,
                comissaoRecorrente: group.comissaoRecorrente,
                comissaoTipo: group.comissaoTipo,
                clientId: group.clientId,
                clientName: group.clientName,
                title: group.title,
            })
        }

        const { error } = await addBoletos(newBoletosData)
        if (!error) {
            toast({
                title: "Recorrência Estendida",
                description: `Gerado novo lote de ${batchSize} boletos para o grupo ${group.title}.`,
                variant: "default",
            })
        }
    }, [user, addBoletos, toast])


    useEffect(() => {
        if (!loading && boletos.length > 0) {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const threeMonthsFromNow = addMonths(today, 3)

            // Group boletos by recurrenceGroupId
            const recurringGroups = boletos.filter(b => b.isRecurring && b.recurrenceType === 'indefinite')
                .reduce((acc, boleto) => {
                    if (boleto.recurrenceGroupId) {
                        if (!acc[boleto.recurrenceGroupId]) {
                            acc[boleto.recurrenceGroupId] = []
                        }
                        acc[boleto.recurrenceGroupId].push(boleto)
                    }
                    return acc
                }, {} as Record<string, Boleto[]>)

            Object.values(recurringGroups).forEach(groupBoletos => {
                // Sort to find the last one
                groupBoletos.sort((a, b) => a.vencimento.getTime() - b.vencimento.getTime())
                const lastBoleto = groupBoletos[groupBoletos.length - 1]

                // Check if the last generated boleto is due within the next 3 months
                if (isBefore(lastBoleto.vencimento, threeMonthsFromNow)) {
                    // Trigger generation of the next batch
                    generateNextRecurrenceBatch(groupBoletos)
                }
            })
        }
    }, [loading, boletos, generateNextRecurrenceBatch])


    // Fetch all boletos on mount
    useEffect(() => {
        fetchBoletos()
    }, [user, fetchBoletos])

    return { boletos, loading, isRefetching, fetchBoletos, addBoletos, deleteBoleto, deleteRecurrenceGroup, updateBoletoStatus }
}