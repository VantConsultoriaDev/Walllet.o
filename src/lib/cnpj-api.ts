/**
 * Fetches company data from BrasilAPI using CNPJ
 * @param cnpj - CNPJ number (can include formatting characters)
 * @returns Company data or null if not found
 */
export async function fetchCNPJData(cnpj: string) {
    try {
        // Remove formatting characters
        const cleanCNPJ = cnpj.replace(/\D/g, '')

        if (cleanCNPJ.length !== 14) {
            throw new Error('CNPJ deve conter 14 dígitos')
        }

        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`)

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('CNPJ não encontrado')
            }
            throw new Error('Erro ao buscar dados do CNPJ')
        }

        const data = await response.json()

        return {
            cnpj: data.cnpj,
            razaoSocial: data.razao_social || data.nome_fantasia,
            nomeFantasia: data.nome_fantasia || data.razao_social,
            email: data.email || '',
            phone: data.ddd_telefone_1 ? `(${data.ddd_telefone_1.slice(0, 2)}) ${data.ddd_telefone_1.slice(2)}` : '',
            address: formatAddress(data),
            responsavel: data.qsa?.[0]?.nome_socio || '',
            contatoResponsavel: ''
        }
    } catch (error) {
        console.error('Error fetching CNPJ data:', error)
        throw error
    }
}

/**
 * Formats address from BrasilAPI response
 */
function formatAddress(data: any): string {
    const parts = [
        data.descricao_tipo_de_logradouro,
        data.logradouro,
        data.numero,
        data.complemento,
        data.bairro,
        data.municipio,
        data.uf
    ].filter(Boolean)

    return parts.join(', ')
}

/**
 * Validates CNPJ format
 */
export function isValidCNPJ(cnpj: string): boolean {
    const cleanCNPJ = cnpj.replace(/\D/g, '')

    if (cleanCNPJ.length !== 14) {
        return false
    }

    // Check if all digits are the same
    if (/^(\d)\1+$/.test(cleanCNPJ)) {
        return false
    }

    // Validate check digits
    let size = cleanCNPJ.length - 2
    let numbers = cleanCNPJ.substring(0, size)
    const digits = cleanCNPJ.substring(size)
    let sum = 0
    let pos = size - 7

    for (let i = size; i >= 1; i--) {
        sum += parseInt(numbers.charAt(size - i)) * pos--
        if (pos < 2) pos = 9
    }

    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    if (result !== parseInt(digits.charAt(0))) {
        return false
    }

    size = size + 1
    numbers = cleanCNPJ.substring(0, size)
    sum = 0
    pos = size - 7

    for (let i = size; i >= 1; i--) {
        sum += parseInt(numbers.charAt(size - i)) * pos--
        if (pos < 2) pos = 9
    }

    result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    if (result !== parseInt(digits.charAt(1))) {
        return false
    }

    return true
}

/**
 * Formats CNPJ with mask: 00.000.000/0000-00
 */
export function formatCNPJ(cnpj: string): string {
    const cleanCNPJ = cnpj.replace(/\D/g, '')

    if (cleanCNPJ.length !== 14) {
        return cnpj
    }

    return cleanCNPJ.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        '$1.$2.$3/$4-$5'
    )
}

/**
 * Formats CPF with mask: 000.000.000-00
 */
export function formatCPF(cpf: string): string {
    const cleanCPF = cpf.replace(/\D/g, '')

    if (cleanCPF.length !== 11) {
        return cpf
    }

    return cleanCPF.replace(
        /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
        '$1.$2.$3-$4'
    )
}
