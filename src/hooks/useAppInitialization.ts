import { useDashboardDataContext } from "@/hooks/data/DashboardDataProvider"
import { useMemo } from "react"

/**
 * Consolida o estado de carregamento de todos os hooks de dados essenciais.
 * Agora monitora apenas o DashboardDataProvider.
 */
export function useAppInitialization() {
    const { loading, isRefetching, refetchData } = useDashboardDataContext()

    const isLoading = useMemo(() => {
        return loading
    }, [loading])

    return { isLoading, isRefetching, refetchData }
}