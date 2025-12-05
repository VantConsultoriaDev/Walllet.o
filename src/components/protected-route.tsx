import { Navigate, Outlet, useNavigate } from "react-router-dom"
import { useAuth } from "@/components/auth-provider"
import { useEffect } from "react"

export default function ProtectedRoute() {
    const { user, loading } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (!loading && !user) {
            // Force navigation if not authenticated after loading
            navigate("/login", { replace: true })
        }
    }, [loading, user, navigate])

    if (loading) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>
    }

    if (!user) {
        // Return null or a placeholder while the useEffect handles navigation
        return null 
    }

    return <Outlet />
}