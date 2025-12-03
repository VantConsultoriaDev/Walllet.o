import { Claim, ClaimStatus } from "@/types/sinistro"
import { KanbanCard } from "./kanban-card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface KanbanColumnProps {
    status: ClaimStatus
    title: string
    claims: Claim[]
    onDrop: (claimId: string, status: ClaimStatus) => void
    onCardClick: (claim: Claim) => void
    color?: string
}

export function KanbanColumn({ status, title, claims, onDrop, onCardClick, color = "bg-slate-100 dark:bg-slate-800" }: KanbanColumnProps) {
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        const claimId = e.dataTransfer.getData("claimId")
        if (claimId) {
            onDrop(claimId, status)
        }
    }

    return (
        <div
            className="flex flex-col h-full min-w-[280px] w-[280px] rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <div className={cn("p-3 rounded-t-xl border-b border-slate-200 dark:border-slate-800 flex items-center justify-between", color)}>
                <h3 className="font-semibold text-sm tracking-tight">{title}</h3>
                <span className="bg-white/50 dark:bg-black/20 text-xs font-bold px-2 py-0.5 rounded-full">
                    {claims.length}
                </span>
            </div>

            <ScrollArea className="flex-1 p-2">
                <div className="space-y-2 pb-2">
                    {claims.map((claim) => (
                        <KanbanCard
                            key={claim.id}
                            claim={claim}
                            onClick={() => onCardClick(claim)}
                        />
                    ))}
                    {claims.length === 0 && (
                        <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg m-1">
                            <p className="text-xs text-muted-foreground font-medium">Vazio</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}
