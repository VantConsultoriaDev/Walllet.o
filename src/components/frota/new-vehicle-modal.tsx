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
import { VehicleService } from "@/services/VehicleService"
import type { PlacaData } from "@/types/vehicle"
import { useToast } from "@/hooks/use-toast"

export type VehicleType = "CAVALO" | "TRUCK" | "CARRETA" | "CARRO" | "MOTO"

export type Vehicle = {
    id: string
    clientId: string // Added clientId
    type: VehicleType
    plate: string
    brand: string
    model: string
    year: number // <-- Novo campo
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
    const { toast } = useToast()
    const [type, setType] = useState<VehicleType>("CARRO")
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<Partial<Vehicle>>({
        status: "active"
    })
    const [placaError, setPlacaError] = useState("")
    // Removendo placaConsultada, pois a consulta será manual
    // const [placaConsultada, setPlacaConsultada] = useState(false)

    // Reset form when modal opens/closes
    useEffect(() => {
        if (open) {
            if (vehicleToEdit) {
                setType(vehicleToEdit.type)
                setFormData(vehicleToEdit)
            } else {
                // Construção explícita do objeto inicial para evitar inferência 'never'
                const initialData: Partial<Vehicle> = { 
                    status: "active",
                    // Acessamos clientId de forma segura, garantindo que o valor seja string | undefined
                    clientId: vehicleToEdit?.clientId, 
                };
                setFormData(initialData);
                setType("CARRO")
            }
            setPlacaError("")
        } else {
            setLoading(false)
        }
    }, [open, vehicleToEdit])

    // --- CONSULTA API PLACA ---
    const handlePlacaConsultation = useCallback(async (placa: string) => {
        const placaLimpa = placa.replace(/[^A-Z0-9]/gi, '');
        if (!VehicleService.validarPlaca(placaLimpa)) {
            setPlacaError('Placa inválida.');
            return;
        }
        
        setLoading(true);
        setPlacaError('');

        try {
            const data: PlacaData | null = await VehicleService.consultarPlaca(placaLimpa);
            
            // Helper for safe integer parsing, defaulting to a fallback number
            const safeParseInt = (value: string | undefined, fallback: number) => {
                if (!value) return fallback;
                const parsed = parseInt(value);
                return isNaN(parsed) ? fallback : parsed;
            };

            if (data && data.marca) { // Verifica se há dados e se a marca está presente
                // Determine type based on vehicle info (simple heuristic)
                let detectedType: VehicleType = "CARRO"
                const vehicleTypeStr = data.categoria?.toLowerCase() || ""

                if (vehicleTypeStr.includes("moto") || vehicleTypeStr.includes("motocicleta")) {
                    detectedType = "MOTO"
                } else if (vehicleTypeStr.includes("caminhao") || vehicleTypeStr.includes("caminhão")) {
                    detectedType = "TRUCK"
                } else if (vehicleTypeStr.includes("reboque") || vehicleTypeStr.includes("semi-reboque")) {
                    detectedType = "CARRETA"
                } else if (vehicleTypeStr.includes("cavalo")) {
                    detectedType = "CAVALO"
                }
                
                // Atualiza o tipo e os dados
                setType(detectedType)
                setFormData(prev => ({
                    ...prev,
                    plate: placaLimpa, // GARANTINDO QUE A PLACA LIMPA SEJA MANTIDA
                    brand: data.marca || "",
                    model: data.modelo || "",
                    // Use safeParseInt para garantir que year seja um número, usando o ano anterior ou o ano atual como fallback
                    year: safeParseInt(data.ano, prev.year || new Date().getFullYear()), 
                    color: data.cor || "",
                    chassi: data.chassi ? forceUpperCase(data.chassi) : "",
                    renavam: data.renavam || "",
                    // Corrigido: fipeCode e fipeValue agora existem em PlacaData
                    fipeCode: data.fipeCode || "",
                    fipeValue: data.fipeValue || "",
                    bodyType: data.categoria?.includes("CAMINHAO") ? data.categoria : "",
                }))
                toast({ title: "Sucesso", description: "Dados da placa carregados automaticamente." })
            } else {
                // Placa não encontrada ou dados insuficientes. Mantemos a placa e o tipo selecionado.
                setPlacaError('Placa não encontrada na base de dados externa. Preencha manualmente.');
                setFormData(prev => ({
                    ...prev,
                    plate: placaLimpa, // Manter a placa digitada
                    // Limpar apenas os campos que seriam preenchidos pela API
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
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Falha ao consultar placa. Verifique a configuração da API.';
            setPlacaError(errorMessage);
            toast({ title: "Erro na Consulta", description: errorMessage, variant: "destructive" })
            // Manter a placa e o tipo selecionado, limpar apenas os campos preenchíveis
            setFormData(prev => ({
                ...prev,
                plate: placaLimpa, // Manter a placa digitada
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
    }, [toast])

    // NO LONGER AUTOMATICALLY CONSULTING ON PLATE CHANGE
    // useEffect(() => {
    //     if (formData.plate) {
    //         const cleanPlate = formData.plate.replace(/[^A-Z0-9]/g, "")
    //         if (VehicleService.validarPlaca(cleanPlate) && !placaConsultada) {
    //             handlePlacaConsultation(cleanPlate)
    //         }
    //     }
    // }, [formData.plate, handlePlacaConsultation, placaConsultada])

    const handleConsultationClick = () => {
        if (formData.plate) {
            handlePlacaConsultation(formData.plate)
        } else {
            setPlacaError("Digite a placa para consultar.")
        }
    }


    const handleSubmit = () => {
        if (formData.plate && formData.brand && formData.model && formData.clientId) {
            // Ensure year is set before submission, defaulting to current year if still undefined
            const finalYear = formData.year || new Date().getFullYear();

            onSubmit({
                id: vehicleToEdit?.id, 
                type,
                ...formData,
                year: finalYear,
            } as Vehicle)
            onOpenChange(false)
        }
    }

    const renderCommonFields = () => (
        <>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Marca *</Label>
                    <Input value={formData.brand || ""} onChange={e => setFormData({ ...formData, brand: e.target.value })} required />
                </div>
                <div className="space-y-2">
                    <Label>Modelo *</Label>
                    <Input value={formData.model || ""} onChange={e => setFormData({ ...formData, model: e.target.value })} required />
                </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label>Ano *</Label>
                    <Input type="number" value={formData.year || ""} onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })} required />
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
            {/* Simplificando o layout do Renavam para ocupar a largura total */}
            <div className="space-y-2"> 
                <Label>Renavam</Label>
                <Input value={formData.renavam || ""} onChange={e => setFormData({ ...formData, renavam: e.target.value })} />
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

            {/* FIPE Fields (Kept for manual entry/future FIPE API integration) */}
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
        </div>
    )

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{vehicleToEdit ? "Editar Veículo" : "Novo Veículo"}</DialogTitle>
                    <DialogDescription>
                        Insira a placa e consulte os dados automaticamente ou preencha manualmente.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* 1. Type Selection */}
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

                    {/* 2. Plate Input */}
                    <div className="space-y-2">
                        <Label>Placa (Obrigatório)</Label>
                        <div className="relative flex gap-2">
                            <Input
                                value={formData.plate || ""}
                                onChange={e => {
                                    setFormData({ ...formData, plate: VehicleService.formatarPlaca(e.target.value) })
                                    setPlacaError("")
                                }}
                                placeholder="ABC1234"
                                className="text-lg font-bold uppercase flex-1"
                                maxLength={7}
                            />
                            <Button 
                                type="button"
                                onClick={handleConsultationClick} 
                                disabled={loading || !formData.plate || !VehicleService.validarPlaca(formData.plate || "")}
                                className="shrink-0 w-[150px]"
                            >
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                )}
                                Consultar
                            </Button>
                        </div>
                        {placaError && <p className="text-sm text-red-500 mt-1">{placaError}</p>}
                    </div>

                    {/* 3. Dynamic Fields Container */}
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
                    <Button onClick={handleSubmit} disabled={!formData.plate || !formData.brand || !formData.model || loading}>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Veículo
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}