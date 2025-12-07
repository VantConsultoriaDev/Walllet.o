import { useClients } from "@/hooks/data/useClients"
import { useRepresentations } from "@/hooks/data/useRepresentations"
import { useTransactions } from "@/hooks/data/useTransactions"
import { useQuotations } from "@/hooks/data/useQuotations"
import { useClaims } from "@/hooks/data/useClaims"
import { useEvents } from "@/hooks/data/useEvents"
import { useBoletos } from "@/hooks/data/useBoletos"
// import { useVehicles } from "@/hooks/data/useVehicles" // REMOVIDO
import { useMemo } from "react"

/**
 * Consolida o estado de carregamento de todos os hooks de dados essenciais.
 * Isso permite que o MainLayout espere que todos os dados estejam prontos antes
 * de renderizar as páginas internas, garantindo uma UX mais fluida.
 */
export function useAppInitialization() {
    const { loading: clientsLoading } = useClients()
    const { loading: repsLoading } = useRepresentations()
    const { loading: transactionsLoading } = useTransactions()
    const { loading: quotationsLoading } = useQuotations()
    const { loading: claimsLoading } = useClaims()
    const { loading: eventsLoading } = useEvents()
    const { loading: boletosLoading } = useBoletos()
    // const { loading: vehiclesLoading } = useVehicles() // REMOVIDO

    const isLoading = useMemo(() => {
        return clientsLoading || repsLoading || transactionsLoading || quotationsLoading || claimsLoading || eventsLoading || boletosLoading // || vehiclesLoading
    }, [clientsLoading, repsLoading, transactionsLoading, quotationsLoading, claimsLoading, eventsLoading, boletosLoading])

    return { isLoading }
}