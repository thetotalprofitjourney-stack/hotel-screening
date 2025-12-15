/**
 * Extrae datos estructurados del HTML snapshot de un proyecto finalizado.
 * Esto garantiza que los datos en el documento Word sean exactamente iguales
 * a los mostrados en la aplicación web, sin necesidad de recalcular.
 */

export interface SnapshotData {
  basicInfo: {
    nombre: string;
    segmento: string;
    categoria: string;
    provincia: string;
    comunidad_autonoma: string;
    habitaciones: number;
  };
  operationConfig: {
    operacion_tipo: 'gestion_propia' | 'operador';
    fee_base_anual: number | null;
    fee_pct_total_rev: number | null;
    fee_pct_gop: number | null;
    fee_incentive_pct: number | null;
    fee_hurdle_gop_margin: number | null;
    gop_ajustado: boolean;
    ffe: number;
    nonop_taxes_anual: number;
    nonop_insurance_anual: number;
    nonop_rent_anual: number;
    nonop_other_anual: number;
  };
  projectionAssumptions: {
    horizonte: number;
    anio_base: number;
    adr_growth_pct: number;
    occ_delta_pp: number;
    occ_cap: number;
    cost_inflation_pct: number;
    undistributed_inflation_pct: number;
    nonop_inflation_pct: number;
  };
  financingConfig: {
    precio_compra: number;
    capex_inicial: number;
    coste_tx_compra_pct: number;
    ltv: number;
    interes: number;
    plazo_anios: number;
    tipo_amortizacion: 'frances' | 'bullet';
  };
  valuationConfig: {
    metodo_valoracion: 'cap_rate' | 'multiplo';
    cap_rate_salida: number | null;
    multiplo_salida: number | null;
    coste_tx_venta_pct: number;
  };
  commercialY1: {
    adr: number;
    occ: number;
    revpar: number;
    roomRevenue: number;
    otherRevenue: number;
    totalRevenue: number;
  } | null;
  usaliY1: {
    operating_revenue: number;
    dept_total: number;
    dept_profit: number;
    und_total: number;
    gop: number;
    fees: number;
    nonop: number;
    ebitda: number;
    ffe: number;
    ebitda_less_ffe: number;
    gop_margin: number;
    ebitda_margin: number;
    ebitda_less_ffe_margin: number;
  } | null;
  annuals: any[];
  debt: any;
  valuation: {
    valor_salida_bruto: number;
    valor_salida_neto: number;
    noi_estabilizado: number;
    precio_compra_implicito: number | null;
    precio_compra_real: number;
    discount_rate: number;
    noi_details: any | null;
  };
  returns: {
    unlevered: {
      irr: number;
      moic: number;
    };
    levered: {
      irr: number;
      moic: number;
      equity0: number;
    };
  };
  totalMetrics: {
    operating_revenue: number;
    gop: number;
    fees: number;
    ebitda: number;
    ffe: number;
    ebitda_less_ffe: number;
    caja_neta_holding: number;
    equity_at_exit: number;
  };
}

/**
 * Extrae un número de un texto, eliminando formato español (puntos de miles, etc.)
 */
function parseNumber(text: string): number {
  if (!text) return 0;
  // Eliminar espacios, puntos de miles y símbolo €
  const cleaned = text.replace(/\s/g, '').replace(/\./g, '').replace(/€/g, '').replace(/,/g, '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Extrae un porcentaje de un texto
 */
function parsePercentage(text: string): number {
  if (!text) return 0;
  const cleaned = text.replace(/\s/g, '').replace(/%/g, '').replace(/,/g, '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num / 100;
}

/**
 * Extrae datos del HTML snapshot
 */
export function extractDataFromSnapshot(htmlContent: string): SnapshotData {
  // Crear un parser DOM temporal
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  // Función auxiliar para obtener texto de un elemento por selector
  const getText = (selector: string): string => {
    const element = doc.querySelector(selector);
    return element?.textContent?.trim() || '';
  };

  // Función auxiliar para obtener valor de un select
  const getSelectValue = (name: string): string => {
    const select = doc.querySelector(`select[name="${name}"]`) as HTMLSelectElement;
    if (!select) return '';
    const selectedOption = select.querySelector('option[selected]') as HTMLOptionElement;
    return selectedOption?.value || select.value || '';
  };

  // Función auxiliar para obtener valor de un input
  const getInputValue = (name: string): string => {
    const input = doc.querySelector(`input[name="${name}"]`) as HTMLInputElement;
    return input?.value || input?.getAttribute('value') || '';
  };

  // Extraer información básica de los SELECT/INPUT elements
  const basicInfo = {
    nombre: getInputValue('nombre') || 'Proyecto',
    segmento: getSelectValue('segmento') || 'urbano',
    categoria: getSelectValue('categoria') || 'upscale',
    provincia: getInputValue('provincia') || '',
    comunidad_autonoma: getInputValue('comunidad_autonoma') || '',
    habitaciones: parseInt(getInputValue('habitaciones') || '100')
  };

  const operacionTipo = getSelectValue('operacion_tipo') as 'gestion_propia' | 'operador';
  const operationConfig = {
    operacion_tipo: operacionTipo || 'operador',
    fee_base_anual: parseFloat(getInputValue('fee_base_anual')) || null,
    fee_pct_total_rev: parseFloat(getInputValue('fee_pct_total_rev')) || null,
    fee_pct_gop: parseFloat(getInputValue('fee_pct_gop')) || null,
    fee_incentive_pct: parseFloat(getInputValue('fee_incentive_pct')) || null,
    fee_hurdle_gop_margin: parseFloat(getInputValue('fee_hurdle_gop_margin')) || null,
    gop_ajustado: (doc.querySelector('input[name="gop_ajustado"]') as HTMLInputElement)?.checked || false,
    ffe: parseFloat(getInputValue('ffe')) || 0.04,
    nonop_taxes_anual: parseFloat(getInputValue('nonop_taxes_anual')) || 0,
    nonop_insurance_anual: parseFloat(getInputValue('nonop_insurance_anual')) || 0,
    nonop_rent_anual: parseFloat(getInputValue('nonop_rent_anual')) || 0,
    nonop_other_anual: parseFloat(getInputValue('nonop_other_anual')) || 0
  };

  const projectionAssumptions = {
    horizonte: parseInt(getInputValue('horizonte')) || 7,
    anio_base: parseInt(getInputValue('anio_base')) || new Date().getFullYear(),
    adr_growth_pct: parseFloat(getInputValue('adr_growth_pct')) || 0.03,
    occ_delta_pp: parseFloat(getInputValue('occ_delta_pp')) || 0,
    occ_cap: parseFloat(getInputValue('occ_cap')) || 0.92,
    cost_inflation_pct: parseFloat(getInputValue('cost_inflation_pct')) || 0,
    undistributed_inflation_pct: parseFloat(getInputValue('undistributed_inflation_pct')) || 0,
    nonop_inflation_pct: parseFloat(getInputValue('nonop_inflation_pct')) || 0
  };

  const tipoAmortizacion = getSelectValue('tipo_amortizacion') as 'frances' | 'bullet';
  const financingConfig = {
    precio_compra: parseFloat(getInputValue('precio_compra')) || 0,
    capex_inicial: parseFloat(getInputValue('capex_inicial')) || 0,
    coste_tx_compra_pct: parseFloat(getInputValue('coste_tx_compra_pct')) || 0.03,
    ltv: parseFloat(getInputValue('ltv')) || 0.65,
    interes: parseFloat(getInputValue('interes')) || 0.045,
    plazo_anios: parseInt(getInputValue('plazo_anios')) || 10,
    tipo_amortizacion: tipoAmortizacion || 'frances'
  };

  const metodoValoracion = getSelectValue('metodo_valoracion') as 'cap_rate' | 'multiplo';
  const valuationConfig = {
    metodo_valoracion: metodoValoracion || 'cap_rate',
    cap_rate_salida: parseFloat(getInputValue('cap_rate_salida')) || null,
    multiplo_salida: parseFloat(getInputValue('multiplo_salida')) || null,
    coste_tx_venta_pct: parseFloat(getInputValue('coste_tx_venta_pct')) || 0.02
  };

  // TODO: Extraer datos comerciales Y1, USALI Y1, annuals, debt, valuation, returns del HTML
  // Por ahora retornar estructura básica, luego completaremos con los datos del backend

  return {
    basicInfo,
    operationConfig,
    projectionAssumptions,
    financingConfig,
    valuationConfig,
    commercialY1: null, // Se extraerá del HTML o se cargará del backend
    usaliY1: null, // Se extraerá del HTML o se cargará del backend
    annuals: [], // Se cargará del backend
    debt: null, // Se cargará del backend
    valuation: {
      valor_salida_bruto: 0,
      valor_salida_neto: 0,
      noi_estabilizado: 0,
      precio_compra_implicito: null,
      precio_compra_real: 0,
      discount_rate: 0,
      noi_details: null
    },
    returns: {
      unlevered: { irr: 0, moic: 0 },
      levered: { irr: 0, moic: 0, equity0: 0 }
    },
    totalMetrics: {
      operating_revenue: 0,
      gop: 0,
      fees: 0,
      ebitda: 0,
      ffe: 0,
      ebitda_less_ffe: 0,
      caja_neta_holding: 0,
      equity_at_exit: 0
    }
  };
}
