import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { useDashboardDataContext } from "./DashboardDataProvider" // Importando o contexto central

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
    const { user } = useAuth()
    const { toast } = useToast()
    const { data, loading, isRefetching, refetchData } = useDashboardDataContext() // Consumindo o contexto central
    
    // Mapeia os dados brutos para o formato Client[]
    const clients: Client[] = useMemo(() => {
        if (!data?.clients) return []
        return data.clients.map(mapDbToClient)
    }, [data])

    // A função fetchClients agora apenas chama o refetchData do provedor
    const fetchClients = useCallback(async () => {
        await refetchData()
        return clients // Retorna o estado atualizado (embora o estado seja atualizado pelo provedor)
    }, [refetchData, clients])

    const addClient = async (newClientData: Omit<Client, 'id' | 'status' | 'vehicles'>) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        const dbData = mapClientToDb({ ...newClientData, status: 'active' })

        const { data: insertedData, error } = await supabase
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

        // Força o recarregamento de todos os dados para sincronizar o estado global
        await refetchData()
        
        const addedClient = mapDbToClient(insertedData)

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

        // Força o recarregamento de todos os dados para sincronizar o estado global
        await refetchData()
        
        toast({ title: "Sucesso", description: "Cliente atualizado com sucesso." })
        return { data: updatedClient }
    }

    return { clients, loading, isRefetching, fetchClients, addClient, updateClient }
}