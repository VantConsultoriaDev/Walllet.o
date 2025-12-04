import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, User, Phone, FileText, Pencil, Save, X, Plus, Trash2, ArrowLeft, Car, Truck, Search, Filter, DollarSign } from "lucide-react"
import { VehicleCard } from "@/components/frota/vehicle-card"
import { ClientFinanceiro } from "./client-financeiro"
import { NewVehicleModal } from "@/components/frota/NewVehicleModal" // <-- Importando o novo modal
import type { Client } from "@/hooks/data/useClients" // Import Client type from hook
import type { Vehicle, VehicleType } from "@/hooks/data/useVehicles" // Import Vehicle types from hook

type ClientDetailsProps = {
    client: Client
    onBack: () => void
    onStatusChange?: (clientId: string, newStatus: "active" | "inactive" | "blocked") => void
    onSave?: (updatedClient: Client) => void
    onSaveVehicle: (vehicle: Vehicle) => Promise<void>
    onDeleteVehicle: (vehicleId: string) => Promise<void>
}

export function ClientDetails({ client, onBack, onStatusChange, onSave, onSaveVehicle, onDeleteVehicle }: ClientDetailsProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editedClient, setEditedClient] = useState<Client>(client)
    const [isAddingVehicle, setIsAddingVehicle] = useState(false)
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | undefined>(undefined)
    const [searchTerm, setSearchTerm] = useState("")
    const [typeFilter, setTypeFilter] = useState<string>("ALL")

    useEffect(() => {
        setEditedClient(client)
    }, [client])

    const filteredVehicles = editedClient.vehicles.filter(vehicle => {
        const matchesSearch =
            (vehicle.plate?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (vehicle.brand?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (vehicle.model?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (vehicle.year?.toString() || "").includes(searchTerm) ||
            (vehicle.renavam?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (vehicle.chassi?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (vehicle.color?.toLowerCase() || "").includes(searchTerm.toLowerCase()) // <-- Incluindo busca por cor

        const matchesType = typeFilter === "ALL" || vehicle.type === typeFilter

        return matchesSearch && matchesType
    })

    const handleSave = () => {
        if (onSave) {
            onSave(editedClient)
            setIsEditing(false)
        }
    }

    const handleCancel = () => {
        setEditedClient(client)
        setIsEditing(false)
        setIsAddingVehicle(false)
        setEditingVehicle(undefined)
    }

    const handleOpenVehicleModal = (vehicle?: Vehicle) => {
        setEditingVehicle(vehicle)
        setIsAddingVehicle(true)
    }

    const handleSaveVehicle = async (vehicle: Vehicle) => {
        // Ensure clientId is set before saving
        const vehicleWithClient = { ...vehicle, clientId: client.id }
        await onSaveVehicle(vehicleWithClient)
        setEditingVehicle(undefined)
        setIsAddingVehicle(false)
    }

    const handleRemoveVehicle = async (vehicleId: string) => {
        if (window.confirm("Tem certeza que deseja excluir este veículo?")) {
            await onDeleteVehicle(vehicleId)
        }
    }

    const statusVariant =
        client.status === "active" ? "default" :
            client.status === "blocked" ? "destructive" :
                "secondary"

    const statusLabel =
        client.status === "active" ? "Ativo" :
            client.status === "blocked" ? "Bloqueado" :
                "Inativo"

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack} className="h-10 w-10 rounded-full">
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                            {client.clientType === "PJ" ? (
                                <Building2 className="h-7 w-7 text-primary" />
                            ) : (
                                <User className="h-7 w-7 text-primary" />
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                {isEditing ? (
                                    <Input
                                        value={editedClient.name}
                                        onChange={(e) => setEditedClient({ ...editedClient, name: e.target.value })}
                                        className="h-9 text-xl font-bold w-[300px]"
                                    />
                                ) : (
                                    <h2 className="text-2xl font-bold tracking-tight">{client.name}</h2>
                                )}
                            </div>
                            <p className="text-muted-foreground">
                                {client.clientType === "PJ" ? "Pessoa Jurídica" : "Pessoa Física"}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {!isEditing && onStatusChange && (
                        <Select
                            value={client.status}
                            onValueChange={(value) => onStatusChange(client.id, value as "active" | "inactive" | "blocked")}
                        >
                            <SelectTrigger className="w-[140px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Ativo</SelectItem>
                                <SelectItem value="inactive">Inativo</SelectItem>
                                <SelectItem value="blocked">Bloqueado</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                    {!isEditing && !onStatusChange && (
                        <Badge variant={statusVariant} className="text-sm px-3 py-1">
                            {statusLabel}
                        </Badge>
                    )}

                    {!isEditing && onSave && (
                        <Button onClick={() => setIsEditing(true)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar Cliente
                        </Button>
                    )}
                    {isEditing && (
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleCancel}>
                                <X className="mr-2 h-4 w-4" />
                                Cancelar
                            </Button>
                            <Button onClick={handleSave}>
                                <Save className="mr-2 h-4 w-4" />
                                Salvar Alterações
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <Separator />

            <Tabs defaultValue="geral" className="flex-1 flex flex-col">
                <TabsList className="w-full justify-start h-12 bg-muted/20 p-1">
                    <TabsTrigger value="geral" className="data-[state=active]:bg-background px-6">
                        <User className="mr-2 h-4 w-4" />
                        Dados Gerais
                    </TabsTrigger>
                    <TabsTrigger value="frota" className="data-[state=active]:bg-background px-6">
                        <Truck className="mr-2 h-4 w-4" />
                        Frota ({client.vehicles.length})
                    </TabsTrigger>
                    <TabsTrigger value="financeiro" className="data-[state=active]:bg-background px-6">
                        <DollarSign className="mr-2 h-4 w-4" />
                        Financeiro
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="geral" className="flex-1 mt-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Left Column: Identification & Contact */}
                        <div className="space-y-6">
                            {/* Identification Section */}
                            <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                                    <FileText className="h-4 w-4" /> Identificação
                                </h3>
                                <div className="grid gap-4">
                                    {client.clientType === "PF" ? (
                                        <div className="space-y-1">
                                            <Label className="text-muted-foreground">CPF</Label>
                                            {isEditing ? (
                                                <Input
                                                    value={editedClient.cpf}
                                                    onChange={(e) => setEditedClient({ ...editedClient, cpf: e.target.value })}
                                                />
                                            ) : (
                                                <p className="font-medium text-lg">{client.cpf}</p>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-1">
                                                <Label className="text-muted-foreground">CNPJ</Label>
                                                {isEditing ? (
                                                    <Input
                                                        value={editedClient.cnpj}
                                                        onChange={(e) => setEditedClient({ ...editedClient, cnpj: e.target.value })}
                                                    />
                                                ) : (
                                                    <p className="font-medium text-lg">{client.cnpj}</p>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <Label className="text-muted-foreground">Nome Fantasia</Label>
                                                    {isEditing ? (
                                                        <Input
                                                            value={editedClient.nomeFantasia}
                                                            onChange={(e) => setEditedClient({ ...editedClient, nomeFantasia: e.target.value })}
                                                        />
                                                    ) : (
                                                        <p className="font-medium">{client.nomeFantasia || "-"}</p>
                                                    )}
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-muted-foreground">Razão Social</Label>
                                                    {isEditing ? (
                                                        <Input
                                                            value={editedClient.razaoSocial}
                                                            onChange={(e) => setEditedClient({ ...editedClient, razaoSocial: e.target.value })}
                                                        />
                                                    ) : (
                                                        <p className="font-medium">{client.razaoSocial || "-"}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Contact Section */}
                            <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                                    <Phone className="h-4 w-4" /> Contato
                                </h3>
                                <div className="grid gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground">Email</Label>
                                        {isEditing ? (
                                            <Input
                                                value={editedClient.email}
                                                onChange={(e) => setEditedClient({ ...editedClient, email: e.target.value })}
                                            />
                                        ) : (
                                            <p className="font-medium text-lg">{client.email}</p>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground">Telefone</Label>
                                        {isEditing ? (
                                            <Input
                                                value={editedClient.phone}
                                                onChange={(e) => setEditedClient({ ...editedClient, phone: e.target.value })}
                                            />
                                        ) : (
                                            <p className="font-medium text-lg">{client.phone}</p>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground">Endereço</Label>
                                        {isEditing ? (
                                            <Input
                                                value={editedClient.address}
                                                onChange={(e) => setEditedClient({ ...editedClient, address: e.target.value })}
                                            />
                                        ) : (
                                            <p className="font-medium text-lg">{client.address}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Responsible (PJ only) */}
                        <div className="space-y-6">
                            {client.clientType === "PJ" && (
                                <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                                        <User className="h-4 w-4" /> Responsável
                                    </h3>
                                    <div className="grid gap-4">
                                        <div className="space-y-1">
                                            <Label className="text-muted-foreground">Nome</Label>
                                            {isEditing ? (
                                                <Input
                                                    value={editedClient.responsavel || ""}
                                                    onChange={(e) => setEditedClient({ ...editedClient, responsavel: e.target.value })}
                                                />
                                            ) : (
                                                <p className="font-medium text-lg">{client.responsavel || "-"}</p>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-muted-foreground">Contato</Label>
                                            {isEditing ? (
                                                <Input
                                                    value={editedClient.contatoResponsavel || ""}
                                                    onChange={(e) => setEditedClient({ ...editedClient, contatoResponsavel: e.target.value })}
                                                />
                                            ) : (
                                                <p className="font-medium text-lg">{client.contatoResponsavel || "-"}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="frota" className="flex-1 mt-6">
                    <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm min-h-[400px]">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    Veículos Cadastrados
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Gerencie a frota deste cliente
                                </p>
                            </div>
                            <Button
                                onClick={() => handleOpenVehicleModal(undefined)}
                                className="gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Adicionar Veículo
                            </Button>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 mb-6">
                            <div className="relative flex-1">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por placa, modelo, marca, chassi, cor..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger className="w-full md:w-[200px]">
                                    <Filter className="mr-2 h-4 w-4" />
                                    <SelectValue placeholder="Tipo de Veículo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todos</SelectItem>
                                    <SelectItem value="CARRO">Carros</SelectItem>
                                    <SelectItem value="MOTO">Motos</SelectItem>
                                    <SelectItem value="TRUCK">Caminhões</SelectItem>
                                    <SelectItem value="CAVALO">Cavalos</SelectItem>
                                    <SelectItem value="CARRETA">Carretas</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {filteredVehicles.length > 0 ? (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {filteredVehicles.map((vehicle, index) => (
                                    <div key={vehicle.id} className="relative group">
                                        <VehicleCard
                                            {...vehicle}
                                            onClick={() => handleOpenVehicleModal(vehicle)}
                                        />
                                        {isEditing && (
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleRemoveVehicle(vehicle.id)
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
                                <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                                    <Car className="h-8 w-8 opacity-50" />
                                </div>
                                <h4 className="text-lg font-medium mb-1">Nenhum veículo cadastrado</h4>
                                <p className="text-sm max-w-sm text-center mb-6">
                                    Este cliente ainda não possui veículos vinculados.
                                    Clique em 'Adicionar Veículo' para começar.
                                </p>
                                <Button onClick={() => handleOpenVehicleModal(undefined)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Adicionar Veículo
                                </Button>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="financeiro" className="flex-1 mt-6">
                    <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm min-h-[400px]">
                        <ClientFinanceiro client={client} vehicles={client.vehicles} />
                    </div>
                </TabsContent>
            </Tabs>

            {/* New Vehicle Modal */}
            <NewVehicleModal
                open={isAddingVehicle}
                onOpenChange={setIsAddingVehicle}
                onSubmit={handleSaveVehicle}
                vehicleToEdit={editingVehicle}
                clientId={client.id}
            />
        </div>
    )
}