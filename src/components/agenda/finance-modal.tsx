import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import type { Boleto } from "@/types/agenda"
import { FileText, ExternalLink } from "lucide-react"
import { useNavigate } from "react-router-dom"

interface FinanceModalProps {
    isOpen: boolean
    onClose: () => void
    date: Date
    boletos: Boleto[]
}

export function FinanceModal({ isOpen, onClose, date, boletos }: FinanceModalProps) {
    const navigate = useNavigate()

    const handleBoletoClick = () => {
        // In a real app, this would navigate to the specific client's finance tab
        navigate(`/clientes`)
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <DialogHeader>
                    <DialogTitle>Financeiro - {date.toLocaleDateString()}</DialogTitle>
                    <DialogDescription>
                        Boletos com vencimento nesta data.
                    </DialogDescription>
                </DialogHeader>

                {boletos.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                        Nenhum boleto vencendo nesta data.
                    </div>
                ) : (
                    <Accordion type="single" collapsible className="w-full">
                        {boletos.map((boleto) => (
                            <AccordionItem key={boleto.id} value={boleto.id}>
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center justify-between w-full pr-4">
                                        <div className="flex items-center gap-2 text-left">
                                            <FileText className="h-4 w-4 text-blue-500" />
                                            <span>{boleto.clientName}</span>
                                        </div>
                                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                                            {boleto.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="flex flex-col gap-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-md">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium">{boleto.title}</span>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full mt-2 gap-2"
                                            onClick={handleBoletoClick}
                                        >
                                            <ExternalLink className="h-3 w-3" />
                                            Ver Cadastro do Cliente
                                        </Button>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </DialogContent>
        </Dialog>
    )
}