import axios from 'axios';
import type { PlacaData } from "@/types/vehicle";

// O token deve ser lido das variáveis de ambiente
// NOTE: Você deve definir VITE_APIBRASIL_TOKEN no seu arquivo .env ou similar.
const API_TOKEN = import.meta.env.VITE_APIBRASIL_TOKEN;

export class VehicleService {
  // Usando o endpoint base/000/dados conforme solicitado
  private static readonly API_URL = 'https://gateway.apibrasil.io/api/v2/vehicles/base/000/dados';

  /**
   * Consulta dados da placa usando a API da ApiBrasil.
   * @param placa Placa limpa (7 caracteres alfanuméricos).
   * @returns Dados do veículo ou null se não encontrado/erro.
   */
  static async consultarPlaca(placa: string): Promise<PlacaData | null> {
    try {
      if (!API_TOKEN) {
        console.error('VehicleService: VITE_APIBRASIL_TOKEN não configurado.');
        throw new Error('ERRO DE CONFIGURAÇÃO: A variável VITE_APIBRASIL_TOKEN não está definida. Por favor, crie um arquivo .env e defina o token.');
      }
      
      // Remove formatação da placa
      const placaLimpa = placa.replace(/[^A-Z0-9]/gi, '');
      
      if (!VehicleService.validarPlaca(placaLimpa)) {
        throw new Error('Placa inválida');
      }

      const response = await axios.post(
        VehicleService.API_URL,
        {
          // A API espera letras maiúsculas
          placa: placaLimpa.toUpperCase(),
          homolog: false,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_TOKEN}`
          },
          timeout: 120000, // 120 segundos
        }
      );
      
      const result = response.data;
      
      if (!result || result.error || !result.data) {
        if (response.status === 401 || response.status === 403) {
             throw new Error('ERRO DE AUTORIZAÇÃO: O token da API (VITE_APIBRASIL_TOKEN) é inválido ou expirou. Verifique a configuração.');
        }
        return null;
      }

      const data = result.data;
      
      if (data) {
        // Mapeamento conforme solicitado pelo usuário:
        // marca = marca
        // modelo = modelo
        // ano = anomodelo
        // codigo fipe = codigofipe 
        // valor fipe = valor
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
      }

      return null;
    } catch (error) {
      console.error('Erro ao consultar placa:', error);
      
      if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
          throw new Error('ERRO DE AUTORIZAÇÃO: O token da API (VITE_APIBRASIL_TOKEN) é inválido ou expirou. Verifique a configuração.');
      }
      
      // Re-throw custom errors or return null for generic errors
      if (error instanceof Error && (error.message.includes('ERRO DE AUTORIZAÇÃO') || error.message.includes('ERRO DE CONFIGURAÇÃO') || error.message.includes('Placa inválida'))) {
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