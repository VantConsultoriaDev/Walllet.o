import { useState, useEffect } from "react"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { CalendarIcon, Loader2, Save, X, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { RecurrenceActionDialog } from "./recurrence-action-dialog"
import { useRepresentations } from "@/hooks/data/useRepresentations"

export type TransactionType = "income" | "expense"

export type Transaction = {
    id: string
    description: string
    amount: number
    type: TransactionType
    category: string
    date: Date
    isRecurrent: boolean
    installments?: number // undefined or null means indefinite
    recurrenceId?: string
    representacaoId?: string
    representacaoNome?: string
}

type NewTransactionModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (transaction: Transaction, scope?: "this" | "all") => void
    onDelete?: (transaction: Transaction, scope?: "this" | "all") => void
    transactionToEdit?: Transaction
}

export function NewTransactionModal({ open, onOpenChange, onSubmit, onDelete, transactionToEdit }: NewTransactionModalProps) {
    const { partners } = useRepresentations()

    const [type, setType] = useState<TransactionType>("income")
    const [description, setDescription] = useState("")
    const [amount, setAmount] = useState("")
    const [category, setCategory] = useState("")
    const [date, setDate] = useState<Date | undefined>(new Date())
    const [isRecurrent, setIsRecurrent] = useState(false)
    const [installments, setInstallments] = useState("")
    const [representacaoId, setRepresentacaoId] = useState("")
    const [recurrenceDialogOpen, setRecurrenceDialogOpen] = useState(false)
    const [pendingAction, setPendingAction] = useState<"save" | "delete" | null>(null)

    // Reset form when modal opens
    useEffect(() => {
        if (open) {
            if (transactionToEdit) {
                setType(transactionToEdit.type)
                setDescription(transactionToEdit.description)
                setAmount(transactionToEdit.amount.toString().replace(".", ","))
                setCategory(transactionToEdit.category)
                setDate(transactionToEdit.date)
                setIsRecurrent(transactionToEdit.isRecurrent)
                setInstallments(transactionToEdit.installments ? transactionToEdit.installments.toString() : "")
                setRepresentacaoId(transactionToEdit.representacaoId || "")
            } else {
                setType("income")
                setDescription("")
                setAmount("")
                setCategory("")
                setDate(new Date())
                setIsRecurrent(false)
                setInstallments("")
                setRepresentacaoId("")
            }
        }
    }, [open, transactionToEdit])

    const handleSaveClick = () => {
        if (!description || !amount || !category || !date) return

        if (transactionToEdit?.isRecurrent) {
            setPendingAction("save")
            setRecurrenceDialogOpen(true)
        } else {
            submitTransaction()
        }
    }

    const handleDeleteClick = () => {
        if (transactionToEdit?.isRecurrent) {
            setPendingAction("delete")
            setRecurrenceDialogOpen(true)
        } else {
            if (onDelete && transactionToEdit) {
                onDelete(transactionToEdit)
                onOpenChange(false)
            }
        }
    }

    const handleRecurrenceAction = (scope: "this" | "all") => {
        setRecurrenceDialogOpen(false)
        if (pendingAction === "save") {
            submitTransaction(scope)
        } else if (pendingAction === "delete" && onDelete && transactionToEdit) {
            onDelete(transactionToEdit, scope)
            onOpenChange(false)
        }
        setPendingAction(null)
    }

    const submitTransaction = (scope?: "this" | "all") => {
        const representacaoNome = representacaoId ? partners.find(r => r.id === representacaoId)?.name : undefined

        const newTransaction: Transaction = {
            id: transactionToEdit?.id || Math.random().toString(36).substr(2, 9),
            description,
            amount: parseFloat(amount.replace(",", ".")),
            type,
            category,
            date: date!,
            isRecurrent,
            installments: isRecurrent && installments ? parseInt(installments) : undefined,
            recurrenceId: transactionToEdit?.recurrenceId,
            representacaoId: representacaoId || undefined,
            representacaoNome: representacaoNome,
        }

        onSubmit(newTransaction, scope)
        onOpenChange(false)
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{transactionToEdit ? "Editar Transação" : "Nova Transação"}</DialogTitle>
                        <DialogDescription>
                            {transactionToEdit ? "Edite os detalhes da transação." : "Adicione uma nova receita ou despesa ao sistema."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tipo</Label>
                                <Select value={type} onValueChange={(v) => setType(v as TransactionType)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="income">Receita</SelectItem>
                                        <SelectItem value="expense">Despesa</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Valor (R$)</Label>
                                <Input
                                    type="number"
                                    placeholder="0,00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Descrição / Cliente</Label>
                            <Input
                                placeholder="Ex: Comissão João Silva ou Aluguel"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Categoria</Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {type === "income" ? (
                                            <>
                                                <SelectItem value="Venda">Venda</SelectItem>
                                                <SelectItem value="Comissão">Comissão</SelectItem>
                                                <SelectItem value="Renovação">Renovação</SelectItem>
                                                <SelectItem value="Outros">Outros</SelectItem>
                                            </>
                                        ) : (
                                            <>
                                                <SelectItem value="Operacional">Operacional</SelectItem>
                                                <SelectItem value="Marketing">Marketing</SelectItem>
                                                <SelectItem value="Pessoal">Pessoal</SelectItem>
                                                <SelectItem value="Impostos">Impostos</SelectItem>
                                                <SelectItem value="Outros">Outros</SelectItem>
                                            </>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Representação (only for income) */}
                            {type === "income" && (
                                <div className="space-y-2">
                                    <Label>Representação</Label>
                                    <Select value={representacaoId} onValueChange={setRepresentacaoId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione uma representação" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {partners.map(rep => (
                                                <SelectItem key={rep.id} value={rep.id}>
                                                    {rep.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="space-y-2 flex flex-col">
                                <Label className="mb-2">Data</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={setDate}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <div className="flex items-center justify-between border rounded-lg p-4">
                            <div className="space-y-0.5">
                                <Label className="text-base">Recorrente?</Label>
                                <div className="text-sm text-muted-foreground">
                                    Repetir esta transação mensalmente.
                                </div>
                            </div>
                            <Switch
                                checked={isRecurrent}
                                onCheckedChange={setIsRecurrent}
                            />
                        </div>

                        {isRecurrent && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <Label>Número de Parcelas (Meses)</Label>
                                <Input
                                    type="number"
                                    placeholder="Deixe vazio para indeterminado"
                                    value={installments}
                                    onChange={(e) => setInstallments(e.target.value)}
                                    min={2}
                                    max={120}
                                />
                                <p className="text-xs text-muted-foreground">Deixe em branco para recorrência sem prazo definido.</p>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="flex justify-between sm:justify-between">
                        {transactionToEdit && (
                            <Button variant="destructive" onClick={handleDeleteClick}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                            </Button>
                        )}
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                <X className="mr-2 h-4 w-4" />
                                Cancelar
                            </Button>
                            <Button onClick={handleSaveClick} disabled={!description || !amount || !category || !date}>
                                <Save className="mr-2 h-4 w-4" />
                                Salvar
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <RecurrenceActionDialog
                open={recurrenceDialogOpen}
                onOpenChange={setRecurrenceDialogOpen}
                onAction={handleRecurrenceAction}
                actionType={pendingAction === "delete" ? "delete" : "edit"}
            />
        </>
    )
}