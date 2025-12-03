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
import { Search, Loader2, Save, X } from "lucide-react"

export type VehicleType = "CAVALO" | "TRUCK" | "CARRETA" | "CARRO" | "MOTO"

export type Vehicle = {
    id: string
    clientId: string // Added clientId
    type: VehicleType
    plate: string
    brand: string
    model: string
    year: number
    color?: string // <-- Novo campo
    renavam?: string
    chassi?: string
    fipeCode?: string
    fipeValue?: string
    bodyType?: string // Carroceria (Truck)
    bodyValue?: string // Valor Carroceria (Truck)
    value?: string // Valor (Carreta)
    status: "active" | "inactive" | "maintenance"
}

type NewVehicleModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (vehicle: Vehicle) => void
    vehicleToEdit?: Vehicle
}

export function NewVehicleModal({ open, onOpenChange, onSubmit, vehicleToEdit }: NewVehicleModalProps) {
    const [type, setType] = useState<VehicleType>("CARRO")
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<Partial<Vehicle>>({
        status: "active"
    })

    // Reset form when modal opens/closes
    useEffect(() => {
        if (open) {
            if (vehicleToEdit) {
                setType(vehicleToEdit.type)
                setFormData(vehicleToEdit)
            } else {
                setFormData({ status: "active" })
                setType("CARRO")
            }
        } else {
            setLoading(false)
        }
    }, [open, vehicleToEdit])

    const handleFetchData = async () => {
        if (!formData.plate) return

        setLoading(true)
        try {
            // Using allorigins.win as a CORS proxy
            const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://placafipe.com/placa/${formData.plate}`)}`)
            const data = await response.json()

            if (data.contents) {
                const parser = new DOMParser()
                const doc = parser.parseFromString(data.contents, "text/html")

                // Extracting data from the table
                const getTableValue = (label: string) => {
                    const rows = doc.querySelectorAll("table tr")
                    for (const row of rows) {
                        const th = row.querySelector("td:first-child")?.textContent?.trim()
                        if (th && th.includes(label)) {
                            return row.querySelector("td:last-child")?.textContent?.trim() || ""
                        }
                    }
                    return ""
                }

                const brand = getTableValue("Marca")
                const model = getTableValue("Modelo")
                const yearStr = getTableValue("Ano") // Usually "2022" or "2022/2023"
                const color = getTableValue("Cor") // <-- Capturando a cor
                const chassi = getTableValue("Chassi") // Might not be available publicly, but we try

                // Parse year (take the first 4 digits)
                const year = yearStr ? parseInt(yearStr.substring(0, 4)) : new Date().getFullYear()

                // Determine type based on vehicle info (simple heuristic)
                let detectedType: VehicleType = "CARRO"
                const vehicleTypeStr = getTableValue("Tipo de Veículo") || ""

                if (vehicleTypeStr.toLowerCase().includes("moto") || vehicleTypeStr.toLowerCase().includes("motocicleta")) {
                    detectedType = "MOTO"
                } else if (vehicleTypeStr.toLowerCase().includes("caminhao") || vehicleTypeStr.toLowerCase().includes("caminhão")) {
                    detectedType = "TRUCK"
                } else if (vehicleTypeStr.toLowerCase().includes("reboque") || vehicleTypeStr.toLowerCase().includes("semi-reboque")) {
                    detectedType = "CARRETA"
                }

                // Update form
                setType(detectedType)
                setFormData(prev => ({
                    ...prev,
                    brand: brand || prev.brand,
                    model: model || prev.model,
                    year: year || prev.year,
                    color: color || prev.color, // <-- Atualizando a cor
                    chassi: chassi || prev.chassi,
                }))
            }
        } catch (error) {
            console.error("Error fetching vehicle data:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = () => {
        if (formData.plate && formData.brand && formData.model && formData.clientId) {
            onSubmit({
                // If editing, use existing ID. If creating new, ID should be undefined/null 
                // so useVehicles knows to call addVehicle.
                id: vehicleToEdit?.id, 
                type,
                ...formData
            } as Vehicle)
            onOpenChange(false)
        }
    }

    const renderCommonFields = () => (
        <>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Marca</Label>
                    <Input value={formData.brand || ""} onChange={e => setFormData({ ...formData, brand: e.target.value })} />
                </div>
                <div className="space-y-2">
                    <Label>Modelo</Label>
                    <Input value={formData.model || ""} onChange={e => setFormData({ ...formData, model: e.target.value })} />
                </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label>Ano</Label>
                    <Input type="number" value={formData.year || ""} onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })} />
                </div>
                <div className="space-y-2">
                    <Label>Cor</Label>
                    <Input value={formData.color || ""} onChange={e => setFormData({ ...formData, color: e.target.value })} />
                </div>
                <div className="space-y-2">
                    <Label>Chassi</Label>
                    <Input value={formData.chassi || ""} onChange={e => setFormData({ ...formData, chassi: e.target.value })} />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Renavam</Label>
                    <Input value={formData.renavam || ""} onChange={e => setFormData({ ...formData, renavam: e.target.value })} />
                </div>
            </div>
        </>
    )

    const renderFipeFields = () => (
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Código Fipe</Label>
                <Input value={formData.fipeCode || ""} onChange={e => setFormData({ ...formData, fipeCode: e.target.value })} />
            </div>
            <div className="space-y-2">
                <Label>Valor Fipe</Label>
                <Input value={formData.fipeValue || ""} onChange={e => setFormData({ ...formData, fipeValue: e.target.value })} />
            </div>
        </div>
    )

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{vehicleToEdit ? "Editar Veículo" : "Novo Veículo"}</DialogTitle>
                    <DialogDescription>
                        Insira a placa para buscar os dados automaticamente ou preencha manualmente.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Type Selection */}
                    <div className="space-y-2">
                        <Label>Tipo de Veículo</Label>
                        <Select value={type} onValueChange={(v) => setType(v as VehicleType)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="CARRO">Carro</SelectItem>
                                <SelectItem value="MOTO">Moto</SelectItem>
                                <SelectItem value="CAVALO">Cavalo Mecânico</SelectItem>
                                <SelectItem value="TRUCK">Caminhão (Truck)</SelectItem>
                                <SelectItem value="CARRETA">Carreta</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Plate Search */}
                    <div className="flex gap-2 items-end">
                        <div className="space-y-2 flex-1">
                            <Label>Placa (Obrigatório)</Label>
                            <Input
                                value={formData.plate || ""}
                                onChange={e => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                                placeholder="ABC-1234"
                                className="text-lg font-bold uppercase"
                                maxLength={8}
                            />
                        </div>
                        <Button onClick={handleFetchData} disabled={!formData.plate || loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                            Buscar Dados
                        </Button>
                    </div>

                    {/* Dynamic Fields */}
                    <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                        {renderCommonFields()}

                        {/* Type Specific Fields */}
                        {(type === "CARRO" || type === "MOTO" || type === "CAVALO") && (
                            renderFipeFields()
                        )}

                        {type === "TRUCK" && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Tipo de Carroceria</Label>
                                        <Input value={formData.bodyType || ""} onChange={e => setFormData({ ...formData, bodyType: e.target.value })} placeholder="Ex: Baú, Graneleiro" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Valor Carroceria</Label>
                                        <Input value={formData.bodyValue || ""} onChange={e => setFormData({ ...formData, bodyValue: e.target.value })} />
                                    </div>
                                </div>
                                {renderFipeFields()}
                            </>
                        )}

                        {type === "CARRETA" && (
                            <div className="space-y-2">
                                <Label>Valor (Reais)</Label>
                                <Input value={formData.value || ""} onChange={e => setFormData({ ...formData, value: e.target.value })} />
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        <X className="mr-2 h-4 w-4" />
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={!formData.plate || !formData.brand}>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Veículo
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}