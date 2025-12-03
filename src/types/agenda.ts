export type EventType = "renovacao" | "reuniao" | "vistoria" | "cobranca" | "outros"
export type UrgencyLevel = "normal" | "urgente" | "leve"
export type EventCategory = "compromisso" | "tarefa"

export interface Event {
    id: string
    title: string
    date: Date
    type: EventType
    urgency: UrgencyLevel
    category: EventCategory
    client: string
    description?: string
    completed?: boolean
}

export interface Boleto {
    id: string
    title: string
    value: number
    dueDate: Date
    clientId: string
    clientName: string
    status: "pending" | "paid" | "overdue"
}
