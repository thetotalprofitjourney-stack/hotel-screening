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

  const keys = basicInfo.habitaciones;
  const base = financingConfig.precio_compra ?? 0;
  const capex = financingConfig.capex_inicial ?? 0;
  const costs_buy = (base + capex) * (financingConfig.coste_tx_compra_pct ?? 0);
  const totalInvestment = base + capex + costs_buy;
  const loan0 = totalInvestment * (financingConfig.ltv ?? 0);
  const equity0 = totalInvestment - loan0;

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

  // Usar editedUsaliData si existe, sino usar calculatedUsali
  const usaliData = editedUsaliData && editedUsaliData.length > 0 ? editedUsaliData : calculatedUsali;
  const firstYearUsali = usaliData.find((u: any) => u.anio === annuals[0].anio);

  // Calcular promedios del primer año
  const avgOcc = meses.reduce((sum, m) => sum + (m.ocupacion ?? 0), 0) / 12;
  const avgAdr = meses.reduce((sum, m) => sum + (m.adr ?? 0), 0) / 12;
  const totalRoomnights = meses.reduce((sum, m) => sum + (m.roomnights ?? 0), 0);
  const totalRoomsRevenue = meses.reduce((sum, m) => sum + (m.rooms_revenue ?? 0), 0);
  const avgRevPAR = totalRoomsRevenue / (keys * 12 * 30.42); // aproximado

  const sections = [];

  // ========================================
  // 1. PORTADA
  // ========================================
  sections.push(
    new Paragraph({
      text: basicInfo.nombre || 'Proyecto sin nombre',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: 'Informe de análisis preliminar de inversión hotelera',
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      italics: true,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Ubicación: ', bold: true }),
        new TextRun({ text: `${basicInfo.provincia}, ${basicInfo.comunidad_autonoma}` }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Segmento: ', bold: true }),
        new TextRun({ text: basicInfo.segmento }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Categoría: ', bold: true }),
        new TextRun({ text: basicInfo.categoria }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Número de habitaciones: ', bold: true }),
        new TextRun({ text: keys.toString() }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Fecha del informe: ', bold: true }),
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
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `${basicInfo.nombre} es un proyecto ${basicInfo.segmento} ${basicInfo.categoria} ubicado en ${basicInfo.provincia}, ${basicInfo.comunidad_autonoma}, con ${keys} habitaciones. `,
        }),
        new TextRun({
          text: `La inversión total asciende a ${fmt(totalInvestment)} (${fmt(totalInvestment / keys)} por habitación), `,
        }),
        new TextRun({
          text: `requiriendo un equity de ${fmt(equity0)} (${fmt(equity0 / keys)} por key). `,
        }),
      ],
      spacing: { after: 150 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `El proyecto contempla una salida en el año ${lastYear} con un valor estimado de ${fmt(vr.valuation.valor_salida_neto)} (${fmt(vr.valuation.valor_salida_neto / keys)} por habitación). `,
        }),
        new TextRun({
          text: `Los retornos esperados incluyen un IRR levered del ${fmtPct(vr.returns.levered.irr)} y un MOIC de ${fmtDecimal(vr.returns.levered.moic, 2)}x. `,
        }),
      ],
      spacing: { after: 150 },
    }),
    new Paragraph({
      text: 'El análisis preliminar muestra una propuesta de inversión basada en supuestos de mercado y proyecciones operativas que requieren validación adicional antes de la toma de decisiones.',
      spacing: { after: 400 },
    }),
    new Paragraph({
      text: '',
      pageBreakBefore: true,
    }),

    // ========================================
    // 3. DESCRIPCIÓN DEL ACTIVO Y SUPUESTOS CLAVE
    // ========================================
    new Paragraph({
      text: '2. Descripción del Activo y Supuestos Clave',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Contexto del proyecto: ', bold: true }),
        new TextRun({
          text: `${basicInfo.nombre} es un proyecto ${basicInfo.segmento} ${basicInfo.categoria} ubicado en ${basicInfo.provincia}, ${basicInfo.comunidad_autonoma}, con ${keys} habitaciones.`,
        }),
      ],
      spacing: { after: 150 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Horizonte temporal: ', bold: true }),
        new TextRun({ text: `${projectionAssumptions.horizonte} años` }),
      ],
      spacing: { after: 150 },
    }),
    new Paragraph({
      text: 'Supuestos de crecimiento:',
      bold: true,
      spacing: { after: 100 },
    }),
    new Paragraph({
      text: `• Crecimiento anual ADR: ${fmtPct(projectionAssumptions.adr_growth_pct)}`,
      spacing: { after: 50 },
      bullet: { level: 0 },
    }),
    new Paragraph({
      text: `• Delta ocupación anual: ${fmtDecimal(projectionAssumptions.occ_delta_pp, 1)} pp`,
      spacing: { after: 50 },
      bullet: { level: 0 },
    }),
    new Paragraph({
      text: `• Cap ocupación: ${fmtPct(projectionAssumptions.occ_cap)}`,
      spacing: { after: 50 },
      bullet: { level: 0 },
    }),
    new Paragraph({
      text: `• Inflación costes directos: ${fmtPct(projectionAssumptions.cost_inflation_pct)}`,
      spacing: { after: 50 },
      bullet: { level: 0 },
    }),
    new Paragraph({
      text: `• Inflación undistributed: ${fmtPct(projectionAssumptions.undistributed_inflation_pct)}`,
      spacing: { after: 400 },
      bullet: { level: 0 },
    }),
    new Paragraph({
      text: '',
      pageBreakBefore: true,
    }),

    // ========================================
    // 4. VALIDACIÓN COMERCIAL - AÑO 1
    // ========================================
    new Paragraph({
      text: '3. Validación Comercial – Año 1',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    }),
  );

  // Tabla mensual
  const monthlyTableRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: 'Mes', bold: true })], shading: { fill: 'D9E9F7' } }),
        new TableCell({ children: [new Paragraph({ text: 'Ocupación', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'D9E9F7' } }),
        new TableCell({ children: [new Paragraph({ text: 'ADR (€)', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'D9E9F7' } }),
        new TableCell({ children: [new Paragraph({ text: 'Roomnights', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'D9E9F7' } }),
        new TableCell({ children: [new Paragraph({ text: 'Revenue (€)', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'D9E9F7' } }),
      ],
    }),
  ];

  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  meses.forEach((mes, idx) => {
    monthlyTableRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: monthNames[idx] })] }),
          new TableCell({ children: [new Paragraph({ text: fmtPct(mes.ocupacion ?? 0), alignment: AlignmentType.RIGHT })] }),
          new TableCell({ children: [new Paragraph({ text: fmt(mes.adr ?? 0), alignment: AlignmentType.RIGHT })] }),
          new TableCell({ children: [new Paragraph({ text: Math.round(mes.roomnights ?? 0).toString(), alignment: AlignmentType.RIGHT })] }),
          new TableCell({ children: [new Paragraph({ text: fmt(mes.rooms_revenue ?? 0), alignment: AlignmentType.RIGHT })] }),
        ],
      })
    );
  });

  // Fila de totales/promedios
  monthlyTableRows.push(
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: 'Promedio/Total', bold: true })], shading: { fill: 'F2F2F2' } }),
        new TableCell({ children: [new Paragraph({ text: fmtPct(avgOcc), bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'F2F2F2' } }),
        new TableCell({ children: [new Paragraph({ text: fmt(avgAdr), bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'F2F2F2' } }),
        new TableCell({ children: [new Paragraph({ text: Math.round(totalRoomnights).toString(), bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'F2F2F2' } }),
        new TableCell({ children: [new Paragraph({ text: fmt(totalRoomsRevenue), bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'F2F2F2' } }),
      ],
    })
  );

  sections.push(
    new Table({
      rows: monthlyTableRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
    }),
    new Paragraph({
      text: `RevPAR promedio anual: ${fmt(avgRevPAR)}`,
      spacing: { before: 200, after: 150 },
    }),
    new Paragraph({
      text: `El año 1 muestra una ocupación promedio del ${fmtPct(avgOcc)} con un ADR medio de ${fmt(avgAdr)}, generando ${fmt(totalRoomsRevenue)} en revenue de habitaciones.`,
      spacing: { after: 400 },
    }),
    new Paragraph({
      text: '',
      pageBreakBefore: true,
    })
  );

  // ========================================
  // 5. CUENTA DE RESULTADOS USALI - AÑO 1
  // ========================================
  if (firstYearUsali) {
    sections.push(
      new Paragraph({
        text: '4. Cuenta de Resultados USALI – Año 1',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 },
      })
    );

    const usaliRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Concepto', bold: true })], shading: { fill: 'D9E9F7' } }),
          new TableCell({ children: [new Paragraph({ text: 'Total (€)', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'D9E9F7' } }),
          new TableCell({ children: [new Paragraph({ text: '€/hab', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'D9E9F7' } }),
          new TableCell({ children: [new Paragraph({ text: '% Revenue', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'D9E9F7' } }),
        ],
      }),
    ];

    const totalRev = firstYearUsali.operating_revenue ?? 0;
    const usaliItems = [
      { label: 'Total Revenue', value: totalRev },
      { label: 'Department Profit', value: firstYearUsali.department_profit ?? 0 },
      { label: 'GOP', value: firstYearUsali.gop ?? 0 },
      { label: 'Fees Operador', value: firstYearUsali.fees ?? 0 },
      { label: 'EBITDA', value: firstYearUsali.ebitda ?? 0 },
      { label: 'FF&E Reserve', value: firstYearUsali.ffe ?? 0 },
      { label: 'EBITDA - FF&E', value: firstYearUsali.ebitda_less_ffe ?? 0 },
    ];

    usaliItems.forEach(item => {
      usaliRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: item.label })] }),
            new TableCell({ children: [new Paragraph({ text: fmt(item.value), alignment: AlignmentType.RIGHT })] }),
            new TableCell({ children: [new Paragraph({ text: fmt(item.value / keys), alignment: AlignmentType.RIGHT })] }),
            new TableCell({ children: [new Paragraph({ text: fmtPct(item.value / totalRev), alignment: AlignmentType.RIGHT })] }),
          ],
        })
      );
    });

    sections.push(
      new Table({
        rows: usaliRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
      new Paragraph({
        text: '',
        spacing: { after: 400 },
      }),
      new Paragraph({
        text: '',
        pageBreakBefore: true,
      })
    );
  }

  // ========================================
  // 6. PROYECCIÓN OPERATIVA (HORIZONTE COMPLETO)
  // ========================================
  sections.push(
    new Paragraph({
      text: '5. Proyección Operativa – Horizonte Completo',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    })
  );

  const projectionRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: 'Año', bold: true })], shading: { fill: 'D9E9F7' } }),
        new TableCell({ children: [new Paragraph({ text: 'Total Revenue (€)', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'D9E9F7' } }),
        new TableCell({ children: [new Paragraph({ text: 'GOP (€)', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'D9E9F7' } }),
        new TableCell({ children: [new Paragraph({ text: 'Fees (€)', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'D9E9F7' } }),
        new TableCell({ children: [new Paragraph({ text: 'EBITDA (€)', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'D9E9F7' } }),
        new TableCell({ children: [new Paragraph({ text: 'FF&E (€)', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'D9E9F7' } }),
        new TableCell({ children: [new Paragraph({ text: 'EBITDA-FF&E (€)', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'D9E9F7' } }),
      ],
    }),
  ];

  annuals.forEach(year => {
    projectionRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: year.anio.toString() })] }),
          new TableCell({ children: [new Paragraph({ text: fmt(year.operating_revenue ?? 0), alignment: AlignmentType.RIGHT })] }),
          new TableCell({ children: [new Paragraph({ text: fmt(year.gop ?? 0), alignment: AlignmentType.RIGHT })] }),
          new TableCell({ children: [new Paragraph({ text: fmt(year.fees ?? 0), alignment: AlignmentType.RIGHT })] }),
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
        new TableCell({ children: [new Paragraph({ text: fmt(totals.gop), bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'F2F2F2' } }),
        new TableCell({ children: [new Paragraph({ text: fmt(totals.fees), bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'F2F2F2' } }),
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
      text: `Durante el período de holding de ${projectionAssumptions.horizonte} años, el activo genera un EBITDA-FF&E acumulado de ${fmt(totals.ebitda_less_ffe)} (${fmt(totals.ebitda_less_ffe / keys)} por key), reflejando la estabilización operativa y capacidad de generación de caja del proyecto.`,
      spacing: { before: 200, after: 400 },
    }),
    new Paragraph({
      text: '',
      pageBreakBefore: true,
    })
  );

  // ========================================
  // 7. ESTRUCTURA DE INVERSIÓN - FUENTES & USOS
  // ========================================
  sections.push(
    new Paragraph({
      text: '6. Estructura de Inversión – Fuentes & Usos',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    })
  );

  const investmentRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: 'USOS', bold: true, alignment: AlignmentType.CENTER })], shading: { fill: 'D9E9F7' }, columnSpan: 2 }),
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
        new TableCell({ children: [new Paragraph({ text: 'FUENTES', bold: true, alignment: AlignmentType.CENTER })], shading: { fill: 'D9E9F7' }, columnSpan: 2 }),
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
      text: `Equity por habitación: ${fmt(equity0 / keys)}`,
      spacing: { before: 200, after: 400 },
      bold: true,
    }),
    new Paragraph({
      text: '',
      pageBreakBefore: true,
    })
  );

  // ========================================
  // 8. FINANCIACIÓN Y DEUDA
  // ========================================
  sections.push(
    new Paragraph({
      text: '7. Financiación y Deuda',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Tipo de amortización: ', bold: true }),
        new TextRun({ text: financingConfig.tipo_amortizacion === 'frances' ? 'Francesa' : 'Bullet' }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Tipo de interés: ', bold: true }),
        new TextRun({ text: fmtPct(financingConfig.interes ?? 0) }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Plazo: ', bold: true }),
        new TextRun({ text: `${financingConfig.plazo_anios} años` }),
      ],
      spacing: { after: 200 },
    })
  );

  const debtRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: 'Concepto', bold: true })], shading: { fill: 'D9E9F7' } }),
        new TableCell({ children: [new Paragraph({ text: 'Importe (€)', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'D9E9F7' } }),
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
        new TableCell({ children: [new Paragraph({ text: 'Total intereses pagados (holding)' })] }),
        new TableCell({ children: [new Paragraph({ text: fmt(totalIntereses), alignment: AlignmentType.RIGHT })] }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: 'Total principal amortizado (holding)' })] }),
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
      text: `El servicio total de la deuda durante el holding suma ${fmt(totalCuota)}, compuesto por ${fmt(totalIntereses)} de intereses y ${fmt(totalAmortizacion)} de amortización de principal.`,
      spacing: { before: 200, after: 400 },
    }),
    new Paragraph({
      text: '',
      pageBreakBefore: true,
    })
  );

  // ========================================
  // 9. VALORACIÓN DEL ACTIVO (EXIT)
  // ========================================
  sections.push(
    new Paragraph({
      text: '8. Valoración del Activo (Exit)',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Método de valoración: ', bold: true }),
        new TextRun({ text: valuationConfig.metodo_valoracion === 'cap_rate' ? 'Cap Rate' : 'Múltiplo' }),
      ],
      spacing: { after: 100 },
    })
  );

  if (valuationConfig.metodo_valoracion === 'cap_rate') {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Cap rate de salida: ', bold: true }),
          new TextRun({ text: fmtPct(valuationConfig.cap_rate_salida ?? 0) }),
        ],
        spacing: { after: 100 },
      })
    );
  } else {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Múltiplo de salida: ', bold: true }),
          new TextRun({ text: `${fmtDecimal(valuationConfig.multiplo_salida ?? 0, 2)}x` }),
        ],
        spacing: { after: 100 },
      })
    );
  }

  sections.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Costes de transacción de venta: ', bold: true }),
        new TextRun({ text: fmtPct(valuationConfig.coste_tx_venta_pct ?? 0) }),
      ],
      spacing: { after: 200 },
    })
  );

  // NOI estabilizado
  if (vr.valuation.noi_details) {
    sections.push(
      new Paragraph({
        text: 'Cálculo del NOI estabilizado:',
        bold: true,
        spacing: { after: 100 },
      })
    );

    const noiRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Año', bold: true })], shading: { fill: 'D9E9F7' } }),
          new TableCell({ children: [new Paragraph({ text: 'NOI (€)', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'D9E9F7' } }),
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
          new TableCell({ children: [new Paragraph({ text: 'Ajuste al año de salida (+2%/año)', bold: true })] }),
          new TableCell({ children: [new Paragraph({ text: `+${vr.valuation.noi_details.adjustment_years} años`, alignment: AlignmentType.RIGHT })] }),
        ],
      })
    );

    noiRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'NOI Estabilizado (media ajustada)', bold: true })], shading: { fill: 'F2F2F2' } }),
          new TableCell({ children: [new Paragraph({ text: fmt(vr.valuation.noi_estabilizado ?? 0), bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'F2F2F2' } }),
        ],
      })
    );

    sections.push(
      new Table({
        rows: noiRows,
        width: { size: 60, type: WidthType.PERCENTAGE },
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
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Valor de salida por habitación: ', bold: true }),
        new TextRun({ text: fmt(vr.valuation.valor_salida_neto / keys) }),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: 'Nota metodológica:',
      bold: true,
      spacing: { after: 100 },
    }),
    new Paragraph({
      text: 'El NOI estabilizado se calcula como la media ajustada de los últimos años del holding, proyectada al año de salida con un crecimiento del 2% anual. Este enfoque busca reflejar la capacidad operativa recurrente del activo en condiciones estabilizadas.',
      italics: true,
      spacing: { after: 400 },
    }),
    new Paragraph({
      text: '',
      pageBreakBefore: true,
    })
  );

  // ========================================
  // 10. ANÁLISIS DE PRECIO DE COMPRA
  // ========================================
  if (vr.purchase_price_analysis) {
    const ppa = vr.purchase_price_analysis;
    sections.push(
      new Paragraph({
        text: '9. Análisis de Precio de Compra',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 },
      })
    );

    const ppaRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Concepto', bold: true })], shading: { fill: 'D9E9F7' } }),
          new TableCell({ children: [new Paragraph({ text: 'Importe (€)', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'D9E9F7' } }),
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
          new TableCell({ children: [new Paragraph({ text: 'Precio de compra implícito' })] }),
          new TableCell({ children: [new Paragraph({ text: fmt(ppa.precio_implicito), alignment: AlignmentType.RIGHT })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Diferencia absoluta', bold: true })], shading: { fill: 'F2F2F2' } }),
          new TableCell({ children: [new Paragraph({ text: fmt(ppa.diferencia_absoluta), bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'F2F2F2' } }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Diferencia porcentual', bold: true })], shading: { fill: 'F2F2F2' } }),
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
        text: ppa.interpretacion,
        spacing: { before: 200, after: 200 },
      }),
      new Paragraph({
        text: 'Nota metodológica:',
        bold: true,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: 'El precio de compra implícito se calcula utilizando el cap rate de salida como tasa implícita de descuento, reflejando el precio máximo que soportaría los flujos proyectados y el exit esperado para alcanzar la rentabilidad objetivo.',
        italics: true,
        spacing: { after: 400 },
      }),
      new Paragraph({
        text: '',
        pageBreakBefore: true,
      })
    );
  }

  // ========================================
  // 11. FLUJOS DE CAJA AL EQUITY
  // ========================================
  sections.push(
    new Paragraph({
      text: '10. Flujos de Caja al Equity',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    })
  );

  const cashFlowData = [
    { label: 'Flujos operativos acumulados (EBITDA-FF&E)', value: totals.ebitda_less_ffe },
    { label: 'Servicio de deuda acumulado', value: totalCuota },
    { label: 'Caja neta al equity durante holding', value: totals.ebitda_less_ffe - totalCuota },
    { label: 'Equity neto al exit', value: equityAtExit },
  ];

  const cashFlowRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: 'Concepto', bold: true })], shading: { fill: 'D9E9F7' } }),
        new TableCell({ children: [new Paragraph({ text: 'Total (€)', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'D9E9F7' } }),
        new TableCell({ children: [new Paragraph({ text: '€/habitación', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'D9E9F7' } }),
      ],
    }),
  ];

  cashFlowData.forEach(item => {
    cashFlowRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: item.label })] }),
          new TableCell({ children: [new Paragraph({ text: fmt(item.value), alignment: AlignmentType.RIGHT })] }),
          new TableCell({ children: [new Paragraph({ text: fmt(item.value / keys), alignment: AlignmentType.RIGHT })] }),
        ],
      })
    );
  });

  sections.push(
    new Table({
      rows: cashFlowRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
    }),
    new Paragraph({
      text: '',
      spacing: { after: 400 },
    }),
    new Paragraph({
      text: '',
      pageBreakBefore: true,
    })
  );

  // ========================================
  // 12. RETORNOS DEL PROYECTO
  // ========================================
  sections.push(
    new Paragraph({
      text: '11. Retornos del Proyecto',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    })
  );

  const returnsRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: 'Métrica', bold: true })], shading: { fill: 'D9E9F7' } }),
        new TableCell({ children: [new Paragraph({ text: 'Valor', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'D9E9F7' } }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: 'IRR unlevered' })] }),
        new TableCell({ children: [new Paragraph({ text: fmtPct(vr.returns.unlevered.irr), alignment: AlignmentType.RIGHT })] }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: 'MOIC unlevered' })] }),
        new TableCell({ children: [new Paragraph({ text: `${fmtDecimal(vr.returns.unlevered.moic, 2)}x`, alignment: AlignmentType.RIGHT })] }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: 'IRR levered', bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: fmtPct(vr.returns.levered.irr), bold: true, alignment: AlignmentType.RIGHT })] }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: 'MOIC levered', bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: `${fmtDecimal(vr.returns.levered.moic, 2)}x`, bold: true, alignment: AlignmentType.RIGHT })] }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: 'Equity invertido (t0)' })] }),
        new TableCell({ children: [new Paragraph({ text: fmt(equity0), alignment: AlignmentType.RIGHT })] }),
      ],
    }),
  ];

  sections.push(
    new Table({
      rows: returnsRows,
      width: { size: 60, type: WidthType.PERCENTAGE },
    }),
    new Paragraph({
      text: 'Nota: Todos los retornos son pre-impuestos y están basados en flujos de caja.',
      italics: true,
      spacing: { before: 200, after: 400 },
    }),
    new Paragraph({
      text: '',
      pageBreakBefore: true,
    })
  );

  // ========================================
  // 13. STRESS TEST Y ROBUSTEZ
  // ========================================
  if (vr.sensitivity) {
    sections.push(
      new Paragraph({
        text: '12. Stress Test y Robustez',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: 'Análisis de sensibilidad del IRR levered bajo diferentes escenarios:',
        spacing: { after: 150 },
      })
    );

    const sensitivityRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Escenario', bold: true })], shading: { fill: 'D9E9F7' } }),
          new TableCell({ children: [new Paragraph({ text: 'IRR Levered', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'D9E9F7' } }),
        ],
      }),
    ];

    if (vr.sensitivity.scenarios) {
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
    }

    sections.push(
      new Table({
        rows: sensitivityRows,
        width: { size: 60, type: WidthType.PERCENTAGE },
      }),
      new Paragraph({
        text: 'El análisis de sensibilidad muestra la variabilidad de retornos bajo diferentes condiciones de mercado, permitiendo evaluar la robustez del proyecto ante escenarios adversos.',
        spacing: { before: 200, after: 400 },
      }),
      new Paragraph({
        text: '',
        pageBreakBefore: true,
      })
    );
  }

  // ========================================
  // 14. INSIGHTS FINALES DEL PROYECTO
  // ========================================
  sections.push(
    new Paragraph({
      text: '13. Insights Finales del Proyecto',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Contexto del proyecto: ', bold: true }),
        new TextRun({
          text: `${basicInfo.nombre} es un proyecto ${basicInfo.segmento} ${basicInfo.categoria} ubicado en ${basicInfo.provincia}, ${basicInfo.comunidad_autonoma}, con ${keys} habitaciones.`,
        }),
      ],
      spacing: { after: 150 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Inversión y equity: ', bold: true }),
        new TextRun({
          text: `La inversión total asciende a ${fmt(totalInvestment)}, lo que representa ${fmt(totalInvestment / keys)} por habitación. El equity aportado es de ${fmt(equity0)} (${fmt(equity0 / keys)} por key), con una financiación del ${fmtPct(financingConfig.ltv ?? 0)} LTV (${fmt(loan0)} de deuda) a un tipo de interés del ${fmtPct(financingConfig.interes ?? 0)} durante ${financingConfig.plazo_anios} años con amortización ${financingConfig.tipo_amortizacion === 'frances' ? 'francesa' : 'bullet'}.`,
        }),
      ],
      spacing: { after: 150 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Operativa y generación de caja: ', bold: true }),
        new TextRun({
          text: `Durante el período de holding de ${projectionAssumptions.horizonte} años, el activo genera un EBITDA-FF&E acumulado de ${fmt(totals.ebitda_less_ffe)} (${fmt(totals.ebitda_less_ffe / keys)} por key). Este flujo operativo es pre-impuestos e incluye la reserva de FF&E (${fmtPct(operationConfig.ffe ?? 0)} de ingresos), pero no contempla amortizaciones fiscales.`,
        }),
      ],
      spacing: { after: 150 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Impacto de la financiación: ', bold: true }),
        new TextRun({
          text: `El servicio total de la deuda durante el holding suma ${fmt(totalCuota)}, compuesto por ${fmt(totalIntereses)} de intereses y ${fmt(totalAmortizacion)} de amortización de principal. La caja neta disponible para el equity durante el período es de ${fmt(totals.ebitda_less_ffe - totalCuota)} (${fmt((totals.ebitda_less_ffe - totalCuota) / keys)} por key).`,
        }),
      ],
      spacing: { after: 150 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Valor de salida: ', bold: true }),
        new TextRun({
          text: `La salida está prevista para el año ${lastYear}, con un valor de ${fmt(vr.valuation.valor_salida_neto)} (${fmt(vr.valuation.valor_salida_neto / keys)} por key) aplicando ${
            valuationConfig.metodo_valoracion === 'cap_rate'
              ? `un cap rate de salida del ${fmtPct(valuationConfig.cap_rate_salida ?? 0)}`
              : `un múltiplo de ${fmtDecimal(valuationConfig.multiplo_salida ?? 0, 2)}x`
          } sobre un NOI estabilizado de ${fmt(vr.valuation.noi_estabilizado ?? noiLastYear)}${
            vr.valuation.noi_details ? ` (media ajustada de los últimos ${vr.valuation.noi_details.years_used} años)` : ''
          }. Tras liquidar la deuda pendiente (${fmt(saldoDeudaFinal)}), el equity neto al exit es de ${fmt(equityAtExit)} (${fmt(equityAtExit / keys)} por key).`,
        }),
      ],
      spacing: { after: 150 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Rentabilidad y robustez: ', bold: true }),
        new TextRun({
          text: `El proyecto muestra un IRR levered (con deuda) pre-impuestos del ${fmtPct(vr.returns.levered.irr)} y un MOIC de ${fmtDecimal(vr.returns.levered.moic, 2)}x. El IRR unlevered (sin deuda) es del ${fmtPct(vr.returns.unlevered.irr)}. ${
            vr.returns.levered.irr > vr.returns.unlevered.irr
              ? 'El apalancamiento genera valor positivo para el equity.'
              : 'El apalancamiento reduce la rentabilidad del equity.'
          } La plausibilidad del exit debe evaluarse considerando que el valor por key de ${fmt(vr.valuation.valor_salida_neto / keys)} se fundamenta en un NOI estabilizado de ${fmt((vr.valuation.noi_estabilizado ?? noiLastYear) / keys)} por habitación.`,
        }),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Nota metodológica: ', bold: true }),
        new TextRun({
          text: 'Todos los flujos de caja y retornos presentados son pre-impuestos sobre sociedades (IS). Se incluye la reserva de FF&E como salida de caja operativa. No se contemplan amortizaciones contables (al ser un cálculo de caja, no de P&L fiscal). La deuda pendiente se liquida íntegramente en la salida antes de calcular el equity neto.',
          italics: true,
        }),
      ],
      spacing: { after: 200 },
    })
  );

  // Crear el documento
  const doc = new Document({
    sections: [{
      properties: {},
      children: sections,
    }],
  });

  // Generar el archivo
  const blob = await Packer.toBlob(doc);
  const fileName = `${basicInfo.nombre || 'Proyecto'}_Screening_${new Date().toISOString().split('T')[0]}.docx`;
  saveAs(blob, fileName);
}
