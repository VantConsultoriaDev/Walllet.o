import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    LayoutDashboard,
    Calendar,
    Users,
    DollarSign,
    FileText,
    ShieldAlert,
    Briefcase,
    LogOut,
    ChevronLeft,
    ChevronRight,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"
import { Logo } from "@/components/Logo"
import { useAuth } from "@/components/auth-provider" // Importando useAuth para o logout

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> { }

export function Sidebar({ className }: SidebarProps) {
    const location = useLocation()
    const { signOut } = useAuth()
    
    // Use local storage or context for persistence if needed, but for now, local state is fine.
    // We only allow collapsing on screens larger than mobile (md:).
    const [isCollapsed, setIsCollapsed] = useState(false)

    const items = [
        { name: "Dashboard", icon: LayoutDashboard, path: "/" },
        { name: "Agenda", icon: Calendar, path: "/agenda" },
        { name: "Clientes", icon: Users, path: "/clientes" },
        { name: "Financeiro", icon: DollarSign, path: "/financeiro" },
        { name: "Sinistros", icon: ShieldAlert, path: "/sinistros" },
        { name: "Cotações", icon: FileText, path: "/cotacoes" },
        { name: "Representações", icon: Briefcase, path: "/representacoes" },
    ]

    // Determine if we are in a mobile context (where className might override width)
    const isMobile = className?.includes('h-full') && !className?.includes('md:block');

    return (
        <motion.div
            animate={{ width: isMobile ? 280 : (isCollapsed ? 80 : 280) }}
            transition={{
                duration: 0.3,
                ease: [0.4, 0.0, 0.2, 1],
            }}
            style={{
                willChange: "width",
                backfaceVisibility: "hidden",
                transform: "translateZ(0)",
            }}
            className={cn("relative flex flex-col h-screen glass border-r border-white/10 dark:border-white/10", className)}
        >
            <div className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
                <div className="px-3 py-2">
                    <div className={cn("mb-6 flex items-center gap-3", (isCollapsed && !isMobile) ? "justify-center px-0" : "px-4")}>
                        <div className="shrink-0 transition-all duration-300">
                            <Logo iconSize={8} variant={(isCollapsed && !isMobile) ? 'icon' : 'full'} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        {items.map((item, index) => {
                            const isActive = location.pathname === item.path
                            return (
                                <motion.div
                                    key={item.path}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Button
                                        variant={isActive ? "secondary" : "ghost"}
                                        className={cn(
                                            "w-full group relative overflow-hidden transition-all duration-300",
                                            (isCollapsed && !isMobile) ? "justify-center px-0" : "justify-start",
                                            isActive && "bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30"
                                        )}
                                        asChild
                                    >
                                        <Link to={item.path}>
                                            {isActive && (
                                                <motion.div
                                                    layoutId="activeTab"
                                                    className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10"
                                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                />
                                            )}
                                            <item.icon className={cn(
                                                "h-5 w-5 transition-all duration-300 shrink-0",
                                                isActive ? "text-purple-400" : "text-muted-foreground group-hover:text-purple-400",
                                                !(isCollapsed && !isMobile) && "mr-3"
                                            )} />
                                            <AnimatePresence>
                                                {!(isCollapsed && !isMobile) && (
                                                    <motion.span
                                                        initial={{ opacity: 0, width: 0 }}
                                                        animate={{ opacity: 1, width: "auto" }}
                                                        exit={{ opacity: 0, width: 0 }}
                                                        className={cn(
                                                            "relative z-10 transition-all duration-300 whitespace-nowrap overflow-hidden",
                                                            isActive ? "text-white font-semibold" : "group-hover:text-white"
                                                        )}
                                                    >
                                                        {item.name}
                                                    </motion.span>
                                                )}
                                            </AnimatePresence>
                                        </Link>
                                    </Button>
                                </motion.div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Collapse Toggle Button (Desktop Only) */}
            {!isMobile && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-20 h-6 w-6 rounded-full border border-white/10 bg-background shadow-md z-50 hover:bg-accent"
                >
                    {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
                </Button>
            )}

            {/* Logout Button at Bottom */}
            <div className="p-3 mt-auto border-t border-white/10">
                <Button
                    variant="ghost"
                    onClick={signOut}
                    className={cn(
                        "w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-300",
                        (isCollapsed && !isMobile) ? "justify-center px-0" : "justify-start"
                    )}
                >
                    <LogOut className={cn("h-5 w-5 shrink-0", !(isCollapsed && !isMobile) && "mr-3")} />
                    <AnimatePresence>
                        {!(isCollapsed && !isMobile) && (
                            <motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: "auto" }}
                                exit={{ opacity: 0, width: 0 }}
                                className="whitespace-nowrap overflow-hidden"
                            >
                                Sair
                            </motion.span>
                        )}
                    </AnimatePresence>
                </Button>
            </div>
        </motion.div>
    )
}