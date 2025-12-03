import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import type { Vehicle } from "@/components/frota/new-vehicle-modal"

// Define o tipo Client baseado na estrutura do banco de dados (src/pages/Clientes.tsx)
export type Client = {
    id: string
    clientType: "PF" | "PJ"
    name: string
    email: string
    phone: string
    status: "active" | "inactive" | "blocked"
    cpf?: string
    cnpj?: string
    nomeFantasia?: string
    razaoSocial?: string
    responsavel?: string
    contatoResponsavel?: string
    address: string
    vehicles: Vehicle[] // Assuming vehicles are fetched separately or denormalized
}

export function useClients() {
    const { user } = useAuth()
    const { toast } = useToast()
    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState(true)

    const fetchClients = async () => {
        if (!user) {
            setLoading(false)
            return
        }

        setLoading(true)
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (error) {
            toast({
                title: "Erro ao carregar clientes",
                description: error.message,
                variant: "destructive",
            })
            setClients([])
        } else {
            // Mocking vehicles data since the schema doesn't include a direct join for the list view
            // In a real app, we'd fetch vehicles separately or use RLS policies for joins.
            const clientsWithMockVehicles = data.map(client => ({
                ...client,
                vehicles: [
                    { id: "v1", type: "CARRO", plate: "ABC-1234", brand: "Honda", model: "Civic", year: 2022, status: "active" },
                ] as Vehicle[]
            })) as Client[]
            setClients(clientsWithMockVehicles)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchClients()
    }, [user])

    const addClient = async (newClientData: Omit<Client, 'id' | 'status' | 'vehicles'>) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        const { data, error } = await supabase
            .from('clients')
            .insert({
                ...newClientData,
                user_id: user.id,
                status: 'active',
            })
            .select()
            .single()

        if (error) {
            toast({ title: "Erro", description: "Falha ao adicionar cliente.", variant: "destructive" })
            return { error }
        }

        const addedClient: Client = {
            ...data,
            vehicles: [] as Vehicle[] // Initialize empty vehicles array
        }

        setClients(prev => [addedClient, ...prev])
        toast({ title: "Sucesso", description: "Cliente adicionado com sucesso." })
        return { data: addedClient }
    }

    const updateClient = async (updatedClient: Client) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        const { vehicles, ...clientData } = updatedClient;

        const { error } = await supabase
            .from('clients')
            .update(clientData)
            .eq('id', updatedClient.id)
            .select()

        if (error) {
            toast({ title: "Erro", description: "Falha ao atualizar cliente.", variant: "destructive" })
            return { error }
        }

        setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c))
        toast({ title: "Sucesso", description: "Cliente atualizado com sucesso." })
        return { data: updatedClient }
    }

    return { clients, loading, fetchClients, addClient, updateClient }
}