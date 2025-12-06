import { Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export function AppLoadingPlaceholder() {
    return (
        <div className="flex-1 space-y-6 p-4 pt-6 md:p-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="h-8 w-48 bg-muted rounded animate-pulse" />
                <div className="h-10 w-32 bg-primary/10 rounded-lg animate-pulse" />
            </div>
            <Separator />
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="shadow-sm h-32">
                        <CardContent className="p-4 space-y-3">
                            <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
                            <div className="h-8 w-3/4 bg-muted rounded animate-pulse" />
                            <div className="h-3 w-1/3 bg-muted rounded animate-pulse" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="h-[400px] shadow-sm flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </Card>
        </div>
    )
}