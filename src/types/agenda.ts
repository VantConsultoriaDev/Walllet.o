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
    title?: string // Added title as optional, as it wasn't in the DB schema but was in mock
    valor: number
    vencimento: Date
    dueDate: Date // Kept for compatibility with old mock structure/Agenda page
    clientId: string
    clientName: string
    placas: string[]
    representacao: string
    representacaoId?: string // <-- Adicionado para mapeamento DB
    status: "pending" | "paid" | "overdue"
    dataPagamento?: Date
    isRecurring: boolean
    recurrenceType?: "indefinite" | "limited"
    recurrenceMonths?: number
    recurrenceGroupId?: string
    comissaoRecorrente?: number
    comissaoTipo?: "percentual" | "valor"
}