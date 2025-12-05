import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import type { Partner } from "@/components/representacoes/new-representacao-modal"

// Helper function to map DB object to Partner type
const mapDbToPartner = (dbPartner: any): Partner => ({
    id: dbPartner.id,
    name: dbPartner.name,
    type: dbPartner.type,
    contact: dbPartner.contact,
    email: dbPartner.email,
    website: dbPartner.website,
    logo: dbPartner.logo_url,
})

// Helper function to map Partner type to DB object
const mapPartnerToDb = (partner: Partial<Partner>) => ({
    name: partner.name,
    type: partner.type,
    contact: partner.contact,
    email: partner.email,
    website: partner.website,
    logo_url: partner.logo,
})

export function useRepresentations() {
    const { user } = useAuth()
    const { toast } = useToast()
    const [partners, setPartners] = useState<Partner[]>([])
    const [loading, setLoading] = useState(true)
    const [isRefetching, setIsRefetching] = useState(false)

    const fetchPartners = useCallback(async () => {
        if (!user) {
            setLoading(false)
            return
        }

        if (partners.length === 0) {
            setLoading(true)
        } else {
            setIsRefetching(true)
        }

        const { data, error } = await supabase
            .from('representations')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (error) {
            toast({
                title: "Erro ao carregar representações",
                description: error.message,
                variant: "destructive",
            })
            setPartners([])
        } else {
            const formattedData = data.map(mapDbToPartner)
            setPartners(formattedData)
        }
        setLoading(false)
        setIsRefetching(false)
    }, [user, toast, partners.length])

    useEffect(() => {
        fetchPartners()
    }, [user, fetchPartners])

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

        const { data, error } = await supabase
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

        const addedPartner = mapDbToPartner(data)

        setPartners(prev => [addedPartner, ...prev])
        toast({ title: "Sucesso", description: "Representação adicionada com sucesso." })
        return { data: addedPartner }
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

        setPartners(prev => prev.map(p => p.id === updatedPartner.id ? updatedPartner : p))
        toast({ title: "Sucesso", description: "Representação atualizada com sucesso." })
        return { data: updatedPartner }
    }

    return { partners, loading, isRefetching, fetchPartners, addPartner, updatePartner }
}