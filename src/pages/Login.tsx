import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, TrendingUp, DollarSign, Sun, Moon } from "lucide-react"
import { motion } from "framer-motion"
import { Logo } from "@/components/Logo"
import { useTheme } from "@/components/theme-provider"

export default function Login() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { signIn } = useAuth()
    const navigate = useNavigate()
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { error } = await signIn(email, password)

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            navigate("/")
        }
    }

    // Generate random positions for background elements
    const backgroundElements = Array.from({ length: 20 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 5,
        duration: 10 + Math.random() * 10,
        type: i % 3 === 0 ? "dollar" : "arrow",
        scale: 0.5 + Math.random() * 0.5,
    }))

    return (
        <div className="flex h-screen items-center justify-center relative overflow-hidden bg-white dark:bg-slate-950 transition-colors duration-500">
            {/* Theme Toggle */}
            <div className="absolute top-4 right-4 z-50">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="rounded-full bg-white/10 backdrop-blur-sm border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-orange-500" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-blue-400" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </div>

            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {mounted && backgroundElements.map((el) => (
                    <motion.div
                        key={el.id}
                        initial={{
                            y: "120vh",
                            x: `${el.x}vw`,
                            opacity: 0
                        }}
                        animate={{
                            y: "-20vh",
                            opacity: [0, 0.8, 0]
                        }}
                        transition={{
                            duration: el.duration,
                            repeat: Infinity,
                            delay: el.delay,
                            ease: "linear"
                        }}
                        className="absolute"
                        style={{ scale: el.scale }}
                    >
                        {el.type === "arrow" ? (
                            <TrendingUp
                                className="w-12 h-12 text-emerald-500/20 dark:text-emerald-400/20"
                                strokeWidth={1.5}
                            />
                        ) : (
                            <DollarSign
                                className="w-8 h-8 text-green-600/30 dark:text-green-400/30"
                                strokeWidth={2}
                            />
                        )}
                    </motion.div>
                ))}
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-md px-4"
            >
                <Card className="w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-slate-200 dark:border-slate-800 shadow-2xl">
                    <CardHeader className="space-y-4 text-center pb-8">
                        <div className="mx-auto mb-4 scale-125">
                            <Logo iconSize={10} variant="full" />
                        </div>
                        <CardDescription className="text-base text-slate-600 dark:text-slate-400">
                            Acesse sua carteira segura
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 font-semibold">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="seu@email.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500 transition-all h-11"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 font-semibold">Senha</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500 transition-all h-11"
                                />
                            </div>
                            {error && (
                                <motion.p
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 font-medium"
                                >
                                    {error}
                                </motion.p>
                            )}
                        </CardContent>
                        <CardFooter className="flex flex-col gap-4 pt-4">
                            <Button
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 shadow-lg shadow-blue-500/20 transition-all"
                                type="submit"
                                disabled={loading}
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Entrar
                            </Button>
                            <div className="text-center text-sm text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-100 dark:border-slate-800 w-full">
                                <p className="font-medium mb-2 text-slate-700 dark:text-slate-300">Credenciais de demonstração:</p>
                                <div className="flex justify-center gap-4 font-mono text-xs">
                                    <span className="bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">demo@wallet.o</span>
                                    <span className="bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">demo</span>
                                </div>
                            </div>
                        </CardFooter>
                    </form>
                </Card>
            </motion.div>
        </div>
    )
}
