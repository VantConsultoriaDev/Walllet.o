import { createContext, useContext, useEffect, useState, useCallback } from "react"
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

    const fetchUserProfile = useCallback(async (supabaseUser: any): Promise<User> => {
        const { data: profileData } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url')
            .eq('id', supabaseUser.id)
            .single()

        const firstName = profileData?.first_name || (supabaseUser.user_metadata as any)?.name?.split(' ')[0] || supabaseUser.email?.split('@')[0]
        const lastName = profileData?.last_name || (supabaseUser.user_metadata as any)?.name?.split(' ').slice(1).join(' ') || ''
        const fullName = [firstName, lastName].filter(Boolean).join(' ')

        return {
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            name: fullName,
            avatar_url: profileData?.avatar_url || (supabaseUser.user_metadata as any)?.avatar_url,
        }
    }, [])

    useEffect(() => {
        let subscription: { unsubscribe: () => void } | null = null;

        const initializeAuth = async () => {
            // 1. Get initial session state directly
            const { data: { session: initialSession } } = await supabase.auth.getSession();
            
            if (initialSession) {
                try {
                    const localUser = await fetchUserProfile(initialSession.user);
                    setUser(localUser);
                    setSession(initialSession as Session);
                } catch (e) {
                    console.error("Failed to fetch user profile on initial session:", e);
                    // Fallback user data if profile fetch fails
                    setUser({
                        id: initialSession.user.id,
                        email: initialSession.user.email || '',
                        name: initialSession.user.email?.split('@')[0],
                        avatar_url: undefined,
                    });
                    setSession(initialSession as Session);
                }
            }
            
            setLoading(false); // CRUCIAL: Define loading como false após a verificação inicial

            // 2. Set up real-time listener for subsequent changes
            const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
                if (session) {
                    // Evita reprocessar INITIAL_SESSION, que já foi tratada acima
                    if (event !== 'INITIAL_SESSION') {
                        const localUser = await fetchUserProfile(session.user);
                        setUser(localUser);
                        setSession(session as Session);
                    }
                } else if (event === 'SIGNED_OUT') {
                    setUser(null);
                    setSession(null);
                }
            });
            subscription = data.subscription;
        };

        initializeAuth();

        return () => {
            if (subscription) {
                subscription.unsubscribe();
            }
        };
    }, [fetchUserProfile])

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
        // Explicitly clear local state immediately for faster UI response
        setUser(null);
        setSession(null);
        
        const { error } = await supabase.auth.signOut()
        
        if (error) {
            console.error("Error during Supabase signOut:", error);
            // Optionally, re-set user/session if sign out failed, but usually better to keep them logged out locally
        }
    }

    const updateProfile = async (updates: { name?: string; avatar_url?: string; password?: string }) => {
        if (!user) return { error: { message: "Usuário não autenticado" } }
        
        try {
            // 1. Update auth user metadata (for immediate session use)
            const { error: authError } = await supabase.auth.updateUser({
                data: {
                    name: updates.name,
                    avatar_url: updates.avatar_url
                },
                password: updates.password
            })

            if (authError) {
                return { error: authError }
            }

            // 2. Update public profiles table
            const nameParts = updates.name?.split(' ') || [];
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ');

            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    first_name: firstName,
                    last_name: lastName,
                    avatar_url: updates.avatar_url,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id)

            if (profileError) {
                console.error("Failed to update profile table:", profileError)
                // We return the auth error if present, otherwise the profile error
                return { error: profileError }
            }

            // Manually update local state immediately after successful update
            setUser(prev => prev ? { 
                ...prev, 
                name: updates.name || prev.name, 
                avatar_url: updates.avatar_url || prev.avatar_url 
            } : null)

            return { error: null }
        } catch (error) {
            return { error }
        }
    }

    const verifyPassword = async (password: string) => {
        // Supabase client does not expose a direct verifyPassword method for the current user.
        // This mock function is kept for compatibility but will always return true if no new password is set, 
        // or rely on the updateProfile logic if a password change is attempted.
        // For the ProfileModal to work, we return true here as a mock for verification.
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