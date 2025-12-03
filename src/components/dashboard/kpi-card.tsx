import type { LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { motion, useMotionValue, useTransform } from "framer-motion"

interface KpiCardProps {
    title: string
    value: string
    description: string
    icon: LucideIcon
    trend: "up" | "down" | "neutral"
    trendValue: string
    gradient?: string
    index?: number
    totalValue?: string
    totalLabel?: string
}

export function KpiCard({
    title,
    value,
    description,
    icon: Icon,
    trend,
    trendValue,
    gradient = "from-blue-500 to-indigo-500",
    index = 0,
    totalValue,
    totalLabel,
}: KpiCardProps) {
    const x = useMotionValue(0)
    const y = useMotionValue(0)

    const rotateX = useTransform(y, [-100, 100], [10, -10])
    const rotateY = useTransform(x, [-100, 100], [-10, 10])

    function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
        const rect = event.currentTarget.getBoundingClientRect()
        const width = rect.width
        const height = rect.height
        const mouseX = event.clientX - rect.left
        const mouseY = event.clientY - rect.top
        const xPct = mouseX / width - 0.5
        const yPct = mouseY / height - 0.5
        x.set(xPct * 200)
        y.set(yPct * 200)
    }

    function handleMouseLeave() {
        x.set(0)
        y.set(0)
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            style={{
                perspective: 1000,
            }}
        >
            <motion.div
                style={{
                    rotateX,
                    rotateY,
                    transformStyle: "preserve-3d",
                }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="h-full"
            >
                <Card className="relative overflow-hidden border-none h-full bg-card text-card-foreground shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col justify-between">
                    {/* Gradient Background Glow */}
                    <div
                        className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br ${gradient}`}
                    />

                    <div>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {title}
                            </CardTitle>
                            <div className={`p-2 rounded-full bg-gradient-to-br ${gradient} bg-opacity-10`}>
                                <Icon className="h-4 w-4 text-white" />
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="text-2xl font-bold text-foreground">{value}</div>
                            <div className="flex items-center text-xs text-muted-foreground mt-1">
                                <span
                                    className={`flex items-center ${trend === "up"
                                        ? "text-emerald-500"
                                        : trend === "down"
                                            ? "text-red-500"
                                            : "text-yellow-500"
                                        } font-medium mr-1`}
                                >
                                    {trendValue}
                                </span>
                                {description}
                            </div>
                        </CardContent>
                    </div>

                    {totalValue && (
                        <div className="px-6 pb-4 relative z-10 mt-2">
                            <div className="pt-3 border-t border-border/50 flex justify-between items-center">
                                <span className="text-xs text-muted-foreground font-medium">{totalLabel}</span>
                                <span className="text-sm font-bold">{totalValue}</span>
                            </div>
                        </div>
                    )}
                </Card>
            </motion.div>
        </motion.div>
    )
}
