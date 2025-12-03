import { useState, useEffect, useCallback } from "react"
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
import { Loader2, Save, X, RefreshCw } from "lucide-react"
import { consultarPlaca } from "@/services/VehicleService"
import type { PlacaData } from "@/types/vehicle"

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
    value?: string // Valor Contrato (ou Valor Carreta)
    status: "active" | "inactive" | "maintenance"
}

type NewVehicleModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (vehicle: Vehicle) => void
    vehicleToEdit?: Vehicle
}

// Utility to force uppercase
const forceUpperCase = (str: string | undefined) => str ? str.toUpperCase() : undefined;

export function NewVehicleModal({ open, onOpenChange, onSubmit, vehicleToEdit }: NewVehicleModalProps) {
    const [type, setType] = useState<VehicleType>("CARRO")
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<Partial<Vehicle>>({
        status: "active"
    })
    const [placaError, setPlacaError] = useState("")
    const [placaConsultada, setPlacaConsultada] = useState(false)

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
            setPlacaError("")
            setPlacaConsultada(false)
        } else {
            setLoading(false)
        }
    }, [open, vehicleToEdit])

    // --- CONSULTA API PLACA ---
    const handlePlacaConsultation = useCallback(async (placa: string) => {
        const placaLimpa = placa.replace(/[^A-Z0-9]/gi, '');
        if (placaLimpa.length !== 7) {
            setPlacaError('Placa deve ter 7 caracteres.');
            return;
        }
        
        setLoading(true);
        setPlacaError('');
        setPlacaConsultada(false);

        try {
            const data: PlacaData | null = await consultarPlaca(placaLimpa);
            
            if (data) {
                // Determine type based on vehicle info (simple heuristic)
                let detectedType: VehicleType = "CARRO"
                const vehicleTypeStr = data.tipo_veiculo?.toLowerCase() || ""

                if (vehicleTypeStr.includes("moto") || vehicleTypeStr.includes("motocicleta")) {
                    detectedType = "MOTO"
                } else if (vehicleTypeStr.includes("caminhao") || vehicleTypeStr.includes("caminhão")) {
                    detectedType = "TRUCK"
                } else if (vehicleTypeStr.includes("reboque") || vehicleTypeStr.includes("semi-reboque")) {
                    detectedType = "CARRETA"
                } else if (vehicleTypeStr.includes("cavalo")) {
                    detectedType = "CAVALO"
                }
                
                setType(detectedType)
                setFormData(prev => ({
                    ...prev,
                    brand: data.marca || prev.brand,
                    model: data.modelo || prev.model,
                    year: data.ano || prev.year,
                    color: data.cor || prev.color,
                    chassi: data.chassi ? forceUpperCase(data.chassi) : prev.chassi,
                    renavam: data.renavam || prev.renavam,
                    fipeCode: data.fipe_codigo || prev.fipeCode,
                    fipeValue: data.valor_fipe || prev.fipeValue,
                    bodyType: data.carroceria || prev.bodyType, // Mapeando carroceria
                }))
                setPlacaConsultada(true);
            } else {
                setPlacaError('Placa não encontrada na base de dados externa.');
            }
        } catch (err) {
            console.error('Erro ao consultar placa:', err);
            setPlacaError(err instanceof Error ? err.message : 'Falha ao consultar placa. Verifique a conexão ou o token da API.');
            // Clear auto-filled fields on error
            setFormData(prev => ({
                ...prev,
                brand: "",
                model: "",
                year: undefined,
                color: "",
                chassi: "",
                renavam: "",
                fipeCode: "",
                fipeValue: "",
                bodyType: "",
            }))
        } finally {
            setLoading(false);
        }
    }, [])

    // Effect to trigger data fetch when plate changes
    useEffect(() => {
        if (formData.plate) {
            const cleanPlate = formData.plate.replace(/[^A-Z0-9]/g, "")
            if (cleanPlate.length === 7 && !placaConsultada) {
                handlePlacaConsultation(cleanPlate)
            }
        }
    }, [formData.plate, handlePlacaConsultation, placaConsultada])

    const handleManualFipeUpdate = () => {
        if (formData.plate) {
            handlePlacaConsultation(formData.plate)
        }
    }


    const handleSubmit = () => {
        if (formData.plate && formData.brand && formData.model && formData.clientId) {
            onSubmit({
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
        <div className="space-y-4">
            {/* Valor Contrato */}
            {type !== "CARRETA" && (
                <div className="space-y-2">
                    <Label>Valor Contrato (R$)</Label>
                    <Input 
                        value={formData.value || ""} 
                        onChange={e => setFormData({ ...formData, value: e.target.value })} 
                        placeholder="0.00"
                    />
                </div>
            )}

            {/* FIPE Fields */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Código Fipe</Label>
                    <Input value={formData.fipeCode || ""} onChange={e => setFormData({ ...formData, fipeCode: e.target.value })} />
                </div>
                <div className="space-y-2">
                    <Label>Valor Fipe (R$)</Label>
                    <Input value={formData.fipeValue || ""} onChange={e => setFormData({ ...formData, fipeValue: e.target.value })} />
                </div>
            </div>
            
            {/* Update FIPE Button */}
            <Button 
                variant="outline" 
                size="sm" 
                onClick={handleManualFipeUpdate} 
                disabled={loading || !formData.plate || formData.plate.length !== 7}
                className="w-full gap-2"
            >
                {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <RefreshCw className="h-4 w-4" />
                )}
                Atualizar FIPE
            </Button>
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

                    {/* Plate Input */}
                    <div className="space-y-2">
                        <Label>Placa (Obrigatório)</Label>
                        <div className="relative">
                            <Input
                                value={formData.plate || ""}
                                onChange={e => {
                                    setFormData({ ...formData, plate: e.target.value.toUpperCase() })
                                    setPlacaConsultada(false) // Reset consultation status on change
                                    setPlacaError("")
                                }}
                                placeholder="ABC-1234"
                                className="text-lg font-bold uppercase"
                                maxLength={8}
                            />
                            {loading && (
                                <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-primary" />
                            )}
                        </div>
                        {placaError && <p className="text-sm text-red-500 mt-1">{placaError}</p>}
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
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Valor (Carreta) (R$)</Label>
                                    <Input value={formData.value || ""} onChange={e => setFormData({ ...formData, value: e.target.value })} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        <X className="mr-2 h-4 w-4" />
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={!formData.plate || !formData.brand || loading}>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Veículo
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}