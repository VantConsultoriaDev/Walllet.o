import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, Car, Home, Package, Users, FileText } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Cotacao, ASSET_TYPE_LABELS } from "@/types/cotacao"
import { cn } from "@/lib/utils"

interface CotacaoCardProps {
    cotacao: Cotacao
    onClick: () => void
}

export function CotacaoCard({ cotacao, onClick }: CotacaoCardProps) {
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData("cotacaoId", cotacao.id)
        e.dataTransfer.effectAllowed = "move"
    }

    const assetIcon = useMemo(() => {
        switch (cotacao.asset.type) {
            case "veiculo": return <Car className="h-3 w-3" />
            case "residencial": return <Home className="h-3 w-3" />
            case "carga": return <Package className="h-3 w-3" />
            case "terceiros": return <Users className="h-3 w-3" />
            case "outros": return <FileText className="h-3 w-3" />
        }
    }, [cotacao.asset.type])

    const assetColor = useMemo(() => {
        switch (cotacao.asset.type) {
            case "veiculo": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
            case "residencial": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
            case "carga": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
            case "terceiros": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
            case "outros": return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
        }
    }, [cotacao.asset.type])

    const getAssetDetail = () => {
        switch (cotacao.asset.type) {
            case "veiculo":
                return `${cotacao.asset.marca} ${cotacao.asset.modelo} - ${cotacao.asset.placa}`
            case "residencial":
                return `R$ ${cotacao.asset.valorPatrimonio.toLocaleString("pt-BR")}`
            case "carga":
                return `R$ ${cotacao.asset.valorTotal.toLocaleString("pt-BR")}`
            case "terceiros":
                return `Danos: R$ ${(cotacao.asset.danosMateriais + cotacao.asset.danosCorporais).toLocaleString("pt-BR")}`
            case "outros":
                return cotacao.asset.descricao
        }
    }

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
                        <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0.5 font-medium border-0 flex items-center gap-1", assetColor)}>
                            {assetIcon}
                            {ASSET_TYPE_LABELS[cotacao.asset.type]}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {format(cotacao.createdAt, "dd/MM", { locale: ptBR })}
                        </span>
                    </div>

                    <div>
                        <h4 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                            {cotacao.razaoSocialNome}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {getAssetDetail()}
                        </p>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-dashed">
                        <span className="text-xs font-medium text-green-600 dark:text-green-400">
                            R$ {cotacao.anuidade.toLocaleString("pt-BR")}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                            {cotacao.parcelas}x
                        </span>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
