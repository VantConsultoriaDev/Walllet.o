import { useState } from "react"
import {
    Users,
    FileText,
    AlertTriangle,
    DollarSign,
    TrendingUp,
    Car,
} from "lucide-react"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { DashboardChart } from "@/components/dashboard/dashboard-chart"
import { motion } from "framer-motion"

// Mock data for different metrics
const chartData = {
    vendas: [
        { name: "Jan", value: 12 },
        { name: "Fev", value: 15 },
        { name: "Mar", value: 18 },
        { name: "Abr", value: 14 },
        { name: "Mai", value: 22 },
        { name: "Jun", value: 25 },
        { name: "Jul", value: 28 },
        { name: "Ago", value: 32 },
        { name: "Set", value: 30 },
        { name: "Out", value: 35 },
        { name: "Nov", value: 40 },
        { name: "Dez", value: 45 },
    ],
    clientes: [
        { name: "Jan", value: 5 },
        { name: "Fev", value: 8 },
        { name: "Mar", value: 12 },
        { name: "Abr", value: 10 },
        { name: "Mai", value: 15 },
        { name: "Jun", value: 18 },
        { name: "Jul", value: 20 },
        { name: "Ago", value: 22 },
        { name: "Set", value: 25 },
        { name: "Out", value: 28 },
        { name: "Nov", value: 30 },
        { name: "Dez", value: 35 },
    ],
    placas: [
        { name: "Jan", value: 8 },
        { name: "Fev", value: 12 },
        { name: "Mar", value: 15 },
        { name: "Abr", value: 18 },
        { name: "Mai", value: 25 },
        { name: "Jun", value: 28 },
        { name: "Jul", value: 32 },
        { name: "Ago", value: 35 },
        { name: "Set", value: 38 },
        { name: "Out", value: 42 },
        { name: "Nov", value: 45 },
        { name: "Dez", value: 50 },
    ],
    faturamento: [
        { name: "Jan", value: 15000 },
        { name: "Fev", value: 18000 },
        { name: "Mar", value: 22000 },
        { name: "Abr", value: 20000 },
        { name: "Mai", value: 28000 },
        { name: "Jun", value: 32000 },
        { name: "Jul", value: 35000 },
        { name: "Ago", value: 38000 },
        { name: "Set", value: 42000 },
        { name: "Out", value: 45000 },
        { name: "Nov", value: 50000 },
        { name: "Dez", value: 55000 },
    ],
    comissao: [
        { name: "Jan", value: 3000 },
        { name: "Fev", value: 3600 },
        { name: "Mar", value: 4400 },
        { name: "Abr", value: 4000 },
        { name: "Mai", value: 5600 },
        { name: "Jun", value: 6400 },
        { name: "Jul", value: 7000 },
        { name: "Ago", value: 7600 },
        { name: "Set", value: 8400 },
        { name: "Out", value: 9000 },
        { name: "Nov", value: 10000 },
        { name: "Dez", value: 11000 },
    ],
    patrimonio: [
        { name: "Jan", value: 500000 },
        { name: "Fev", value: 550000 },
        { name: "Mar", value: 600000 },
        { name: "Abr", value: 650000 },
        { name: "Mai", value: 750000 },
        { name: "Jun", value: 800000 },
        { name: "Jul", value: 900000 },
        { name: "Ago", value: 950000 },
        { name: "Set", value: 1000000 },
        { name: "Out", value: 1100000 },
        { name: "Nov", value: 1150000 },
        { name: "Dez", value: 1200000 },
    ],
}

const metricTitles = {
    vendas: "Vendas Mensais",
    clientes: "Novos Clientes",
    placas: "Novas Placas",
    faturamento: "Faturamento",
    comissao: "Comissionamento",
    patrimonio: "Patrimônio Protegido",
}

export default function Dashboard() {
    const [currentMetric, setCurrentMetric] = useState("vendas")

    return (
        <div className="flex-1 space-y-6">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between"
            >
                <div>
                    <h2 className="text-4xl font-bold text-gradient mb-2">Dashboard</h2>
                    <p className="text-muted-foreground">Visão geral da sua operação</p>
                </div>
            </motion.div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                    title="Vendas Mensais"
                    value="45"
                    description="novos contratos"
                    icon={FileText}
                    trend="up"
                    trendValue="+12%"
                    gradient="from-purple-500 to-pink-500"
                    index={0}
                />
                <KpiCard
                    title="Novos Clientes"
                    value="35"
                    description="cadastrados"
                    icon={Users}
                    trend="up"
                    trendValue="+8%"
                    gradient="from-blue-500 to-cyan-500"
                    index={1}
                    totalValue="1.250"
                    totalLabel="Total de Clientes"
                />
                <KpiCard
                    title="Novas Placas"
                    value="50"
                    description="veículos"
                    icon={Car}
                    trend="up"
                    trendValue="+15%"
                    gradient="from-orange-500 to-red-500"
                    index={2}
                    totalValue="850"
                    totalLabel="Total de Placas"
                />
                <KpiCard
                    title="Faturamento"
                    value="R$ 55k"
                    description="total mês"
                    icon={DollarSign}
                    trend="up"
                    trendValue="+20%"
                    gradient="from-green-500 to-emerald-500"
                    index={3}
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <DashboardChart
                    data={chartData[currentMetric as keyof typeof chartData]}
                    dataKey="value"
                    title={metricTitles[currentMetric as keyof typeof metricTitles]}
                    onMetricChange={setCurrentMetric}
                    currentMetric={currentMetric}
                />
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="col-span-3 space-y-4"
                >
                    <KpiCard
                        title="Comissionamento"
                        value="R$ 11k"
                        description="recorrente + pontual"
                        icon={TrendingUp}
                        trend="up"
                        trendValue="+18%"
                        gradient="from-indigo-500 to-violet-500"
                    />
                    <KpiCard
                        title="Patrimônio Protegido"
                        value="R$ 1.2M"
                        description="Valor total assegurado"
                        icon={DollarSign}
                        trend="up"
                        trendValue="+5%"
                        gradient="from-teal-500 to-green-500"
                    />
                    <KpiCard
                        title="Contratos Vencidos"
                        value="7"
                        description="Necessitam atenção urgente"
                        icon={AlertTriangle}
                        trend="down"
                        trendValue="+2"
                        gradient="from-yellow-500 to-orange-500"
                    />
                </motion.div>
            </div>
        </div>
    )
}
