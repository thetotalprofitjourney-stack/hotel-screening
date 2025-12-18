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
  HeadingLevel,
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

interface OperadorData {
  project: {
    nombre: string;
    comunidad_autonoma: string;
    provincia: string;
    zona: string;
    segmento: string;
    categoria: string;
    habitaciones: number;
    horizonte: number;
  };
  operator: {
    operacion_tipo: string;
    fee_base_anual: number;
    fee_pct_total_rev: number;
    fee_pct_gop: number;
    fee_incentive_pct: number;
    fee_hurdle_gop_margin: number;
  };
  settings: {
    ffe: number;
  };
  annuals: any[];
  totals: {
    operating_revenue: number;
    gop: number;
    fees: number;
    ebitda: number;
    rn: number;
  };
}

export async function generateOperadorWordDocument(data: OperadorData) {
  try {
    console.log('Generando documento Word para operador...', data);

    const { project, operator, settings, annuals, totals } = data;
    const keys = project.habitaciones;

    const sections = [];

    // ========================================
    // 1. PORTADA
    // ========================================
    sections.push(
      new Paragraph({
        text: project.nombre || 'Proyecto sin nombre',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        text: 'Análisis Operativo - Fees del Operador',
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Ubicación: ', bold: true }),
          new TextRun({ text: `${project.provincia}, ${project.comunidad_autonoma}` }),
        ],
        spacing: { after: 150 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Segmento: ', bold: true }),
          new TextRun({ text: project.segmento }),
        ],
        spacing: { after: 150 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Categoría: ', bold: true }),
          new TextRun({ text: project.categoria }),
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
          new TextRun({ text: 'Horizonte de proyección: ', bold: true }),
          new TextRun({ text: `${project.horizonte} años` }),
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
        text: `Este documento presenta un análisis operativo del proyecto ${project.nombre}, un activo hotelero ${project.segmento.toLowerCase()} de categoría ${project.categoria} ubicado en ${project.provincia}, ${project.comunidad_autonoma}, con ${keys} habitaciones.`,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: `El análisis se centra en la proyección de resultados operativos (USALI) y los fees de gestión que percibiría el operador durante un horizonte de ${project.horizonte} años. Los resultados muestran unos ingresos totales proyectados de ${fmt(totals.operating_revenue)}, con un GOP acumulado de ${fmt(totals.gop)} y fees totales para el operador de ${fmt(totals.fees)}.`,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: `Los fees representan aproximadamente el ${fmtPct(totals.fees / totals.operating_revenue)} de los ingresos totales y el ${fmtPct(totals.fees / totals.gop)} del GOP generado durante el período de proyección.`,
        spacing: { after: 400 },
      }),

      // ========================================
      // 3. ESTRUCTURA DE FEES
      // ========================================
      new Paragraph({
        text: '2. Estructura de Fees del Operador',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 },
      }),
      new Paragraph({
        text: 'La estructura de fees del contrato de gestión contempla los siguientes componentes:',
        spacing: { after: 200 },
      })
    );

    const feeStructureRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Componente', bold: true })], shading: { fill: 'E7E6E6' } }),
          new TableCell({ children: [new Paragraph({ text: 'Valor', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Fee base anual' })] }),
          new TableCell({ children: [new Paragraph({ text: fmt(operator.fee_base_anual), alignment: AlignmentType.RIGHT })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Fee % sobre Revenue Total' })] }),
          new TableCell({ children: [new Paragraph({ text: fmtPct(operator.fee_pct_total_rev), alignment: AlignmentType.RIGHT })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Fee % sobre GOP' })] }),
          new TableCell({ children: [new Paragraph({ text: fmtPct(operator.fee_pct_gop), alignment: AlignmentType.RIGHT })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Fee incentivo % (si GOP/Revenue ≥ hurdle)' })] }),
          new TableCell({ children: [new Paragraph({ text: fmtPct(operator.fee_incentive_pct), alignment: AlignmentType.RIGHT })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Hurdle GOP margin para incentivo' })] }),
          new TableCell({ children: [new Paragraph({ text: fmtPct(operator.fee_hurdle_gop_margin), alignment: AlignmentType.RIGHT })] }),
        ],
      }),
    ];

    sections.push(
      new Table({
        rows: feeStructureRows,
        width: { size: 70, type: WidthType.PERCENTAGE },
      }),
      new Paragraph({
        text: 'Los fees se calculan mensualmente y se devengan de forma acumulativa a lo largo del período de gestión.',
        spacing: { before: 200, after: 400 },
      }),

      // ========================================
      // 4. RESULTADOS OPERATIVOS PROYECTADOS (USALI)
      // ========================================
      new Paragraph({
        text: '3. Resultados Operativos Proyectados (USALI)',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 },
      })
    );

    // Tabla anual de USALI
    const usaliRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Año', bold: true })], shading: { fill: 'E7E6E6' } }),
          new TableCell({ children: [new Paragraph({ text: 'Revenue (€)', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
          new TableCell({ children: [new Paragraph({ text: 'GOP (€)', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
          new TableCell({ children: [new Paragraph({ text: 'GOP %', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
          new TableCell({ children: [new Paragraph({ text: 'Fees (€)', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
          new TableCell({ children: [new Paragraph({ text: 'EBITDA (€)', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
        ],
      }),
    ];

    annuals.forEach((year: any) => {
      usaliRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: year.anio.toString() })] }),
            new TableCell({ children: [new Paragraph({ text: fmt(year.operating_revenue ?? 0), alignment: AlignmentType.RIGHT })] }),
            new TableCell({ children: [new Paragraph({ text: fmt(year.gop ?? 0), alignment: AlignmentType.RIGHT })] }),
            new TableCell({ children: [new Paragraph({ text: fmtPct(year.gop_margin ?? 0), alignment: AlignmentType.RIGHT })] }),
            new TableCell({ children: [new Paragraph({ text: fmt(year.fees ?? 0), alignment: AlignmentType.RIGHT })] }),
            new TableCell({ children: [new Paragraph({ text: fmt(year.ebitda ?? 0), alignment: AlignmentType.RIGHT })] }),
          ],
        })
      );
    });

    // Fila de totales
    usaliRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'TOTAL', bold: true })], shading: { fill: 'F2F2F2' } }),
          new TableCell({ children: [new Paragraph({ text: fmt(totals.operating_revenue), bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'F2F2F2' } }),
          new TableCell({ children: [new Paragraph({ text: fmt(totals.gop), bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'F2F2F2' } }),
          new TableCell({ children: [new Paragraph({ text: fmtPct(totals.gop / totals.operating_revenue), bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'F2F2F2' } }),
          new TableCell({ children: [new Paragraph({ text: fmt(totals.fees), bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'F2F2F2' } }),
          new TableCell({ children: [new Paragraph({ text: fmt(totals.ebitda), bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'F2F2F2' } }),
        ],
      })
    );

    sections.push(
      new Table({
        rows: usaliRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
      new Paragraph({
        text: `El GOP promedio se sitúa en ${fmtPct(totals.gop / totals.operating_revenue)}, reflejando una gestión operativa eficiente. Los fees totales del operador durante el período de ${project.horizonte} años ascienden a ${fmt(totals.fees)}, lo que representa ${fmt(totals.fees / keys)} por habitación.`,
        spacing: { before: 200, after: 400 },
      }),

      // ========================================
      // 5. ANÁLISIS DE FEES POR HABITACIÓN Y ROOM NIGHT
      // ========================================
      new Paragraph({
        text: '4. Análisis de Fees por Habitación y Room Night',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 },
      })
    );

    const feesPerKeyTotal = totals.fees / keys;
    const feesPerRnTotal = totals.fees / totals.rn;

    const feesAnalysisRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Métrica', bold: true })], shading: { fill: 'E7E6E6' } }),
          new TableCell({ children: [new Paragraph({ text: 'Total', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
          new TableCell({ children: [new Paragraph({ text: 'Por Habitación', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
          new TableCell({ children: [new Paragraph({ text: 'Por Room Night', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Fees Totales' })] }),
          new TableCell({ children: [new Paragraph({ text: fmt(totals.fees), alignment: AlignmentType.RIGHT })] }),
          new TableCell({ children: [new Paragraph({ text: fmt(feesPerKeyTotal), alignment: AlignmentType.RIGHT })] }),
          new TableCell({ children: [new Paragraph({ text: fmt(feesPerRnTotal), alignment: AlignmentType.RIGHT })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Room Nights Totales' })] }),
          new TableCell({ children: [new Paragraph({ text: fmtDecimal(totals.rn, 0), alignment: AlignmentType.RIGHT })] }),
          new TableCell({ children: [new Paragraph({ text: fmtDecimal(totals.rn / keys, 0), alignment: AlignmentType.RIGHT })] }),
          new TableCell({ children: [new Paragraph({ text: '-', alignment: AlignmentType.RIGHT })] }),
        ],
      }),
    ];

    sections.push(
      new Table({
        rows: feesAnalysisRows,
        width: { size: 90, type: WidthType.PERCENTAGE },
      }),
      new Paragraph({
        text: `Los fees por habitación ascienden a ${fmt(feesPerKeyTotal)} durante el período de ${project.horizonte} años, equivalente a ${fmt(feesPerKeyTotal / project.horizonte)} por habitación y año. Por room night, los fees se sitúan en ${fmt(feesPerRnTotal)}, reflejando el valor económico del servicio de gestión por cada noche vendida.`,
        spacing: { before: 200, after: 400 },
      }),

      // ========================================
      // 6. FEES ANUALES PROYECTADOS
      // ========================================
      new Paragraph({
        text: '5. Fees Anuales Proyectados',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 },
      })
    );

    const feesYearlyRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Año', bold: true })], shading: { fill: 'E7E6E6' } }),
          new TableCell({ children: [new Paragraph({ text: 'Fees (€)', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
          new TableCell({ children: [new Paragraph({ text: 'Fees €/hab', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
          new TableCell({ children: [new Paragraph({ text: 'Fees €/RN', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
          new TableCell({ children: [new Paragraph({ text: '% Revenue', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
          new TableCell({ children: [new Paragraph({ text: '% GOP', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
        ],
      }),
    ];

    annuals.forEach((year: any) => {
      const feesPerKey = (year.fees ?? 0) / keys;
      const feesPerRn = year.rn > 0 ? (year.fees ?? 0) / year.rn : 0;
      const feesPctRevenue = year.operating_revenue > 0 ? (year.fees ?? 0) / year.operating_revenue : 0;
      const feesPctGop = year.gop > 0 ? (year.fees ?? 0) / year.gop : 0;

      feesYearlyRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: year.anio.toString() })] }),
            new TableCell({ children: [new Paragraph({ text: fmt(year.fees ?? 0), alignment: AlignmentType.RIGHT })] }),
            new TableCell({ children: [new Paragraph({ text: fmt(feesPerKey), alignment: AlignmentType.RIGHT })] }),
            new TableCell({ children: [new Paragraph({ text: fmt(feesPerRn), alignment: AlignmentType.RIGHT })] }),
            new TableCell({ children: [new Paragraph({ text: fmtPct(feesPctRevenue), alignment: AlignmentType.RIGHT })] }),
            new TableCell({ children: [new Paragraph({ text: fmtPct(feesPctGop), alignment: AlignmentType.RIGHT })] }),
          ],
        })
      );
    });

    sections.push(
      new Table({
        rows: feesYearlyRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
      new Paragraph({
        text: 'La evolución anual de los fees refleja el crecimiento operativo del activo y la maduración de los resultados a lo largo del período de proyección.',
        spacing: { before: 200, after: 400 },
      }),

      // ========================================
      // 7. CONCLUSIONES
      // ========================================
      new Paragraph({
        text: '6. Conclusiones',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 },
      }),
      new Paragraph({
        text: `El análisis proyecta unos fees totales para el operador de ${fmt(totals.fees)} durante el período de ${project.horizonte} años, equivalente a ${fmt(feesPerKeyTotal)} por habitación y ${fmt(feesPerRnTotal)} por room night.`,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: `Con un GOP promedio del ${fmtPct(totals.gop / totals.operating_revenue)} y fees que representan el ${fmtPct(totals.fees / totals.gop)} del GOP, la estructura de remuneración del operador se encuentra alineada con los estándares de mercado para activos ${project.segmento.toLowerCase()} de categoría ${project.categoria}.`,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: `La proyección de resultados operativos muestra una generación de valor consistente para el operador, con una trayectoria de fees creciente que refleja la maduración operativa del activo y la eficiencia de la gestión durante el período analizado.`,
        spacing: { after: 400 },
      }),
      new Paragraph({
        text: '',
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: 'Nota Metodológica',
        bold: true,
        spacing: { after: 150 },
      }),
      new Paragraph({
        text: `Esta proyección se basa en supuestos operativos y de mercado que requieren validación mediante due diligence operativa antes de la firma del contrato de gestión. Los fees mostrados son brutos y no contemplan retenciones fiscales ni otros gastos asociados a la estructura de gestión.`,
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
    const fileName = `${project.nombre || 'Proyecto'}_Operador_${new Date().toISOString().split('T')[0]}.docx`;
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
