import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, Car, AlertTriangle, FileText } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Claim, CLAIM_TYPE_LABELS } from "@/types/sinistro"
import { cn } from "@/lib/utils"

interface KanbanCardProps {
    claim: Claim
    onClick: () => void
}

export function KanbanCard({ claim, onClick }: KanbanCardProps) {
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData("claimId", claim.id)
        e.dataTransfer.effectAllowed = "move"
    }

    const typeColor = useMemo(() => {
        switch (claim.type) {
            case "roubo_furto": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
            case "colisao_tombamento": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
            case "danos_natureza": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
            case "incendio": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
            case "terceiros": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
            default: return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
        }
    }, [claim.type])

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            onClick={onClick}
            className="cursor-grab active:cursor-grabbing touch-none"
        >
            <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-transparent hover:border-l-primary/50 group">
                <CardContent className="p-3 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                        <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0.5 font-medium border-0", typeColor)}>
                            {CLAIM_TYPE_LABELS[claim.type]}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {format(claim.date, "dd/MM", { locale: ptBR })}
                        </span>
                    </div>

                    <div>
                        <h4 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                            {claim.clientName}
                        </h4>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Car className="h-3 w-3" />
                            <span>{claim.clientPlate}</span>
                        </div>
                    </div>

                    {claim.thirdPartyName && (
                        <div className="pt-2 border-t border-dashed">
                            <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="h-3 w-3" />
                                <span className="font-medium">Terceiro Envolvido</span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1 pl-4">
                                {claim.thirdPartyName}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
