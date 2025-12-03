import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Car, Truck, Bike } from "lucide-react"
import type { Vehicle, VehicleType } from "./new-vehicle-modal"

type VehicleCardProps = Vehicle & {
    onClick?: () => void
}

export function VehicleCard({ type, plate, brand, model, year, status, onClick }: VehicleCardProps) {
    const getIcon = (type: VehicleType) => {
        switch (type) {
            case "MOTO": return <Bike className="h-6 w-6" />
            case "CARRO": return <Car className="h-6 w-6" />
            default: return <Truck className="h-6 w-6" />
        }
    }

    const statusVariant =
        status === "active" ? "default" :
            status === "maintenance" ? "secondary" :
                "destructive"

    const statusLabel =
        status === "active" ? "Ativo" :
            status === "maintenance" ? "Manutenção" :
                "Inativo"

    return (
        <Card
            className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-l-4 border-l-primary"
            onClick={onClick}
        >
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            {getIcon(type)}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">{plate}</h3>
                            <p className="text-sm text-muted-foreground">{brand} {model}</p>
                        </div>
                    </div>
                    <Badge variant={statusVariant}>{statusLabel}</Badge>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                    <span>{type}</span>
                    <span>{year}</span>
                </div>
            </CardContent>
        </Card>
    )
}
