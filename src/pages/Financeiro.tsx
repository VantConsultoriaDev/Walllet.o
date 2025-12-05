import { useState, useEffect, useMemo } from "react"
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
import { Plus, ArrowDownCircle, DollarSign, Search, Wallet, TrendingUp, ArrowUpDown, Loader2 } from "lucide-react"
import { NewTransactionModal, type Transaction } from "@/components/financeiro/new-transaction-modal"
import { format, isWithinInterval, startOfMonth, endOfMonth, subMonths, getMonth, getYear } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    type SortingState,
    type ColumnFiltersState,
    type FilterFn,
} from "@tanstack/react-table"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import type { DateRange } from "react-day-picker"
import { useTransactions } from "@/hooks/data/useTransactions"
import { useBoletos } from "@/hooks/data/useBoletos"
import { calculateExpectedCommissionDate } from "@/hooks/data/useBoletos" // Importando a nova função

// Custom filter for date range
const dateRangeFilter: FilterFn<Transaction> = (row, columnId, value: DateRange | undefined) => {
    if (!value?.from) return true
    const rowDate = row.getValue(columnId) as Date
    if (!value.to) {
        return rowDate.getTime() >= value.from.getTime()
    }
    return isWithinInterval(rowDate, { start: value.from, end: value.to })
}

export default function Financeiro() {
    const { transactions, loading: transactionsLoading, addTransaction, updateTransaction, deleteTransaction } = useTransactions()
    const { boletos: allBoletos, loading: boletosLoading } = useBoletos()
    
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined)

    // Table State
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [globalFilter, setGlobalFilter] = useState("")
    
    // Default filter: Last month + Current month
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(subMonths(new Date(), 1)),
        to: endOfMonth(new Date()),
    })

    const loading = transactionsLoading || boletosLoading;

    const handleSaveTransaction = (transaction: Transaction, scope?: "this" | "all") => {
        if (editingTransaction) {
            // Edit mode
            if (scope === "all" && transaction.recurrenceId) {
                // NOTE: Recurrence update logic is complex and usually handled by the backend.
                // For now, we only update the current transaction in the UI/DB.
                updateTransaction(transaction)
            } else {
                // Update only this transaction
                updateTransaction(transaction)
            }
            setEditingTransaction(undefined)
        } else {
            // Create mode
            if (transaction.isRecurrent) {
                // NOTE: Recurrence creation logic is complex and usually handled by the backend.
                // For now, we only add the first instance to the DB.
                addTransaction(transaction)
            } else {
                addTransaction(transaction)
            }
        }
    }

    const handleDeleteTransaction = (transaction: Transaction, scope?: "this" | "all") => {
        if (transaction.isRecurrent) {
            // NOTE: Deleting all recurrent transactions requires a specific DB query or function.
            // For now, we only delete the current instance.
            deleteTransaction(transaction.id)
        } else {
            deleteTransaction(transaction.id)
        }
        setEditingTransaction(undefined)
    }

    const openEditModal = (transaction: Transaction) => {
        setEditingTransaction(transaction)
        setIsModalOpen(true)
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value)
    }

    const columns: ColumnDef<Transaction>[] = [
        {
            accessorKey: "description",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-0 hover:bg-transparent"
                    >
                        Descrição
                        <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                )
            },
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-medium">{row.getValue("description")}</span>
                    {row.original.isRecurrent && (
                        <span className="text-xs text-muted-foreground">
                            Recorrente {row.original.installments ? `(${row.original.installments}x)` : '(Indeterminado)'}
                        </span>
                    )}
                </div>
            ),
        },
        {
            accessorKey: "category",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-0 hover:bg-transparent"
                    >
                        Categoria
                        <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                )
            },
        },
        {
            accessorKey: "date",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-0 hover:bg-transparent"
                    >
                        Data
                        <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                )
            },
            cell: ({ row }) => format(row.getValue("date"), "dd/MM/yyyy", { locale: ptBR }),
            filterFn: dateRangeFilter,
        },
        {
            accessorKey: "type",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-0 hover:bg-transparent"
                    >
                        Tipo
                        <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                )
            },
            cell: ({ row }) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.getValue("type") === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {row.getValue("type") === 'income' ? 'Receita' : 'Despesa'}
                </span>
            ),
        },
        {
            accessorKey: "amount",
            header: ({ column }) => {
                return (
                    <div className="text-right">
                        <Button
                            variant="ghost"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                            className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pr-0 hover:bg-transparent"
                        >
                            Valor
                            <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                    </div>
                )
            },
            cell: ({ row }) => {
                const amount = parseFloat(row.getValue("amount"))
                const type = row.original.type
                return (
                    <div className={`text-right font-bold ${type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {type === 'income' ? '+' : '-'} {formatCurrency(amount)}
                    </div>
                )
            },
        },
    ]

    const table = useReactTable({
        data: transactions,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setGlobalFilter,
        state: {
            sorting,
            columnFilters,
            globalFilter,
        },
        initialState: {
            pagination: {
                pageSize: 10,
            },
        },
    })

    // Apply date filter when dateRange changes
    useEffect(() => {
        table.getColumn("date")?.setFilterValue(dateRange)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateRange])

    // Calculate summaries based on FILTERED rows
    const filteredRows = table.getFilteredRowModel().rows

    const monthlyBilling = filteredRows
        .filter(row => row.original.type === "income")
        .reduce((acc, row) => acc + row.original.amount, 0)

    const monthlyCommissionConfirmed = filteredRows
        .filter(row => row.original.type === "income" && row.original.category === "Comissão")
        .reduce((acc, row) => acc + row.original.amount, 0)

    const monthlyExpenses = filteredRows
        .filter(row => row.original.type === "expense")
        .reduce((acc, row) => acc + row.original.amount, 0)

    const netProfit = monthlyCommissionConfirmed - monthlyExpenses
    
    // --- NEW CALCULATION: Expected Commission ---
    const monthlyCommissionExpected = useMemo(() => {
        if (!dateRange?.from) return 0;

        const start = dateRange.from;
        const end = dateRange.to || new Date();

        return allBoletos.reduce((sum, boleto) => {
            if (boleto.comissaoRecorrente && boleto.comissaoTipo) {
                // 1. Calculate the expected commission date based on the boleto's DUE DATE
                const expectedDate = calculateExpectedCommissionDate(boleto.vencimento);
                
                // 2. Check if the expected commission date falls within the filtered range
                if (isWithinInterval(expectedDate, { start, end })) {
                    let commissionAmount = boleto.comissaoRecorrente;

                    if (boleto.comissaoTipo === 'percentual') {
                        commissionAmount = (boleto.valor * boleto.comissaoRecorrente) / 100;
                    }
                    return sum + commissionAmount;
                }
            }
            return sum;
        }, 0);
    }, [allBoletos, dateRange]);
    // --- END NEW CALCULATION ---


    return (
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Financeiro</h2>
                <div className="flex items-center space-x-2">
                    <Button
                        className="group transition-all duration-300 hover:scale-105 hover:shadow-lg"
                        onClick={() => {
                            setEditingTransaction(undefined)
                            setIsModalOpen(true)
                        }}
                    >
                        <Plus className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" />
                        Nova Movimentação
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Faturamento (Receitas)</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{formatCurrency(monthlyBilling)}</div>
                        <p className="text-xs text-muted-foreground">Receitas no período selecionado</p>
                    </CardContent>
                </Card>
                
                {/* NEW KPI: Comissão Esperada */}
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Comissão Esperada</CardTitle>
                        <Wallet className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{formatCurrency(monthlyCommissionExpected)}</div>
                        <p className="text-xs text-muted-foreground">Comissões a receber (vencimento)</p>
                    </CardContent>
                </Card>
                
                {/* RENAMED KPI: Comissão Confirmada */}
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Comissão Confirmada</CardTitle>
                        <Wallet className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(monthlyCommissionConfirmed)}</div>
                        <p className="text-xs text-muted-foreground">Comissões recebidas (pagamento)</p>
                    </CardContent>
                </Card>
                
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Despesas</CardTitle>
                        <ArrowDownCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{formatCurrency(monthlyExpenses)}</div>
                        <p className="text-xs text-muted-foreground">Saídas no período</p>
                    </CardContent>
                </Card>
            </div>

            {/* Transactions List */}
            <Card className="col-span-4">
                <CardHeader>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <CardTitle>Transações</CardTitle>
                        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                            <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar transações..."
                                    value={globalFilter}
                                    onChange={(e) => setGlobalFilter(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading && transactions.length === 0 ? (
                        <div className="flex items-center justify-center py-12 text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando transações...
                        </div>
                    ) : (
                        <>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        {table.getHeaderGroups().map((headerGroup) => (
                                            <TableRow key={headerGroup.id} className="hover:bg-transparent border-b border-border">
                                                {headerGroup.headers.map((header) => {
                                                    return (
                                                        <TableHead key={header.id}>
                                                            {header.isPlaceholder
                                                                ? null
                                                                : flexRender(
                                                                    header.column.columnDef.header,
                                                                    header.getContext()
                                                                )}
                                                        </TableHead>
                                                    )
                                                })}
                                            </TableRow>
                                        ))}
                                    </TableHeader>
                                    <TableBody>
                                        {table.getRowModel().rows?.length ? (
                                            table.getRowModel().rows.map((row) => (
                                                <TableRow
                                                    key={row.id}
                                                    data-state={row.getIsSelected() && "selected"}
                                                    className="cursor-pointer hover:bg-muted/50 h-16"
                                                    onClick={() => openEditModal(row.original)}
                                                >
                                                    {row.getVisibleCells().map((cell) => (
                                                        <TableCell key={cell.id}>
                                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                                    Nenhuma transação encontrada.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="flex items-center justify-end space-x-2 py-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => table.previousPage()}
                                    disabled={!table.getCanPreviousPage()}
                                >
                                    Anterior
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => table.nextPage()}
                                    disabled={!table.getCanNextPage()}
                                >
                                    Próximo
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <NewTransactionModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                onSubmit={handleSaveTransaction}
                onDelete={handleDeleteTransaction}
                transactionToEdit={editingTransaction}
            />
        </div>
    )
}