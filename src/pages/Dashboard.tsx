import { useState, useMemo } from "react"
import {
    Users,
    FileText,
    AlertTriangle,
    DollarSign,
    TrendingUp,
    Car,
    Loader2,
} from "lucide-react"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { DashboardChart } from "@/components/dashboard/dashboard-chart"
import { motion } from "framer-motion"
import { useClients } from "@/hooks/data/useClients"
import { useTransactions } from "@/hooks/data/useTransactions"
import { useQuotations } from "@/hooks/data/useQuotations"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

const metricTitles = {
    vendas: "Vendas Mensais",
    clientes: "Novos Clientes",
    placas: "Novas Placas",
    faturamento: "Faturamento",
    comissao: "Comissionamento",
    patrimonio: "Patrimônio Protegido",
}

const MONTHS = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
]

export default function Dashboard() {
    const { clients, loading: clientsLoading } = useClients()
    const { transactions, loading: transactionsLoading } = useTransactions()
    const { quotations, loading: quotationsLoading } = useQuotations()
    const [currentMetric, setCurrentMetric] = useState("vendas")

    const loading = clientsLoading || transactionsLoading || quotationsLoading

    const { kpis, chartData } = useMemo(() => {
        if (loading) return { kpis: {}, chartData: {} }

        const currentYear = new Date().getFullYear()
        const currentMonthIndex = new Date().getMonth()

        // --- KPI Calculations ---
        const totalClients = clients.length
        const totalVehicles = clients.reduce((sum, client) => sum + client.vehicles.length, 0)
        const newClientsThisMonth = clients.filter(c => c.status === 'active' && c.created_at && new Date(c.created_at).getMonth() === currentMonthIndex).length
        
        const totalBilling = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0)
        
        const totalCommission = transactions
            .filter(t => t.type === 'income' && t.category === 'Comissão')
            .reduce((sum, t) => sum + t.amount, 0)

        const totalPatrimony = quotations.reduce((sum, q) => {
            if (q.status === 'cliente') {
                if (q.asset.type === 'veiculo') return sum + q.asset.valorFipe
                if (q.asset.type === 'residencial') return sum + q.asset.valorPatrimonio
                if (q.asset.type === 'carga') return sum + q.asset.valorTotal
                if (q.asset.type === 'outros') return sum + q.asset.valorSegurado
            }
            return sum
        }, 0)

        const activeQuotations = quotations.filter(q => q.status === 'cotacao' || q.status === 'contrato_vistoria').length
        
        // --- Chart Data Aggregation ---
        const monthlyData = MONTHS.map((name, monthIndex) => {
            const monthClients = clients.filter(c => new Date(c.created_at).getFullYear() === currentYear && new Date(c.created_at).getMonth() === monthIndex)
            const monthTransactions = transactions.filter(t => t.date.getFullYear() === currentYear && t.date.getMonth() === monthIndex)
            const monthQuotations = quotations.filter(q => q.createdAt.getFullYear() === currentYear && q.createdAt.getMonth() === monthIndex)

            const sales = monthQuotations.filter(q => q.status === 'cliente').length
            const newClients = monthClients.length
            const newPlates = monthClients.reduce((sum, c) => sum + c.vehicles.length, 0)
            const faturamento = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
            const comissao = monthTransactions.filter(t => t.type === 'income' && t.category === 'Comissão').reduce((sum, t) => sum + t.amount, 0)
            
            // Simplified patrimony calculation for the chart (total value of new contracts this month)
            const patrimonio = monthQuotations.filter(q => q.status === 'cliente').reduce((sum, q) => {
                if (q.asset.type === 'veiculo') return sum + q.asset.valorFipe
                return sum
            }, 0)

            return {
                name,
                vendas: sales,
                clientes: newClients,
                placas: newPlates,
                faturamento: faturamento,
                comissao: comissao,
                patrimonio: patrimonio,
            }
        })

        const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
        const formatNumber = (value: number) => value.toLocaleString("pt-BR")

        const kpis = {
            vendasMensais: {
                value: formatNumber(monthlyData[currentMonthIndex]?.vendas || 0),
                description: "novos contratos este mês",
                totalValue: formatNumber(quotations.filter(q => q.status === 'cliente').length),
                totalLabel: "Total de Contratos",
            },
            novosClientes: {
                value: formatNumber(newClientsThisMonth),
                description: "cadastrados este mês",
                totalValue: formatNumber(totalClients),
                totalLabel: "Total de Clientes",
            },
            novasPlacas: {
                value: formatNumber(monthlyData[currentMonthIndex]?.placas || 0),
                description: "veículos adicionados",
                totalValue: formatNumber(totalVehicles),
                totalLabel: "Total de Placas",
            },
            faturamento: {
                value: formatCurrency(monthlyData[currentMonthIndex]?.faturamento || 0),
                description: "total este mês",
            },
            comissionamento: {
                value: formatCurrency(totalCommission),
                description: "total acumulado",
            },
            patrimonioProtegido: {
                value: formatCurrency(totalPatrimony),
                description: "Valor total assegurado",
            },
            contratosVencidos: {
                value: formatNumber(activeQuotations), // Using active quotations as a proxy for urgent attention
                description: "Cotações em andamento",
            }
        }

        return { kpis, chartData: monthlyData }
    }, [clients, transactions, quotations, loading])

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    const currentChartData = chartData.map((item: any) => ({
        name: item.name,
        value: item[currentMetric as keyof typeof item]
    }))

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
                    value={kpis.vendasMensais.value}
                    description={kpis.vendasMensais.description}
                    icon={FileText}
                    trend="up"
                    trendValue="+12%" // Mocked trend
                    gradient="from-purple-500 to-pink-500"
                    index={0}
                />
                <KpiCard
                    title="Novos Clientes"
                    value={kpis.novosClientes.value}
                    description={kpis.novosClientes.description}
                    icon={Users}
                    trend="up"
                    trendValue="+8%" // Mocked trend
                    gradient="from-blue-500 to-cyan-500"
                    index={1}
                    totalValue={kpis.novosClientes.totalValue}
                    totalLabel={kpis.novosClientes.totalLabel}
                />
                <KpiCard
                    title="Novas Placas"
                    value={kpis.novasPlacas.value}
                    description={kpis.novasPlacas.description}
                    icon={Car}
                    trend="up"
                    trendValue="+15%" // Mocked trend
                    gradient="from-orange-500 to-red-500"
                    index={2}
                    totalValue={kpis.novasPlacas.totalValue}
                    totalLabel={kpis.novasPlacas.totalLabel}
                />
                <KpiCard
                    title="Faturamento"
                    value={kpis.faturamento.value}
                    description={kpis.faturamento.description}
                    icon={DollarSign}
                    trend="up"
                    trendValue="+20%" // Mocked trend
                    gradient="from-green-500 to-emerald-500"
                    index={3}
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <DashboardChart
                    data={currentChartData}
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
                        value={kpis.comissionamento.value}
                        description={kpis.comissionamento.description}
                        icon={TrendingUp}
                        trend="up"
                        trendValue="+18%" // Mocked trend
                        gradient="from-indigo-500 to-violet-500"
                    />
                    <KpiCard
                        title="Patrimônio Protegido"
                        value={kpis.patrimonioProtegido.value}
                        description={kpis.patrimonioProtegido.description}
                        icon={DollarSign}
                        trend="up"
                        trendValue="+5%" // Mocked trend
                        gradient="from-teal-500 to-green-500"
                    />
                    <KpiCard
                        title="Cotações em Andamento"
                        value={kpis.contratosVencidos.value}
                        description={kpis.contratosVencidos.description}
                        icon={AlertTriangle}
                        trend="down"
                        trendValue="+2" // Mocked trend
                        gradient="from-yellow-500 to-orange-500"
                    />
                </motion.div>
            </div>
        </div>
    )
}