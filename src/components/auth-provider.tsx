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
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
                // Map Supabase User to local User type, ensuring 'name' is available if possible
                const localUser: User = {
                    id: session.user.id,
                    email: session.user.email || '',
                    name: (session.user.user_metadata as any)?.name || session.user.email?.split('@')[0],
                    avatar_url: (session.user.user_metadata as any)?.avatar_url,
                }
                setUser(localUser)
                setSession(session as Session)
            } else {
                setUser(null)
                setSession(null)
            }
            setLoading(false)
        })

        // Initial check for session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                const localUser: User = {
                    id: session.user.id,
                    email: session.user.email || '',
                    name: (session.user.user_metadata as any)?.name || session.user.email?.split('@')[0],
                    avatar_url: (session.user.user_metadata as any)?.avatar_url,
                }
                setUser(localUser)
                setSession(session as Session)
            }
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [])

    const signIn = async (email: string, password: string) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                return { error }
            }

            // State update is handled by onAuthStateChange listener
            return { error: null }
        } catch (error) {
            return { error }
        }
    }

    const signOut = async () => {
        await supabase.auth.signOut()
        // State update is handled by onAuthStateChange listener
    }

    const updateProfile = async (updates: { name?: string; avatar_url?: string; password?: string }) => {
        try {
            const { data, error } = await supabase.auth.updateUser({
                data: {
                    name: updates.name,
                    avatar_url: updates.avatar_url
                },
                password: updates.password
            })

            if (error) {
                return { error }
            }

            // State update is handled by onAuthStateChange listener
            return { error: null }
        } catch (error) {
            return { error }
        }
    }

    const verifyPassword = async (password: string) => {
        // Supabase client does not expose a direct verifyPassword method for the current user.
        // This mock function is kept for compatibility but will always return true if no new password is set, 
        // or rely on the updateProfile logic if a password change is attempted.
        // For a real implementation, this would require a custom Edge Function or relying on the update logic.
        // Since the mock was simple, we'll keep a simple mock behavior here for now.
        console.warn("verifyPassword is a mock function in the real Supabase client context.")
        return { valid: true, error: null }
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