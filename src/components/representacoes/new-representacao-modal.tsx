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
import { Save, X, Upload, Image as ImageIcon } from "lucide-react"

export type RepresentacaoType = "Seguradora" | "Associação" | "Cooperativa"

export type NewRepresentacaoFormData = {
    nome: string
    tipo: RepresentacaoType
    site: string
    logo?: File | null
}

export type Partner = {
    id: string
    name: string
    type: string
    contact: string
    email: string
    website: string
    logo?: string
}

interface NewRepresentacaoModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: NewRepresentacaoFormData) => void
    editingPartner?: Partner | null
}

export function NewRepresentacaoModal({ isOpen, onClose, onSubmit, editingPartner }: NewRepresentacaoModalProps) {
    const [nome, setNome] = useState("")
    const [tipo, setTipo] = useState<RepresentacaoType>("Seguradora")
    const [site, setSite] = useState("")
    const [logo, setLogo] = useState<File | null>(null)
    const [logoPreview, setLogoPreview] = useState<string | null>(null)

    // Load editing data when modal opens
    useEffect(() => {
        if (isOpen && editingPartner) {
            setNome(editingPartner.name)
            setTipo(editingPartner.type as RepresentacaoType)
            setSite(editingPartner.website)
            setLogoPreview(editingPartner.logo || null)
            setLogo(null)
        } else if (isOpen && !editingPartner) {
            // Reset for new entry
            setNome("")
            setTipo("Seguradora")
            setSite("")
            setLogo(null)
            setLogoPreview(null)
        }
    }, [isOpen, editingPartner])

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setLogo(file)
            // Create preview URL
            const reader = new FileReader()
            reader.onloadend = () => {
                setLogoPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleRemoveLogo = () => {
        setLogo(null)
        setLogoPreview(null)
    }

    const handleSubmit = () => {
        if (!nome.trim()) return

        const formData: NewRepresentacaoFormData = {
            nome: nome.trim(),
            tipo,
            site: site.trim(),
            logo,
        }

        onSubmit(formData)
        handleClose()
    }

    const handleClose = () => {
        setNome("")
        setTipo("Seguradora")
        setSite("")
        setLogo(null)
        setLogoPreview(null)
        onClose()
    }

    const isEditMode = !!editingPartner

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl">
                        {isEditMode ? "Editar Representação" : "Nova Representação"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditMode
                            ? "Atualize as informações da representação."
                            : "Adicione uma nova representação ao sistema."}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Nome */}
                    <div className="space-y-2">
                        <Label htmlFor="nome">Nome *</Label>
                        <Input
                            id="nome"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            placeholder="Ex: Seguradora XYZ"
                        />
                    </div>

                    {/* Tipo */}
                    <div className="space-y-2">
                        <Label>Tipo *</Label>
                        <Select value={tipo} onValueChange={(value) => setTipo(value as RepresentacaoType)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Seguradora">Seguradora</SelectItem>
                                <SelectItem value="Associação">Associação</SelectItem>
                                <SelectItem value="Cooperativa">Cooperativa</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Site */}
                    <div className="space-y-2">
                        <Label htmlFor="site">Site</Label>
                        <Input
                            id="site"
                            value={site}
                            onChange={(e) => setSite(e.target.value)}
                            placeholder="Ex: https://www.exemplo.com.br"
                        />
                    </div>

                    {/* Logo Upload */}
                    <div className="space-y-2">
                        <Label>Logo</Label>
                        {logoPreview ? (
                            <div className="space-y-2">
                                <div className="relative w-full h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-slate-50 dark:bg-slate-900/50">
                                    <img
                                        src={logoPreview}
                                        alt="Logo preview"
                                        className="max-h-28 max-w-full object-contain"
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRemoveLogo}
                                    className="w-full"
                                >
                                    <X className="mr-2 h-4 w-4" />
                                    Remover Logo
                                </Button>
                            </div>
                        ) : (
                            <div className="relative">
                                <input
                                    type="file"
                                    id="logo-upload"
                                    accept="image/*"
                                    onChange={handleLogoChange}
                                    className="hidden"
                                />
                                <label
                                    htmlFor="logo-upload"
                                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                                >
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground">
                                            <span className="font-semibold">Clique para fazer upload</span> ou arraste
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG ou SVG</p>
                                    </div>
                                </label>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>
                        <X className="mr-2 h-4 w-4" />
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={!nome.trim()}>
                        <Save className="mr-2 h-4 w-4" />
                        {isEditMode ? "Atualizar" : "Salvar Representação"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
