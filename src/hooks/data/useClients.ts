import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
// import type { Vehicle } from "@/components/frota/new-vehicle-modal" // REMOVIDO

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

// Helper function to map DB object to Client type
const mapDbToClient = (dbClient: any, clientVehicles: Vehicle[] = []): Client => ({
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

// Helper function to map DB object to Vehicle type (copied from useVehicles for local use)
const mapDbToVehicle = (dbVehicle: any): Vehicle => ({
    id: dbVehicle.id,
    type: dbVehicle.type,
    plate: dbVehicle.plate,
    brand: dbVehicle.brand,
    model: dbVehicle.model,
    year: dbVehicle.year,
    color: dbVehicle.color, // <-- CORRIGIDO: Mapeando 'color'
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


export function useClients() {
    const { user, loading: authLoading } = useAuth() // Adicionando authLoading
    const { toast } = useToast()
    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState(true)
    const [isRefetching, setIsRefetching] = useState(false) // Novo estado para refetch

    const fetchClients = useCallback(async (): Promise<Client[]> => {
        if (!user) {
            // Se não há usuário, mas a autenticação terminou, definimos loading como false
            if (!authLoading) {
                setLoading(false)
            }
            return []
        }

        // 1. Define loading state
        if (clients.length === 0) {
            setLoading(true)
        } else {
            setIsRefetching(true)
        }

        // 2. Fetch data
        const { data: clientsData, error: clientsError } = await supabase
            .from('clients')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        // 3. Fetch vehicles
        const { data: vehiclesData, error: vehiclesError } = await supabase
            .from('vehicles')
            .select('*')
            .eq('user_id', user.id)

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

        if (vehiclesError) {
            console.error("Erro ao carregar veículos:", vehiclesError.message)
        }

        const allVehicles = vehiclesData ? vehiclesData.map(mapDbToVehicle) : []
        
        // 4. Map vehicles to clients
        const formattedClients = clientsData.map(dbClient => {
            const clientVehicles = allVehicles.filter(v => v.clientId === dbClient.id)
            return mapDbToClient(dbClient, clientVehicles)
        })

        setClients(formattedClients)
        setLoading(false)
        setIsRefetching(false)
        return formattedClients
    }, [user, toast, authLoading]) // Adicionando authLoading como dependência

    useEffect(() => {
        // Só tenta buscar se a autenticação terminou e há um usuário, OU se a autenticação terminou e não há usuário (para definir loading=false)
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

        const addedClient = mapDbToClient(data, []) // New client starts with no vehicles

        setClients(prev => [addedClient, ...prev])
        toast({ title: "Sucesso", description: "Cliente adicionado com sucesso." })
        return { data: addedClient }
    }

    const updateClient = async (updatedClient: Client) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        // NOTE: We only update client data here. Vehicle updates/adds/deletes should be handled 
        // by separate functions (e.g., in useVehicles hook or dedicated client vehicle functions).
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