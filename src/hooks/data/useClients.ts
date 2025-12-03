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

// Helper function to map DB object to Client type
const mapDbToClient = (dbClient: any): Client => ({
    id: dbClient.id,
    clientType: dbClient.client_type,
    name: dbClient.name,
    email: dbClient.email,
    phone: dbClient.phone,
    status: dbClient.status,
    address: dbClient.address,
    cpf: dbClient.cpf,
    cnpj: dbClient.cnpj,
    nomeFantasia: dbClient.nome_fantasia,
    razaoSocial: dbClient.razao_social,
    responsavel: dbClient.responsavel,
    contatoResponsavel: dbClient.contato_responsavel,
    vehicles: [
        // Mocking vehicles data for now, as vehicle fetching is not implemented yet
        { id: "v1", type: "CARRO", plate: "ABC-1234", brand: "Honda", model: "Civic", year: 2022, status: "active" },
    ] as Vehicle[]
})

// Helper function to map Client type to DB object
const mapClientToDb = (client: Partial<Client>) => ({
    client_type: client.clientType,
    name: client.name,
    email: client.email,
    phone: client.phone,
    status: client.status,
    address: client.address,
    cpf: client.cpf,
    cnpj: client.cnpj,
    nome_fantasia: client.nomeFantasia,
    razao_social: client.razaoSocial,
    responsavel: client.responsavel,
    contato_responsavel: client.contatoResponsavel,
})


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
            const formattedClients = data.map(mapDbToClient)
            setClients(formattedClients)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchClients()
    }, [user])

    const addClient = async (newClientData: Omit<Client, 'id' | 'status' | 'vehicles'>) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        const dbData = mapClientToDb({ ...newClientData, status: 'active' })

        const { data, error } = await supabase
            .from('clients')
            .insert({
                ...dbData,
                user_id: user.id,
            })
            .select()
            .single()

        if (error) {
            toast({ title: "Erro", description: "Falha ao adicionar cliente.", variant: "destructive" })
            return { error }
        }

        const addedClient = mapDbToClient(data)

        setClients(prev => [addedClient, ...prev])
        toast({ title: "Sucesso", description: "Cliente adicionado com sucesso." })
        return { data: addedClient }
    }

    const updateClient = async (updatedClient: Client) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        const dbData = mapClientToDb(updatedClient)

        const { error } = await supabase
            .from('clients')
            .update(dbData)
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