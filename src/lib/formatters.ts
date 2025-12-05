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
            phone: data.ddd_telefone_1 ? formatPhone(data.ddd_telefone_1) : '',
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

    if (cleanCNPJ.length > 14) {
        return cleanCNPJ.replace(
            /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*$/,
            '$1.$2.$3/$4-$5'
        )
    }
    
    return cleanCNPJ.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})$/,
        (match, p1, p2, p3, p4, p5) => {
            let formatted = `${p1}.${p2}.${p3}/${p4}`
            if (p5) formatted += `-${p5}`
            return formatted
        }
    )
}

/**
 * Formats CPF with mask: 000.000.000-00
 */
export function formatCPF(cpf: string): string {
    const cleanCPF = cpf.replace(/\D/g, '')

    if (cleanCPF.length > 11) {
        return cleanCPF.replace(
            /^(\d{3})(\d{3})(\d{3})(\d{2}).*$/,
            '$1.$2.$3-$4'
        )
    }

    return cleanCPF.replace(
        /^(\d{3})(\d{3})(\d{3})(\d{0,2})$/,
        (match, p1, p2, p3, p4) => {
            let formatted = `${p1}.${p2}.${p3}`
            if (p4) formatted += `-${p4}`
            return formatted
        }
    )
}

/**
 * Formats phone number with mask: (00) 00000-0000 or (00) 0000-0000
 */
export function formatPhone(phone: string): string {
    const cleanPhone = phone.replace(/\D/g, '').substring(0, 11)

    if (cleanPhone.length <= 10) {
        // (00) 0000-0000
        return cleanPhone.replace(
            /^(\d{2})(\d{4})(\d{0,4})$/,
            (match, p1, p2, p3) => `(${p1}) ${p2}${p3 ? `-${p3}` : ''}`
        )
    } else {
        // (00) 00000-0000
        return cleanPhone.replace(
            /^(\d{2})(\d{5})(\d{4})$/,
            '($1) $2-$3'
        )
    }
}

/**
 * Utility function to format currency input (BRL)
 * @param value - Raw input string (can include commas, dots, R$)
 * @returns Formatted string (e.g., "1.234,56")
 */
export function formatCurrencyInput(value: string): string {
    // 1. Remove all non-digit characters except comma
    let cleanValue = value.replace(/[^\d,]/g, '')
    
    // 2. Ensure only one comma is present
    const parts = cleanValue.split(',')
    if (parts.length > 2) {
        cleanValue = parts[0] + ',' + parts.slice(1).join('')
    }

    // 3. Remove leading zeros unless it's "0," or just "0"
    if (cleanValue.length > 1 && cleanValue.startsWith('0') && !cleanValue.startsWith('0,')) {
        cleanValue = cleanValue.substring(1)
    }

    // If the value is just a comma or empty, return it
    if (cleanValue === ',' || cleanValue === '') return cleanValue

    // Convert to number (treating comma as decimal separator)
    const digits = cleanValue.replace(',', '')
    if (digits.length === 0) return ""

    // Treat as cents
    let number = parseInt(digits, 10) / 100
    
    // Format back to BRL string representation (using dot for thousands, comma for decimals)
    return number.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: true,
    })
}

/**
 * Utility function to extract float value from formatted string
 * @param formattedValue - Formatted string (e.g., "1.234,56")
 * @returns Float number (e.g., 1234.56)
 */
export function parseCurrencyToFloat(formattedValue: string): number {
    // Remove dots used for thousands, and replace comma with dot for decimals
    const cleanValue = formattedValue
        .replace(/[R$\s.]/g, '')
        .replace(',', '.')
    
    return parseFloat(cleanValue) || 0
}