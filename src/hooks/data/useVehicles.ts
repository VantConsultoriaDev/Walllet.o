import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
// import type { Vehicle } from "@/components/frota/new-vehicle-modal" // REMOVIDO

export type VehicleType = "CAVALO" | "TRUCK" | "CARRETA" | "CARRO" | "MOTO"

export type Vehicle = {
    id: string
    clientId: string // Added clientId
    type: VehicleType
    plate: string
    brand: string
    model: string
    year: number // <-- Novo campo
    color?: string // <-- Novo campo
    renavam?: string
    chassi?: string
    fipeCode?: string
    fipeValue?: string
    bodyType?: string // Carroceria (Truck)
    bodyValue?: string // Valor Carroceria (Truck)
    value?: string // Valor Contrato (ou Valor Carreta)
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
    color: dbVehicle.color, // <-- Mapeando 'color'
    renavam: dbVehicle.renavam,
    chassi: dbVehicle.chassi,
    fipeCode: dbVehicle.fipe_code,
    fipeValue: dbVehicle.fipe_value,
    bodyType: dbVehicle.body_type,
    bodyValue: dbVehicle.body_value,
    value: dbVehicle.value,
    status: dbVehicle.status,
    clientId: dbVehicle.client_id, // Keep client_id for mapping
})

// Helper function to map Vehicle type to DB object
const mapVehicleToDb = (vehicle: Partial<Vehicle>) => ({
    type: vehicle.type,
    plate: vehicle.plate,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    color: vehicle.color, // <-- Mapeando 'color'
    renavam: vehicle.renavam,
    chassi: vehicle.chassi,
    fipe_code: vehicle.fipeCode,
    fipe_value: vehicle.fipeValue,
    body_type: vehicle.bodyType,
    body_value: vehicle.bodyValue,
    value: vehicle.value,
    status: vehicle.status,
    client_id: vehicle.clientId,
})

export function useVehicles() {
    const { user } = useAuth()
    const { toast } = useToast()
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    const [loading, setLoading] = useState(true)
    const [isRefetching, setIsRefetching] = useState(false)

    const fetchVehicles = useCallback(async () => {
        if (!user) {
            setLoading(false)
            return
        }

        if (vehicles.length === 0) {
            setLoading(true)
        } else {
            setIsRefetching(true)
        }

        const { data, error } = await supabase
            .from('vehicles')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (error) {
            toast({
                title: "Erro ao carregar veículos",
                description: error.message,
                variant: "destructive",
            })
            setVehicles([])
        } else {
            const formattedData = data.map(mapDbToVehicle)
            setVehicles(formattedData)
        }
        setLoading(false)
        setIsRefetching(false)
    }, [user, toast])

    useEffect(() => {
        fetchVehicles()
    }, [user, fetchVehicles])

    const addVehicle = async (newVehicleData: Omit<Vehicle, 'id'>) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        // Ensure required fields are present before mapping
        if (!newVehicleData.clientId || !newVehicleData.plate || !newVehicleData.brand || !newVehicleData.model) {
             return { error: { message: "Dados obrigatórios do veículo ausentes." } }
        }

        // Note: We explicitly omit 'id' here as it's Omit<Vehicle, 'id'>
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

        const addedVehicle = mapDbToVehicle(data)

        // Usando a forma funcional para garantir que o estado seja atualizado corretamente
        setVehicles(prev => [addedVehicle, ...prev])
        toast({ title: "Sucesso", description: "Veículo adicionado com sucesso." })
        return { data: addedVehicle }
    }

    const updateVehicle = async (updatedVehicle: Vehicle) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }
        
        // CRITICAL FIX: Ensure ID exists before attempting update
        if (!updatedVehicle.id) {
            return { error: { message: "ID do veículo ausente para atualização." }
            }
        }

        const dbData = mapVehicleToDb(updatedVehicle)

        const { error } = await supabase
            .from('vehicles')
            .update(dbData)
            .eq('id', updatedVehicle.id)
            .select()

        if (error) {
            toast({ title: "Erro", description: `Falha ao atualizar veículo: ${error.message}`, variant: "destructive" })
            return { error }
        }

        setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? updatedVehicle : v))
        toast({ title: "Sucesso", description: "Veículo atualizado com sucesso." })
        return { data: updatedVehicle }
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

        setVehicles(prev => prev.filter(v => v.id !== id))
        toast({ title: "Sucesso", description: "Veículo excluído com sucesso." })
        return { data: true }
    }

    return { vehicles, loading, isRefetching, fetchVehicles, addVehicle, updateVehicle, deleteVehicle }
}