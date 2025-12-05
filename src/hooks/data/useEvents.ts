import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import type { Event } from "@/types/agenda"

export function useEvents() {
    const { user } = useAuth()
    const { toast } = useToast()
    const [events, setEvents] = useState<Event[]>([])
    const [loading, setLoading] = useState(true)
    const [isRefetching, setIsRefetching] = useState(false)

    const fetchEvents = useCallback(async () => {
        if (!user) {
            setLoading(false)
            return
        }

        if (events.length === 0) {
            setLoading(true)
        } else {
            setIsRefetching(true)
        }

        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: true })

        if (error) {
            toast({
                title: "Erro ao carregar agenda",
                description: error.message,
                variant: "destructive",
            })
            setEvents([])
        } else {
            // Convert date strings back to Date objects
            const formattedData = data.map(e => ({
                ...e,
                date: new Date(e.date),
                client: e.client_name || "N/A" // Map client_name to client
            })) as Event[]
            setEvents(formattedData)
        }
        setLoading(false)
        setIsRefetching(false)
    }, [user, toast, events.length])

    useEffect(() => {
        fetchEvents()
    }, [user, fetchEvents])

    const addEvent = async (newEvent: Omit<Event, 'id' | 'client'> & { client: string }) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }

        const { client, ...eventData } = newEvent;

        const { data, error } = await supabase
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

        const addedEvent: Event = {
            ...data,
            date: new Date(data.date),
            client: data.client_name,
        }

        setEvents(prev => [...prev, addedEvent])
        toast({ title: "Sucesso", description: "Compromisso adicionado com sucesso." })
        return { data: addedEvent }
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

        setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e))
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

        setEvents(prev => prev.filter(e => e.id !== id))
        toast({ title: "Sucesso", description: "Compromisso excluído com sucesso." })
        return { data: true }
    }

    return { events, loading, isRefetching, fetchEvents, addEvent, updateEvent, deleteEvent }
}