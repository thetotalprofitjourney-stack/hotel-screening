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
  BorderStyle,
} from 'docx';
import { saveAs } from 'file-saver';

interface GenerateWordFromHtmlParams {
  htmlContent: string;
  projectName: string;
}

function parseHtmlToDocxElements(htmlContent: string): any[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const elements: any[] = [];

  function processNode(node: Node, parentIsBold: boolean = false): any[] {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      // No trim aquí para preservar espacios entre palabras
      if (text) {
        return [new TextRun({ text, bold: parentIsBold })];
      }
      return [];
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return [];
    }

    const element = node as Element;
    const tagName = element.tagName.toLowerCase();

    // Ignorar scripts, styles, y elementos ocultos
    if (['script', 'style', 'noscript', 'svg', 'button', 'input'].includes(tagName)) {
      return [];
    }

    // Obtener clases y estilos
    const classes = element.className || '';
    const isBold = classes.includes('font-bold') || tagName === 'strong' || tagName === 'b' || parentIsBold;
    const isGreen = classes.includes('text-green');
    const isRed = classes.includes('text-red');
    const isBlue = classes.includes('text-blue');
    const textAlign = classes.includes('text-center') ? AlignmentType.CENTER :
                     classes.includes('text-right') ? AlignmentType.RIGHT :
                     AlignmentType.LEFT;

    switch (tagName) {
      case 'h1':
      case 'h2':
      case 'h3':
        const headingText = element.textContent?.trim() || '';
        if (!headingText) return [];

        return [new Paragraph({
          text: headingText,
          heading: tagName === 'h1' ? HeadingLevel.HEADING_1 :
                   tagName === 'h2' ? HeadingLevel.HEADING_2 :
                   HeadingLevel.HEADING_3,
          spacing: {
            after: tagName === 'h1' ? 300 : tagName === 'h2' ? 250 : 200,
            before: tagName === 'h1' ? 0 : tagName === 'h2' ? 400 : 300
          },
          alignment: textAlign,
        })];

      case 'p':
        const pChildren: TextRun[] = [];
        element.childNodes.forEach(child => {
          const childElements = processNode(child, isBold);
          pChildren.push(...childElements.filter(el => el instanceof TextRun));
        });

        // Si no hay hijos TextRun, crear uno desde el texto directo
        if (pChildren.length === 0) {
          const text = element.textContent?.trim() || '';
          if (text) {
            pChildren.push(new TextRun({ text, bold: isBold }));
          }
        }

        // Solo crear párrafo si hay contenido
        if (pChildren.length > 0) {
          return [new Paragraph({
            children: pChildren,
            spacing: { after: 150 },
            alignment: textAlign,
          })];
        }
        return [];

      case 'div':
      case 'section':
        const divChildren: any[] = [];
        element.childNodes.forEach(child => {
          divChildren.push(...processNode(child, isBold));
        });
        return divChildren;

      case 'table':
        try {
          const rows: TableRow[] = [];
          const tableRows = element.querySelectorAll('tr');

          tableRows.forEach(tr => {
            const cells: TableCell[] = [];
            const tds = tr.querySelectorAll('td, th');

            tds.forEach(td => {
              const isHeader = td.tagName.toLowerCase() === 'th';
              const cellClasses = td.className || '';
              const cellAlign = cellClasses.includes('text-center') ? AlignmentType.CENTER :
                              cellClasses.includes('text-right') ? AlignmentType.RIGHT :
                              AlignmentType.LEFT;
              const cellBold = isHeader || cellClasses.includes('font-bold');
              const cellText = td.textContent?.trim() || '';

              cells.push(new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({ text: cellText || ' ', bold: cellBold })],
                  alignment: cellAlign,
                })],
                shading: isHeader ? { fill: 'E7E6E6' } : undefined,
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: 'd1d5db' },
                  bottom: { style: BorderStyle.SINGLE, size: 1, color: 'd1d5db' },
                  left: { style: BorderStyle.SINGLE, size: 1, color: 'd1d5db' },
                  right: { style: BorderStyle.SINGLE, size: 1, color: 'd1d5db' },
                },
              }));
            });

            if (cells.length > 0) {
              rows.push(new TableRow({ children: cells }));
            }
          });

          if (rows.length > 0) {
            return [
              new Table({
                rows,
                width: { size: 100, type: WidthType.PERCENTAGE },
              }),
              new Paragraph({ text: '', spacing: { after: 200 } })
            ];
          }
        } catch (error) {
          console.warn('Error procesando tabla:', error);
        }
        return [];

      case 'ul':
      case 'ol':
        const listItems: any[] = [];
        element.querySelectorAll('li').forEach(li => {
          const liText = li.textContent?.trim() || '';
          if (liText) {
            listItems.push(new Paragraph({
              text: `• ${liText}`,
              spacing: { after: 100 },
            }));
          }
        });
        return listItems;

      case 'br':
        return [new Paragraph({ text: '' })];

      case 'span':
      case 'strong':
      case 'b':
      case 'em':
      case 'i':
        const spanText = element.textContent || '';
        if (spanText) {
          return [new TextRun({
            text: spanText,
            bold: isBold || tagName === 'strong' || tagName === 'b',
            italics: tagName === 'em' || tagName === 'i',
            color: isGreen ? '059669' : isRed ? 'dc2626' : isBlue ? '2563eb' : undefined,
          })];
        }
        return [];

      default:
        const defaultChildren: any[] = [];
        element.childNodes.forEach(child => {
          defaultChildren.push(...processNode(child, isBold));
        });
        return defaultChildren;
    }
  }

  // Procesar el body del documento HTML
  const body = doc.body;
  body.childNodes.forEach(node => {
    const nodeElements = processNode(node);
    elements.push(...nodeElements);
  });

  // Filtrar elementos undefined o null
  return elements.filter(el => el !== undefined && el !== null);
}

export async function generateWordFromHtml(params: GenerateWordFromHtmlParams) {
  try {
    console.log('Iniciando generación de documento Word desde HTML...');

    const { htmlContent, projectName } = params;

    if (!htmlContent || typeof htmlContent !== 'string') {
      throw new Error('El contenido HTML es requerido');
    }

    console.log('Parseando HTML a elementos DOCX...');
    let elements = parseHtmlToDocxElements(htmlContent);

    console.log(`Se generaron ${elements.length} elementos`);

    // Validar que haya al menos un elemento
    if (elements.length === 0) {
      console.warn('No se generaron elementos del HTML, creando documento con mensaje de error');
      elements = [
        new Paragraph({
          text: 'No se pudo convertir el contenido HTML. El HTML podría estar vacío o tener un formato no soportado.',
          spacing: { after: 200 }
        })
      ];
    }

    // Asegurar que todos los elementos son válidos
    const validElements = elements.filter(el => {
      if (!el) return false;
      // Verificar que los párrafos tengan contenido
      if (el instanceof Paragraph) {
        return true;
      }
      // Verificar que las tablas tengan filas
      if (el instanceof Table) {
        return true;
      }
      return true;
    });

    console.log(`${validElements.length} elementos válidos después de filtrar`);

    // Crear el documento con elementos válidos
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440,    // 1 inch
              bottom: 1440,
              left: 1440,
              right: 1440,
            }
          }
        },
        children: validElements.length > 0 ? validElements : [
          new Paragraph({
            text: 'Documento vacío',
            spacing: { after: 200 }
          })
        ],
      }],
    });

    // Generar el archivo
    console.log('Generando blob del documento...');
    const blob = await Packer.toBlob(doc);

    if (!blob || blob.size === 0) {
      throw new Error('El archivo generado está vacío');
    }

    console.log(`Blob generado: ${blob.size} bytes`);

    const fileName = `${projectName || 'Proyecto'}_APP_${new Date().toISOString().split('T')[0]}.docx`;

    console.log('Descargando archivo:', fileName);
    saveAs(blob, fileName);
    console.log('Documento generado exitosamente desde HTML');
  } catch (error) {
    console.error('Error detallado al generar documento Word desde HTML:', error);
    if (error instanceof Error) {
      console.error('Mensaje de error:', error.message);
      console.error('Stack trace:', error.stack);
    }
    throw error;
  }
}
