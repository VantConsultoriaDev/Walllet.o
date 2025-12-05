import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Trash2, Calendar as CalendarIcon, ArrowUpDown, ArrowUp, ArrowDown, Repeat, Search, Check, ChevronsUpDown, Loader2, Filter, Pencil } from "lucide-react"
import { format, addMonths, getMonth, getYear, setMonth, setYear, startOfMonth, endOfMonth } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import type { Boleto } from "@/types/agenda" // Import Boleto type
import { useRepresentations } from "@/hooks/data/useRepresentations"
import { useBoletos } from "@/hooks/data/useBoletos"
import { RecurrenceActionDialog } from "../financeiro/recurrence-action-dialog"
import { v4 as uuidv4 } from 'uuid'
import { BoletoDetailsModal } from "./boleto-details-modal"
import { EditBoletoModal } from "./edit-boleto-modal" // <-- Novo Import
import { formatCurrencyInput, parseCurrencyToFloat } from "@/lib/formatters" // Importando formatters

interface ClientFinanceiroProps {
    client: any
    vehicles: { plate: string; model: string }[]
}

type SortField = "vencimento" | "valor" | "placas" | "representacao"
type SortDirection = "asc" | "desc" | null

const MONTH_OPTIONS = [
    { value: 0, label: "Janeiro" },
    { value: 1, label: "Fevereiro" },
    { value: 2, label: "Março" },
    { value: 3, label: "Abril" },
    { value: 4, label: "Maio" },
    { value: 5, label: "Junho" },
    { value: 6, label: "Julho" },
    { value: 7, label: "Agosto" },
    { value: 8, label: "Setembro" },
    { value: 9, label: "Outubro" },
    { value: 10, label: "Novembro" },
    { value: 11, label: "Dezembro" },
]

export function ClientFinanceiro({ client, vehicles = [] }: ClientFinanceiroProps) {
    const { partners, loading: representationsLoading } = useRepresentations()
    const { boletos: allBoletos, loading: boletosLoading, addBoletos, updateBoleto, deleteBoleto, deleteRecurrenceGroup, updateBoletoStatus } = useBoletos()

    const [isNewBoletoOpen, setIsNewBoletoOpen] = useState(false)
    const [isRecurrenceDialogOpen, setIsRecurrenceDialogOpen] = useState(false)
    const [pendingDeleteBoleto, setPendingDeleteBoleto] = useState<Boleto | null>(null)
    
    // State for modals
    const [selectedBoleto, setSelectedBoleto] = useState<Boleto | null>(null)
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)

    // Filter boletos specific to this client
    const clientBoletos = useMemo(() => {
        return allBoletos.filter(b => b.clientId === client.id)
    }, [allBoletos, client.id])

    // --- Filter state ---
    const today = useMemo(() => new Date(), [])
    const [searchTerm, setSearchTerm] = useState("")
    const [dateFrom, setDateFrom] = useState<Date>()
    const [dateTo, setDateTo] = useState<Date>()
    const [selectedMonth, setSelectedMonth] = useState<number | "ALL">(getMonth(today)) // 0-11 or "ALL"
    const [selectedYear, setSelectedYear] = useState<number>(getYear(today))
    const [sortField, setSortField] = useState<SortField | null>("vencimento")
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

    // Form state (rest of form state remains the same)
    const [valor, setValor] = useState("") // Stored as formatted string
    const [vencimento, setVencimento] = useState<Date>()
    const [selectedPlates, setSelectedPlates] = useState<string[]>([])
    const [representacaoId, setRepresentacaoId] = useState("")
    const [isRecurring, setIsRecurring] = useState(false)
    const [recurrenceType, setRecurrenceType] = useState<"indefinite" | "limited">("indefinite")
    const [recurrenceMonths, setRecurrenceMonths] = useState("12")
    const [comissaoRecorrente, setComissaoRecorrente] = useState("")
    const [comissaoTipo, setComissaoTipo] = useState<"percentual" | "valor">("valor")
    const [openPlateSelect, setOpenPlateSelect] = useState(false)
    const [plateSearch, setPlateSearch] = useState("")
    const [isCalendarOpen, setIsCalendarOpen] = useState(false)

    // Generate year options dynamically (e.g., current year +/- 5)
    const yearOptions = useMemo(() => {
        const currentYear = getYear(today)
        const years = []
        for (let i = currentYear - 2; i <= currentYear + 5; i++) {
            years.push(i)
        }
        return years
    }, [today])

    // Effect to clear date range when month/year filter is active
    useEffect(() => {
        if (selectedMonth !== "ALL") {
            const date = setYear(setMonth(today, selectedMonth), selectedYear)
            setDateFrom(startOfMonth(date))
            setDateTo(endOfMonth(date))
        } else {
            setDateFrom(undefined)
            setDateTo(undefined)
        }
    }, [selectedMonth, selectedYear, today])


    const handleSort = (field: SortField) => {
        if (sortField === field) {
            if (sortDirection === "asc") {
                setSortDirection("desc")
            } else if (sortDirection === "desc") {
                setSortField(null)
                setSortDirection(null)
            }
        } else {
            setSortField(field)
            setSortDirection("asc")
        }
    }

    const filteredAndSortedBoletos = useMemo(() => {
        let result = [...clientBoletos]

        // 1. Text search
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase()
            result = result.filter(b =>
                b.placas.some(p => p.toLowerCase().includes(searchLower)) ||
                b.representacao.toLowerCase().includes(searchLower) ||
                b.valor.toString().includes(searchLower)
            )
        }

        // 2. Date range filter (handles both explicit range and month/year selection)
        if (dateFrom) {
            result = result.filter(b => b.vencimento >= dateFrom)
        }
        if (dateTo) {
            // Add one day to dateTo to include the entire end day
            const endDayInclusive = new Date(dateTo);
            endDayInclusive.setDate(endDayInclusive.getDate() + 1);
            result = result.filter(b => b.vencimento < endDayInclusive)
        }

        // 3. Sorting
        if (sortField && sortDirection) {
            result.sort((a, b) => {
                let aVal: any = a[sortField]
                let bVal: any = b[sortField]

                if (sortField === "vencimento") {
                    aVal = a.vencimento.getTime()
                    bVal = b.vencimento.getTime()
                } else if (sortField === "valor") {
                    aVal = a.valor
                    bVal = b.valor
                } else if (sortField === "placas") {
                    aVal = a.placas.join(", ").toLowerCase()
                    bVal = b.placas.join(", ").toLowerCase()
                } else {
                    aVal = aVal.toLowerCase()
                    bVal = bVal.toLowerCase()
                }

                if (sortDirection === "asc") {
                    return aVal > bVal ? 1 : -1
                } else {
                    return aVal < bVal ? 1 : -1
                }
            })
        }

        return result
    }, [clientBoletos, searchTerm, dateFrom, dateTo, sortField, sortDirection])

    const handleInputValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value
        // Apply formatting logic
        const formattedValue = formatCurrencyInput(rawValue)
        setValor(formattedValue)
    }

    const handleAddBoleto = async () => {
        if (!valor || !vencimento || selectedPlates.length === 0 || !representacaoId) return

        const selectedPartner = partners.find(p => p.id === representacaoId)
        const representacaoNome = selectedPartner?.name || "N/A"
        const floatValor = parseCurrencyToFloat(valor)

        if (floatValor <= 0) return // Prevent saving zero value

        // Generate a valid UUID for the recurrence group if needed
        const recurrenceGroupId = isRecurring ? uuidv4() : undefined
        
        const monthsToGenerate = isRecurring
            ? (recurrenceType === "indefinite" ? 24 : parseInt(recurrenceMonths))
            : 1

        const boletosToSave: Omit<Boleto, 'id' | 'representacao' | 'dueDate'>[] = []

        for (let i = 0; i < monthsToGenerate; i++) {
            boletosToSave.push({
                valor: floatValor,
                vencimento: addMonths(vencimento, i),
                placas: selectedPlates,
                representacaoId: representacaoId, // Save ID
                status: "pending",
                isRecurring,
                recurrenceType: isRecurring ? recurrenceType : undefined,
                recurrenceMonths: isRecurring && recurrenceType === "limited" ? parseInt(recurrenceMonths) : undefined,
                recurrenceGroupId,
                comissaoRecorrente: comissaoRecorrente ? parseCurrencyToFloat(comissaoRecorrente) : undefined,
                comissaoTipo: comissaoRecorrente ? comissaoTipo : undefined,
                clientId: client.id,
                clientName: client.name,
                title: `${client.name} - ${representacaoNome}`, // Add title for DB
            })
        }

        await addBoletos(boletosToSave)
        setIsNewBoletoOpen(false)
        resetForm()
    }

    const handleEditBoleto = async (updatedBoleto: Boleto, scope: "this" | "all") => {
        await updateBoleto(updatedBoleto, scope)
        // Close modal is handled by EditBoletoModal internally after successful save/recurrence action
    }

    const handleDeleteClick = (boleto: Boleto) => {
        if (boleto.isRecurring && boleto.recurrenceGroupId) {
            setPendingDeleteBoleto(boleto)
            setIsRecurrenceDialogOpen(true)
        } else {
            // Single deletion
            handleDeleteBoleto(boleto, "this")
        }
    }

    const handleDeleteBoleto = async (boleto: Boleto, scope: "this" | "all") => {
        if (scope === "all" && boleto.recurrenceGroupId) {
            await deleteRecurrenceGroup(boleto.recurrenceGroupId)
        } else {
            await deleteBoleto(boleto.id)
        }
        setPendingDeleteBoleto(null)
        setIsRecurrenceDialogOpen(false)
    }

    const handleUpdateStatus = async (boletoId: string, newStatus: Boleto['status']) => {
        await updateBoletoStatus(boletoId, newStatus)
        // Update selected boleto state in details modal
        setSelectedBoleto(prev => {
            if (!prev) return null
            return prev.id === boletoId ? { ...prev, status: newStatus, dataPagamento: newStatus === 'paid' ? new Date() : undefined } : prev
        })
    }

    const handleRowClick = (boleto: Boleto) => {
        setSelectedBoleto(boleto)
        setIsDetailsModalOpen(true)
    }

    const handleOpenEditModal = (boleto: Boleto) => {
        setSelectedBoleto(boleto)
        setIsDetailsModalOpen(false) // Close details modal
        setIsEditModalOpen(true) // Open edit modal
    }

    const resetForm = () => {
        setValor("")
        setVencimento(undefined)
        setSelectedPlates([])
        setRepresentacaoId("")
        setIsRecurring(false)
        setRecurrenceType("indefinite")
        setRecurrenceMonths("12")
        setComissaoRecorrente("")
        setComissaoTipo("valor")
    }

    const clearFilters = () => {
        setSearchTerm("")
        setSelectedMonth(getMonth(today))
        setSelectedYear(getYear(today))
        setDateFrom(undefined)
        setDateTo(undefined)
        setSortField("vencimento")
        setSortDirection("asc")
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value)
    }

    const getSortIcon = (field: SortField) => {
        if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
        if (sortDirection === "asc") return <ArrowUp className="ml-2 h-4 w-4" />
        return <ArrowDown className="ml-2 h-4 w-4" />
    }

    const togglePlate = (plate: string) => {
        setSelectedPlates(current =>
            current.includes(plate)
                ? current.filter(p => p !== plate)
                : [...current, plate]
        )
    }

    const getStatusBadge = (status: Boleto['status']) => {
        switch (status) {
            case "paid":
                return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Pago</span>
            case "overdue":
                return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Vencido</span>
            case "pending":
            default:
                return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Pendente</span>
        }
    }

    const hasActiveFilters = searchTerm || selectedMonth !== getMonth(today) || selectedYear !== getYear(today) || dateFrom || dateTo

    if (representationsLoading || boletosLoading) {
        return (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando dados financeiros...
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Boletos e Cobranças</h3>
                <Button onClick={() => setIsNewBoletoOpen(true)} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Boleto
                </Button>
            </div>

            {/* Filters */}
            <div className="space-y-3">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por placa, representação, valor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    
                    {/* Month/Year Filter */}
                    <div className="flex gap-2 w-full md:w-auto">
                        <Select
                            value={selectedMonth.toString()}
                            onValueChange={(v) => {
                                setSelectedMonth(v === "ALL" ? "ALL" : parseInt(v))
                            }}
                        >
                            <SelectTrigger className="w-full md:w-[150px]">
                                <Filter className="mr-2 h-4 w-4" />
                                <SelectValue placeholder="Mês" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos os Meses</SelectItem>
                                {MONTH_OPTIONS.map(month => (
                                    <SelectItem key={month.value} value={month.value.toString()}>
                                        {month.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={selectedYear.toString()}
                            onValueChange={(v) => {
                                setSelectedYear(parseInt(v))
                            }}
                        >
                            <SelectTrigger className="w-full md:w-[100px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {yearOptions.map(year => (
                                    <SelectItem key={year} value={year.toString()}>
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date Range Filter (Hidden if Month/Year is selected) */}
                    {selectedMonth === "ALL" && (
                        <div className="flex gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="gap-2">
                                        <CalendarIcon className="h-4 w-4" />
                                        {dateFrom ? format(dateFrom, "dd/MM/yy") : "De"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} />
                                </PopoverContent>
                            </Popover>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="gap-2">
                                        <CalendarIcon className="h-4 w-4" />
                                        {dateTo ? format(dateTo, "dd/MM/yy") : "Até"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={dateTo} onSelect={setDateTo} />
                                </PopoverContent>
                            </Popover>
                        </div>
                    )}
                </div>

                {hasActiveFilters && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                            Mostrando {filteredAndSortedBoletos.length} de {clientBoletos.length} boletos
                        </span>
                        <Button variant="ghost" size="sm" onClick={clearFilters}>
                            Limpar filtros
                        </Button>
                    </div>
                )}
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40px]"></TableHead>
                            <TableHead>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 hover:bg-transparent"
                                    onClick={() => handleSort("vencimento")}
                                >
                                    Vencimento
                                    {getSortIcon("vencimento")}
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 hover:bg-transparent"
                                    onClick={() => handleSort("valor")}
                                >
                                    Valor
                                    {getSortIcon("valor")}
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 hover:bg-transparent"
                                    onClick={() => handleSort("placas")}
                                >
                                    Placas
                                    {getSortIcon("placas")}
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 hover:bg-transparent"
                                    onClick={() => handleSort("representacao")}
                                >
                                    Representação
                                    {getSortIcon("representacao")}
                                </Button>
                            </TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredAndSortedBoletos.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    {clientBoletos.length === 0 ? "Nenhum boleto registrado" : "Nenhum boleto encontrado com os filtros aplicados"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredAndSortedBoletos.map((boleto) => {
                                const comissaoDisplay = boleto.comissaoRecorrente
                                    ? boleto.comissaoTipo === "percentual"
                                        ? `${boleto.comissaoRecorrente}%`
                                        : formatCurrency(boleto.comissaoRecorrente)
                                    : null

                                return (
                                    <TableRow 
                                        key={boleto.id} 
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => handleRowClick(boleto)}
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                {boleto.isRecurring && (
                                                    <Repeat className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                )}
                                                {boleto.comissaoRecorrente && (
                                                    <span className="text-xs font-medium text-primary" title={`Comissão: ${comissaoDisplay}`}>
                                                        💰
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{format(boleto.vencimento, "dd/MM/yyyy")}</TableCell>
                                        <TableCell>{formatCurrency(boleto.valor)}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {boleto.placas.map(p => (
                                                    <Badge key={p} variant="outline" className="text-[10px] px-1 h-5">
                                                        {p}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>{boleto.representacao}</TableCell>
                                        <TableCell>
                                            {getStatusBadge(boleto.status)}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleOpenEditModal(boleto)
                                                }}
                                            >
                                                <Pencil className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isNewBoletoOpen} onOpenChange={setIsNewBoletoOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Novo Boleto</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Valor</Label>
                            <Input
                                placeholder="0,00"
                                value={valor}
                                onChange={handleInputValorChange}
                                // Ensure input type is text to allow custom formatting
                                type="text" 
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Vencimento</Label>
                            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "justify-start text-left font-normal",
                                            !vencimento && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {vencimento ? format(vencimento, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={vencimento}
                                        onSelect={(date) => {
                                            setVencimento(date)
                                            setIsCalendarOpen(false)
                                        }}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="grid gap-2">
                            <Label>Placas Vinculadas</Label>
                            <Popover open={openPlateSelect} onOpenChange={setOpenPlateSelect}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openPlateSelect}
                                        className="justify-between w-full"
                                    >
                                        {selectedPlates.length > 0
                                            ? `${selectedPlates.length} veículo(s) selecionado(s)`
                                            : "Selecione os veículos"}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0 pointer-events-auto z-[100]" align="start">
                                    <div className="flex items-center border-b px-3">
                                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                        <input
                                            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                            placeholder="Buscar placa ou modelo..."
                                            value={plateSearch}
                                            onChange={(e) => setPlateSearch(e.target.value)}
                                        />
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto overflow-x-hidden p-1">
                                        {vehicles.filter(v =>
                                            v.plate.toLowerCase().includes(plateSearch.toLowerCase()) ||
                                            v.model.toLowerCase().includes(plateSearch.toLowerCase())
                                        ).length === 0 ? (
                                            <div className="py-6 text-center text-sm">Nenhum veículo encontrado.</div>
                                        ) : (
                                            vehicles.filter(v =>
                                                v.plate.toLowerCase().includes(plateSearch.toLowerCase()) ||
                                                v.model.toLowerCase().includes(plateSearch.toLowerCase())
                                            ).map((vehicle) => (
                                                <div
                                                    key={vehicle.plate}
                                                    className={cn(
                                                        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                                        selectedPlates.includes(vehicle.plate) && "bg-accent text-accent-foreground"
                                                    )}
                                                    onClick={() => togglePlate(vehicle.plate)}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            selectedPlates.includes(vehicle.plate) ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {vehicle.plate} - {vehicle.model}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>
                            {selectedPlates.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {selectedPlates.map(plate => (
                                        <Badge key={plate} variant="secondary" className="text-xs">
                                            {plate}
                                            <button
                                                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                                onClick={() => togglePlate(plate)}
                                            >
                                                <span className="sr-only">Remover</span>
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label>Representação</Label>
                            <Select value={representacaoId} onValueChange={setRepresentacaoId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione a representação" />
                                </SelectTrigger>
                                <SelectContent>
                                    {partners.map((rep) => (
                                        <SelectItem key={rep.id} value={rep.id}>
                                            {rep.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="border-t pt-4 space-y-4">
                            {/* Recorrência */}
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="recurring"
                                    checked={isRecurring}
                                    onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
                                />
                                <Label htmlFor="recurring" className="cursor-pointer">
                                    Recorrente?
                                </Label>
                            </div>

                            {isRecurring && (
                                <div className="space-y-3 pl-6 animate-in fade-in slide-in-from-top-2">
                                    <div className="grid gap-2">
                                        <Label>Tipo de Recorrência</Label>
                                        <Select value={recurrenceType} onValueChange={(v) => setRecurrenceType(v as "indefinite" | "limited")}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="indefinite">Prazo Indeterminado</SelectItem>
                                                <SelectItem value="limited">Prazo Determinado (Meses)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {recurrenceType === "limited" && (
                                        <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                                            <Label>Quantidade de Meses</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                max="120"
                                                value={recurrenceMonths}
                                                onChange={(e) => setRecurrenceMonths(e.target.value)}
                                            />
                                        </div>
                                    )}

                                    <p className="text-xs text-muted-foreground">
                                        {recurrenceType === "indefinite"
                                            ? "Serão gerados boletos continuamente (simulado 24 meses)."
                                            : `Serão criados ${recurrenceMonths} boletos mensais a partir da data de vencimento.`}
                                    </p>
                                </div>
                            )}

                            {/* Comissão Recorrente */}
                            <div className="border-t pt-4 space-y-3">
                                <Label className="text-sm font-medium">Comissão Recorrente (Opcional)</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="grid gap-2">
                                        <Label htmlFor="comissao-valor" className="text-xs text-muted-foreground">
                                            Valor
                                        </Label>
                                        <Input
                                            id="comissao-valor"
                                            type="text" // Changed to text for formatting
                                            placeholder="0,00"
                                            value={comissaoRecorrente}
                                            onChange={(e) => setComissaoRecorrente(formatCurrencyInput(e.target.value))}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-xs text-muted-foreground">Tipo</Label>
                                        <Select value={comissaoTipo} onValueChange={(v) => setComissaoTipo(v as "percentual" | "valor")}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="valor">Valor (R$)</SelectItem>
                                                <SelectItem value="percentual">Percentual (%)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {comissaoTipo === "percentual"
                                        ? "Percentual do valor do boleto que será adicionado ao Financeiro no mês seguinte ao pagamento."
                                        : "Valor fixo que será adicionado ao Financeiro no mês seguinte ao pagamento do boleto."}
                                </p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsNewBoletoOpen(false)}>Cancelar</Button>
                        <Button onClick={handleAddBoleto}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Boleto Details Modal */}
            <BoletoDetailsModal
                boleto={selectedBoleto}
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                onUpdateStatus={handleUpdateStatus}
                onDelete={handleDeleteClick}
                onEdit={() => handleOpenEditModal(selectedBoleto!)} // Passa a função para abrir o modal de edição
            />

            {/* Edit Boleto Modal */}
            <EditBoletoModal
                boleto={selectedBoleto}
                open={isEditModalOpen}
                onOpenChange={setIsEditModalOpen}
                onSave={handleEditBoleto}
                onDelete={handleDeleteClick}
                vehicles={vehicles}
            />

            {/* Recurrence Delete Dialog */}
            {pendingDeleteBoleto && (
                <RecurrenceActionDialog
                    open={isRecurrenceDialogOpen}
                    onOpenChange={setIsRecurrenceDialogOpen}
                    onAction={(scope) => handleDeleteBoleto(pendingDeleteBoleto, scope)}
                    actionType="delete"
                />
            )}
        </div>
    )
}