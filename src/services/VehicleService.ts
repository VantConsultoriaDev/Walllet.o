import type { PlacaData } from "@/types/vehicle"

const API_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vZ2F0ZXdheS5hcGlicmFzaWwuaW8vYXBpL3YyL2F1dGgvbG9naW4iLCJpYXQiOjE3NjQ3OTQ0NDcsImV4cCI6MTc5NjMzMDQ0NywibmJmIjoxNzY0Nzk0NDQ3LCJqdGkiOiJnWHk5TkFhaDNPOEJnNGp6Iiwic3ViIjoiMTc4NDIiLCJwcnYiOiIyM2JkNWM4OTQ5ZjYwMGFkYjM5ZTcwMWM0MDA4NzJkYjdhNTk3NmY3In0.V6QSWD39KM6TtCk4nJawVJnigT5r2TojKrOR3qy9Lgc"
const API_URL = 'https://gateway.apibrasil.io/api/v2/consulta/veiculos/credits'

/**
 * Consulta dados de veículos pela placa usando a API Brasil.
 * @param placa - Placa limpa (7 caracteres, sem formatação).
 * @returns Dados do veículo ou null se não encontrado.
 */
export async function consultarPlaca(placa: string): Promise<PlacaData | null> {
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined = setTimeout(() => controller.abort("Timeout excedido"), 120000);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_TOKEN}`
            },
            body: JSON.stringify({
                "tipo": "fipe",
                "placa": placa,
                "homolog": false
            }),
            signal: controller.signal,
            redirect: 'follow',
            credentials: 'include',
            cache: 'no-store'
        });

        clearTimeout(timeoutId);
        timeoutId = undefined;

        if (!response.ok) {
            // Se a resposta não for OK, tentamos ler o corpo para obter mais detalhes do erro da API
            const errorBody = await response.text();
            console.error(`Erro HTTP ${response.status}:`, errorBody);
            throw new Error(`Erro na consulta de placa: ${response.status} - ${errorBody.substring(0, 100)}...`);
        }

        const data = await response.json();
        console.log("Dados API Brasil (consulta/veiculos/credits):", data);

        if (data.error || data.status === 'error') {
            throw new Error(data.message || data.error || 'Erro desconhecido na API.');
        }

        // A API 'credits' retorna os dados dentro de 'dados'
        const veiculo = data.dados || data;

        if (veiculo) {
            // Helper to safely get string value
            const safeString = (val: any) => (val !== null && val !== undefined ? String(val) : "");
            // Helper to safely get number value
            const safeNumber = (val: any) => (val !== null && val !== undefined ? Number(val) : undefined);

            // Mapeamento dos campos
            return {
                placa: placa,
                marca: safeString(veiculo.marca || veiculo.fabricante || veiculo.montadora),
                modelo: safeString(veiculo.modelo || veiculo.modelo_veiculo || veiculo.veiculo),
                ano: safeNumber(veiculo.ano_modelo || veiculo.ano),
                cor: safeString(veiculo.cor),
                chassi: safeString(veiculo.chassi),
                renavam: safeString(veiculo.renavam),
                fipe_codigo: safeString(veiculo.fipe_codigo || veiculo.codigo_fipe),
                valor_fipe: safeString(veiculo.fipe_valor || veiculo.valor_fipe).replace(/[R$\s.]/g, '').replace(',', '.'),
                tipo_veiculo: safeString(veiculo.tipo_veiculo),
                carroceria: safeString(veiculo.carroceria),
            } as PlacaData;
        }

        return null;

    } catch (error) {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        // Re-lança o erro para ser capturado pelo modal e exibido ao usuário
        throw error;
    }
}