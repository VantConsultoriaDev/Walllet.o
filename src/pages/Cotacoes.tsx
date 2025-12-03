import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, LayoutGrid, List } from "lucide-react"
import { CotacaoColumn } from "@/components/cotacoes/cotacao-column"
import { CotacaoModal } from "@/components/cotacoes/cotacao-modal"
import { NewCotacaoModal } from "@/components/cotacoes/new-cotacao-modal"
import { DataTable } from "@/components/ui/data-table"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { DataTableFilterConfig } from "@/components/ui/data-table-toolbar"
import { Badge } from "@/components/ui/badge"
import { normalizeString } from "@/lib/utils"
import {
    Cotacao,
    CotacaoStatus,
    COTACAO_STATUS_LABELS,
    ASSET_TYPE_LABELS
} from "@/types/cotacao"
import { NewCotacaoFormData } from "@/components/cotacoes/new-cotacao-modal"
import { ColumnDef } from "@tanstack/react-table"

const mockCotacoes: Cotacao[] = [
    {
        id: "COT-001",
        clientType: "PF",
        cpfCnpj: "12345678901",
        razaoSocialNome: "Pedro Alves",
        asset: {
            type: "veiculo",
            placa: "ABC-1234",
            marca: "Honda",
            modelo: "Civic",
            ano: 2022,
            cor: "Prata",
            chassi: "9BWZZZ377VT004251",
            renavam: "12345678901",
            codigoFipe: "004340-1",
            valorFipe: 120000,
        },
        anuidade: 3500,
        parcelas: 12,
        comissao: {
            type: "recorrente_indeterminada",
            value: 350,
        },
        status: "cotacao",
        history: [],
        createdAt: new Date("2024-01-15"),
        updatedAt: new Date("2024-01-15"),
    },
    {
        id: "COT-002",
        clientType: "PJ",
        cpfCnpj: "12345678000190",
        razaoSocialNome: "Empresa ABC Ltda",
        nomeFantasia: "ABC Seguros",
        asset: {
            type: "residencial",
            valorPatrimonio: 500000,
            endereco: "Rua das Flores, 123 - Centro",
        },
        anuidade: 450,
        parcelas: 1,
        comissao: {
            type: "recorrente_determinada",
            value: 45,
            installments: 12,
        },
        status: "contrato_vistoria",
        history: [
            {
                id: "h1",
                date: new Date("2024-01-16"),
                fromStatus: "cotacao",
                toStatus: "contrato_vistoria",
                updatedBy: "Sistema",
                notes: "Cliente aprovou a cotação",
            },
        ],
        createdAt: new Date("2024-01-10"),
        updatedAt: new Date("2024-01-16"),
    },
    {
        id: "COT-003",
        clientType: "PJ",
        cpfCnpj: "98765432000100",
        razaoSocialNome: "Transportadora XYZ",
        nomeFantasia: "XYZ Cargas",
        asset: {
            type: "carga",
            valorTotal: 2000000,
        },
        anuidade: 12000,
        parcelas: 6,
        comissao: {
            type: "unica",
            value: 1200,
        },
        status: "cliente",
        history: [
            {
                id: "h2",
                date: new Date("2024-01-12"),
                fromStatus: "cotacao",
                toStatus: "contrato_vistoria",
                updatedBy: "Ana Costa",
                notes: "Contrato assinado",
            },
            {
                id: "h3",
                date: new Date("2024-01-18"),
                fromStatus: "contrato_vistoria",
                toStatus: "cliente",
                updatedBy: "Ana Costa",
                notes: "Vistoria aprovada, cliente ativo",
            },
        ],
        createdAt: new Date("2024-01-08"),
        updatedAt: new Date("2024-01-18"),
    },
]

const COLUMNS: { status: CotacaoStatus; title: string; color: string }[] = [
    { status: "cotacao", title: "Cotação", color: "bg-blue-100 dark:bg-blue-900/20" },
    { status: "contrato_vistoria", title: "Contrato/Vistoria", color: "bg-yellow-100 dark:bg-yellow-900/20" },
    { status: "cliente", title: "Cliente", color: "bg-green-100 dark:bg-green-900/20" },
    { status: "cancelado", title: "Cancelado", color: "bg-red-100 dark:bg-red-900/20" },
]

export default function Cotacoes() {
    const [cotacoes, setCotacoes] = useState<Cotacao[]>(mockCotacoes)
    const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban")
    const [selectedCotacao, setSelectedCotacao] = useState<Cotacao | null>(null)

    const filters: DataTableFilterConfig[] = [
        {
            columnId: "status",
            title: "Status",
            options: [
                { label: "Cotação", value: "cotacao" },
                { label: "Contrato/Vistoria", value: "contrato_vistoria" },
                { label: "Cliente", value: "cliente" },
                { label: "Cancelado", value: "cancelado" },
            ],
        },
        {
            columnId: "asset",
            title: "Bem/Ativo",
            options: [
                { label: "Veículo", value: "veiculo" },
                { label: "Residencial", value: "residencial" },
                { label: "Carga", value: "carga" },
                { label: "Terceiros", value: "terceiros" },
                { label: "Outros", value: "outros" },
            ],
        },
    ]

    const columns: ColumnDef<Cotacao>[] = [
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
            accessorKey: "razaoSocialNome",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Cliente" />
            ),
            cell: ({ row }) => {
                const cotacao = row.original
                return (
                    <div className="flex flex-col">
                        <span>{cotacao.razaoSocialNome}</span>
                        <span className="text-xs text-muted-foreground">{cotacao.cpfCnpj}</span>
                    </div>
                )
            },
            enableGlobalFilter: true,
            filterFn: (row, id, filterValue) => {
                const cotacao = row.original
                const searchStr = `${cotacao.razaoSocialNome} ${cotacao.cpfCnpj}`
                return normalizeString(searchStr).includes(normalizeString(filterValue))
            },
        },
        {
            accessorKey: "asset",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Bem/Ativo" />
            ),
            cell: ({ row }) => {
                const asset = row.original.asset
                return (
                    <div className="flex flex-col text-sm">
                        <span className="capitalize">{asset.type}</span>
                        {asset.type === "veiculo" && (
                            <span className="text-xs text-muted-foreground">{asset.marca} {asset.modelo} - {asset.placa}</span>
                        )}
                        {asset.type === "residencial" && (
                            <span className="text-xs text-muted-foreground">{asset.endereco}</span>
                        )}
                    </div>
                )
            },
            enableGlobalFilter: true,
            filterFn: (row, id, filterValue) => {
                return filterValue.includes(row.original.asset.type)
            },
        },
        {
            accessorKey: "status",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Status" />
            ),
            cell: ({ row }) => {
                const status = row.getValue("status") as CotacaoStatus
                const statusLabel = COTACAO_STATUS_LABELS[status]
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

    const [isCotacaoModalOpen, setIsCotacaoModalOpen] = useState(false)
    const [isNewCotacaoModalOpen, setIsNewCotacaoModalOpen] = useState(false)

    const handleDrop = (cotacaoId: string, newStatus: CotacaoStatus) => {
        setCotacoes((prevCotacoes) => {
            return prevCotacoes.map((cotacao) => {
                if (cotacao.id === cotacaoId && cotacao.status !== newStatus) {
                    const newHistory = [
                        {
                            id: `h-${Date.now()}`,
                            date: new Date(),
                            fromStatus: cotacao.status,
                            toStatus: newStatus,
                            updatedBy: "Usuário",
                            notes: `Status alterado de ${COTACAO_STATUS_LABELS[cotacao.status]} para ${COTACAO_STATUS_LABELS[newStatus]}`,
                        },
                        ...cotacao.history,
                    ]
                    return {
                        ...cotacao,
                        status: newStatus,
                        history: newHistory,
                        updatedAt: new Date(),
                    }
                }
                return cotacao
            })
        })
    }

    const handleCardClick = (cotacao: Cotacao) => {
        setSelectedCotacao(cotacao)
        setIsCotacaoModalOpen(true)
    }

    const handleNewCotacao = (formData: NewCotacaoFormData) => {
        const newCotacao: Cotacao = {
            id: `COT-${String(cotacoes.length + 1).padStart(3, "0")}`,
            clientType: formData.clientType,
            cpfCnpj: formData.cpfCnpj,
            razaoSocialNome: formData.razaoSocialNome,
            nomeFantasia: formData.nomeFantasia,
            representacaoId: formData.representacaoId,
            representacaoNome: formData.representacaoNome,
            asset: formData.asset,
            anuidade: formData.anuidade,
            parcelas: formData.parcelas,
            comissao: {
                type: formData.comissaoType,
                value: formData.comissaoValue,
                installments: formData.comissaoInstallments,
            },
            status: "cotacao",
            history: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        }

        setCotacoes([newCotacao, ...cotacoes])
    }

    const cotacoesByStatus = useMemo(() => {
        return COLUMNS.reduce((acc, column) => {
            acc[column.status] = cotacoes.filter((cotacao) => cotacao.status === column.status)
            return acc
        }, {} as Record<CotacaoStatus, Cotacao[]>)
    }, [cotacoes])

    return (
        <div className="flex-1 flex flex-col h-full p-4 pt-6 md:p-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold tracking-tight">Cotações</h2>
                <div className="flex items-center gap-2">
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
                        className="group transition-all duration-300 hover:scale-105 hover:shadow-lg"
                        onClick={() => setIsNewCotacaoModalOpen(true)}
                    >
                        <Plus className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" />
                        Nova Cotação
                    </Button>
                </div>
            </div>

            {viewMode === "kanban" ? (
                <div className="flex-1 overflow-x-auto pb-4">
                    <div className="flex gap-4 h-full min-w-max">
                        {COLUMNS.map((column) => (
                            <CotacaoColumn
                                key={column.status}
                                status={column.status}
                                title={column.title}
                                cotacoes={cotacoesByStatus[column.status]}
                                onDrop={handleDrop}
                                onCardClick={handleCardClick}
                                color={column.color}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                <DataTable columns={columns} data={cotacoes} filters={filters} onRowClick={handleCardClick} />
            )}

            <NewCotacaoModal
                isOpen={isNewCotacaoModalOpen}
                onClose={() => setIsNewCotacaoModalOpen(false)}
                onSubmit={handleNewCotacao}
            />

            <CotacaoModal
                cotacao={selectedCotacao}
                isOpen={isCotacaoModalOpen}
                onClose={() => {
                    setIsCotacaoModalOpen(false)
                    setSelectedCotacao(null)
                }}
            />
        </div >
    )
}
