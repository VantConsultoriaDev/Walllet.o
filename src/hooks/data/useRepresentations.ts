import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import type { Partner } from "@/components/representacoes/new-representacao-modal"
import { useDashboardDataContext } from "./DashboardDataProvider" // Importando o contexto central

// Helper function to map DB object to Partner type
const mapDbToPartner = (dbPartner: any): Partner => ({
    id: dbPartner.id,
    name: dbPartner.name,
    type: dbPartner.type,
    contact: dbPartner.contact,
    email: dbPartner.email,
    website: dbPartner.website,
    logo: dbPartner.logo_url,
    commissionDay: dbPartner.commission_day, // Novo campo
})

// Helper function to map Partner type to DB object
const mapPartnerToDb = (partner: Partial<Partner>) => ({
    name: partner.name,
    type: partner.type,
    contact: partner.contact,
    email: partner.email,
    website: partner.website,
    logo_url: partner.logo,
    commission_day: partner.commissionDay, // Novo campo
})

export function useRepresentations() {
    const { user } = useAuth()
    const { toast } = useToast()
    const { data, loading, isRefetching, refetchData } = useDashboardDataContext() // Consumindo o contexto central

    // Mapeia os dados brutos para o formato Partner[]
    const partners: Partner[] = useMemo(() => {
        if (!data?.representations) return []
        return data.representations.map(mapDbToPartner)
    }, [data])

    // A função fetchPartners agora apenas chama o refetchData do provedor
    const fetchPartners = useCallback(async () => {
        await refetchData()
    }, [refetchData])

    const addPartner = async (newPartnerData: Omit<Partner, 'id' | 'contact' | 'email' | 'logo'> & { logo?: File | null }) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        // NOTE: Logo upload logic is skipped for now, assuming logo is a URL or null
        const logoUrl = newPartnerData.logo ? "MOCK_URL" : null; 

        const dbData = mapPartnerToDb({ 
            ...newPartnerData, 
            logo: logoUrl || undefined,
            contact: "", // Default empty
            email: "", // Default empty
        })

        const { error } = await supabase
            .from('representations')
            .insert({
                ...dbData,
                user_id: user.id,
            })
            .select()
            .single()

        if (error) {
            toast({ title: "Erro", description: "Falha ao adicionar representação.", variant: "destructive" })
            return { error }
        }

        // Força o recarregamento de todos os dados para sincronizar o estado global
        await refetchData()
        
        toast({ title: "Sucesso", description: "Representação adicionada com sucesso." })
        return { data: true }
    }

    const updatePartner = async (updatedPartner: Partner) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        const dbData = mapPartnerToDb(updatedPartner)

        const { error } = await supabase
            .from('representations')
            .update(dbData)
            .eq('id', updatedPartner.id)
            .select()

        if (error) {
            toast({ title: "Erro", description: "Falha ao atualizar representação.", variant: "destructive" })
            return { error }
        }

        // Força o recarregamento de todos os dados para sincronizar o estado global
        await refetchData()
        
        toast({ title: "Sucesso", description: "Representação atualizada com sucesso." })
        return { data: updatedPartner }
    }

    return { partners, loading, isRefetching, fetchPartners, addPartner, updatePartner }
}