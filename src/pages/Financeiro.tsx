import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, ArrowDownCircle, DollarSign, Search, Wallet, TrendingUp, ArrowUpDown, ArrowUp, ArrowDown, Filter, Pencil, Repeat, Loader2 } from "lucide-react"
import { format, isWithinInterval, startOfMonth, endOfMonth, isBefore, subMonths, getMonth, getYear, setMonth, setYear, setHours, isAfter, isSameMonth, isSameYear } from "date-fns"
import { ptBR as localePtBR } from "date-fns/locale" // Importação correta do locale
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { DateRange } from "react-day-picker"
import { useTransactions } from "@/hooks/data/useTransactions"
import { useBoletos, calculateExpectedCommissionDate } from "@/hooks/data/useBoletos"
import type { Boleto } from "@/types/agenda"
import { Badge } from "@/components/ui/badge"
import { normalizeString } from "@/lib/utils"
import { NewTransactionModal, type Transaction } from "@/components/financeiro/new-transaction-modal"
import { RecurrenceActionDialog } from "@/components/financeiro/recurrence-action-dialog"
import { useRepresentations } from "@/hooks/data/useRepresentations"
import { EditBoletoModal } from "@/components/clients/edit-boleto-modal"
import { useVehicles } from "@/hooks/data/useVehicles" // Importação mantida para obter a lista de veículos para o modal de edição de boleto

// Define o tipo de dado para a tabela (Boletos + Despesas)
type FinanceiroRow = Boleto & { isBoleto: true } | (Transaction & { isBoleto: false })

// Função utilitária para limpar o nome do cliente/título
const cleanBoletoTitle = (title: string) => {
    return title.replace(/\s*-\s*Proteauto/i, '').trim();
}

const MONTH_OPTIONS = [
    { value: 0, label: "Janeiro" },
    { value: 1, label: "Fevereiro" },
    { value: 2, label: "Março" },
    { value: 3, label: "Abril" },
    { value: 4, label: "Maio" },
    { value: 5, label: "Junho" },
    { value: 6, label: "Julho" },
    { value: 7, label: "Agosto" },
    { value: 8, label: "Setembro" },
    { value: 9, label: "Outubro" },
    { value: 10, label: "Novembro" },
    { value: 11, label: "Dezembro" },
]

export default function Financeiro() {
    const { transactions, addTransaction, updateTransaction, deleteTransaction, fetchTransactions: fetchTransactionsData } = useTransactions()
    const { boletos: allBoletos, updateBoletoStatus, deleteBoleto, deleteRecurrenceGroup, updateBoleto } = useBoletos()
    const { partners } = useRepresentations()
    const { vehicles: allVehicles } = useVehicles()

    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
    const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined)
    const [isRecurrenceDialogOpen, setIsRecurrenceDialogOpen] = useState(false)
    const [pendingDeleteTransaction, setPendingDeleteTransaction] = useState<FinanceiroRow | null>(null)
    
    const [isEditBoletoModalOpen, setIsEditBoletoModalOpen] = useState(false)
    const [selectedBoletoToEdit, setSelectedBoletoToEdit] = useState<Boleto | null>(null)

    // Removendo loading, confiando no useAppInitialization do MainLayout

    // --- Filter State ---
    const today = useMemo(() => new Date(), [])
    const currentMonth = getMonth(today)
    const currentYear = getYear(today)

    const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth)
    const [selectedYear, setSelectedYear] = useState<number>(currentYear)
    const [selectedPartnerId, setSelectedPartnerId] = useState<string | "ALL">("ALL")
    const [globalFilter, setGlobalFilter] = useState("")
    const [sortField, setSortField] = useState<"date" | "valor" | "comissao" | null>("date")
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

    // Calculate the date range based on selected month/year
    const { filterStart, filterEnd } = useMemo(() => {
        const date = setYear(setMonth(today, selectedMonth), selectedYear)
        return {
            filterStart: startOfMonth(date),
            filterEnd: endOfMonth(date),
        }
    }, [selectedMonth, selectedYear, today])

    // Generate year options dynamically
    const yearOptions = useMemo(() => {
        const years = []
        for (let i = currentYear - 2; i <= currentYear + 5; i++) {
            years.push(i)
        }
        return years
    }, [currentYear])

    // --- Data Processing ---

    const allRows: FinanceiroRow[] = useMemo(() => {
        const boletoRows: FinanceiroRow[] = allBoletos.map(b => ({ ...b, isBoleto: true }))
        
        // Explicitly type transactionRows to allow filtering by category
        const transactionRows = transactions.map(t => ({ ...t, isBoleto: false })) as (Transaction & { isBoleto: false })[]
        
        // Filter out expected commissions from the main list, as they are used for KPI calculation only
        return [...boletoRows, ...transactionRows.filter(t => t.category !== 'Comissão Esperada')]
    }, [allBoletos, transactions])

    const filteredRows = useMemo(() => {
        let result = allRows

        // 1. Date Filter (Based on Commission/Transaction Date)
        result = result.filter(row => {
            let referenceDate: Date;

            if (row.isBoleto) {
                const boleto = row as Boleto & { isBoleto: true };
                // Se tem comissão, a data de referência é a data de comissão esperada
                if (boleto.comissaoRecorrente) {
                    referenceDate = calculateExpectedCommissionDate(boleto.vencimento, boleto.commissionDay);
                } else {
                    // Se não tem comissão, usamos o vencimento do boleto como referência
                    referenceDate = boleto.vencimento;
                }
            } else {
                // Para transações (incluindo comissões confirmadas e despesas), usamos a data da transação
                referenceDate = row.date;
            }

            // Filtra pelo mês/ano selecionado
            return isSameMonth(referenceDate, filterStart) && isSameYear(referenceDate, filterStart);
        });

        // 2. Partner Filter
        if (selectedPartnerId !== "ALL") {
            result = result.filter(row => {
                if (row.isBoleto) {
                    return row.representacaoId === selectedPartnerId;
                } else {
                    return row.representacaoId === selectedPartnerId;
                }
            });
        }

        // 3. Global Search Filter
        if (globalFilter) {
            const filterLower = normalizeString(globalFilter)
            result = result.filter(row => {
                let searchFields = ""
                if (row.isBoleto) {
                    searchFields = `${row.clientName} ${row.representacao} ${row.placas.join(" ")} ${row.valor}`
                } else {
                    searchFields = `${row.description} ${row.category} ${row.amount}`
                }
                return normalizeString(searchFields).includes(filterLower)
            })
        }

        // 4. Sorting
        if (sortField && sortDirection) {
            result.sort((a, b) => {
                let aVal: any;
                let bVal: any;

                // Data de referência para ordenação:
                const aDate = a.isBoleto && a.comissaoRecorrente ? calculateExpectedCommissionDate(a.vencimento, a.commissionDay) : (a.isBoleto ? a.vencimento : a.date);
                const bDate = b.isBoleto && b.comissaoRecorrente ? calculateExpectedCommissionDate(b.vencimento, b.commissionDay) : (b.isBoleto ? b.vencimento : b.date);

                if (sortField === "date") {
                    aVal = aDate.getTime();
                    bVal = bDate.getTime();
                } else if (sortField === "valor") {
                    aVal = a.isBoleto ? a.valor : a.amount;
                    bVal = b.isBoleto ? b.valor : b.amount;
                } else {
                    aVal = aDate.getTime();
                    bVal = bDate.getTime();
                }

                if (sortDirection === "asc") {
                    return aVal > bVal ? 1 : -1
                } else {
                    return aVal < bVal ? 1 : -1
                }
            })
        }

        return result
    }, [allRows, filterStart, selectedPartnerId, globalFilter, sortField, sortDirection])

    // --- KPI Calculations ---

    const { faturamento, comissaoEsperada, comissaoConfirmada, despesas } = useMemo(() => {
        let totalFaturamento = 0;
        let totalComissaoEsperada = 0;
        let totalComissaoConfirmada = 0;
        let totalDespesas = 0;

        // Itera sobre as linhas filtradas
        filteredRows.forEach(row => {
            if (row.isBoleto) {
                const boleto = row as Boleto & { isBoleto: true };
                
                // Calcula o valor da comissão
                let commissionAmount = 0;
                if (boleto.comissaoRecorrente && boleto.comissaoTipo) {
                    commissionAmount = boleto.comissaoTipo === 'percentual'
                        ? (boleto.valor * boleto.comissaoRecorrente) / 100
                        : boleto.comissaoRecorrente;
                }

                // 1. Faturamento (Boletos Pagos)
                if (boleto.status === 'paid') {
                    totalFaturamento += boleto.valor;
                    // 3. Comissão Confirmada (Comissão de Boletos Pagos)
                    totalComissaoConfirmada += commissionAmount;
                }
                
                // 2. Comissão Esperada (Comissão de TODOS os boletos listados)
                totalComissaoEsperada += commissionAmount;

            } else {
                const transaction = row as Transaction & { isBoleto: false };
                // 4. Despesas
                if (transaction.type === 'expense') {
                    totalDespesas += transaction.amount;
                }
            }
        });

        return {
            faturamento: totalFaturamento,
            comissaoEsperada: totalComissaoEsperada,
            comissaoConfirmada: totalComissaoConfirmada,
            despesas: totalDespesas,
        }
    }, [filteredRows])

    // --- Handlers ---

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value)
    }

    const handleSort = (field: "date" | "valor" | "comissao") => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc")
        } else {
            setSortField(field)
            setSortDirection("asc")
        }
    }

    const getSortIcon = (field: "date" | "valor" | "comissao") => {
        if (sortField !== field) return <ArrowUpDown className="ml-2 h-3 w-3 opacity-50" />
        if (sortDirection === "asc") return <ArrowUp className="ml-2 h-3 w-3" />
        return <ArrowDown className="ml-2 h-3 w-3" />
    }

    const handleTransactionSubmit = (transaction: Transaction, scope?: "this" | "all") => {
        if (editingTransaction) {
            updateTransaction(transaction)
        } else {
            addTransaction(transaction)
        }
        setEditingTransaction(undefined)
    }

    const handleTransactionDelete = (transaction: Transaction, scope?: "this" | "all") => {
        if (transaction.isRecurrent && scope === "all") {
            // NOTE: Deleting all recurrent transactions requires a specific DB query or function.
            // For now, we only delete the current instance.
            deleteTransaction(transaction.id)
        } else {
            deleteTransaction(transaction.id)
        }
        setPendingDeleteTransaction(null)
    }

    const openEditTransactionModal = (transaction: Transaction) => {
        setEditingTransaction(transaction)
        setIsTransactionModalOpen(true)
    }

    const handleDeleteTransactionClick = (transaction: Transaction) => {
        if (transaction.isRecurrent) {
            // Casting Transaction to FinanceiroRow for pendingDeleteTransaction state
            setPendingDeleteTransaction({ ...transaction, isBoleto: false })
            setIsRecurrenceDialogOpen(true)
        } else {
            handleTransactionDelete(transaction)
        }
    }
    
    const handleOpenBoletoEditModal = (boleto: Boleto) => {
        setSelectedBoletoToEdit(boleto)
        setIsEditBoletoModalOpen(true)
    }

    // --- Funções de manipulação de Boleto para o Modal de Edição ---
    const handleBoletoSave = async (updatedBoleto: Boleto, scope: "this" | "all") => {
        const originalBoleto = allBoletos.find(b => b.id === updatedBoleto.id);
        
        // Se o status ou a data de pagamento mudou, usamos updateBoletoStatus
        if (originalBoleto && (originalBoleto.status !== updatedBoleto.status || originalBoleto.dataPagamento?.getTime() !== updatedBoleto.dataPagamento?.getTime())) {
            if (updatedBoleto.status === 'paid' && updatedBoleto.dataPagamento) {
                await updateBoletoStatus(updatedBoleto.id, 'paid', updatedBoleto.dataPagamento);
            } else {
                await updateBoletoStatus(updatedBoleto.id, 'pending');
            }
        } else {
            // Caso contrário, é uma atualização de dados (valor, placas, etc.)
            await updateBoleto(updatedBoleto, scope)
        }
        
        // Forçar sincronização das transações para atualizar KPIs
        await fetchTransactionsData();
        
        setIsEditBoletoModalOpen(false)
        setSelectedBoletoToEdit(null)
    }

    const handleBoletoDelete = async (boleto: Boleto) => {
        if (boleto.isRecurring && boleto.recurrenceGroupId) {
            // Se for recorrente, perguntamos o escopo
            // Casting Boleto to FinanceiroRow for pendingDeleteTransaction state
            setPendingDeleteTransaction({ ...boleto, isBoleto: true })
            setIsRecurrenceDialogOpen(true)
        } else {
            await deleteBoleto(boleto.id)
        }
        
        // Forçar sincronização das transações para atualizar KPIs
        await fetchTransactionsData();
        
        setIsEditBoletoModalOpen(false)
        setSelectedBoletoToEdit(null)
    }
    // --- Fim Funções de manipulação de Boleto ---
    
    const handleRecurrenceDeleteAction = async (scope: "this" | "all") => {
        if (pendingDeleteTransaction?.isBoleto) {
            const boleto = pendingDeleteTransaction as Boleto & { isBoleto: true }
            if (scope === "all" && boleto.recurrenceGroupId) {
                await deleteRecurrenceGroup(boleto.recurrenceGroupId)
            } else {
                await deleteBoleto(boleto.id)
            }
        } else if (pendingDeleteTransaction) {
            // Lógica de exclusão de transação normal
            handleTransactionDelete(pendingDeleteTransaction as Transaction, scope)
        }
        
        // Forçar sincronização das transações para atualizar KPIs
        await fetchTransactionsData();
        
        setPendingDeleteTransaction(null)
        setIsRecurrenceDialogOpen(false)
    }


    const getStatusBadge = (status: Boleto['status']) => {
        switch (status) {
            case "paid":
                return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Pago</span>
            case "overdue":
                return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Vencido</span>
            case "pending":
            default:
                return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Pendente</span>
        }
    }

    // --- Render ---

    return (
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8 h-full flex flex-col overflow-y-auto animate-in fade-in duration-500">
            <div className="flex items-center justify-between space-y-2 shrink-0">
                <h2 className="text-3xl font-bold tracking-tight">Financeiro</h2>
                <div className="flex items-center space-x-2">
                    <Button
                        className="group transition-all duration-300 hover:scale-105 hover:shadow-lg"
                        onClick={() => {
                            setEditingTransaction(undefined)
                            setIsTransactionModalOpen(true)
                        }}
                    >
                        <Plus className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" />
                        Nova Transação
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row items-center gap-3 shrink-0">
                {/* Month/Year Filter */}
                <div className="flex gap-2 w-full md:w-auto">
                    <Select
                        value={selectedMonth.toString()}
                        onValueChange={(v) => setSelectedMonth(parseInt(v))}
                    >
                        <SelectTrigger className="w-full md:w-[150px]">
                            <Filter className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Mês" />
                        </SelectTrigger>
                        <SelectContent>
                            {MONTH_OPTIONS.map(month => (
                                <SelectItem key={month.value} value={month.value.toString()}>
                                    {month.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select
                        value={selectedYear.toString()}
                        onValueChange={(v) => setSelectedYear(parseInt(v))}
                    >
                        <SelectTrigger className="w-full md:w-[100px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {yearOptions.map(year => (
                                <SelectItem key={year} value={year.toString()}>
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                
                {/* Partner Filter */}
                <Select
                    value={selectedPartnerId}
                    onValueChange={setSelectedPartnerId}
                >
                    <SelectTrigger className="w-full md:w-[200px]">
                        <Wallet className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Representação" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Todas Representações</SelectItem>
                        {partners.map(rep => (
                            <SelectItem key={rep.id} value={rep.id}>
                                {rep.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="relative flex-1 w-full md:w-auto">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por cliente, placa, valor, descrição..."
                        value={globalFilter}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 shrink-0">
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium pr-2">Faturamento (Boletos Pagos)</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-500 shrink-0" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{formatCurrency(faturamento)}</div>
                        <p className="text-xs text-muted-foreground">Boletos pagos no período</p>
                    </CardContent>
                </Card>
                
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium pr-2">Comissão Esperada</CardTitle>
                        <Wallet className="h-4 w-4 text-yellow-500 shrink-0" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{formatCurrency(comissaoEsperada)}</div>
                        <p className="text-xs text-muted-foreground">Comissão de todos os boletos listados</p>
                    </CardContent>
                </Card>
                
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium pr-2">Comissão Confirmada</CardTitle>
                        <Wallet className="h-4 w-4 text-green-500 shrink-0" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(comissaoConfirmada)}</div>
                        <p className="text-xs text-muted-foreground">Comissões pagas no período</p>
                    </CardContent>
                </Card>
                
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium pr-2">Despesas</CardTitle>
                        <ArrowDownCircle className="h-4 w-4 text-red-500 shrink-0" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{formatCurrency(despesas)}</div>
                        <p className="text-xs text-muted-foreground">Saídas no período</p>
                    </CardContent>
                </Card>
            </div>

            {/* Unified List */}
            <Card className="col-span-4 flex-1 flex flex-col overflow-hidden">
                <CardHeader className="shrink-0">
                    <CardTitle>Movimentações Detalhadas</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto">
                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-b border-border">
                                    <TableHead className="w-[40px]"></TableHead> {/* Coluna para ícones */}
                                    <TableHead>Descrição / Cliente</TableHead>
                                    <TableHead>Placa(s)</TableHead>
                                    <TableHead>Categoria</TableHead>
                                    <TableHead>
                                        <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-transparent" onClick={() => handleSort("date")}>
                                            Data Ref.
                                            {getSortIcon("date")}
                                        </Button>
                                    </TableHead>
                                    <TableHead className="text-right">
                                        <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-transparent" onClick={() => handleSort("valor")}>
                                            Valor Boleto
                                            {getSortIcon("valor")}
                                        </Button>
                                    </TableHead>
                                    <TableHead className="text-right">
                                        <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-transparent" onClick={() => handleSort("comissao")}>
                                            Valor Comissão
                                            {getSortIcon("comissao")}
                                        </Button>
                                    </TableHead>
                                    <TableHead className="w-[100px] text-center">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRows.length > 0 ? (
                                    filteredRows.map((row) => {
                                        if (row.isBoleto) {
                                            const boleto = row as Boleto & { isBoleto: true }
                                            
                                            // Calcula o valor da comissão (se for percentual)
                                            let commissionAmount = 0;
                                            if (boleto.comissaoRecorrente && boleto.comissaoTipo) {
                                                commissionAmount = boleto.comissaoTipo === 'percentual'
                                                    ? (boleto.valor * boleto.comissaoRecorrente) / 100
                                                    : boleto.comissaoRecorrente;
                                            }
                                            
                                            // Data de referência: Se tiver comissão, usa a data esperada da comissão (com commissionDay). Senão, usa o vencimento do boleto.
                                            const displayDate = boleto.comissaoRecorrente 
                                                ? calculateExpectedCommissionDate(boleto.vencimento, boleto.commissionDay) 
                                                : boleto.vencimento;

                                            return (
                                                <TableRow 
                                                    key={boleto.id} 
                                                    className="cursor-pointer hover:bg-muted/50 h-16"
                                                    onClick={() => handleOpenBoletoEditModal(boleto)} // Abre modal de edição de boleto
                                                >
                                                    <TableCell className="w-[40px]">
                                                        <div className="flex items-center gap-1">
                                                            {boleto.isRecurring && (
                                                                <Repeat className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                            )}
                                                            {boleto.comissaoRecorrente && (
                                                                <span className="text-xs font-medium text-primary" title={`Comissão: ${formatCurrency(commissionAmount)}`}>
                                                                    💰
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium">
                                                            {/* Exibe o nome do cliente (do boleto), limpando o sufixo se existir */}
                                                            {cleanBoletoTitle(boleto.clientName)}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">{boleto.representacao}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-wrap gap-1">
                                                            {boleto.placas.map(p => (
                                                                <Badge key={p} variant="outline" className="text-[10px] px-1 h-5">
                                                                    {p}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">Receita</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {format(displayDate, "dd/MM/yyyy")}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        {formatCurrency(boleto.valor)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                                                        {commissionAmount > 0 ? formatCurrency(commissionAmount) : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {getStatusBadge(boleto.status)}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        } else {
                                            const transaction = row as Transaction & { isBoleto: false }
                                            const isIncome = transaction.type === 'income'
                                            
                                            // Data de referência: Data da Transação
                                            const displayDate = transaction.date;

                                            return (
                                                <TableRow 
                                                    key={transaction.id} 
                                                    className="cursor-pointer hover:bg-muted/50 h-16" 
                                                    onClick={() => openEditTransactionModal(transaction)} // Abre modal de edição de transação
                                                >
                                                    <TableCell className="w-[40px]">
                                                        <div className="flex items-center gap-1">
                                                            {transaction.isRecurrent && <Repeat className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium">
                                                            {transaction.description}
                                                        </div>
                                                        {transaction.representacaoNome && <div className="text-xs text-muted-foreground">{transaction.representacaoNome}</div>}
                                                    </TableCell>
                                                    <TableCell>-</TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary" className={isIncome ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"}>
                                                            {transaction.category}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {format(displayDate, "dd/MM/yyyy")}
                                                    </TableCell>
                                                    <TableCell className={`text-right font-bold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                                                        {isIncome ? '+' : '-'} {formatCurrency(transaction.amount)}
                                                    </TableCell>
                                                    <TableCell className="text-right">-</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="secondary" className={isIncome ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"}>
                                                            {isIncome ? 'Receita' : 'Despesa'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        }
                                        return null;
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center">
                                            Nenhuma movimentação encontrada no período.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <NewTransactionModal
                open={isTransactionModalOpen}
                onOpenChange={setIsTransactionModalOpen}
                onSubmit={handleTransactionSubmit}
                onDelete={handleDeleteTransactionClick}
                transactionToEdit={editingTransaction}
            />
            
            {/* Modal de Edição de Boleto */}
            <EditBoletoModal
                boleto={selectedBoletoToEdit}
                open={isEditBoletoModalOpen}
                onOpenChange={setIsEditBoletoModalOpen}
                onSave={handleBoletoSave}
                onDelete={handleBoletoDelete}
                vehicles={allVehicles}
            />

            {/* Recurrence Delete Dialog (Reutilizado para Transação e Boleto) */}
            {pendingDeleteTransaction && (
                <RecurrenceActionDialog
                    open={isRecurrenceDialogOpen}
                    onOpenChange={setIsRecurrenceDialogOpen}
                    onAction={handleRecurrenceDeleteAction}
                    actionType="delete"
                />
            )}
        </div>
    )
}