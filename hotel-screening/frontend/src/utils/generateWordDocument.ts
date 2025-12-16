import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableCell,
  TableRow,
  AlignmentType,
  WidthType,
  BorderStyle,
  HeadingLevel,
  convertInchesToTwip,
} from 'docx';
import { saveAs } from 'file-saver';

// Funciones de formateo
function fmt(n: number): string {
  const rounded = Math.round(n ?? 0);
  const str = Math.abs(rounded).toString();
  const parts = [];
  for (let i = str.length; i > 0; i -= 3) {
    const start = Math.max(0, i - 3);
    parts.unshift(str.substring(start, i));
  }
  const formatted = parts.join('.');
  return `${rounded < 0 ? '-' : ''}${formatted} €`;
}

function fmtDecimal(n: number, decimals: number = 2): string {
  return n.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function fmtPct(n: number, decimals: number = 2): string {
  return `${fmtDecimal(n * 100, decimals)}%`;
}

interface GenerateWordDocumentParams {
  basicInfo: any;
  operationConfig: any;
  projectionAssumptions: any;
  financingConfig: any;
  valuationConfig: any;
  meses: any[];
  calculatedUsali: any[];
  editedUsaliData: any[];
  annuals: any[];
  debt: any;
  vr: any;
}

export async function generateWordDocument(params: GenerateWordDocumentParams) {
  try {
    console.log('Iniciando generación de documento Word...', params);

    const {
      basicInfo,
      operationConfig,
      projectionAssumptions,
      financingConfig,
      valuationConfig,
      meses,
      calculatedUsali,
      editedUsaliData,
      annuals,
      debt,
      vr
    } = params;

    // Validar datos esenciales
    if (!basicInfo || !annuals || !vr) {
      throw new Error('Faltan datos esenciales para generar el documento');
    }

    const keys = basicInfo.habitaciones;
    const base = financingConfig.precio_compra ?? 0;
    const capex = financingConfig.capex_inicial ?? 0;
    const costs_buy = (base + capex) * (financingConfig.coste_tx_compra_pct ?? 0);
    const totalInvestment = base + capex + costs_buy;
    // CORRECCIÓN: LTV se aplica solo sobre precio_compra + capex, NO sobre costes de transacción
    const loan0 = (base + capex) * (financingConfig.ltv ?? 0);
    const equity0 = (base + capex) * (1 - (financingConfig.ltv ?? 0)) + costs_buy;

    // Calcular totales acumulados
    const totals = annuals.reduce((acc: any, year: any) => ({
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

    const totalIntereses = debt?.schedule?.reduce((sum: number, d: any) => sum + (d.intereses || 0), 0) ?? 0;
    const totalAmortizacion = debt?.schedule?.reduce((sum: number, d: any) => sum + (d.amortizacion || 0), 0) ?? 0;
    const totalCuota = totalIntereses + totalAmortizacion;

    const lastYear = annuals[annuals.length - 1]?.anio;
    const lastAnnual = annuals[annuals.length - 1];
    const noiLastYear = lastAnnual?.ebitda_less_ffe ?? 0;
    const saldoDeudaFinal = debt?.schedule?.find((d: any) => d.anio === lastYear)?.saldo ?? 0;
    const equityAtExit = vr.valuation.valor_salida_neto - saldoDeudaFinal;

    // CORRECCIÓN: NOI estabilizado puede ser 0, necesitamos distinguir entre 0 y no disponible
    const noiEstabilizado = vr.valuation?.noi_estabilizado;
    const hasNoiEstabilizado = noiEstabilizado !== undefined && noiEstabilizado !== null && noiEstabilizado !== 0;

    // Usar editedUsaliData si existe, sino usar calculatedUsali
    const usaliData = editedUsaliData && editedUsaliData.length > 0 ? editedUsaliData : calculatedUsali;
    const firstYearUsali = usaliData && usaliData.length > 0 ? usaliData.find((u: any) => u.anio === annuals[0]?.anio) : null;

    // Calcular habitaciones disponibles totales del año 1 (suma de días * habitaciones)
    const hasMesesData = meses && meses.length > 0;
    let totalDiasY1 = 0;

    if (hasMesesData) {
      totalDiasY1 = meses.reduce((sum, m) => sum + (m.dias ?? 0), 0);
    }

    // Habitaciones disponibles por año (mismo para todos los años basado en Y1)
    const habitacionesDisponiblesPorAnio = keys * totalDiasY1;

    console.log('Datos calculados:', { keys, totalInvestment, equity0, totals, lastYear });

    const sections = [];
    console.log('Iniciando construcción de secciones...');

    // ========================================
    // 1. PORTADA
    // ========================================
    sections.push(
      new Paragraph({
        text: basicInfo.nombre || 'Proyecto sin nombre',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        text: 'Informe preliminar de análisis de inversión hotelera',
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Ubicación: ', bold: true }),
          new TextRun({ text: `${basicInfo.provincia}, ${basicInfo.comunidad_autonoma}` }),
        ],
        spacing: { after: 150 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Segmento: ', bold: true }),
          new TextRun({ text: basicInfo.segmento }),
        ],
        spacing: { after: 150 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Categoría: ', bold: true }),
          new TextRun({ text: basicInfo.categoria }),
        ],
        spacing: { after: 150 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Número de habitaciones: ', bold: true }),
          new TextRun({ text: keys.toString() }),
        ],
        spacing: { after: 150 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Fecha de generación: ', bold: true }),
          new TextRun({ text: new Date().toLocaleDateString('es-ES') }),
        ],
        spacing: { after: 400 },
      }),
      new Paragraph({
        text: '',
        pageBreakBefore: true,
      }),

      // ========================================
      // 2. RESUMEN EJECUTIVO
      // ========================================
      new Paragraph({
        text: '1. Resumen Ejecutivo',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 },
      }),
      new Paragraph({
        text: `${basicInfo.nombre} es un activo hotelero ${basicInfo.segmento.toLowerCase()} de categoría ${basicInfo.categoria}, ubicado en ${basicInfo.provincia}, ${basicInfo.comunidad_autonoma}, con ${keys} habitaciones. La inversión total requerida asciende a ${fmt(totalInvestment)}, equivalente a ${fmt(totalInvestment / keys)} por habitación. Esta cifra incluye un precio de compra de ${fmt(base)}, un capex inicial de ${fmt(capex)} y costes de transacción estimados en ${fmt(costs_buy)}.`,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: `La estructura de financiación contempla un apalancamiento del ${fmtPct(financingConfig.ltv ?? 0)} (${fmt(loan0)}) mediante un préstamo ${financingConfig.tipo_amortizacion === 'frances' ? 'con amortización francesa' : 'bullet'} a ${financingConfig.plazo_anios} años al ${fmtPct(financingConfig.interes ?? 0)} de interés, lo que requiere una aportación de equity de ${fmt(equity0)} (${fmt(equity0 / keys)} por habitación).`,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: `El horizonte de inversión se establece en ${projectionAssumptions.horizonte + 1} años, con estrategia de operación y posterior desinversión. La salida está prevista con un valor estimado de ${fmt(vr.valuation.valor_salida_neto)} (${fmt(vr.valuation.valor_salida_neto / keys)} por habitación), calculado mediante ${valuationConfig.metodo_valoracion === 'cap_rate' ? `cap rate de ${fmtPct(valuationConfig.cap_rate_salida ?? 0)}` : `múltiplo de ${fmtDecimal(valuationConfig.multiplo_salida ?? 0, 2)}x`} sobre un NOI estabilizado.`,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: `Los retornos esperados muestran un IRR levered del ${fmtPct(vr.returns.levered.irr)} y un MOIC de ${fmtDecimal(vr.returns.levered.moic, 2)}x. Sin apalancamiento, el proyecto arroja un IRR unlevered del ${fmtPct(vr.returns.unlevered.irr)} y un MOIC de ${fmtDecimal(vr.returns.unlevered.moic, 2)}x.`,
        spacing: { after: 200 },
      })
    );

    // Agregar análisis de precio implícito en resumen ejecutivo si existe
    if (vr.purchase_price_analysis) {
      const ppa = vr.purchase_price_analysis;
      const precioStatus = ppa.diferencia_absoluta < 0 ? 'por debajo' : 'por encima';
      sections.push(
        new Paragraph({
          text: `El análisis de precio de compra muestra que el precio introducido (${fmt(ppa.precio_introducido)}) se sitúa ${precioStatus} del precio implícito según flujos proyectados (${fmt(ppa.precio_implicito)}), con una diferencia del ${fmtPct(ppa.diferencia_porcentual)}. ${ppa.diferencia_absoluta < 0 ? 'Esto sugiere un margen de seguridad en la adquisición según los supuestos utilizados.' : 'Esto indica que se está pagando una prima respecto al valor que justifican los flujos proyectados según los supuestos utilizados.'}`,
          spacing: { after: 200 },
        })
      );
    }

    sections.push(
      new Paragraph({
        text: 'Este informe presenta un análisis preliminar basado en supuestos de mercado y proyecciones operativas que requieren validación con due diligence detallada antes de la toma de decisiones de inversión. Los flujos y retornos son pre-impuestos.',
        spacing: { after: 400 },
      }),

      // ========================================
      // 3. CUENTA DE RESULTADOS OPERATIVA (USALI)
      // ========================================
      new Paragraph({
        text: '3. Cuenta de Resultados Operativa (USALI)',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 },
      })
    );

    // Nueva tabla: Resumen anual de métricas operativas
    const annualMetricsRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Año', bold: true })], shading: { fill: 'E7E6E6' } }),
          new TableCell({ children: [new Paragraph({ text: '% Ocupación', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
          new TableCell({ children: [new Paragraph({ text: 'ADR', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
          new TableCell({ children: [new Paragraph({ text: 'RevPAR', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
          new TableCell({ children: [new Paragraph({ text: 'TRevPAR', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
          new TableCell({ children: [new Paragraph({ text: 'Revenue €/RN', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
          new TableCell({ children: [new Paragraph({ text: 'GOP €/RN', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
          new TableCell({ children: [new Paragraph({ text: 'EBITDA-FF&E €/RN', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
        ],
      }),
    ];

    annuals.forEach((year) => {
      // Usar datos reales del backend
      const occupancy = year.occupancy ?? 0;
      const adr = year.adr ?? 0;
      const rn = year.rn ?? 0;

      // RevPAR = Ocupación * ADR
      const revPAR = occupancy * adr;

      // TRevPAR = Total Revenue / Habitaciones disponibles por año
      const tRevPAR = habitacionesDisponiblesPorAnio > 0 ? (year.operating_revenue ?? 0) / habitacionesDisponiblesPorAnio : 0;

      // Revenue por RN = Total Revenue / RN
      const revenuePerRN = rn > 0 ? (year.operating_revenue ?? 0) / rn : 0;

      // GOP por RN = GOP / RN
      const gopPerRN = rn > 0 ? (year.gop ?? 0) / rn : 0;

      // EBITDA-FF&E por RN = EBITDA-FF&E / RN
      const ebitdaFFEPerRN = rn > 0 ? (year.ebitda_less_ffe ?? 0) / rn : 0;

      annualMetricsRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: year.anio.toString() })] }),
            new TableCell({ children: [new Paragraph({ text: occupancy > 0 ? fmtPct(occupancy) : 'N/A', alignment: AlignmentType.RIGHT })] }),
            new TableCell({ children: [new Paragraph({ text: adr > 0 ? fmt(adr) : 'N/A', alignment: AlignmentType.RIGHT })] }),
            new TableCell({ children: [new Paragraph({ text: revPAR > 0 ? fmt(revPAR) : 'N/A', alignment: AlignmentType.RIGHT })] }),
            new TableCell({ children: [new Paragraph({ text: tRevPAR > 0 ? fmt(tRevPAR) : 'N/A', alignment: AlignmentType.RIGHT })] }),
            new TableCell({ children: [new Paragraph({ text: fmt(revenuePerRN), alignment: AlignmentType.RIGHT })] }),
            new TableCell({ children: [new Paragraph({ text: fmt(gopPerRN), alignment: AlignmentType.RIGHT })] }),
            new TableCell({ children: [new Paragraph({ text: fmt(ebitdaFFEPerRN), alignment: AlignmentType.RIGHT })] }),
          ],
        })
      );
    });

    sections.push(
      new Table({
        rows: annualMetricsRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
      new Paragraph({
        text: 'La tabla muestra la evolución anual de las principales métricas operativas por habitación, reflejando la maduración del activo durante el período de holding.',
        spacing: { before: 200, after: 400 },
      })
    );

    if (firstYearUsali) {
      const totalRev = firstYearUsali.operating_revenue ?? 0;
      const usaliSummaryRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: 'Concepto', bold: true })], shading: { fill: 'E7E6E6' } }),
            new TableCell({ children: [new Paragraph({ text: 'Total (€)', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
            new TableCell({ children: [new Paragraph({ text: '€/hab', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
            new TableCell({ children: [new Paragraph({ text: '% Revenue', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: 'Total Revenue' })] }),
            new TableCell({ children: [new Paragraph({ text: fmt(totalRev), alignment: AlignmentType.RIGHT })] }),
            new TableCell({ children: [new Paragraph({ text: fmt(totalRev / keys), alignment: AlignmentType.RIGHT })] }),
            new TableCell({ children: [new Paragraph({ text: '100.0%', alignment: AlignmentType.RIGHT })] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: 'GOP' })] }),
            new TableCell({ children: [new Paragraph({ text: fmt(firstYearUsali.gop ?? 0), alignment: AlignmentType.RIGHT })] }),
            new TableCell({ children: [new Paragraph({ text: fmt((firstYearUsali.gop ?? 0) / keys), alignment: AlignmentType.RIGHT })] }),
            new TableCell({ children: [new Paragraph({ text: fmtPct((firstYearUsali.gop ?? 0) / totalRev), alignment: AlignmentType.RIGHT })] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: 'EBITDA' })] }),
            new TableCell({ children: [new Paragraph({ text: fmt(firstYearUsali.ebitda ?? 0), alignment: AlignmentType.RIGHT })] }),
            new TableCell({ children: [new Paragraph({ text: fmt((firstYearUsali.ebitda ?? 0) / keys), alignment: AlignmentType.RIGHT })] }),
            new TableCell({ children: [new Paragraph({ text: fmtPct((firstYearUsali.ebitda ?? 0) / totalRev), alignment: AlignmentType.RIGHT })] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: 'EBITDA - FF&E' })] }),
            new TableCell({ children: [new Paragraph({ text: fmt(firstYearUsali.ebitda_less_ffe ?? 0), alignment: AlignmentType.RIGHT })] }),
            new TableCell({ children: [new Paragraph({ text: fmt((firstYearUsali.ebitda_less_ffe ?? 0) / keys), alignment: AlignmentType.RIGHT })] }),
            new TableCell({ children: [new Paragraph({ text: fmtPct((firstYearUsali.ebitda_less_ffe ?? 0) / totalRev), alignment: AlignmentType.RIGHT })] }),
          ],
        }),
      ];

      sections.push(
        new Table({
          rows: usaliSummaryRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
        new Paragraph({
          text: `La estructura operativa del año 1 muestra un margen GOP del ${fmtPct((firstYearUsali.gop ?? 0) / totalRev)} y un EBITDA del ${fmtPct((firstYearUsali.ebitda ?? 0) / totalRev)}. Tras deducir los fees de operador (${fmt(firstYearUsali.fees ?? 0)}) y la reserva FF&E del ${fmtPct(operationConfig.ffe ?? 0)}, el EBITDA-FF&E alcanza ${fmt(firstYearUsali.ebitda_less_ffe ?? 0)}, equivalente a ${fmt((firstYearUsali.ebitda_less_ffe ?? 0) / keys)} por habitación.`,
          spacing: { before: 200, after: 400 },
        })
      );
    }

    sections.push(
      // ========================================
      // 4. PROYECCIÓN OPERATIVA Y GENERACIÓN DE CAJA
      // ========================================
      new Paragraph({
        text: '4. Proyección Operativa y Generación de Caja',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 },
      })
    );

    // Tabla anual resumida
    const projectionRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Año', bold: true })], shading: { fill: 'E7E6E6' } }),
          new TableCell({ children: [new Paragraph({ text: 'Revenue (€)', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
          new TableCell({ children: [new Paragraph({ text: 'EBITDA (€)', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
          new TableCell({ children: [new Paragraph({ text: 'FF&E (€)', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
          new TableCell({ children: [new Paragraph({ text: 'EBITDA-FF&E (€)', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
        ],
      }),
    ];

    annuals.forEach(year => {
      projectionRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: year.anio.toString() })] }),
            new TableCell({ children: [new Paragraph({ text: fmt(year.operating_revenue ?? 0), alignment: AlignmentType.RIGHT })] }),
            new TableCell({ children: [new Paragraph({ text: fmt(year.ebitda ?? 0), alignment: AlignmentType.RIGHT })] }),
            new TableCell({ children: [new Paragraph({ text: fmt(year.ffe ?? 0), alignment: AlignmentType.RIGHT })] }),
            new TableCell({ children: [new Paragraph({ text: fmt(year.ebitda_less_ffe ?? 0), alignment: AlignmentType.RIGHT })] }),
          ],
        })
      );
    });

    // Fila de totales
    projectionRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'TOTAL', bold: true })], shading: { fill: 'F2F2F2' } }),
          new TableCell({ children: [new Paragraph({ text: fmt(totals.operating_revenue), bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'F2F2F2' } }),
          new TableCell({ children: [new Paragraph({ text: fmt(totals.ebitda), bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'F2F2F2' } }),
          new TableCell({ children: [new Paragraph({ text: fmt(totals.ffe), bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'F2F2F2' } }),
          new TableCell({ children: [new Paragraph({ text: fmt(totals.ebitda_less_ffe), bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'F2F2F2' } }),
        ],
      })
    );

    sections.push(
      new Table({
        rows: projectionRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
      new Paragraph({
        text: `Durante el horizonte completo de ${projectionAssumptions.horizonte + 1} años, el activo genera un EBITDA acumulado de ${fmt(totals.ebitda)} y un EBITDA-FF&E de ${fmt(totals.ebitda_less_ffe)} (${fmt(totals.ebitda_less_ffe / keys)} por habitación). La evolución de los flujos refleja la maduración operativa del activo y la estabilización de márgenes conforme se consolida el posicionamiento de mercado. La capacidad de generación de caja del proyecto constituye la base para el servicio de deuda y la rentabilidad del equity.`,
        spacing: { before: 200, after: 400 },
      }),

      // ========================================
      // 5. ESTRUCTURA DE LA INVERSIÓN (FUENTES & USOS)
      // ========================================
      new Paragraph({
        text: '5. Estructura de la Inversión',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 },
      })
    );

    const investmentRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'USOS', bold: true })], shading: { fill: 'E7E6E6' }, columnSpan: 2 }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Precio de compra' })] }),
          new TableCell({ children: [new Paragraph({ text: fmt(base), alignment: AlignmentType.RIGHT })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Capex inicial' })] }),
          new TableCell({ children: [new Paragraph({ text: fmt(capex), alignment: AlignmentType.RIGHT })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Costes de transacción' })] }),
          new TableCell({ children: [new Paragraph({ text: fmt(costs_buy), alignment: AlignmentType.RIGHT })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Inversión Total', bold: true })], shading: { fill: 'F2F2F2' } }),
          new TableCell({ children: [new Paragraph({ text: fmt(totalInvestment), bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'F2F2F2' } }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: '' })], borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } }),
          new TableCell({ children: [new Paragraph({ text: '' })], borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'FUENTES', bold: true })], shading: { fill: 'E7E6E6' }, columnSpan: 2 }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: `Deuda (${fmtPct(financingConfig.ltv ?? 0)} LTV)` })] }),
          new TableCell({ children: [new Paragraph({ text: fmt(loan0), alignment: AlignmentType.RIGHT })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Equity' })] }),
          new TableCell({ children: [new Paragraph({ text: fmt(equity0), alignment: AlignmentType.RIGHT })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Total Fuentes', bold: true })], shading: { fill: 'F2F2F2' } }),
          new TableCell({ children: [new Paragraph({ text: fmt(totalInvestment), bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'F2F2F2' } }),
        ],
      }),
    ];

    sections.push(
      new Table({
        rows: investmentRows,
        width: { size: 70, type: WidthType.PERCENTAGE },
      }),
      new Paragraph({
        text: `La estructura de capital contempla un apalancamiento del ${fmtPct(financingConfig.ltv ?? 0)} sobre la inversión total, requiriendo una aportación de equity de ${fmt(equity0)}, equivalente a ${fmt(equity0 / keys)} por habitación. Esta configuración busca optimizar el retorno al capital mediante el uso eficiente de deuda senior.`,
        spacing: { before: 200, after: 400 },
      }),

      // ========================================
      // 6. FINANCIACIÓN Y PERFIL DE DEUDA
      // ========================================
      new Paragraph({
        text: '6. Financiación y Perfil de Deuda',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 },
      }),
      new Paragraph({
        text: `El proyecto contempla financiación mediante préstamo ${financingConfig.tipo_amortizacion === 'frances' ? 'con amortización francesa' : 'bullet'} a ${financingConfig.plazo_anios} años, con tipo de interés del ${fmtPct(financingConfig.interes ?? 0)}. El principal inicial asciende a ${fmt(loan0)}, sobre el cual se calcula el servicio de deuda durante el período de holding.`,
        spacing: { after: 200 },
      })
    );

    const debtRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Concepto', bold: true })], shading: { fill: 'E7E6E6' } }),
          new TableCell({ children: [new Paragraph({ text: 'Importe (€)', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Principal inicial' })] }),
          new TableCell({ children: [new Paragraph({ text: fmt(loan0), alignment: AlignmentType.RIGHT })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: `Deuda pendiente año ${lastYear}` })] }),
          new TableCell({ children: [new Paragraph({ text: fmt(saldoDeudaFinal), alignment: AlignmentType.RIGHT })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Intereses pagados (holding)' })] }),
          new TableCell({ children: [new Paragraph({ text: fmt(totalIntereses), alignment: AlignmentType.RIGHT })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Principal amortizado (holding)' })] }),
          new TableCell({ children: [new Paragraph({ text: fmt(totalAmortizacion), alignment: AlignmentType.RIGHT })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Servicio total de deuda', bold: true })], shading: { fill: 'F2F2F2' } }),
          new TableCell({ children: [new Paragraph({ text: fmt(totalCuota), bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'F2F2F2' } }),
        ],
      }),
    ];

    sections.push(
      new Table({
        rows: debtRows,
        width: { size: 70, type: WidthType.PERCENTAGE },
      }),
      new Paragraph({
        text: `El servicio acumulado de deuda suma ${fmt(totalCuota)} durante el holding, de los cuales ${fmt(totalIntereses)} corresponden a intereses y ${fmt(totalAmortizacion)} a amortización de principal. Al momento de la salida en el año ${lastYear}, la deuda pendiente asciende a ${fmt(saldoDeudaFinal)}, importe que será liquidado con cargo al valor de exit antes de distribuir el equity neto.`,
        spacing: { before: 200, after: 200 },
      }),
      new Paragraph({
        text: '',
        pageBreakBefore: true,
      }),

      // ========================================
      // 7. VALORACIÓN DEL ACTIVO Y EXIT
      // ========================================
      new Paragraph({
        text: '7. Valoración del Activo y Exit',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 },
      }),
      new Paragraph({
        text: `La valoración del activo al momento de la salida se realiza mediante ${valuationConfig.metodo_valoracion === 'cap_rate' ? `cap rate de ${fmtPct(valuationConfig.cap_rate_salida ?? 0)}` : `múltiplo de ${fmtDecimal(valuationConfig.multiplo_salida ?? 0, 2)}x`}, aplicado sobre un NOI estabilizado. Los costes de transacción de venta se estiman en ${fmtPct(valuationConfig.coste_tx_venta_pct ?? 0)} del valor bruto.`,
        spacing: { after: 200 },
      })
    );

    // Explicación NOI estabilizado
    if (vr.valuation.noi_details && vr.valuation.noi_details.last_years_noi && Array.isArray(vr.valuation.noi_details.last_years_noi)) {
      sections.push(
        new Paragraph({
          text: 'El NOI estabilizado se calcula como la media de los últimos años del holding, ajustada al año de salida con un crecimiento interno del 2% anual. Este enfoque permite reflejar la capacidad operativa recurrente del activo en condiciones normalizadas:',
          spacing: { after: 200 },
        })
      );

      const noiRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: 'Año', bold: true })], shading: { fill: 'E7E6E6' } }),
            new TableCell({ children: [new Paragraph({ text: 'NOI (€)', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
          ],
        }),
      ];

      vr.valuation.noi_details.last_years_noi.forEach((noi: number, idx: number) => {
        const yearNum = lastYear - vr.valuation.noi_details.years_used + idx + 1;
        noiRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: `Año ${yearNum}` })] }),
              new TableCell({ children: [new Paragraph({ text: fmt(noi), alignment: AlignmentType.RIGHT })] }),
            ],
          })
        );
      });

      noiRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: 'Media simple' })] }),
            new TableCell({ children: [new Paragraph({ text: fmt(vr.valuation.noi_details.last_years_noi.reduce((sum: number, noi: number) => sum + noi, 0) / vr.valuation.noi_details.last_years_noi.length), alignment: AlignmentType.RIGHT })] }),
          ],
        })
      );

      noiRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: `Ajuste al año de salida (+2%/año × ${vr.valuation.noi_details.adjustment_years} años)` })] }),
            new TableCell({ children: [new Paragraph({ text: `Factor ${fmtDecimal(Math.pow(1.02, vr.valuation.noi_details.adjustment_years), 3)}x`, alignment: AlignmentType.RIGHT })] }),
          ],
        })
      );

      noiRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: 'NOI Estabilizado', bold: true })], shading: { fill: 'F2F2F2' } }),
            new TableCell({ children: [new Paragraph({ text: fmt(vr.valuation.noi_estabilizado ?? 0), bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'F2F2F2' } }),
          ],
        })
      );

      sections.push(
        new Table({
          rows: noiRows,
          width: { size: 70, type: WidthType.PERCENTAGE },
        }),
        new Paragraph({
          text: '',
          spacing: { after: 200 },
        })
      );
    }

    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Valor de salida total: ', bold: true }),
          new TextRun({ text: fmt(vr.valuation.valor_salida_neto) }),
        ],
        spacing: { after: 150 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Valor por habitación: ', bold: true }),
          new TextRun({ text: fmt(vr.valuation.valor_salida_neto / keys) }),
        ],
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: `El valor de salida neto asciende a ${fmt(vr.valuation.valor_salida_neto)}, lo que representa ${fmt(vr.valuation.valor_salida_neto / keys)} por habitación. Esta valoración refleja la capacidad del activo de generar un NOI ${hasNoiEstabilizado ? 'estabilizado' : 'del último año'} de ${fmt(hasNoiEstabilizado ? noiEstabilizado : noiLastYear)}${hasNoiEstabilizado && vr.valuation.noi_details?.last_years_noi ? ` (media de los últimos años: ${fmt(vr.valuation.noi_details.last_years_noi.reduce((sum: number, noi: number) => sum + noi, 0) / vr.valuation.noi_details.last_years_noi.length)})` : ''} (${fmt((hasNoiEstabilizado ? noiEstabilizado : noiLastYear) / keys)} por key), valorado al ${valuationConfig.metodo_valoracion === 'cap_rate' ? `cap rate del ${fmtPct(valuationConfig.cap_rate_salida ?? 0)}` : `múltiplo de ${fmtDecimal(valuationConfig.multiplo_salida ?? 0, 2)}x`}.`,
        spacing: { after: 400 },
      }),

      // ========================================
      // 8. ANÁLISIS DE PRECIO DE COMPRA
      // ========================================
      new Paragraph({
        text: '8. Análisis de Precio de Compra',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 },
      })
    );

    // Análisis de precio de compra - siempre mostrar valores
    let ppa = vr.purchase_price_analysis;

    // Si no existe purchase_price_analysis, intentar calcularlo o usar valores por defecto
    if (!ppa) {
      // Calcular precio implícito manualmente si no está disponible
      const precioIntroducido = base; // precio_compra
      let precioImplicito = 0;

      // Intentar calcular precio implícito basándose en los flujos
      if (valuationConfig.metodo_valoracion === 'cap_rate' && valuationConfig.cap_rate_salida) {
        // Descontar el valor de salida y los flujos
        const capRate = valuationConfig.cap_rate_salida;
        const flujosCajaDuranteHolding = totals.ebitda_less_ffe - totalCuota;
        const valorSalidaBruto = vr.valuation.valor_salida_neto;

        // Calcular precio implícito descontando a cap rate
        precioImplicito = valorSalidaBruto / Math.pow(1 + capRate, projectionAssumptions.horizonte + 1);
      }

      const diferenciaAbsoluta = precioIntroducido - precioImplicito;
      const diferenciaPorcentual = precioImplicito > 0 ? diferenciaAbsoluta / precioImplicito : 0;

      ppa = {
        precio_introducido: precioIntroducido,
        precio_implicito: precioImplicito,
        diferencia_absoluta: diferenciaAbsoluta,
        diferencia_porcentual: diferenciaPorcentual,
        interpretacion: diferenciaAbsoluta < 0
          ? 'El precio introducido se sitúa por debajo del precio implícito según los flujos proyectados, sugiriendo un margen de seguridad en la adquisición.'
          : 'El precio introducido se sitúa por encima del precio implícito según los flujos proyectados, indicando una prima respecto al valor que justifican los flujos.'
      };
    }

    sections.push(
      new Paragraph({
        text: 'El análisis de coherencia económica compara el precio de compra introducido con el precio implícito que justificarían los flujos proyectados y el valor de salida, utilizando el cap rate de exit como tasa de descuento implícita.',
        spacing: { after: 200 },
      })
    );

    const ppaRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Concepto', bold: true })], shading: { fill: 'E7E6E6' } }),
          new TableCell({ children: [new Paragraph({ text: 'Importe (€)', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Precio de compra introducido' })] }),
          new TableCell({ children: [new Paragraph({ text: fmt(ppa.precio_introducido), alignment: AlignmentType.RIGHT })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Precio implícito según flujos y exit' })] }),
          new TableCell({ children: [new Paragraph({ text: fmt(ppa.precio_implicito), alignment: AlignmentType.RIGHT })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Diferencia (€)', bold: true })], shading: { fill: 'F2F2F2' } }),
          new TableCell({ children: [new Paragraph({ text: fmt(ppa.diferencia_absoluta), bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'F2F2F2' } }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Diferencia (%)', bold: true })], shading: { fill: 'F2F2F2' } }),
          new TableCell({ children: [new Paragraph({ text: fmtPct(ppa.diferencia_porcentual), bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'F2F2F2' } }),
        ],
      }),
    ];

    sections.push(
      new Table({
        rows: ppaRows,
        width: { size: 70, type: WidthType.PERCENTAGE },
      }),
      new Paragraph({
        text: ppa.interpretacion || 'Análisis basado en los supuestos operativos y de salida configurados.',
        spacing: { before: 200, after: 200 },
      }),
      new Paragraph({
        text: 'Este análisis no constituye una recomendación de inversión, sino una evaluación de la coherencia económica del precio respecto a los supuestos operativos y de salida configurados. La diferencia entre ambos precios indica el margen de seguridad (si es negativa) o la prima pagada (si es positiva) según el modelo.',
        spacing: { after: 400 },
      })
    );

    // ========================================
    // 9. FLUJOS AL EQUITY Y RETORNOS
    // ========================================
    sections.push(
      new Paragraph({
        text: '9. Flujos al Equity y Retornos',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 },
      }),
      new Paragraph({
        text: `Los flujos de caja al equity se calculan restando al EBITDA-FF&E acumulado el servicio total de deuda durante el holding. Al momento de la salida, se liquida la deuda pendiente con cargo al valor de exit, distribuyendo el equity neto restante.`,
        spacing: { after: 200 },
      })
    );

    const cashFlowRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Concepto', bold: true })], shading: { fill: 'E7E6E6' } }),
          new TableCell({ children: [new Paragraph({ text: 'Total (€)', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Equity invertido (t0)' })] }),
          new TableCell({ children: [new Paragraph({ text: fmt(-equity0), alignment: AlignmentType.RIGHT })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Caja neta durante el holding' })] }),
          new TableCell({ children: [new Paragraph({ text: fmt(totals.ebitda_less_ffe - totalCuota), alignment: AlignmentType.RIGHT })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Equity neto al exit' })] }),
          new TableCell({ children: [new Paragraph({ text: fmt(equityAtExit), alignment: AlignmentType.RIGHT })] }),
        ],
      }),
    ];

    sections.push(
      new Table({
        rows: cashFlowRows,
        width: { size: 70, type: WidthType.PERCENTAGE },
      }),
      new Paragraph({
        text: '',
        spacing: { after: 300 },
      })
    );

    const returnsRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Métrica', bold: true })], shading: { fill: 'E7E6E6' } }),
          new TableCell({ children: [new Paragraph({ text: 'Unlevered', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
          new TableCell({ children: [new Paragraph({ text: 'Levered', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'IRR' })] }),
          new TableCell({ children: [new Paragraph({ text: fmtPct(vr.returns.unlevered.irr), alignment: AlignmentType.RIGHT })] }),
          new TableCell({ children: [new Paragraph({ text: fmtPct(vr.returns.levered.irr), alignment: AlignmentType.RIGHT })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'MOIC' })] }),
          new TableCell({ children: [new Paragraph({ text: `${fmtDecimal(vr.returns.unlevered.moic, 2)}x`, alignment: AlignmentType.RIGHT })] }),
          new TableCell({ children: [new Paragraph({ text: `${fmtDecimal(vr.returns.levered.moic, 2)}x`, alignment: AlignmentType.RIGHT })] }),
        ],
      }),
    ];

    sections.push(
      new Table({
        rows: returnsRows,
        width: { size: 70, type: WidthType.PERCENTAGE },
      }),
      new Paragraph({
        text: `El proyecto muestra un IRR levered del ${fmtPct(vr.returns.levered.irr)} y un MOIC de ${fmtDecimal(vr.returns.levered.moic, 2)}x. ${vr.returns.levered.irr > vr.returns.unlevered.irr ? 'El apalancamiento genera valor positivo para el equity, dado que el coste de la deuda es inferior a la rentabilidad unlevered del proyecto.' : 'El apalancamiento reduce la rentabilidad del equity, dado que el coste de la deuda supera la rentabilidad unlevered del activo.'} Todos los retornos son pre-impuestos y se calculan sobre flujos de caja, no sobre resultados contables.`,
        spacing: { before: 200, after: 400 },
      })
    );

    // ========================================
    // 10. STRESS TEST Y ROBUSTEZ
    // ========================================
    if (vr.sensitivity && vr.sensitivity.scenarios && Array.isArray(vr.sensitivity.scenarios) && vr.sensitivity.scenarios.length > 0) {
      sections.push(
        new Paragraph({
          text: '10. Stress Test y Robustez',
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 300 },
        }),
        new Paragraph({
          text: 'El análisis de sensibilidad evalúa la variabilidad del IRR levered bajo diferentes escenarios de mercado, permitiendo valorar la robustez del proyecto ante desviaciones respecto al caso base.',
          spacing: { after: 200 },
        })
      );

      const sensitivityRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: 'Escenario', bold: true })], shading: { fill: 'E7E6E6' } }),
            new TableCell({ children: [new Paragraph({ text: 'IRR Levered', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
          ],
        }),
      ];

      vr.sensitivity.scenarios.forEach((scenario: any) => {
        sensitivityRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: scenario.label })] }),
              new TableCell({ children: [new Paragraph({ text: fmtPct(scenario.irr_levered), alignment: AlignmentType.RIGHT })] }),
            ],
          })
        );
      });

      // Calcular rango de variabilidad
      const irrs = vr.sensitivity.scenarios.map((s: any) => s.irr_levered);
      const minIRR = Math.min(...irrs);
      const maxIRR = Math.max(...irrs);

      sections.push(
        new Table({
          rows: sensitivityRows,
          width: { size: 70, type: WidthType.PERCENTAGE },
        }),
        new Paragraph({
          text: `El rango de variabilidad del IRR levered se sitúa entre ${fmtPct(minIRR)} y ${fmtPct(maxIRR)}, reflejando ${maxIRR - minIRR < 0.05 ? 'una alta robustez del proyecto ante variaciones de mercado' : maxIRR - minIRR < 0.10 ? 'una robustez moderada del proyecto ante variaciones de mercado' : 'una sensibilidad significativa del proyecto ante variaciones de mercado'}. La evaluación de riesgo debe considerar la probabilidad de materialización de cada escenario y su impacto sobre la viabilidad del proyecto.`,
          spacing: { before: 200, after: 400 },
        })
      );
    }

    // ========================================
    // 11. CONCLUSIONES E INSIGHTS FINALES
    // ========================================
    sections.push(
      new Paragraph({
        text: vr.sensitivity && vr.sensitivity.scenarios && Array.isArray(vr.sensitivity.scenarios) && vr.sensitivity.scenarios.length > 0 ? '11. Conclusiones e Insights Finales' : '10. Conclusiones e Insights Finales',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 },
      }),
      new Paragraph({
        text: `${basicInfo.nombre} representa una oportunidad de inversión en el sector hotelero ${basicInfo.segmento.toLowerCase()} de ${basicInfo.provincia}, con una inversión total de ${fmt(totalInvestment)} (${fmt(totalInvestment / keys)} por habitación) y una aportación de equity de ${fmt(equity0)}.`,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: `La proyección operativa estima generar ${fmt(totals.ebitda_less_ffe)} de EBITDA-FF&E acumulado durante ${projectionAssumptions.horizonte + 1} años de holding. Tras atender el servicio de deuda (${fmt(totalCuota)}), la caja neta disponible para el equity durante el período asciende a ${fmt(totals.ebitda_less_ffe - totalCuota)}.`,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: `La estrategia de salida contempla una desinversión en el año ${lastYear} con un valor estimado de ${fmt(vr.valuation.valor_salida_neto)}, basado en un NOI ${hasNoiEstabilizado ? 'estabilizado' : 'del último año'} de ${fmt(hasNoiEstabilizado ? noiEstabilizado : noiLastYear)} valorado ${valuationConfig.metodo_valoracion === 'cap_rate' ? `al ${fmtPct(valuationConfig.cap_rate_salida ?? 0)} cap rate` : `a ${fmtDecimal(valuationConfig.multiplo_salida ?? 0, 2)}x múltiplo`}. Tras liquidar la deuda pendiente (${fmt(saldoDeudaFinal)}), el equity neto recuperable alcanza ${fmt(equityAtExit)}.`,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: `Los retornos proyectados muestran un IRR levered del ${fmtPct(vr.returns.levered.irr)} y un MOIC de ${fmtDecimal(vr.returns.levered.moic, 2)}x. ${vr.returns.levered.irr > vr.returns.unlevered.irr ? `El apalancamiento aporta valor al equity, incrementando el IRR desde ${fmtPct(vr.returns.unlevered.irr)} (unlevered) hasta ${fmtPct(vr.returns.levered.irr)} (levered).` : `El coste de financiación reduce el retorno al equity respecto al unlevered (${fmtPct(vr.returns.unlevered.irr)}).`}`,
        spacing: { after: 200 },
      })
    );

    if (vr.purchase_price_analysis) {
      const ppa = vr.purchase_price_analysis;
      sections.push(
        new Paragraph({
          text: `El análisis de precio de compra revela que el precio introducido (${fmt(ppa.precio_introducido)}) se sitúa ${ppa.diferencia_absoluta < 0 ? `${fmt(Math.abs(ppa.diferencia_absoluta))} por debajo` : `${fmt(ppa.diferencia_absoluta)} por encima`} del precio implícito según flujos proyectados (${fmt(ppa.precio_implicito)}), representando ${ppa.diferencia_absoluta < 0 ? 'un margen de seguridad' : 'una prima'} del ${fmtPct(Math.abs(ppa.diferencia_porcentual))} sobre el valor que justifican los supuestos utilizados.`,
          spacing: { after: 200 },
        })
      );
    }

    if (vr.sensitivity && vr.sensitivity.scenarios && Array.isArray(vr.sensitivity.scenarios) && vr.sensitivity.scenarios.length > 0) {
      const irrs = vr.sensitivity.scenarios.map((s: any) => s.irr_levered);
      const minIRR = Math.min(...irrs);
      const maxIRR = Math.max(...irrs);
      sections.push(
        new Paragraph({
          text: `El análisis de sensibilidad indica que el IRR levered podría oscilar entre ${fmtPct(minIRR)} y ${fmtPct(maxIRR)} según distintos escenarios de mercado, sugiriendo ${maxIRR - minIRR < 0.05 ? 'una alta robustez estructural del proyecto' : maxIRR - minIRR < 0.10 ? 'una sensibilidad moderada a variaciones de mercado' : 'una elevada sensibilidad a las condiciones de mercado'}.`,
          spacing: { after: 300 },
        })
      );
    }

    sections.push(
      new Paragraph({
        text: 'Nota metodológica',
        bold: true,
        spacing: { after: 150 },
      }),
      new Paragraph({
        text: `Todos los flujos de caja y retornos presentados son pre-impuestos sobre sociedades. El EBITDA-FF&E incluye la reserva de FF&E (${fmtPct(operationConfig.ffe ?? 0)} de ingresos) como salida de caja operativa. No se contemplan amortizaciones contables dado que el análisis se fundamenta en flujos de caja reales, no en resultados contables. La deuda pendiente se liquida íntegramente al momento de la salida antes de distribuir el equity neto. Este análisis constituye un screening preliminar y no sustituye un proceso completo de due diligence operativa, legal, fiscal y técnica.`,
        spacing: { after: 200 },
      })
    );

    // Crear el documento
    console.log('Creando documento Word con', sections.length, 'secciones...');
    const doc = new Document({
      sections: [{
        properties: {},
        children: sections,
      }],
    });

    // Generar el archivo
    console.log('Generando blob...');
    const blob = await Packer.toBlob(doc);
    const fileName = `${basicInfo.nombre || 'Proyecto'}_Investment_Screening_${new Date().toISOString().split('T')[0]}.docx`;
    console.log('Descargando archivo:', fileName);
    saveAs(blob, fileName);
    console.log('Documento generado exitosamente');
  } catch (error) {
    console.error('Error detallado al generar documento Word:', error);
    if (error instanceof Error) {
      console.error('Mensaje de error:', error.message);
      console.error('Stack trace:', error.stack);
    }
    throw error;
  }
}
