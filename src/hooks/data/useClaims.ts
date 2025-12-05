import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import type { Claim, ClaimHistory, ClaimComment, ClaimStatus, ThirdParty } from "@/types/sinistro"

// Helper function to map DB object to Claim type
const mapDbToClaim = (dbClaim: any, history: ClaimHistory[] = [], comments: ClaimComment[] = []): Claim => ({
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
    history: history,
    comments: comments,
    createdAt: new Date(dbClaim.created_at),
    updatedAt: new Date(dbClaim.updated_at),
})

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
    const [claims, setClaims] = useState<Claim[]>([])
    const [loading, setLoading] = useState(true)
    const [isRefetching, setIsRefetching] = useState(false)

    const fetchClaims = useCallback(async () => {
        if (!user) {
            setLoading(false)
            return
        }

        if (claims.length === 0) {
            setLoading(true)
        } else {
            setIsRefetching(true)
        }

        // 1. Fetch all claims
        const { data: claimsData, error: claimsError } = await supabase
            .from('claims')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (claimsError) {
            toast({ title: "Erro ao carregar sinistros", description: claimsError.message, variant: "destructive" })
            setClaims([])
            setLoading(false)
            setIsRefetching(false)
            return
        }

        // 2. Fetch all history entries
        const { data: historyData } = await supabase
            .from('claim_history')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
        
        const allHistory = historyData || []

        // 3. Fetch all comments
        const { data: commentsData } = await supabase
            .from('claim_comments')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })
        
        const allComments = commentsData || []

        // 4. Map claims and attach history/comments
        const formattedClaims = claimsData.map(dbClaim => {
            const claimHistory = allHistory
                .filter(h => h.claim_id === dbClaim.id)
                .map(h => ({
                    id: h.id,
                    date: new Date(h.created_at),
                    fromStatus: h.from_status,
                    toStatus: h.to_status,
                    updatedBy: h.updated_by,
                    notes: h.notes,
                } as ClaimHistory))
            
            const claimComments = allComments
                .filter(c => c.claim_id === dbClaim.id)
                .map(c => ({
                    id: c.id,
                    text: c.text,
                    createdAt: new Date(c.created_at),
                    createdBy: c.created_by,
                } as ClaimComment))
            
            return mapDbToClaim(dbClaim, claimHistory, claimComments)
        })

        setClaims(formattedClaims)
        setLoading(false)
        setIsRefetching(false)
    }, [user, toast, claims.length])

    useEffect(() => {
        fetchClaims()
    }, [user, fetchClaims])

    const addClaim = async (newClaim: Omit<Claim, 'id' | 'history' | 'comments' | 'createdAt' | 'updatedAt' | 'thirdPartyName' | 'thirdPartyPlate'>) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        const dbData = mapClaimToDb({ ...newClaim, status: 'aberto' })

        const { data, error } = await supabase
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

        const addedClaim = mapDbToClaim(data, [], [])

        setClaims(prev => [addedClaim, ...prev])
        toast({ title: "Sucesso", description: "Sinistro adicionado com sucesso." })
        return { data: addedClaim }
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
        const { data: historyEntry, error: historyError } = await supabase
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

        // 3. Update local state
        const newHistoryEntry: ClaimHistory = {
            id: historyEntry?.id || 'temp-id',
            date: new Date(historyEntry?.created_at || new Date()),
            fromStatus: oldClaim.status,
            toStatus: newStatus,
            updatedBy: historyEntry?.updated_by || user.name || user.email,
            notes: notes,
        }

        const updatedClaim: Claim = {
            ...oldClaim,
            status: newStatus,
            updatedAt: new Date(updatedClaimData.updated_at),
            history: [newHistoryEntry, ...oldClaim.history]
        }

        setClaims(prev => prev.map(c => c.id === claimId ? updatedClaim : c))
        toast({ title: "Sucesso", description: "Status do sinistro atualizado." })
        return { data: updatedClaim }
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

        const newComment: ClaimComment = {
            id: data.id,
            text: data.text,
            createdAt: new Date(data.created_at),
            createdBy: data.created_by,
        }

        setClaims(prev => prev.map(c => {
            if (c.id === claimId) {
                return { ...c, comments: [newComment, ...c.comments] }
            }
            return c
        }))
        return { data: newComment }
    }

    return { claims, loading, isRefetching, fetchClaims, addClaim, updateClaimStatus, addComment }
}