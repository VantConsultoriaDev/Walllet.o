import type { PlacaData } from "@/types/vehicle";

// Lendo o token da variável de ambiente
const API_TOKEN = import.meta.env.VITE_API_BRASIL_TOKEN;

export class VehicleService {
  // Usando o caminho do proxy configurado no vite.config.ts
  private static readonly API_URL = '/api-brasil/api/v2/consulta/veiculos/credits';

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
        throw new Error('ERRO DE CONFIGURAÇÃO: O token da API não está definido na variável de ambiente VITE_API_BRASIL_TOKEN.');
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
        const errorMessage = errorBody.message || errorBody.error || response.statusText;
        throw new Error(`Falha na comunicação com a API (${response.status}): ${errorMessage}`);
      }
      
      const result = await response.json();
      
      if (!result || result.error || !result.data || Object.keys(result.data).length === 0) {
          return null;
      }

      const data = result.data;
      
      return {
          placa: data.placa || placaLimpa,
          marca: data.marca || '',
          modelo: data.modelo || '',
          ano: data.anomodelo?.toString() || data.ano_modelo?.toString() || data.ano?.toString() || '', 
          anoModelo: data.anomodelo?.toString() || data.ano_modelo?.toString() || '',
          cor: data.cor || '',
          combustivel: data.combustivel || '',
          categoria: data.categoria || data.especie || '',
          chassi: data.chassi || '',
          renavam: data.renavam || '',
          municipio: data.municipio || '',
          uf: data.uf || '',
          fipeCode: data.codigofipe || '',
          fipeValue: data.valor?.toString() || '',
      };

    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      console.error('Erro ao consultar placa:', error);
      
      if (error instanceof Error) {
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