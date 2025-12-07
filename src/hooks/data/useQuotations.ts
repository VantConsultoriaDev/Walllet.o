import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import type { Cotacao, CotacaoHistory, CotacaoStatus, Asset, Commission } from "@/types/cotacao"
import type { Vehicle } from "./useVehicles"
import { useDashboardDataContext } from "./DashboardDataProvider" // Importando o contexto central

// Helper function to map DB object to Cotacao type
const mapDbToCotacao = (dbCotacao: any): Cotacao => {
    // O histórico agora é esperado dentro do objeto dbCotacao (retorno da RPC)
    const finalHistory = (dbCotacao.history || []).map((h: any) => ({
        id: h.id,
        date: new Date(h.created_at || h.date),
        fromStatus: h.from_status || h.fromStatus,
        toStatus: h.to_status || h.toStatus,
        updatedBy: h.updated_by || h.updatedBy,
        notes: h.notes,
    } as CotacaoHistory)).sort((a: CotacaoHistory, b: CotacaoHistory) => b.date.getTime() - a.date.getTime()); // Ordena por data decrescente

    return {
        id: dbCotacao.id,
        clientId: dbCotacao.client_id,
        clientType: dbCotacao.client_type,
        cpfCnpj: dbCotacao.cpf_cnpj,
        razaoSocialNome: dbCotacao.razao_social_nome,
        nomeFantasia: dbCotacao.nome_fantasia,
        representacaoId: dbCotacao.representacao_id,
        representacaoNome: dbCotacao.representacao_nome,
        asset: dbCotacao.asset_data as Asset,
        anuidade: parseFloat(dbCotacao.anuidade),
        parcelas: dbCotacao.parcelas,
        comissao: dbCotacao.comissao_data as Commission,
        status: dbCotacao.status,
        history: finalHistory,
        createdAt: new Date(dbCotacao.created_at),
        updatedAt: new Date(dbCotacao.updated_at),
    }
}

// Helper function to map Cotacao type to DB object for insertion/update
const mapCotacaoToDb = (cotacao: Partial<Cotacao>) => ({
    client_id: cotacao.clientId,
    client_type: cotacao.clientType,
    cpf_cnpj: cotacao.cpfCnpj,
    razao_social_nome: cotacao.razaoSocialNome,
    nome_fantasia: cotacao.nomeFantasia,
    representacao_id: cotacao.representacaoId,
    asset_type: cotacao.asset?.type,
    asset_data: cotacao.asset,
    anuidade: cotacao.anuidade?.toFixed(2),
    parcelas: cotacao.parcelas,
    comissao_data: cotacao.comissao,
    status: cotacao.status,
    updated_at: new Date().toISOString(),
})

export type PatrimonyItem = {
    id: string;
    type: 'vehicle' | 'quotation';
    description: string;
    value: number;
    source: string;
    status: string;
}

export function useQuotations() {
    const { user } = useAuth()
    const { toast } = useToast()
    const { data, loading, isRefetching, refetchData } = useDashboardDataContext() // Consumindo o contexto central

    // Mapeia os dados brutos para o formato Cotacao[]
    const quotations: Cotacao[] = useMemo(() => {
        if (!data?.quotations) return []
        return data.quotations.map(mapDbToCotacao)
    }, [data])

    // A função fetchQuotations agora apenas chama o refetchData do provedor
    const fetchQuotations = useCallback(async () => {
        await refetchData()
    }, [refetchData])

    const addQuotation = async (newQuotation: Omit<Cotacao, 'id' | 'history' | 'createdAt' | 'updatedAt'>) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        const dbData = mapCotacaoToDb(newQuotation)

        const { error } = await supabase
            .from('quotations')
            .insert({
                ...dbData,
                user_id: user.id,
            })
            .select()
            .single()

        if (error) {
            toast({ title: "Erro", description: "Falha ao adicionar cotação.", variant: "destructive" })
            return { error }
        }

        // Força o recarregamento de todos os dados para sincronizar o estado global
        await refetchData()
        
        toast({ title: "Sucesso", description: "Cotação adicionada com sucesso." })
        return { data: true }
    }

    const updateQuotationStatus = async (quotationId: string, newStatus: CotacaoStatus, notes?: string) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        const oldQuotation = quotations.find(q => q.id === quotationId)
        if (!oldQuotation) return { error: { message: "Cotação não encontrada." } }

        // 1. Update quotation status
        const { data: updatedQuote, error: updateError } = await supabase
            .from('quotations')
            .update({
                status: newStatus,
                updated_at: new Date().toISOString(),
            })
            .eq('id', quotationId)
            .select()
            .single()

        if (updateError) {
            toast({ title: "Erro", description: "Falha ao atualizar status da cotação.", variant: "destructive" })
            return { error: updateError }
        }

        // 2. Insert history entry
        const { error: historyError } = await supabase
            .from('quotation_history')
            .insert({
                quotation_id: quotationId,
                user_id: user.id,
                from_status: oldQuotation.status,
                to_status: newStatus,
                updated_by: user.name || user.email,
                notes: notes,
            })
            .select()
            .single()

        if (historyError) {
            console.error("Falha ao registrar histórico:", historyError.message)
        }

        // 3. Força o recarregamento de todos os dados para sincronizar o estado global
        await refetchData()
        
        toast({ title: "Sucesso", description: "Status da cotação atualizado." })
        return { data: updatedQuote }
    }
    
    /**
     * Calcula o valor total do patrimônio segurado (apenas cotações com status 'cliente')
     * para um cliente específico, incluindo a soma dos valores dos veículos cadastrados.
     * Retorna o total e a lista de itens que compõem esse total.
     */
    const calculateClientTotalPatrimony = useCallback((clientId: string, clientVehicles: Vehicle[]): { total: number, breakdown: PatrimonyItem[] } => {
        let totalValue = 0;
        const breakdown: PatrimonyItem[] = [];
        
        // 1. Somar o valor de contrato (value) ou FIPE (fipeValue) de todos os veículos ativos do cliente
        clientVehicles.forEach(v => {
            // Apenas veículos com status 'active'
            if (v.status === 'active') {
                let value = 0;
                let source = "N/A";
                
                // Prioridade: 1. Valor Contrato (value)
                if (v.value) {
                    value = parseFloat(v.value);
                    source = "Valor Contrato";
                } 
                // 2. Valor FIPE (fipeValue) como fallback
                else if (v.fipeValue) {
                    value = parseFloat(v.fipeValue);
                    source = "Valor FIPE";
                }
                
                if (value > 0) {
                    totalValue += value;
                    breakdown.push({
                        id: v.id,
                        type: 'vehicle',
                        description: `${v.plate} - ${v.brand} ${v.model} (${v.year})`,
                        value: value,
                        source: source,
                        status: v.status,
                    });
                }
            }
        });

        // 2. Somar o valor de outros ativos (residencial, carga, outros) de cotações CONCLUÍDAS ('cliente')
        const clientQuotations = quotations.filter(q => q.clientId === clientId && q.status === 'cliente');
        
        clientQuotations.forEach(q => {
            const asset = q.asset;
            let value = 0;
            let description = "";
            
            switch (asset.type) {
                case 'residencial':
                    value = asset.valorPatrimonio;
                    description = `Residencial: ${asset.endereco}`;
                    break;
                case 'carga':
                    value = asset.valorTotal;
                    description = `Carga: R$ ${asset.valorTotal.toLocaleString('pt-BR')}`;
                    break;
                case 'outros':
                    value = asset.valorSegurado;
                    description = `Outros: ${asset.descricao}`;
                    break;
                // Veículos são contados na etapa 1 (clientVehicles)
            }
            
            if (value > 0) {
                totalValue += value;
                breakdown.push({
                    id: q.id,
                    type: 'quotation',
                    description: description,
                    value: value,
                    source: `Cotação #${q.id}`,
                    status: q.status,
                });
            }
        });
        
        return { total: totalValue, breakdown };
    }, [quotations]);


    return { 
        quotations, 
        loading, 
        isRefetching, 
        fetchQuotations, 
        addQuotation, 
        updateQuotationStatus,
        calculateClientTotalPatrimony,
    }
}