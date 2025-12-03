import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { User, Session } from "@/lib/supabase"

type AuthContextType = {
    user: User | null
    session: Session | null
    loading: boolean
    signIn: (email: string, password: string) => Promise<{ error: any }>
    signOut: () => Promise<void>
    updateProfile: (updates: { name?: string; avatar_url?: string; password?: string }) => Promise<{ error: any }>
    verifyPassword: (password: string) => Promise<{ valid: boolean; error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Check for active session on mount (mock behavior)
        const checkSession = async () => {
            try {
                // In a real app, we'd check supabase.auth.getSession()
                // For this mock, we'll start unauthenticated
                setLoading(false)
            } catch (error) {
                console.error(error)
                setLoading(false)
            }
        }

        checkSession()
    }, [])

    const signIn = async (email: string, password: string) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                return { error }
            }

            if (data.user && data.session) {
                setUser(data.user)
                setSession({ ...data.session, user: data.user })
                return { error: null }
            }

            return { error: { message: "An unexpected error occurred" } }
        } catch (error) {
            return { error }
        }
    }

    const signOut = async () => {
        await supabase.auth.signOut()
        setUser(null)
        setSession(null)
    }

    const updateProfile = async (updates: { name?: string; avatar_url?: string; password?: string }) => {
        try {
            const { data, error } = await (supabase.auth as any).updateUser({
                data: {
                    name: updates.name,
                    avatar_url: updates.avatar_url
                },
                password: updates.password
            })

            if (error) {
                return { error }
            }

            if (data.user) {
                setUser(data.user)
                if (session) {
                    setSession({ ...session, user: data.user })
                }
                return { error: null }
            }
            return { error: { message: "Failed to update profile" } }
        } catch (error) {
            return { error }
        }
    }

    const verifyPassword = async (password: string) => {
        try {
            const { data, error } = await (supabase.auth as any).verifyPassword(password)
            if (error) return { valid: false, error }
            return { valid: data.valid, error: null }
        } catch (error) {
            return { valid: false, error }
        }
    }

    return (
        <AuthContext.Provider value={{ user, session, loading, signIn, signOut, updateProfile, verifyPassword }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}
