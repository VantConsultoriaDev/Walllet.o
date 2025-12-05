import type { PlacaData } from "@/types/vehicle";
import { supabase } from "@/integrations/supabase/client";
import { isBefore, subDays } from "date-fns";

// Lendo o token da variável de ambiente
const API_TOKEN = import.meta.env.VITE_API_BRASIL_TOKEN;
const CACHE_DURATION_DAYS = 30;

// Helper function to map DB cache object to PlacaData
const mapCacheToPlacaData = (cache: any): PlacaData => ({
    placa: cache.plate,
    marca: cache.brand || '',
    modelo: cache.model || '',
    ano: cache.year?.toString() || '',
    anoModelo: cache.year?.toString() || '',
    cor: cache.color || '',
    combustivel: '', // Not stored in cache, but required by PlacaData
    categoria: cache.type || '', // Using 'type' as a proxy for category
    chassi: cache.chassi || '',
    renavam: cache.renavam || '',
    municipio: '', // Not stored in cache
    uf: '', // Not stored in cache
    fipeCode: cache.fipe_code || '',
    fipeValue: cache.fipe_value || '',
});

// Helper function to map PlacaData to DB cache object
const mapPlacaDataToCache = (data: PlacaData, userId: string) => ({
    user_id: userId,
    plate: data.placa,
    type: data.categoria,
    brand: data.marca,
    model: data.modelo,
    year: parseInt(data.ano) || null,
    color: data.cor,
    renavam: data.renavam,
    chassi: data.chassi,
    fipe_code: data.fipeCode,
    fipe_value: data.fipeValue,
    cached_at: new Date().toISOString(), // <-- Explicitly set cached_at
    // body_type, body_value, value are not directly from PlacaData, 
    // they are specific to the Vehicle model, so we omit them here.
});


export class VehicleService {
  // Usando o caminho do proxy configurado no vite.config.ts
  private static readonly API_URL = '/api-brasil/api/v2/consulta/veiculos/credits';

  /**
   * Salva os dados da placa no cache do Supabase.
   */
  private static async saveToCache(data: PlacaData, userId: string) {
    const dbData = mapPlacaDataToCache(data, userId);
    
    // Tenta inserir. Se a placa já existir (UNIQUE constraint), tenta atualizar.
    const { error } = await supabase
        .from('vehicle_cache')
        .upsert(dbData, { onConflict: 'plate' })
        .eq('user_id', userId);

    if (error) {
        console.error("Erro ao salvar cache da placa:", error);
    }
  }

  /**
   * Busca dados da placa no cache do Supabase.
   */
  private static async getFromCache(placa: string, userId: string): Promise<PlacaData | null> {
    const cacheLimit = subDays(new Date(), CACHE_DURATION_DAYS);

    const { data, error } = await supabase
        .from('vehicle_cache')
        .select('*')
        .eq('user_id', userId)
        .eq('plate', placa.toUpperCase())
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
        console.error("Erro ao buscar cache da placa:", error);
        return null;
    }

    if (data) {
        const cachedAt = new Date(data.cached_at);
        if (isBefore(cachedAt, cacheLimit)) {
            // Cache expirado
            return null;
        }
        return mapCacheToPlacaData(data);
    }

    return null;
  }

  /**
   * Consulta dados da placa usando o cache ou a API externa.
   * @param placa Placa limpa (7 caracteres alfanuméricos).
   * @returns Dados do veículo ou null se não encontrado/erro.
   */
  static async consultarPlaca(placa: string): Promise<PlacaData | null> {
    const placaLimpa = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    if (!VehicleService.validarPlaca(placaLimpa)) {
        throw new Error('Placa inválida');
    }

    // 1. Obter usuário logado para RLS
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error('Usuário não autenticado para consulta de placa.');
    }
    const userId = user.id;

    // 2. Tentar buscar no cache
    const cachedData = await VehicleService.getFromCache(placaLimpa, userId);
    if (cachedData) {
        console.log(`Placa ${placaLimpa} encontrada no cache.`);
        return cachedData;
    }

    // 3. Se não estiver no cache ou expirado, consultar API externa
    const controller = new AbortController();
    const TIMEOUT_MS = 120000; // 120 segundos
    let timeoutId: ReturnType<typeof setTimeout> | undefined = setTimeout(() => controller.abort("Timeout excedido"), TIMEOUT_MS);

    try {
      if (!API_TOKEN) {
        throw new Error('ERRO DE CONFIGURAÇÃO: O token da API não está definido na variável de ambiente VITE_API_BRASIL_TOKEN.');
      }
      
      const response = await fetch(VehicleService.API_URL, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify({
          "tipo": "fipe",
          "placa": placaLimpa,
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
      
      const placaData: PlacaData = {
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
          fipeCode: data.codigoFipe || data.codigofipe || data.codigo_fipe || '',
          fipeValue: data.valor?.toString() || '',
      };

      // 4. Salvar no cache antes de retornar
      await VehicleService.saveToCache(placaData, userId);
      
      return placaData;

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