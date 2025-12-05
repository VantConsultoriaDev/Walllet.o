import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Sidebar } from "./Sidebar"

export function MobileSidebar() {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-10 w-10 shrink-0"
                >
                    <Menu className="h-6 w-6" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px] border-r-0">
                {/* 
                    A Sidebar original é renderizada aqui. 
                    Ajustamos a altura para garantir que o conteúdo se encaixe.
                */}
                <Sidebar className="h-full border-r-0" />
            </SheetContent>
        </Sheet>
    )
}