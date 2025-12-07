import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"

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
    // Garantindo que campos opcionais sejam null se não existirem
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
    const { user, loading: authLoading } = useAuth()
    const { toast } = useToast()
    // O estado 'vehicles' agora será mantido apenas para operações CRUD locais, 
    // mas o array principal de veículos será obtido via useClients.
    const [vehicles, setVehicles] = useState<Vehicle[]>([]) 
    const [loading, setLoading] = useState(false) // Definido como false, pois o carregamento principal é feito em useClients
    const [isRefetching, setIsRefetching] = useState(false)

    // Função de fetch agora apenas retorna um array vazio, pois o useClients faz o trabalho.
    // Mantemos a estrutura para compatibilidade com useAppInitialization (que será removida).
    const fetchVehicles = useCallback(async () => {
        if (!user) {
            setLoading(false)
            return
        }
        // NOTE: We rely on useClients to fetch the main list of vehicles via JOIN.
        // This function is kept minimal to avoid redundant API calls.
        setLoading(false)
    }, [user])

    useEffect(() => {
        // Removemos a chamada de fetch aqui, pois ela é redundante.
        // O useClients.fetchClients() é quem deve ser chamado para sincronizar.
        // No entanto, mantemos a função fetchVehicles para ser chamada manualmente se necessário.
    }, [])

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

        const addedVehicle = mapDbToVehicle(data)

        // Não atualizamos o estado local de 'vehicles' aqui, pois ele não é a fonte primária de dados.
        // O componente chamador (Clientes.tsx) deve chamar fetchClients para sincronizar.
        toast({ title: "Sucesso", description: "Veículo adicionado com sucesso." })
        return { data: addedVehicle }
    }

    const updateVehicle = async (updatedVehicle: Vehicle) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }
        
        if (!updatedVehicle.id) {
            return { error: { message: "ID do veículo ausente para atualização." }
            }
        }

        const dbData = mapVehicleToDb(updatedVehicle)

        const { error } = await supabase
            .from('vehicles')
            .update({
                ...dbData,
                user_id: user.id,
            })
            .eq('id', updatedVehicle.id)
            .select()

        if (error) {
            toast({ title: "Erro", description: `Falha ao atualizar veículo: ${error.message}`, variant: "destructive" })
            return { error }
        }

        // Não atualizamos o estado local de 'vehicles' aqui.
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

        // Não atualizamos o estado local de 'vehicles' aqui.
        toast({ title: "Sucesso", description: "Veículo excluído com sucesso." })
        return { data: true }
    }

    // Retornamos vehicles como um array vazio, pois ele não é a fonte primária.
    return { vehicles: [], loading, isRefetching, fetchVehicles, addVehicle, updateVehicle, deleteVehicle }
}