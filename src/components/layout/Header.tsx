import { useState } from "react"
import { ModeToggle } from "@/components/mode-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/components/auth-provider"
import { ProfileModal } from "@/components/profile-modal"
import { MobileSidebar } from "./MobileSidebar" // Importando o novo componente

export function Header() {
    const { user } = useAuth()
    const [isProfileOpen, setIsProfileOpen] = useState(false)

    return (
        <>
            <header className="flex h-16 items-center gap-4 glass border-b border-white/10 dark:border-white/10 px-4 md:px-6 backdrop-blur-xl">
                {/* Mobile Menu Trigger */}
                <MobileSidebar />

                <div className="w-full flex-1">
                    <h1 className="text-lg font-semibold text-slate-800 dark:text-white">
                        Olá, {user?.name?.split(" ")[0] || "Usuário"}
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <ModeToggle />
                    <div
                        className="flex items-center gap-3 px-3 py-2 rounded-xl glass hover:bg-white/5 transition-all duration-300 cursor-pointer"
                        onClick={() => setIsProfileOpen(true)}
                    >
                        <Avatar className="h-9 w-9 border-2 border-purple-500/30">
                            <AvatarImage src={user?.avatar_url} className="object-cover" />
                            <AvatarFallback className="bg-gradient-primary text-white font-semibold">
                                {user?.name?.charAt(0) || "U"}
                            </AvatarFallback>
                        </Avatar>
                        <div className="hidden md:block">
                            <p className="text-sm font-medium">{user?.name || "Demo User"}</p>
                        </div>
                    </div>
                </div>
            </header>

            <ProfileModal
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
            />
        </>
    )
}