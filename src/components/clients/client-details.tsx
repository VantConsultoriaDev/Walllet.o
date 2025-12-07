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

                <TabsContent value="frota" className="flex-1 mt-6 overflow-y-auto">
                    <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm min-h-[400px]">
                        <div className="flex items-center justify-between mb-6 shrink-0">
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

                        <div className="flex flex-col md:flex-row gap-4 mb-6 shrink-0">
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
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 overflow-y-auto">
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

                <TabsContent value="financeiro" className="flex-1 mt-6 overflow-y-auto">
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
                onDelete={handleDeleteVehicle} // <-- Passando a função de exclusão
                vehicleToEdit={editingVehicle}
                clientId={client.id}
            />
        </div>
    )
}