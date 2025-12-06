import { Navigate, Outlet, useNavigate } from "react-router-dom"
import { useAuth } from "@/components/auth-provider"
import { useEffect } from "react"
import { Loader2 } from "lucide-react" // Importando Loader2 para feedback visual

export default function ProtectedRoute() {
    const { user, loading } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (!loading && !user) {
            // Redireciona para login se não estiver autenticado após o carregamento
            navigate("/login", { replace: true })
        }
    }, [loading, user, navigate])

    if (loading) {
        // Se estiver carregando o estado de autenticação, renderiza um spinner mínimo
        // O MainLayout só será renderizado após a autenticação, então este spinner
        // é apenas para o momento entre o carregamento da página e a resolução da sessão.
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!user) {
        // Se não houver usuário, o useEffect já disparou a navegação.
        return null 
    }

    // Se autenticado, renderiza o Outlet (que levará ao MainLayout)
    return <Outlet />
}