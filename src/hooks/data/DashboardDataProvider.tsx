import React, { createContext, useContext, useMemo } from 'react'
import { useDashboardData, RawDashboardData } from './useDashboardData'

interface DashboardDataContextType {
    data: RawDashboardData | null
    loading: boolean
    isRefetching: boolean
    refetchData: () => Promise<void>
}

const DashboardDataContext = createContext<DashboardDataContextType | undefined>(undefined)

export function DashboardDataProvider({ children }: { children: React.ReactNode }) {
    const { data, loading, isRefetching, fetchData } = useDashboardData()

    const contextValue = useMemo(() => ({
        data,
        loading,
        isRefetching,
        refetchData: fetchData,
    }), [data, loading, isRefetching, fetchData])

    return (
        <DashboardDataContext.Provider value={contextValue}>
            {children}
        </DashboardDataContext.Provider>
    )
}

export const useDashboardDataContext = () => {
    const context = useContext(DashboardDataContext)
    if (context === undefined) {
        throw new Error("useDashboardDataContext must be used within a DashboardDataProvider")
    }
    return context
}