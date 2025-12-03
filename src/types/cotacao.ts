export type CotacaoStatus = "cotacao" | "contrato_vistoria" | "cliente" | "cancelado"

export type AssetType = "veiculo" | "residencial" | "carga" | "terceiros" | "outros"

export type CommissionType = "recorrente_indeterminada" | "recorrente_determinada" | "unica"

export type PaymentInstallments = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

// Asset-specific data structures
export type VeiculoAsset = {
    type: "veiculo"
    placa: string
    marca: string
    modelo: string
    ano: number
    cor: string
    chassi: string
    renavam: string
    codigoFipe: string
    valorFipe: number
}

export type ResidencialAsset = {
    type: "residencial"
    valorPatrimonio: number
    endereco: string
}

export type CargaAsset = {
    type: "carga"
    valorTotal: number
}

export type TerceirosAsset = {
    type: "terceiros"
    danosMateriais: number
    danosCorporais: number
    danosMorais: number
    app: number
}

export type OutrosAsset = {
    type: "outros"
    descricao: string
    valorSegurado: number
}

export type Asset = VeiculoAsset | ResidencialAsset | CargaAsset | TerceirosAsset | OutrosAsset

export type Commission = {
    type: CommissionType
    value: number
    installments?: number // For recorrente_determinada
}

export type CotacaoHistory = {
    id: string
    date: Date
    fromStatus: CotacaoStatus
    toStatus: CotacaoStatus
    updatedBy: string
    notes?: string
}

export type Cotacao = {
    id: string
    // Client info
    clientType: "PF" | "PJ"
    cpfCnpj: string
    razaoSocialNome: string
    nomeFantasia?: string
    // Representação
    representacaoId?: string
    representacaoNome?: string
    // Asset
    asset: Asset
    // Payment
    anuidade: number
    parcelas: PaymentInstallments
    // Commission
    comissao: Commission
    // Status
    status: CotacaoStatus
    history: CotacaoHistory[]
    createdAt: Date
    updatedAt: Date
}

export const COTACAO_STATUS_LABELS: Record<CotacaoStatus, string> = {
    cotacao: "Cotação",
    contrato_vistoria: "Contrato/Vistoria",
    cliente: "Cliente",
    cancelado: "Cancelado"
}

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
    veiculo: "Veículo",
    residencial: "Residencial",
    carga: "Carga",
    terceiros: "Terceiros",
    outros: "Outros"
}

export const COMMISSION_TYPE_LABELS: Record<CommissionType, string> = {
    recorrente_indeterminada: "Recorrente Indeterminada",
    recorrente_determinada: "Recorrente Determinada",
    unica: "Única"
}
