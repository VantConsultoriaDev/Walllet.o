import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import type { Cotacao, CotacaoHistory, CotacaoStatus, Asset, Commission } from "@/types/cotacao"

// Helper function to map DB object to Cotacao type
const mapDbToCotacao = (dbCotacao: any, history: CotacaoHistory[] = []): Cotacao => ({
    id: dbCotacao.id,
    clientType: dbCotacao.client_type,
    cpfCnpj: dbCotacao.cpf_cnpj,
    razaoSocialNome: dbCotacao.razao_social_nome,
    nomeFantasia: dbCotacao.nome_fantasia,
    representacaoId: dbCotacao.representacao_id,
    representacaoNome: dbCotacao.representacao_nome, // Assuming this is denormalized or fetched
    asset: dbCotacao.asset_data as Asset,
    anuidade: parseFloat(dbCotacao.anuidade),
    parcelas: dbCotacao.parcelas,
    comissao: dbCotacao.comissao_data as Commission,
    status: dbCotacao.status,
    history: history,
    createdAt: new Date(dbCotacao.created_at),
    updatedAt: new Date(dbCotacao.updated_at),
})

// Helper function to map Cotacao type to DB object for insertion/update
const mapCotacaoToDb = (cotacao: Partial<Cotacao>) => ({
    client_id: cotacao.clientId, // Assuming clientId exists if client is linked
    client_type: cotacao.clientType,
    cpf_cnpj: cotacao.cpfCnpj,
    razao_social_nome: cotacao.razaoSocialNome,
    nome_fantasia: cotacao.nomeFantasia,
    representacao_id: cotacao.representacaoId,
    asset_type: cotacao.asset?.type, // Store asset type separately for filtering
    asset_data: cotacao.asset,
    anuidade: cotacao.anuidade?.toFixed(2),
    parcelas: cotacao.parcelas,
    comissao_data: cotacao.comissao,
    status: cotacao.status,
    updated_at: new Date().toISOString(),
})

export function useQuotations() {
    const { user } = useAuth()
    const { toast } = useToast()
    const [quotations, setQuotations] = useState<Cotacao[]>([])
    const [loading, setLoading] = useState(true)

    const fetchQuotations = async () => {
        if (!user) {
            setLoading(false)
            return
        }

        setLoading(true)

        // 1. Fetch all quotations
        const { data: quotesData, error: quotesError } = await supabase
            .from('quotations')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (quotesError) {
            toast({ title: "Erro", description: quotesError.message, variant: "destructive" })
            setQuotations([])
            setLoading(false)
            return
        }

        // 2. Fetch all history entries
        const { data: historyData, error: historyError } = await supabase
            .from('quotation_history')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (historyError) {
            console.error("Erro ao carregar histórico de cotações:", historyError.message)
        }

        const allHistory = historyData || []

        // 3. Map quotations and attach history
        const formattedQuotations = quotesData.map(dbCotacao => {
            const cotacaoHistory = allHistory
                .filter(h => h.quotation_id === dbCotacao.id)
                .map(h => ({
                    id: h.id,
                    date: new Date(h.created_at),
                    fromStatus: h.from_status,
                    toStatus: h.to_status,
                    updatedBy: h.updated_by,
                    notes: h.notes,
                } as CotacaoHistory))
            
            return mapDbToCotacao(dbCotacao, cotacaoHistory)
        })

        setQuotations(formattedQuotations)
        setLoading(false)
    }

    useEffect(() => {
        fetchQuotations()
    }, [user])

    const addQuotation = async (newQuotation: Omit<Cotacao, 'id' | 'history' | 'createdAt' | 'updatedAt'>) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        const dbData = mapCotacaoToDb(newQuotation)

        const { data, error } = await supabase
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

        const addedQuotation = mapDbToCotacao(data, [])

        setQuotations(prev => [addedQuotation, ...prev])
        toast({ title: "Sucesso", description: "Cotação adicionada com sucesso." })
        return { data: addedQuotation }
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
        const { data: historyEntry, error: historyError } = await supabase
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
            // We proceed even if history fails, but log the error
        }

        // 3. Update local state
        const newHistoryEntry: CotacaoHistory = {
            id: historyEntry?.id || 'temp-id',
            date: new Date(historyEntry?.created_at || new Date()),
            fromStatus: oldQuotation.status,
            toStatus: newStatus,
            updatedBy: historyEntry?.updated_by || user.name || user.email,
            notes: notes,
        }

        const updatedCotacao: Cotacao = {
            ...oldQuotation,
            status: newStatus,
            updatedAt: new Date(updatedQuote.updated_at),
            history: [newHistoryEntry, ...oldQuotation.history]
        }

        setQuotations(prev => prev.map(q => q.id === quotationId ? updatedCotacao : q))
        toast({ title: "Sucesso", description: "Status da cotação atualizado." })
        return { data: updatedCotacao }
    }

    return { quotations, loading, fetchQuotations, addQuotation, updateQuotationStatus }
}