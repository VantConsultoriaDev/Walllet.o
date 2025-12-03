import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Car, Home, Package, Users, FileText, User, Calendar, DollarSign, Clock, ArrowRight } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Cotacao, COTACAO_STATUS_LABELS, ASSET_TYPE_LABELS, COMMISSION_TYPE_LABELS } from "@/types/cotacao"
import { cn } from "@/lib/utils"

interface CotacaoModalProps {
    cotacao: Cotacao | null
    isOpen: boolean
    onClose: () => void
}

export function CotacaoModal({ cotacao, isOpen, onClose }: CotacaoModalProps) {
    if (!cotacao) return null

    const statusColor = (status: string) => {
        switch (status) {
            case "cotacao": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
            case "contrato_vistoria": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
            case "cliente": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
            case "cancelado": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
            default: return "bg-slate-100 text-slate-800"
        }
    }

    const getAssetIcon = () => {
        switch (cotacao.asset.type) {
            case "veiculo": return <Car className="h-4 w-4" />
            case "residencial": return <Home className="h-4 w-4" />
            case "carga": return <Package className="h-4 w-4" />
            case "terceiros": return <Users className="h-4 w-4" />
            case "outros": return <FileText className="h-4 w-4" />
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] p-0">
                <DialogHeader className="p-6 pb-4">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <DialogTitle className="text-2xl flex items-center gap-2">
                                Cotação #{cotacao.id}
                                <Badge className={cn("text-xs", statusColor(cotacao.status))}>
                                    {COTACAO_STATUS_LABELS[cotacao.status]}
                                </Badge>
                            </DialogTitle>
                            <DialogDescription className="mt-2">
                                {ASSET_TYPE_LABELS[cotacao.asset.type]} • {format(cotacao.createdAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <Tabs defaultValue="detalhes" className="flex-1">
                    <div className="px-6">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
                            <TabsTrigger value="historico">Histórico</TabsTrigger>
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
                                            <p className="text-xs text-muted-foreground">Tipo</p>
                                            <p className="font-medium">{cotacao.clientType === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">{cotacao.clientType === "PF" ? "CPF" : "CNPJ"}</p>
                                            <p className="font-medium font-mono">{cotacao.cpfCnpj}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-xs text-muted-foreground">{cotacao.clientType === "PF" ? "Nome" : "Razão Social"}</p>
                                            <p className="font-medium">{cotacao.razaoSocialNome}</p>
                                        </div>
                                        {cotacao.nomeFantasia && (
                                            <div className="col-span-2">
                                                <p className="text-xs text-muted-foreground">Nome Fantasia</p>
                                                <p className="font-medium">{cotacao.nomeFantasia}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Patrimônio */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                        {getAssetIcon()}
                                        Patrimônio - {ASSET_TYPE_LABELS[cotacao.asset.type]}
                                    </h3>
                                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border">
                                        {cotacao.asset.type === "veiculo" && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Placa</p>
                                                    <p className="font-medium font-mono">{cotacao.asset.placa}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Marca/Modelo</p>
                                                    <p className="font-medium">{cotacao.asset.marca} {cotacao.asset.modelo}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Ano</p>
                                                    <p className="font-medium">{cotacao.asset.ano}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Cor</p>
                                                    <p className="font-medium">{cotacao.asset.cor}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Chassi</p>
                                                    <p className="font-medium font-mono text-xs">{cotacao.asset.chassi}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Renavam</p>
                                                    <p className="font-medium font-mono">{cotacao.asset.renavam}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Código FIPE</p>
                                                    <p className="font-medium font-mono">{cotacao.asset.codigoFipe}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Valor FIPE</p>
                                                    <p className="font-medium">R$ {cotacao.asset.valorFipe.toLocaleString("pt-BR")}</p>
                                                </div>
                                            </div>
                                        )}

                                        {cotacao.asset.type === "residencial" && (
                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Valor do Patrimônio</p>
                                                    <p className="font-medium text-lg">R$ {cotacao.asset.valorPatrimonio.toLocaleString("pt-BR")}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Endereço</p>
                                                    <p className="font-medium">{cotacao.asset.endereco}</p>
                                                </div>
                                            </div>
                                        )}

                                        {cotacao.asset.type === "carga" && (
                                            <div>
                                                <p className="text-xs text-muted-foreground">Valor Total</p>
                                                <p className="font-medium text-lg">R$ {cotacao.asset.valorTotal.toLocaleString("pt-BR")}</p>
                                            </div>
                                        )}

                                        {cotacao.asset.type === "terceiros" && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Danos Materiais</p>
                                                    <p className="font-medium">R$ {cotacao.asset.danosMateriais.toLocaleString("pt-BR")}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Danos Corporais</p>
                                                    <p className="font-medium">R$ {cotacao.asset.danosCorporais.toLocaleString("pt-BR")}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Danos Morais</p>
                                                    <p className="font-medium">R$ {cotacao.asset.danosMorais.toLocaleString("pt-BR")}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">APP</p>
                                                    <p className="font-medium">R$ {cotacao.asset.app.toLocaleString("pt-BR")}</p>
                                                </div>
                                            </div>
                                        )}

                                        {cotacao.asset.type === "outros" && (
                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Descrição</p>
                                                    <p className="font-medium">{cotacao.asset.descricao}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Valor Segurado</p>
                                                    <p className="font-medium text-lg">R$ {cotacao.asset.valorSegurado.toLocaleString("pt-BR")}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Pagamento */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                        <DollarSign className="h-4 w-4" />
                                        Pagamento
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Anuidade</p>
                                            <p className="font-medium text-lg">R$ {cotacao.anuidade.toLocaleString("pt-BR")}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Parcelas</p>
                                            <p className="font-medium">{cotacao.parcelas === 1 ? "À vista" : `${cotacao.parcelas}x`}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Comissão */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                        <DollarSign className="h-4 w-4" />
                                        Comissão
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Tipo</p>
                                            <p className="font-medium">{COMMISSION_TYPE_LABELS[cotacao.comissao.type]}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Valor</p>
                                            <p className="font-medium">R$ {cotacao.comissao.value.toLocaleString("pt-BR")}</p>
                                        </div>
                                        {cotacao.comissao.installments && (
                                            <div className="col-span-2">
                                                <p className="text-xs text-muted-foreground">Parcelas</p>
                                                <p className="font-medium">{cotacao.comissao.installments}x</p>
                                            </div>
                                        )}
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
                                            <p className="font-medium">{format(cotacao.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Última atualização</p>
                                            <p className="font-medium">{format(cotacao.updatedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="historico" className="px-6 pb-6 mt-4">
                        <ScrollArea className="h-[400px] pr-4">
                            <div className="space-y-4">
                                {cotacao.history.length === 0 ? (
                                    <div className="h-32 flex items-center justify-center border-2 border-dashed rounded-lg">
                                        <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada</p>
                                    </div>
                                ) : (
                                    cotacao.history.map((entry, index) => (
                                        <div key={entry.id} className="relative">
                                            {index !== cotacao.history.length - 1 && (
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
                                                            {COTACAO_STATUS_LABELS[entry.fromStatus]}
                                                        </Badge>
                                                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                                        <Badge className={cn("text-xs", statusColor(entry.toStatus))}>
                                                            {COTACAO_STATUS_LABELS[entry.toStatus]}
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
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
