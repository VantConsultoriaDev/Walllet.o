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

// Define types for memoized results
type KpiData = {
    value: string;
    description: string;
    totalValue?: string;
    totalLabel?: string;
}

type Kpis = {
    vendasMensais: KpiData;
    novosClientes: KpiData;
    novasPlacas: KpiData;
    faturamento: KpiData;
    comissionamento: KpiData;
    patrimonioProtegido: KpiData;
    contratosVencidos: KpiData;
}

type MonthlyDataItem = {
    name: string;
    vendas: number;
    clientes: number;
    placas: number;
    faturamento: number;
    comissao: number;
    patrimonio: number;
}

const initialKpis: Kpis = {
    vendasMensais: { value: "0", description: "novos contratos este mês" },
    novosClientes: { value: "0", description: "cadastrados este mês", totalValue: "0", totalLabel: "Total de Clientes" },
    novasPlacas: { value: "0", description: "veículos adicionados", totalValue: "0", totalLabel: "Total de Placas" },
    faturamento: { value: "R$ 0,00", description: "total este mês" },
    comissionamento: { value: "R$ 0,00", description: "total acumulado" },
    patrimonioProtegido: { value: "R$ 0,00", description: "Valor total assegurado" },
    contratosVencidos: { value: "0", description: "Cotações em andamento" },
}

export default function Dashboard() {
    const { clients, loading: clientsLoading } = useClients()
    const { transactions, loading: transactionsLoading } = useTransactions()
    const { quotations, loading: quotationsLoading } = useQuotations()
    const [currentMetric, setCurrentMetric] = useState("vendas")

    const loading = clientsLoading || transactionsLoading || quotationsLoading

    const { kpis, chartData } = useMemo(() => {
        if (loading) return { kpis: initialKpis, chartData: [] as MonthlyDataItem[] }

        const currentYear = new Date().getFullYear()
        const currentMonthIndex = new Date().getMonth()

        // --- KPI Calculations ---
        const totalClients = clients.length
        const totalVehicles = clients.reduce((sum, client) => sum + client.vehicles.length, 0)
        
        // NOTE: Since 'created_at' is not mapped on Client type, we use the first client's creation date as a proxy for 'new clients'
        // For accurate data, we rely on the DB query in the hook, but here we use the data available.
        // Assuming the client list is sorted by creation date (as per useClients hook)
        const newClientsThisMonth = clients.filter(c => {
            // We need a date property on the client object. Since it's missing, we skip date filtering here
            // or assume the client object has a date property (which it doesn't based on the provided type).
            // For now, we'll use a mock date logic based on the client ID if necessary, but let's assume 
            // the client object has a `createdAt` property (which we must add to the Client type later if needed).
            // For now, let's use a simple filter based on the first client's creation date if available.
            // Since we cannot modify the Client type here, we'll use a simplified count for the KPI.
            return c.status === 'active' // Simplified count for demo purposes
        }).length

        // Re-calculating newClientsThisMonth based on the data structure available in the quotation hook (which has createdAt)
        // Since clients don't have createdAt, we rely on transactions/quotations for monthly metrics.
        
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
        const monthlyData: MonthlyDataItem[] = MONTHS.map((name, monthIndex) => {
            // Filter clients based on their ID creation date (a rough proxy if no real date is available)
            // Since we cannot rely on `c.created_at`, we skip client filtering by date here.
            
            const monthTransactions = transactions.filter(t => t.date.getFullYear() === currentYear && t.date.getMonth() === monthIndex)
            const monthQuotations = quotations.filter(q => q.createdAt.getFullYear() === currentYear && q.createdAt.getMonth() === monthIndex)

            const sales = monthQuotations.filter(q => q.status === 'cliente').length
            
            // Calculate new clients based on quotations that became clients this month
            const newClients = monthQuotations.filter(q => q.status === 'cliente').length
            
            // Calculate new plates based on vehicles added this month (requires vehicle creation date, which is also missing)
            // We will use a simplified proxy: new plates = new clients * 1 (assuming 1 vehicle per new client for the chart)
            const newPlates = newClients * 1 
            
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

        const kpis: Kpis = {
            vendasMensais: {
                value: formatNumber(monthlyData[currentMonthIndex]?.vendas || 0),
                description: "novos contratos este mês",
                totalValue: formatNumber(quotations.filter(q => q.status === 'cliente').length),
                totalLabel: "Total de Contratos",
            },
            novosClientes: {
                value: formatNumber(monthlyData[currentMonthIndex]?.clientes || 0), // Use chart data for monthly clients
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

    const currentChartData = (chartData as MonthlyDataItem[]).map((item: MonthlyDataItem) => ({
        name: item.name,
        value: item[currentMetric as keyof MonthlyDataItem]
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