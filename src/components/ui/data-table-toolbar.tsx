import { Cross2Icon } from "@radix-ui/react-icons"
import { Table } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableViewOptions } from "@/components/ui/data-table-view-options"
import { Search } from "lucide-react"

import { DataTableFacetedFilter } from "./data-table-faceted-filter"

export type DataTableFilterConfig = {
    columnId: string
    title: string
    options: {
        label: string
        value: string
        icon?: React.ComponentType<{ className?: string }>
    }[]
}

interface DataTableToolbarProps<TData> {
    table: Table<TData>
    filters: DataTableFilterConfig[]
    globalFilter: string
    setGlobalFilter: (value: string) => void
}

export function DataTableToolbar<TData>({
    table,
    filters,
    globalFilter,
    setGlobalFilter,
}: DataTableToolbarProps<TData>) {
    const isFiltered = table.getState().columnFilters.length > 0

    return (
        <div className="flex items-center justify-between">
            <div className="flex flex-1 items-center space-x-2">
                {/* Global Search Input */}
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar..."
                        value={globalFilter}
                        onChange={(event) => setGlobalFilter(event.target.value)}
                        className="h-8 w-[150px] lg:w-[250px] pl-8"
                    />
                </div>

                {/* Faceted Filters */}
                {filters.map(filter =>
                    table.getColumn(filter.columnId) && (
                        <DataTableFacetedFilter
                            key={filter.columnId}
                            column={table.getColumn(filter.columnId)}
                            title={filter.title}
                            options={filter.options}
                        />
                    )
                )}

                {isFiltered && (
                    <Button
                        variant="ghost"
                        onClick={() => table.resetColumnFilters()}
                        className="h-8 px-2 lg:px-3"
                    >
                        Limpar
                        <Cross2Icon className="ml-2 h-4 w-4" />
                    </Button>
                )}
            </div>
            <DataTableViewOptions table={table} />
        </div>
    )
}