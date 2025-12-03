import { Table } from "@tanstack/react-table"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableFacetedFilter } from "./data-table-faceted-filter"

export interface DataTableFilterOption {
    label: string
    value: string
    icon?: React.ComponentType<{ className?: string }>
}

export interface DataTableFilterConfig {
    columnId: string
    title: string
    options: DataTableFilterOption[]
}

interface DataTableToolbarProps<TData> {
    table: Table<TData>
    filters?: DataTableFilterConfig[]
}

export function DataTableToolbar<TData>({
    table,
    filters,
}: DataTableToolbarProps<TData>) {
    const isFiltered = table.getState().columnFilters.length > 0 || !!table.getState().globalFilter

    return (
        <div className="flex items-center justify-between">
            <div className="flex flex-1 items-center space-x-2">
                <Input
                    placeholder="Buscar..."
                    value={(table.getState().globalFilter as string) ?? ""}
                    onChange={(event) => table.setGlobalFilter(event.target.value)}
                    className="h-8 w-[150px] lg:w-[250px]"
                />
                {filters?.map((filter) => {
                    const column = table.getColumn(filter.columnId)
                    return (
                        column && (
                            <DataTableFacetedFilter
                                key={filter.columnId}
                                column={column}
                                title={filter.title}
                                options={filter.options}
                            />
                        )
                    )
                })}
                {isFiltered && (
                    <Button
                        variant="ghost"
                        onClick={() => {
                            table.resetColumnFilters()
                            table.setGlobalFilter("")
                        }}
                        className="h-8 px-2 lg:px-3"
                    >
                        Limpar
                        <X className="ml-2 h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    )
}
