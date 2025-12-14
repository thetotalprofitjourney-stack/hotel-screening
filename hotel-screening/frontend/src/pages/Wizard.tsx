import React, { useEffect, useState } from 'react';
import { api } from '../api';
import MonthlyTable from '../components/MonthlyTable';
import UsaliEditor from '../components/UsaliEditor';
import SensitivityAnalysis from '../components/SensitivityAnalysis';
import AnnualUsaliTable from '../components/AnnualUsaliTable';
import ProjectBasicInfoForm, { ProjectBasicInfo } from '../components/ProjectBasicInfoForm';
import OperationConfigForm, { OperationConfig } from '../components/OperationConfigForm';
import ProjectionAssumptionsForm, { ProjectionAssumptions } from '../components/ProjectionAssumptionsForm';
import FinancingForm, { FinancingConfig } from '../components/FinancingForm';
import ValuationForm, { ValuationConfig } from '../components/ValuationForm';
import EditedFieldsNote from '../components/EditedFieldsNote';

// Funciones de formateo de números (formato español)
function fmtDecimal(n: number, decimals: number = 2) {
  return n.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

export default function Wizard({ projectId, onBack }:{ projectId:string; onBack:()=>void }) {
  // Estados para formularios progresivos
  const [basicInfo, setBasicInfo] = useState<ProjectBasicInfo>({
    nombre: '',
    comunidad_autonoma: '',
    provincia: '',
    zona: '',
    segmento: 'urbano',
    categoria: 'upscale',
    habitaciones: 100
  });
  const [basicInfoSaved, setBasicInfoSaved] = useState(false);

  const [operationConfig, setOperationConfig] = useState<OperationConfig>({
    operacion_tipo: 'operador',
    fee_base_anual: null,
    fee_pct_total_rev: null,
    fee_pct_gop: null,
    fee_incentive_pct: null,
    fee_hurdle_gop_margin: null,
    gop_ajustado: false,
    ffe: 0.04,
    nonop_taxes_anual: 0,
    nonop_insurance_anual: 0,
    nonop_rent_anual: 0,
    nonop_other_anual: 0
  });
  const [operationConfigSaved, setOperationConfigSaved] = useState(false);

  const [projectionAssumptions, setProjectionAssumptions] = useState<ProjectionAssumptions>({
    horizonte: 7,
    adr_growth_pct: 0.05,
    occ_delta_pp: 1.0,
    occ_cap: 0.85,
    cost_inflation_pct: 0.02,
    undistributed_inflation_pct: 0.02,
    nonop_inflation_pct: 0.02,
    fees_indexation_pct: null
  });
  const [projectionAssumptionsSaved, setProjectionAssumptionsSaved] = useState(false);

  const [financingConfig, setFinancingConfig] = useState<FinancingConfig>({
    precio_compra: 0,
    capex_inicial: 0,
    coste_tx_compra_pct: 0.03,
    ltv: 0.65,
    interes: 0.045,
    plazo_anios: 10,
    tipo_amortizacion: 'frances'
  });
  const [financingConfigSaved, setFinancingConfigSaved] = useState(false);

  const [valuationConfig, setValuationConfig] = useState<ValuationConfig>({
    metodo_valoracion: 'cap_rate',
    cap_rate_salida: 0.08,
    multiplo_salida: null,
    coste_tx_venta_pct: 0.02
  });

  const [projectState, setProjectState] = useState<string>('draft');
  const [anio, setAnio] = useState<number>(new Date().getFullYear());
  const [meses, setMeses] = useState<any[]>([]);
  const [benchmarkMeses, setBenchmarkMeses] = useState<any[]>([]); // Benchmark original para comparación
  const [accepted, setAccepted] = useState(false);
  const [calc, setCalc] = useState<any|null>(null);
  const [calculatedUsali, setCalculatedUsali] = useState<any[]>([]); // USALI calculado original para comparación
  const [usaliSaved, setUsaliSaved] = useState(false);
  const [editedUsaliData, setEditedUsaliData] = useState<any[]>([]);
  const [annuals, setAnnuals] = useState<any[]|null>(null);
  const [projectionSaved, setProjectionSaved] = useState(false);
  const [debt, setDebt] = useState<any|null>(null);
  const [vr, setVR] = useState<any|null>(null);
  const [loading, setLoading] = useState({
    projection: false,
    save_projection: false,
    debt: false,
    valuation: false
  });

  // Registro de campos editados manualmente por el usuario
  type EditedField = { mes?: number; anio?: number; campo: string };
  const [editedFieldsStep1, setEditedFieldsStep1] = useState<EditedField[]>([]);
  const [editedFieldsStep2, setEditedFieldsStep2] = useState<EditedField[]>([]);
  const [editedFieldsStep3, setEditedFieldsStep3] = useState<EditedField[]>([]);

  async function loadAllConfig() {
    try {
      const data = await api(`/v1/projects/${projectId}/config`);

      // Cargar datos básicos
      if (data.nombre) {
        setBasicInfo({
          nombre: data.nombre,
          comunidad_autonoma: data.comunidad_autonoma || '',
          provincia: data.provincia || '',
          zona: data.zona || '',
          segmento: data.segmento || 'urbano',
          categoria: data.categoria || 'upscale',
          habitaciones: data.habitaciones || 100
        });
        setBasicInfoSaved(true);
      }

      // Cargar configuración de operación
      if (data.operacion_tipo) {
        setOperationConfig({
          operacion_tipo: data.operacion_tipo,
          fee_base_anual: data.fee_base_anual ?? null,
          fee_pct_total_rev: data.fee_pct_total_rev ?? null,
          fee_pct_gop: data.fee_pct_gop ?? null,
          fee_incentive_pct: data.fee_incentive_pct ?? null,
          fee_hurdle_gop_margin: data.fee_hurdle_gop_margin ?? null,
          gop_ajustado: Boolean(data.gop_ajustado), // Convertir a booleano
          ffe: data.ffe ?? 0.04,
          nonop_taxes_anual: data.nonop_taxes_anual ?? 0,
          nonop_insurance_anual: data.nonop_insurance_anual ?? 0,
          nonop_rent_anual: data.nonop_rent_anual ?? 0,
          nonop_other_anual: data.nonop_other_anual ?? 0
        });
        // No marcar como guardado aquí, dejar que la lógica de estado del proyecto lo determine
      }

      // Cargar supuestos de proyección
      if (data.horizonte) {
        setProjectionAssumptions(prev => ({
          ...prev,
          horizonte: data.horizonte
        }));
      }

      // Cargar configuración de financiación
      if (data.precio_compra !== null && data.precio_compra !== undefined) {
        setFinancingConfig({
          precio_compra: data.precio_compra ?? 0,
          capex_inicial: data.capex_inicial ?? 0,
          coste_tx_compra_pct: data.coste_tx_compra_pct ?? 0.03,
          ltv: data.ltv ?? 0.65,
          interes: data.interes ?? 0.045,
          plazo_anios: data.plazo_anios ?? 10,
          tipo_amortizacion: data.tipo_amortizacion ?? 'frances'
        });
        // NO marcar como guardado automáticamente - solo cargar valores
        // El usuario debe hacer clic en "Guardar Paso 4" explícitamente
      }

      // Cargar configuración de valoración
      if (data.metodo_valoracion) {
        setValuationConfig({
          metodo_valoracion: data.metodo_valoracion,
          cap_rate_salida: data.cap_rate_salida ?? 0.08,
          multiplo_salida: data.multiplo_salida ?? null,
          coste_tx_venta_pct: data.coste_tx_venta_pct ?? 0.02
        });
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
    }
  }

  async function loadProjectState() {
    try {
      const data = await api(`/v1/projects`);
      const project = data.find((p: any) => p.project_id === projectId);
      if (project && project.estado) {
        setProjectState(project.estado);
        // Inicializar estados según el estado del proyecto
        if (project.estado === 'y1_commercial' || project.estado === 'y1_usali' || project.estado === 'projection_2n' || project.estado === 'finalized') {
          setAccepted(true);
        }
        if (project.estado === 'y1_usali' || project.estado === 'projection_2n' || project.estado === 'finalized') {
          calcY1();
          setUsaliSaved(true);
          setOperationConfigSaved(true); // Si tiene USALI guardado, también tiene config de operación
        }
        if (project.estado === 'projection_2n' || project.estado === 'finalized') {
          setProjectionSaved(true);
          setProjectionAssumptionsSaved(true);
          // Cargar datos de proyección guardados
          await loadSavedProjection();
        }
        if (project.estado === 'finalized') {
          setFinancingConfigSaved(true);
          // Cargar datos de deuda guardados
          await loadSavedDebt();
          // Cargar datos de valoración guardados
          await loadSavedValuation();
        }
      }
    } catch (error) {
      console.error('Error cargando estado del proyecto:', error);
    }
  }

  async function loadSavedProjection() {
    try {
      const data = await api(`/v1/projects/${projectId}/projection`);
      if (data && data.annuals) {
        setAnnuals(data.annuals);
      }
    } catch (error) {
      console.error('Error cargando proyección guardada:', error);
    }
  }

  async function loadSavedDebt() {
    try {
      const data = await api(`/v1/projects/${projectId}/debt`);
      if (data) {
        setDebt(data);
      }
    } catch (error) {
      console.error('Error cargando deuda guardada:', error);
    }
  }

  async function loadSavedValuation() {
    try {
      const data = await api(`/v1/projects/${projectId}/valuation-and-returns`);
      if (data) {
        setVR(data);
      }
    } catch (error) {
      console.error('Error cargando valoración guardada:', error);
    }
  }

  async function saveBasicInfo() {
    try {
      const configData = {
        ...basicInfo,
        moneda: 'EUR', // Siempre EUR
        // Valores por defecto para campos no usados aún
        horizonte: projectionAssumptions.horizonte,
        precio_compra: financingConfig.precio_compra,
        capex_inicial: financingConfig.capex_inicial,
        ltv: financingConfig.ltv,
        interes: financingConfig.interes,
        plazo_anios: financingConfig.plazo_anios,
        tipo_amortizacion: financingConfig.tipo_amortizacion,
        operacion_tipo: operationConfig.operacion_tipo,
        fee_base_anual: operationConfig.fee_base_anual,
        fee_pct_total_rev: operationConfig.fee_pct_total_rev,
        fee_pct_gop: operationConfig.fee_pct_gop,
        fee_incentive_pct: operationConfig.fee_incentive_pct,
        fee_hurdle_gop_margin: operationConfig.fee_hurdle_gop_margin,
        gop_ajustado: operationConfig.gop_ajustado,
        ffe: operationConfig.ffe,
        metodo_valoracion: valuationConfig.metodo_valoracion,
        cap_rate_salida: valuationConfig.cap_rate_salida,
        multiplo_salida: valuationConfig.multiplo_salida,
        coste_tx_compra_pct: financingConfig.coste_tx_compra_pct,
        coste_tx_venta_pct: valuationConfig.coste_tx_venta_pct,
        nonop_taxes_anual: operationConfig.nonop_taxes_anual,
        nonop_insurance_anual: operationConfig.nonop_insurance_anual,
        nonop_rent_anual: operationConfig.nonop_rent_anual,
        nonop_other_anual: operationConfig.nonop_other_anual
      };

      await api(`/v1/projects/${projectId}/config`, {
        method: 'PUT',
        body: JSON.stringify(configData)
      });

      setBasicInfoSaved(true);
      // Cargar benchmark automáticamente
      await loadBenchmark();
    } catch (error) {
      console.error('Error guardando datos básicos:', error);
      alert('Error al guardar los datos del proyecto');
    }
  }

  async function saveOperationConfig() {
    try {
      const configData = {
        nombre: basicInfo.nombre,
        comunidad_autonoma: basicInfo.comunidad_autonoma,
        provincia: basicInfo.provincia,
        zona: basicInfo.zona,
        segmento: basicInfo.segmento,
        categoria: basicInfo.categoria,
        habitaciones: basicInfo.habitaciones,
        moneda: 'EUR',
        horizonte: projectionAssumptions.horizonte,
        ...operationConfig,
        precio_compra: financingConfig.precio_compra,
        capex_inicial: financingConfig.capex_inicial,
        ltv: financingConfig.ltv,
        interes: financingConfig.interes,
        plazo_anios: financingConfig.plazo_anios,
        tipo_amortizacion: financingConfig.tipo_amortizacion,
        metodo_valoracion: valuationConfig.metodo_valoracion,
        cap_rate_salida: valuationConfig.cap_rate_salida,
        multiplo_salida: valuationConfig.multiplo_salida,
        coste_tx_compra_pct: financingConfig.coste_tx_compra_pct,
        coste_tx_venta_pct: valuationConfig.coste_tx_venta_pct
      };

      await api(`/v1/projects/${projectId}/config`, {
        method: 'PUT',
        body: JSON.stringify(configData)
      });

      setOperationConfigSaved(true);
      // NO calcular automáticamente - el usuario debe presionar el botón "CALCULAR USALI Y1"
    } catch (error) {
      console.error('Error guardando configuración de operación:', error);
      alert('Error al guardar la configuración de operación');
    }
  }

  async function saveProjectionAssumptions() {
    try {
      // Actualizar horizonte en el config
      const configData = {
        nombre: basicInfo.nombre,
        comunidad_autonoma: basicInfo.comunidad_autonoma,
        provincia: basicInfo.provincia,
        zona: basicInfo.zona,
        segmento: basicInfo.segmento,
        categoria: basicInfo.categoria,
        habitaciones: basicInfo.habitaciones,
        moneda: 'EUR',
        horizonte: projectionAssumptions.horizonte,
        ...operationConfig,
        precio_compra: financingConfig.precio_compra,
        capex_inicial: financingConfig.capex_inicial,
        ltv: financingConfig.ltv,
        interes: financingConfig.interes,
        plazo_anios: financingConfig.plazo_anios,
        tipo_amortizacion: financingConfig.tipo_amortizacion,
        metodo_valoracion: valuationConfig.metodo_valoracion,
        cap_rate_salida: valuationConfig.cap_rate_salida,
        multiplo_salida: valuationConfig.multiplo_salida,
        coste_tx_compra_pct: financingConfig.coste_tx_compra_pct,
        coste_tx_venta_pct: valuationConfig.coste_tx_venta_pct
      };

      await api(`/v1/projects/${projectId}/config`, {
        method: 'PUT',
        body: JSON.stringify(configData)
      });

      setProjectionAssumptionsSaved(true);
      // Proyectar automáticamente
      await doProjection();
    } catch (error) {
      console.error('Error guardando supuestos de proyección:', error);
      alert('Error al guardar los supuestos de proyección');
    }
  }

  async function saveFinancingConfig() {
    // Validar que precio_compra sea mayor que 0
    const precioCompra = Number(financingConfig.precio_compra || 0);
    if (precioCompra <= 0) {
      alert('Para guardar la configuración de Deuda es necesario establecer un Precio de compra (€) mayor que 0.');
      return;
    }

    try {
      const configData = {
        nombre: basicInfo.nombre,
        comunidad_autonoma: basicInfo.comunidad_autonoma,
        provincia: basicInfo.provincia,
        zona: basicInfo.zona,
        segmento: basicInfo.segmento,
        categoria: basicInfo.categoria,
        habitaciones: basicInfo.habitaciones,
        moneda: 'EUR',
        horizonte: projectionAssumptions.horizonte,
        ...operationConfig,
        ...financingConfig,
        metodo_valoracion: valuationConfig.metodo_valoracion,
        cap_rate_salida: valuationConfig.cap_rate_salida,
        multiplo_salida: valuationConfig.multiplo_salida,
        coste_tx_venta_pct: valuationConfig.coste_tx_venta_pct
      };

      await api(`/v1/projects/${projectId}/config`, {
        method: 'PUT',
        body: JSON.stringify(configData)
      });

      // Calcular deuda automáticamente ANTES de marcar como guardado
      await doDebt();
      setFinancingConfigSaved(true);
    } catch (error) {
      console.error('Error guardando configuración de financiación:', error);
      alert('Error al guardar la configuración de financiación');
    }
  }

  async function saveValuationConfig() {
    try {
      // Validar que precio_compra sea mayor que 0
      const precioCompra = Number(financingConfig.precio_compra || 0);
      if (precioCompra <= 0) {
        alert('Para calcular la Valoración y Retornos es necesario establecer un Precio de compra (€) mayor que 0 en la configuración de Deuda.');
        return;
      }

      const configData = {
        nombre: basicInfo.nombre,
        comunidad_autonoma: basicInfo.comunidad_autonoma,
        provincia: basicInfo.provincia,
        zona: basicInfo.zona,
        segmento: basicInfo.segmento,
        categoria: basicInfo.categoria,
        habitaciones: basicInfo.habitaciones,
        moneda: 'EUR',
        horizonte: projectionAssumptions.horizonte,
        ...operationConfig,
        ...financingConfig,
        ...valuationConfig
      };

      await api(`/v1/projects/${projectId}/config`, {
        method: 'PUT',
        body: JSON.stringify(configData)
      });

      // Calcular valoración automáticamente
      await doValuation();
    } catch (error) {
      console.error('Error guardando configuración de valoración:', error);
      alert('Error al guardar la configuración de valoración');
    }
  }

  async function loadBenchmark() {
    // Siempre cargar el benchmark original para comparación
    const benchmarkData = await api(`/v1/projects/${projectId}/y1/benchmark?anio_base=${anio}`);
    setBenchmarkMeses(benchmarkData.meses);

    try {
      // Intentar cargar datos guardados
      const y1Data = await api(`/v1/projects/${projectId}/y1/commercial`);
      if (y1Data && y1Data.meses && y1Data.meses.length === 12) {
        setMeses(y1Data.meses);
        return;
      }
    } catch (error) {
      console.log('No hay datos de Y1 comercial guardados, usando benchmark');
    }

    // Si no hay datos guardados, usar el benchmark
    setMeses(benchmarkData.meses);
  }

  // Funciones para registrar ediciones manuales del usuario
  function registerEditStep1(mes: number, campo: 'dias' | 'occ' | 'adr') {
    setEditedFieldsStep1(prev => {
      // Evitar duplicados
      const exists = prev.some(e => e.mes === mes && e.campo === campo);
      if (exists) return prev;
      return [...prev, { mes, campo }];
    });
  }

  function registerEditStep2(mes: number, campo: string) {
    setEditedFieldsStep2(prev => {
      const exists = prev.some(e => e.mes === mes && e.campo === campo);
      if (exists) return prev;
      return [...prev, { mes, campo }];
    });
  }

  function registerEditStep3(anio: number, campo: string) {
    setEditedFieldsStep3(prev => {
      const exists = prev.some(e => e.anio === anio && e.campo === campo);
      if (exists) return prev;
      return [...prev, { anio, campo }];
    });
  }

  // Funciones para formatear las notas de campos editados
  function formatEditedFieldsStep1(): string[] {
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    const fieldLabels: { [key: string]: string } = {
      'dias': 'Días de operativa',
      'occ': 'Ocupación',
      'adr': 'ADR'
    };

    // Agrupar por campo
    const grouped: { [field: string]: string[] } = {};

    editedFieldsStep1.forEach(edit => {
      const fieldLabel = fieldLabels[edit.campo] || edit.campo;
      const monthName = edit.mes ? monthNames[edit.mes - 1] : '';

      if (!grouped[fieldLabel]) {
        grouped[fieldLabel] = [];
      }
      if (monthName && !grouped[fieldLabel].includes(monthName)) {
        grouped[fieldLabel].push(monthName);
      }
    });

    // Formatear resultado
    const result: string[] = [];
    Object.entries(grouped).forEach(([field, months]) => {
      if (months.length > 0) {
        result.push(`${field} (${months.join(', ')})`);
      }
    });

    return result;
  }

  function formatEditedFieldsStep2(): string[] {
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    const fieldLabels: { [key: string]: string } = {
      'fb': 'F&B',
      'other_operated': 'Other Operated',
      'misc_income': 'Misc Income',
      'dept_rooms': 'Dept Rooms',
      'dept_fb': 'Dept F&B',
      'dept_other': 'Dept Other',
      'und_ag': 'A&G',
      'und_it': 'IT',
      'und_sm': 'Sales & Marketing',
      'und_pom': 'POM',
      'und_eww': 'Energy/Water/Waste'
    };

    // Agrupar por campo
    const grouped: { [field: string]: string[] } = {};

    editedFieldsStep2.forEach(edit => {
      const fieldLabel = fieldLabels[edit.campo] || edit.campo;
      const monthName = edit.mes ? monthNames[edit.mes - 1] : '';

      if (!grouped[fieldLabel]) {
        grouped[fieldLabel] = [];
      }
      if (monthName && !grouped[fieldLabel].includes(monthName)) {
        grouped[fieldLabel].push(monthName);
      }
    });

    // Formatear resultado
    const result: string[] = [];
    Object.entries(grouped).forEach(([field, months]) => {
      if (months.length > 0) {
        result.push(`${field} (${months.join(', ')})`);
      }
    });

    return result;
  }

  function formatEditedFieldsStep3(): string[] {
    const fieldLabels: { [key: string]: string } = {
      'operating_revenue': 'Total Rev',
      'dept_total': 'Dept Total',
      'und_total': 'Undistributed',
      'fees': 'Fees',
      'nonop': 'Non-Op',
      'ffe': 'FF&E'
    };

    // Agrupar por campo
    const grouped: { [field: string]: number[] } = {};

    editedFieldsStep3.forEach(edit => {
      const fieldLabel = fieldLabels[edit.campo] || edit.campo;
      const anio = edit.anio;

      if (!grouped[fieldLabel]) {
        grouped[fieldLabel] = [];
      }
      if (anio && !grouped[fieldLabel].includes(anio)) {
        grouped[fieldLabel].push(anio);
      }
    });

    // Formatear resultado
    const result: string[] = [];
    Object.entries(grouped).forEach(([field, years]) => {
      if (years.length > 0) {
        const sortedYears = years.sort((a, b) => a - b);
        result.push(`${field} (Año ${sortedYears.join(', ')})`);
      }
    });

    return result;
  }

  useEffect(() => {
    loadAllConfig().catch(console.error);
    loadProjectState().catch(console.error);
  }, [projectId]);

  useEffect(() => {
    if (basicInfoSaved) {
      loadBenchmark().catch(console.error);
    }
  }, [anio, projectId, basicInfoSaved]);

  // Calcular USALI automáticamente al abrir Paso 2 o cuando cambia operationConfig
  useEffect(() => {
    // NO recalcular si el proyecto ya está finalizado
    if (accepted && !usaliSaved && projectState !== 'finalized') {
      // Guardar configuración y recalcular USALI
      const recalculate = async () => {
        try {
          await saveOperationConfig();
          // Llamar directamente a /calc para recalcular con nuevos valores
          const r = await api(`/v1/projects/${projectId}/y1/calc`, { method:'POST', body: JSON.stringify({}) });
          setCalc(r);
        } catch (error) {
          console.error('Error recalculando USALI:', error);
        }
      };
      recalculate();
    }
  }, [accepted, operationConfig, usaliSaved, projectId, projectState]);

  // Calcular proyección automáticamente al abrir Paso 3 o cuando cambia projectionAssumptions
  useEffect(() => {
    // NO recalcular si el proyecto ya está finalizado
    if (accepted && calc && usaliSaved && !projectionSaved && projectState !== 'finalized') {
      // Guardar supuestos y recalcular proyección
      const recalculate = async () => {
        try {
          await saveProjectionAssumptions();
          await doProjection();
        } catch (error) {
          console.error('Error recalculando proyección:', error);
        }
      };
      recalculate();
    }
  }, [accepted, calc, usaliSaved, projectionAssumptions, projectionSaved, projectId, projectState]);

  // Calcular deuda automáticamente al abrir Paso 4 o cuando cambia financingConfig
  useEffect(() => {
    // NO recalcular si el proyecto ya está finalizado
    if (accepted && calc && usaliSaved && projectionSaved && !financingConfigSaved && projectState !== 'finalized') {
      // Solo recalcular deuda (NO guardar configuración automáticamente)
      doDebt();
    }
  }, [accepted, calc, usaliSaved, projectionSaved, financingConfig, financingConfigSaved, projectId, projectState]);

  async function accept() {
    // Normalizar datos: si días = 0, entonces occ = 0 y adr = 0
    const normalizedMeses = meses.map((m: any) => {
      if (m.dias === 0) {
        return { mes: m.mes, dias: 0, occ: 0, adr: 0 };
      }
      return { mes: m.mes, dias: m.dias, occ: m.occ, adr: m.adr };
    });

    // Actualizar estado local con valores normalizados
    setMeses(normalizedMeses);

    await api(`/v1/projects/${projectId}/y1/benchmark/accept`, {
      method:'POST',
      body: JSON.stringify({ anio_base: anio, meses: normalizedMeses })
    });

    setProjectState('y1_commercial');
    setAccepted(true);
  }

  async function calcY1() {
    try {
      const r = await api(`/v1/projects/${projectId}/y1/usali`);
      setCalc(r);

      // También cargar el calculado original para comparación (solo si USALI está guardado)
      const originalCalc = await api(`/v1/projects/${projectId}/y1/calc`, { method:'POST', body: JSON.stringify({}) });
      setCalculatedUsali(originalCalc.y1_mensual || []);

      return;
    } catch (error) {
      console.log('No hay USALI guardado, calculando con ratios de mercado');
    }

    const r = await api(`/v1/projects/${projectId}/y1/calc`, { method:'POST', body: JSON.stringify({}) });
    setCalc(r);
    setCalculatedUsali(r.y1_mensual || []); // Guardar como original también
  }

  async function saveUsali(editedData: any[]) {
    await api(`/v1/projects/${projectId}/y1/usali`, {
      method: 'PUT',
      body: JSON.stringify({ monthly: editedData })
    });

    setProjectState('y1_usali');
    setUsaliSaved(true);

    // Recargar USALI guardado
    await calcY1();
  }

  async function doProjection() {
    if (loading.projection) return;
    setLoading(prev => ({ ...prev, projection: true }));
    try {
      const ass = {
        years: projectionAssumptions.horizonte,
        adr_growth_pct: projectionAssumptions.adr_growth_pct,
        occ_delta_pp: projectionAssumptions.occ_delta_pp,
        occ_cap: projectionAssumptions.occ_cap,
        cost_inflation_pct: projectionAssumptions.cost_inflation_pct,
        undistributed_inflation_pct: projectionAssumptions.undistributed_inflation_pct,
        nonop_inflation_pct: projectionAssumptions.nonop_inflation_pct,
        fees_indexation_pct: projectionAssumptions.fees_indexation_pct
      };
      const r = await api(`/v1/projects/${projectId}/projection`, { method:'POST', body: JSON.stringify(ass) });
      setAnnuals(r.annuals);

      setProjectionSaved(false);
      setDebt(null);
      setVR(null);
    } catch (error) {
      console.error('Error en proyección:', error);
      alert('Error al proyectar: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setLoading(prev => ({ ...prev, projection: false }));
    }
  }

  async function saveProjection(editedAnnuals: any[]) {
    if (loading.save_projection) return;
    setLoading(prev => ({ ...prev, save_projection: true }));
    try {
      const years = editedAnnuals
        .filter(a => a.anio >= 2)
        .map(a => ({
          anio: a.anio,
          rn: a.rn,
          operating_revenue: a.operating_revenue,
          dept_total: a.dept_total,
          und_total: a.und_total,
          fees: a.fees,
          nonop: a.nonop,
          ffe: a.ffe
        }));

      await api(`/v1/projects/${projectId}/projection`, {
        method: 'PUT',
        body: JSON.stringify({ years })
      });

      // Asegurarse de que annuals esté actualizado ANTES de marcar como guardado
      setAnnuals(editedAnnuals);
      setProjectionSaved(true);
    } catch (error) {
      console.error('Error guardando proyección:', error);
      alert('Error al guardar proyección: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setLoading(prev => ({ ...prev, save_projection: false }));
    }
  }

  async function doDebt() {
    if (loading.debt) return;
    setLoading(prev => ({ ...prev, debt: true }));
    try {
      const r = await api(`/v1/projects/${projectId}/debt`, { method:'POST', body: JSON.stringify({}) });
      setDebt(r);
    } catch (error) {
      console.error('Error en cálculo de deuda:', error);
      alert('Error al calcular deuda: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setLoading(prev => ({ ...prev, debt: false }));
    }
  }

  async function doValuation() {
    if (loading.valuation) return;
    setLoading(prev => ({ ...prev, valuation: true }));
    try {
      const r = await api(`/v1/projects/${projectId}/valuation-and-returns`, { method:'POST', body: JSON.stringify({}) });
      setVR(r);
    } catch (error) {
      console.error('Error en valoración:', error);
      alert('Error al valorar: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setLoading(prev => ({ ...prev, valuation: false }));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <button className="px-2 py-1 border rounded" onClick={onBack}>← Volver</button>
        {basicInfoSaved && (
          <div className="flex items-center gap-2">
            <span>Año base</span>
            <input className="border px-2 py-1 rounded w-24" type="number" value={anio} onChange={e=>setAnio(Number(e.target.value))} />
            <button className="px-2 py-1 border rounded" onClick={loadBenchmark}>Recargar</button>
          </div>
        )}
      </div>

      {/* INICIO: Datos básicos del proyecto */}
      {!basicInfoSaved ? (
        <section>
          <h2 className="text-2xl font-bold mb-4">Configuración Inicial</h2>
          <ProjectBasicInfoForm
            data={basicInfo}
            onChange={setBasicInfo}
            onSubmit={saveBasicInfo}
          />
        </section>
      ) : (
        <section>
          <h3 className="text-lg font-semibold mb-2">Datos del Proyecto</h3>
          <ProjectBasicInfoForm
            data={basicInfo}
            onChange={setBasicInfo}
            onSubmit={saveBasicInfo}
            readOnly
          />
        </section>
      )}

      {/* PASO 1: Validación comercial Y1 */}
      {basicInfoSaved && !accepted && (
        <section>
          <h3 className="text-lg font-semibold mb-2">Paso 1 — Validación comercial Y1</h3>
          <MonthlyTable
            rows={meses}
            onChange={setMeses}
            habitaciones={basicInfo.habitaciones}
            onFieldEdit={registerEditStep1}
          />
          <button className="mt-3 px-3 py-2 bg-black text-white rounded" onClick={accept}>
            Guardar Paso 1 (Aceptar Y1 comercial)
          </button>
        </section>
      )}

      {/* PASO 1 guardado (read-only) */}
      {accepted && (
        <section>
          <h3 className="text-lg font-semibold mb-2">Paso 1 — Validación comercial Y1 ✓</h3>
          <MonthlyTable rows={meses} onChange={() => {}} habitaciones={basicInfo.habitaciones} />
          <EditedFieldsNote editedFields={formatEditedFieldsStep1()} />
        </section>
      )}

      {/* PASO 2: USALI Y1 (aparece después de guardar Paso 1, incluye formulario + tabla) */}
      {accepted && !usaliSaved && (
        <section>
          <h3 className="text-lg font-semibold mb-4">Paso 2 — USALI Y1</h3>

          {/* Formulario de Configuración (incluido en Paso 2) */}
          <div className="mb-6">
            <OperationConfigForm
              data={operationConfig}
              onChange={setOperationConfig}
              onSubmit={() => {}}
              showSubmitButton={false}
            />
          </div>

          <div className="space-y-3">
            {calc && (
              <UsaliEditor
                calculatedData={calc.y1_mensual}
                onSave={saveUsali}
                isGestionPropia={operationConfig.operacion_tipo === 'gestion_propia'}
                occupancyData={meses.map(m => ({ mes: m.mes, occ: m.occ }))}
                showSaveButton={false}
                onChange={setEditedUsaliData}
                showSummaryView={false}
                showBannerTop={false}
                feeParams={{
                  base_anual: operationConfig.fee_base_anual,
                  pct_total_rev: operationConfig.fee_pct_total_rev,
                  pct_gop: operationConfig.fee_pct_gop,
                  incentive_pct: operationConfig.fee_incentive_pct,
                  hurdle_gop_margin: operationConfig.fee_hurdle_gop_margin,
                  gop_ajustado: operationConfig.gop_ajustado
                }}
                nonopTotal={
                  operationConfig.nonop_taxes_anual +
                  operationConfig.nonop_insurance_anual +
                  operationConfig.nonop_rent_anual +
                  operationConfig.nonop_other_anual
                }
                ffePercent={operationConfig.ffe}
                habitaciones={basicInfo.habitaciones}
                diasData={meses.map(m => ({ mes: m.mes, dias: m.dias }))}
                onFieldEdit={registerEditStep2}
              />
            )}

            {/* Botón para guardar Paso 2 */}
            {calc && (
              <div className="mt-4">
                <button
                  className="px-4 py-2 bg-black text-white rounded"
                  onClick={() => saveUsali(editedUsaliData.length > 0 ? editedUsaliData : calc.y1_mensual)}
                >
                  Guardar Paso 2 (USALI Y1)
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* PASO 2 guardado (read-only) */}
      {accepted && calc && usaliSaved && (
        <section>
          <h3 className="text-lg font-semibold mb-4">Paso 2 — Validación USALI Y1 ✓</h3>

          {/* Formulario de Configuración (read-only) */}
          <div className="mb-6 opacity-75 pointer-events-none">
            <OperationConfigForm
              data={operationConfig}
              onChange={() => {}}
              onSubmit={() => {}}
              showSubmitButton={false}
            />
          </div>

          {/* Tabla USALI resumida (read-only) */}
          <UsaliEditor
            calculatedData={calc.y1_mensual}
            onSave={async () => {}}
            isGestionPropia={operationConfig.operacion_tipo === 'gestion_propia'}
            occupancyData={meses.map(m => ({ mes: m.mes, occ: m.occ }))}
            showSaveButton={false}
            onChange={() => {}}
            showSummaryView={true}
            showBannerTop={false}
            feeParams={{
              base_anual: operationConfig.fee_base_anual,
              pct_total_rev: operationConfig.fee_pct_total_rev,
              pct_gop: operationConfig.fee_pct_gop,
              incentive_pct: operationConfig.fee_incentive_pct,
              hurdle_gop_margin: operationConfig.fee_hurdle_gop_margin,
              gop_ajustado: operationConfig.gop_ajustado
            }}
            nonopTotal={
              operationConfig.nonop_taxes_anual +
              operationConfig.nonop_insurance_anual +
              operationConfig.nonop_rent_anual +
              operationConfig.nonop_other_anual
            }
            ffePercent={operationConfig.ffe}
            habitaciones={basicInfo.habitaciones}
            diasData={meses.map(m => ({ mes: m.mes, dias: m.dias }))}
          />
          <EditedFieldsNote editedFields={formatEditedFieldsStep2()} />
        </section>
      )}

      {/* PASO 3: Proyección 2..N (aparece después de guardar Paso 2, antes de guardar Paso 3) */}
      {accepted && calc && usaliSaved && !projectionSaved && (() => {
        // Calcular si los días fueron modificados
        const totalDias = meses.reduce((sum, m) => sum + (m.dias || 0), 0);
        const diasModificados = totalDias !== basicInfo.habitaciones * 365;

        return (
          <section>
            <h3 className="text-lg font-semibold mb-2">Paso 3 — Proyección años 1 a {projectionAssumptions.horizonte}</h3>

            {/* Formulario de Supuestos */}
            <ProjectionAssumptionsForm
              data={projectionAssumptions}
              onChange={setProjectionAssumptions}
              onSubmit={saveProjectionAssumptions}
              showSubmitButton={false}
            />

            {/* Tabla de Proyección */}
            {annuals && (
              <>
                <div className="mt-3">
                  <AnnualUsaliTable
                    data={annuals}
                    editable={true}
                    onChange={setAnnuals}
                    diasModificados={diasModificados}
                    onFieldEdit={registerEditStep3}
                  />
                </div>

                <div className="mt-3">
                  <button
                    className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
                    onClick={() => saveProjection(annuals)}
                    disabled={loading.save_projection}
                  >
                    {loading.save_projection ? 'Guardando...' : 'Guardar Paso 3 (PROYECCIÓN)'}
                  </button>
                </div>
              </>
            )}
          </section>
        );
      })()}

      {/* PASO 3 guardado (read-only) */}
      {accepted && calc && usaliSaved && projectionSaved && (() => {
        // Calcular si los días fueron modificados
        const totalDias = meses.reduce((sum, m) => sum + (m.dias || 0), 0);
        const diasModificados = totalDias !== basicInfo.habitaciones * 365;

        return (
          <section>
            <h3 className="text-lg font-semibold mb-4">Paso 3 — Proyección ✓</h3>

            {/* Formulario de Supuestos (read-only) */}
            <div className="mb-6 opacity-75 pointer-events-none">
              <ProjectionAssumptionsForm
                data={projectionAssumptions}
                onChange={() => {}}
                onSubmit={() => {}}
                showSubmitButton={false}
              />
            </div>

            {/* Banner de Totales Acumulados por Key */}
            {annuals && (() => {
                // Calcular totales acumulados
                const totals = annuals.reduce((acc, year) => ({
                  operating_revenue: acc.operating_revenue + (year.operating_revenue || 0),
                  gop: acc.gop + (year.gop || 0),
                  fees: acc.fees + (year.fees || 0),
                  ebitda: acc.ebitda + (year.ebitda || 0),
                  ffe: acc.ffe + (year.ffe || 0),
                  ebitda_less_ffe: acc.ebitda_less_ffe + (year.ebitda_less_ffe || 0),
                }), {
                  operating_revenue: 0,
                  gop: 0,
                  fees: 0,
                  ebitda: 0,
                  ffe: 0,
                  ebitda_less_ffe: 0,
                });

                const key = basicInfo.habitaciones; // Habitaciones físicas
                const totalRev = totals.operating_revenue || 1; // Para evitar división por 0

                return (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold mb-3">Resumen Acumulado ({annuals.length} años) - Por Key ({key} habitaciones)</h4>
                    <div className="grid grid-cols-3 gap-3">
                      {/* Total Rev */}
                      <div className="p-3 border rounded bg-blue-50">
                        <div className="text-xs text-gray-600 mb-1">Total Revenue</div>
                        <div className="font-semibold">{fmt(totals.operating_revenue)}</div>
                        <div className="text-sm text-gray-600">{fmt(totals.operating_revenue / key)} / key</div>
                        <div className="text-sm text-gray-600">100.00%</div>
                      </div>

                      {/* GOP */}
                      <div className="p-3 border rounded bg-green-50">
                        <div className="text-xs text-gray-600 mb-1">GOP</div>
                        <div className="font-semibold">{fmt(totals.gop)}</div>
                        <div className="text-sm text-gray-600">{fmt(totals.gop / key)} / key</div>
                        <div className="text-sm text-gray-600">{fmtDecimal((totals.gop / totalRev) * 100, 2)}%</div>
                      </div>

                      {/* FEES */}
                      <div className="p-3 border rounded bg-pink-50">
                        <div className="text-xs text-gray-600 mb-1">FEES</div>
                        <div className="font-semibold">{fmt(totals.fees)}</div>
                        <div className="text-sm text-gray-600">{fmt(totals.fees / key)} / key</div>
                        <div className="text-sm text-gray-600">{fmtDecimal((totals.fees / totalRev) * 100, 2)}%</div>
                      </div>

                      {/* EBITDA */}
                      <div className="p-3 border rounded bg-purple-50">
                        <div className="text-xs text-gray-600 mb-1">EBITDA</div>
                        <div className="font-semibold">{fmt(totals.ebitda)}</div>
                        <div className="text-sm text-gray-600">{fmt(totals.ebitda / key)} / key</div>
                        <div className="text-sm text-gray-600">{fmtDecimal((totals.ebitda / totalRev) * 100, 2)}%</div>
                      </div>

                      {/* FF&E */}
                      <div className="p-3 border rounded bg-gray-100">
                        <div className="text-xs text-gray-600 mb-1">FF&E</div>
                        <div className="font-semibold">{fmt(totals.ffe)}</div>
                        <div className="text-sm text-gray-600">{fmt(totals.ffe / key)} / key</div>
                        <div className="text-sm text-gray-600">{fmtDecimal((totals.ffe / totalRev) * 100, 2)}%</div>
                      </div>

                      {/* EBITDA-FF&E */}
                      <div className="p-3 border rounded bg-orange-50">
                        <div className="text-xs text-gray-600 mb-1">EBITDA-FF&E</div>
                        <div className="font-semibold">{fmt(totals.ebitda_less_ffe)}</div>
                        <div className="text-sm text-gray-600">{fmt(totals.ebitda_less_ffe / key)} / key</div>
                        <div className="text-sm text-gray-600">{fmtDecimal((totals.ebitda_less_ffe / totalRev) * 100, 2)}%</div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            <EditedFieldsNote editedFields={formatEditedFieldsStep3()} />
          </section>
        );
      })()}

      {/* PASO 4: Deuda (aparece después de guardar Paso 3, antes de guardar Paso 4) */}
      {accepted && calc && usaliSaved && projectionSaved && !financingConfigSaved && (
        <section>
          <h3 className="text-lg font-semibold mb-2">Paso 4 — Deuda</h3>

          {/* Formulario de Financiación */}
          <FinancingForm
            data={financingConfig}
            onChange={setFinancingConfig}
            onSubmit={saveFinancingConfig}
            showSubmitButton={false}
          />

          {/* Tabla de Deuda */}
          {debt && (
            <>
              <div className="mt-3">
                <h4 className="font-semibold">Resultado del Cálculo de Deuda</h4>
                <div className="text-sm mb-2">Principal inicial: {fmt(debt.loan_amount)}</div>
                <div className="overflow-auto">
                  <table className="w-full text-sm border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-2">Año</th>
                        <th className="p-2">Intereses</th>
                        <th className="p-2">Amortización</th>
                        <th className="p-2">Cuota</th>
                        <th className="p-2">Saldo final</th>
                      </tr>
                    </thead>
                    <tbody>
                      {debt.schedule.map((d:any)=>(
                        <tr key={d.anio} className="border-t">
                          <td className="p-2 text-center">{d.anio}</td>
                          <td className="p-2 text-right">{fmt(d.intereses)}</td>
                          <td className="p-2 text-right">{fmt(d.amortizacion)}</td>
                          <td className="p-2 text-right">{fmt(d.cuota)}</td>
                          <td className="p-2 text-right">{fmt(d.saldo_final)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-3">
                <button
                  className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
                  onClick={saveFinancingConfig}
                >
                  Guardar Paso 4 (DEUDA)
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {/* PASO 4 guardado (read-only) */}
      {accepted && calc && usaliSaved && projectionSaved && financingConfigSaved && (
        <section>
          <h3 className="text-lg font-semibold mb-4">Paso 4 — Deuda ✓</h3>

          {/* Formulario de Financiación (read-only) */}
          <div className="mb-6 opacity-75 pointer-events-none">
            <FinancingForm
              data={financingConfig}
              onChange={() => {}}
              onSubmit={() => {}}
              showSubmitButton={false}
            />
          </div>

          {/* Tabla de Deuda (read-only) */}
          {debt && (
            <div className="opacity-75 pointer-events-none">
              <h4 className="font-semibold">Resultado del Cálculo de Deuda</h4>
              <div className="text-sm mb-2">Principal inicial: {fmt(debt.loan_amount)}</div>
              <div className="overflow-auto">
                <table className="w-full text-sm border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2">Año</th>
                      <th className="p-2">Intereses</th>
                      <th className="p-2">Amortización</th>
                      <th className="p-2">Cuota</th>
                      <th className="p-2">Saldo final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debt.schedule.map((d:any)=>(
                      <tr key={d.anio} className="border-t">
                        <td className="p-2 text-center">{d.anio}</td>
                        <td className="p-2 text-right">{fmt(d.intereses)}</td>
                        <td className="p-2 text-right">{fmt(d.amortizacion)}</td>
                        <td className="p-2 text-right">{fmt(d.cuota)}</td>
                        <td className="p-2 text-right">{fmt(d.saldo_final)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* PASO 5: Valoración y Retornos (formulario antes de calcular) */}
      {accepted && calc && usaliSaved && projectionSaved && financingConfigSaved && !vr && (
        <section>
          <h3 className="text-lg font-semibold mb-2">Paso 5 — Valoración y Retornos</h3>
          <ValuationForm
            data={valuationConfig}
            onChange={setValuationConfig}
            onSubmit={saveValuationConfig}
          />
        </section>
      )}

      {/* PASO 5 guardado: Valoración y Retornos */}
      {accepted && calc && usaliSaved && projectionSaved && financingConfigSaved && vr && (
        <section>
          <h3 className="text-lg font-semibold mb-4">Paso 5 — Valoración & Retornos ✓</h3>

          {/* Formulario de Valoración (read-only) */}
          <div className="mb-6 opacity-75 pointer-events-none">
            <ValuationForm
              data={valuationConfig}
              onChange={() => {}}
              onSubmit={() => {}}
              showSubmitButton={false}
            />
          </div>

          {/* Resultados de Valoración */}
          <div className="mt-5">
            <h4 className="font-semibold">Valoración & Retornos</h4>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Valor salida bruto" value={vr.valuation.valor_salida_bruto}/>
              <Stat label="Valor salida neto" value={vr.valuation.valor_salida_neto}/>
              <Stat label="Equity inicial" value={vr.returns.levered.equity0}/>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="p-3 border rounded">
                <div className="font-semibold mb-1">Unlevered</div>
                <div>IRR: {fmtDecimal(vr.returns.unlevered.irr*100, 2)}%</div>
                <div>MOIC: {fmtDecimal(vr.returns.unlevered.moic, 2)}x</div>
              </div>
              <div className="p-3 border rounded">
                <div className="font-semibold mb-1">Levered</div>
                <div>IRR: {fmtDecimal(vr.returns.levered.irr*100, 2)}%</div>
                <div>MOIC: {fmtDecimal(vr.returns.levered.moic, 2)}x</div>
              </div>
            </div>
          </div>

          <SensitivityAnalysis
            projectId={projectId}
            baseAssumptions={{
              years: projectionAssumptions.horizonte,
              adr_growth_pct: projectionAssumptions.adr_growth_pct,
              occ_delta_pp: projectionAssumptions.occ_delta_pp,
              occ_cap: projectionAssumptions.occ_cap,
              cost_inflation_pct: projectionAssumptions.cost_inflation_pct,
              undistributed_inflation_pct: projectionAssumptions.undistributed_inflation_pct,
              nonop_inflation_pct: projectionAssumptions.nonop_inflation_pct,
              fees_indexation_pct: projectionAssumptions.fees_indexation_pct
            }}
            baseIRR={vr.returns.levered.irr}
            isFinalized={projectState === 'finalized'}
          />
        </section>
      )}
    </div>
  );
}

function fmt(n: number) {
  const rounded = Math.round(n ?? 0);
  const str = Math.abs(rounded).toString();
  const parts = [];
  for (let i = str.length; i > 0; i -= 3) {
    const start = Math.max(0, i - 3);
    parts.unshift(str.substring(start, i));
  }
  const formatted = parts.join('.');
  return rounded < 0 ? '-' + formatted : formatted;
}

function Stat({label, value}:{label:string; value:number}) {
  return (
    <div className="p-3 border rounded">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold">{fmt(value ?? 0)}</div>
    </div>
  );
}
