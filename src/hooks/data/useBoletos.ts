import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import type { Boleto } from "@/types/agenda"
import { addMonths, isBefore, isToday, setDate, isWeekend, format, setHours, getDay, getDate, getMonth, getYear } from "date-fns"
import { v4 as uuidv4 } from 'uuid'
import { useTransactions } from "./useTransactions" // Importando useTransactions

// Helper function to safely parse DB date string (YYYY-MM-DD) into a Date object at noon local time
const parseDbDate = (dateString: string | null | undefined): Date | undefined => {
    if (!dateString) return undefined;
    // Create a date object using only the date part, then set hours to 12 to prevent timezone shifting
    const date = new Date(dateString);
    return setHours(date, 12);
};

// Helper function to map DB object to Boleto type
const mapDbToBoleto = (dbBoleto: any, clientName: string, representationName: string): Boleto => ({
    id: dbBoleto.id,
    title: dbBoleto.title,
    valor: parseFloat(dbBoleto.valor),
    vencimento: parseDbDate(dbBoleto.vencimento)!, // Vencimento is mandatory
    dueDate: parseDbDate(dbBoleto.vencimento)!, // Alias for compatibility
    clientId: dbBoleto.client_id,
    clientName: clientName,
    placas: dbBoleto.placas || [],
    representacao: representationName,
    status: dbBoleto.status,
    dataPagamento: parseDbDate(dbBoleto.data_pagamento),
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

// Helper to calculate the commission date based on payment date and representation
const calculateCommissionDate = (paymentDate: Date, representationName: string): Date => {
    let commissionDate = addMonths(paymentDate, 1);
    
    if (representationName.toLowerCase().includes("proteauto")) {
        // Set to the 26th of the next month
        commissionDate = setDate(commissionDate, 26);
        
        // Check if it's a weekend (0=Sunday, 6=Saturday)
        if (isWeekend(commissionDate)) {
            // If Saturday, move to Monday (2 days later)
            if (commissionDate.getDay() === 6) {
                commissionDate = addMonths(setDate(paymentDate, 28), 1); // 26 + 2 = 28
            } 
            // If Sunday, move to Monday (1 day later)
            else if (commissionDate.getDay() === 0) {
                commissionDate = addMonths(setDate(paymentDate, 27), 1); // 26 + 1 = 27
            }
        }
    }
    // For all other representations, it defaults to the 1st of the next month (handled by addMonths(paymentDate, 1) if we set the date to 1)
    // Since addCommissionTransaction uses this date, we ensure it's the 1st if no specific rule applies.
    
    // If not Proteauto, ensure it defaults to the 1st of the next month for consistency in transaction tracking
    if (!representationName.toLowerCase().includes("proteauto")) {
        commissionDate = setDate(commissionDate, 1);
    }

    return commissionDate;
};


export function useBoletos() {
    const { user } = useAuth()
    const { toast } = useToast()
    // Desestruturando fetchTransactions do useTransactions
    const { addCommissionTransaction } = useTransactions() 
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
            const today = setHours(new Date(), 12); // Use corrected date for comparison
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

    useEffect(() => {
        fetchBoletos()
    }, [user, fetchBoletos])

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
        return { data: true } 
    }

    const updateBoleto = async (updatedBoleto: Boleto, scope: "this" | "all" = "this") => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        // 1. Prepare base update data (excluding date fields for now, as they need special handling for recurrence)
        const { vencimento, dataPagamento, ...restOfBoleto } = updatedBoleto;
        
        const baseDbData = mapBoletoToDb({ 
            ...restOfBoleto, 
            vencimento: vencimento, // Include vencimento for single update
            dataPagamento: dataPagamento, // Include dataPagamento for single update
        }, user.id);

        let query = supabase
            .from('boletos')
            .update(baseDbData)
            .eq('user_id', user.id)

        if (scope === "this" || !updatedBoleto.recurrenceGroupId) {
            // --- Update only the current boleto ---
            query = query.eq('id', updatedBoleto.id)
        } else {
            // --- Update this and all subsequent boletos in the recurrence group ---
            
            // We need to update the VENCIMENTO of all future boletos to maintain the same day of the month, 
            // but starting from the month of the updatedBoleto.
            
            // 1. Find all future boletos in the group (including the current one)
            const futureBoletos = boletos.filter(b => 
                b.recurrenceGroupId === updatedBoleto.recurrenceGroupId && 
                b.vencimento.getTime() >= vencimento.getTime()
            ).sort((a, b) => a.vencimento.getTime() - b.vencimento.getTime());

            if (futureBoletos.length === 0) {
                toast({ title: "Aviso", description: "Nenhum boleto futuro encontrado para atualização em grupo.", variant: "default" });
                return { data: updatedBoleto };
            }

            // 2. Perform the update on the database for non-date fields
            const { vencimento: _, data_pagamento: __, ...nonDateDbData } = baseDbData;
            
            const { error: updateError } = await supabase
                .from('boletos')
                .update(nonDateDbData)
                .eq('recurrence_group_id', updatedBoleto.recurrenceGroupId)
                .gte('vencimento', vencimento.toISOString().split('T')[0])
                .eq('user_id', user.id); // Safety check

            if (updateError) {
                toast({ title: "Erro", description: `Falha ao atualizar campos não-data dos boletos recorrentes: ${updateError.message}`, variant: "destructive" });
                return { error: updateError };
            }

            // 3. Handle VENCIMENTO update separately for each future boleto
            const dayOfMonth = getDate(vencimento);
            const month = getMonth(vencimento);
            const year = getYear(vencimento);
            
            // We iterate over the future boletos and update their dates sequentially
            for (let i = 0; i < futureBoletos.length; i++) {
                const currentBoleto = futureBoletos[i];
                
                // Calculate the target date: start from the updated month/year and add 'i' months
                let targetDate = setDate(setMonth(setYear(vencimento, year), month), dayOfMonth);
                targetDate = addMonths(targetDate, i);
                
                // Ensure the date is set to noon to prevent timezone issues on save
                const correctedTargetDate = setHours(targetDate, 12);

                const { error: dateError } = await supabase
                    .from('boletos')
                    .update({
                        vencimento: correctedTargetDate.toISOString().split('T')[0],
                        // Only update data_pagamento for the current boleto if it was changed
                        ...(currentBoleto.id === updatedBoleto.id && { data_pagamento: dataPagamento?.toISOString().split('T')[0] || null })
                    })
                    .eq('id', currentBoleto.id)
                    .eq('user_id', user.id);

                if (dateError) {
                    console.error(`Erro ao atualizar data do boleto ${currentBoleto.id}:`, dateError);
                    // Continue loop but log error
                }
            }
        }

        // Re-fetch all boletos to ensure all affected recurring items are updated in state
        await fetchBoletos()
        
        toast({ title: "Sucesso", description: `Boleto(s) atualizado(s) com sucesso.` })
        return { data: updatedBoleto }
    }

    const updateBoletoStatus = async (boletoId: string, newStatus: Boleto['status'], customPaymentDate?: Date) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        const currentBoleto = boletos.find(b => b.id === boletoId);
        if (!currentBoleto) return { error: { message: "Boleto não encontrado." } }

        const paymentDate = newStatus === 'paid' ? (customPaymentDate || setHours(new Date(), 12)) : undefined;
        
        const dbData = {
            status: newStatus,
            data_pagamento: paymentDate ? paymentDate.toISOString().split('T')[0] : null,
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

        // 1. Gerar Transação de Comissão se o status for 'paid' e houver comissão recorrente
        if (newStatus === 'paid' && currentBoleto.comissaoRecorrente && currentBoleto.comissaoTipo && paymentDate) {
            let commissionAmount = currentBoleto.comissaoRecorrente;

            if (currentBoleto.comissaoTipo === 'percentual') {
                // Calcula o valor da comissão com base no valor do boleto
                commissionAmount = (currentBoleto.valor * currentBoleto.comissaoRecorrente) / 100;
            }

            if (commissionAmount > 0) {
                // Calcula a data de vencimento da comissão
                const commissionDueDate = calculateCommissionDate(paymentDate, currentBoleto.representacao);

                await addCommissionTransaction(
                    currentBoleto.id,
                    currentBoleto.clientName,
                    commissionAmount,
                    commissionDueDate, // Passa a data de vencimento da comissão
                    currentBoleto.representacaoId,
                    currentBoleto.representacao
                );
                
                toast({ title: "Comissão Registrada", description: `Comissão de ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(commissionAmount)} agendada para ${format(commissionDueDate, 'dd/MM/yyyy')}.`, variant: "default" })
            }
        }

        // 2. Update local state
        setBoletos(prev => prev.map(b => {
            if (b.id === boletoId) {
                return {
                    ...b,
                    status: newStatus,
                    dataPagamento: paymentDate,
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

    return { boletos, loading, isRefetching, fetchBoletos, addBoletos, updateBoleto, deleteBoleto, deleteRecurrenceGroup, updateBoletoStatus }
}