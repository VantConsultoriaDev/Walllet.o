import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"

export default function MainLayout() {
    return (
        <div className="flex min-h-screen w-full relative overflow-hidden">
            {/* Animated background gradient - Dark Mode Only */}
            <div className="fixed inset-0 -z-10 dark:bg-gradient-to-br dark:from-slate-900/20 dark:via-background dark:to-blue-900/20 hidden dark:block" />
            <div className="fixed inset-0 -z-10 dark:bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] dark:from-blue-900/10 dark:via-transparent dark:to-transparent hidden dark:block" />

            <div className="hidden md:block h-screen sticky top-0 z-30">
                <Sidebar />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
                <Header />
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
