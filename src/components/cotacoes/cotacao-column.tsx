import { Cotacao, CotacaoStatus } from "@/types/cotacao"
import { CotacaoCard } from "./cotacao-card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface CotacaoColumnProps {
    status: CotacaoStatus
    title: string
    cotacoes: Cotacao[]
    onDrop: (cotacaoId: string, status: CotacaoStatus) => void
    onCardClick: (cotacao: Cotacao) => void
    color?: string
}

export function CotacaoColumn({ status, title, cotacoes, onDrop, onCardClick, color = "bg-slate-100 dark:bg-slate-800" }: CotacaoColumnProps) {
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        const cotacaoId = e.dataTransfer.getData("cotacaoId")
        if (cotacaoId) {
            onDrop(cotacaoId, status)
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
                    {cotacoes.length}
                </span>
            </div>

            <ScrollArea className="flex-1 p-2">
                <div className="space-y-2 pb-2">
                    {cotacoes.map((cotacao) => (
                        <CotacaoCard
                            key={cotacao.id}
                            cotacao={cotacao}
                            onClick={() => onCardClick(cotacao)}
                        />
                    ))}
                    {cotacoes.length === 0 && (
                        <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg m-1">
                            <p className="text-xs text-muted-foreground font-medium">Vazio</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}
