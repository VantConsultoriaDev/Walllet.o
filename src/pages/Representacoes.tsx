import { useState } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, ExternalLink, Loader2 } from "lucide-react"
import { NewRepresentacaoModal, type NewRepresentacaoFormData, type Partner } from "@/components/representacoes/new-representacao-modal"
import { useRepresentations } from "@/hooks/data/useRepresentations"

export default function Representacoes() {
    const { partners, loading, addPartner, updatePartner } = useRepresentations()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingPartner, setEditingPartner] = useState<Partner | null>(null)

    const handleNewRepresentacao = async (formData: NewRepresentacaoFormData) => {
        if (editingPartner) {
            // Update existing partner
            const updatedPartner: Partner = {
                ...editingPartner,
                name: formData.nome,
                type: formData.tipo,
                website: formData.site,
                // NOTE: Logo handling needs proper Supabase Storage implementation later
                logo: formData.logo ? URL.createObjectURL(formData.logo) : editingPartner.logo,
            }
            await updatePartner(updatedPartner)
            setEditingPartner(null)
        } else {
            // Create new partner
            await addPartner({
                nome: formData.nome,
                tipo: formData.tipo,
                site: formData.site,
                logo: formData.logo,
            })
        }
    }

    const handleCardClick = (partner: Partner) => {
        setEditingPartner(partner)
        setIsModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        setEditingPartner(null)
    }

    const handleNewClick = () => {
        setEditingPartner(null)
        setIsModalOpen(true)
    }

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Representações</h2>
                <div className="flex items-center space-x-2">
                    <Button
                        className="group transition-all duration-300 hover:scale-105 hover:shadow-lg"
                        onClick={handleNewClick}
                    >
                        <Plus className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" />
                        Nova Representação
                    </Button>
                </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
                {partners.map((partner) => (
                    <Card
                        key={partner.id}
                        className="overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
                        onClick={() => handleCardClick(partner)}
                    >
                        <CardHeader>
                            {partner.logo && (
                                <div className="mb-4 flex justify-center">
                                    <div className="h-24 w-24 rounded-lg border-2 border-border bg-muted/30 p-2 flex items-center justify-center">
                                        <img
                                            src={partner.logo}
                                            alt={partner.name}
                                            className="max-h-full max-w-full object-contain"
                                        />
                                    </div>
                                </div>
                            )}
                            <CardTitle className="text-center">{partner.name}</CardTitle>
                            <CardDescription className="text-center">{partner.type}</CardDescription>
                        </CardHeader>
                        <CardFooter className="flex justify-center">
                            {partner.website && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    asChild
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <a href={partner.website} target="_blank" rel="noreferrer">
                                        <ExternalLink className="mr-2 h-4 w-4" /> Site
                                    </a>
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                ))}
            </div>

            <NewRepresentacaoModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSubmit={handleNewRepresentacao}
                editingPartner={editingPartner}
            />
        </div>
    )
}