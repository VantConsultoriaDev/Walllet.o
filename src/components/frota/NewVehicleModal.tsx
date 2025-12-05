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
import type { Vehicle, VehicleType } from "@/hooks/data/useVehicles"

type NewVehicleModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (vehicle: Vehicle) => void
    vehicleToEdit?: Vehicle
    clientId: string // Required to link the vehicle
}

// Utility to force uppercase
const forceUpperCase = (str: string | undefined) => str ? str.toUpperCase() : undefined;

export function NewVehicleModal({ open, onOpenChange, onSubmit, vehicleToEdit, clientId }: NewVehicleModalProps) {
    const { toast } = useToast()
    const [type, setType] = useState<VehicleType>("CARRO")
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<Partial<Vehicle>>({
        status: "active"
    })
    const [placaError, setPlacaError] = useState("")
    
    // Reset form when modal opens/closes or when editing a different vehicle
    useEffect(() => {
        if (open) {
            if (vehicleToEdit) {
                setType(vehicleToEdit.type)
                setFormData(vehicleToEdit)
            } else {
                setFormData({ 
                    status: "active",
                    clientId: clientId,
                    year: new Date().getFullYear(),
                });
                setType("CARRO")
            }
            setPlacaError("")
        } else {
            setLoading(false)
        }
    }, [open, vehicleToEdit, clientId])

    // Helper for safe integer parsing, defaulting to a fallback number
    const safeParseInt = (value: string | undefined, fallback: number) => {
        if (!value) return fallback;
        const parsed = parseInt(value);
        return isNaN(parsed) ? fallback : parsed;
    };

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
            
            if (data && data.marca) {
                let detectedType: VehicleType = "CARRO"
                const vehicleTypeStr = data.categoria?.toLowerCase() || ""
                
                // Lógica de detecção de tipo:
                if (vehicleTypeStr.includes("moto") || vehicleTypeStr.includes("motocicleta")) {
                    detectedType = "MOTO"
                } else if (vehicleTypeStr.includes("caminhao") || vehicleTypeStr.includes("caminhão") || vehicleTypeStr.includes("truck")) {
                    detectedType = "TRUCK"
                } else if (vehicleTypeStr.includes("reboque") || vehicleTypeStr.includes("semi-reboque") || vehicleTypeStr.includes("carreta")) {
                    detectedType = "CARRETA"
                } else if (vehicleTypeStr.includes("cavalo")) {
                    detectedType = "CAVALO"
                }
                
                // Se o tipo detectado for TRUCK ou CAVALO, e o usuário já tiver selecionado um desses,
                // mantemos a seleção do usuário para evitar troca indesejada.
                const userSelectedType = formData.type || type;
                if ((detectedType === "TRUCK" || detectedType === "CAVALO") && (userSelectedType === "TRUCK" || userSelectedType === "CAVALO")) {
                    // Mantém o tipo selecionado pelo usuário (que está no estado `type`)
                } else {
                    // Caso contrário, usa o tipo detectado
                    setType(detectedType)
                }
                
                // Atualiza os dados
                setFormData(prev => ({
                    ...prev,
                    plate: placaLimpa,
                    brand: data.marca || "",
                    model: data.modelo || "",
                    // Usando 'ano' da API para o campo 'year'
                    year: safeParseInt(data.ano, prev.year || new Date().getFullYear()), 
                    color: data.cor || "",
                    chassi: data.chassi ? forceUpperCase(data.chassi) : "",
                    renavam: data.renavam || "",
                    fipeCode: data.fipeCode || "", // <-- Garantindo que o fipeCode seja mapeado
                    fipeValue: data.fipeValue || "",
                    bodyType: data.categoria?.includes("CAMINHAO") ? data.categoria : "",
                }))
                toast({ title: "Sucesso", description: "Dados da placa carregados automaticamente." })
            } else {
                setPlacaError('Placa não encontrada na base de dados externa. Preencha manualmente.');
                setFormData(prev => ({
                    ...prev,
                    plate: placaLimpa,
                    brand: "",
                    model: "",
                    year: prev.year, // Mantém o ano se já foi preenchido
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
            setFormData(prev => ({
                ...prev,
                plate: placaLimpa,
                brand: "",
                model: "",
                year: prev.year,
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
    }, [toast, formData.type, type]) // Adicionado formData.type e type como dependências

    const handleConsultationClick = () => {
        if (formData.plate) {
            handlePlacaConsultation(formData.plate)
        } else {
            setPlacaError("Digite a placa para consultar.")
        }
    }

    const handleSubmit = () => {
        if (!formData.clientId) {
            toast({ title: "Erro", description: "ID do cliente não encontrado.", variant: "destructive" });
            return;
        }

        if (formData.plate && formData.brand && formData.model) {
            const finalYear = formData.year || new Date().getFullYear();

            onSubmit({
                id: vehicleToEdit?.id || Math.random().toString(36).substr(2, 9),
                type,
                ...formData,
                clientId: formData.clientId,
                year: finalYear,
            } as Vehicle)
            onOpenChange(false)
        } else {
            toast({ title: "Erro", description: "Preencha os campos obrigatórios (Placa, Marca, Modelo).", variant: "destructive" });
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
                    <Input value={formData.chassi || ""} onChange={e => setFormData({ ...formData, chassi: forceUpperCase(e.target.value) })} />
                </div>
            </div>
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