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
import { Badge } from "@/components/ui/badge"
import type { Event, EventType, UrgencyLevel } from "@/types/agenda"
import { Trash2, Edit2, Save, X } from "lucide-react"

interface EventModalProps {
    isOpen: boolean
    onClose: () => void
    event: Event | null
    onUpdate: (updatedEvent: Event) => void
    onDelete: (eventId: string) => void
}

export function EventModal({
    isOpen,
    onClose,
    event,
    onUpdate,
    onDelete
}: EventModalProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [title, setTitle] = useState("")
    const [client, setClient] = useState("")
    const [type, setType] = useState<EventType>("outros")
    const [urgency, setUrgency] = useState<UrgencyLevel>("normal")

    useEffect(() => {
        if (event) {
            setTitle(event.title)
            setClient(event.client)
            setType(event.type)
            setUrgency(event.urgency)
        }
    }, [event, isOpen])

    if (!event) return null

    const handleSave = () => {
        onUpdate({
            ...event,
            title,
            client,
            type,
            urgency
        })
        onClose()
    }

    const handleDelete = () => {
        if (confirm("Tem certeza que deseja excluir este compromisso?")) {
            onDelete(event.id)
            onClose()
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <span>Detalhes do Compromisso</span>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleDelete}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </DialogTitle>
                    <DialogDescription>
                        {event.date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Título</Label>
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-white dark:bg-slate-950" />
                    </div>

                    <div className="grid gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cliente</Label>
                        <Input value={client} onChange={(e) => setClient(e.target.value)} className="bg-white dark:bg-slate-950" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</Label>
                            <Select value={type} onValueChange={(v: EventType) => setType(v)}>
                                <SelectTrigger className="bg-white dark:bg-slate-950">
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

                        <div className="grid gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Urgência</Label>
                            <Select value={urgency} onValueChange={(v: UrgencyLevel) => setUrgency(v)}>
                                <SelectTrigger className="bg-white dark:bg-slate-950">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="urgente">Urgente</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <div className="flex gap-2 w-full justify-end">
                        <Button variant="outline" onClick={onClose}>
                            <X className="mr-2 h-4 w-4" /> Cancelar
                        </Button>
                        <Button onClick={handleSave}>
                            <Save className="mr-2 h-4 w-4" /> Salvar
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
