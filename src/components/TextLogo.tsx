import { cn } from "@/lib/utils"

interface TextLogoProps {
    className?: string
    variant?: 'full' | 'icon' // Mantendo a variante para compatibilidade de tamanho, mas renderizando apenas texto
}

export function TextLogo({ className, variant = 'full' }: TextLogoProps) {
    const baseClasses = "font-heading font-bold tracking-tight transition-colors duration-300"
    
    // Ajuste de tamanho baseado na variante
    const sizeClasses = variant === 'full' ? "text-2xl md:text-3xl" : "text-xl"

    return (
        <div className={cn("flex items-baseline", className)}>
            <span className={cn(baseClasses, sizeClasses, "text-foreground dark:text-white")}>
                wallet
            </span>
            <span className={cn(baseClasses, sizeClasses, "text-primary")}>
                .o
            </span>
        </div>
    )
}