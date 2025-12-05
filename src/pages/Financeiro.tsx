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
import { Plus, ArrowDownCircle, DollarSign, Search, Wallet, TrendingUp, ArrowUpDown, Loader2, Pencil, Repeat } from "lucide-react"
import { format, isWithinInterval, startOfMonth, endOfMonth, ptBR as localePtBR, isBefore, subMonths, getMonth, getYear, setMonth, setYear, setHours, isAfter } from "date-fns"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import type { DateRange } from "react-day-picker"
import { useTransactions } from "@/hooks/data/useTransactions"
import { useBoletos } from "@/hooks/data/useBoletos"
import type { Boleto } from "@/types/agenda"
import { Badge } from "@/components/ui/badge"
import { normalizeString } from "@/lib/utils"
import { NewTransactionModal, type Transaction } from "@/components/financeiro/new-transaction-modal"
import { RecurrenceActionDialog } from "@/components/financeiro/recurrence-action-dialog"
import { useRepresentations } from "@/hooks/data/useRepresentations"

// Define o tipo de dado para a tabela (Boletos + Despesas)
type FinanceiroRow = Boleto & { isBoleto: true } | (Transaction & { isBoleto: false })

export default function Financeiro() {
    const { transactions, loading: transactionsLoading, addTransaction, updateTransaction, deleteTransaction } = useTransactions()
    const { boletos: allBoletos, loading: boletosLoading, updateBoletoStatus, deleteBoleto, deleteRecurrenceGroup } = useBoletos()
    const { partners } = useRepresentations()

    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
    const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined)
    const [isRecurrenceDialogOpen, setIsRecurrenceDialogOpen] = useState(false)
    const [pendingDeleteTransaction, setPendingDeleteTransaction] = useState<Transaction | null>(null)

    const loading = transactionsLoading || boletosLoading;

    // --- Filter State ---
    const today = useMemo(() => new Date(), [])
    const initialDateRange = useMemo(() => ({
        from: startOfMonth(today),
        to: endOfMonth(today),
    }), [today])

    const [dateRange, setDateRange] = useState<DateRange | undefined>(initialDateRange)
    const [globalFilter, setGlobalFilter] = useState("")
    const [sortField, setSortField] = useState<"date" | "valor" | "comissao" | null>("date")
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

    // --- Data Processing ---

    const allRows: FinanceiroRow[] = useMemo(() => {
        const boletoRows: FinanceiroRow[] = allBoletos.map(b => ({ ...b, isBoleto: true }))
        const transactionRows: FinanceiroRow[] = transactions.map(t => ({ ...t, isBoleto: false }))
        
        // Filter out expected commissions from the main list, as they are used for KPI calculation only
        return [...boletoRows, ...transactionRows.filter(t => t.category !== 'Comissão Esperada')]
    }, [allBoletos, transactions])

    const filteredRows = useMemo(() => {
        let result = allRows

        // 1. Date Range Filter (Vencimento for Boletos, Date for Transactions)
        if (dateRange?.from) {
            const start = dateRange.from;
            const end = dateRange.to ? setHours(dateRange.to, 23, 59, 59) : undefined;

            result = result.filter(row => {
                if (row.isBoleto) {
                    // Filter boletos by VENCIMENTO
                    const vencimento = row.vencimento;
                    if (!end) return !isBefore(vencimento, start);
                    return isWithinInterval(vencimento, { start, end });
                } else {
                    // Filter transactions by DATE
                    const date = row.date;
                    if (!end) return !isBefore(date, start);
                    return isWithinInterval(date, { start, end });
                }
            })
        }

        // 2. Global Search Filter
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

        // 3. Sorting (Simplified for now, focusing on date)
        if (sortField && sortDirection) {
            result.sort((a, b) => {
                let aVal: any;
                let bVal: any;

                // Use Vencimento for boletos, Date for transactions
                const aDate = a.isBoleto ? a.vencimento : a.date;
                const bDate = b.isBoleto ? b.vencimento : b.date;

                if (sortField === "date") {
                    aVal = aDate.getTime();
                    bVal = bDate.getTime();
                } else if (sortField === "valor") {
                    aVal = a.isBoleto ? a.valor : a.amount;
                    bVal = b.isBoleto ? b.valor : b.amount;
                } else {
                    // Default to date if other fields are complex
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
    }, [allRows, dateRange, globalFilter, sortField, sortDirection])

    // --- KPI Calculations ---

    const { faturamento, comissaoEsperada, comissaoConfirmada, despesas } = useMemo(() => {
        const currentMonthStart = dateRange?.from ? startOfMonth(dateRange.from) : startOfMonth(today);
        const currentMonthEnd = dateRange?.to ? endOfMonth(dateRange.to) : endOfMonth(today);
        
        // Mês anterior ao período selecionado
        const previousMonthStart = subMonths(currentMonthStart, 1);
        const previousMonthEnd = endOfMonth(previousMonthStart);

        let totalFaturamento = 0;
        let totalComissaoEsperada = 0;
        let totalComissaoConfirmada = 0;
        let totalDespesas = 0;

        // 1. Faturamento (Boletos Pagos no Período de Vencimento)
        // 2. Comissão Esperada (Comissão de Boletos Vencendo no Período)
        allBoletos.forEach(boleto => {
            const isVencimentoInPeriod = isWithinInterval(boleto.vencimento, { start: currentMonthStart, end: currentMonthEnd });
            
            // Calcula o valor da comissão (se for percentual)
            let commissionAmount = 0;
            if (boleto.comissaoRecorrente && boleto.comissaoTipo) {
                commissionAmount = boleto.comissaoTipo === 'percentual'
                    ? (boleto.valor * boleto.comissaoRecorrente) / 100
                    : boleto.comissaoRecorrente;
            }

            if (isVencimentoInPeriod) {
                if (boleto.status === 'paid') {
                    totalFaturamento += boleto.valor;
                }
                // Comissão Esperada: Baseada no vencimento do boleto
                totalComissaoEsperada += commissionAmount;
            }
        });

        // 3. Comissão Confirmada (Comissão de Boletos Pagos no Mês ANTERIOR)
        // Buscamos as transações de 'Comissão' (confirmadas) que caíram no mês anterior.
        transactions.filter(t => t.category === 'Comissão').forEach(t => {
            const isCommissionDateInPreviousMonth = isWithinInterval(t.date, { start: previousMonthStart, end: previousMonthEnd });
            if (isCommissionDateInPreviousMonth) {
                totalComissaoConfirmada += t.amount;
            }
        });

        // 4. Despesas (Transações de Despesa no Período)
        transactions.filter(t => t.type === 'expense').forEach(t => {
            const isTransactionDateInPeriod = isWithinInterval(t.date, { start: currentMonthStart, end: currentMonthEnd });
            if (isTransactionDateInPeriod) {
                totalDespesas += t.amount;
            }
        });

        return {
            faturamento: totalFaturamento,
            comissaoEsperada: totalComissaoEsperada,
            comissaoConfirmada: totalComissaoConfirmada,
            despesas: totalDespesas,
        }
    }, [allBoletos, transactions, dateRange, today])

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
            setPendingDeleteTransaction(transaction)
            setIsRecurrenceDialogOpen(true)
        } else {
            handleTransactionDelete(transaction)
        }
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
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between space-y-2">
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
            <div className="flex flex-col md:flex-row items-center gap-3">
                <DatePickerWithRange date={dateRange} setDate={setDateRange} />
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Faturamento (Boletos Pagos)</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{formatCurrency(faturamento)}</div>
                        <p className="text-xs text-muted-foreground">Boletos pagos no período</p>
                    </CardContent>
                </Card>
                
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Comissão Esperada</CardTitle>
                        <Wallet className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{formatCurrency(comissaoEsperada)}</div>
                        <p className="text-xs text-muted-foreground">Comissão de boletos vencendo no período</p>
                    </CardContent>
                </Card>
                
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Comissão Confirmada</CardTitle>
                        <Wallet className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(comissaoConfirmada)}</div>
                        <p className="text-xs text-muted-foreground">Comissões pagas no mês anterior</p>
                    </CardContent>
                </Card>
                
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Despesas</CardTitle>
                        <ArrowDownCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{formatCurrency(despesas)}</div>
                        <p className="text-xs text-muted-foreground">Saídas no período</p>
                    </CardContent>
                </Card>
            </div>

            {/* Unified List */}
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Movimentações Detalhadas</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading && allRows.length === 0 ? (
                        <div className="flex items-center justify-center py-12 text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando dados financeiros...
                        </div>
                    ) : (
                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-b border-border">
                                        <TableHead className="w-[40px]"></TableHead>
                                        <TableHead>Descrição / Cliente</TableHead>
                                        <TableHead>Placa(s)</TableHead>
                                        <TableHead>Categoria</TableHead>
                                        <TableHead>
                                            <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-transparent" onClick={() => handleSort("date")}>
                                                Data
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
                                        <TableHead className="w-[50px]"></TableHead>
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
                                                
                                                // Encontra a representação para obter o dia de pagamento
                                                const rep = partners.find(p => p.id === boleto.representacaoId);
                                                
                                                // Data de referência: Vencimento do Boleto
                                                const displayDate = boleto.vencimento;

                                                return (
                                                    <TableRow key={boleto.id} className="cursor-pointer hover:bg-muted/50 h-16">
                                                        <TableCell>
                                                            {boleto.isRecurring && <Repeat className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-medium">{boleto.clientName}</div>
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
                                                        <TableCell>
                                                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); /* Open Boleto Edit Modal */ }}>
                                                                <Pencil className="h-4 w-4 text-muted-foreground" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            } else {
                                                const transaction = row as Transaction & { isBoleto: false }
                                                const isIncome = transaction.type === 'income'
                                                
                                                // Data de referência: Data da Transação
                                                const displayDate = transaction.date;

                                                return (
                                                    <TableRow key={transaction.id} className="cursor-pointer hover:bg-muted/50 h-16" onClick={() => openEditTransactionModal(transaction)}>
                                                        <TableCell>
                                                            {transaction.isRecurrent && <Repeat className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-medium">{transaction.description}</div>
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
                                                        <TableCell>
                                                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEditTransactionModal(transaction); }}>
                                                                <Pencil className="h-4 w-4 text-muted-foreground" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            }
                                            return null;
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={9} className="h-24 text-center">
                                                Nenhuma movimentação encontrada no período.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <NewTransactionModal
                open={isTransactionModalOpen}
                onOpenChange={setIsTransactionModalOpen}
                onSubmit={handleTransactionSubmit}
                onDelete={handleDeleteTransactionClick}
                transactionToEdit={editingTransaction}
            />

            {/* Recurrence Delete Dialog */}
            {pendingDeleteTransaction && (
                <RecurrenceActionDialog
                    open={isRecurrenceDialogOpen}
                    onOpenChange={setIsRecurrenceDialogOpen}
                    onAction={(scope) => handleTransactionDelete(pendingDeleteTransaction, scope)}
                    actionType="delete"
                />
            )}
        </div>
    )
}