import {
    ResponsiveContainer,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Area,
    AreaChart,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface DashboardChartProps {
    data: any[]
    dataKey: string
    title: string
    onMetricChange: (value: string) => void
    currentMetric: string
}

export function DashboardChart({
    data,
    dataKey,
    title,
    onMetricChange,
    currentMetric,
}: DashboardChartProps) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="col-span-4"
        >
            <Card className="bg-card text-card-foreground shadow-sm border-border hover:border-blue-500/30 transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-bold">{title}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Desempenho ao longo do ano
                        </p>
                    </div>
                    <Select value={currentMetric} onValueChange={onMetricChange}>
                        <SelectTrigger className="w-[200px] glass border-white/10">
                            <SelectValue placeholder="Selecione a métrica" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="vendas">Vendas Mensais</SelectItem>
                            <SelectItem value="clientes">Novos Clientes</SelectItem>
                            <SelectItem value="placas">Novas Placas</SelectItem>
                            <SelectItem value="faturamento">Faturamento</SelectItem>
                            <SelectItem value="comissao">Comissionamento</SelectItem>
                            <SelectItem value="patrimonio">Patrimônio Protegido</SelectItem>
                        </SelectContent>
                    </Select>
                </CardHeader>
                <CardContent className="pl-2 pt-4">
                    <ResponsiveContainer width="100%" height={350}>
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="hsl(var(--border))"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="name"
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={10}
                            />
                            <YAxis
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) =>
                                    currentMetric === "faturamento" ||
                                        currentMetric === "comissao" ||
                                        currentMetric === "patrimonio"
                                        ? `R$${value}`
                                        : value
                                }
                            />
                            <Tooltip
                                cursor={{ stroke: "#3b82f6", strokeWidth: 2, strokeDasharray: "5 5" }}
                                contentStyle={{
                                    backgroundColor: "hsl(var(--popover))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "12px",
                                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
                                    padding: "12px",
                                }}
                                itemStyle={{ color: "hsl(var(--popover-foreground))" }}
                                labelStyle={{ color: "hsl(var(--muted-foreground))", marginBottom: "0.5rem", fontSize: "12px", fontWeight: 600 }}
                                formatter={(value: any) => [
                                    currentMetric === "faturamento" ||
                                        currentMetric === "comissao" ||
                                        currentMetric === "patrimonio"
                                        ? `R$ ${value.toLocaleString("pt-BR")}`
                                        : value,
                                    title,
                                ]}
                            />
                            <Area
                                type="monotone"
                                dataKey={dataKey}
                                stroke="#3b82f6" // Blue 500
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorMetric)"
                                activeDot={{
                                    r: 8,
                                    fill: "#3b82f6",
                                    stroke: "#fff",
                                    strokeWidth: 4,
                                    className: "animate-pulse"
                                }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </motion.div>
    )
}
