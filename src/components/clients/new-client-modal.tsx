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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"
import { fetchCNPJData, formatCNPJ, formatCPF, isValidCNPJ, formatPhone } from "@/lib/formatters" // Importando de formatters

type NewClientModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (client: any) => void
}

export function NewClientModal({ open, onOpenChange, onSubmit }: NewClientModalProps) {
    const [clientType, setClientType] = useState<"PF" | "PJ">("PF")
    const [loading, setLoading] = useState(false)
    const [cnpjError, setCnpjError] = useState("")

    // Form state
    const [formData, setFormData] = useState({
        // PF fields
        name: "",
        cpf: "",

        // PJ fields
        cnpj: "",
        nomeFantasia: "",
        razaoSocial: "",
        responsavel: "",
        contatoResponsavel: "",

        // Common fields
        email: "",
        phone: "",
        address: "",
    })

    // Clear form when modal closes
    useEffect(() => {
        if (!open) {
            setFormData({
                name: "",
                cpf: "",
                cnpj: "",
                nomeFantasia: "",
                razaoSocial: "",
                responsavel: "",
                contatoResponsavel: "",
                email: "",
                phone: "",
                address: "",
            })
            setCnpjError("")
            setClientType("PF")
        }
    }, [open])

    // Clear form when switching between PF/PJ
    useEffect(() => {
        setFormData({
            name: "",
            cpf: "",
            cnpj: "",
            nomeFantasia: "",
            razaoSocial: "",
            responsavel: "",
            contatoResponsavel: "",
            email: "",
            phone: "",
            address: "",
        })
        setCnpjError("")
    }, [clientType])

    const handleCNPJBlur = async () => {
        if (!formData.cnpj) return

        setCnpjError("")

        // Remove formatting before validation
        const cleanCNPJ = formData.cnpj.replace(/\D/g, '')

        if (!isValidCNPJ(cleanCNPJ)) {
            setCnpjError("CNPJ inválido")
            return
        }

        setLoading(true)
        try {
            const data = await fetchCNPJData(formData.cnpj)
            setFormData(prev => ({
                ...prev,
                cnpj: formatCNPJ(data.cnpj),
                nomeFantasia: data.nomeFantasia,
                razaoSocial: data.razaoSocial,
                email: data.email,
                phone: data.phone,
                address: data.address,
                responsavel: data.responsavel,
            }))
        } catch (error: any) {
            setCnpjError(error.message || "Erro ao buscar dados do CNPJ")
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        const newClient = {
            id: Math.random().toString(36).substr(2, 9),
            clientType,
            status: "active" as const,
            vehicles: [],
            ...formData,
        }

        onSubmit(newClient)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Novo Cliente</DialogTitle>
                    <DialogDescription>
                        Adicione um novo cliente ao sistema. Preencha os dados abaixo.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <Tabs value={clientType} onValueChange={(v) => setClientType(v as "PF" | "PJ")}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="PF">Pessoa Física</TabsTrigger>
                            <TabsTrigger value="PJ">Pessoa Jurídica</TabsTrigger>
                        </TabsList>

                        <TabsContent value="PF" className="space-y-4 mt-4">
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="pf-name">Nome Completo *</Label>
                                    <Input
                                        id="pf-name"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        required
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="pf-cpf">CPF *</Label>
                                    <Input
                                        id="pf-cpf"
                                        value={formData.cpf}
                                        onChange={(e) => setFormData(prev => ({ ...prev, cpf: formatCPF(e.target.value) }))}
                                        placeholder="000.000.000-00"
                                        maxLength={14}
                                        required
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="pf-email">Email *</Label>
                                    <Input
                                        id="pf-email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                        required
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="pf-phone">Telefone *</Label>
                                    <Input
                                        id="pf-phone"
                                        value={formData.phone}
                                        onChange={(e) => setFormData(prev => ({ ...prev, phone: formatPhone(e.target.value) }))}
                                        placeholder="(00) 00000-0000"
                                        maxLength={15}
                                        required
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="pf-address">Endereço *</Label>
                                    <Input
                                        id="pf-address"
                                        value={formData.address}
                                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                        required
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="PJ" className="space-y-4 mt-4">
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="pj-cnpj">CNPJ *</Label>
                                    <div className="relative">
                                        <Input
                                            id="pj-cnpj"
                                            value={formData.cnpj}
                                            onChange={(e) => {
                                                setFormData(prev => ({ ...prev, cnpj: formatCNPJ(e.target.value) }))
                                                setCnpjError("")
                                            }}
                                            onBlur={handleCNPJBlur}
                                            placeholder="00.000.000/0000-00"
                                            maxLength={18}
                                            required
                                            className={cnpjError ? "border-red-500" : ""}
                                        />
                                        {loading && (
                                            <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                                        )}
                                    </div>
                                    {cnpjError && (
                                        <p className="text-sm text-red-500">{cnpjError}</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="pj-nome-fantasia">Nome Fantasia *</Label>
                                        <Input
                                            id="pj-nome-fantasia"
                                            value={formData.nomeFantasia}
                                            onChange={(e) => setFormData(prev => ({ ...prev, nomeFantasia: e.target.value }))}
                                            required
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="pj-razao-social">Razão Social *</Label>
                                        <Input
                                            id="pj-razao-social"
                                            value={formData.razaoSocial}
                                            onChange={(e) => setFormData(prev => ({ ...prev, razaoSocial: e.target.value }))}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="pj-responsavel">Responsável</Label>
                                        <Input
                                            id="pj-responsavel"
                                            value={formData.responsavel}
                                            onChange={(e) => setFormData(prev => ({ ...prev, responsavel: e.target.value }))}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="pj-contato-responsavel">Contato do Responsável</Label>
                                        <Input
                                            id="pj-contato-responsavel"
                                            value={formData.contatoResponsavel}
                                            onChange={(e) => setFormData(prev => ({ ...prev, contatoResponsavel: formatPhone(e.target.value) }))}
                                            placeholder="(00) 00000-0000"
                                            maxLength={15}
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="pj-email">Email *</Label>
                                    <Input
                                        id="pj-email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                        required
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="pj-phone">Telefone *</Label>
                                    <Input
                                        id="pj-phone"
                                        value={formData.phone}
                                        onChange={(e) => setFormData(prev => ({ ...prev, phone: formatPhone(e.target.value) }))}
                                        placeholder="(00) 00000-0000"
                                        maxLength={15}
                                        required
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="pj-address">Endereço *</Label>
                                    <Input
                                        id="pj-address"
                                        value={formData.address}
                                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                        required
                                    />
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="mt-6">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Carregando...
                                </>
                            ) : (
                                "Criar Cliente"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}