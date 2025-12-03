import { supabase as realSupabase } from "@/integrations/supabase/client"

// Define types based on the real Supabase client structure for consistency
export type User = {
    id: string
    email: string
    name?: string
    avatar_url?: string
}

export type Session = {
    user: User
    access_token: string
}

// Export the real Supabase client
export const supabase = realSupabase

// Note: The mock implementation is removed, but the types are kept for components that rely on them.