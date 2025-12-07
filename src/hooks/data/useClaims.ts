import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import type { Claim, ClaimHistory, ClaimComment, ClaimStatus, ThirdParty } from "@/types/sinistro"
import { useDashboardDataContext } from "./DashboardDataProvider" // Importando o contexto central

// Helper function to map DB object to Claim type
const mapDbToClaim = (dbClaim: any): Claim => {
    // Mapeia e ordena o histórico
    const claimHistory = (dbClaim.history || []).map((h: any) => ({
        id: h.id,
        date: new Date(h.created_at || h.date),
        fromStatus: h.from_status || h.fromStatus,
        toStatus: h.to_status || h.toStatus,
        updatedBy: h.updated_by || h.updatedBy,
        notes: h.notes,
    } as ClaimHistory)).sort((a: ClaimHistory, b: ClaimHistory) => b.date.getTime() - a.date.getTime()); // Ordena por data decrescente

    // Mapeia e ordena os comentários
    const claimComments = (dbClaim.comments || []).map((c: any) => ({
        id: c.id,
        text: c.text,
        createdAt: new Date(c.created_at || c.createdAt),
        createdBy: c.created_by || c.createdBy,
    } as ClaimComment)).sort((a: ClaimComment, b: ClaimComment) => a.createdAt.getTime() - b.createdAt.getTime()); // Ordena por data crescente

    return {
        id: dbClaim.id,
        clientId: dbClaim.client_id,
        clientName: dbClaim.client_name,
        clientPlate: dbClaim.client_plate,
        driverName: dbClaim.driver_name,
        driverCpf: dbClaim.driver_cpf,
        thirdParties: dbClaim.third_parties_data || [],
        thirdPartyName: dbClaim.third_parties_data?.[0]?.name, // Legacy/convenience field
        thirdPartyPlate: dbClaim.third_parties_data?.[0]?.asset?.plate, // Legacy/convenience field
        type: dbClaim.type,
        date: new Date(dbClaim.date),
        time: dbClaim.time,
        status: dbClaim.status,
        description: dbClaim.description,
        history: claimHistory,
        comments: claimComments,
        createdAt: new Date(dbClaim.created_at),
        updatedAt: new Date(dbClaim.updated_at),
    }
}

// Helper function to map Claim type to DB object for insertion/update
const mapClaimToDb = (claim: Partial<Claim>) => ({
    client_id: claim.clientId,
    client_name: claim.clientName,
    client_plate: claim.clientPlate,
    driver_name: claim.driverName,
    driver_cpf: claim.driverCpf,
    type: claim.type,
    date: claim.date?.toISOString().split('T')[0],
    time: claim.time,
    status: claim.status,
    description: claim.description,
    third_parties_data: claim.thirdParties,
    updated_at: new Date().toISOString(),
})

export function useClaims() {
    const { user } = useAuth()
    const { toast } = useToast()
    const { data, loading, isRefetching, refetchData } = useDashboardDataContext() // Consumindo o contexto central

    // Mapeia os dados brutos para o formato Claim[]
    const claims: Claim[] = useMemo(() => {
        if (!data?.claims) return []
        return data.claims.map(mapDbToClaim)
    }, [data])

    // A função fetchClaims agora apenas chama o refetchData do provedor
    const fetchClaims = useCallback(async () => {
        await refetchData()
    }, [refetchData])

    const addClaim = async (newClaim: Omit<Claim, 'id' | 'history' | 'comments' | 'createdAt' | 'updatedAt' | 'thirdPartyName' | 'thirdPartyPlate'>) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        const dbData = mapClaimToDb({ ...newClaim, status: 'aberto' })

        const { error } = await supabase
            .from('claims')
            .insert({
                ...dbData,
                user_id: user.id,
            })
            .select()
            .single()

        if (error) {
            toast({ title: "Erro", description: "Falha ao adicionar sinistro.", variant: "destructive" })
            return { error }
        }

        // Força o recarregamento de todos os dados para sincronizar o estado global
        await refetchData()
        
        toast({ title: "Sucesso", description: "Sinistro adicionado com sucesso." })
        return { data: true }
    }

    const updateClaimStatus = async (claimId: string, newStatus: ClaimStatus, notes?: string) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        const oldClaim = claims.find(c => c.id === claimId)
        if (!oldClaim) return { error: { message: "Sinistro não encontrado." } }

        // 1. Update claim status
        const { data: updatedClaimData, error: updateError } = await supabase
            .from('claims')
            .update({
                status: newStatus,
                updated_at: new Date().toISOString(),
            })
            .eq('id', claimId)
            .select()
            .single()

        if (updateError) {
            toast({ title: "Erro", description: "Falha ao atualizar status do sinistro.", variant: "destructive" })
            return { error: updateError }
        }

        // 2. Insert history entry
        const { error: historyError } = await supabase
            .from('claim_history')
            .insert({
                claim_id: claimId,
                user_id: user.id,
                from_status: oldClaim.status,
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
        
        toast({ title: "Sucesso", description: "Status do sinistro atualizado." })
        return { data: updatedClaimData }
    }

    const addComment = async (claimId: string, text: string) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        const { data, error } = await supabase
            .from('claim_comments')
            .insert({
                claim_id: claimId,
                user_id: user.id,
                text: text,
                created_by: user.name || user.email,
            })
            .select()
            .single()

        if (error) {
            toast({ title: "Erro", description: "Falha ao adicionar comentário.", variant: "destructive" })
            return { error }
        }

        // Força o recarregamento de todos os dados para sincronizar o estado global
        await refetchData()
        
        return { data: data }
    }

    return { claims, loading, isRefetching, fetchClaims, addClaim, updateClaimStatus, addComment }
}