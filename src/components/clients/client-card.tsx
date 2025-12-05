import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Building2, User, Phone, Mail, MapPin, Car } from "lucide-react"
import type { Client } from "@/hooks/data/useClients"

type ClientCardProps = Client & {
    onClick: () => void
}

export function ClientCard({
    clientType,
    name,
    email,
    phone,
    status,
    cpf,
    cnpj,
    address,
    vehicles,
    razaoSocial, // Adicionado para PJ
    nomeFantasia, // Adicionado para PJ
    onClick
}: ClientCardProps) {
    const statusVariant =
        status === "active" ? "default" :
            status === "blocked" ? "destructive" :
                "secondary"

    const statusLabel =
        status === "active" ? "Ativo" :
            status === "blocked" ? "Bloqueado" :
                "Inativo"
    
    // Determina o nome principal a ser exibido
    const primaryName = clientType === "PJ" 
        ? nomeFantasia || razaoSocial || name // Prioriza Nome Fantasia, depois Razão Social, depois o campo 'name'
        : name

    // Determina o identificador secundário
    const secondaryIdentifier = clientType === "PJ" ? cnpj : cpf

    return (
        <Card
            className="group cursor-pointer border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:border-primary/50 min-h-[220px]"
            onClick={onClick}
        >
            <CardContent className="p-6 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            {clientType === "PJ" ? (
                                <Building2 className="h-6 w-6 text-primary" />
                            ) : (
                                <User className="h-6 w-6 text-primary" />
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-2">
                                {primaryName}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {secondaryIdentifier}
                            </p>
                        </div>
                    </div>
                    <Badge variant={statusVariant} className="shadow-sm">
                        {statusLabel}
                    </Badge>
                </div>

                {/* Contact Info */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">{address}</span>
                    </div>
                </div>

                {/* Vehicles */}
                {vehicles.length > 0 && (
                    <div className="pt-3 border-t border-border/50">
                        <div className="flex items-center gap-2 text-sm">
                            <Car className="h-4 w-4" />
                            <span className="font-medium text-muted-foreground">
                                {vehicles.length} {vehicles.length === 1 ? "veículo" : "veículos"}
                            </span>
                            <span className="text-muted-foreground/60">•</span>
                            <span className="text-muted-foreground/80 truncate">
                                {vehicles[0].plate}
                                {vehicles.length > 1 && ` +${vehicles.length - 1}`}
                            </span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}