import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Plus, LayoutGrid, List, Loader2, Search } from "lucide-react"
import { ClientCard } from "@/components/clients/client-card"
import { NewClientModal } from "@/components/clients/new-client-modal"
import { ClientDetails } from "@/components/clients/client-details"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { DataTableFilterConfig } from "@/components/ui/data-table-toolbar"
import { normalizeString } from "@/lib/utils"
import { useClients, type Client } from "@/hooks/data/useClients"
import { useVehicles } from "@/hooks/data/useVehicles"
import type { Vehicle } from "@/hooks/data/useVehicles" // Importando Vehicle do hook correto
import { Input } from "@/components/ui/input" // Importando Input

export default function Clientes() {
    const { clients, loading: clientsLoading, addClient, updateClient, fetchClients } = useClients()
    const { addVehicle, updateVehicle, deleteVehicle, loading: vehiclesLoading } = useVehicles()
    
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
    const [selectedClient, setSelectedClient] = useState<Client | null>(null)
    const [newClientModalOpen, setNewClientModalOpen] = useState(false)
    const [globalFilter, setGlobalFilter] = useState("") // Novo estado de busca global

    const loading = clientsLoading || vehiclesLoading;

    const filters: DataTableFilterConfig[] = [
        {
            columnId: "status",
            title: "Status",
            options: [
                { label: "Ativo", value: "active" },
                { label: "Inativo", value: "inactive" },
                { label: "Bloqueado", value: "blocked" },
            ],
        },
        {
            columnId: "clientType",
            title: "Tipo",
            options: [
                { label: "PF", value: "PF" },
                { label: "PJ", value: "PJ" },
            ],
        },
    ]

    const columns: ColumnDef<Client>[] = [
        {
            accessorKey: "name",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Nome / Razão Social" />
            ),
            cell: ({ row }) => {
                const client = row.original
                return (
                    <div className="flex flex-col">
                        <span>{client.name}</span>
                        {client.clientType === "PJ" && client.nomeFantasia && (
                            <span className="text-xs text-muted-foreground">{client.nomeFantasia}</span>
                        )}
                    </div>
                )
            },
            enableGlobalFilter: true,
            filterFn: (row, id, filterValue) => {
                const client = row.original
                const searchStr = `${client.name} ${client.nomeFantasia || ""} ${client.razaoSocial || ""}`
                return normalizeString(searchStr).includes(normalizeString(filterValue))
            },
        },
        {
            accessorKey: "clientType",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Tipo" />
            ),
            cell: ({ row }) => <Badge variant="outline">{row.getValue("clientType")}</Badge>,
            enableGlobalFilter: true,
            filterFn: (row, id, filterValue) => {
                return filterValue.includes(row.getValue(id))
            },
        },
        {
            accessorKey: "cpf_cnpj",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="CPF / CNPJ" />
            ),
            cell: ({ row }) => {
                const client = row.original
                return <span>{client.clientType === "PF" ? client.cpf : client.cnpj}</span>
            },
            enableGlobalFilter: true,
            filterFn: (row, id, filterValue) => {
                const value = row.original.clientType === "PF" ? row.original.cpf : row.original.cnpj
                return normalizeString(value || "").includes(normalizeString(filterValue))
            },
        },
        {
            accessorKey: "email",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Contato" />
            ),
            cell: ({ row }) => {
                const client = row.original
                return (
                    <div className="flex flex-col text-sm">
                        <span>{client.email}</span>
                        <span className="text-muted-foreground">{client.phone}</span>
                    </div>
                )
            },
            enableGlobalFilter: true,
            filterFn: (row, id, filterValue) => {
                const client = row.original
                const searchStr = `${client.email} ${client.phone}`
                return normalizeString(searchStr).includes(normalizeString(filterValue))
            },
        },
        {
            accessorKey: "status",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Status" />
            ),
            cell: ({ row }) => {
                const status = row.getValue("status") as string
                const statusLabel = status === "active" ? "Ativo" : status === "blocked" ? "Bloqueado" : "Inativo"
                return (
                    <Badge
                        variant={
                            status === "active" ? "default" :
                                status === "blocked" ? "destructive" : "secondary"
                        }
                    >
                        {statusLabel}
                    </Badge>
                )
            },
            enableGlobalFilter: true,
            filterFn: (row, id, filterValue) => {
                return filterValue.includes(row.getValue(id))
            },
        },
    ]

    const handleNewClient = async (newClientData: any) => {
        // Map NewClientModal data structure to Client type structure
        const clientToSave = {
            clientType: newClientData.clientType,
            name: newClientData.clientType === "PF" ? newClientData.name : newClientData.razaoSocial,
            email: newClientData.email,
            phone: newClientData.phone,
            address: newClientData.address,
            cpf: newClientData.cpf || undefined,
            cnpj: newClientData.cnpj || undefined,
            nomeFantasia: newClientData.nomeFantasia || undefined,
            razaoSocial: newClientData.razaoSocial || undefined,
            responsavel: newClientData.responsavel || undefined,
            contatoResponsavel: newClientData.contatoResponsavel || undefined,
        }

        const { data } = await addClient(clientToSave)
        if (data) {
            setSelectedClient(data)
        }
    }

    const handleStatusChange = async (clientId: string, newStatus: "active" | "inactive" | "blocked") => {
        const clientToUpdate = clients.find(c => c.id === clientId)
        if (clientToUpdate) {
            await updateClient({ ...clientToUpdate, status: newStatus })
        }
    }

    const handleUpdateClient = async (updatedClient: Client) => {
        await updateClient(updatedClient)
        setSelectedClient(updatedClient)
    }

    const handleSaveVehicle = async (vehicle: Vehicle) => {
        if (!selectedClient) return;

        const vehicleToSave = {
            ...vehicle,
            clientId: selectedClient.id,
        }

        if (vehicle.id) {
            await updateVehicle(vehicleToSave)
        } else {
            await addVehicle(vehicleToSave)
        }
        
        // 1. Re-fetch clients to update the vehicle list in the global state
        const updatedClients = await fetchClients()
        
        // 2. Find the updated client from the newly fetched global state
        if (updatedClients && selectedClient) {
            const updatedClient = updatedClients.find(c => c.id === selectedClient.id);
            if (updatedClient) {
                setSelectedClient(updatedClient);
            }
        }
    }

    const handleDeleteVehicle = async (vehicleId: string) => {
        if (!selectedClient) return;
        
        await deleteVehicle(vehicleId);
        
        // 1. Re-fetch clients to update the vehicle list in the global state
        const updatedClients = await fetchClients();
        
        // 2. Update selected client state locally to reflect changes immediately
        if (updatedClients && selectedClient) {
            const updatedClient = updatedClients.find(c => c.id === selectedClient.id);
            if (updatedClient) {
                setSelectedClient(updatedClient);
            }
        }
    }

    const filteredClientsForGrid = useMemo(() => {
        if (!globalFilter) return clients
        const filterLower = normalizeString(globalFilter)
        return clients.filter(client => {
            const searchFields = [
                client.name,
                client.cpf,
                client.cnpj,
                client.email,
                client.phone,
                client.nomeFantasia,
                client.razaoSocial,
                ...client.vehicles.map(v => v.plate),
                ...client.vehicles.map(v => v.model),
            ].filter(Boolean).join(" ")
            
            return normalizeString(searchFields).includes(filterLower)
        })
    }, [clients, globalFilter])


    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8" >
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Clientes</h2>
                <div className="flex items-center space-x-2">
                    <div className="relative w-full md:w-64 mr-2">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar cliente..."
                            value={globalFilter}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <div className="flex items-center border rounded-md bg-background mr-2">
                        <Button
                            variant={viewMode === "grid" ? "secondary" : "ghost"}
                            size="icon"
                            className="h-8 w-8 rounded-none rounded-l-md"
                            onClick={() => setViewMode("grid")}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === "list" ? "secondary" : "ghost"}
                            size="icon"
                            className="h-8 w-8 rounded-none rounded-r-md"
                            onClick={() => setViewMode("list")}
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button
                        className="group transition-all duration-300 hover:scale-105 hover:shadow-lg"
                        onClick={() => setNewClientModalOpen(true)}
                    >
                        <Plus className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" />
                        Novo Cliente
                    </Button>
                </div>
            </div>

            {selectedClient ? (
                <ClientDetails
                    client={selectedClient}
                    onBack={() => setSelectedClient(null)}
                    onStatusChange={handleStatusChange}
                    onSave={handleUpdateClient}
                    onSaveVehicle={handleSaveVehicle}
                    onDeleteVehicle={handleDeleteVehicle}
                />
            ) : (
                <>
                    {viewMode === "grid" ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredClientsForGrid.map((client, index) => (
                                <div
                                    key={client.id}
                                    style={{
                                        animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`
                                    }}
                                >
                                    <ClientCard
                                        {...client}
                                        onClick={() => setSelectedClient(client)}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <DataTable 
                            columns={columns} 
                            data={clients} 
                            filters={filters} 
                            onRowClick={setSelectedClient} 
                            globalFilter={globalFilter} // Passando o filtro global
                            setGlobalFilter={setGlobalFilter} // Permitindo que o DataTableToolbar gerencie o filtro
                        />
                    )}

                    {(viewMode === "grid" ? filteredClientsForGrid.length : clients.length) === 0 && (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">Nenhum cliente encontrado.</p>
                        </div>
                    )}
                </>
            )}

            <style>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>

            <NewClientModal
                open={newClientModalOpen}
                onOpenChange={setNewClientModalOpen}
                onSubmit={handleNewClient}
            />
        </div >
    )
}