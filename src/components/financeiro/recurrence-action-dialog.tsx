import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type RecurrenceActionDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    onAction: (scope: "this" | "all") => void
    actionType: "edit" | "delete"
}

export function RecurrenceActionDialog({ open, onOpenChange, onAction, actionType }: RecurrenceActionDialogProps) {
    const title = actionType === "edit" ? "Editar recorrência" : "Excluir recorrência"
    const description = actionType === "edit"
        ? "Esta é uma transação recorrente. Você deseja aplicar as alterações apenas a esta ocorrência ou a todas as futuras?"
        : "Esta é uma transação recorrente. Você deseja excluir apenas esta ocorrência ou todas as futuras?"

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel onClick={() => onOpenChange(false)}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onAction("this")}>
                        Apenas esta
                    </AlertDialogAction>
                    <AlertDialogAction onClick={() => onAction("all")}>
                        Todas as ocorrências
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
