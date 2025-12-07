import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import type { Boleto } from "@/types/agenda"
import { addMonths, isBefore, setDate, isWeekend, format, setHours, getDate, nextMonday, startOfDay } from "date-fns"
import { v4 as uuidv4 } from 'uuid'
import { useTransactions } from "./useTransactions"
import { useDashboardDataContext } from "./DashboardDataProvider" // Importando o contexto central

// Helper function to safely parse DB date string (YYYY-MM-DD) into a Date object at noon local time
const parseDbDate = (dateString: string | null | undefined): Date | undefined => {
    if (!dateString) return undefined;
    
    const date = new Date(`${dateString}T12:00:00`);
    
    return isNaN(date.getTime()) ? undefined : date;
};

// Helper function to map DB object to Boleto type
const mapDbToBoleto = (dbBoleto: any, clientMap: Map<string, any>, representationMap: Map<string, any>): Boleto => {
    const clientInfo = clientMap.get(dbBoleto.client_id);
    const repInfo = representationMap.get(dbBoleto.representacao_id);
    
    const clientName = clientInfo 
        ? (clientInfo.nome_fantasia || clientInfo.razao_social || clientInfo.name) 
        : (dbBoleto.title || "N/A"); // Fallback para o título se o cliente não for encontrado
    
    const representationInfo = {
        name: repInfo?.name || "N/A",
        commissionDay: repInfo?.commission_day,
    };

    const boleto: Boleto = {
        id: dbBoleto.id,
        title: dbBoleto.title,
        valor: parseFloat(dbBoleto.valor),
        vencimento: parseDbDate(dbBoleto.vencimento)!,
        dueDate: parseDbDate(dbBoleto.vencimento)!,
        clientId: dbBoleto.client_id,
        clientName: clientName,
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
        representacaoId: dbBoleto.representacao_id,
        commissionDay: representationInfo.commissionDay, 
    };
    
    // Check for overdue status (only if not paid)
    if (boleto.status !== 'paid' && isBefore(boleto.vencimento, startOfDay(new Date()))) {
        boleto.status = 'overdue';
    }

    return boleto;
}

// Helper function to map Boleto type to DB object
const mapBoletoToDb = (boleto: Partial<Boleto>, userId: string) => ({
    user_id: userId,
    client_id: boleto.clientId,
    title: boleto.title || `Boleto ${boleto.clientName}`,
    valor: boleto.valor?.toFixed(2),
    vencimento: boleto.vencimento ? format(boleto.vencimento, 'yyyy-MM-dd') : undefined,
    placas: boleto.placas,
    representacao_id: boleto.representacaoId,
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
    let commissionDate = addMonths(setDate(paymentDate, 1), 1);
    
    if (commissionDay && commissionDay >= 1 && commissionDay <= 31) {
        commissionDate = setDate(commissionDate, commissionDay);
        if (isWeekend(commissionDate)) {
            commissionDate = nextMonday(commissionDate);
        }
    } else {
        commissionDate = setDate(commissionDate, 1);
    }
    
    return setHours(commissionDate, 12);
};


/**
 * Calcula a data de EXPECTATIVA da comissão com base na DATA DE VENCIMENTO do boleto
 * E no dia de comissão da representação.
 */
const calculateExpectedCommissionDate = (dueDate: Date, commissionDay?: number): Date => {
    let expectedDate = addMonths(dueDate, 1);
    
    if (commissionDay && commissionDay >= 1 && commissionDay <= 31) {
        expectedDate = setDate(expectedDate, commissionDay);
        if (isWeekend(expectedDate)) {
            expectedDate = nextMonday(expectedDate);
        }
    } else {
        expectedDate = setDate(expectedDate, 1);
    }
    
    return setHours(expectedDate, 12);
};

export { calculateExpectedCommissionDate };

export function useBoletos() {
    const { user } = useAuth()
    const { toast } = useToast()
    const { data, loading, isRefetching, refetchData } = useDashboardDataContext() // Consumindo o contexto central
    
    // Desestruturando funções estáveis do useTransactions
    const { addCommissionTransaction, addExpectedCommissionTransaction, deleteExpectedCommissionTransaction } = useTransactions() 

    // Mapeia os dados brutos para o formato Boleto[]
    const boletos: Boleto[] = useMemo(() => {
        if (!data?.boletos || !data?.clients || !data?.representations) return []
        
        const clientMap = new Map(data.clients.map(c => [c.id, c]))
        const representationMap = new Map(data.representations.map(r => [r.id, r]))

        const formattedBoletos = data.boletos.map(dbBoleto => mapDbToBoleto(dbBoleto, clientMap, representationMap))
        
        // CRITICAL: Handle Expected Commission Transaction creation/update based on the fetched data
        formattedBoletos.forEach(boleto => {
            if (boleto.comissaoRecorrente && boleto.comissaoTipo && boleto.status !== 'paid') {
                let commissionAmount = boleto.comissaoRecorrente;
                if (boleto.comissaoTipo === 'percentual') {
                    commissionAmount = (boleto.valor * boleto.comissaoRecorrente) / 100;
                }
                
                if (commissionAmount > 0) {
                    const expectedDueDate = calculateExpectedCommissionDate(boleto.vencimento, boleto.commissionDay);
                    // NOTE: This call updates the global transactions state via useTransactions hook
                    // We don't await this, as it runs asynchronously and updates the transactions state.
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
        });

        return formattedBoletos.sort((a, b) => b.vencimento.getTime() - a.vencimento.getTime());
    }, [data, addExpectedCommissionTransaction])

    // A função fetchBoletos agora apenas chama o refetchData do provedor
    const fetchBoletos = useCallback(async () => {
        await refetchData()
    }, [refetchData])

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
        await refetchData()
        
        toast({ title: "Sucesso", description: `${newBoletos.length} boleto(s) adicionado(s) com sucesso.` })
        return { data: true }
    }, [user, toast, refetchData])


    // --- Core CRUD Functions (Exported) ---

    const updateBoleto = async (updatedBoleto: Boleto, scope: "this" | "all" = "this") => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        // 1. Prepare base update data
        const { vencimento, dataPagamento, ...restOfBoleto } = updatedBoleto;
        
        const { vencimento: _, data_pagamento: __, ...nonDateDbData } = mapBoletoToDb({ 
            ...restOfBoleto, 
            vencimento: vencimento,
            dataPagamento: dataPagamento,
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

        } else {
            // --- Update this and all subsequent boletos in the recurrence group ---
            
            // 1. Update non-date fields for all future boletos in the group
            const { error: updateError } = await supabase
                .from('boletos')
                .update(nonDateDbData)
                .eq('recurrence_group_id', updatedBoleto.recurrenceGroupId)
                .gte('vencimento', format(vencimento, 'yyyy-MM-dd'))
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
                toast({ title: "Aviso", description: "Campos atualizados, mas houve erro ao ajustar datas futuras.", variant: "default" });
                await refetchData();
                return { data: updatedBoleto };
            }

            // 3. Handle VENCIMENTO update separately for each future boleto
            const dayOfMonth = getDate(vencimento);
            
            for (let i = 0; i < futureBoletosData.length; i++) {
                const currentDbBoleto = futureBoletosData[i];
                
                let targetDate = setDate(vencimento, dayOfMonth);
                targetDate = addMonths(targetDate, i);
                
                const correctedTargetDate = setHours(targetDate, 12);

                const { error: dateError } = await supabase
                    .from('boletos')
                    .update({
                        vencimento: format(correctedTargetDate, 'yyyy-MM-dd'),
                        ...(currentDbBoleto.id === updatedBoleto.id && { data_pagamento: dataPagamento ? format(dataPagamento, 'yyyy-MM-dd') : null })
                    })
                    .eq('id', currentDbBoleto.id)
                    .eq('user_id', user.id);

                if (dateError) {
                    console.error(`Erro ao atualizar data do boleto ${currentDbBoleto.id}:`, dateError);
                }
            }
        }

        // Re-fetch all boletos to ensure all affected recurring items are updated in state
        await refetchData()

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

        const paymentDate = newStatus === 'paid' ? (customPaymentDate ? setHours(customPaymentDate, 12) : setHours(new Date(), 12)) : undefined;
        
        const dbData = {
            status: newStatus,
            data_pagamento: paymentDate ? format(paymentDate, 'yyyy-MM-dd') : null,
        }

        const { data: updatedData, error } = await supabase
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
                commissionAmount = (currentBoleto.valor * currentBoleto.comissaoRecorrente) / 100;
            }

            if (commissionAmount > 0) {
                const commissionDueDate = calculateCommissionDate(paymentDate, commissionDay);

                // CRITICAL FIX: Delete the expected commission transaction first
                await deleteExpectedCommissionTransaction(currentBoleto.id);

                await addCommissionTransaction(
                    currentBoleto.id,
                    currentBoleto.clientName,
                    commissionAmount,
                    commissionDueDate,
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

        // 3. Força o recarregamento de todos os dados para sincronizar o estado global
        await refetchData()
        
        toast({ title: "Sucesso", description: `Status do boleto atualizado para ${newStatus === 'paid' ? 'Pago' : newStatus}.` })
        return { data: updatedData }
    }

    const deleteBoleto = async (id: string) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        await deleteExpectedCommissionTransaction(id);

        const { error } = await supabase
            .from('boletos')
            .delete()
            .eq('id', id)

        if (error) {
            toast({ title: "Erro", description: "Falha ao excluir boleto.", variant: "destructive" })
            return { error }
        }

        // Força o recarregamento de todos os dados para sincronizar o estado global
        await refetchData()
        
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
            .eq('user_id', user.id)

        if (error) {
            toast({ title: "Erro", description: "Falha ao excluir grupo de boletos recorrentes.", variant: "destructive" })
            return { error }
        }

        // Força o recarregamento de todos os dados para sincronizar o estado global
        await refetchData()
        
        toast({ title: "Sucesso", description: "Grupo de boletos recorrentes excluído com sucesso." })
        return { data: true }
    }

    // --- Recurrence Monitoring Logic ---
    const generateNextRecurrenceBatch = useCallback(async (groupBoletos: Boleto[]) => {
        if (!user || groupBoletos.length === 0) return

        const group = groupBoletos[0]
        const lastBoleto = groupBoletos[groupBoletos.length - 1]
        const nextVencimento = addMonths(lastBoleto.vencimento, 1)
        
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
                groupBoletos.sort((a, b) => a.vencimento.getTime() - b.vencimento.getTime())
                const lastBoleto = groupBoletos[groupBoletos.length - 1]

                if (isBefore(lastBoleto.vencimento, threeMonthsFromNow)) {
                    generateNextRecurrenceBatch(groupBoletos)
                }
            })
        }
    }, [loading, boletos, generateNextRecurrenceBatch])


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
        calculateClientAnnualValue: useCallback((clientId: string): number => {
            const clientBoletos = boletos.filter(b => b.clientId === clientId);
            
            const countedRecurrenceGroups = new Set<string>();
            let totalAnnualValue = 0;
            
            clientBoletos.forEach(boleto => {
                if (boleto.isRecurring && boleto.recurrenceGroupId) {
                    if (!countedRecurrenceGroups.has(boleto.recurrenceGroupId)) {
                        totalAnnualValue += boleto.valor * 12;
                        countedRecurrenceGroups.add(boleto.recurrenceGroupId);
                    }
                } else {
                    totalAnnualValue += boleto.valor;
                }
            });

            return totalAnnualValue;
        }, [boletos]),
    }
}