import { useState, useEffect, useMemo } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
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
import { Plus, Trash2, Calendar as CalendarIcon, Save, X, ChevronsUpDown, Search, Loader2, Check } from "lucide-react"
import { format, setHours } from "date-fns"
import { ptBR as localePtBR } from "date-fns/locale" // Importação corrigida
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { Boleto } from "@/types/agenda"
import { useRepresentations } from "@/hooks/data/useRepresentations"
import type { Vehicle } from "@/hooks/data/useVehicles"
import { RecurrenceActionDialog } from "../financeiro/recurrence-action-dialog"
import { formatCurrencyInput, parseCurrencyToFloat } from "@/lib/formatters"

interface EditBoletoModalProps {
    boleto: Boleto | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: (updatedBoleto: Boleto, scope: "this" | "all") => void
    onDelete: (boleto: Boleto) => void
    vehicles: Vehicle[]
}

export function EditBoletoModal({
    boleto,
    open,
    onOpenChange,
    onSave,
    onDelete,
    vehicles,
}: EditBoletoModalProps) {
    const { partners, loading: representationsLoading } = useRepresentations()
    const [loading, setLoading] = useState(false)
    const [isRecurrenceDialogOpen, setIsRecurrenceDialogOpen] = useState(false)
    const [pendingSaveBoleto, setPendingSaveBoleto] = useState<Boleto | null>(null)

    // Form state
    const [valor, setValor] = useState("")
    const [vencimento, setVencimento] = useState<Date | undefined>()
    const [dataPagamento, setDataPagamento] = useState<Date | undefined>() // <-- Novo estado
    const [selectedPlates, setSelectedPlates] = useState<string[]>([])
    const [representacaoId, setRepresentacaoId] = useState("")
    const [isRecurring, setIsRecurring] = useState(false)
    const [recurrenceType, setRecurrenceType] = useState<"indefinite" | "limited">("indefinite")
    const [recurrenceMonths, setRecurrenceMonths] = useState("12")
    const [comissaoRecorrente, setComissaoRecorrente] = useState("")
    const [comissaoTipo, setComissaoTipo] = useState<"percentual" | "valor">("valor")
    const [openPlateSelect, setOpenPlateSelect] = useState(false)
    const [plateSearch, setPlateSearch] = useState("")
    
    // Calendar state management
    const [isVencimentoCalendarOpen, setIsVencimentoCalendarOpen] = useState(false)
    const [isPaymentCalendarOpen, setIsPaymentCalendarOpen] = useState(false) 

    // Sync state from prop
    useEffect(() => {
        if (boleto && open) {
            // Ensure value is formatted correctly for display
            setValor(formatCurrencyInput(boleto.valor.toString()))
            setVencimento(boleto.vencimento)
            setDataPagamento(boleto.dataPagamento) // <-- Sincroniza data de pagamento
            setSelectedPlates(boleto.placas)
            setRepresentacaoId(boleto.representacaoId || "")
            setIsRecurring(boleto.isRecurring)
            setRecurrenceType(boleto.recurrenceType || "indefinite")
            setRecurrenceMonths(boleto.recurrenceMonths?.toString() || "12")
            setComissaoRecorrente(boleto.comissaoRecorrente ? formatCurrencyInput(boleto.comissaoRecorrente.toString()) : "")
            setComissaoTipo(boleto.comissaoTipo || "valor")
        }
    }, [boleto, open])

    if (!boleto) return null

    const handleInputValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formattedValue = formatCurrencyInput(e.target.value)
        setValor(formattedValue)
    }

    const handleInputComissaoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formattedValue = formatCurrencyInput(e.target.value)
        setComissaoRecorrente(formattedValue)
    }

    const togglePlate = (plate: string) => {
        setSelectedPlates(current =>
            current.includes(plate)
                ? current.filter(p => p !== plate)
                : [...current, plate]
        )
    }
    
    // Helper to correct date timezone offset
    const correctDateOffset = (date: Date | undefined): Date | undefined => {
        if (!date) return undefined;
        // Use setHours(date, 12) to fix the date at noon local time
        return setHours(date, 12);
    }

    const handleSubmit = () => {
        if (!valor || !vencimento || selectedPlates.length === 0 || !representacaoId) return

        const floatValor = parseCurrencyToFloat(valor)
        const floatComissao = comissaoRecorrente ? parseCurrencyToFloat(comissaoRecorrente) : undefined

        // Apply timezone correction to dates before saving
        const correctedVencimento = correctDateOffset(vencimento)!;
        const correctedDataPagamento = correctDateOffset(dataPagamento);

        // Determine final status based on payment date
        const finalStatus: Boleto['status'] = correctedDataPagamento ? 'paid' : boleto.status === 'paid' ? 'pending' : boleto.status;

        const updatedBoleto: Boleto = {
            ...boleto,
            valor: floatValor,
            vencimento: correctedVencimento,
            dueDate: correctedVencimento,
            dataPagamento: correctedDataPagamento, // <-- Salva a data de pagamento corrigida
            status: finalStatus, // <-- Atualiza o status
            placas: selectedPlates,
            representacaoId: representacaoId,
            representacao: partners.find(p => p.id === representacaoId)?.name || "N/A",
            isRecurring: isRecurring,
            recurrenceType: isRecurring ? recurrenceType : undefined,
            recurrenceMonths: isRecurring && recurrenceType === "limited" ? parseInt(recurrenceMonths) : undefined,
            comissaoRecorrente: floatComissao,
            comissaoTipo: floatComissao ? comissaoTipo : undefined,
            recurrenceGroupId: isRecurring ? boleto.recurrenceGroupId || boleto.id : undefined,
        }

        if (boleto.isRecurring && isRecurring) {
            // If it was recurring and still is, ask for scope
            setPendingSaveBoleto(updatedBoleto)
            setIsRecurrenceDialogOpen(true)
        } else {
            // Single update or non-recurring update
            onSave(updatedBoleto, "this")
            onOpenChange(false)
        }
    }

    const handleRecurrenceAction = (scope: "this" | "all") => {
        if (pendingSaveBoleto) {
            onSave(pendingSaveBoleto, scope)
        }
        setIsRecurrenceDialogOpen(false)
        onOpenChange(false)
    }

    const handleDelete = () => {
        // Defer deletion logic to parent (ClientFinanceiro) which handles recurrence dialog
        onDelete(boleto)
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">Editar Boleto</DialogTitle>
                        <DialogDescription>
                            Atualize os detalhes do boleto para {boleto.clientName}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Valor</Label>
                                <Input
                                    placeholder="0,00"
                                    value={valor}
                                    onChange={handleInputValorChange}
                                    type="text"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Vencimento</Label>
                                <Popover open={isVencimentoCalendarOpen} onOpenChange={setIsVencimentoCalendarOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "justify-start text-left font-normal w-full",
                                                !vencimento && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {vencimento ? format(vencimento, "PPP", { locale: localePtBR }) : <span>Selecione uma data</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 z-[1000]">
                                        <Calendar
                                            mode="single"
                                            selected={vencimento}
                                            onSelect={(date) => {
                                                setVencimento(date)
                                                setIsVencimentoCalendarOpen(false)
                                            }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                        
                        {/* Data de Pagamento */}
                        <div className="grid gap-2">
                            <Label>Data de Pagamento (Opcional)</Label>
                            <Popover open={isPaymentCalendarOpen} onOpenChange={setIsPaymentCalendarOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "justify-start text-left font-normal w-full",
                                            !dataPagamento && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dataPagamento ? format(dataPagamento, "PPP", { locale: localePtBR }) : <span>Não Pago</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 z-[1000]">
                                    <Calendar
                                        mode="single"
                                        selected={dataPagamento}
                                        onSelect={(date) => {
                                            // Ensure date is set to noon (12h) to prevent timezone issues on save
                                            setDataPagamento(setHours(date!, 12))
                                            setIsPaymentCalendarOpen(false)
                                        }}
                                        initialFocus
                                    />
                                    {dataPagamento && (
                                        <div className="p-2">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="w-full text-red-500 hover:bg-red-50"
                                                onClick={() => {
                                                    setDataPagamento(undefined)
                                                    setIsPaymentCalendarOpen(false)
                                                }}
                                            >
                                                Remover Pagamento
                                            </Button>
                                        </div>
                                    )}
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
                                <PopoverContent className="w-[300px] p-0 pointer-events-auto z-[1000]" align="start">
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
                                    disabled={boleto.status === 'paid'} // Cannot change recurrence if already paid
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
                                            type="text"
                                            placeholder="0,00"
                                            value={comissaoRecorrente}
                                            onChange={handleInputComissaoChange}
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
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="flex justify-between sm:justify-between">
                        <Button variant="destructive" onClick={handleDelete}>
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir Boleto
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                <X className="mr-2 h-4 w-4" /> Cancelar
                            </Button>
                            <Button onClick={handleSubmit} disabled={loading || !valor || !vencimento || selectedPlates.length === 0 || !representacaoId}>
                                <Save className="mr-2 h-4 w-4" /> Salvar Alterações
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Recurrence Action Dialog for Saving */}
            <RecurrenceActionDialog
                open={isRecurrenceDialogOpen}
                onOpenChange={setIsRecurrenceDialogOpen}
                onAction={handleRecurrenceAction}
                actionType="edit"
            />
        </>
    )
}