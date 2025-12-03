import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
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
import { Building2, User, Phone, Mail, MapPin, Car, FileText, Pencil, Save, X, Plus, Trash2 } from "lucide-react"
import { ClientFinanceiro } from "./client-financeiro"
import type { Vehicle } from "@/components/frota/new-vehicle-modal"
import type { Client } from "@/hooks/data/useClients" // Import Client type from hook

type ClientDetailsModalProps = {
    client: Client | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onViewFleet?: (client: Client) => void
    onStatusChange?: (clientId: string, newStatus: "active" | "inactive" | "pending") => void
    onSave?: (updatedClient: Client) => void
}

export function ClientDetailsModal({ client, open, onOpenChange, onViewFleet, onStatusChange, onSave }: ClientDetailsModalProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editedClient, setEditedClient] = useState<Client | null>(null)
    const [newVehicle, setNewVehicle] = useState<Vehicle>({ plate: "", model: "", year: new Date().getFullYear() } as Vehicle)
    const [isAddingVehicle, setIsAddingVehicle] = useState(false)
    const [activeTab, setActiveTab] = useState("dados")

    useEffect(() => {
        if (client) {
            setEditedClient(client)
        }
    }, [client])

    useEffect(() => {
        if (!open) {
            setIsEditing(false)
            setIsAddingVehicle(false)
            setActiveTab("dados")
        }
    }, [open])

    if (!client || !editedClient) return null

    const handleSave = () => {
        if (onSave && editedClient) {
            onSave(editedClient)
            setIsEditing(false)
        }
    }

    const handleCancel = () => {
        setEditedClient(client)
        setIsEditing(false)
        setIsAddingVehicle(false)
    }

    const handleAddVehicle = () => {
        if (newVehicle.plate && newVehicle.model) {
            setEditedClient({
                ...editedClient,
                vehicles: [...editedClient.vehicles, newVehicle]
            })
            setNewVehicle({ plate: "", model: "", year: new Date().getFullYear() } as Vehicle)
            setIsAddingVehicle(false)
        }
    }

    const handleRemoveVehicle = (index: number) => {
        const updatedVehicles = [...editedClient.vehicles]
        updatedVehicles.splice(index, 1)
        setEditedClient({
            ...editedClient,
            vehicles: updatedVehicles
        })
    }

    const statusVariant =
        client.status === "active" ? "default" :
            client.status === "pending" ? "secondary" :
                "destructive"

    const statusLabel =
        client.status === "active" ? "Ativo" :
            client.status === "pending" ? "Pendente" :
                "Inativo"

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                {client.clientType === "PJ" ? (
                                    <Building2 className="h-6 w-6 text-primary" />
                                ) : (
                                    <User className="h-6 w-6 text-primary" />
                                )}
                            </div>
                            <div>
                                <DialogTitle className="text-2xl flex items-center gap-2">
                                    {isEditing ? (
                                        <Input
                                            value={editedClient.name}
                                            onChange={(e) => setEditedClient({ ...editedClient, name: e.target.value })}
                                            className="h-8 text-lg font-bold"
                                        />
                                    ) : (
                                        client.name
                                    )}
                                </DialogTitle>
                                <DialogDescription>
                                    {client.clientType === "PJ" ? "Pessoa Jurídica" : "Pessoa Física"}
                                </DialogDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {!isEditing && onStatusChange && (
                                <Select
                                    value={client.status}
                                    onValueChange={(value) => onStatusChange(client.id, value as "active" | "inactive" | "pending")}
                                >
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Ativo</SelectItem>
                                        <SelectItem value="inactive">Inativo</SelectItem>
                                        <SelectItem value="pending">Bloqueado</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                            {!isEditing && !onStatusChange && (
                                <Badge variant={statusVariant} className="shadow-sm">
                                    {statusLabel}
                                </Badge>
                            )}

                            {!isEditing && onSave && (
                                <Button variant="outline" size="icon" onClick={() => setIsEditing(true)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="dados">Dados Cadastrais</TabsTrigger>
                        <TabsTrigger value="frota">Frota</TabsTrigger>
                        <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                    </TabsList>

                    <TabsContent value="dados" className="space-y-6 mt-4">
                        {/* Identification Section */}
                        <div>
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                                Identificação
                            </h3>
                            <div className="grid gap-3">
                                {client.clientType === "PF" ? (
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        <div className="flex-1">
                                            <p className="text-sm text-muted-foreground">CPF</p>
                                            {isEditing ? (
                                                <Input
                                                    value={editedClient.cpf}
                                                    onChange={(e) => setEditedClient({ ...editedClient, cpf: e.target.value })}
                                                    className="h-7 mt-1"
                                                />
                                            ) : (
                                                <p className="font-medium">{client.cpf}</p>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                            <div className="flex-1">
                                                <p className="text-sm text-muted-foreground">CNPJ</p>
                                                {isEditing ? (
                                                    <Input
                                                        value={editedClient.cnpj}
                                                        onChange={(e) => setEditedClient({ ...editedClient, cnpj: e.target.value })}
                                                        className="h-7 mt-1"
                                                    />
                                                ) : (
                                                    <p className="font-medium">{client.cnpj}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3 rounded-lg bg-muted/50">
                                                <p className="text-sm text-muted-foreground">Nome Fantasia</p>
                                                {isEditing ? (
                                                    <Input
                                                        value={editedClient.nomeFantasia}
                                                        onChange={(e) => setEditedClient({ ...editedClient, nomeFantasia: e.target.value })}
                                                        className="h-7 mt-1"
                                                    />
                                                ) : (
                                                    <p className="font-medium">{client.nomeFantasia || "-"}</p>
                                                )}
                                            </div>
                                            <div className="p-3 rounded-lg bg-muted/50">
                                                <p className="text-sm text-muted-foreground">Razão Social</p>
                                                {isEditing ? (
                                                    <Input
                                                        value={editedClient.razaoSocial}
                                                        onChange={(e) => setEditedClient({ ...editedClient, razaoSocial: e.target.value })}
                                                        className="h-7 mt-1"
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

                        <Separator />

                        {/* Contact Section */}
                        <div>
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                                Contato
                            </h3>
                            <div className="grid gap-3">
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <div className="flex-1">
                                        <p className="text-sm text-muted-foreground">Email</p>
                                        {isEditing ? (
                                            <Input
                                                value={editedClient.email}
                                                onChange={(e) => setEditedClient({ ...editedClient, email: e.target.value })}
                                                className="h-7 mt-1"
                                            />
                                        ) : (
                                            <p className="font-medium">{client.email}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <div className="flex-1">
                                        <p className="text-sm text-muted-foreground">Telefone</p>
                                        {isEditing ? (
                                            <Input
                                                value={editedClient.phone}
                                                onChange={(e) => setEditedClient({ ...editedClient, phone: e.target.value })}
                                                className="h-7 mt-1"
                                            />
                                        ) : (
                                            <p className="font-medium">{client.phone}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <div className="flex-1">
                                        <p className="text-sm text-muted-foreground">Endereço</p>
                                        {isEditing ? (
                                            <Input
                                                value={editedClient.address}
                                                onChange={(e) => setEditedClient({ ...editedClient, address: e.target.value })}
                                                className="h-7 mt-1"
                                            />
                                        ) : (
                                            <p className="font-medium">{client.address}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Responsible Person (PJ only) */}
                        {client.clientType === "PJ" && (
                            <>
                                <Separator />
                                <div>
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                                        Responsável
                                    </h3>
                                    <div className="grid gap-3">
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                            <div className="flex-1">
                                                <p className="text-sm text-muted-foreground">Nome</p>
                                                {isEditing ? (
                                                    <Input
                                                        value={editedClient.responsavel || ""}
                                                        onChange={(e) => setEditedClient({ ...editedClient, responsavel: e.target.value })}
                                                        className="h-7 mt-1"
                                                    />
                                                ) : (
                                                    <p className="font-medium">{client.responsavel || "-"}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                            <Phone className="h-4 w-4 text-muted-foreground" />
                                            <div className="flex-1">
                                                <p className="text-sm text-muted-foreground">Contato</p>
                                                {isEditing ? (
                                                    <Input
                                                        value={editedClient.contatoResponsavel || ""}
                                                        onChange={(e) => setEditedClient({ ...editedClient, contatoResponsavel: e.target.value })}
                                                        className="h-7 mt-1"
                                                    />
                                                ) : (
                                                    <p className="font-medium">{client.contatoResponsavel || "-"}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </TabsContent>

                    <TabsContent value="frota" className="space-y-6 mt-4">
                        {/* Fleet Section */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                    Frota ({editedClient.vehicles.length})
                                </h3>
                                {isEditing ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsAddingVehicle(true)}
                                        className="gap-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Adicionar Veículo
                                    </Button>
                                ) : (
                                    client.vehicles.length > 0 && onViewFleet && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onViewFleet(client)}
                                        >
                                            <Car className="mr-2 h-4 w-4" />
                                            Ver Frota Completa
                                        </Button>
                                    )
                                )}
                            </div>

                            {/* Add Vehicle Form */}
                            {isAddingVehicle && (
                                <div className="p-4 border rounded-lg bg-muted/30 mb-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label>Placa</Label>
                                            <Input
                                                value={newVehicle.plate}
                                                onChange={(e) => setNewVehicle({ ...newVehicle, plate: e.target.value.toUpperCase() })}
                                                placeholder="ABC-1234"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Modelo</Label>
                                            <Input
                                                value={newVehicle.model}
                                                onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                                                placeholder="Ex: Honda Civic"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Ano</Label>
                                            <Input
                                                type="number"
                                                value={newVehicle.year}
                                                onChange={(e) => setNewVehicle({ ...newVehicle, year: parseInt(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="sm" onClick={() => setIsAddingVehicle(false)}>Cancelar</Button>
                                        <Button size="sm" onClick={handleAddVehicle}>Adicionar</Button>
                                    </div>
                                </div>
                            )}

                            {editedClient.vehicles.length > 0 ? (
                                <div className="grid gap-2">
                                    {(isEditing ? editedClient.vehicles : client.vehicles.slice(0, 3)).map((vehicle, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                                        >
                                            <Car className="h-4 w-4 text-muted-foreground" />
                                            <div className="flex-1">
                                                <p className="font-medium">{vehicle.plate}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {vehicle.model} • {vehicle.year}
                                                </p>
                                            </div>
                                            {isEditing && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive/90"
                                                    onClick={() => handleRemoveVehicle(index)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                    {!isEditing && client.vehicles.length > 3 && (
                                        <p className="text-sm text-muted-foreground text-center py-2">
                                            + {client.vehicles.length - 3} veículos adicionais
                                        </p>
                                    )}
                                </div>
                            ) : (
                                !isAddingVehicle && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Car className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                        <p className="text-sm">Nenhum veículo cadastrado</p>
                                    </div>
                                )
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="financeiro" className="mt-4">
                        <ClientFinanceiro client={client} vehicles={client.vehicles} />
                    </TabsContent>
                </Tabs>

                <DialogFooter className="mt-6">
                    {isEditing ? (
                        <div className="flex justify-end gap-2 w-full">
                            <Button variant="outline" onClick={handleCancel}>
                                <X className="mr-2 h-4 w-4" />
                                Cancelar
                            </Button>
                            <Button onClick={handleSave}>
                                <Save className="mr-2 h-4 w-4" />
                                Salvar Alterações
                            </Button>
                        </div>
                    ) : (
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Fechar
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}