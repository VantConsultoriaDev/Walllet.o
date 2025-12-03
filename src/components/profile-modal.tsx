import { useState, useRef } from "react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Camera, User, Mail } from "lucide-react"

interface ProfileModalProps {
    isOpen: boolean
    onClose: () => void
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
    const { user, updateProfile, verifyPassword } = useAuth()
    const [name, setName] = useState(user?.name || "")
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar_url || null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setAvatarFile(file)
            const objectUrl = URL.createObjectURL(file)
            setAvatarPreview(objectUrl)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(null)

        try {
            // If changing password, verify current password first
            if (newPassword) {
                if (!currentPassword) {
                    setError("Digite a senha atual para alterar a senha")
                    setLoading(false)
                    return
                }
                const { valid, error: verifyError } = await verifyPassword(currentPassword)
                if (verifyError || !valid) {
                    setError("Senha atual incorreta")
                    setLoading(false)
                    return
                }
            }

            // In a real app, we would upload the file to storage here
            // For mock, we'll just use the object URL if a file was selected
            const avatarUrl = avatarFile ? avatarPreview : undefined

            const { error: updateError } = await updateProfile({
                name,
                password: newPassword || undefined,
                avatar_url: avatarUrl || undefined
            })

            if (updateError) {
                setError(updateError.message)
            } else {
                setSuccess("Perfil atualizado com sucesso!")
                setCurrentPassword("")
                setNewPassword("")
                setTimeout(() => {
                    onClose()
                    setSuccess(null)
                }, 1500)
            }
        } catch (err) {
            setError("Ocorreu um erro ao atualizar o perfil")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <DialogHeader>
                    <DialogTitle>Editar Perfil</DialogTitle>
                    <DialogDescription>
                        Faça alterações em seu perfil aqui. Clique em salvar quando terminar.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-6 py-4">
                        {/* Avatar Section */}
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <Avatar className="h-24 w-24 border-4 border-slate-100 dark:border-slate-800 shadow-xl">
                                    <AvatarImage src={avatarPreview || ""} className="object-cover" />
                                    <AvatarFallback className="text-2xl bg-slate-100 dark:bg-slate-800">
                                        {name?.charAt(0) || "U"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera className="h-8 w-8 text-white" />
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">Clique para alterar a foto</p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="name" className="flex items-center gap-2">
                                <User className="h-4 w-4" /> Nome
                            </Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="col-span-3"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email" className="flex items-center gap-2 text-muted-foreground">
                                <Mail className="h-4 w-4" /> Email
                            </Label>
                            <Input
                                id="email"
                                value={user?.email || ""}
                                disabled
                                className="col-span-3 bg-slate-100 dark:bg-slate-800/50"
                            />
                        </div>

                        <div className="space-y-4 border-t pt-4 border-slate-100 dark:border-slate-800">
                            <h4 className="text-sm font-medium text-muted-foreground">Alterar Senha (Opcional)</h4>
                            <div className="grid gap-2">
                                <Label htmlFor="current-password">Senha Atual</Label>
                                <Input
                                    id="current-password"
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="Digite para confirmar alterações"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="new-password">Nova Senha</Label>
                                <Input
                                    id="new-password"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Deixe em branco para manter a atual"
                                />
                            </div>
                        </div>

                        {error && (
                            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-900/50">
                                {error}
                            </p>
                        )}
                        {success && (
                            <p className="text-sm text-green-600 bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-200 dark:border-green-900/50">
                                {success}
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Alterações
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
