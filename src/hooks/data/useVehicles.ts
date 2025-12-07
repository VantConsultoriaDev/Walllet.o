import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { useDashboardDataContext } from "./DashboardDataProvider" // Importando o contexto central

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

// Helper function to map DB object to Vehicle type
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

// Helper function to map Vehicle type to DB object
const mapVehicleToDb = (vehicle: Partial<Vehicle>) => ({
    type: vehicle.type,
    plate: vehicle.plate,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year || null, 
    color: vehicle.color || null, 
    renavam: vehicle.renavam || null,
    chassi: vehicle.chassi || null,
    fipe_code: vehicle.fipeCode || null,
    fipe_value: vehicle.fipeValue || null,
    body_type: vehicle.bodyType || null,
    body_value: vehicle.bodyValue || null,
    value: vehicle.value || null,
    status: vehicle.status,
    client_id: vehicle.clientId,
})

export function useVehicles() {
    const { user } = useAuth()
    const { toast } = useToast()
    const { refetchData } = useDashboardDataContext() // Consumindo o contexto central

    // Mantemos o retorno mínimo, pois os dados são gerenciados por useClients
    const vehicles: Vehicle[] = [] 
    const loading = false
    const isRefetching = false

    const fetchVehicles = useCallback(async () => {
        // Apenas chama o refetchData do provedor principal
        await refetchData()
    }, [refetchData])

    const addVehicle = async (newVehicleData: Omit<Vehicle, 'id'>) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        if (!newVehicleData.clientId || !newVehicleData.plate || !newVehicleData.brand || !newVehicleData.model) {
             return { error: { message: "Dados obrigatórios do veículo ausentes." } }
        }

        const dbData = mapVehicleToDb({ ...newVehicleData, status: 'active' })

        const { data, error } = await supabase
            .from('vehicles')
            .insert({
                ...dbData,
                user_id: user.id,
            })
            .select()
            .single()

        if (error) {
            toast({ title: "Erro", description: `Falha ao adicionar veículo: ${error.message}`, variant: "destructive" })
            return { error }
        }

        // Força o recarregamento de todos os dados para sincronizar o estado global
        await refetchData()
        
        toast({ title: "Sucesso", description: "Veículo adicionado com sucesso." })
        return { data: mapDbToVehicle(data) }
    }

    const updateVehicle = async (updatedVehicle: Vehicle) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }
        
        if (!updatedVehicle.id) {
            return { error: { message: "ID do veículo ausente para atualização." }
            }
        }

        const dbData = mapVehicleToDb(updatedVehicle)

        const { data, error } = await supabase
            .from('vehicles')
            .update({
                ...dbData,
                user_id: user.id,
            })
            .eq('id', updatedVehicle.id)
            .select()
            .single()

        if (error) {
            toast({ title: "Erro", description: `Falha ao atualizar veículo: ${error.message}`, variant: "destructive" })
            return { error }
        }

        // Força o recarregamento de todos os dados para sincronizar o estado global
        await refetchData()
        
        toast({ title: "Sucesso", description: "Veículo atualizado com sucesso." })
        return { data: mapDbToVehicle(data) }
    }

    const deleteVehicle = async (id: string) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        const { error } = await supabase
            .from('vehicles')
            .delete()
            .eq('id', id)

        if (error) {
            toast({ title: "Erro", description: `Falha ao excluir veículo: ${error.message}`, variant: "destructive" })
            return { error }
        }

        // Força o recarregamento de todos os dados para sincronizar o estado global
        await refetchData()
        
        toast({ title: "Sucesso", description: "Veículo excluído com sucesso." })
        return { data: true }
    }

    return { vehicles, loading, isRefetching, fetchVehicles, addVehicle, updateVehicle, deleteVehicle }
}