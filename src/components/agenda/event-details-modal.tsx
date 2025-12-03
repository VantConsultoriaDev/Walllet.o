import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import type { Event, EventType, UrgencyLevel } from "@/types/agenda"
import { CalendarIcon, Clock, Trash2, Edit2, Save, X } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface EventDetailsModalProps {
    isOpen: boolean
    onClose: () => void
    event: Event | null
    onUpdate: (updatedEvent: Event) => void
    onDelete: (eventId: string) => void
}

export function EventDetailsModal({
    isOpen,
    onClose,
    event,
    onUpdate,
    onDelete
}: EventDetailsModalProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editedEvent, setEditedEvent] = useState<Event | null>(null)

    useEffect(() => {
        if (isOpen) {
            setIsEditing(false)
            setEditedEvent(event)
        }
    }, [isOpen, event])

    if (!event) return null

    const handleSave = () => {
        if (editedEvent) {
            onUpdate(editedEvent)
            setIsEditing(false)
        }
    }

    const handleDelete = () => {
        if (confirm("Tem certeza que deseja excluir este compromisso?")) {
            onDelete(event.id)
            onClose()
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <DialogHeader>
                    <div className="flex items-center justify-between pr-8">
                        <DialogTitle className="text-xl flex items-center gap-2">
                            {isEditing ? "Editar Compromisso" : "Detalhes do Compromisso"}
                        </DialogTitle>
                    </div>
                    <DialogDescription>
                        {isEditing ? "Edite as informações do compromisso abaixo." : "Visualize os detalhes do compromisso."}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {isEditing && editedEvent ? (
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="title">Título</Label>
                                <Input
                                    id="title"
                                    value={editedEvent.title}
                                    onChange={(e) => setEditedEvent({ ...editedEvent, title: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="client">Cliente</Label>
                                <Input
                                    id="client"
                                    value={editedEvent.client}
                                    onChange={(e) => setEditedEvent({ ...editedEvent, client: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Tipo</Label>
                                    <Select
                                        value={editedEvent.type}
                                        onValueChange={(v: EventType) => setEditedEvent({ ...editedEvent, type: v })}
                                    >
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
                                    <Select
                                        value={editedEvent.urgency}
                                        onValueChange={(v: UrgencyLevel) => setEditedEvent({ ...editedEvent, urgency: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="normal">Normal</SelectItem>
                                            <SelectItem value="urgente">Urgente</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description">Descrição</Label>
                                <Textarea
                                    id="description"
                                    value={editedEvent.description || ""}
                                    onChange={(e) => setEditedEvent({ ...editedEvent, description: e.target.value })}
                                    placeholder="Adicione uma descrição..."
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{event.title}</h3>
                                    <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
                                        <CalendarIcon className="h-4 w-4" />
                                        {format(event.date, "PPP", { locale: ptBR })}
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2 items-end">
                                    <Badge variant="outline" className="capitalize">{event.type}</Badge>
                                    {event.urgency === "urgente" && (
                                        <Badge variant="destructive">Urgente</Badge>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-3">
                                <div className="grid grid-cols-3 gap-2 text-sm">
                                    <span className="text-muted-foreground">Cliente:</span>
                                    <span className="col-span-2 font-medium">{event.client}</span>
                                </div>
                                {event.description && (
                                    <div className="grid grid-cols-3 gap-2 text-sm">
                                        <span className="text-muted-foreground">Descrição:</span>
                                        <span className="col-span-2 text-slate-700 dark:text-slate-300">{event.description}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex gap-2 sm:justify-between">
                    {isEditing ? (
                        <>
                            <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancelar</Button>
                            <Button onClick={handleSave} className="gap-2">
                                <Save className="h-4 w-4" /> Salvar Alterações
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="destructive" className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200 dark:border-red-900/30 dark:hover:bg-red-900/20" onClick={handleDelete}>
                                <Trash2 className="h-4 w-4 mr-2" /> Excluir
                            </Button>
                            <Button onClick={() => setIsEditing(true)} className="gap-2">
                                <Edit2 className="h-4 w-4" /> Editar
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
