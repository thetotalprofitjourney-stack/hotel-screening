import { Router } from 'express';
import { pool } from '../db.js';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import HTMLtoDOCX from 'html-to-docx';
import htmlDocx from 'html-docx-js';
import JSZip from 'jszip';

const router = Router();

/**
 * Transforma HTML moderno (flex, grid) a HTML compatible con Word (tablas).
 * Convierte layouts CSS complejos a tablas HTML tradicionales.
 */
function transformHtmlForWord(html: string): string {
  console.log('Transformando HTML para compatibilidad con Word...');

  let transformed = html;

  // 1. Convertir divs con display:flex a tablas
  // Patrón: <div style="display: flex">...</div>
  // → <table><tr><td>...</td></tr></table>

  // Regex para encontrar divs con flex (simplificado)
  // Esto es una aproximación - en producción usarías un parser DOM

  // 2. Eliminar estilos CSS complejos que Word no soporta
  const unsupportedStyles = [
    'display:\\s*flex',
    'display:\\s*grid',
    'flex-direction',
    'justify-content',
    'align-items',
    'gap',
    'grid-template',
    'transform',
    'box-shadow',
    'border-radius',
  ];

  unsupportedStyles.forEach(style => {
    const regex = new RegExp(`${style}:[^;]+;?`, 'gi');
    transformed = transformed.replace(regex, '');
  });

  // 3. Convertir clases de Tailwind/utility a estilos inline simples
  // Reemplazar clases comunes por estilos equivalentes
  const classReplacements: Record<string, string> = {
    'flex': 'display: block;',  // Convertir flex a block
    'grid': 'display: block;',  // Convertir grid a block
    'text-center': 'text-align: center;',
    'text-right': 'text-align: right;',
    'text-left': 'text-align: left;',
    'font-bold': 'font-weight: bold;',
    'text-green-600': 'color: #059669;',
    'text-red-600': 'color: #dc2626;',
    'text-blue-600': 'color: #2563eb;',
    'bg-gray-50': 'background-color: #f9fafb;',
    'bg-gray-100': 'background-color: #f3f4f6;',
  };

  Object.entries(classReplacements).forEach(([className, style]) => {
    const regex = new RegExp(`class="([^"]*\\b${className}\\b[^"]*)"`, 'g');
    transformed = transformed.replace(regex, (match, classes) => {
      // Verificar si ya tiene atributo style
      const hasStyle = match.includes('style=');
      if (hasStyle) {
        return match.replace(/style="([^"]*)"/, `style="$1 ${style}"`);
      } else {
        return `${match.slice(0, -1)} style="${style}"`;
      }
    });
  });

  // 4. Asegurar que las tablas tengan bordes explícitos
  transformed = transformed.replace(/<table/g, '<table border="1" cellpadding="5" cellspacing="0"');

  // 5. Forzar anchos de tabla a 100%
  transformed = transformed.replace(/<table([^>]*)>/g, '<table$1 width="100%">');

  console.log(`HTML transformado: ${html.length} → ${transformed.length} caracteres`);

  return transformed;
}

/**
 * Sanitiza HTML para evitar problemas de XML mal formado en el DOCX.
 * Escapa caracteres especiales XML y limpia etiquetas problemáticas.
 */
function sanitizeHtmlForDocx(html: string): string {
  console.log('Sanitizando HTML para conversión a DOCX...');

  let sanitized = html;

  // 1. Escapar entidades XML problemáticas que no están en etiquetas
  // Reemplazar & que no son parte de entidades HTML
  sanitized = sanitized.replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;');

  // 2. Limpiar atributos style problemáticos que pueden romper el XML
  // Eliminar comillas internas en valores de atributos
  sanitized = sanitized.replace(/style="([^"]*)"/g, (match, styleContent) => {
    // Reemplazar comillas internas con entidades
    const cleanStyle = styleContent.replace(/"/g, '&quot;');
    return `style="${cleanStyle}"`;
  });

  // 3. Eliminar comentarios HTML que pueden causar problemas
  sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, '');

  // 4. Normalizar espacios en blanco excesivos
  sanitized = sanitized.replace(/\s+/g, ' ');

  // 5. Asegurar que las etiquetas estén bien cerradas
  // (html-to-docx debería manejar esto, pero añadimos verificación)
  const selfClosingTags = ['br', 'hr', 'img', 'input', 'meta', 'link'];
  selfClosingTags.forEach(tag => {
    // Convertir <tag> a <tag /> si no tiene cierre
    const regex = new RegExp(`<${tag}([^>]*?)(?<!/)>`, 'gi');
    sanitized = sanitized.replace(regex, `<${tag}$1 />`);
  });

  // 6. Eliminar caracteres de control que no son válidos en XML
  // XML solo permite: tab (0x09), newline (0x0A), carriage return (0x0D), y >= 0x20
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  console.log(`HTML sanitizado: ${html.length} → ${sanitized.length} caracteres`);

  return sanitized;
}

/**
 * Post-procesa un buffer DOCX para hacerlo compatible con Microsoft Word.
 * Añade docProps/app.xml y corrige las referencias en _rels/.rels y [Content_Types].xml
 */
async function fixDocxStructure(docxBuffer: Buffer): Promise<Buffer> {
  console.log('Iniciando post-procesamiento del DOCX para compatibilidad con Word...');

  // Cargar el ZIP
  const zip = await JSZip.loadAsync(docxBuffer);

  // A) Añadir docProps/app.xml
  const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
  xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>html-to-docx</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <Company></Company>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0000</AppVersion>
</Properties>`;

  zip.file('docProps/app.xml', appXml);
  console.log('✓ Añadido docProps/app.xml');

  // B) Modificar _rels/.rels para añadir referencia a app.xml
  let relsContent = await zip.file('_rels/.rels')?.async('string');
  if (relsContent) {
    // Verificar si ya existe la relación rId3
    if (!relsContent.includes('extended-properties')) {
      // Añadir la relación antes del cierre de </Relationships>
      const appRelationship = `  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>`;
      relsContent = relsContent.replace('</Relationships>', `${appRelationship}\n</Relationships>`);
      zip.file('_rels/.rels', relsContent);
      console.log('✓ Añadida relación a app.xml en _rels/.rels');
    } else {
      console.log('⚠ La relación a app.xml ya existe en _rels/.rels');
    }
  } else {
    console.warn('⚠ No se encontró _rels/.rels');
  }

  // C) Modificar [Content_Types].xml para añadir override de app.xml
  let contentTypesContent = await zip.file('[Content_Types].xml')?.async('string');
  if (contentTypesContent) {
    // Verificar si ya existe el override
    if (!contentTypesContent.includes('docProps/app.xml')) {
      // Añadir el override antes del cierre de </Types>
      const appOverride = `  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>`;
      contentTypesContent = contentTypesContent.replace('</Types>', `${appOverride}\n</Types>`);
      zip.file('[Content_Types].xml', contentTypesContent);
      console.log('✓ Añadido override para app.xml en [Content_Types].xml');
    } else {
      console.log('⚠ El override para app.xml ya existe en [Content_Types].xml');
    }
  } else {
    console.warn('⚠ No se encontró [Content_Types].xml');
  }

  // D) Limpiar word/_rels/document.xml.rels - eliminar TargetMode="Internal" de theme
  let docRelsContent = await zip.file('word/_rels/document.xml.rels')?.async('string');
  if (docRelsContent) {
    // Eliminar TargetMode="Internal" de todas las relaciones
    const cleanedDocRels = docRelsContent.replace(/\s+TargetMode="Internal"/g, '');
    if (cleanedDocRels !== docRelsContent) {
      zip.file('word/_rels/document.xml.rels', cleanedDocRels);
      console.log('✓ Limpiado TargetMode="Internal" de word/_rels/document.xml.rels');
    }
  } else {
    console.log('⚠ No se encontró word/_rels/document.xml.rels');
  }

  // E) Validar y limpiar word/document.xml
  let documentXmlContent = await zip.file('word/document.xml')?.async('string');
  if (documentXmlContent) {
    // Verificar que el XML esté bien formado
    let cleanedDocXml = documentXmlContent;

    // Eliminar caracteres de control inválidos en XML
    cleanedDocXml = cleanedDocXml.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

    // Asegurar que las entidades estén correctamente escapadas
    // Esto es especialmente importante para el contenido de texto dentro de <w:t>
    cleanedDocXml = cleanedDocXml.replace(/<w:t([^>]*)>(.*?)<\/w:t>/g, (match, attrs, textContent) => {
      // No reemplazar entidades ya escapadas
      let cleanText = textContent;

      // Solo escapar & que no son parte de entidades
      cleanText = cleanText.replace(/&(?!(amp|lt|gt|quot|apos);)/g, '&amp;');

      return `<w:t${attrs}>${cleanText}</w:t>`;
    });

    if (cleanedDocXml !== documentXmlContent) {
      zip.file('word/document.xml', cleanedDocXml);
      console.log('✓ Limpiado caracteres inválidos en word/document.xml');
    } else {
      console.log('✓ word/document.xml está limpio');
    }
  } else {
    console.warn('⚠ No se encontró word/document.xml');
  }

  // Listar archivos en el ZIP para verificar que no se pierda contenido
  const filesList: string[] = [];
  zip.forEach((relativePath, file) => {
    filesList.push(relativePath);
  });
  console.log(`Archivos en el ZIP: ${filesList.length} archivos`);
  console.log('Archivos:', filesList.join(', '));

  // Generar el nuevo buffer con las MISMAS opciones que el original
  // NO usar compresión agresiva que puede corromper
  const fixedBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 6  // Nivel balanceado (default), no 9 que es muy agresivo
    },
    // Preservar la estructura original del ZIP
    streamFiles: false
  });

  console.log(`✓ DOCX post-procesado: ${docxBuffer.length} bytes → ${fixedBuffer.length} bytes`);

  // VERIFICACIÓN CRÍTICA: El archivo post-procesado no debería ser mucho más pequeño
  const sizeRatio = fixedBuffer.length / docxBuffer.length;
  if (sizeRatio < 0.5) {
    console.error(`⚠️ ADVERTENCIA: El archivo post-procesado es ${(sizeRatio * 100).toFixed(1)}% del tamaño original`);
    console.error('Esto puede indicar pérdida de contenido. Ratio esperado: 100-110%');
  }

  return fixedBuffer;
}

const createProjectSchema = z.object({
  rol: z.enum(['inversor','operador','banco']).optional().default('inversor'),
  nombre: z.string().min(2),
  comunidad_autonoma: z.string().min(2),
  provincia: z.string().min(2),
  zona: z.string().min(2),
  segmento: z.enum(['urbano','vacacional']),
  categoria: z.enum(['economy','midscale','upper_midscale','upscale','upper_upscale','luxury']),
  habitaciones: z.number().int().positive(),
  horizonte: z.number().int().min(1).max(40).default(7),
  moneda: z.string().length(3).default('EUR')
});

const updateConfigSchema = z.object({
  // Datos del proyecto
  nombre: z.string().min(2).optional(),
  comunidad_autonoma: z.string().min(2).optional(),
  provincia: z.string().min(2).optional(),
  zona: z.string().min(2).optional(),
  segmento: z.enum(['urbano','vacacional']).optional(),
  categoria: z.enum(['economy','midscale','upper_midscale','upscale','upper_upscale','luxury']).optional(),
  habitaciones: z.number().int().positive().optional(),
  horizonte: z.number().int().min(1).max(40).optional(),
  moneda: z.string().length(3).optional(),
  rol: z.enum(['inversor','operador','banco']).optional(),

  // Financiación
  precio_compra: z.number().optional(),
  capex_inicial: z.number().optional(),
  ltv: z.number().min(0).max(1).optional(),
  interes: z.number().min(0).max(1).optional(),
  plazo_anios: z.number().int().min(0).max(40).optional(), // 0 = sin financiación
  tipo_amortizacion: z.enum(['frances','bullet']).optional(),

  // Operator contract
  operacion_tipo: z.enum(['gestion_propia','operador']).optional(),
  fee_base_anual: z.number().nullable().optional(),
  fee_pct_total_rev: z.number().min(0).max(1).nullable().optional(),
  fee_pct_gop: z.number().min(0).max(1).nullable().optional(),
  fee_incentive_pct: z.number().min(0).max(1).nullable().optional(),
  fee_hurdle_gop_margin: z.number().min(0).max(1).nullable().optional(),
  gop_ajustado: z.boolean().optional(),

  // Settings
  ffe: z.number().min(0).max(1).optional(),
  metodo_valoracion: z.enum(['cap_rate','multiplo']).optional(),
  cap_rate_salida: z.number().min(0).max(1).nullable().optional(),
  multiplo_salida: z.number().nullable().optional(),
  coste_tx_compra_pct: z.number().min(0).max(1).nullable().optional(),
  coste_tx_venta_pct: z.number().min(0).max(1).optional(),

  // Non-operating
  nonop_taxes_anual: z.number().optional(),
  nonop_insurance_anual: z.number().optional(),
  nonop_rent_anual: z.number().optional(),
  nonop_other_anual: z.number().optional(),

  // Projection assumptions
  adr_growth_pct: z.number().optional(),
  occ_delta_pp: z.number().optional(),
  occ_cap: z.number().optional(),
  cost_inflation_pct: z.number().optional(),
  undistributed_inflation_pct: z.number().optional(),
  nonop_inflation_pct: z.number().optional(),
});

router.get('/v1/projects', async (req, res) => {
  const email = (req as any).userEmail as string;
  const [rows] = await pool.query(
    `SELECT project_id, nombre, rol, comunidad_autonoma, provincia, zona, segmento, categoria, horizonte, estado, snapshot_finalizado, created_at, updated_at
       FROM projects
      WHERE owner_email=?
      ORDER BY updated_at DESC`,
    [email]
  );
  res.json(rows);
});

router.post('/v1/projects', async (req,res)=>{
  const email = (req as any).userEmail as string;
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const id = uuidv4();
  const p = parsed.data;
  await pool.query(
    `INSERT INTO projects (project_id, owner_email, rol, nombre, comunidad_autonoma, provincia, zona, segmento, categoria, habitaciones, horizonte, moneda)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, email, p.rol, p.nombre, p.comunidad_autonoma, p.provincia, p.zona, p.segmento, p.categoria, p.habitaciones, p.horizonte, p.moneda]
  );

  // defaults mínimos
  await pool.query(`INSERT INTO project_settings (project_id) VALUES (?)`, [id]);
  await pool.query(`INSERT INTO nonoperating_assumptions (project_id) VALUES (?)`, [id]);
  await pool.query(`INSERT INTO operator_contracts (project_id, operacion_tipo) VALUES (?, 'operador')`, [id]);

  res.status(201).json({ project_id: id });
});

// GET /v1/projects/:id/config - Obtener configuración completa del proyecto
router.get('/v1/projects/:id/config', async (req, res) => {
  const email = (req as any).userEmail as string;
  const projectId = req.params.id;

  // Verificar que el usuario es dueño del proyecto
  const [projectRows] = await pool.query<any[]>(
    `SELECT * FROM projects WHERE project_id=? AND owner_email=?`,
    [projectId, email]
  );
  if (!projectRows || projectRows.length === 0) {
    return res.status(404).json({ error: 'Proyecto no encontrado' });
  }

  const project = projectRows[0];

  // Obtener settings
  const [settingsRows] = await pool.query<any[]>(
    `SELECT * FROM project_settings WHERE project_id=?`,
    [projectId]
  );
  const settings = settingsRows?.[0] || {};

  // Obtener financing
  const [financingRows] = await pool.query<any[]>(
    `SELECT * FROM financing_terms WHERE project_id=?`,
    [projectId]
  );
  const financing = financingRows?.[0] || {};

  // Obtener operator contract
  const [operatorRows] = await pool.query<any[]>(
    `SELECT * FROM operator_contracts WHERE project_id=?`,
    [projectId]
  );
  const operator = operatorRows?.[0] || {};

  // Obtener nonoperating
  const [nonopRows] = await pool.query<any[]>(
    `SELECT * FROM nonoperating_assumptions WHERE project_id=?`,
    [projectId]
  );
  const nonop = nonopRows?.[0] || {};

  // Obtener projection assumptions
  const [projectionRows] = await pool.query<any[]>(
    `SELECT * FROM projection_assumptions WHERE project_id=?`,
    [projectId]
  );
  const projectionAssumptions = projectionRows?.[0] || {};

  // Combinar todo
  const config = {
    // Proyecto
    nombre: project.nombre,
    comunidad_autonoma: project.comunidad_autonoma,
    provincia: project.provincia,
    zona: project.zona,
    segmento: project.segmento,
    categoria: project.categoria,
    habitaciones: project.habitaciones,
    horizonte: project.horizonte,
    moneda: project.moneda,
    rol: project.rol,

    // Financiación
    precio_compra: financing.precio_compra,
    capex_inicial: financing.capex_inicial,
    ltv: financing.ltv,
    interes: financing.interes,
    plazo_anios: financing.plazo_anios,
    tipo_amortizacion: financing.tipo_amortizacion,

    // Operator
    operacion_tipo: operator.operacion_tipo,
    fee_base_anual: operator.fee_base_anual,
    fee_pct_total_rev: operator.fee_pct_total_rev,
    fee_pct_gop: operator.fee_pct_gop,
    fee_incentive_pct: operator.fee_incentive_pct,
    fee_hurdle_gop_margin: operator.fee_hurdle_gop_margin,
    gop_ajustado: operator.gop_ajustado,

    // Settings
    ffe: settings.ffe,
    metodo_valoracion: settings.metodo_valoracion,
    cap_rate_salida: settings.cap_rate_salida,
    multiplo_salida: settings.multiplo_salida,
    coste_tx_compra_pct: settings.coste_tx_compra_pct,
    coste_tx_venta_pct: settings.coste_tx_venta_pct,

    // Non-operating
    nonop_taxes_anual: nonop.nonop_taxes_anual,
    nonop_insurance_anual: nonop.nonop_insurance_anual,
    nonop_rent_anual: nonop.nonop_rent_anual,
    nonop_other_anual: nonop.nonop_other_anual,

    // Projection assumptions
    adr_growth_pct: projectionAssumptions.adr_growth_pct,
    occ_delta_pp: projectionAssumptions.occ_delta_pp,
    occ_cap: projectionAssumptions.occ_cap,
    cost_inflation_pct: projectionAssumptions.cost_inflation_pct,
    undistributed_inflation_pct: projectionAssumptions.undistributed_inflation_pct,
    nonop_inflation_pct: projectionAssumptions.nonop_inflation_pct,
  };

  res.json(config);
});

// PUT /v1/projects/:id/config - Actualizar configuración completa del proyecto
router.put('/v1/projects/:id/config', async (req, res) => {
  const email = (req as any).userEmail as string;
  const projectId = req.params.id;

  const parsed = updateConfigSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const data = parsed.data;

  // Verificar que el usuario es dueño del proyecto
  const [projectRows] = await pool.query<any[]>(
    `SELECT * FROM projects WHERE project_id=? AND owner_email=?`,
    [projectId, email]
  );
  if (!projectRows || projectRows.length === 0) {
    return res.status(404).json({ error: 'Proyecto no encontrado' });
  }

  // Actualizar tabla projects
  const projectUpdates: any = {};
  if (data.nombre !== undefined) projectUpdates.nombre = data.nombre;
  if (data.comunidad_autonoma !== undefined) projectUpdates.comunidad_autonoma = data.comunidad_autonoma;
  if (data.provincia !== undefined) projectUpdates.provincia = data.provincia;
  if (data.zona !== undefined) projectUpdates.zona = data.zona;
  if (data.segmento !== undefined) projectUpdates.segmento = data.segmento;
  if (data.categoria !== undefined) projectUpdates.categoria = data.categoria;
  if (data.habitaciones !== undefined) projectUpdates.habitaciones = data.habitaciones;
  if (data.horizonte !== undefined) projectUpdates.horizonte = data.horizonte;
  if (data.moneda !== undefined) projectUpdates.moneda = data.moneda;
  if (data.rol !== undefined) projectUpdates.rol = data.rol;

  if (Object.keys(projectUpdates).length > 0) {
    const setClauses = Object.keys(projectUpdates).map(k => `${k}=?`).join(', ');
    const values = Object.values(projectUpdates);
    await pool.query(
      `UPDATE projects SET ${setClauses} WHERE project_id=?`,
      [...values, projectId]
    );
  }

  // Actualizar financing_terms
  const financingUpdates: any = {};
  if (data.precio_compra !== undefined) financingUpdates.precio_compra = data.precio_compra;
  if (data.capex_inicial !== undefined) financingUpdates.capex_inicial = data.capex_inicial;
  if (data.ltv !== undefined) financingUpdates.ltv = data.ltv;
  if (data.interes !== undefined) financingUpdates.interes = data.interes;
  if (data.plazo_anios !== undefined) financingUpdates.plazo_anios = data.plazo_anios;
  if (data.tipo_amortizacion !== undefined) financingUpdates.tipo_amortizacion = data.tipo_amortizacion;

  if (Object.keys(financingUpdates).length > 0) {
    // Verificar si existe
    const [existingFin] = await pool.query<any[]>(
      `SELECT project_id FROM financing_terms WHERE project_id=?`,
      [projectId]
    );

    if (existingFin && existingFin.length > 0) {
      const setClauses = Object.keys(financingUpdates).map(k => `${k}=?`).join(', ');
      const values = Object.values(financingUpdates);
      await pool.query(
        `UPDATE financing_terms SET ${setClauses} WHERE project_id=?`,
        [...values, projectId]
      );
    } else {
      // Crear si no existe
      await pool.query(
        `INSERT INTO financing_terms (project_id, precio_compra, capex_inicial, ltv, interes, plazo_anios, tipo_amortizacion)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [projectId, financingUpdates.precio_compra, financingUpdates.capex_inicial,
         financingUpdates.ltv, financingUpdates.interes, financingUpdates.plazo_anios,
         financingUpdates.tipo_amortizacion]
      );
    }
  }

  // Actualizar operator_contracts
  const operatorUpdates: any = {};
  if (data.operacion_tipo !== undefined) operatorUpdates.operacion_tipo = data.operacion_tipo;
  if (data.fee_base_anual !== undefined) operatorUpdates.fee_base_anual = data.fee_base_anual;
  if (data.fee_pct_total_rev !== undefined) operatorUpdates.fee_pct_total_rev = data.fee_pct_total_rev;
  if (data.fee_pct_gop !== undefined) operatorUpdates.fee_pct_gop = data.fee_pct_gop;
  if (data.fee_incentive_pct !== undefined) operatorUpdates.fee_incentive_pct = data.fee_incentive_pct;
  if (data.fee_hurdle_gop_margin !== undefined) operatorUpdates.fee_hurdle_gop_margin = data.fee_hurdle_gop_margin;
  if (data.gop_ajustado !== undefined) operatorUpdates.gop_ajustado = data.gop_ajustado;

  if (Object.keys(operatorUpdates).length > 0) {
    const setClauses = Object.keys(operatorUpdates).map(k => `${k}=?`).join(', ');
    const values = Object.values(operatorUpdates);
    await pool.query(
      `UPDATE operator_contracts SET ${setClauses} WHERE project_id=?`,
      [...values, projectId]
    );
  }

  // Actualizar project_settings
  const settingsUpdates: any = {};
  if (data.ffe !== undefined) settingsUpdates.ffe = data.ffe;
  if (data.metodo_valoracion !== undefined) settingsUpdates.metodo_valoracion = data.metodo_valoracion;
  if (data.cap_rate_salida !== undefined) settingsUpdates.cap_rate_salida = data.cap_rate_salida;
  if (data.multiplo_salida !== undefined) settingsUpdates.multiplo_salida = data.multiplo_salida;
  if (data.coste_tx_compra_pct !== undefined) settingsUpdates.coste_tx_compra_pct = data.coste_tx_compra_pct;
  if (data.coste_tx_venta_pct !== undefined) settingsUpdates.coste_tx_venta_pct = data.coste_tx_venta_pct;

  if (Object.keys(settingsUpdates).length > 0) {
    const setClauses = Object.keys(settingsUpdates).map(k => `${k}=?`).join(', ');
    const values = Object.values(settingsUpdates);
    await pool.query(
      `UPDATE project_settings SET ${setClauses} WHERE project_id=?`,
      [...values, projectId]
    );
  }

  // Actualizar nonoperating_assumptions
  const nonopUpdates: any = {};
  if (data.nonop_taxes_anual !== undefined) nonopUpdates.nonop_taxes_anual = data.nonop_taxes_anual;
  if (data.nonop_insurance_anual !== undefined) nonopUpdates.nonop_insurance_anual = data.nonop_insurance_anual;
  if (data.nonop_rent_anual !== undefined) nonopUpdates.nonop_rent_anual = data.nonop_rent_anual;
  if (data.nonop_other_anual !== undefined) nonopUpdates.nonop_other_anual = data.nonop_other_anual;

  if (Object.keys(nonopUpdates).length > 0) {
    const setClauses = Object.keys(nonopUpdates).map(k => `${k}=?`).join(', ');
    const values = Object.values(nonopUpdates);
    await pool.query(
      `UPDATE nonoperating_assumptions SET ${setClauses} WHERE project_id=?`,
      [...values, projectId]
    );
  }

  // Actualizar projection_assumptions
  const projectionAssumptionUpdates: any = {};
  if (data.adr_growth_pct !== undefined) projectionAssumptionUpdates.adr_growth_pct = data.adr_growth_pct;
  if (data.occ_delta_pp !== undefined) projectionAssumptionUpdates.occ_delta_pp = data.occ_delta_pp;
  if (data.occ_cap !== undefined) projectionAssumptionUpdates.occ_cap = data.occ_cap;
  if (data.cost_inflation_pct !== undefined) projectionAssumptionUpdates.cost_inflation_pct = data.cost_inflation_pct;
  if (data.undistributed_inflation_pct !== undefined) projectionAssumptionUpdates.undistributed_inflation_pct = data.undistributed_inflation_pct;
  if (data.nonop_inflation_pct !== undefined) projectionAssumptionUpdates.nonop_inflation_pct = data.nonop_inflation_pct;

  if (Object.keys(projectionAssumptionUpdates).length > 0) {
    // Intentar UPDATE primero, si no existe el registro, hacer INSERT
    const [existingRows]: any = await pool.query(
      `SELECT project_id FROM projection_assumptions WHERE project_id=?`,
      [projectId]
    );

    if (existingRows && existingRows.length > 0) {
      // Registro existe, hacer UPDATE
      const setClauses = Object.keys(projectionAssumptionUpdates).map(k => `${k}=?`).join(', ');
      const values = Object.values(projectionAssumptionUpdates);
      await pool.query(
        `UPDATE projection_assumptions SET ${setClauses} WHERE project_id=?`,
        [...values, projectId]
      );
    } else {
      // Registro no existe, hacer INSERT con defaults
      await pool.query(
        `INSERT INTO projection_assumptions
         (project_id, adr_growth_pct, occ_delta_pp, occ_cap, cost_inflation_pct, undistributed_inflation_pct, nonop_inflation_pct)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          projectId,
          projectionAssumptionUpdates.adr_growth_pct ?? 0.05,
          projectionAssumptionUpdates.occ_delta_pp ?? 1.0,
          projectionAssumptionUpdates.occ_cap ?? 0.92,
          projectionAssumptionUpdates.cost_inflation_pct ?? 0.02,
          projectionAssumptionUpdates.undistributed_inflation_pct ?? 0.02,
          projectionAssumptionUpdates.nonop_inflation_pct ?? 0.02
        ]
      );
    }
  }

  res.json({ success: true, project_id: projectId });
});

// DELETE /v1/projects/:id - Eliminar proyecto (eliminación en cascada automática)
router.delete('/v1/projects/:id', async (req, res) => {
  const email = (req as any).userEmail as string;
  const projectId = req.params.id;

  // Verificar que el usuario es dueño del proyecto
  const [projectRows] = await pool.query<any[]>(
    `SELECT * FROM projects WHERE project_id=? AND owner_email=?`,
    [projectId, email]
  );
  if (!projectRows || projectRows.length === 0) {
    return res.status(404).json({ error: 'Proyecto no encontrado' });
  }

  // Eliminar el proyecto (la cascada eliminará automáticamente todos los datos relacionados)
  await pool.query(
    `DELETE FROM projects WHERE project_id=?`,
    [projectId]
  );

  res.json({ success: true, project_id: projectId });
});

// GET /v1/projects/:id/edited-fields - Obtener campos editados del proyecto
router.get('/v1/projects/:id/edited-fields', async (req, res) => {
  const email = (req as any).userEmail as string;
  const projectId = req.params.id;

  // Verificar que el usuario es dueño del proyecto
  const [projectRows] = await pool.query<any[]>(
    `SELECT * FROM projects WHERE project_id=? AND owner_email=?`,
    [projectId, email]
  );
  if (!projectRows || projectRows.length === 0) {
    return res.status(404).json({ error: 'Proyecto no encontrado' });
  }

  // Obtener campos editados
  const [fields] = await pool.query<any[]>(
    `SELECT step, campo, mes, anio FROM edited_fields_log WHERE project_id=? ORDER BY created_at ASC`,
    [projectId]
  );

  res.json(fields);
});

// POST /v1/projects/:id/edited-fields - Guardar campos editados del proyecto
router.post('/v1/projects/:id/edited-fields', async (req, res) => {
  const email = (req as any).userEmail as string;
  const projectId = req.params.id;

  // Verificar que el usuario es dueño del proyecto
  const [projectRows] = await pool.query<any[]>(
    `SELECT * FROM projects WHERE project_id=? AND owner_email=?`,
    [projectId, email]
  );
  if (!projectRows || projectRows.length === 0) {
    return res.status(404).json({ error: 'Proyecto no encontrado' });
  }

  // Esperar un array de objetos: [{ step: 1, campo: 'dias', mes: 1 }, ...]
  const fields = req.body;
  if (!Array.isArray(fields)) {
    return res.status(400).json({ error: 'Se esperaba un array de campos editados' });
  }

  // Eliminar registros antiguos del proyecto
  await pool.query(
    `DELETE FROM edited_fields_log WHERE project_id=?`,
    [projectId]
  );

  // Insertar nuevos registros
  if (fields.length > 0) {
    const values = fields.map((f: any) => [
      projectId,
      f.step,
      f.campo,
      f.mes || null,
      f.anio || null
    ]);

    await pool.query(
      `INSERT INTO edited_fields_log (project_id, step, campo, mes, anio) VALUES ?`,
      [values]
    );
  }

  res.json({ success: true, count: fields.length });
});

// GET /v1/projects/:id/sensitivity-scenarios - Obtener escenarios de sensibilidad del proyecto
router.get('/v1/projects/:id/sensitivity-scenarios', async (req, res) => {
  const email = (req as any).userEmail as string;
  const projectId = req.params.id;

  // Verificar que el usuario es dueño del proyecto
  const [projectRows] = await pool.query<any[]>(
    `SELECT * FROM projects WHERE project_id=? AND owner_email=?`,
    [projectId, email]
  );
  if (!projectRows || projectRows.length === 0) {
    return res.status(404).json({ error: 'Proyecto no encontrado' });
  }

  // Obtener escenarios
  const [scenarios] = await pool.query<any[]>(
    `SELECT scenario_id as id, scenario_name as name, adr_delta_pct, occ_delta_pp
     FROM sensitivity_scenarios
     WHERE project_id=?
     ORDER BY created_at ASC`,
    [projectId]
  );

  res.json(scenarios);
});

// POST /v1/projects/:id/sensitivity-scenarios - Guardar escenarios de sensibilidad del proyecto
router.post('/v1/projects/:id/sensitivity-scenarios', async (req, res) => {
  const email = (req as any).userEmail as string;
  const projectId = req.params.id;

  // Verificar que el usuario es dueño del proyecto
  const [projectRows] = await pool.query<any[]>(
    `SELECT * FROM projects WHERE project_id=? AND owner_email=?`,
    [projectId, email]
  );
  if (!projectRows || projectRows.length === 0) {
    return res.status(404).json({ error: 'Proyecto no encontrado' });
  }

  // Esperar un array de objetos: [{ name: 'Escenario', adr_delta_pct: 0.02, occ_delta_pp: 1.0 }, ...]
  const scenarios = req.body;
  if (!Array.isArray(scenarios)) {
    return res.status(400).json({ error: 'Se esperaba un array de escenarios' });
  }

  // Eliminar escenarios antiguos del proyecto
  await pool.query(
    `DELETE FROM sensitivity_scenarios WHERE project_id=?`,
    [projectId]
  );

  // Insertar nuevos escenarios
  if (scenarios.length > 0) {
    const values = scenarios.map((s: any) => [
      projectId,
      s.name,
      s.adr_delta_pct,
      s.occ_delta_pp
    ]);

    await pool.query(
      `INSERT INTO sensitivity_scenarios (project_id, scenario_name, adr_delta_pct, occ_delta_pp) VALUES ?`,
      [values]
    );
  }

  res.json({ success: true, count: scenarios.length });
});

// POST /v1/projects/:id/finalize - Finalizar proyecto y guardar snapshot HTML
router.post('/v1/projects/:id/finalize', async (req, res) => {
  const email = (req as any).userEmail as string;
  const projectId = req.params.id;

  // Verificar que el usuario es dueño del proyecto
  const [projectRows] = await pool.query<any[]>(
    `SELECT * FROM projects WHERE project_id=? AND owner_email=?`,
    [projectId, email]
  );
  if (!projectRows || projectRows.length === 0) {
    return res.status(404).json({ error: 'Proyecto no encontrado' });
  }

  const project = projectRows[0];

  // Verificar que el proyecto esté en estado 'finalized'
  if (project.estado !== 'finalized') {
    return res.status(400).json({ error: 'El proyecto debe estar en estado finalized para poder finalizarse definitivamente' });
  }

  // Validar que tenga HTML content
  const htmlContent = req.body.htmlContent;
  if (!htmlContent || typeof htmlContent !== 'string') {
    return res.status(400).json({ error: 'Se requiere htmlContent en el body' });
  }

  try {
    // Guardar o actualizar el snapshot HTML
    await pool.query(
      `INSERT INTO project_snapshots (project_id, html_content, finalized_at)
       VALUES (?, ?, NOW(3))
       ON DUPLICATE KEY UPDATE html_content=VALUES(html_content), finalized_at=NOW(3)`,
      [projectId, htmlContent]
    );

    // Marcar el proyecto como snapshot_finalizado
    await pool.query(
      `UPDATE projects SET snapshot_finalizado=TRUE, updated_at=NOW(3) WHERE project_id=?`,
      [projectId]
    );

    res.json({ success: true, message: 'Proyecto finalizado exitosamente' });
  } catch (e: any) {
    console.error('Error finalizando proyecto:', e);
    res.status(500).json({ error: 'Error al finalizar proyecto: ' + e.message });
  }
});

// GET /v1/projects/:id/snapshot - Obtener snapshot HTML del proyecto finalizado
router.get('/v1/projects/:id/snapshot', async (req, res) => {
  const email = (req as any).userEmail as string;
  const projectId = req.params.id;

  // Verificar que el usuario es dueño del proyecto
  const [projectRows] = await pool.query<any[]>(
    `SELECT snapshot_finalizado FROM projects WHERE project_id=? AND owner_email=?`,
    [projectId, email]
  );
  if (!projectRows || projectRows.length === 0) {
    return res.status(404).json({ error: 'Proyecto no encontrado' });
  }

  const project = projectRows[0];

  // Verificar que el proyecto tenga snapshot
  if (!project.snapshot_finalizado) {
    return res.status(404).json({ error: 'El proyecto no tiene snapshot finalizado' });
  }

  // Obtener el snapshot
  const [snapshotRows] = await pool.query<any[]>(
    `SELECT html_content, finalized_at FROM project_snapshots WHERE project_id=?`,
    [projectId]
  );

  if (!snapshotRows || snapshotRows.length === 0) {
    return res.status(404).json({ error: 'Snapshot no encontrado' });
  }

  const snapshot = snapshotRows[0];
  res.json({
    htmlContent: snapshot.html_content,
    finalizedAt: snapshot.finalized_at
  });
});

// POST /v1/projects/:id/snapshot/word - Generar Word desde snapshot HTML
router.post('/v1/projects/:id/snapshot/word', async (req, res) => {
  const email = (req as any).userEmail as string;
  const projectId = req.params.id;

  try {
    // Verificar que el usuario es dueño del proyecto
    const [projectRows] = await pool.query<any[]>(
      `SELECT nombre, snapshot_finalizado FROM projects WHERE project_id=? AND owner_email=?`,
      [projectId, email]
    );
    if (!projectRows || projectRows.length === 0) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    const project = projectRows[0];

    // Verificar que el proyecto tenga snapshot
    if (!project.snapshot_finalizado) {
      return res.status(404).json({ error: 'El proyecto no tiene snapshot finalizado' });
    }

    // Obtener el snapshot
    const [snapshotRows] = await pool.query<any[]>(
      `SELECT html_content FROM project_snapshots WHERE project_id=?`,
      [projectId]
    );

    if (!snapshotRows || snapshotRows.length === 0) {
      return res.status(404).json({ error: 'Snapshot no encontrado' });
    }

    const htmlContent = snapshotRows[0].html_content;

    if (!htmlContent || typeof htmlContent !== 'string') {
      return res.status(400).json({ error: 'El contenido HTML está vacío o es inválido' });
    }

    // Envolver el HTML en una estructura completa de documento si no lo está ya
    const fullHtml = htmlContent.includes('<!DOCTYPE') ? htmlContent : `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: 'Calibri', 'Arial', sans-serif;
              font-size: 11pt;
              line-height: 1.15;
            }
            h1 {
              color: #1f2937;
              font-size: 24pt;
              font-weight: bold;
              margin-bottom: 12pt;
            }
            h2 {
              color: #374151;
              font-size: 18pt;
              font-weight: bold;
              margin-bottom: 10pt;
              margin-top: 16pt;
            }
            h3 {
              color: #4b5563;
              font-size: 14pt;
              font-weight: bold;
              margin-bottom: 8pt;
              margin-top: 12pt;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 10pt 0;
            }
            th, td {
              border: 1pt solid #d1d5db;
              padding: 6pt 8pt;
              text-align: left;
            }
            th {
              background-color: #f3f4f6;
              font-weight: bold;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .text-green-600 { color: #059669; }
            .text-red-600 { color: #dc2626; }
            .text-blue-600 { color: #2563eb; }
            .bg-green-50 { background-color: #f0fdf4; }
            .bg-red-50 { background-color: #fef2f2; }
            .bg-blue-50 { background-color: #eff6ff; }
            .bg-gray-50 { background-color: #f9fafb; }
            .bg-gray-100 { background-color: #f3f4f6; }
            p { margin: 6pt 0; }
            .mb-4 { margin-bottom: 12pt; }
            .mt-4 { margin-top: 12pt; }
            .space-y-4 > * + * { margin-top: 12pt; }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `;

    console.log('Convirtiendo HTML a DOCX en el servidor...');
    console.log('Longitud del HTML original:', fullHtml.length, 'caracteres');

    // TRANSFORMAR HTML para Word (eliminar flex/grid, convertir a tablas)
    const transformedHtml = transformHtmlForWord(fullHtml);

    // SANITIZAR HTML antes de convertir para evitar XML mal formado
    const sanitizedHtml = sanitizeHtmlForDocx(transformedHtml);

    console.log('Usando html-docx-js (alternativa más estable que html-to-docx)');

    // Convertir HTML a DOCX usando html-docx-js
    // En Node.js, html-docx-js retorna el contenido directamente
    const docxContent = htmlDocx.asBlob(sanitizedHtml);

    console.log(`Contenido generado por html-docx-js: tipo=${typeof docxContent}`);

    // Convertir a Buffer si es necesario
    let docxBuffer: Buffer;
    if (Buffer.isBuffer(docxContent)) {
      docxBuffer = docxContent;
    } else if (docxContent instanceof Uint8Array) {
      docxBuffer = Buffer.from(docxContent);
    } else if (typeof docxContent === 'string') {
      // Si retorna string, puede ser base64 o el contenido crudo
      docxBuffer = Buffer.from(docxContent, 'binary');
    } else if (docxContent && typeof docxContent === 'object' && 'arrayBuffer' in docxContent) {
      // Es un Blob, convertir a Buffer
      const arrayBuffer = await (docxContent as any).arrayBuffer();
      docxBuffer = Buffer.from(arrayBuffer);
    } else {
      throw new Error(`Tipo inesperado de html-docx-js: ${typeof docxContent}`);
    }

    console.log(`DOCX buffer recibido: ${docxBuffer.length} bytes`);

    // Ya tenemos el Buffer correcto
    const finalBuffer = docxBuffer;

    // Validar que el buffer no esté vacío
    if (!finalBuffer || finalBuffer.length === 0) {
      throw new Error('El buffer generado está vacío');
    }

    // Validar que sea un archivo ZIP válido (los .docx son archivos ZIP)
    // Los archivos ZIP comienzan con los bytes PK (0x50 0x4B)
    if (finalBuffer[0] !== 0x50 || finalBuffer[1] !== 0x4B) {
      console.error('ERROR: El buffer generado no tiene la firma ZIP válida');
      console.error('Primeros 20 bytes (hex):', finalBuffer.slice(0, 20).toString('hex'));
      console.error('Primeros 20 bytes (ascii):', finalBuffer.slice(0, 20).toString('ascii'));
      throw new Error('El archivo generado no tiene formato ZIP válido (no empieza con PK)');
    }

    console.log('✓ Validación ZIP inicial exitosa (firma PK encontrada)');

    // TEMPORALMENTE DESHABILITADO: El post-procesamiento con JSZip corrompe el archivo
    // TODO: Investigar por qué JSZip reduce el archivo de 290KB a 16KB
    console.log('⚠️ Post-procesamiento DESHABILITADO temporalmente');
    console.log('Enviando archivo original de html-to-docx sin modificaciones');

    // Guardar el buffer original como backup
    // const originalBuffer = Buffer.from(finalBuffer);
    // const originalSize = originalBuffer.length;

    // POST-PROCESAMIENTO: Arreglar la estructura del DOCX para compatibilidad con Word
    // Añade docProps/app.xml, corrige _rels/.rels, [Content_Types].xml, y limpia document.xml.rels
    // try {
    //   finalBuffer = await fixDocxStructure(finalBuffer);

    //   // Validar el buffer post-procesado
    //   if (finalBuffer[0] !== 0x50 || finalBuffer[1] !== 0x4B) {
    //     console.error('ERROR: El buffer post-procesado perdió la firma ZIP');
    //     throw new Error('El post-procesamiento corrompió el archivo');
    //   }

    //   // Verificar que el tamaño no se redujo drásticamente (pérdida de contenido)
    //   const sizeRatio = finalBuffer.length / originalSize;
    //   if (sizeRatio < 0.5) {
    //     console.error(`⚠️ ERROR CRÍTICO: El post-procesamiento redujo el archivo al ${(sizeRatio * 100).toFixed(1)}%`);
    //     console.error('Usando buffer original sin post-procesamiento como fallback');
    //     finalBuffer = originalBuffer;
    //   } else {
    //     console.log('✓ Buffer post-procesado validado correctamente');
    //   }
    // } catch (postProcessError: any) {
    //   console.error('Error en post-procesamiento:', postProcessError.message);
    //   console.error('Usando buffer original sin post-procesamiento como fallback');
    //   finalBuffer = originalBuffer;
    // }

    // Generar nombre del archivo
    const fileName = `${project.nombre || 'Proyecto'}_APP_${new Date().toISOString().split('T')[0]}.docx`;

    console.log(`Enviando archivo: ${fileName} (${finalBuffer.length} bytes)`);

    // SOLUCIÓN ROBUSTA: Enviar como Buffer sin conversiones intermedias
    // Establecer headers antes de enviar
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', finalBuffer.length.toString());

    // Importante: No usar res.send() ya que puede intentar interpretar el contenido
    // res.end() envía el buffer raw sin procesamiento adicional
    res.end(finalBuffer);
  } catch (error: any) {
    console.error('Error generando Word desde HTML:', error);
    res.status(500).json({ error: 'Error al generar documento Word: ' + error.message });
  }
});

export default router;
