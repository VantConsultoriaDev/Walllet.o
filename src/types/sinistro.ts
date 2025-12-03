export type ClaimStatus = "aberto" | "analise" | "pendencia" | "concluido" | "negado"

export type ClaimType = "roubo_furto" | "colisao_tombamento" | "danos_natureza" | "incendio" | "terceiros"

export type ClaimHistory = {
    id: string
    date: Date
    fromStatus: ClaimStatus
    toStatus: ClaimStatus
    updatedBy: string
    notes?: string
}

export type ThirdPartyAssetType = "vehicle" | "property"

export type ThirdPartyAsset = {
    type: ThirdPartyAssetType
    // Vehicle fields
    plate?: string
    brand?: string
    model?: string
    year?: number
    color?: string
    // Property fields
    description?: string
}

export type ThirdParty = {
    id: string
    name: string
    cpf: string
    asset: ThirdPartyAsset
}

export type ClaimComment = {
    id: string
    text: string
    createdAt: Date
    createdBy: string
}

export type Claim = {
    id: string
    clientId: string
    clientName: string
    clientPlate: string
    // Driver information
    driverName: string
    driverCpf: string
    // Third parties
    thirdParties: ThirdParty[]
    // Legacy fields for backward compatibility
    thirdPartyName?: string
    thirdPartyPlate?: string
    type: ClaimType
    date: Date
    time: string
    status: ClaimStatus
    description: string
    history: ClaimHistory[]
    comments: ClaimComment[]
    createdAt: Date
    updatedAt: Date
}

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
    aberto: "Aberto",
    analise: "Em Análise",
    pendencia: "Pendência",
    concluido: "Concluído",
    negado: "Negado"
}

export const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
    roubo_furto: "Roubo/Furto",
    colisao_tombamento: "Colisão/Tombamento",
    danos_natureza: "Danos da Natureza",
    incendio: "Incêndio",
    terceiros: "Terceiros"
}
