import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, LayoutGrid, List, Loader2, Search } from "lucide-react"
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
import { useQuotations } from "@/hooks/data/useQuotations"

const COLUMNS: { status: CotacaoStatus; title: string; color: string }[] = [
    { status: "cotacao", title: "Cotação", color: "bg-blue-100 dark:bg-blue-900/20" },
    { status: "contrato_vistoria", title: "Contrato/Vistoria", color: "bg-yellow-100 dark:bg-yellow-900/20" },
    { status: "cliente", title: "Cliente", color: "bg-green-100 dark:bg-green-900/20" },
    { status: "cancelado", title: "Cancelado", color: "bg-red-100 dark:bg-red-900/20" },
]

export default function Cotacoes() {
    const { quotations, addQuotation, updateQuotationStatus } = useQuotations()
    const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban")
    const [selectedCotacao, setSelectedCotacao] = useState<Cotacao | null>(null)
    const [isNewCotacaoModalOpen, setIsNewCotacaoModalOpen] = useState(false)
    const [globalFilter, setGlobalFilter] = useState("") // Novo estado de busca global

    // Removendo loading e hasData, confiando no useAppInitialization do MainLayout

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

    const handleDrop = (cotacaoId: string, newStatus: CotacaoStatus) => {
        updateQuotationStatus(cotacaoId, newStatus)
    }

    const handleCardClick = (cotacao: Cotacao) => {
        setSelectedCotacao(cotacao)
        setIsNewCotacaoModalOpen(true) // Corrected function name
    }

    const handleNewCotacao = (formData: NewCotacaoFormData) => {
        const newQuotation: Omit<Cotacao, 'id' | 'history' | 'createdAt' | 'updatedAt'> = {
            clientType: formData.clientType,
            cpfCnpj: formData.cpfCnpj,
            razaoSocialNome: formData.razaoSocialNome,
            nomeFantasia: formData.nomeFantasia,
            representacaoId: formData.representacaoId,
            representacaoNome: formData.representacaoNome,
            asset: formData.asset,
            anuidade: formData.anuidade,
            parcelas: formData.parcelas,
            comissao: formData.comissao, // CORRIGIDO: Usando o objeto comissao completo
            status: "cotacao",
        }

        addQuotation(newQuotation)
    }

    const filteredQuotations = useMemo(() => {
        if (!globalFilter) return quotations
        const filterLower = normalizeString(globalFilter)
        
        return quotations.filter(cotacao => {
            const asset = cotacao.asset
            let assetDetails = ""
            if (asset.type === "veiculo") {
                assetDetails = `${asset.placa} ${asset.marca} ${asset.modelo}`
            } else if (asset.type === "residencial") {
                assetDetails = asset.endereco
            } else if (asset.type === "outros") {
                assetDetails = asset.descricao
            }

            const searchFields = [
                cotacao.razaoSocialNome,
                cotacao.cpfCnpj,
                cotacao.nomeFantasia,
                cotacao.representacaoNome,
                ASSET_TYPE_LABELS[asset.type],
                assetDetails,
                cotacao.anuidade.toString(),
            ].filter(Boolean).join(" ")
            
            return normalizeString(searchFields).includes(filterLower)
        })
    }, [quotations, globalFilter])

    const cotacoesByStatus = useMemo(() => {
        return COLUMNS.reduce((acc, column) => {
            acc[column.status] = filteredQuotations.filter((cotacao) => cotacao.status === column.status)
            return acc
        }, {} as Record<CotacaoStatus, Cotacao[]>)
    }, [filteredQuotations])

    return (
        <div className="flex-1 flex flex-col h-full p-4 pt-6 md:p-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-6 shrink-0">
                <h2 className="text-3xl font-bold tracking-tight">Cotações</h2>
                <div className="flex items-center gap-2">
                    {/* Search Input */}
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar cliente, placa, valor..."
                            value={globalFilter}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    
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
                <DataTable 
                    columns={columns} 
                    data={quotations} 
                    filters={filters} 
                    onRowClick={handleCardClick} 
                    globalFilter={globalFilter}
                    setGlobalFilter={setGlobalFilter}
                />
            )}

            <NewCotacaoModal
                isOpen={isNewCotacaoModalOpen}
                onClose={() => setIsNewCotacaoModalOpen(false)}
                onSubmit={handleNewCotacao}
            />

            <CotacaoModal
                cotacao={selectedCotacao}
                isOpen={selectedCotacao !== null}
                onClose={() => {
                    setSelectedCotacao(null)
                }}
            />
        </div >
    )
}