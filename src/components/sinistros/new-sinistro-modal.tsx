import { useState, useMemo } from "react"
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
import { Switch } from "@/components/ui/switch"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { CalendarIcon, Plus, X, Save, Car, Building2, Check } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { ClaimType, ThirdParty, ThirdPartyAssetType, CLAIM_TYPE_LABELS } from "@/types/sinistro"
import { useClients, type Client } from "@/hooks/data/useClients"
import type { Vehicle } from "@/components/frota/new-vehicle-modal"

interface NewSinistroModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: NewSinistroFormData) => void
}

export type NewSinistroFormData = {
    clientId: string
    clientName: string
    vehiclePlate: string
    driverName: string
    driverCpf: string
    type: ClaimType
    date: Date
    time: string
    hasThirdParties: boolean
    thirdParties: ThirdParty[]
    description: string
}

export function NewSinistroModal({ isOpen, onClose, onSubmit }: NewSinistroModalProps) {
    const { clients, loading: clientsLoading } = useClients()

    const [clientSearch, setClientSearch] = useState("")
    const [selectedClient, setSelectedClient] = useState<Client | null>(null)
    const [showClientDropdown, setShowClientDropdown] = useState(false)

    const [vehicleSearch, setVehicleSearch] = useState("")
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
    const [showVehicleDropdown, setShowVehicleDropdown] = useState(false)

    const [driverName, setDriverName] = useState("")
    const [driverCpf, setDriverCpf] = useState("")
    const [claimType, setClaimType] = useState<ClaimType>("colisao_tombamento")
    const [date, setDate] = useState<Date | undefined>(new Date())
    const [time, setTime] = useState("")
    const [hasThirdParties, setHasThirdParties] = useState(false)
    const [thirdParties, setThirdParties] = useState<ThirdParty[]>([])
    const [description, setDescription] = useState("")

    const filteredClients = useMemo<Client[]>(() => {
        if (!clientSearch) return clients
        return clients.filter((client) =>
            client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
            client.cpf?.includes(clientSearch) ||
            client.cnpj?.includes(clientSearch)
        )
    }, [clientSearch, clients])

    const clientVehicles = useMemo(() => {
        return selectedClient ? selectedClient.vehicles : []
    }, [selectedClient])

    const filteredVehicles = useMemo(() => {
        if (!vehicleSearch) return clientVehicles
        return clientVehicles.filter(
            (vehicle) =>
                vehicle.plate.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
                vehicle.brand?.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
                vehicle.model?.toLowerCase().includes(vehicleSearch.toLowerCase())
        )
    }, [vehicleSearch, clientVehicles])

    const handleAddThirdParty = () => {
        const newThirdParty: ThirdParty = {
            id: `tp-${Date.now()}`,
            name: "",
            cpf: "",
            asset: {
                type: "vehicle",
                plate: "",
            },
        }
        setThirdParties([...thirdParties, newThirdParty])
    }

    const handleRemoveThirdParty = (id: string) => {
        setThirdParties(thirdParties.filter((tp) => tp.id !== id))
    }

    const handleThirdPartyChange = (id: string, field: string, value: any) => {
        setThirdParties(
            thirdParties.map((tp) => {
                if (tp.id === id) {
                    if (field.startsWith("asset.")) {
                        const assetField = field.split(".")[1]
                        return {
                            ...tp,
                            asset: {
                                ...tp.asset,
                                [assetField]: value,
                            },
                        }
                    }
                    return { ...tp, [field]: value }
                }
                return tp
            })
        )
    }

    const handleAssetTypeChange = (id: string, type: ThirdPartyAssetType) => {
        setThirdParties(
            thirdParties.map((tp) => {
                if (tp.id === id) {
                    return {
                        ...tp,
                        asset: {
                            type,
                            ...(type === "vehicle" ? { plate: "" } : { description: "" }),
                        },
                    }
                }
                return tp
            })
        )
    }

    const handleSubmit = () => {
        if (!selectedClient || !selectedVehicle || !date) return

        const formData: NewSinistroFormData = {
            clientId: selectedClient.id,
            clientName: selectedClient.name,
            vehiclePlate: selectedVehicle.plate,
            driverName,
            driverCpf,
            type: claimType,
            date,
            time,
            hasThirdParties,
            thirdParties,
            description,
        }

        onSubmit(formData)
        handleClose()
    }

    const handleClose = () => {
        setClientSearch("")
        setSelectedClient(null)
        setVehicleSearch("")
        setSelectedVehicle(null)
        setDriverName("")
        setDriverCpf("")
        setClaimType("colisao_tombamento")
        setDate(new Date())
        setTime("")
        setHasThirdParties(false)
        setThirdParties([])
        setDescription("")
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] p-0">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle className="text-2xl">Novo Sinistro</DialogTitle>
                    <DialogDescription>
                        Preencha os dados do sinistro para registrá-lo no sistema.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] px-6">
                    <div className="space-y-6 pb-6">
                        {/* Cliente */}
                        <div className="space-y-2">
                            <Label htmlFor="client">Cliente *</Label>
                            <div className="relative">
                                <Input
                                    id="client"
                                    placeholder="Digite para buscar..."
                                    value={selectedClient ? selectedClient.name : clientSearch}
                                    onChange={(e) => {
                                        setClientSearch(e.target.value)
                                        setSelectedClient(null)
                                        setSelectedVehicle(null)
                                        setShowClientDropdown(e.target.value.length > 0)
                                    }}
                                />
                                {showClientDropdown && filteredClients.length > 0 && !selectedClient && clientSearch.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-950 border rounded-md shadow-lg max-h-48 overflow-auto">
                                        {filteredClients.map((client: Client) => {
                                            const isSelected = selectedClient?.id === client.id;
                                            return (
                                                <div
                                                    key={client.id}
                                                    className="px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-sm flex items-center justify-between"
                                                    onClick={() => {
                                                        setSelectedClient(client)
                                                        setClientSearch(client.name)
                                                        setShowClientDropdown(false)
                                                    }}
                                                >
                                                    {client.name}
                                                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Veículo */}
                        <div className="space-y-2">
                            <Label htmlFor="vehicle">Veículo *</Label>
                            <div className="relative">
                                <Input
                                    id="vehicle"
                                    placeholder={selectedClient ? "Digite placa, marca ou modelo..." : "Selecione um cliente primeiro"}
                                    value={selectedVehicle ? `${selectedVehicle.plate} - ${selectedVehicle.brand} ${selectedVehicle.model}` : vehicleSearch}
                                    onChange={(e) => {
                                        setVehicleSearch(e.target.value)
                                        setSelectedVehicle(null)
                                        setShowVehicleDropdown(e.target.value.length > 0 && !!selectedClient)
                                    }}
                                    disabled={!selectedClient}
                                />
                                {showVehicleDropdown && filteredVehicles.length > 0 && !selectedVehicle && (
                                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-950 border rounded-md shadow-lg max-h-48 overflow-auto">
                                        {filteredVehicles.map((vehicle) => (
                                            <div
                                                key={vehicle.plate}
                                                className="px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-sm"
                                                onClick={() => {
                                                    setSelectedVehicle(vehicle)
                                                    setVehicleSearch(`${vehicle.plate} - ${vehicle.brand} ${vehicle.model}`)
                                                    setShowVehicleDropdown(false)
                                                }}
                                            >
                                                <div className="font-medium">{vehicle.plate}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {vehicle.brand} {vehicle.model}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {!selectedClient && <p className="text-xs text-red-500">Selecione um cliente para ver os veículos disponíveis.</p>}
                        </div>

                        {/* Motorista */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="driverName">Nome do Motorista *</Label>
                                <Input
                                    id="driverName"
                                    value={driverName}
                                    onChange={(e) => setDriverName(e.target.value)}
                                    placeholder="Nome completo"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="driverCpf">CPF do Motorista *</Label>
                                <Input
                                    id="driverCpf"
                                    value={driverCpf}
                                    onChange={(e) => setDriverCpf(e.target.value)}
                                    placeholder="000.000.000-00"
                                />
                            </div>
                        </div>

                        {/* Tipo, Data e Hora */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Tipo de Sinistro *</Label>
                                <Select value={claimType} onValueChange={(v) => setClaimType(v as ClaimType)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(CLAIM_TYPE_LABELS).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Data do Ocorrido *</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="time">Hora do Ocorrido *</Label>
                                <Input
                                    id="time"
                                    type="time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* Terceiros Envolvidos */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Terceiros Envolvidos</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Houve terceiros envolvidos no sinistro?
                                    </p>
                                </div>
                                <Switch checked={hasThirdParties} onCheckedChange={setHasThirdParties} />
                            </div>

                            {hasThirdParties && (
                                <div className="space-y-4">
                                    {thirdParties.map((tp, index) => (
                                        <div
                                            key={tp.id}
                                            className="p-4 border rounded-lg space-y-4 bg-slate-50 dark:bg-slate-900/50"
                                        >
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-semibold text-sm">Terceiro #{index + 1}</h4>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveThirdParty(tp.id)}
                                                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Nome do Terceiro</Label>
                                                    <Input
                                                        value={tp.name}
                                                        onChange={(e) =>
                                                            handleThirdPartyChange(tp.id, "name", e.target.value)
                                                        }
                                                        placeholder="Nome completo"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>CPF do Terceiro</Label>
                                                    <Input
                                                        value={tp.cpf}
                                                        onChange={(e) =>
                                                            handleThirdPartyChange(tp.id, "cpf", e.target.value)
                                                        }
                                                        placeholder="000.000.000-00"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Patrimônio do Terceiro</Label>
                                                <div className="flex gap-2">
                                                    <Button
                                                        type="button"
                                                        variant={tp.asset.type === "vehicle" ? "default" : "outline"}
                                                        size="sm"
                                                        onClick={() => handleAssetTypeChange(tp.id, "vehicle")}
                                                        className="flex-1"
                                                    >
                                                        <Car className="mr-2 h-4 w-4" />
                                                        Veículo
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant={tp.asset.type === "property" ? "default" : "outline"}
                                                        size="sm"
                                                        onClick={() => handleAssetTypeChange(tp.id, "property")}
                                                        className="flex-1"
                                                    >
                                                        <Building2 className="mr-2 h-4 w-4" />
                                                        Outros
                                                    </Button>
                                                </div>
                                            </div>

                                            {tp.asset.type === "vehicle" ? (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2 col-span-2">
                                                        <Label>Placa *</Label>
                                                        <Input
                                                            value={tp.asset.plate || ""}
                                                            onChange={(e) =>
                                                                handleThirdPartyChange(tp.id, "asset.plate", e.target.value)
                                                            }
                                                            placeholder="ABC-1234"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Marca</Label>
                                                        <Input
                                                            value={tp.asset.brand || ""}
                                                            onChange={(e) =>
                                                                handleThirdPartyChange(tp.id, "asset.brand", e.target.value)
                                                            }
                                                            placeholder="Ex: Toyota"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Modelo</Label>
                                                        <Input
                                                            value={tp.asset.model || ""}
                                                            onChange={(e) =>
                                                                handleThirdPartyChange(tp.id, "asset.model", e.target.value)
                                                            }
                                                            placeholder="Ex: Corolla"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Ano</Label>
                                                        <Input
                                                            type="number"
                                                            value={tp.asset.year || ""}
                                                            onChange={(e) =>
                                                                handleThirdPartyChange(
                                                                    tp.id,
                                                                    "asset.year",
                                                                    parseInt(e.target.value)
                                                                )
                                                            }
                                                            placeholder="2024"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Cor</Label>
                                                        <Input
                                                            value={tp.asset.color || ""}
                                                            onChange={(e) =>
                                                                handleThirdPartyChange(tp.id, "asset.color", e.target.value)
                                                            }
                                                            placeholder="Ex: Prata"
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <Label>Descrição *</Label>
                                                    <Textarea
                                                        value={tp.asset.description || ""}
                                                        onChange={(e) =>
                                                            handleThirdPartyChange(
                                                                tp.id,
                                                                "asset.description",
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder="Ex: Muro, portão, poste, etc."
                                                        rows={3}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleAddThirdParty}
                                        className="w-full"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Adicionar Terceiro
                                    </Button>
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Descrição */}
                        <div className="space-y-2">
                            <Label htmlFor="description">Descrição do Evento *</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Descreva detalhadamente o que aconteceu..."
                                rows={4}
                            />
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
                        disabled={
                            !selectedClient ||
                            !selectedVehicle ||
                            !driverName ||
                            !driverCpf ||
                            !date ||
                            !time ||
                            !description
                        }
                    >
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Sinistro
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}