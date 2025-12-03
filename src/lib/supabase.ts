
export type User = {
    id: string
    email: string
    name: string
    avatar_url?: string
}

export type Session = {
    user: User
    access_token: string
}

class MockSupabaseClient {
    private currentUser = {
        id: "1",
        email: "demo@wallet.o",
        name: "Demo User",
        avatar_url: undefined as string | undefined
    }
    private currentPassword = "demo"

    auth = {
        signInWithPassword: async ({ email, password }: any) => {
            // Simulate network delay
            await new Promise((resolve) => setTimeout(resolve, 1000))

            if (email === this.currentUser.email && password === this.currentPassword) {
                return {
                    data: {
                        user: { ...this.currentUser },
                        session: {
                            access_token: "mock-token",
                        },
                    },
                    error: null,
                }
            }

            return {
                data: { user: null, session: null },
                error: { message: "Invalid credentials" },
            }
        },
        signOut: async () => {
            await new Promise((resolve) => setTimeout(resolve, 500))
            return { error: null }
        },
        getSession: async () => {
            // For simplicity in this mock, we won't persist session automatically 
            // without a more complex setup, but AuthProvider will handle state.
            return { data: { session: null }, error: null }
        },
        updateUser: async (updates: { data?: { name?: string; avatar_url?: string }, password?: string }) => {
            await new Promise((resolve) => setTimeout(resolve, 800))

            if (updates.data?.name) {
                this.currentUser.name = updates.data.name
            }
            if (updates.data?.avatar_url) {
                this.currentUser.avatar_url = updates.data.avatar_url
            }
            if (updates.password) {
                this.currentPassword = updates.password
            }

            return {
                data: { user: { ...this.currentUser } },
                error: null
            }
        },
        verifyPassword: async (password: string) => {
            await new Promise((resolve) => setTimeout(resolve, 500))
            return {
                data: { valid: password === this.currentPassword },
                error: null
            }
        }
    }
}

export const supabase = new MockSupabaseClient()
