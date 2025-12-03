import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, LayoutGrid, List } from "lucide-react"
import { ClientCard } from "@/components/clients/client-card"
import { NewClientModal } from "@/components/clients/new-client-modal"
import { ClientDetails } from "@/components/clients/client-details"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { DataTableFilterConfig } from "@/components/ui/data-table-toolbar"
import { normalizeString } from "@/lib/utils"

import type { Vehicle } from "@/components/frota/new-vehicle-modal"

type Client = {
    id: string
    clientType: "PF" | "PJ"
    name: string
    email: string
    phone: string
    status: "active" | "inactive" | "blocked"

    // PF fields
    cpf?: string

    // PJ fields
    cnpj?: string
    nomeFantasia?: string
    razaoSocial?: string
    responsavel?: string
    contatoResponsavel?: string

    // Common fields
    address: string
    vehicles: Vehicle[]
}

const mockClients: Client[] = [
    {
        id: "1",
        clientType: "PF",
        name: "João Silva",
        cpf: "123.456.789-00",
        email: "joao@email.com",
        phone: "(11) 99999-9999",
        status: "active",
        address: "Rua das Flores, 123 - São Paulo, SP",
        vehicles: [
            { id: "v1", type: "CARRO", plate: "ABC-1234", brand: "Honda", model: "Civic", year: 2022, status: "active" },
            { id: "v2", type: "CARRO", plate: "DEF-5678", brand: "Toyota", model: "Corolla", year: 2021, status: "active" }
        ]
    },
    {
        id: "2",
        clientType: "PJ",
        name: "Tech Solutions Ltda",
        cnpj: "12.345.678/0001-90",
        nomeFantasia: "Tech Solutions",
        razaoSocial: "Tech Solutions Tecnologia Ltda",
        email: "contato@techsolutions.com",
        phone: "(11) 98888-8888",
        responsavel: "Maria Oliveira",
        contatoResponsavel: "(11) 97777-7777",
        status: "blocked",
        address: "Av. Paulista, 1000 - São Paulo, SP",
        vehicles: [
            { id: "v3", type: "TRUCK", plate: "GHI-9012", brand: "Fiat", model: "Toro", year: 2023, status: "active" },
            { id: "v4", type: "TRUCK", plate: "JKL-3456", brand: "VW", model: "Amarok", year: 2022, status: "active" },
            { id: "v5", type: "TRUCK", plate: "MNO-7890", brand: "Chevrolet", model: "S10", year: 2021, status: "active" }
        ]
    },
    {
        id: "3",
        clientType: "PF",
        name: "Carlos Santos",
        cpf: "987.654.321-00",
        email: "carlos@email.com",
        phone: "(11) 97777-7777",
        status: "inactive",
        address: "Rua dos Pinheiros, 456 - São Paulo, SP",
        vehicles: [
            { id: "v6", type: "CARRO", plate: "PQR-1122", brand: "Ford", model: "Ka", year: 2020, status: "active" }
        ]
    },
    {
        id: "4",
        clientType: "PJ",
        name: "Logística Express S.A.",
        cnpj: "98.765.432/0001-10",
        nomeFantasia: "Logística Express",
        razaoSocial: "Logística Express Transportes S.A.",
        email: "contato@logisticaexpress.com",
        phone: "(11) 95555-5555",
        contatoResponsavel: "(11) 95555-5555",
        status: "active",
        address: "Rodovia dos Bandeirantes, Km 25 - Barueri, SP",
        vehicles: [
            { id: "v7", type: "TRUCK", plate: "STU-3344", brand: "Mercedes", model: "Sprinter", year: 2023, status: "active" },
            { id: "v8", type: "TRUCK", plate: "VWX-5566", brand: "Iveco", model: "Daily", year: 2022, status: "active" }
        ]
    }
]

export default function Clientes() {
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
    const [selectedClient, setSelectedClient] = useState<Client | null>(null)
    const [newClientModalOpen, setNewClientModalOpen] = useState(false)
    const [clients, setClients] = useState<Client[]>(mockClients)

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

    const handleNewClient = (newClient: Client) => {
        setClients(prev => [...prev, newClient])
    }

    const handleStatusChange = (clientId: string, newStatus: "active" | "inactive" | "blocked") => {
        setClients(prev => prev.map(client =>
            client.id === clientId ? { ...client, status: newStatus } : client
        ))
    }

    const handleUpdateClient = (updatedClient: Client) => {
        setClients(prev => prev.map(client =>
            client.id === updatedClient.id ? updatedClient : client
        ))
        setSelectedClient(updatedClient)
    }

    return (
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8" >
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Clientes</h2>
                <div className="flex items-center space-x-2">
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
                />
            ) : (
                <>
                    {viewMode === "grid" ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {clients.map((client, index) => (
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
                        <DataTable columns={columns} data={clients} filters={filters} onRowClick={setSelectedClient} />
                    )}

                    {clients.length === 0 && (
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
