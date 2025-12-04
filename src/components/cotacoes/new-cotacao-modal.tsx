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
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Save, X, Car, Home, Package, Users, FileText, Loader2, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    AssetType,
    Asset,
    CommissionType,
    PaymentInstallments,
    ASSET_TYPE_LABELS,
    COMMISSION_TYPE_LABELS,
    Commission, // Importando Commission type
} from "@/types/cotacao"
import { useRepresentations } from "@/hooks/data/useRepresentations"
import { fetchCNPJData, formatCNPJ, formatCPF, isValidCNPJ } from "@/lib/cnpj-api"
import { VehicleService } from "@/services/VehicleService"
import type { PlacaData } from "@/types/vehicle"
import { useToast } from "@/hooks/use-toast"

interface NewCotacaoModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: NewCotacaoFormData) => void
}

export type NewCotacaoFormData = {
    clientType: "PF" | "PJ"
    cpfCnpj: string
    razaoSocialNome: string
    nomeFantasia?: string
    representacaoId?: string
    representacaoNome?: string
    asset: Asset
    anuidade: number
    parcelas: PaymentInstallments
    // Corrigido: Usar o tipo Commission diretamente
    comissao: Commission 
}

// Mock clients for CPF/CNPJ lookup (kept for API simulation)
const mockClients = [
    { cpfCnpj: "12345678901", type: "PF" as const, nome: "João Silva" },
    { cpfCpf: "98765432100", type: "PF" as const, nome: "Maria Oliveira" },
    {
        cpfCnpj: "12345678000190",
        type: "PJ" as const,
        razaoSocial: "Empresa ABC Ltda",
        nomeFantasia: "ABC Seguros",
    },
]

export function NewCotacaoModal({ isOpen, onClose, onSubmit }: NewCotacaoModalProps) {
    const { partners } = useRepresentations()
    const { toast } = useToast()

    const [clientType, setClientType] = useState<"PF" | "PJ">("PF")
    const [cpfCnpj, setCpfCnpj] = useState("")
    const [razaoSocialNome, setRazaoSocialNome] = useState("")
    const [nomeFantasia, setNomeFantasia] = useState("")
    const [representacaoId, setRepresentacaoId] = useState("")

    const [assetType, setAssetType] = useState<AssetType>("veiculo")

    // Veículo fields
    const [isLoadingPlaca, setIsLoadingPlaca] = useState(false)
    const [placaError, setPlacaError] = useState("")
    const [placa, setPlaca] = useState("")
    const [marca, setMarca] = useState("")
    const [modelo, setModelo] = useState("")
    const [ano, setAno] = useState("")
    const [cor, setCor] = useState("")
    const [chassi, setChassi] = useState("")
    const [renavam, setRenavam] = useState("")
    const [codigoFipe, setCodigoFipe] = useState("")
    const [valorFipe, setValorFipe] = useState("")

    // Residencial fields
    const [valorPatrimonio, setValorPatrimonio] = useState("")
    const [endereco, setEndereco] = useState("")

    // Carga fields
    const [valorTotal, setValorTotal] = useState("")

    // Terceiros fields
    const [danosMateriais, setDanosMateriais] = useState("")
    const [danosCorporais, setDanosCorporais] = useState("")
    const [danosMorais, setDanosMorais] = useState("")
    const [app, setApp] = useState("")

    // Outros fields
    const [descricao, setDescricao] = useState("")
    const [valorSegurado, setValorSegurado] = useState("")

    // Payment fields
    const [anuidade, setAnuidade] = useState("")
    const [parcelas, setParcelas] = useState<PaymentInstallments>(1)

    // Commission fields
    const [comissaoType, setComissaoType] = useState<CommissionType>("recorrente_indeterminada")
    const [comissaoValue, setComissaoValue] = useState("")
    const [comissaoInstallments, setComissaoInstallments] = useState("")

    // CPF/CNPJ lookup
    useEffect(() => {
        if (cpfCnpj.length >= 11) {
            const client = mockClients.find((c) => c.cpfCnpj === cpfCnpj)
            if (client) {
                setClientType(client.type)
                if (client.type === "PF") {
                    setRazaoSocialNome(client.nome)
                    setNomeFantasia("")
                } else {
                    setRazaoSocialNome(client.razaoSocial)
                    setNomeFantasia(client.nomeFantasia || "")
                }
            }
        }
    }, [cpfCnpj])

    const handlePlacaConsultation = async () => {
        const placaLimpa = placa.replace(/[^A-Z0-9]/gi, '');
        setPlaca(placaLimpa); // Atualiza o estado da placa para a versão limpa

        if (!VehicleService.validarPlaca(placaLimpa)) {
            setPlacaError('Placa inválida.');
            return;
        }

        setIsLoadingPlaca(true)
        setPlacaError('');

        try {
            const data: PlacaData | null = await VehicleService.consultarPlaca(placaLimpa);

            if (data && data.marca) {
                // Simplificando a atribuição, confiando que VehicleService retorna strings ou strings vazias
                setMarca(data.marca || "");
                setModelo(data.modelo || "");
                setAno(data.ano || ""); 
                setCor(data.cor || "");
                setChassi(data.chassi || "");
                setRenavam(data.renavam || "");
                setCodigoFipe(data.fipeCode || "");
                setValorFipe(data.fipeValue || "");
                toast({ title: "Sucesso", description: "Dados do veículo carregados." })
            } else {
                setPlacaError('Placa não encontrada na base de dados externa. Preencha manualmente.');
                // Limpar campos se a consulta falhar
                setMarca("");
                setModelo("");
                setAno("");
                setCor("");
                setChassi("");
                setRenavam("");
                setCodigoFipe("");
                setValorFipe("");
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Falha ao consultar placa.';
            console.error('Erro na requisição:', error);
            setPlacaError(errorMessage);
            toast({ title: "Erro na Consulta", description: errorMessage, variant: "destructive" })
            // Limpar campos em caso de erro
            setMarca("");
            setModelo("");
            setAno("");
            setCor("");
            setChassi("");
            setRenavam("");
            setCodigoFipe("");
            setValorFipe("");
        } finally {
            setIsLoadingPlaca(false)
        }
    }

    const handlePlacaInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = VehicleService.formatarPlaca(e.target.value)
        setPlaca(value)
        setPlacaError("")
    }

    const handleSubmit = () => {
        let asset: Asset

        switch (assetType) {
            case "veiculo":
                asset = {
                    type: "veiculo",
                    placa,
                    marca,
                    modelo,
                    ano: parseInt(ano),
                    cor,
                    chassi,
                    renavam,
                    codigoFipe,
                    valorFipe: parseFloat(valorFipe),
                }
                break
            case "residencial":
                asset = {
                    type: "residencial",
                    valorPatrimonio: parseFloat(valorPatrimonio),
                    endereco,
                }
                break
            case "carga":
                asset = {
                    type: "carga",
                    valorTotal: parseFloat(valorTotal),
                }
                break
            case "terceiros":
                asset = {
                    type: "terceiros",
                    danosMateriais: parseFloat(danosMateriais),
                    danosCorporais: parseFloat(danosCorporais),
                    danosMorais: parseFloat(danosMorais),
                    app: parseFloat(app),
                }
                break
            case "outros":
                asset = {
                    type: "outros",
                    descricao,
                    valorSegurado: parseFloat(valorSegurado),
                }
                break
        }

        const selectedPartner = partners.find(r => r.id === representacaoId)

        const commissionData: Commission = {
            type: comissaoType,
            value: parseFloat(comissaoValue),
            installments:
                comissaoType === "recorrente_determinada" ? parseInt(comissaoInstallments) : undefined,
        }

        const formData: NewCotacaoFormData = {
            clientType,
            cpfCnpj,
            razaoSocialNome,
            nomeFantasia: nomeFantasia || undefined,
            representacaoId: representacaoId || undefined,
            representacaoNome: selectedPartner?.name,
            asset,
            anuidade: parseFloat(anuidade),
            parcelas,
            comissao: commissionData, // Corrigido: Passando o objeto Commission
        }

        onSubmit(formData)
        handleClose()
    }

    const handleClose = () => {
        // Reset all fields
        setClientType("PF")
        setCpfCnpj("")
        setRazaoSocialNome("")
        setNomeFantasia("")
        setRepresentacaoId("")
        setAssetType("veiculo")
        // Reset asset fields
        setPlaca("")
        setMarca("")
        setModelo("")
        setAno("")
        setCor("")
        setChassi("")
        setRenavam("")
        setCodigoFipe("")
        setValorFipe("")
        setValorPatrimonio("")
        setEndereco("")
        setValorTotal("")
        setDanosMateriais("")
        setDanosCorporais("")
        setDanosMorais("")
        setApp("")
        setDescricao("")
        setValorSegurado("")
        setAnuidade("")
        setParcelas(1)
        setComissaoType("recorrente_indeterminada")
        setComissaoValue("")
        setComissaoInstallments("")
        onClose()
    }

    const getAssetIcon = (type: AssetType) => {
        switch (type) {
            case "veiculo":
                return <Car className="h-4 w-4" />
            case "residencial":
                return <Home className="h-4 w-4" />
            case "carga":
                return <Package className="h-4 w-4" />
            case "terceiros":
                return <Users className="h-4 w-4" />
            case "outros":
                return <FileText className="h-4 w-4" />
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] p-0">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle className="text-2xl">Nova Cotação</DialogTitle>
                    <DialogDescription>Preencha os dados para criar uma nova cotação.</DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] px-6">
                    <div className="space-y-6 pb-6">
                        {/* Client Type */}
                        <div className="space-y-2">
                            <Label>Tipo de Cliente</Label>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant={clientType === "PF" ? "default" : "outline"}
                                    onClick={() => setClientType("PF")}
                                    className="flex-1"
                                >
                                    Pessoa Física (CPF)
                                </Button>
                                <Button
                                    type="button"
                                    variant={clientType === "PJ" ? "default" : "outline"}
                                    onClick={() => setClientType("PJ")}
                                    className="flex-1"
                                >
                                    Pessoa Jurídica (CNPJ)
                                </Button>
                            </div>
                        </div>

                        {/* CPF/CNPJ */}
                        <div className="space-y-2">
                            <Label htmlFor="cpfCnpj">{clientType === "PF" ? "CPF" : "CNPJ"} *</Label>
                            <Input
                                id="cpfCnpj"
                                value={cpfCnpj}
                                onChange={(e) => setCpfCnpj(e.target.value)}
                                placeholder={clientType === "PF" ? "000.000.000-00" : "00.000.000/0000-00"}
                            />
                            <p className="text-xs text-muted-foreground">
                                Se o cliente já estiver cadastrado, os dados serão preenchidos automaticamente.
                            </p>
                        </div>

                        {/* Razão Social / Nome */}
                        <div className="space-y-2">
                            <Label htmlFor="razaoSocialNome">
                                {clientType === "PF" ? "Nome Completo" : "Razão Social"} *
                            </Label>
                            <Input
                                id="razaoSocialNome"
                                value={razaoSocialNome}
                                onChange={(e) => setRazaoSocialNome(e.target.value)}
                                placeholder={clientType === "PF" ? "Nome completo" : "Razão social da empresa"}
                            />
                        </div>

                        {/* Nome Fantasia (only for PJ) */}
                        {clientType === "PJ" && (
                            <div className="space-y-2">
                                <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
                                <Input
                                    id="nomeFantasia"
                                    value={nomeFantasia}
                                    onChange={(e) => setNomeFantasia(e.target.value)}
                                    placeholder="Nome fantasia da empresa"
                                />
                            </div>
                        )}

                        {/* Representação */}
                        <div className="space-y-2">
                            <Label>Representação</Label>
                            <Select value={representacaoId} onValueChange={setRepresentacaoId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione uma representação" />
                                </SelectTrigger>
                                <SelectContent>
                                    {partners.map((rep) => (
                                        <SelectItem key={rep.id} value={rep.id}>
                                            {rep.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Separator />

                        {/* Asset Type Selection */}
                        <div className="space-y-2">
                            <Label>Tipo de Patrimônio *</Label>
                            <div className="grid grid-cols-5 gap-2">
                                {(Object.keys(ASSET_TYPE_LABELS) as AssetType[]).map((type) => (
                                    <Button
                                        key={type}
                                        type="button"
                                        variant={assetType === type ? "default" : "outline"}
                                        onClick={() => setAssetType(type)}
                                        className="flex flex-col h-auto py-3 gap-1"
                                    >
                                        {getAssetIcon(type)}
                                        <span className="text-xs">{ASSET_TYPE_LABELS[type]}</span>
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Dynamic Asset Fields */}
                        <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50 space-y-4">
                            <h3 className="font-semibold text-sm flex items-center gap-2">
                                {getAssetIcon(assetType)}
                                Dados do {ASSET_TYPE_LABELS[assetType]}
                            </h3>

                            {assetType === "veiculo" && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Placa *</Label>
                                        <div className="relative flex gap-2">
                                            <Input
                                                value={placa}
                                                onChange={handlePlacaInputChange}
                                                placeholder="ABC1234"
                                                maxLength={7}
                                            />
                                            <Button 
                                                type="button"
                                                onClick={handlePlacaConsultation} 
                                                disabled={isLoadingPlaca || !placa || !VehicleService.validarPlaca(placa)}
                                                className="shrink-0 w-[150px]"
                                            >
                                                {isLoadingPlaca ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <RefreshCw className="h-4 w-4 mr-2" />
                                                )}
                                                Consultar
                                            </Button>
                                        </div>
                                        {placaError && <p className="text-xs text-red-500 mt-1">{placaError}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Marca *</Label>
                                        <Input value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Ex: Toyota" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Modelo *</Label>
                                        <Input value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Ex: Corolla" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Ano *</Label>
                                        <Input
                                            type="number"
                                            value={ano}
                                            onChange={(e) => setAno(e.target.value)}
                                            placeholder="2024"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Cor *</Label>
                                        <Input value={cor} onChange={(e) => setCor(e.target.value)} placeholder="Ex: Prata" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Chassi *</Label>
                                        <Input value={chassi} onChange={(e) => setChassi(e.target.value)} placeholder="Chassi do veículo" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Renavam *</Label>
                                        <Input value={renavam} onChange={(e) => setRenavam(e.target.value)} placeholder="Renavam" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Código FIPE *</Label>
                                        <Input
                                            value={codigoFipe}
                                            onChange={(e) => setCodigoFipe(e.target.value)}
                                            placeholder="Ex: 001234-5"
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label>Valor FIPE (R$) *</Label>
                                        <Input
                                            type="number"
                                            value={valorFipe}
                                            onChange={(e) => setValorFipe(e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            )}

                            {assetType === "residencial" && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Valor do Patrimônio (R$) *</Label>
                                        <Input
                                            type="number"
                                            value={valorPatrimonio}
                                            onChange={(e) => setValorPatrimonio(e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Endereço *</Label>
                                        <Textarea
                                            value={endereco}
                                            onChange={(e) => setEndereco(e.target.value)}
                                            placeholder="Endereço completo do imóvel"
                                            rows={3}
                                        />
                                    </div>
                                </div>
                            )}

                            {assetType === "carga" && (
                                <div className="space-y-2">
                                    <Label>Valor Total (R$) *</Label>
                                    <Input
                                        type="number"
                                        value={valorTotal}
                                        onChange={(e) => setValorTotal(e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>
                            )}

                            {assetType === "terceiros" && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Danos Materiais (R$) *</Label>
                                        <Input
                                            type="number"
                                            value={danosMateriais}
                                            onChange={(e) => setDanosMateriais(e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Danos Corporais (R$) *</Label>
                                        <Input
                                            type="number"
                                            value={danosCorporais}
                                            onChange={(e) => setDanosCorporais(e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Danos Morais (R$) *</Label>
                                        <Input
                                            type="number"
                                            value={danosMorais}
                                            onChange={(e) => setDanosMorais(e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>APP (R$) *</Label>
                                        <Input
                                            type="number"
                                            value={app}
                                            onChange={(e) => setApp(e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            )}

                            {assetType === "outros" && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Descrição *</Label>
                                        <Textarea
                                            value={descricao}
                                            onChange={(e) => setDescricao(e.target.value)}
                                            placeholder="Descreva o patrimônio a ser segurado"
                                            rows={3}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Valor Segurado (R$) *</Label>
                                        <Input
                                            type="number"
                                            value={valorSegurado}
                                            onChange={(e) => setValorSegurado(e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Payment Fields */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-sm">Pagamento</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Anuidade (R$) *</Label>
                                    <Input
                                        type="number"
                                        value={anuidade}
                                        onChange={(e) => setAnuidade(e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Parcelas *</Label>
                                    <Select value={String(parcelas)} onValueChange={(v) => setParcelas(parseInt(v) as PaymentInstallments)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">À vista</SelectItem>
                                            {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => (
                                                <SelectItem key={n} value={String(n)}>
                                                    {n}x
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Commission Fields */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-sm">Comissão</h3>
                            <div className="space-y-2">
                                <Label>Tipo de Comissão *</Label>
                                <Select value={comissaoType} onValueChange={(v) => setComissaoType(v as CommissionType)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(COMMISSION_TYPE_LABELS).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Valor da Comissão (R$) *</Label>
                                    <Input
                                        type="number"
                                        value={comissaoValue}
                                        onChange={(e) => setComissaoValue(e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>
                                {comissaoType === "recorrente_determinada" && (
                                    <div className="space-y-2">
                                        <Label>Número de Parcelas</Label>
                                        <Input
                                            type="number"
                                            value={comissaoInstallments}
                                            onChange={(e) => setComissaoInstallments(e.target.value)}
                                            placeholder="Ex: 12"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter className="p-6 pt-4 border-t">
                    <Button variant="outline" onClick={handleClose}>
                        <X className="mr-2 h-4 w-4" />
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!cpfCnpj || !razaoSocialNome || !anuidade || !comissaoValue}
                    >
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Cotação
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}