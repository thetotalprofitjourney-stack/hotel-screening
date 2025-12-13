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
  const [accepted, setAccepted] = useState(false);
  const [calc, setCalc] = useState<any|null>(null);
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
        setFinancingConfigSaved(true);
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
        }
      }
    } catch (error) {
      console.error('Error cargando estado del proyecto:', error);
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

      setFinancingConfigSaved(true);
      // Calcular deuda automáticamente
      await doDebt();
    } catch (error) {
      console.error('Error guardando configuración de financiación:', error);
      alert('Error al guardar la configuración de financiación');
    }
  }

  async function saveValuationConfig() {
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
    try {
      const y1Data = await api(`/v1/projects/${projectId}/y1/commercial`);
      if (y1Data && y1Data.meses && y1Data.meses.length === 12) {
        setMeses(y1Data.meses);
        return;
      }
    } catch (error) {
      console.log('No hay datos de Y1 comercial guardados, cargando benchmark');
    }

    const data = await api(`/v1/projects/${projectId}/y1/benchmark?anio_base=${anio}`);
    setMeses(data.meses);
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
    if (accepted && !usaliSaved) {
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
  }, [accepted, operationConfig, usaliSaved, projectId]);

  async function accept() {
    await api(`/v1/projects/${projectId}/y1/benchmark/accept`, {
      method:'POST',
      body: JSON.stringify({ anio_base: anio, meses: meses.map((m:any)=>({ mes:m.mes, dias:m.dias, occ:m.occ, adr:m.adr })) })
    });

    setProjectState('y1_commercial');
    setAccepted(true);
  }

  async function calcY1() {
    try {
      const r = await api(`/v1/projects/${projectId}/y1/usali`);
      setCalc(r);
      return;
    } catch (error) {
      console.log('No hay USALI guardado, calculando con ratios de mercado');
    }

    const r = await api(`/v1/projects/${projectId}/y1/calc`, { method:'POST', body: JSON.stringify({}) });
    setCalc(r);
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

      setProjectionSaved(true);
      setAnnuals(editedAnnuals);
      alert('✅ Proyección guardada correctamente');
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
          <MonthlyTable rows={meses} onChange={setMeses} habitaciones={basicInfo.habitaciones} />
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

          {/* Tabla USALI (read-only) */}
          <UsaliEditor
            calculatedData={calc.y1_mensual}
            onSave={async () => {}}
            isGestionPropia={operationConfig.operacion_tipo === 'gestion_propia'}
            occupancyData={meses.map(m => ({ mes: m.mes, occ: m.occ }))}
            showSaveButton={false}
            onChange={() => {}}
            showSummaryView={false}
            showBannerTop={false}
          />
        </section>
      )}

      {/* Formulario de Supuestos de Proyección (aparece después de guardar Paso 2) */}
      {accepted && calc && usaliSaved && !projectionAssumptionsSaved && (
        <section>
          <h3 className="text-lg font-semibold mb-4">Supuestos de Proyección</h3>
          <ProjectionAssumptionsForm
            data={projectionAssumptions}
            onChange={setProjectionAssumptions}
            onSubmit={saveProjectionAssumptions}
          />
        </section>
      )}

      {/* PASO 3: Proyección 2..N */}
      {accepted && calc && usaliSaved && projectionAssumptionsSaved && (
        <section>
          <h3 className="text-lg font-semibold mb-2">Paso 3 — Proyección {projectionAssumptions.horizonte > 2 ? '2..' + projectionAssumptions.horizonte : ''}</h3>

          {annuals && (
            <>
              <AnnualUsaliTable
                data={annuals}
                editable={true}
                onChange={setAnnuals}
              />

              <div className="mt-3">
                <button
                  className="px-4 py-2 bg-green-600 text-white rounded disabled:bg-gray-400 font-semibold"
                  onClick={() => saveProjection(annuals)}
                  disabled={loading.save_projection || projectionSaved}
                >
                  {loading.save_projection ? 'Guardando...' : projectionSaved ? '✓ Proyección guardada' : 'Guardar Paso 3 (PROYECCIÓN)'}
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {/* Formulario de Financiación (aparece después de guardar Paso 3) */}
      {accepted && calc && usaliSaved && projectionSaved && !financingConfigSaved && (
        <section>
          <h3 className="text-lg font-semibold mb-4">Financiación del Proyecto</h3>
          <FinancingForm
            data={financingConfig}
            onChange={setFinancingConfig}
            onSubmit={saveFinancingConfig}
          />
        </section>
      )}

      {/* PASO 4: Deuda */}
      {accepted && calc && usaliSaved && projectionSaved && financingConfigSaved && (
        <section>
          <h3 className="text-lg font-semibold mb-2">Paso 4 — Deuda</h3>

          {debt && (
            <div className="mt-5">
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

      {/* Formulario de Valoración (aparece después de calcular deuda) */}
      {accepted && calc && usaliSaved && projectionSaved && debt && !vr && (
        <section>
          <h3 className="text-lg font-semibold mb-4">Configuración de Valoración</h3>
          <ValuationForm
            data={valuationConfig}
            onChange={setValuationConfig}
            onSubmit={saveValuationConfig}
          />
        </section>
      )}

      {/* PASO 5: Valoración y Retornos */}
      {accepted && calc && usaliSaved && projectionSaved && debt && vr && (
        <section>
          <h3 className="text-lg font-semibold mb-2">Paso 5 — Valoración & Retornos</h3>

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
