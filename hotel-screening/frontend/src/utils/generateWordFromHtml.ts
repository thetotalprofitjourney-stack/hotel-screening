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

  function processNode(node: Node): any[] {
    const nodeElements: any[] = [];

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim() || '';
      if (text) {
        return [new TextRun({ text })];
      }
      return [];
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return [];
    }

    const element = node as Element;
    const tagName = element.tagName.toLowerCase();

    // Obtener clases y estilos
    const classes = element.className || '';
    const isBold = classes.includes('font-bold') || tagName === 'strong' || tagName === 'b';
    const isGreen = classes.includes('text-green');
    const isRed = classes.includes('text-red');
    const isBlue = classes.includes('text-blue');
    const textAlign = classes.includes('text-center') ? AlignmentType.CENTER :
                     classes.includes('text-right') ? AlignmentType.RIGHT :
                     AlignmentType.LEFT;

    switch (tagName) {
      case 'h1':
        return [new Paragraph({
          text: element.textContent || '',
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 300 },
          alignment: textAlign,
        })];

      case 'h2':
        return [new Paragraph({
          text: element.textContent || '',
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 250, before: 400 },
          alignment: textAlign,
        })];

      case 'h3':
        return [new Paragraph({
          text: element.textContent || '',
          heading: HeadingLevel.HEADING_3,
          spacing: { after: 200, before: 300 },
          alignment: textAlign,
        })];

      case 'p':
        const children: any[] = [];
        element.childNodes.forEach(child => {
          const childElements = processNode(child);
          children.push(...childElements);
        });

        if (children.length === 0) {
          const text = element.textContent?.trim() || '';
          if (text) {
            children.push(new TextRun({ text, bold: isBold }));
          }
        }

        return [new Paragraph({
          children: children.length > 0 ? children : [new TextRun({ text: element.textContent || '' })],
          spacing: { after: 150 },
          alignment: textAlign,
        })];

      case 'div':
        const divChildren: any[] = [];
        element.childNodes.forEach(child => {
          divChildren.push(...processNode(child));
        });
        return divChildren;

      case 'table':
        const rows: TableRow[] = [];
        const tbody = element.querySelector('tbody') || element;
        const tableRows = tbody.querySelectorAll('tr');

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

            cells.push(new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: td.textContent || '', bold: cellBold })],
                alignment: cellAlign,
              })],
              shading: isHeader ? { fill: 'E7E6E6' } : undefined,
            }));
          });

          if (cells.length > 0) {
            rows.push(new TableRow({ children: cells }));
          }
        });

        return [new Table({
          rows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        }), new Paragraph({ text: '', spacing: { after: 200 } })];

      case 'ul':
      case 'ol':
        const listItems: any[] = [];
        element.querySelectorAll('li').forEach(li => {
          listItems.push(new Paragraph({
            text: `• ${li.textContent || ''}`,
            spacing: { after: 100 },
          }));
        });
        return listItems;

      case 'br':
        return [new Paragraph({ text: '' })];

      case 'span':
      case 'strong':
      case 'b':
        return [new TextRun({
          text: element.textContent || '',
          bold: isBold || tagName === 'strong' || tagName === 'b',
          color: isGreen ? '059669' : isRed ? 'dc2626' : isBlue ? '2563eb' : undefined,
        })];

      default:
        const defaultChildren: any[] = [];
        element.childNodes.forEach(child => {
          defaultChildren.push(...processNode(child));
        });
        return defaultChildren;
    }
  }

  // Procesar el body del documento HTML
  const body = doc.body;
  body.childNodes.forEach(node => {
    elements.push(...processNode(node));
  });

  return elements;
}

export async function generateWordFromHtml(params: GenerateWordFromHtmlParams) {
  try {
    console.log('Iniciando generación de documento Word desde HTML...');

    const { htmlContent, projectName } = params;

    if (!htmlContent || typeof htmlContent !== 'string') {
      throw new Error('El contenido HTML es requerido');
    }

    console.log('Parseando HTML a elementos DOCX...');
    const elements = parseHtmlToDocxElements(htmlContent);

    // Crear el documento
    const doc = new Document({
      sections: [{
        properties: {},
        children: elements.length > 0 ? elements : [
          new Paragraph({ text: 'No se pudo convertir el contenido HTML' })
        ],
      }],
    });

    // Generar el archivo
    console.log('Generando blob...');
    const blob = await Packer.toBlob(doc);
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
