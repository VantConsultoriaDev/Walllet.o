import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
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
import { Badge } from "@/components/ui/badge"
import type { Event, EventType, UrgencyLevel, EventCategory } from "@/types/agenda"
import { DollarSign, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface DayModalProps {
    isOpen: boolean
    onClose: () => void
    date: Date
    events: Event[]
    onAddEvent: (event: Omit<Event, "id">) => void
    onOpenFinance: () => void
    boletosCount: number
}

export function DayModal({
    isOpen,
    onClose,
    date,
    events,
    onAddEvent,
    onOpenFinance,
    boletosCount
}: DayModalProps) {
    const [isAdding, setIsAdding] = useState(false)
    const [newTitle, setNewTitle] = useState("")
    const [newClient, setNewClient] = useState("")
    const [newType, setNewType] = useState<EventType>("outros")
    const [newCategory, setNewCategory] = useState<EventCategory>("compromisso")
    const [newUrgency, setNewUrgency] = useState<UrgencyLevel>("normal")

    const handleSave = () => {
        if (!newTitle || !newClient) return

        onAddEvent({
            title: newTitle,
            client: newClient,
            type: newType,
            urgency: newUrgency,
            category: newCategory,
            date: date
        })

        setIsAdding(false)
        setNewTitle("")
        setNewClient("")
        setNewType("outros")
        setNewCategory("compromisso")
        setNewUrgency("normal")
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl">
                            {date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </DialogTitle>
                        {boletosCount > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/20"
                                onClick={onOpenFinance}
                            >
                                <DollarSign className="h-4 w-4" />
                                Financeiro ({boletosCount})
                            </Button>
                        )}
                    </div>
                    <DialogDescription>
                        Compromissos e tarefas para este dia.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {events.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Nenhum item agendado.</p>
                    ) : (
                        <div className="space-y-3">
                            {events.map((event) => (
                                <div
                                    key={event.id}
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded-lg border transition-all",
                                        event.completed
                                            ? "bg-slate-50 border-slate-100 dark:bg-slate-800/30 dark:border-slate-800 opacity-75"
                                            : "bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-800"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        {/* Since we can't easily update the event from here without passing a handler, 
                                            we'll just display the status for now or assume the parent updates. 
                                            Actually, let's just show the visual state since we don't have an onUpdate prop here yet. 
                                            Wait, I should probably add onUpdate to DayModal props if I want it to be interactive.
                                            For now, I'll just match the visual style.
                                        */}
                                        <div className={cn(
                                            "h-4 w-4 rounded border flex items-center justify-center",
                                            event.completed ? "bg-primary border-primary" : "border-muted-foreground"
                                        )}>
                                            {event.completed && <div className="h-2 w-2 bg-primary-foreground rounded-sm" />}
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <p className={cn("font-medium", event.completed && "line-through text-muted-foreground")}>
                                                    {event.title}
                                                </p>
                                                <Badge variant="outline" className="text-[10px] h-5">{event.category}</Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">{event.client}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Badge variant="outline" className="capitalize">{event.type}</Badge>
                                        {event.urgency === "urgente" && !event.completed && (
                                            <Badge variant="destructive">Urgente</Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {isAdding ? (
                        <div className="space-y-4 p-4 border rounded-lg border-dashed border-slate-300 dark:border-slate-700 mt-4">
                            <h4 className="font-medium flex items-center gap-2">
                                <Plus className="h-4 w-4" /> Novo Item
                            </h4>
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label>Título</Label>
                                    <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ex: Reunião..." />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Cliente / Responsável</Label>
                                    <Input value={newClient} onChange={(e) => setNewClient(e.target.value)} placeholder="Nome" />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Categoria</Label>
                                        <Select value={newCategory} onValueChange={(v: EventCategory) => setNewCategory(v)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="compromisso">Compromisso</SelectItem>
                                                <SelectItem value="tarefa">Tarefa</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Tipo</Label>
                                        <Select value={newType} onValueChange={(v: EventType) => setNewType(v)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="renovacao">Renovação</SelectItem>
                                                <SelectItem value="reuniao">Reunião</SelectItem>
                                                <SelectItem value="vistoria">Vistoria</SelectItem>
                                                <SelectItem value="cobranca">Cobrança</SelectItem>
                                                <SelectItem value="outros">Outros</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Urgência</Label>
                                        <Select value={newUrgency} onValueChange={(v: UrgencyLevel) => setNewUrgency(v)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="normal">Normal</SelectItem>
                                                <SelectItem value="urgente">Urgente</SelectItem>
                                                <SelectItem value="leve">Leve</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-2">
                                    <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>Cancelar</Button>
                                    <Button size="sm" onClick={handleSave}>Salvar</Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <Button variant="outline" className="w-full border-dashed" onClick={() => setIsAdding(true)}>
                            <Plus className="mr-2 h-4 w-4" /> Adicionar Compromisso
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
