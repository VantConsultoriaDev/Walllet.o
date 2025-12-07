import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"

// Definindo o tipo Vehicle localmente
export type VehicleType = "CAVALO" | "TRUCK" | "CARRETA" | "CARRO" | "MOTO"

export type Vehicle = {
    id: string
    clientId: string
    type: VehicleType
    plate: string
    brand: string
    model: string
    year: number
    color?: string
    renavam?: string
    chassi?: string
    fipeCode?: string
    fipeValue?: string
    bodyType?: string
    bodyValue?: string
    value?: string
    status: "active" | "inactive" | "maintenance"
}


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
    vehicles: Vehicle[] // Vehicles are now dynamically fetched and mapped
}

// Helper function to map DB object to Vehicle type (for nested data)
const mapDbToVehicle = (dbVehicle: any): Vehicle => ({
    id: dbVehicle.id,
    type: dbVehicle.type,
    plate: dbVehicle.plate,
    brand: dbVehicle.brand,
    model: dbVehicle.model,
    year: dbVehicle.year,
    color: dbVehicle.color,
    renavam: dbVehicle.renavam,
    chassi: dbVehicle.chassi,
    fipeCode: dbVehicle.fipe_code,
    fipeValue: dbVehicle.fipe_value,
    bodyType: dbVehicle.body_type,
    bodyValue: dbVehicle.body_value,
    value: dbVehicle.value,
    status: dbVehicle.status,
    clientId: dbVehicle.client_id,
})

// Helper function to map DB object to Client type
const mapDbToClient = (dbClient: any): Client => {
    // Mapeia os veículos aninhados
    const clientVehicles = (dbClient.vehicles || []).map(mapDbToVehicle);
    
    return {
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
        vehicles: clientVehicles,
    }
}

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
    const { user, loading: authLoading } = useAuth()
    const { toast } = useToast()
    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState(true)
    const [isRefetching, setIsRefetching] = useState(false)

    const fetchClients = useCallback(async (): Promise<Client[]> => {
        if (!user) {
            if (!authLoading) {
                setLoading(false)
            }
            return []
        }

        if (clients.length === 0) {
            setLoading(true)
        } else {
            setIsRefetching(true)
        }

        // 1. Fetch clients and their associated vehicles in a single query (JOIN)
        const { data: clientsData, error: clientsError } = await supabase
            .from('clients')
            .select(`
                *,
                vehicles (
                    id, client_id, type, plate, brand, model, year, color, renavam, chassi, fipe_code, fipe_value, body_type, body_value, value, status
                )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (clientsError) {
            toast({
                title: "Erro ao carregar clientes",
                description: clientsError.message,
                variant: "destructive",
            })
            setClients([])
            setLoading(false)
            setIsRefetching(false)
            return []
        }

        // 2. Map data
        const formattedClients = clientsData.map(mapDbToClient)

        setClients(formattedClients)
        setLoading(false)
        setIsRefetching(false)
        return formattedClients
    }, [user, toast, authLoading])

    useEffect(() => {
        if (!authLoading) {
            fetchClients()
        }
    }, [authLoading, fetchClients])

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

        const addedClient = mapDbToClient(data) // New client starts with no vehicles

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

    return { clients, loading, isRefetching, fetchClients, addClient, updateClient }
}