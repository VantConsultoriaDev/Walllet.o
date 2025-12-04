import type { PlacaData } from "@/types/vehicle";

// O token de autorização fornecido pelo usuário
const API_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vZ2F0ZXdheS5hcGlicmFzaWwuaW8vYXBpL3YyL2F1dGgvbG9naW4iLCJpYXQiOjE3NjQ3OTQ0NDcsImV4cCI6MTc5NjMzMDQ0NywibmJmIjoxNzY0Nzk0NDQ3LCJqdGkiOiJnWHk5TkFhaDNPOEJnNGp6Iiwic3ViIjoiMTc4NDIiLCJwcnYiOiIyM2JkNWM4OTQ5ZjYwMGFkYjM5ZTcwMWM0MDA4NzJkYjdhNTk3NmY3In0.V6QSWD39KM6TtCk4nJawVJnigT5r2TojKrOR3qy9Lgc";

export class VehicleService {
  // Novo endpoint conforme solicitado
  private static readonly API_URL = 'https://gateway.apibrasil.io/api/v2/consulta/veiculos/credits';

  /**
   * Consulta dados da placa usando a API da ApiBrasil via fetch.
   * @param placa Placa limpa (7 caracteres alfanuméricos).
   * @returns Dados do veículo ou null se não encontrado/erro.
   */
  static async consultarPlaca(placa: string): Promise<PlacaData | null> {
    const controller = new AbortController();
    const TIMEOUT_MS = 120000; // 120 segundos
    let timeoutId: ReturnType<typeof setTimeout> | undefined = setTimeout(() => controller.abort("Timeout excedido"), TIMEOUT_MS);

    try {
      if (!API_TOKEN) {
        throw new Error('ERRO DE CONFIGURAÇÃO: O token da API não está definido.');
      }
      
      // Remove formatação da placa
      const placaLimpa = placa.replace(/[^A-Z0-9]/gi, '');
      
      if (!VehicleService.validarPlaca(placaLimpa)) {
        throw new Error('Placa inválida');
      }

      const response = await fetch(VehicleService.API_URL, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify({
          "tipo": "fipe",
          "placa": placaLimpa.toUpperCase(),
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
        const errorBody = await response.json().catch(() => ({ message: response.statusText }));
        // Se a resposta não for OK, tentamos extrair a mensagem de erro da API
        const errorMessage = errorBody.message || errorBody.error || response.statusText;
        throw new Error(`Falha na comunicação com a API (${response.status}): ${errorMessage}`);
      }
      
      const result = await response.json();
      
      // 1. Verifica se a resposta da API contém dados válidos
      if (!result || result.error || !result.data || Object.keys(result.data).length === 0) {
          // Se a API retornar 200 OK, mas sem dados (ou com erro interno), retornamos null
          return null;
      }

      const data = result.data;
      
      // 2. Mapeamento dos dados
      return {
          placa: data.placa || placaLimpa,
          marca: data.marca || '',
          modelo: data.modelo || '',
          // Priorizando 'anomodelo' conforme solicitado, com fallbacks
          ano: data.anomodelo?.toString() || data.ano_modelo?.toString() || data.ano?.toString() || '', 
          anoModelo: data.anomodelo?.toString() || data.ano_modelo?.toString() || '',
          cor: data.cor || '',
          combustivel: data.combustivel || '',
          categoria: data.categoria || data.especie || '',
          chassi: data.chassi || '',
          renavam: data.renavam || '',
          municipio: data.municipio || '',
          uf: data.uf || '',
          // Mapeamento FIPE
          fipeCode: data.codigofipe || '',
          fipeValue: data.valor?.toString() || '', // Usando 'valor' para valor FIPE
      };

    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      console.error('Erro ao consultar placa:', error);
      
      if (error instanceof Error) {
          // Se for um erro de timeout ou de autorização/configuração, lançamos a mensagem
          if (error.name === 'AbortError' && error.message === 'Timeout excedido') {
              throw new Error('A consulta excedeu o tempo limite de 120 segundos.');
          }
          throw error;
      }
      
      return null;
    }
  }

  /**
   * Formata a placa no padrão brasileiro (sem hífen).
   * @param value Placa bruta (ex: ABC1234, ABC-1234, ABC1D23)
   * @returns Placa formatada sem hífen (ex: ABC1234)
   */
  static formatarPlaca(placa: string): string {
    const alphanumeric = placa.replace(/[^A-Z0-9]/gi, '').substring(0, 7).toUpperCase();
    return alphanumeric;
  }

  /**
   * Valida o formato da placa (antiga ou Mercosul).
   * @param placa Placa limpa (7 caracteres alfanuméricos).
   * @returns true se o formato for válido.
   */
  static validarPlaca(placa: string): boolean {
    const placaLimpa = placa.replace(/[^A-Z0-9]/gi, '');
    
    // Formato antigo: ABC1234
    const formatoAntigo = /^[A-Z]{3}[0-9]{4}$/i;
    
    // Formato Mercosul: ABC1D23
    const formatoMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/i;
    
    return placaLimpa.length === 7 && (formatoAntigo.test(placaLimpa) || formatoMercosul.test(placaLimpa));
  }
}