import type { Event, Boleto } from "@/types/agenda"

const today = new Date()
const tomorrow = new Date(today)
tomorrow.setDate(tomorrow.getDate() + 1)
const nextWeek = new Date(today)
nextWeek.setDate(nextWeek.getDate() + 7)

export const mockEvents: Event[] = [
    {
        id: "1",
        title: "Renovação Seguro Auto",
        date: today,
        type: "renovacao",
        urgency: "urgente",
        category: "compromisso",
        client: "João Silva",
        description: "Cliente solicitou contato urgente para renovação."
    },
    {
        id: "2",
        title: "Vistoria Residencial",
        date: tomorrow,
        type: "vistoria",
        urgency: "normal",
        category: "compromisso",
        client: "Maria Oliveira",
    },
    {
        id: "3",
        title: "Reunião de Alinhamento",
        date: nextWeek,
        type: "reuniao",
        urgency: "normal",
        category: "compromisso",
        client: "Associação ABC",
    },
    {
        id: "4",
        title: "Cobrança Pendente",
        date: today,
        type: "cobranca",
        urgency: "urgente",
        category: "tarefa",
        client: "Carlos Santos",
    },
    {
        id: "5",
        title: "Enviar apólice assinada",
        date: today,
        type: "outros",
        urgency: "normal",
        category: "tarefa",
        client: "Ana Pereira",
    },
    {
        id: "6",
        title: "Verificar pagamento pendente",
        date: today,
        type: "cobranca",
        urgency: "leve",
        category: "tarefa",
        client: "Roberto Costa",
    }
]

export const mockBoletos: Boleto[] = [
    {
        id: "101",
        title: "Seguro Auto - Parcela 1/12",
        value: 250.00,
        dueDate: today,
        clientId: "1",
        clientName: "João Silva",
        status: "pending"
    },
    {
        id: "102",
        title: "Seguro Residencial - Cota Única",
        value: 1200.00,
        dueDate: today,
        clientId: "2",
        clientName: "Maria Oliveira",
        status: "pending"
    },
    {
        id: "103",
        title: "Seguro Vida - Mensalidade",
        value: 150.00,
        dueDate: tomorrow,
        clientId: "3",
        clientName: "Carlos Santos",
        status: "pending"
    }
]
