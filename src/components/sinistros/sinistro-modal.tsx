import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar, Car, User, FileText, Clock, ArrowRight, X } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Claim, CLAIM_STATUS_LABELS, CLAIM_TYPE_LABELS } from "@/types/sinistro"
import { cn } from "@/lib/utils"

interface SinistroModalProps {
    claim: Claim | null
    isOpen: boolean
    onClose: () => void
    onAddComment: (claimId: string, text: string) => Promise<{ data: any; error: any }>
}

export function SinistroModal({ claim, isOpen, onClose, onAddComment }: SinistroModalProps) {
    const [newComment, setNewComment] = useState("")
    const [localClaim, setLocalClaim] = useState<Claim | null>(claim)

    // Update local state when prop changes (e.g., after status update or comment addition in parent)
    useEffect(() => {
        setLocalClaim(claim)
    }, [claim])

    if (!localClaim) return null

    const handleSendComment = async () => {
        if (!newComment.trim()) return
        
        // Call parent handler (which updates Supabase and the global state)
        const { data: newCommentData } = await onAddComment(localClaim.id, newComment)

        // Since the parent hook updates the global state, and the global state updates the 'claim' prop,
        // the useEffect above will handle the update. We just clear the input.
        setNewComment("")
    }

    const statusColor = (status: string) => {
        switch (status) {
            case "aberto": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
            case "analise": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
            case "pendencia": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
            case "concluido": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
            case "negado": return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
            default: return "bg-slate-100 text-slate-800"
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] p-0">
                <DialogHeader className="p-6 pb-4">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <DialogTitle className="text-2xl flex items-center gap-2">
                                Sinistro #{localClaim.id}
                                <Badge className={cn("text-xs", statusColor(localClaim.status))}>
                                    {CLAIM_STATUS_LABELS[localClaim.status]}
                                </Badge>
                            </DialogTitle>
                            <DialogDescription className="mt-2">
                                {CLAIM_TYPE_LABELS[localClaim.type]} • {format(localClaim.date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <Tabs defaultValue="detalhes" className="flex-1">
                    <div className="px-6">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
                            <TabsTrigger value="historico">Histórico</TabsTrigger>
                            <TabsTrigger value="comentarios">Comentários</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="detalhes" className="px-6 pb-6 mt-4">
                        <ScrollArea className="h-[400px] pr-4">
                            <div className="space-y-6">
                                {/* Cliente */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        Cliente
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Nome</p>
                                            <p className="font-medium">{localClaim.clientName}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Placa</p>
                                            <div className="flex items-center gap-1.5">
                                                <Car className="h-3.5 w-3.5 text-muted-foreground" />
                                                <p className="font-medium font-mono">{localClaim.clientPlate}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Terceiro Envolvido (Using thirdParties array) */}
                                {localClaim.thirdParties && localClaim.thirdParties.length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <User className="h-4 w-4" />
                                            Terceiros Envolvidos
                                        </h3>
                                        {localClaim.thirdParties.map((tp, index) => (
                                            <div key={tp.id} className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30">
                                                <div className="col-span-2">
                                                    <p className="text-xs text-muted-foreground">Nome do Terceiro #{index + 1}</p>
                                                    <p className="font-medium">{tp.name}</p>
                                                </div>
                                                {tp.asset.type === 'vehicle' && tp.asset.plate && (
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Placa</p>
                                                        <div className="flex items-center gap-1.5">
                                                            <Car className="h-3.5 w-3.5 text-muted-foreground" />
                                                            <p className="font-medium font-mono">{tp.asset.plate}</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {tp.asset.type === 'property' && tp.asset.description && (
                                                    <div className="col-span-2">
                                                        <p className="text-xs text-muted-foreground">Descrição do Patrimônio</p>
                                                        <p className="font-medium">{tp.asset.description}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Descrição */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Descrição
                                    </h3>
                                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border">
                                        <p className="text-sm leading-relaxed">{localClaim.description}</p>
                                    </div>
                                </div>

                                {/* Informações Adicionais */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                        Informações Adicionais
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border text-sm">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Criado em</p>
                                            <p className="font-medium">{format(localClaim.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Última atualização</p>
                                            <p className="font-medium">{format(localClaim.updatedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="historico" className="px-6 pb-6 mt-4">
                        <ScrollArea className="h-[400px] pr-4">
                            <div className="space-y-4">
                                {localClaim.history.length === 0 ? (
                                    <div className="h-32 flex items-center justify-center border-2 border-dashed rounded-lg">
                                        <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada</p>
                                    </div>
                                ) : (
                                    localClaim.history.map((entry, index) => (
                                        <div key={entry.id} className="relative">
                                            {index !== localClaim.history.length - 1 && (
                                                <div className="absolute left-[15px] top-10 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-800" />
                                            )}
                                            <div className="flex gap-4">
                                                <div className="flex flex-col items-center">
                                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                                                        <Clock className="h-4 w-4 text-primary" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 pb-6">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Badge className={cn("text-xs", statusColor(entry.fromStatus))}>
                                                            {CLAIM_STATUS_LABELS[entry.fromStatus]}
                                                        </Badge>
                                                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                                        <Badge className={cn("text-xs", statusColor(entry.toStatus))}>
                                                            {CLAIM_STATUS_LABELS[entry.toStatus]}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mb-1">
                                                        {format(entry.date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} • {entry.updatedBy}
                                                    </p>
                                                    {entry.notes && (
                                                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-2 p-3 rounded-md bg-slate-50 dark:bg-slate-900/50 border">
                                                            {entry.notes}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="comentarios" className="px-6 pb-6 mt-4">
                        <div className="flex flex-col h-[400px]">
                            <ScrollArea className="flex-1 pr-4 mb-4">
                                <div className="space-y-4">
                                    {(!localClaim.comments || localClaim.comments.length === 0) ? (
                                        <div className="h-32 flex items-center justify-center border-2 border-dashed rounded-lg">
                                            <p className="text-sm text-muted-foreground">Nenhum comentário registrado</p>
                                        </div>
                                    ) : (
                                        localClaim.comments.map((comment) => (
                                            <div key={comment.id} className="flex gap-3">
                                                <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                    <User className="h-4 w-4 text-slate-500" />
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-sm font-medium">{comment.createdBy}</p>
                                                        <span className="text-xs text-muted-foreground">
                                                            {format(comment.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-md border">
                                                        {comment.text}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                            <div className="flex gap-2 pt-4 border-t">
                                <Input
                                    placeholder="Adicione um comentário..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
                                />
                                <Button onClick={handleSendComment}>Enviar</Button>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}