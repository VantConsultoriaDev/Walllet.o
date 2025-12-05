import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DollarSign, Calendar, Repeat, Car, CheckCircle, AlertTriangle, X, Pencil, CalendarIcon } from "lucide-react"
import { format, setHours } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { Boleto } from "@/types/agenda"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as DatePickerCalendar } from "@/components/ui/calendar"

interface BoletoDetailsModalProps {
    boleto: Boleto | null
    isOpen: boolean
    onClose: () => void
    onUpdateStatus: (boletoId: string, newStatus: Boleto['status'], customPaymentDate?: Date) => void
    onDelete: (boleto: Boleto) => void // Mantido para compatibilidade, mas o botão de exclusão será movido
    onEdit: () => void // <-- Novo prop para abrir o modal de edição
}

export function BoletoDetailsModal({
    boleto,
    isOpen,
    onClose,
    onUpdateStatus,
    onDelete,
    onEdit,
}: BoletoDetailsModalProps) {
    if (!boleto) return null

    const [isPaymentDateCalendarOpen, setIsPaymentDateCalendarOpen] = useState(false)
    const [localPaymentDate, setLocalPaymentDate] = useState<Date | undefined>(boleto.dataPagamento)

    // Sync local state when boleto prop changes
    useState(() => {
        setLocalPaymentDate(boleto.dataPagamento)
    }, [boleto])

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value)
    }

    const getStatusBadge = (status: Boleto['status']) => {
        switch (status) {
            case "paid":
                return <Badge className="bg-green-500 hover:bg-green-500 text-white">Pago</Badge>
            case "overdue":
                return <Badge variant="destructive">Vencido</Badge>
            case "pending":
            default:
                return <Badge className="bg-yellow-500 hover:bg-yellow-500 text-white">Pendente</Badge>
        }
    }

    const comissaoDisplay = boleto.comissaoRecorrente
        ? boleto.comissaoTipo === "percentual"
            ? `${boleto.comissaoRecorrente}%`
            : formatCurrency(boleto.comissaoRecorrente)
        : "N/A"

    const handleMarkAsPaid = (date: Date) => {
        // Fix: Set time to noon (12h) to avoid timezone issues when saving only the date part.
        const correctedDate = setHours(date, 12);
        onUpdateStatus(boleto.id, 'paid', correctedDate)
        setLocalPaymentDate(correctedDate)
    }

    const handleMarkAsPending = () => {
        onUpdateStatus(boleto.id, 'pending')
        setLocalPaymentDate(undefined)
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-xl max-h-[90vh] p-0">
                <DialogHeader className="p-6 pb-4">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <DialogTitle className="text-2xl flex items-center gap-2">
                                Boleto - {boleto.clientName}
                            </DialogTitle>
                            <DialogDescription className="mt-2">
                                {boleto.title || "Detalhes da Cobrança"}
                            </DialogDescription>
                        </div>
                        {getStatusBadge(boleto.status)}
                    </div>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] px-6">
                    <div className="space-y-6 pb-6">
                        {/* Valor e Vencimento */}
                        <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border">
                            <div>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" /> Valor
                                </p>
                                <p className="font-bold text-2xl text-primary">
                                    {formatCurrency(boleto.valor)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> Vencimento
                                </p>
                                <p className={cn("font-medium text-lg", boleto.status === 'overdue' && 'text-destructive')}>
                                    {format(boleto.vencimento, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                </p>
                            </div>
                        </div>

                        {/* Data de Pagamento */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                Status e Pagamento
                            </h3>
                            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border text-sm">
                                <div className="col-span-2">
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                                        <CheckCircle className="h-3 w-3 text-green-500" /> Data de Pagamento
                                    </p>
                                    <Popover open={isPaymentDateCalendarOpen} onOpenChange={setIsPaymentDateCalendarOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "justify-start text-left font-normal w-full",
                                                    !localPaymentDate && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {localPaymentDate ? format(localPaymentDate, "PPP", { locale: ptBR }) : <span>Não Pago</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 z-[1000]">
                                            <DatePickerCalendar
                                                mode="single"
                                                selected={localPaymentDate}
                                                onSelect={(date) => {
                                                    if (date) {
                                                        handleMarkAsPaid(date)
                                                    }
                                                    setIsPaymentDateCalendarOpen(false)
                                                }}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                {boleto.status === 'paid' && (
                                    <div className="col-span-2">
                                        <Button variant="ghost" className="w-full text-red-500 hover:bg-red-50" onClick={handleMarkAsPending}>
                                            <X className="h-4 w-4 mr-2" /> Marcar como Pendente
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Informações de Recorrência e Representação */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                Detalhes
                            </h3>
                            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border text-sm">
                                <div>
                                    <p className="text-xs text-muted-foreground">Representação</p>
                                    <p className="font-medium">{boleto.representacao}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Repeat className="h-3 w-3" /> Recorrência
                                    </p>
                                    <p className="font-medium">
                                        {boleto.isRecurring
                                            ? boleto.recurrenceType === 'limited'
                                                ? `Sim (${boleto.recurrenceMonths} meses)`
                                                : "Sim (Indeterminada)"
                                            : "Não"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Placas */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Car className="h-4 w-4" />
                                Veículos Vinculados
                            </h3>
                            <div className="flex flex-wrap gap-2 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border">
                                {boleto.placas.map(p => (
                                    <Badge key={p} variant="secondary" className="text-sm px-3 py-1">
                                        {p}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        {/* Comissão */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <DollarSign className="h-4 w-4" />
                                Comissão Recorrente
                            </h3>
                            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30">
                                <div>
                                    <p className="text-xs text-muted-foreground">Valor/Percentual</p>
                                    <p className="font-medium">{comissaoDisplay}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Tipo</p>
                                    <p className="font-medium capitalize">{boleto.comissaoTipo || "N/A"}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter className="p-6 pt-4 border-t flex justify-between">
                    <Button
                        variant="outline"
                        onClick={onEdit}
                        className="gap-2"
                    >
                        <Pencil className="h-4 w-4" /> Editar Boleto
                    </Button>
                    <div className="flex gap-2">
                        {boleto.status !== 'paid' && (
                            <Button
                                onClick={() => handleMarkAsPaid(new Date())}
                                className="gap-2 bg-green-600 hover:bg-green-700"
                            >
                                <CheckCircle className="h-4 w-4" /> Marcar como Pago
                            </Button>
                        )}
                        <Button variant="outline" onClick={onClose}>
                            Fechar
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}