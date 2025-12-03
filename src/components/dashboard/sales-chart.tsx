import {
    Bar,
    BarChart,
    ResponsiveContainer,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"

const data = [
    { name: "Jan", total: 4500 },
    { name: "Fev", total: 3800 },
    { name: "Mar", total: 5200 },
    { name: "Abr", total: 4100 },
    { name: "Mai", total: 6300 },
    { name: "Jun", total: 5800 },
    { name: "Jul", total: 7200 },
    { name: "Ago", total: 6100 },
    { name: "Set", total: 5500 },
    { name: "Out", total: 7800 },
    { name: "Nov", total: 8200 },
    { name: "Dez", total: 9100 },
]

export function SalesChart() {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="col-span-4"
        >
            <Card className="glass-dark border-white/10 hover:border-purple-500/30 transition-all duration-300">
                <CardHeader>
                    <CardTitle className="text-xl font-bold">Vendas Mensais</CardTitle>
                    <p className="text-sm text-muted-foreground">Desempenho ao longo do ano</p>
                </CardHeader>
                <CardContent className="pl-2">
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={data}>
                            <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.3} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis
                                dataKey="name"
                                stroke="rgba(255,255,255,0.5)"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="rgba(255,255,255,0.5)"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `R$${value}`}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }}
                                contentStyle={{
                                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                    border: '1px solid rgba(139, 92, 246, 0.3)',
                                    borderRadius: '12px',
                                    backdropFilter: 'blur(10px)',
                                }}
                                labelStyle={{ color: '#fff' }}
                            />
                            <Bar
                                dataKey="total"
                                fill="url(#colorTotal)"
                                radius={[8, 8, 0, 0]}
                                maxBarSize={60}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </motion.div>
    )
}
