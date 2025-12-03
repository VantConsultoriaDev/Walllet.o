import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, LayoutGrid, List, Calendar as CalendarIcon, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { KanbanColumn } from "@/components/sinistros/kanban-column"
import { SinistroModal } from "@/components/sinistros/sinistro-modal"
import { NewSinistroModal } from "@/components/sinistros/new-sinistro-modal"
import { DataTable } from "@/components/ui/data-table"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { DataTableFilterConfig } from "@/components/ui/data-table-toolbar"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { normalizeString } from "@/lib/utils"
import {
    Claim,
    ClaimStatus,
    ClaimType,
    CLAIM_STATUS_LABELS,
    CLAIM_TYPE_LABELS
} from "@/types/sinistro"
import { NewSinistroFormData } from "@/components/sinistros/new-sinistro-modal"
import { ColumnDef } from "@tanstack/react-table"

const mockClaims: Claim[] = [
    {
        id: "SIN-001",
        clientId: "1",
        clientName: "João Silva",
        clientPlate: "ABC-1234",
        driverName: "João Silva",
        driverCpf: "123.456.789-00",
        thirdParties: [
            {
                id: "tp1",
                name: "Maria Santos",
                cpf: "987.654.321-00",
                asset: {
                    type: "vehicle",
                    plate: "XYZ-5678",
                    brand: "Honda",
                    model: "Civic",
                    year: 2020,
                    color: "Prata"
                }
            }
        ],
        thirdPartyName: "Maria Santos",
        thirdPartyPlate: "XYZ-5678",
        type: "colisao_tombamento",
        date: new Date("2024-01-15"),
        time: "14:30",
        status: "aberto",
        description: "Colisão traseira na Av. Paulista. Cliente parado no semáforo quando foi atingido pelo terceiro.",
        history: [],
        comments: [],
        createdAt: new Date("2024-01-15T08:30:00"),
        updatedAt: new Date("2024-01-15T08:30:00")
    },
    {
        id: "SIN-002",
        clientId: "2",
        clientName: "Maria Oliveira",
        clientPlate: "DEF-5678",
        driverName: "Maria Oliveira",
        driverCpf: "234.567.890-11",
        thirdParties: [],
        type: "roubo_furto",
        date: new Date("2024-01-20"),
        time: "03:15",
        status: "analise",
        description: "Veículo furtado do estacionamento do condomínio durante a madrugada.",
        history: [
            {
                id: "h1",
                date: new Date("2024-01-21T10:00:00"),
                fromStatus: "aberto",
                toStatus: "analise",
                updatedBy: "Sistema",
                notes: "Documentação recebida e em análise pela equipe técnica."
            }
        ],
        comments: [],
        createdAt: new Date("2024-01-20T09:15:00"),
        updatedAt: new Date("2024-01-21T10:00:00")
    },
    {
        id: "SIN-003",
        clientId: "3",
        clientName: "Carlos Santos",
        clientPlate: "GHI-9012",
        driverName: "Carlos Santos",
        driverCpf: "345.678.901-22",
        thirdParties: [],
        type: "danos_natureza",
        date: new Date("2024-01-10"),
        time: "16:45",
        status: "pendencia",
        description: "Danos causados por granizo. Para-brisa e capô danificados.",
        history: [
            {
                id: "h2",
                date: new Date("2024-01-11T14:00:00"),
                fromStatus: "aberto",
                toStatus: "analise",
                updatedBy: "Ana Costa",
                notes: "Iniciada análise técnica."
            },
            {
                id: "h3",
                date: new Date("2024-01-12T16:30:00"),
                fromStatus: "analise",
                toStatus: "pendencia",
                updatedBy: "Ana Costa",
                notes: "Aguardando laudo do perito."
            }
        ],
        comments: [],
        createdAt: new Date("2024-01-10T11:20:00"),
        updatedAt: new Date("2024-01-12T16:30:00")
    },
    {
        id: "SIN-004",
        clientId: "4",
        clientName: "Ana Paula",
        clientPlate: "JKL-3456",
        driverName: "Ana Paula",
        driverCpf: "456.789.012-33",
        thirdParties: [],
        type: "incendio",
        date: new Date("2023-12-28"),
        time: "22:10",
        status: "concluido",
        description: "Incêndio no motor. Veículo totalmente destruído.",
        history: [
            {
                id: "h4",
                date: new Date("2023-12-29T09:00:00"),
                fromStatus: "aberto",
                toStatus: "analise",
                updatedBy: "Pedro Lima",
                notes: "Documentação completa recebida."
            },
            {
                id: "h5",
                date: new Date("2024-01-05T14:00:00"),
                fromStatus: "analise",
                toStatus: "concluido",
                updatedBy: "Pedro Lima",
                notes: "Sinistro aprovado. Indenização integral autorizada."
            }
        ],
        comments: [],
        createdAt: new Date("2023-12-28T15:45:00"),
        updatedAt: new Date("2024-01-05T14:00:00")
    },
    {
        id: "SIN-005",
        clientId: "5",
        clientName: "Roberto Alves",
        clientPlate: "MNO-7890",
        driverName: "Roberto Alves",
        driverCpf: "567.890.123-44",
        thirdParties: [
            {
                id: "tp2",
                name: "José Ferreira",
                cpf: "111.222.333-44",
                asset: {
                    type: "property",
                    description: "Muro de alvenaria"
                }
            }
        ],
        thirdPartyName: "José Ferreira",
        thirdPartyPlate: "PQR-1122",
        type: "terceiros",
        date: new Date("2024-01-05"),
        time: "18:20",
        status: "negado",
        description: "Danos causados a terceiro. Cliente alegou não ter culpa no acidente.",
        history: [
            {
                id: "h6",
                date: new Date("2024-01-06T10:00:00"),
                fromStatus: "aberto",
                toStatus: "analise",
                updatedBy: "Carla Souza",
                notes: "Análise de responsabilidade iniciada."
            },
            {
                id: "h7",
                date: new Date("2024-01-10T11:00:00"),
                fromStatus: "analise",
                toStatus: "negado",
                updatedBy: "Carla Souza",
                notes: "Sinistro negado. Laudo pericial comprovou culpa do segurado."
            }
        ],
        comments: [],
        createdAt: new Date("2024-01-05T16:00:00"),
        updatedAt: new Date("2024-01-10T11:00:00")
    }
]

const COLUMNS: { status: ClaimStatus; title: string; color: string }[] = [
    { status: "aberto", title: "Aberto", color: "bg-red-100 dark:bg-red-900/20" },
    { status: "analise", title: "Em Análise", color: "bg-blue-100 dark:bg-blue-900/20" },
    { status: "pendencia", title: "Pendência", color: "bg-yellow-100 dark:bg-yellow-900/20" },
    { status: "concluido", title: "Concluído", color: "bg-green-100 dark:bg-green-900/20" },
    { status: "negado", title: "Negado", color: "bg-slate-100 dark:bg-slate-800" }
]

export default function Sinistros() {
    const [claims, setClaims] = useState<Claim[]>(mockClaims)
    const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban")
    const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null)

    const filters: DataTableFilterConfig[] = [
        {
            columnId: "status",
            title: "Status",
            options: [
                { label: "Aberto", value: "aberto" },
                { label: "Em Análise", value: "analise" },
                { label: "Pendência", value: "pendencia" },
                { label: "Concluído", value: "concluido" },
                { label: "Negado", value: "negado" },
            ],
        },
        {
            columnId: "type",
            title: "Tipo",
            options: [
                { label: "Roubo/Furto", value: "roubo_furto" },
                { label: "Colisão/Tombamento", value: "colisao_tombamento" },
                { label: "Danos da Natureza", value: "danos_natureza" },
                { label: "Incêndio", value: "incendio" },
                { label: "Terceiros", value: "terceiros" },
            ],
        },
    ]

    const columns: ColumnDef<Claim>[] = [
        {
            accessorKey: "id",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="ID" />
            ),
            cell: ({ row }) => <span className="font-medium">{row.getValue("id")}</span>,
            enableGlobalFilter: true,
            filterFn: (row, id, filterValue) => {
                return normalizeString(row.getValue(id)).includes(normalizeString(filterValue))
            },
        },
        {
            accessorKey: "clientName",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Cliente" />
            ),
            cell: ({ row }) => {
                const claim = row.original
                return (
                    <div className="flex flex-col">
                        <span>{claim.clientName}</span>
                        <span className="text-xs text-muted-foreground">{claim.clientPlate}</span>
                    </div>
                )
            },
            enableGlobalFilter: true,
            filterFn: (row, id, filterValue) => {
                const claim = row.original
                const searchStr = `${claim.clientName} ${claim.clientPlate}`
                return normalizeString(searchStr).includes(normalizeString(filterValue))
            },
        },
        {
            accessorKey: "type",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Tipo" />
            ),
            cell: ({ row }) => {
                const type = row.getValue("type") as ClaimType
                const typeLabel = CLAIM_TYPE_LABELS[type]
                return <span>{typeLabel}</span>
            },
            enableGlobalFilter: true,
            filterFn: (row, id, filterValue) => {
                return filterValue.includes(row.getValue(id))
            },
        },
        {
            accessorKey: "date",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Data" />
            ),
            cell: ({ row }) => {
                const claim = row.original
                return (
                    <div className="flex flex-col text-sm">
                        <span>{format(claim.date, "dd/MM/yyyy")}</span>
                        <span className="text-muted-foreground">{claim.time}</span>
                    </div>
                )
            },
            enableGlobalFilter: true,
            filterFn: (row, id, filterValue) => {
                const claim = row.original
                const dateStr = format(claim.date, "dd/MM/yyyy")
                return dateStr.includes(filterValue) || claim.time.includes(filterValue)
            },
        },
        {
            accessorKey: "status",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Status" />
            ),
            cell: ({ row }) => {
                const status = row.getValue("status") as ClaimStatus
                const statusLabel = CLAIM_STATUS_LABELS[status]
                return (
                    <Badge
                        className={`${COLUMNS.find(c => c.status === status)?.color} text-foreground hover:text-foreground`}
                        variant="secondary"
                    >
                        {statusLabel}
                    </Badge>
                )
            },
            enableGlobalFilter: true,
            filterFn: (row, id, filterValue) => {
                return filterValue.includes(row.getValue(id))
            },
        },
    ]
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isNewSinistroModalOpen, setIsNewSinistroModalOpen] = useState(false)

    const [dateFrom, setDateFrom] = useState<Date>()
    const [dateTo, setDateTo] = useState<Date>()

    const handleDrop = (claimId: string, newStatus: ClaimStatus) => {
        setClaims((prevClaims) => {
            return prevClaims.map((claim) => {
                if (claim.id === claimId && claim.status !== newStatus) {
                    const newHistory = [
                        {
                            id: `h-${Date.now()}`,
                            date: new Date(),
                            fromStatus: claim.status,
                            toStatus: newStatus,
                            updatedBy: "Usuário",
                            notes: `Status alterado de ${CLAIM_STATUS_LABELS[claim.status]} para ${CLAIM_STATUS_LABELS[newStatus]}`
                        },
                        ...claim.history
                    ]
                    return {
                        ...claim,
                        status: newStatus,
                        history: newHistory,
                        updatedAt: new Date()
                    }
                }
                return claim
            })
        })
    }

    const handleCardClick = (claim: Claim) => {
        setSelectedClaim(claim)
        setIsModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        setSelectedClaim(null)
    }

    const handleNewSinistro = (formData: NewSinistroFormData) => {
        const newClaim: Claim = {
            id: `SIN-${String(claims.length + 1).padStart(3, "0")}`,
            clientId: formData.clientId,
            clientName: formData.clientName,
            clientPlate: formData.vehiclePlate,
            driverName: formData.driverName,
            driverCpf: formData.driverCpf,
            thirdParties: formData.thirdParties,
            // Legacy fields for backward compatibility
            thirdPartyName: formData.thirdParties[0]?.name,
            thirdPartyPlate: formData.thirdParties[0]?.asset.type === "vehicle" ? formData.thirdParties[0]?.asset.plate : undefined,
            type: formData.type,
            date: formData.date,
            time: formData.time,
            status: "aberto",
            description: formData.description,
            history: [],
            comments: [],
            createdAt: new Date(),
            updatedAt: new Date()
        }

        setClaims([newClaim, ...claims])
    }

    const handleAddComment = (claimId: string, text: string) => {
        setClaims(prev => prev.map(claim => {
            if (claim.id === claimId) {
                const newComment = {
                    id: `c-${Date.now()}`,
                    text,
                    createdAt: new Date(),
                    createdBy: "Usuário"
                }
                const updatedClaim = {
                    ...claim,
                    comments: [newComment, ...(claim.comments || [])]
                }
                if (selectedClaim?.id === claimId) {
                    setSelectedClaim(updatedClaim)
                }
                return updatedClaim
            }
            return claim
        }))
    }

    const filteredClaims = useMemo(() => {
        let result = claims

        if (dateFrom) {
            result = result.filter(c => c.date >= dateFrom)
        }
        if (dateTo) {
            result = result.filter(c => c.date <= dateTo)
        }

        return result
    }, [claims, dateFrom, dateTo])

    const claimsByStatus = useMemo(() => {
        return COLUMNS.reduce((acc, column) => {
            acc[column.status] = filteredClaims.filter((claim) => claim.status === column.status)
            return acc
        }, {} as Record<ClaimStatus, Claim[]>)
    }, [filteredClaims])

    return (
        <div className="flex-1 flex flex-col h-full p-4 pt-6 md:p-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                <h2 className="text-3xl font-bold tracking-tight">Sinistros</h2>
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full sm:w-[130px] justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateFrom ? format(dateFrom, "dd/MM/yy") : "De"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                            </PopoverContent>
                        </Popover>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full sm:w-[130px] justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateTo ? format(dateTo, "dd/MM/yy") : "Até"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                            </PopoverContent>
                        </Popover>
                        {(dateFrom || dateTo) && (
                            <Button variant="ghost" size="icon" onClick={() => { setDateFrom(undefined); setDateTo(undefined) }}>
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="flex items-center border rounded-md bg-background">
                            <Button
                                variant={viewMode === "kanban" ? "secondary" : "ghost"}
                                size="icon"
                                className="h-8 w-8 rounded-none rounded-l-md"
                                onClick={() => setViewMode("kanban")}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={viewMode === "list" ? "secondary" : "ghost"}
                                size="icon"
                                className="h-8 w-8 rounded-none rounded-r-md"
                                onClick={() => setViewMode("list")}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>
                        <Button
                            className="group transition-all duration-300 hover:scale-105 hover:shadow-lg flex-1 sm:flex-none"
                            onClick={() => setIsNewSinistroModalOpen(true)}
                        >
                            <Plus className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" />
                            Novo Sinistro
                        </Button>
                    </div>
                </div>
            </div>

            {viewMode === "kanban" ? (
                <div className="flex-1 overflow-x-auto pb-4">
                    <div className="flex gap-4 h-full min-w-max">
                        {COLUMNS.map((column) => (
                            <KanbanColumn
                                key={column.status}
                                status={column.status}
                                title={column.title}
                                claims={claimsByStatus[column.status]}
                                onDrop={handleDrop}
                                onCardClick={handleCardClick}
                                color={column.color}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                <DataTable columns={columns} data={filteredClaims} filters={filters} onRowClick={handleCardClick} />
            )}

            <SinistroModal
                claim={selectedClaim}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onAddComment={handleAddComment}
            />

            <NewSinistroModal
                isOpen={isNewSinistroModalOpen}
                onClose={() => setIsNewSinistroModalOpen(false)}
                onSubmit={handleNewSinistro}
            />
        </div>
    )
}
