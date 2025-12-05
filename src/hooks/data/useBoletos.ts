import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import type { Boleto } from "@/types/agenda"
import { addMonths, isBefore, isToday, setDate, isWeekend, format, setHours, getDay, getDate, getMonth, getYear, nextMonday, startOfDay } from "date-fns"
import { v4 as uuidv4 } from 'uuid'
import { useTransactions } from "./useTransactions" // Importando useTransactions

// Helper function to safely parse DB date string (YYYY-MM-DD) into a Date object at noon local time
const parseDbDate = (dateString: string | null | undefined): Date | undefined => {
    if (!dateString) return undefined;
    
    // Create a date object using the date string, which should be interpreted as UTC midnight (00:00:00Z).
    // Then, set the hours to 12 (noon) to ensure that when converted to local time, 
    // it still falls on the intended day, preventing -1 day shift.
    const date = new Date(`${dateString}T12:00:00`);
    
    // Final check to ensure it's a valid date
    return isNaN(date.getTime()) ? undefined : date;
};

// Helper function to map DB object to Boleto type
const mapDbToBoleto = (dbBoleto: any, clientName: string, representationInfo: { name: string, commissionDay?: number }): Boleto => ({
    id: dbBoleto.id,
    title: dbBoleto.title,
    valor: parseFloat(dbBoleto.valor),
    vencimento: parseDbDate(dbBoleto.vencimento)!, // Vencimento is mandatory
    dueDate: parseDbDate(dbBoleto.vencimento)!, // Alias for compatibility
    clientId: dbBoleto.client_id,
    // Se o nome do cliente não foi encontrado no mapa (Cliente Desconhecido), 
    // usamos o título do boleto como o nome do cliente.
    clientName: clientName !== "Cliente Desconhecido" ? clientName : (dbBoleto.title || "N/A"),
    placas: dbBoleto.placas || [],
    representacao: representationInfo.name,
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
    // Adicionando commissionDay para cálculo correto da data de comissão esperada
    commissionDay: representationInfo.commissionDay, 
})

// Helper function to map Boleto type to DB object
const mapBoletoToDb = (boleto: Partial<Boleto>, userId: string) => ({
    user_id: userId,
    client_id: boleto.clientId,
    title: boleto.title || `Boleto ${boleto.clientName}`, // Ensure title exists
    valor: boleto.valor?.toFixed(2),
    // Store date as YYYY-MM-DD string
    vencimento: boleto.vencimento ? format(boleto.vencimento, 'yyyy-MM-dd') : undefined,
    placas: boleto.placas,
    representacao_id: boleto.representacaoId, // This must be present
    status: boleto.status,
    data_pagamento: boleto.dataPagamento ? format(boleto.dataPagamento, 'yyyy-MM-dd') : null,
    is_recurring: boleto.isRecurring,
    recurrence_type: boleto.recurrenceType,
    recurrence_months: boleto.recurrenceMonths,
    recurrence_group_id: boleto.recurrenceGroupId,
    comissao_recorrente: boleto.comissaoRecorrente?.toFixed(2),
    comissao_tipo: boleto.comissaoTipo,
})

/**
 * Calcula a data de vencimento da comissão com base na DATA DE PAGAMENTO do boleto
 * e no dia de pagamento configurado na representação.
 */
const calculateCommissionDate = (paymentDate: Date, commissionDay?: number): Date => {
    // 1. Começa no 1º dia do mês seguinte ao pagamento
    let commissionDate = addMonths(setDate(paymentDate, 1), 1);
    
    if (commissionDay && commissionDay >= 1 && commissionDay <= 31) {
        // 2. Define o dia do mês conforme configurado
        // Se o dia configurado for maior que o número de dias do mês, setDate usa o último dia do mês.
        commissionDate = setDate(commissionDate, commissionDay);
        
        // 3. Se cair em fim de semana, move para a próxima segunda-feira
        if (isWeekend(commissionDate)) {
            commissionDate = nextMonday(commissionDate);
        }
    } else {
        // Se não houver dia configurado, usa o 1º dia do mês seguinte (padrão)
        commissionDate = setDate(commissionDate, 1);
    }
    
    // Garante que a data retornada esteja fixada ao meio-dia
    return setHours(commissionDate, 12);
};


/**
 * Calcula a data de EXPECTATIVA da comissão com base na DATA DE VENCIMENTO do boleto
 * E no dia de comissão da representação.
 */
const calculateExpectedCommissionDate = (dueDate: Date, commissionDay?: number): Date => {
    // 1. Começa no 1º dia do mês seguinte ao vencimento do boleto.
    let expectedDate = addMonths(dueDate, 1);
    
    if (commissionDay && commissionDay >= 1 && commissionDay <= 31) {
        // 2. Define o dia do mês conforme configurado
        expectedDate = setDate(expectedDate, commissionDay);
        
        // 3. Se cair em fim de semana, move para a próxima segunda-feira
        if (isWeekend(expectedDate)) {
            expectedDate = nextMonday(expectedDate);
        }
    } else {
        // Se não houver dia configurado, usa o 1º dia do mês seguinte (padrão)
        expectedDate = setDate(expectedDate, 1);
    }
    
    // Fixar ao meio-dia
    return setHours(expectedDate, 12);
};

export { calculateExpectedCommissionDate }; // Exportando para uso no Financeiro.tsx


export function useBoletos() {
    const { user } = useAuth()
    const { toast } = useToast()
    // Desestruturando funções estáveis do useTransactions
    const { addCommissionTransaction, addExpectedCommissionTransaction, deleteExpectedCommissionTransaction } = useTransactions() 
    const [boletos, setBoletos] = useState<Boleto[]>([])
    const [loading, setLoading] = useState(true)
    const [isRefetching, setIsRefetching] = useState(false)

    // --- Internal Fetching Logic ---
    const fetchBoletos = useCallback(async () => {
        if (!user) {
            setLoading(false)
            return
        }

        if (boletos.length === 0) {
            setLoading(true)
        } else {
            setIsRefetching(true)
        }

        // 1. Fetch all necessary data concurrently
        const [{ data: boletosData, error: boletosError }, { data: clientsData }, { data: representationsData }] = await Promise.all([
            supabase.from('boletos').select('*').eq('user_id', user.id).order('vencimento', { ascending: false }),
            supabase.from('clients').select('id, name, nome_fantasia, razao_social'),
            supabase.from('representations').select('id, name, commission_day'),
        ]);

        if (boletosError) {
            toast({ title: "Erro", description: boletosError.message, variant: "destructive" })
            setBoletos([])
            setLoading(false)
            setIsRefetching(false)
            return
        }

        const clientMap = new Map(clientsData?.map(c => [c.id, c]) || [])
        const representationMap = new Map(representationsData?.map(r => [r.id, r]) || [])

        // 2. Map and format boletos
        const formattedBoletos: Boleto[] = boletosData.map(dbBoleto => {
            const clientInfo = clientMap.get(dbBoleto.client_id);
            const repInfo = representationMap.get(dbBoleto.representacao_id);
            
            const clientName = clientInfo 
                ? (clientInfo.nome_fantasia || clientInfo.razao_social || clientInfo.name) 
                : "Cliente Desconhecido";
            
            const representationInfo = {
                name: repInfo?.name || "N/A",
                commissionDay: repInfo?.commission_day,
            };

            const boleto = mapDbToBoleto(dbBoleto, clientName, representationInfo);
            
            // 3. Handle Expected Commission Transaction creation/update
            if (boleto.comissaoRecorrente && boleto.comissaoTipo && boleto.status !== 'paid') {
                let commissionAmount = boleto.comissaoRecorrente;
                if (boleto.comissaoTipo === 'percentual') {
                    commissionAmount = (boleto.valor * boleto.comissaoRecorrente) / 100;
                }
                
                if (commissionAmount > 0) {
                    const expectedDueDate = calculateExpectedCommissionDate(boleto.vencimento, boleto.commissionDay);
                    // NOTE: This call updates the global transactions state via useTransactions hook
                    addExpectedCommissionTransaction(
                        boleto.id,
                        boleto.clientName,
                        commissionAmount,
                        expectedDueDate,
                        boleto.representacaoId,
                        boleto.representacao
                    );
                }
            }
            
            // 4. Check for overdue status (only if not paid)
            if (boleto.status !== 'paid' && isBefore(boleto.vencimento, startOfDay(new Date()))) {
                boleto.status = 'overdue';
            }

            return boleto;
        });

        setBoletos(formattedBoletos);
        setLoading(false);
        setIsRefetching(false);
        return formattedBoletos;
    }, [user, toast, boletos.length, addExpectedCommissionTransaction]); // Dependências atualizadas

    // --- Internal Add Logic ---
    const addBoletos = useCallback(async (newBoletos: Omit<Boleto, 'id' | 'representacao' | 'dueDate'>[]) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        const dbData = newBoletos.map(b => mapBoletoToDb(b, user.id))

        const { error } = await supabase
            .from('boletos')
            .insert(dbData)

        if (error) {
            toast({ title: "Erro", description: `Falha ao adicionar boletos: ${error.message}`, variant: "destructive" })
            return { error }
        }

        // Re-fetch all data to ensure state consistency and trigger expected commission creation
        await fetchBoletos()
        
        toast({ title: "Sucesso", description: `${newBoletos.length} boleto(s) adicionado(s) com sucesso.` })
        return { data: true }
    }, [user, toast, fetchBoletos])


    // --- Core CRUD Functions (Exported) ---

    const updateBoleto = async (updatedBoleto: Boleto, scope: "this" | "all" = "this") => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        // 1. Prepare base update data
        const { vencimento, dataPagamento, ...restOfBoleto } = updatedBoleto;
        
        // Data fields to update in DB (excluding dates for the initial batch update)
        const { vencimento: _, data_pagamento: __, ...nonDateDbData } = mapBoletoToDb({ 
            ...restOfBoleto, 
            vencimento: vencimento, // Keep for reference
            dataPagamento: dataPagamento, // Keep for reference
        }, user.id);

        if (scope === "this" || !updatedBoleto.recurrenceGroupId) {
            // --- Update only the current boleto ---
            const dbData = mapBoletoToDb(updatedBoleto, user.id);
            
            const { error } = await supabase
                .from('boletos')
                .update(dbData)
                .eq('id', updatedBoleto.id)
                .eq('user_id', user.id)
                .select()

            if (error) {
                toast({ title: "Erro", description: `Falha ao atualizar boleto: ${error.message}`, variant: "destructive" })
                return { error }
            }

            // Update local state immediately
            setBoletos(prev => prev.map(b => b.id === updatedBoleto.id ? updatedBoleto : b))

        } else {
            // --- Update this and all subsequent boletos in the recurrence group ---
            
            // 1. Update non-date fields for all future boletos in the group
            const { error: updateError } = await supabase
                .from('boletos')
                .update(nonDateDbData)
                .eq('recurrence_group_id', updatedBoleto.recurrenceGroupId)
                .gte('vencimento', format(vencimento, 'yyyy-MM-dd')) // Use formatted date for comparison
                .eq('user_id', user.id); 

            if (updateError) {
                toast({ title: "Erro", description: `Falha ao atualizar campos não-data dos boletos recorrentes: ${updateError.message}`, variant: "destructive" });
                return { error: updateError };
            }

            // 2. Fetch all future boletos again to get their current dates
            const { data: futureBoletosData, error: fetchError } = await supabase
                .from('boletos')
                .select('*')
                .eq('recurrence_group_id', updatedBoleto.recurrenceGroupId)
                .gte('vencimento', format(vencimento, 'yyyy-MM-dd'))
                .eq('user_id', user.id)
                .order('vencimento', { ascending: true });

            if (fetchError || !futureBoletosData) {
                console.error("Erro ao buscar boletos futuros para ajuste de data:", fetchError);
                // Proceed to fetch all to sync state, but warn user
                toast({ title: "Aviso", description: "Campos atualizados, mas houve erro ao ajustar datas futuras.", variant: "default" });
                await fetchBoletos();
                return { data: updatedBoleto };
            }

            // 3. Handle VENCIMENTO update separately for each future boleto
            const dayOfMonth = getDate(vencimento);
            
            for (let i = 0; i < futureBoletosData.length; i++) {
                const currentDbBoleto = futureBoletosData[i];
                
                // Calculate the target date: start from the updated month/year and add 'i' months
                let targetDate = setDate(vencimento, dayOfMonth);
                targetDate = addMonths(targetDate, i);
                
                // Ensure the date is set to noon to prevent timezone issues on save
                const correctedTargetDate = setHours(targetDate, 12);

                const { error: dateError } = await supabase
                    .from('boletos')
                    .update({
                        vencimento: format(correctedTargetDate, 'yyyy-MM-dd'),
                        // Only update data_pagamento for the current boleto if it was changed
                        // NOTE: We explicitly DO NOT update data_pagamento for future boletos, only the current one.
                        ...(currentDbBoleto.id === updatedBoleto.id && { data_pagamento: dataPagamento ? format(dataPagamento, 'yyyy-MM-dd') : null })
                    })
                    .eq('id', currentDbBoleto.id)
                    .eq('user_id', user.id);

                if (dateError) {
                    console.error(`Erro ao atualizar data do boleto ${currentDbBoleto.id}:`, dateError);
                }
            }
            
            // Re-fetch all boletos to ensure all affected recurring items are updated in state
            await fetchBoletos()
        }

        toast({ title: "Sucesso", description: `Boleto(s) atualizado(s) com sucesso.` })
        return { data: updatedBoleto }
    }

    const updateBoletoStatus = async (boletoId: string, newStatus: Boleto['status'], customPaymentDate?: Date) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        const currentBoleto = boletos.find(b => b.id === boletoId);
        if (!currentBoleto) return { error: { message: "Boleto não encontrado." } }

        // Fetch representation info again to get the commission day
        const { data: repData } = await supabase
            .from('representations')
            .select('commission_day')
            .eq('id', currentBoleto.representacaoId)
            .single()
        
        const commissionDay = repData?.commission_day;

        // Ensure paymentDate is fixed at noon if provided
        const paymentDate = newStatus === 'paid' ? (customPaymentDate ? setHours(customPaymentDate, 12) : setHours(new Date(), 12)) : undefined;
        
        const dbData = {
            status: newStatus,
            data_pagamento: paymentDate ? format(paymentDate, 'yyyy-MM-dd') : null,
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

        // 1. Gerar Transação de Comissão CONFIRMADA se o status for 'paid' e houver comissão recorrente
        if (newStatus === 'paid' && currentBoleto.comissaoRecorrente && currentBoleto.comissaoTipo && paymentDate) {
            let commissionAmount = currentBoleto.comissaoRecorrente;

            if (currentBoleto.comissaoTipo === 'percentual') {
                // Calcula o valor da comissão com base no valor do boleto
                commissionAmount = (currentBoleto.valor * currentBoleto.comissaoRecorrente) / 100;
            }

            if (commissionAmount > 0) {
                // Calcula a data de vencimento da comissão usando o commissionDay
                const commissionDueDate = calculateCommissionDate(paymentDate, commissionDay);

                // CRITICAL FIX: Delete the expected commission transaction first
                await deleteExpectedCommissionTransaction(currentBoleto.id);

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
        
        // 2. Se o status for alterado para PENDENTE, remove a transação de comissão confirmada (se existir)
        if (newStatus !== 'paid' && currentBoleto.comissaoRecorrente && currentBoleto.comissaoTipo) {
            const descriptionPrefix = `Comissão Boleto #${currentBoleto.id}`;
            
            // Busca a transação de comissão confirmada
            const { data: existingConfirmed } = await supabase
                .from('transactions')
                .select('id')
                .like('description', `${descriptionPrefix}%`)
                .eq('category', 'Comissão')
                .eq('user_id', user.id);

            if (existingConfirmed && existingConfirmed.length > 0) {
                // Deleta a transação confirmada
                await supabase.from('transactions').delete().in('id', existingConfirmed.map(d => d.id));
                
                // Recria a transação de comissão esperada
                let commissionAmount = currentBoleto.comissaoRecorrente;
                if (currentBoleto.comissaoTipo === 'percentual') {
                    commissionAmount = (currentBoleto.valor * currentBoleto.comissaoRecorrente) / 100;
                }
                const expectedDueDate = calculateExpectedCommissionDate(currentBoleto.vencimento, commissionDay);
                await addExpectedCommissionTransaction(
                    currentBoleto.id,
                    currentBoleto.clientName,
                    commissionAmount,
                    expectedDueDate,
                    currentBoleto.representacaoId,
                    currentBoleto.representacao
                );
            }
        }


        // 3. Update local state
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

        // CRITICAL FIX: Delete associated expected commission transaction
        await deleteExpectedCommissionTransaction(id);

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

        // 1. Find all boletos in the group to delete their expected commissions
        const boletosInGroup = boletos.filter(b => b.recurrenceGroupId === groupId);
        
        // 2. Delete all associated expected commission transactions
        await Promise.all(boletosInGroup.map(b => deleteExpectedCommissionTransaction(b.id)));

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

        // NOTE: We call addBoletos here, which internally calls fetchBoletos() and adds expected commissions.
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

    return { 
        boletos, 
        loading, 
        isRefetching, 
        fetchBoletos, 
        addBoletos, 
        updateBoleto, 
        deleteBoleto, 
        deleteRecurrenceGroup, 
        updateBoletoStatus,
    }
}