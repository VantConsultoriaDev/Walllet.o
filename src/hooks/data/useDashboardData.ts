import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"

// Define a estrutura de dados bruta esperada da função RPC
export interface RawDashboardData {
    clients: any[]
    representations: any[]
    transactions: any[]
    quotations: any[]
    claims: any[]
    events: any[]
    boletos: any[]
}

export function useDashboardData() {
    const { user, loading: authLoading } = useAuth()
    const { toast } = useToast()
    const [data, setData] = useState<RawDashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [isRefetching, setIsRefetching] = useState(false)

    const fetchData = useCallback(async () => {
        if (!user) {
            if (!authLoading) {
                setLoading(false)
            }
            return
        }

        if (data === null) {
            setLoading(true)
        } else {
            setIsRefetching(true)
        }

        try {
            const { data: result, error } = await supabase.rpc('get_user_dashboard_data', {
                user_id_input: user.id,
            })

            if (error) {
                console.error("RPC Error fetching dashboard data:", error)
                toast({
                    title: "Erro de Sincronização",
                    description: "Falha ao carregar todos os dados essenciais. Tente recarregar.",
                    variant: "destructive",
                })
                setData(null)
            } else {
                // O resultado é um objeto JSONB, que o Supabase retorna como um objeto JS.
                // Garantimos que todos os campos sejam arrays, mesmo que vazios.
                const rawData: RawDashboardData = {
                    clients: result.clients || [],
                    representations: result.representations || [],
                    transactions: result.transactions || [],
                    quotations: result.quotations || [],
                    claims: result.claims || [],
                    events: result.events || [],
                    boletos: result.boletos || [],
                }
                setData(rawData)
            }
        } catch (e) {
            console.error("General error during data fetch:", e)
            toast({
                title: "Erro Inesperado",
                description: "Ocorreu um erro ao buscar os dados do servidor.",
                variant: "destructive",
            })
            setData(null)
        } finally {
            setLoading(false)
            setIsRefetching(false)
        }
    }, [user, toast, authLoading, data])

    useEffect(() => {
        if (!authLoading) {
            fetchData()
        }
    }, [authLoading, fetchData])

    return { data, loading, isRefetching, fetchData }
}