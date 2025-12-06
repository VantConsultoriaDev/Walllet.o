import { Outlet, useLocation } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"
import { motion, AnimatePresence } from "framer-motion"
import { useAppInitialization } from "@/hooks/useAppInitialization"
import { AppLoadingPlaceholder } from "./AppLoadingPlaceholder"

export default function MainLayout() {
    const location = useLocation()
    const { isLoading } = useAppInitialization()

    return (
        <div className="flex min-h-screen w-full relative overflow-hidden">
            {/* Animated background gradient - Dark Mode Only */}
            <div className="fixed inset-0 -z-10 dark:bg-gradient-to-br dark:from-slate-900/20 dark:via-background dark:to-blue-900/20 hidden dark:block" />
            <div className="fixed inset-0 -z-10 dark:bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] dark:from-blue-900/10 dark:via-transparent dark:to-transparent hidden dark:block" />

            {/* Desktop Sidebar */}
            <div className="hidden md:block h-screen sticky top-0 z-30">
                <Sidebar />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
                <Header />
                <main className="flex flex-1 flex-col gap-4 p-0 lg:gap-6 lg:p-0 overflow-auto">
                    {isLoading ? (
                        <AppLoadingPlaceholder />
                    ) : (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={location.pathname}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="flex-1 flex flex-col" // Ensure it takes full height/width
                            >
                                <Outlet />
                            </motion.div>
                        </AnimatePresence>
                    )}
                </main>
            </div>
        </div>
    )
}