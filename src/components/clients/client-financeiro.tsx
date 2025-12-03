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
import { Plus, Trash2, Calendar as CalendarIcon, ArrowUpDown, ArrowUp, ArrowDown, Repeat, Search, Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { format, addMonths } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import type { Boleto } from "@/types/agenda" // Import Boleto type
import { useRepresentations } from "@/hooks/data/useRepresentations"
import { useBoletos } from "@/hooks/data/useBoletos"

interface ClientFinanceiroProps {
    client: any
    vehicles: { plate: string; model: string }[]
}

type SortField = "vencimento" | "valor" | "placas" | "representacao"
type SortDirection = "asc" | "desc" | null

// Utility function to format currency input
const formatCurrencyInput = (value: string): string => {
    // 1. Remove all non-digit characters except comma/dot
    let cleanValue = value.replace(/[^\d,]/g, '')
    
    // 2. Replace comma with dot for internal float parsing
    cleanValue = cleanValue.replace(',', '.')

    // 3. Parse to float
    const num = parseFloat(cleanValue)

    if (isNaN(num)) return ""

    // 4. Format back to BRL string (R$ 1.000,00)
    return num.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: true,
    })
}

// Utility function to extract float value from formatted string
const parseCurrencyToFloat = (formattedValue: string): number => {
    // Remove R$, dots used for thousands, and replace comma with dot for decimals
    const cleanValue = formattedValue
        .replace(/[R$\s.]/g, '')
        .replace(',', '.')
    
    return parseFloat(cleanValue) || 0
}


export function ClientFinanceiro({ client, vehicles = [] }: ClientFinanceiroProps) {
    const { partners, loading: representationsLoading } = useRepresentations()
    const { boletos: allBoletos, loading: boletosLoading, addBoletos, deleteBoleto } = useBoletos()

    const [isNewBoletoOpen, setIsNewBoletoOpen] = useState(false)

    // Filter boletos specific to this client
    const clientBoletos = useMemo(() => {
        return allBoletos.filter(b => b.clientId === client.id)
    }, [allBoletos, client.id])

    // Form state
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

    // Filter state
    const [searchTerm, setSearchTerm] = useState("")
    const [dateFrom, setDateFrom] = useState<Date>()
    const [dateTo, setDateTo] = useState<Date>()
    const [sortField, setSortField] = useState<SortField | null>(null)
    const [sortDirection, setSortDirection] = useState<SortDirection>(null)

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

        // Text search
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase()
            result = result.filter(b =>
                b.placas.some(p => p.toLowerCase().includes(searchLower)) ||
                b.representacao.toLowerCase().includes(searchLower) ||
                b.valor.toString().includes(searchLower)
            )
        }

        // Date range filter
        if (dateFrom) {
            result = result.filter(b => b.vencimento >= dateFrom)
        }
        if (dateTo) {
            result = result.filter(b => b.vencimento <= dateTo)
        }

        // Sorting
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

    const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value
        // Only allow digits and comma
        const cleanInput = rawValue.replace(/[^\d,]/g, '')
        
        // Convert to float, then format back to string for display
        const floatValue = parseCurrencyToFloat(cleanInput)
        setValor(formatCurrencyInput(floatValue.toString()))
    }

    const handleAddBoleto = async () => {
        if (!valor || !vencimento || selectedPlates.length === 0 || !representacaoId) return

        const selectedPartner = partners.find(p => p.id === representacaoId)
        const representacaoNome = selectedPartner?.name || "N/A"
        const floatValor = parseCurrencyToFloat(valor)

        const recurrenceGroupId = isRecurring ? Math.random().toString(36).substr(2, 9) : undefined
        
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
                comissaoRecorrente: comissaoRecorrente ? parseFloat(comissaoRecorrente) : undefined,
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

    const handleDeleteBoleto = async (id: string) => {
        if (window.confirm("Tem certeza que deseja excluir este boleto?")) {
            await deleteBoleto(id)
        }
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
        setDateFrom(undefined)
        setDateTo(undefined)
        setSortField(null)
        setSortDirection(null)
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

    const hasActiveFilters = searchTerm || dateFrom || dateTo || sortField

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
                                    <TableRow key={boleto.id}>
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
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                                Pendente
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteBoleto(boleto.id)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
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
                                onChange={handleValorChange}
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
                                            type="number"
                                            placeholder="0,00"
                                            value={comissaoRecorrente}
                                            onChange={(e) => setComissaoRecorrente(e.target.value)}
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
        </div>
    )
}