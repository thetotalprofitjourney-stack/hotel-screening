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

// Función para formatear moneda con separador de miles, 2 decimales y símbolo €
function fmtMoney(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const integerPart = Math.floor(abs);
  const decimalPart = Math.round((abs - integerPart) * 100);

  // Formatear parte entera con separador de miles
  const intStr = integerPart.toString();
  const parts = [];
  for (let i = intStr.length; i > 0; i -= 3) {
    const start = Math.max(0, i - 3);
    parts.unshift(intStr.substring(start, i));
  }
  const formattedInt = parts.join('.');

  // Formatear parte decimal (siempre 2 dígitos)
  const formattedDec = decimalPart.toString().padStart(2, '0');

  return `${sign}${formattedInt},${formattedDec} €`;
}

function fmtPct(n: number, decimals: number = 2): string {
  return `${fmtDecimal(n * 100, decimals)}%`;
}

function fmtCurrency(n: number, decimals: number = 2): string {
  return `${fmtDecimal(n, decimals)} €`;
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
    nonop_rent_anual?: number;
    nonop_taxes_anual?: number;
    nonop_insurance_anual?: number;
    nonop_other_anual?: number;
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
    const isGestionPropia = operator.operacion_tipo === 'gestion_propia';

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
        text: isGestionPropia ? 'Análisis de Resultados Operativos - Gestión Propia' : 'Análisis Operativo - Fees del Operador',
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
      })
    );

    // ========================================
    // BIFURCACIÓN: Gestión Propia vs Operador
    // ========================================

    if (isGestionPropia) {
      // ============================================================
      // REPORTE PARA GESTIÓN PROPIA (Owner/Operator or Lessee)
      // ============================================================

      // Calcular costes no operativos totales
      const nonOpRent = (settings.nonop_rent_anual ?? 0) * project.horizonte;
      const nonOpTaxes = (settings.nonop_taxes_anual ?? 0) * project.horizonte;
      const nonOpInsurance = (settings.nonop_insurance_anual ?? 0) * project.horizonte;
      const nonOpOther = (settings.nonop_other_anual ?? 0) * project.horizonte;
      const totalNonOpCosts = nonOpRent + nonOpTaxes + nonOpInsurance + nonOpOther;

      // Calcular beneficio neto operativo (EBITDA - costes no operativos)
      const netOperatingProfit = totals.ebitda - totalNonOpCosts;
      const netOperatingProfitPerKey = netOperatingProfit / keys;
      const netOperatingProfitPerKeyYear = netOperatingProfitPerKey / project.horizonte;

      sections.push(
        // ========================================
        // 2. RESUMEN EJECUTIVO
        // ========================================
        new Paragraph({
          text: '1. Resumen Ejecutivo',
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 300 },
        }),
        new Paragraph({
          text: `Este documento presenta un análisis operativo del proyecto ${project.nombre}, un activo hotelero ${project.segmento.toLowerCase()} de categoría ${project.categoria} ubicado en ${project.provincia}, ${project.comunidad_autonoma}, con ${keys} habitaciones bajo modelo de gestión propia.`,
          spacing: { after: 200 },
        }),
        new Paragraph({
          text: `El análisis se centra en la proyección de resultados operativos (USALI) y el beneficio neto operativo que percibiría el propietario/gestor durante un horizonte de ${project.horizonte} años. Los resultados muestran unos ingresos totales proyectados de ${fmt(totals.operating_revenue)}, con un GOP acumulado de ${fmt(totals.gop)} (margen promedio ${fmtPct(totals.gop / totals.operating_revenue)}) y un EBITDA-FF&E de ${fmt(totals.ebitda)}.`,
          spacing: { after: 200 },
        }),
        new Paragraph({
          text: (() => {
            const avgGopMargin = totals.gop / totals.operating_revenue;
            const ebitdaPerKeyYear = (totals.ebitda / keys) / project.horizonte;

            let marginQuality = '';
            if (avgGopMargin >= 0.40) {
              marginQuality = 'excelente (≥40%)';
            } else if (avgGopMargin >= 0.32) {
              marginQuality = 'robusto (32-40%)';
            } else if (avgGopMargin >= 0.25) {
              marginQuality = 'aceptable (25-32%)';
            } else {
              marginQuality = 'ajustado (<25%)';
            }

            let nonOpSummary = '';
            if (totalNonOpCosts > 0) {
              nonOpSummary = ` Después de deducir costes no operativos (alquiler, impuestos, seguros y otros) por un total de ${fmt(totalNonOpCosts)}, el beneficio neto operativo se sitúa en ${fmt(netOperatingProfit)} (${fmtCurrency(netOperatingProfitPerKeyYear)} por habitación y año).`;
            } else {
              nonOpSummary = ` Al tratarse de gestión propia sin costes no operativos adicionales, todo el EBITDA-FF&E (${fmtCurrency(ebitdaPerKeyYear)} por habitación y año) constituye el beneficio neto operativo del proyecto.`;
            }

            return `El margen GOP promedio se sitúa en ${fmtPct(avgGopMargin)}, considerado ${marginQuality} para el segmento ${project.segmento.toLowerCase()}.${nonOpSummary} Esta estructura de gestión propia permite al propietario capturar la totalidad del valor operativo generado por el activo.`;
          })(),
          spacing: { after: 400 },
        }),

        // ========================================
        // 2. RESULTADOS OPERATIVOS PROYECTADOS (USALI)
        // ========================================
        new Paragraph({
          text: '2. Resultados Operativos Proyectados (USALI)',
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 300 },
        }),
        new Paragraph({
          text: 'La siguiente tabla muestra la proyección de resultados operativos bajo el modelo de gestión propia, donde el propietario/gestor captura la totalidad del GOP y EBITDA generados por el activo:',
          spacing: { after: 200 },
        })
      );

      // Tabla anual de USALI para gestión propia
      const usaliGestionPropiaRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: 'Año', bold: true })], shading: { fill: 'E7E6E6' } }),
            new TableCell({ children: [new Paragraph({ text: 'Revenue (€)', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
            new TableCell({ children: [new Paragraph({ text: 'GOP (€)', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
            new TableCell({ children: [new Paragraph({ text: 'GOP %', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
            new TableCell({ children: [new Paragraph({ text: 'EBITDA-FF&E (€)', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
          ],
        }),
      ];

      annuals.forEach((year: any) => {
        usaliGestionPropiaRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: year.anio.toString() })] }),
              new TableCell({ children: [new Paragraph({ text: fmt(year.operating_revenue ?? 0), alignment: AlignmentType.RIGHT })] }),
              new TableCell({ children: [new Paragraph({ text: fmt(year.gop ?? 0), alignment: AlignmentType.RIGHT })] }),
              new TableCell({ children: [new Paragraph({ text: fmtPct(year.gop_margin ?? 0), alignment: AlignmentType.RIGHT })] }),
              new TableCell({ children: [new Paragraph({ text: fmt(year.ebitda ?? 0), alignment: AlignmentType.RIGHT })] }),
            ],
          })
        );
      });

      // Fila de totales
      usaliGestionPropiaRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: 'TOTAL', bold: true })], shading: { fill: 'F2F2F2' } }),
            new TableCell({ children: [new Paragraph({ text: fmt(totals.operating_revenue), bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'F2F2F2' } }),
            new TableCell({ children: [new Paragraph({ text: fmt(totals.gop), bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'F2F2F2' } }),
            new TableCell({ children: [new Paragraph({ text: fmtPct(totals.gop / totals.operating_revenue), bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'F2F2F2' } }),
            new TableCell({ children: [new Paragraph({ text: fmt(totals.ebitda), bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'F2F2F2' } }),
          ],
        })
      );

      sections.push(
        new Table({
          rows: usaliGestionPropiaRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
        new Paragraph({
          text: (() => {
            const avgGopMargin = totals.gop / totals.operating_revenue;
            const avgEbitdaMargin = totals.ebitda / totals.operating_revenue;

            // Análisis de tendencia
            const firstYearMargin = annuals[0]?.gop_margin ?? 0;
            const lastYearMargin = annuals[annuals.length - 1]?.gop_margin ?? 0;
            const marginTrend = lastYearMargin - firstYearMargin;

            let trendAnalysis = '';
            if (marginTrend > 0.03) {
              trendAnalysis = `La evolución de márgenes muestra una mejora progresiva desde ${fmtPct(firstYearMargin)} en el primer año hasta ${fmtPct(lastYearMargin)} al final del período, reflejando eficiencias operativas crecientes conforme el activo alcanza madurez operativa.`;
            } else if (marginTrend < -0.03) {
              trendAnalysis = `Los márgenes GOP muestran compresión desde ${fmtPct(firstYearMargin)} hasta ${fmtPct(lastYearMargin)}, sugiriendo presión de costes que requeriría análisis detallado de drivers departamentales.`;
            } else {
              trendAnalysis = `Los márgenes GOP se mantienen relativamente estables entre ${fmtPct(firstYearMargin)} y ${fmtPct(lastYearMargin)}, reflejando consistencia operativa proyectada.`;
            }

            return `El GOP promedio se sitúa en ${fmtPct(avgGopMargin)}, mientras que el EBITDA-FF&E promedio alcanza ${fmtPct(avgEbitdaMargin)}. ${trendAnalysis} La gestión propia permite al propietario capturar la totalidad de estos márgenes operativos, sin deducción de fees a operadores externos.`;
          })(),
          spacing: { before: 200, after: 400 },
        }),

        // ========================================
        // 3. COSTES NO OPERATIVOS Y BENEFICIO NETO
        // ========================================
        new Paragraph({
          text: '3. Costes No Operativos y Beneficio Neto Operativo',
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 300 },
        })
      );

      // Construir tabla de costes no operativos
      const nonOpCostRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: 'Concepto', bold: true })], shading: { fill: 'E7E6E6' } }),
            new TableCell({ children: [new Paragraph({ text: 'Anual (€)', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
            new TableCell({ children: [new Paragraph({ text: `Total ${project.horizonte} años (€)`, bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
          ],
        }),
      ];

      if ((settings.nonop_rent_anual ?? 0) > 0) {
        nonOpCostRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: 'Alquiler / Renta' })] }),
              new TableCell({ children: [new Paragraph({ text: fmt(settings.nonop_rent_anual ?? 0), alignment: AlignmentType.RIGHT })] }),
              new TableCell({ children: [new Paragraph({ text: fmt(nonOpRent), alignment: AlignmentType.RIGHT })] }),
            ],
          })
        );
      }

      if ((settings.nonop_taxes_anual ?? 0) > 0) {
        nonOpCostRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: 'Impuestos sobre la propiedad' })] }),
              new TableCell({ children: [new Paragraph({ text: fmt(settings.nonop_taxes_anual ?? 0), alignment: AlignmentType.RIGHT })] }),
              new TableCell({ children: [new Paragraph({ text: fmt(nonOpTaxes), alignment: AlignmentType.RIGHT })] }),
            ],
          })
        );
      }

      if ((settings.nonop_insurance_anual ?? 0) > 0) {
        nonOpCostRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: 'Seguros' })] }),
              new TableCell({ children: [new Paragraph({ text: fmt(settings.nonop_insurance_anual ?? 0), alignment: AlignmentType.RIGHT })] }),
              new TableCell({ children: [new Paragraph({ text: fmt(nonOpInsurance), alignment: AlignmentType.RIGHT })] }),
            ],
          })
        );
      }

      if ((settings.nonop_other_anual ?? 0) > 0) {
        nonOpCostRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: 'Otros costes no operativos' })] }),
              new TableCell({ children: [new Paragraph({ text: fmt(settings.nonop_other_anual ?? 0), alignment: AlignmentType.RIGHT })] }),
              new TableCell({ children: [new Paragraph({ text: fmt(nonOpOther), alignment: AlignmentType.RIGHT })] }),
            ],
          })
        );
      }

      if (totalNonOpCosts > 0) {
        nonOpCostRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: 'TOTAL Costes No Operativos', bold: true })], shading: { fill: 'F2F2F2' } }),
              new TableCell({ children: [new Paragraph({ text: fmt((settings.nonop_rent_anual ?? 0) + (settings.nonop_taxes_anual ?? 0) + (settings.nonop_insurance_anual ?? 0) + (settings.nonop_other_anual ?? 0)), bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'F2F2F2' } }),
              new TableCell({ children: [new Paragraph({ text: fmt(totalNonOpCosts), bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'F2F2F2' } }),
            ],
          })
        );
      }

      if (totalNonOpCosts > 0) {
        sections.push(
          new Paragraph({
            text: 'Los costes no operativos del proyecto se desglosan de la siguiente manera:',
            spacing: { after: 200 },
          }),
          new Table({
            rows: nonOpCostRows,
            width: { size: 80, type: WidthType.PERCENTAGE },
          }),
          new Paragraph({
            text: `Estos costes se deducen del EBITDA-FF&E para calcular el beneficio neto operativo que percibiría el propietario/gestor. El mayor componente no operativo es ${(() => {
              const costs = [
                { name: 'el alquiler', value: nonOpRent },
                { name: 'los impuestos', value: nonOpTaxes },
                { name: 'los seguros', value: nonOpInsurance },
                { name: 'otros costes', value: nonOpOther }
              ].filter(c => c.value > 0).sort((a, b) => b.value - a.value);
              return costs[0].name;
            })()}, que representa el ${fmtPct((() => {
              const costs = [nonOpRent, nonOpTaxes, nonOpInsurance, nonOpOther];
              const maxCost = Math.max(...costs);
              return maxCost / totalNonOpCosts;
            })())} del total de costes no operativos.`,
            spacing: { before: 200, after: 400 },
          })
        );
      } else {
        sections.push(
          new Paragraph({
            text: 'El proyecto no presenta costes no operativos adicionales (alquiler, impuestos sobre la propiedad, seguros u otros). Por tanto, el EBITDA-FF&E constituye directamente el beneficio neto operativo disponible para el propietario/gestor.',
            spacing: { after: 400 },
          })
        );
      }

      // Tabla resumen de beneficio neto
      const netProfitRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: 'Concepto', bold: true })], shading: { fill: 'E7E6E6' } }),
            new TableCell({ children: [new Paragraph({ text: `Total ${project.horizonte} años (€)`, bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
            new TableCell({ children: [new Paragraph({ text: '% sobre Revenue', bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'E7E6E6' } }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: 'EBITDA-FF&E' })] }),
            new TableCell({ children: [new Paragraph({ text: fmt(totals.ebitda), alignment: AlignmentType.RIGHT })] }),
            new TableCell({ children: [new Paragraph({ text: fmtPct(totals.ebitda / totals.operating_revenue), alignment: AlignmentType.RIGHT })] }),
          ],
        }),
      ];

      if (totalNonOpCosts > 0) {
        nonOpCostRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: '(-) Costes No Operativos' })] }),
              new TableCell({ children: [new Paragraph({ text: fmt(-totalNonOpCosts), alignment: AlignmentType.RIGHT })] }),
              new TableCell({ children: [new Paragraph({ text: fmtPct(-totalNonOpCosts / totals.operating_revenue), alignment: AlignmentType.RIGHT })] }),
            ],
          })
        );
      }

      netProfitRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: 'BENEFICIO NETO OPERATIVO', bold: true })], shading: { fill: 'D4EDDA' } }),
            new TableCell({ children: [new Paragraph({ text: fmt(netOperatingProfit), bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'D4EDDA' } }),
            new TableCell({ children: [new Paragraph({ text: fmtPct(netOperatingProfit / totals.operating_revenue), bold: true, alignment: AlignmentType.RIGHT })], shading: { fill: 'D4EDDA' } }),
          ],
        })
      );

      sections.push(
        new Paragraph({
          text: 'Cálculo del Beneficio Neto Operativo',
          bold: true,
          spacing: { after: 150 },
        }),
        new Table({
          rows: netProfitRows,
          width: { size: 80, type: WidthType.PERCENTAGE },
        }),
        new Paragraph({
          text: (() => {
            const netMargin = netOperatingProfit / totals.operating_revenue;

            let profitAnalysis = '';
            if (totalNonOpCosts > 0) {
              const costImpact = totalNonOpCosts / totals.operating_revenue;
              profitAnalysis = `El beneficio neto operativo de ${fmt(netOperatingProfit)} representa el ${fmtPct(netMargin)} de los ingresos totales, tras deducir ${fmt(totalNonOpCosts)} (${fmtPct(costImpact)} del revenue) en costes no operativos. `;
            } else {
              profitAnalysis = `El beneficio neto operativo de ${fmt(netOperatingProfit)} (${fmtPct(netMargin)} sobre revenue) coincide con el EBITDA-FF&E al no existir costes no operativos adicionales. `;
            }

            return profitAnalysis + `Esto equivale a ${fmtCurrency(netOperatingProfitPerKeyYear)} por habitación y año, constituyendo el flujo de caja operativo disponible antes de servicio de deuda e impuestos para el propietario/gestor bajo el modelo de gestión propia.`;
          })(),
          spacing: { before: 200, after: 400 },
        }),

        // ========================================
        // 4. CONCLUSIONES
        // ========================================
        new Paragraph({
          text: '4. Conclusiones e Insights Clave',
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 300 },
        }),
        new Paragraph({
          text: `El modelo de gestión propia de ${project.nombre} ofrece al propietario/gestor la oportunidad de capturar la totalidad del valor operativo generado por el activo. A continuación se presentan los insights clave del análisis:`,
          spacing: { after: 300 },
        }),
        new Paragraph({
          text: 'Key Takeaways',
          bold: true,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '• Captura total de valor operativo: ', bold: true }),
            new TextRun({ text: `El modelo de gestión propia permite capturar un EBITDA-FF&E total de ${fmt(totals.ebitda)} durante ${project.horizonte} años (${fmtCurrency((totals.ebitda / keys) / project.horizonte)} por habitación y año), frente a ${fmt(totals.fees)} que se pagarían en fees bajo un modelo de operador externo. Esto representa un valor incremental de ${fmt(totals.ebitda - totals.fees)} que permanece en el propietario.` }),
          ],
          spacing: { after: 150 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '• Beneficio neto operativo: ', bold: true }),
            new TextRun({ text: (() => {
              if (totalNonOpCosts > 0) {
                return `Después de costes no operativos (${fmt(totalNonOpCosts)}), el beneficio neto operativo se sitúa en ${fmt(netOperatingProfit)} (${fmtPct(netOperatingProfit / totals.operating_revenue)} sobre revenue), equivalente a ${fmtCurrency(netOperatingProfitPerKeyYear)} por habitación y año. Este flujo constituye el cash flow operativo disponible antes de servicio de deuda e impuestos.`;
              } else {
                return `Sin costes no operativos adicionales, todo el EBITDA-FF&E (${fmt(totals.ebitda)}, ${fmtPct(totals.ebitda / totals.operating_revenue)} sobre revenue) constituye el beneficio neto operativo, equivalente a ${fmtCurrency(netOperatingProfitPerKeyYear)} por habitación y año.`;
              }
            })() }),
          ],
          spacing: { after: 150 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '• Márgenes operativos: ', bold: true }),
            new TextRun({ text: (() => {
              const avgGopMargin = totals.gop / totals.operating_revenue;
              let marginQuality = '';
              if (avgGopMargin >= 0.40) {
                marginQuality = 'excelentes (≥40%)';
              } else if (avgGopMargin >= 0.32) {
                marginQuality = 'robustos (32-40%)';
              } else if (avgGopMargin >= 0.25) {
                marginQuality = 'aceptables (25-32%)';
              } else {
                marginQuality = 'ajustados (<25%)';
              }
              return `Margen GOP promedio del ${fmtPct(avgGopMargin)}, considerado ${marginQuality} para el segmento ${project.segmento.toLowerCase()}. La capacidad de mantener o mejorar estos márgenes será crítica para maximizar el retorno operativo del activo.`;
            })() }),
          ],
          spacing: { after: 150 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '• Requisitos de gestión: ', bold: true }),
            new TextRun({ text: `El modelo de gestión propia requiere que el propietario asuma todas las funciones operativas (revenue management, operaciones F&B, housekeeping, mantenimiento, etc.) o contrate personal cualificado para ello. Es crítico contar con expertise operativo hotelero para mantener los estándares de servicio y eficiencias operativas proyectadas. La alternativa de gestión con operador externo reduciría el upside económico pero transferiría el riesgo operativo y aportaría know-how especializado.` }),
          ],
          spacing: { after: 150 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '• Comparación con modelo de operador: ', bold: true }),
            new TextRun({ text: `Bajo un modelo de operador externo, se pagarían fees de ${fmt(totals.fees)}, reteniendo un EBITDA neto de ${fmt(totals.ebitda - totals.fees)}. La gestión propia ofrece un valor adicional de ${fmt(totals.ebitda - totals.fees - (totalNonOpCosts > 0 ? totalNonOpCosts : 0))}, pero a cambio de asumir todo el riesgo operativo, complejidad de gestión y requisitos de capital humano especializado.` }),
          ],
          spacing: { after: 300 },
        }),
        new Paragraph({
          text: 'Nota Metodológica',
          bold: true,
          spacing: { after: 150 },
        }),
        new Paragraph({
          text: `Esta proyección se basa en supuestos operativos y de mercado que requieren validación mediante due diligence operativa. Los beneficios mostrados son brutos antes de impuestos y servicio de deuda. La viabilidad del modelo de gestión propia debe evaluarse considerando la disponibilidad de expertise operativo, capacidad de gestión del propietario y alternativas de operadores en el mercado local.`,
          spacing: { after: 200 },
        })
      );

    } else {
      // ============================================================
      // REPORTE PARA OPERADOR (Third-party operator managing the asset)
      // ============================================================

      sections.push(
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
          text: `El análisis se centra en la proyección de resultados operativos (USALI) y los fees de gestión que percibiría el operador durante un horizonte de ${project.horizonte} años. Los resultados muestran unos ingresos totales proyectados de ${fmt(totals.operating_revenue)}, con un GOP acumulado de ${fmt(totals.gop)} (margen promedio ${fmtPct(totals.gop / totals.operating_revenue)}) y fees totales para el operador de ${fmt(totals.fees)}.`,
          spacing: { after: 200 },
        }),
        new Paragraph({
          text: (() => {
            // Análisis inteligente del perfil de fees
            const feeBase = operator.fee_base_anual * project.horizonte;
            const fixedComponent = totals.fees > 0 ? feeBase / totals.fees : 0;
            const variableComponent = 1 - fixedComponent;
            const feesPerRn = totals.fees / totals.rn;
            const feesPerKeyYear = (totals.fees / keys) / project.horizonte;

            let feeProfile = '';
            if (variableComponent > 0.7) {
              feeProfile = 'La estructura de remuneración está fuertemente orientada a performance (más del 70% variable), alineando significativamente los incentivos del operador con el desempeño operativo del activo.';
            } else if (variableComponent > 0.4) {
              feeProfile = 'La estructura de remuneración presenta un balance equilibrado entre componentes fijos y variables, típico de contratos de gestión hotelera estándar en el mercado.';
            } else {
              feeProfile = 'La estructura de remuneración tiene predominio de fees fijos, proporcionando alta predictibilidad de ingresos para el operador aunque limitando la exposición directa al desempeño operativo.';
            }

            return `Los fees representan el ${fmtPct(totals.fees / totals.operating_revenue)} de los ingresos totales y el ${fmtPct(totals.fees / totals.gop)} del GOP, con un valor económico de ${fmtCurrency(feesPerRn)} por room night y ${fmtCurrency(feesPerKeyYear)} por habitación y año. ${feeProfile}`;
          })(),
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
          spacing: { before: 200, after: 300 },
        }),
        new Paragraph({
          text: 'Análisis de la Estructura de Fees',
          bold: true,
          spacing: { after: 150 },
        }),
        new Paragraph({
          text: (() => {
            // Análisis profundo de la estructura de fees
            const feeBase = operator.fee_base_anual * project.horizonte;
            const fixedComponent = totals.fees > 0 ? feeBase / totals.fees : 0;
            const variableComponent = 1 - fixedComponent;

            // 1. Análisis de componente fijo vs variable
            let componentAnalysis = '';
            if (variableComponent > 0.7) {
              componentAnalysis = `La estructura de fees es predominantemente variable (${fmtPct(variableComponent)} del total), lo que maximiza la alineación entre los intereses del operador y el desempeño del activo. El operador asume exposición significativa al riesgo comercial (ocupación, ADR) y operativo (eficiencia de costes), incentivando una gestión activa y orientada a resultados.`;
            } else if (variableComponent > 0.4) {
              componentAnalysis = `El equilibrio entre fees fijos (${fmtPct(fixedComponent)}) y variables (${fmtPct(variableComponent)}) proporciona al operador una base estable de ingresos mientras mantiene incentivos significativos para optimizar el desempeño. Esta estructura es típica en contratos de gestión hotelera estándar y refleja un balance razonable entre riesgo y predictibilidad.`;
            } else {
              componentAnalysis = `Los fees fijos representan ${fmtPct(fixedComponent)} del total, proporcionando al operador alta predictibilidad de ingresos con exposición limitada a las fluctuaciones operativas del activo. Esta estructura minimiza el riesgo del operador pero reduce los incentivos directos para maximizar resultados más allá de los estándares contractuales básicos.`;
            }

            // 2. Análisis de hurdle si existe fee incentivo
            let hurdleAnalysis = '';
            if (operator.fee_incentive_pct > 0 && operator.fee_hurdle_gop_margin > 0) {
              const avgGopMargin = totals.gop / totals.operating_revenue;
              const hurdleGap = avgGopMargin - operator.fee_hurdle_gop_margin;

              if (hurdleGap >= 0.05) {
                hurdleAnalysis = ` El fee incentivo del ${fmtPct(operator.fee_incentive_pct)} se activa superando un margen GOP del ${fmtPct(operator.fee_hurdle_gop_margin)}. Con proyecciones que sitúan el margen promedio en ${fmtPct(avgGopMargin)} (${fmtPct(hurdleGap)} por encima del hurdle), este incentivo se activaría de forma recurrente, proporcionando una palanca adicional significativa de remuneración vinculada a eficiencia operativa superior.`;
              } else if (hurdleGap >= 0) {
                hurdleAnalysis = ` El fee incentivo del ${fmtPct(operator.fee_incentive_pct)} requiere superar un margen GOP del ${fmtPct(operator.fee_hurdle_gop_margin)}. Las proyecciones sitúan el margen promedio en ${fmtPct(avgGopMargin)}, apenas por encima del hurdle (margen de ${fmtPct(hurdleGap)}), lo que sugiere que la activación del incentivo estará condicionada a una ejecución operativa muy ajustada y dependerá críticamente de la evolución de costes variables.`;
              } else {
                hurdleAnalysis = ` El fee incentivo del ${fmtPct(operator.fee_incentive_pct)} se activa con márgenes GOP superiores al ${fmtPct(operator.fee_hurdle_gop_margin)}, umbral que según las proyecciones actuales (margen promedio ${fmtPct(avgGopMargin)}) no se alcanzaría consistentemente. Este hurdle representa un objetivo aspiracional que requeriría mejoras significativas de eficiencia operativa o condiciones de mercado más favorables para su consecución.`;
              }
            }

            // 3. Benchmarking implícito
            const feesPerKeyYear = (totals.fees / keys) / project.horizonte;
            let benchmarkContext = '';
            if (project.segmento.toLowerCase().includes('urbano') || project.segmento.toLowerCase().includes('ciudad')) {
              benchmarkContext = ` Para activos urbanos de categoría ${project.categoria}, fees anuales de ${fmtCurrency(feesPerKeyYear)} por habitación se sitúan en el rango típico de contratos de gestión de cadenas hoteleras establecidas.`;
            } else if (project.segmento.toLowerCase().includes('vacacional') || project.segmento.toLowerCase().includes('resort')) {
              benchmarkContext = ` En el segmento vacacional, con mayor estacionalidad y costes operativos variables, fees anuales de ${fmtCurrency(feesPerKeyYear)} por habitación reflejan la complejidad añadida de la gestión respecto a activos urbanos.`;
            }

            return componentAnalysis + hurdleAnalysis + benchmarkContext + ' La estructura debe evaluarse en conjunto considerando el perfil de riesgo del activo, experiencia del operador y alternativas de gestión disponibles en el mercado local.';
          })(),
          spacing: { after: 400 },
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

      // Tabla anual de USALI for operador
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
          text: (() => {
            // Análisis inteligente de evolución operativa
            const avgGopMargin = totals.gop / totals.operating_revenue;

            // Encontrar año de mejor y peor margen GOP
            let bestYear = annuals[0];
            let worstYear = annuals[0];
            annuals.forEach((year: any) => {
              if (year.gop_margin > bestYear.gop_margin) bestYear = year;
              if (year.gop_margin < worstYear.gop_margin) worstYear = year;
            });

            const marginRange = bestYear.gop_margin - worstYear.gop_margin;

            // Analizar tendencia de márgenes
            const firstYearMargin = annuals[0]?.gop_margin ?? 0;
            const lastYearMargin = annuals[annuals.length - 1]?.gop_margin ?? 0;
            const marginTrend = lastYearMargin - firstYearMargin;

            let trendAnalysis = '';
            if (marginTrend > 0.03) {
              trendAnalysis = `La evolución de márgenes muestra una mejora progresiva desde ${fmtPct(firstYearMargin)} en el primer año hasta ${fmtPct(lastYearMargin)} al final del período, reflejando eficiencias operativas crecientes conforme el activo alcanza madurez operativa y optimización de estructura de costes.`;
            } else if (marginTrend < -0.03) {
              trendAnalysis = `Los márgenes GOP muestran compresión desde ${fmtPct(firstYearMargin)} en el primer año hasta ${fmtPct(lastYearMargin)}, sugiriendo presión de costes o dilución de eficiencia operativa que requeriría análisis detallado de drivers de costes departamentales.`;
            } else {
              trendAnalysis = `Los márgenes GOP se mantienen relativamente estables entre ${fmtPct(firstYearMargin)} y ${fmtPct(lastYearMargin)}, reflejando consistencia operativa a lo largo del período proyectado.`;
            }

            // Análisis de fees
            const feesPerKey = totals.fees / keys;
            const feesPerKeyYear = feesPerKey / project.horizonte;

            let marginQuality = '';
            if (avgGopMargin >= 0.40) {
              marginQuality = 'excelente (≥40%)';
            } else if (avgGopMargin >= 0.32) {
              marginQuality = 'robusto (32-40%)';
            } else if (avgGopMargin >= 0.25) {
              marginQuality = 'aceptable (25-32%)';
            } else {
              marginQuality = 'ajustado (<25%)';
            }

            return `El GOP promedio se sitúa en ${fmtPct(avgGopMargin)}, considerado un margen ${marginQuality} para el segmento ${project.segmento.toLowerCase()}. ${trendAnalysis} El mejor margen GOP se alcanza en el año ${bestYear.anio} (${fmtPct(bestYear.gop_margin)}), mientras que el más ajustado corresponde al año ${worstYear.anio} (${fmtPct(worstYear.gop_margin)}), representando una variabilidad de ${fmtPct(marginRange)} puntos que ilustra la evolución operativa del activo. Los fees totales del operador durante el período ascienden a ${fmt(totals.fees)}, equivalentes a ${fmtCurrency(feesPerKey)} por habitación (${fmtCurrency(feesPerKeyYear)} por hab/año).`;
          })(),
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
            new TableCell({ children: [new Paragraph({ text: fmtCurrency(feesPerKeyTotal), alignment: AlignmentType.RIGHT })] }),
            new TableCell({ children: [new Paragraph({ text: fmtCurrency(feesPerRnTotal), alignment: AlignmentType.RIGHT })] }),
          ],
        }),
      ];

      sections.push(
        new Table({
          rows: feesAnalysisRows,
          width: { size: 90, type: WidthType.PERCENTAGE },
        }),
        new Paragraph({
          text: `Los fees por habitación ascienden a ${fmtCurrency(feesPerKeyTotal)} durante el período de ${project.horizonte} años, equivalente a ${fmtCurrency(feesPerKeyTotal / project.horizonte)} por habitación y año. Por room night, los fees se sitúan en ${fmtCurrency(feesPerRnTotal)}, reflejando el valor económico del servicio de gestión por cada noche vendida.`,
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
              new TableCell({ children: [new Paragraph({ text: fmtMoney(feesPerKey), alignment: AlignmentType.RIGHT })] }),
              new TableCell({ children: [new Paragraph({ text: fmtMoney(feesPerRn), alignment: AlignmentType.RIGHT })] }),
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
          text: (() => {
            // Análisis inteligente de evolución de fees
            const firstYearFees = annuals[0]?.fees ?? 0;
            const lastYearFees = annuals[annuals.length - 1]?.fees ?? 0;

            // Calcular CAGR de fees
            const years = project.horizonte;
          const cagr = years > 1 && firstYearFees > 0
            ? Math.pow(lastYearFees / firstYearFees, 1 / (years - 1)) - 1
            : 0;

          // Calcular crecimiento absoluto
          const absoluteGrowth = lastYearFees - firstYearFees;
          const percentGrowth = firstYearFees > 0 ? absoluteGrowth / firstYearFees : 0;

          // Analizar drivers de crecimiento
          const firstYearRevenue = annuals[0]?.operating_revenue ?? 0;
          const lastYearRevenue = annuals[annuals.length - 1]?.operating_revenue ?? 0;
          const revenueCagr = years > 1 && firstYearRevenue > 0
            ? Math.pow(lastYearRevenue / firstYearRevenue, 1 / (years - 1)) - 1
            : 0;

          const firstYearGop = annuals[0]?.gop ?? 0;
          const lastYearGop = annuals[annuals.length - 1]?.gop ?? 0;
          const gopCagr = years > 1 && firstYearGop > 0
            ? Math.pow(lastYearGop / firstYearGop, 1 / (years - 1)) - 1
            : 0;

          let growthAnalysis = '';
          if (cagr > 0.05) {
            growthAnalysis = `La evolución de fees muestra un crecimiento robusto del ${fmtPct(cagr)} CAGR, desde ${fmt(firstYearFees)} en el año inicial hasta ${fmt(lastYearFees)} al final del período (crecimiento acumulado del ${fmtPct(percentGrowth)}). `;
          } else if (cagr > 0.02) {
            growthAnalysis = `Los fees evolucionan con un crecimiento moderado del ${fmtPct(cagr)} CAGR, desde ${fmt(firstYearFees)} hasta ${fmt(lastYearFees)}, reflejando la maduración progresiva del activo. `;
          } else if (cagr > -0.02) {
            growthAnalysis = `Los fees se mantienen relativamente estables durante el período, oscilando entre ${fmt(firstYearFees)} y ${fmt(lastYearFees)}, con variaciones mínimas que reflejan la consistencia operativa proyectada. `;
          } else {
            growthAnalysis = `Los fees muestran una trayectoria descendente desde ${fmt(firstYearFees)} hasta ${fmt(lastYearFees)}, sugiriendo compresión operativa que requeriría análisis de drivers subyacentes. `;
          }

          // Análisis de drivers
          let driversAnalysis = '';
          if (Math.abs(revenueCagr - cagr) < 0.01) {
            driversAnalysis = `El crecimiento de fees está alineado con la evolución de ingresos (CAGR revenue: ${fmtPct(revenueCagr)}), indicando que el componente predominante de fees está vinculado directamente al top-line del activo.`;
          } else if (Math.abs(gopCagr - cagr) < 0.01) {
            driversAnalysis = `El crecimiento de fees sigue la trayectoria del GOP (CAGR GOP: ${fmtPct(gopCagr)}), reflejando una estructura de remuneración fuertemente orientada a margen operativo.`;
          } else if (cagr > revenueCagr && cagr > gopCagr) {
            driversAnalysis = `Los fees crecen por encima tanto de ingresos (${fmtPct(revenueCagr)}) como de GOP (${fmtPct(gopCagr)}), sugiriendo activación creciente de componentes incentivos o indexación de fees base superior a la inflación operativa.`;
          } else {
            driversAnalysis = `El crecimiento de fees (${fmtPct(cagr)}) refleja la combinación de evolución de ingresos (${fmtPct(revenueCagr)}) y márgenes GOP (${fmtPct(gopCagr)}), ilustrando la naturaleza mixta de la estructura de remuneración.`;
          }

          return growthAnalysis + driversAnalysis;
        })(),
        spacing: { before: 200, after: 400 },
      }),

      // ========================================
      // 7. CONCLUSIONES - KEY TAKEAWAYS
      // ========================================
      new Paragraph({
        text: '6. Conclusiones e Insights Clave',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 },
      }),
      new Paragraph({
        text: `El análisis proyecta un potencial de fees significativo para el operador en ${project.nombre}, un activo ${project.segmento.toLowerCase()} de ${keys} habitaciones en ${project.provincia}. A continuación se presentan los insights clave que resumen la oportunidad operativa:`,
        spacing: { after: 300 },
      }),
      new Paragraph({
        text: 'Key Takeaways para el Operador',
        bold: true,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: '• Potencial de ingresos: ', bold: true }),
          new TextRun({ text: `Fees totales proyectados de ${fmt(totals.fees)} durante ${project.horizonte} años, equivalentes a ${fmtCurrency(feesPerKeyTotal / project.horizonte)} por habitación y año, o ${fmtCurrency(feesPerRnTotal)} por room night. Esto representa un flujo anual promedio de ${fmt(totals.fees / project.horizonte)} para el operador.` }),
        ],
        spacing: { after: 150 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: '• Estructura de incentivos: ', bold: true }),
          new TextRun({ text: (() => {
            const feeBase = operator.fee_base_anual * project.horizonte;
            const fixedComponent = totals.fees > 0 ? feeBase / totals.fees : 0;
            const variableComponent = 1 - fixedComponent;

            if (variableComponent > 0.7) {
              return `Perfil altamente orientado a performance (${fmtPct(variableComponent)} variable), con fuerte exposición al riesgo comercial y operativo pero maximizando el potencial de upside en caso de overperformance del activo.`;
            } else if (variableComponent > 0.4) {
              return `Balance equilibrado entre fees fijos (${fmtPct(fixedComponent)}) y variables (${fmtPct(variableComponent)}), proporcionando base estable de ingresos con incentivos significativos para optimización operativa.`;
            } else {
              return `Perfil con predominio de fees fijos (${fmtPct(fixedComponent)} del total), minimizando exposición a volatilidad operativa aunque limitando potencial de upside adicional vinculado a outperformance.`;
            }
          })() }),
        ],
        spacing: { after: 150 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: '• Viabilidad de hurdles y fee incentivo: ', bold: true }),
          new TextRun({ text: (() => {
            if (operator.fee_incentive_pct > 0 && operator.fee_hurdle_gop_margin > 0) {
              const avgGopMargin = totals.gop / totals.operating_revenue;
              const hurdleGap = avgGopMargin - operator.fee_hurdle_gop_margin;

              if (hurdleGap >= 0.05) {
                return `El hurdle de margen GOP (${fmtPct(operator.fee_hurdle_gop_margin)}) se superaría consistentemente según proyecciones (margen promedio ${fmtPct(avgGopMargin)}), activando de forma recurrente el fee incentivo del ${fmtPct(operator.fee_incentive_pct)}. Esto representa una palanca significativa de remuneración adicional por gestión operativa superior.`;
              } else if (hurdleGap >= 0) {
                return `El hurdle de margen GOP (${fmtPct(operator.fee_hurdle_gop_margin)}) se alcanzaría de forma ajustada (margen promedio proyectado ${fmtPct(avgGopMargin)}), requiriendo ejecución operativa muy rigurosa para activar consistentemente el fee incentivo del ${fmtPct(operator.fee_incentive_pct)}.`;
              } else {
                return `El hurdle de margen GOP (${fmtPct(operator.fee_hurdle_gop_margin)}) representa un objetivo aspiracional que según proyecciones actuales (margen promedio ${fmtPct(avgGopMargin)}) no se alcanzaría de forma recurrente, limitando la activación del fee incentivo del ${fmtPct(operator.fee_incentive_pct)} salvo mejoras operativas significativas.`;
              }
            } else {
              return 'No aplica fee incentivo con hurdle en esta estructura de fees.';
            }
          })() }),
        ],
        spacing: { after: 150 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: '• Eficiencia operativa y márgenes: ', bold: true }),
          new TextRun({ text: (() => {
            const avgGopMargin = totals.gop / totals.operating_revenue;
            let marginQuality = '';
            if (avgGopMargin >= 0.40) {
              marginQuality = 'excelente (≥40%)';
            } else if (avgGopMargin >= 0.32) {
              marginQuality = 'robusto (32-40%)';
            } else if (avgGopMargin >= 0.25) {
              marginQuality = 'aceptable (25-32%)';
            } else {
              marginQuality = 'ajustado (<25%)';
            }

            return `Margen GOP promedio proyectado del ${fmtPct(avgGopMargin)}, considerado ${marginQuality} para el segmento ${project.segmento.toLowerCase()} categoría ${project.categoria}. La capacidad del operador para mantener o mejorar estos márgenes será crítica para maximizar los fees variables y alcanzar los objetivos de remuneración proyectados.`;
          })() }),
        ],
        spacing: { after: 150 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: '• Factores de riesgo operativo: ', bold: true }),
          new TextRun({ text: (() => {
            const feeBase = operator.fee_base_anual * project.horizonte;
            const variableComponent = totals.fees > 0 ? 1 - (feeBase / totals.fees) : 0;

            let riskExposure = '';
            if (variableComponent > 0.7) {
              riskExposure = `La alta exposición a fees variables (${fmtPct(variableComponent)}) implica sensibilidad significativa a desviaciones de ocupación, ADR y eficiencia de costes respecto a proyecciones. Una caída del 10% en ocupación o ADR podría impactar sustancialmente los fees totales.`;
            } else if (variableComponent > 0.4) {
              riskExposure = `La estructura equilibrada (${fmtPct(variableComponent)} variable) proporciona cierta protección frente a underperformance operativa, aunque mantiene incentivos para maximizar resultados.`;
            } else {
              riskExposure = `El predominio de fees fijos (${fmtPct(1 - variableComponent)}) proporciona alta predictibilidad y protección frente a volatilidad operativa, minimizando el downside risk para el operador.`;
            }

            return riskExposure + ' Es crítico validar supuestos de mercado (evolución ADR, ocupación competset) y estructura de costes durante la due diligence operativa.';
          })() }),
        ],
        spacing: { after: 150 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: '• Competitividad y benchmarking: ', bold: true }),
          new TextRun({ text: (() => {
            const feesPerKeyYear = (totals.fees / keys) / project.horizonte;
            const feesPerRn = totals.fees / totals.rn;

            let benchmarkAnalysis = '';
            if (project.segmento.toLowerCase().includes('urbano')) {
              benchmarkAnalysis = `Para activos urbanos de categoría ${project.categoria}, fees de ${fmtCurrency(feesPerKeyYear)} por hab/año y ${fmtCurrency(feesPerRn)} por RN se sitúan en el rango típico de contratos de gestión hotelera de cadenas establecidas. `;
            } else if (project.segmento.toLowerCase().includes('vacacional')) {
              benchmarkAnalysis = `En el segmento vacacional, fees de ${fmtCurrency(feesPerKeyYear)} por hab/año y ${fmtCurrency(feesPerRn)} por RN reflejan la complejidad operativa adicional (estacionalidad, mix de servicios) respecto a activos urbanos. `;
            } else {
              benchmarkAnalysis = `Fees de ${fmtCurrency(feesPerKeyYear)} por hab/año y ${fmtCurrency(feesPerRn)} por RN deben evaluarse en contexto del segmento específico y complejidad operativa del activo. `;
            }

            return benchmarkAnalysis + 'Se recomienda benchmarking con contratos comparables en el mercado local para validar competitividad de la estructura propuesta.';
          })() }),
        ],
        spacing: { after: 300 },
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

    } // End of else block (operador case)

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
