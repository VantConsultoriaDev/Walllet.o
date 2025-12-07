import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import type { Event } from "@/types/agenda"
import { useDashboardDataContext } from "./DashboardDataProvider" // Importando o contexto central

// Helper function to map DB object to Event type
const mapDbToEvent = (dbEvent: any): Event => ({
    id: dbEvent.id,
    title: dbEvent.title,
    date: new Date(dbEvent.date),
    type: dbEvent.type,
    urgency: dbEvent.urgency,
    category: dbEvent.category,
    client: dbEvent.client_name || "N/A", // Map client_name to client
    description: dbEvent.description,
    completed: dbEvent.completed,
})

export function useEvents() {
    const { user } = useAuth()
    const { toast } = useToast()
    const { data, loading, isRefetching, refetchData } = useDashboardDataContext() // Consumindo o contexto central

    // Mapeia os dados brutos para o formato Event[]
    const events: Event[] = useMemo(() => {
        if (!data?.events) return []
        return data.events.map(mapDbToEvent).sort((a, b) => a.date.getTime() - b.date.getTime())
    }, [data])

    // A função fetchEvents agora apenas chama o refetchData do provedor
    const fetchEvents = useCallback(async () => {
        await refetchData()
    }, [refetchData])

    const addEvent = async (newEvent: Omit<Event, 'id' | 'client'> & { client: string }) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        const { client, ...eventData } = newEvent;

        const { error } = await supabase
            .from('events')
            .insert({
                ...eventData,
                user_id: user.id,
                client_name: client, // Map client back to client_name for DB
                completed: false,
            })
            .select()
            .single()

        if (error) {
            toast({ title: "Erro", description: "Falha ao adicionar compromisso.", variant: "destructive" })
            return { error }
        }

        // Força o recarregamento de todos os dados para sincronizar o estado global
        await refetchData()
        
        toast({ title: "Sucesso", description: "Compromisso adicionado com sucesso." })
        return { data: true }
    }

    const updateEvent = async (updatedEvent: Event) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        const { client, ...eventData } = updatedEvent;

        const { error } = await supabase
            .from('events')
            .update({
                ...eventData,
                client_name: client,
                date: updatedEvent.date.toISOString().split('T')[0],
            })
            .eq('id', updatedEvent.id)
            .select()

        if (error) {
            toast({ title: "Erro", description: "Falha ao atualizar compromisso.", variant: "destructive" })
            return { error }
        }

        // Força o recarregamento de todos os dados para sincronizar o estado global
        await refetchData()
        
        toast({ title: "Sucesso", description: "Compromisso atualizado com sucesso." })
        return { data: updatedEvent }
    }

    const deleteEvent = async (id: string) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', id)

        if (error) {
            toast({ title: "Erro", description: "Falha ao excluir compromisso.", variant: "destructive" })
            return { error }
        }

        // Força o recarregamento de todos os dados para sincronizar o estado global
        await refetchData()
        
        toast({ title: "Sucesso", description: "Compromisso excluído com sucesso." })
        return { data: true }
    }

    return { events, loading, isRefetching, fetchEvents, addEvent, updateEvent, deleteEvent }
}