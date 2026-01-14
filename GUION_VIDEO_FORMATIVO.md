# GUIÓN PARA VÍDEO FORMATIVO - APLICACIÓN HOTEL SCREENING

## INTRODUCCIÓN
**Objetivo general:** Esta aplicación permite analizar la viabilidad comercial y financiera de proyectos hoteleros, desde la proyección operativa básica para operadores hasta el análisis completo de retornos para inversores.

---

## CONFIGURACIÓN INICIAL DEL PROYECTO

### **Objetivo:**
Definir las características básicas del activo hotelero que se va a analizar.

### **Qué se va a encontrar el usuario:**
Un formulario con los datos fundamentales del proyecto:
- Nombre del proyecto
- Ubicación geográfica (Comunidad Autónoma → Provincia → Zona)
- Segmento (Urbano o Vacacional)
- Categoría hotelera (de 2* a 5*)
- Número de habitaciones

### **Qué debe hacer:**
1. Completar todos los campos del formulario (todos son obligatorios)
2. Seleccionar la ubicación en cascada (primero CA, luego Provincia, luego Zona)
3. Elegir el segmento y categoría que mejor se ajuste al proyecto
4. Indicar el número de habitaciones

### **Qué puede editar:**
Todos los campos son editables hasta que se guarda el proyecto.

### **Propósito:**
Esta información es crítica porque determina el **benchmark comercial** que se cargará automáticamente. La aplicación utiliza datos del INE y modelos predictivos basados en la ubicación geográfica y categoría para generar proyecciones iniciales de ocupación y ADR.

---

## PASO 1: VALIDACIÓN COMERCIAL Y1

### **Objetivo:**
Proyectar y validar la performance comercial del hotel durante el primer año de operación (Y1).

### **Qué se va a encontrar el usuario:**
Una tabla mensual (12 meses) que muestra automáticamente:
- **Ocupación (%)** por mes - basada en benchmark del sector
- **ADR (Average Daily Rate)** por mes - basado en benchmark del sector
- **RevPAR** - calculado automáticamente (Ocupación × ADR)
- **Ingresos de habitaciones** - calculado automáticamente
- **Otros ingresos** (F&B, otros departamentos)
- **Días disponibles por mes**

Estos datos provienen del benchmark del INE procesado con modelos predictivos según la ubicación y categoría seleccionadas.

### **Qué debe hacer:**
1. Revisar los datos cargados automáticamente del benchmark
2. Modificar los valores si considera que debe ajustarlos a las particularidades del proyecto
3. Prestar especial atención a:
   - La estacionalidad de ocupación
   - Los precios (ADR) por temporada
   - Los días de apertura por mes si el hotel no opera todo el año
   - Los otros ingresos según si tiene F&B u otros servicios

### **Qué puede editar:**
- ✅ Ocupación mensual (%)
- ✅ ADR mensual (€)
- ✅ Otros ingresos mensuales (€)
- ✅ Días disponibles por mes
- ❌ RevPAR (se calcula automáticamente)
- ❌ Ingresos de habitaciones (se calculan automáticamente)

### **Propósito:**
Este paso establece la base comercial del proyecto. Es fundamental ser realista en las proyecciones, ya que todos los análisis posteriores parten de estos datos. El sistema registra todos los campos que el usuario modifica manualmente para mantener trazabilidad.

### **Acción final:**
Al hacer clic en "Guardar Paso 1 (Aceptar Y1 comercial)", se acepta la proyección comercial y se avanza al Paso 2.

---

## PASO 2: USALI Y1 (Cuenta de Resultados)

### **Objetivo:**
Definir la estructura de costes operativos y configurar el modelo de gestión (propia o mediante operador externo) para el año 1.

### **Qué se va a encontrar el usuario:**

El Paso 2 se divide en dos partes:

#### **PARTE A: Configuración de Operación**

**Contrato de Operador:**
- Tipo de operación: Gestión propia / Operador externo
- Si selecciona "Operador externo", aparecen campos para definir:
  - Fee base anual (€)
  - Fee % sobre ingresos totales
  - Fee % sobre GOP
  - Hurdle GOP margin % (umbral mínimo de GOP para activar fee incentivo)
  - Fee incentivo %
  - Tipo de GOP para cálculo: GOP standard o GOP Ajustado (descontando FF&E)

**Gastos de mantenimiento y extraordinarios:**
- FF&E (Furniture, Fixtures & Equipment) como % sobre ingresos - obligatorio

**Gastos Non-Operating (anuales):**
- Gastos extraordinarios (€)
- Seguros (€)
- Renta/Alquiler (€)
- Otros gastos (€)

#### **PARTE B: Tabla USALI Mensual**

Una tabla con la estructura USALI completa mes a mes mostrando:
- Ingresos por departamento (habitaciones, F&B, otros)
- Costes departamentales
- **GOP (Gross Operating Profit)**
- Gastos Undistributed (administración, energía, marketing, etc.)
- **EBITDA**
- FF&E
- FEES del operador (si aplica)
- **NOI / EBITDA-FF&E**

### **Qué debe hacer:**
1. Decidir si la gestión será propia o mediante operador externo
2. Si es operador externo: configurar la estructura de fees (base, variable, incentivo)
3. Definir el porcentaje de FF&E (típicamente 3-5% de ingresos)
4. Introducir los gastos non-operating anuales
5. Revisar la tabla USALI generada automáticamente
6. Ajustar campos específicos de costes si conoce ratios más precisos para el proyecto

### **Qué puede editar:**
- ✅ Todo el formulario de configuración de operación
- ✅ Cualquier campo individual de la tabla USALI mensual
- ❌ Los campos que se recalculan automáticamente (GOP, EBITDA, NOI)

### **Propósito:**
Este paso traduce los ingresos comerciales del Paso 1 en una cuenta de resultados operativa completa. Permite entender:
- La rentabilidad operativa del hotel (GOP margin, EBITDA margin)
- El impacto de tener un operador externo (cuánto se llevan en fees)
- El cash flow neto después de FF&E (EBITDA-FF&E / NOI)

La tabla USALI es el estándar internacional para contabilidad hotelera.

### **Acción final:**
Al hacer clic en "Guardar Paso 2 (USALI Y1)", se guarda la configuración y se habilita el Paso 3.

---

## PASO 3: PROYECCIÓN AÑOS 1 A N

### **Objetivo:**
Proyectar la evolución del hotel a lo largo del horizonte de análisis (hasta 40 años), aplicando supuestos de crecimiento e inflación.

### **Qué se va a encontrar el usuario:**

#### **PARTE A: Supuestos de Proyección**
Un formulario con los drivers clave de la proyección:
- **Horizonte (años):** 1 a 40 años
- **Crecimiento ADR anual (%):** ej. 2.5%
- **Variación ocupación anual (pp):** ej. +0.5 puntos porcentuales
- **Tope de ocupación (%):** ej. 85% máximo
- **Inflación costes departamentales (%):** ej. 2%
- **Inflación gastos undistributed (%):** ej. 2%
- **Inflación gastos non-operating (%):** ej. 2%

#### **PARTE B: Tabla Anual de Proyección**
Una tabla que muestra año por año:
- Operating Revenue
- GOP y GOP %
- FEES (si hay operador)
- EBITDA y EBITDA %
- FF&E
- EBITDA-FF&E (NOI)

#### **PARTE C: Banner de Totales Acumulados**
Al final se muestra un resumen por habitación del total acumulado:
- Total Revenue por key
- GOP por key
- FEES por key
- EBITDA por key
- FF&E por key
- EBITDA-FF&E por key

### **Qué debe hacer:**
1. Definir el horizonte temporal del análisis (típicamente 10-15 años)
2. Establecer supuestos realistas de crecimiento:
   - ADR: considerar inflación + crecimiento real del mercado
   - Ocupación: ser conservador, respetar techos naturales del mercado
   - Inflación de costes: alinear con expectativas macroeconómicas
3. Revisar la proyección generada automáticamente
4. Ajustar campos específicos si hay años con comportamiento diferente (ej. ramp-up, reformas)

### **Qué puede editar:**
- ✅ Todos los supuestos de proyección
- ✅ Cualquier celda individual de la tabla anual
- ❌ Los campos que se calculan automáticamente

### **Propósito:**
Este paso permite visualizar la capacidad de generación de caja del hotel a lo largo del tiempo. Es fundamental para:
- **Operadores:** Entender la rentabilidad operativa y los fees que percibirán
- **Inversores:** Base para calcular retornos (IRR, MOIC) en pasos posteriores

La proyección considera:
- Maduración del hotel (ramp-up)
- Crecimiento del mercado
- Inflación de costes
- Estabilización en niveles de ocupación razonables

### **Acción final:**
Al hacer clic en "Guardar Paso 3 (PROYECCIÓN)", se activa la **sección de decisión**.

---

## DECISIÓN POST-PASO 3: ¿OPERADOR O INVERSOR?

### **Objetivo:**
Elegir el camino según el perfil del usuario y el propósito del análisis.

### **Qué se va a encontrar el usuario:**
Una pregunta: **"¿Cómo deseas continuar?"** con dos opciones:

#### **OPCIÓN 1: FINALIZAR PROYECTO PARA EL OPERADOR**
- Para usuarios que sólo necesitan analizar la viabilidad operativa
- Típicamente operadores hoteleros evaluando oportunidades de gestión
- Interesados en USALI, GOP, FEES

#### **OPCIÓN 2: SEGUIR CON DATOS DE INVERSIÓN**
- Para inversores, bancos, fondos
- Requiere análisis financiero completo: deuda, retornos, IRR, MOIC
- Continúa con Pasos 4 y 5

### **Qué debe hacer:**

#### **Si es OPERADOR:**
1. Seleccionar "Finalizar proyecto para el operador"
2. El sistema genera un snapshot HTML de los pasos 1-3
3. Marca el proyecto como tipo "operador" y estado "finalized"
4. Permite descargar un informe Word con:
   - Datos del activo
   - Proyección comercial Y1
   - USALI Y1 y estructura de fees
   - Proyección plurianual
   - Resumen de rentabilidad operativa

#### **Si es INVERSOR:**
1. Seleccionar "Seguir con datos de inversión"
2. El sistema marca el proyecto como tipo "inversión"
3. Se habilitan los Pasos 4 y 5

### **Propósito:**
Personalizar el análisis según el usuario:
- **Operadores:** No necesitan conocer precio de compra, financiación o retornos al equity. Les interesa la operativa y fees.
- **Inversores:** Necesitan el análisis completo para tomar decisiones de inversión: cuánto invertir, cómo financiar, qué retornos esperar.

Esta bifurcación hace que la aplicación sea útil para dos perfiles muy diferentes.

---

## PASO 4: DEUDA (Solo para Inversores)

### **Objetivo:**
Estructurar la financiación del proyecto mediante deuda bancaria.

### **Qué se va a encontrar el usuario:**
Un formulario de financiación con campos:
- **Precio de compra (€):** Valor de adquisición del activo
- **CAPEX inicial (€):** Inversión en reformas, renovación, etc.
- **Coste de transacción compra (%):** Honorarios legales, due diligence, etc.
- **LTV % (Loan-to-Value):** Porcentaje de financiación bancaria (ej. 60%)
- **Tasa de interés (%):** Tipo de interés del préstamo
- **Plazo (años):** Duración del préstamo
- **Tipo de amortización:**
  - Francés (cuotas constantes)
  - Bullet (pago total al final)

### **Qué va a generar automáticamente:**
Una **tabla de amortización completa** mostrando año por año:
- Intereses pagados
- Amortización de principal
- Cuota total anual
- Saldo pendiente de deuda

### **Qué debe hacer:**
1. Introducir el precio de compra del activo
2. Estimar el CAPEX inicial necesario
3. Definir los costes de transacción (típicamente 2-5%)
4. Configurar la financiación:
   - LTV: típicamente 50-70% para hoteles
   - Tasa de interés: según mercado y riesgo del proyecto
   - Plazo: típicamente 7-15 años
   - Tipo de amortización: Francés es lo más común
5. Revisar la tabla de amortización generada

### **Qué puede editar:**
- ✅ Todos los campos del formulario
- ❌ La tabla de amortización (se calcula automáticamente)

### **Propósito:**
La deuda tiene un impacto fundamental en los retornos al equity:
- **Positivo (apalancamiento):** Si la rentabilidad del activo > coste de la deuda, amplifica retornos
- **Negativo:** Compromete flujos de caja anuales con el servicio de deuda

Este paso permite:
- Calcular cuánto equity hay que aportar
- Entender el servicio de deuda anual
- Determinar cuándo se liberará de deuda el activo

### **Acción final:**
Al hacer clic en "Guardar Paso 4 (DEUDA)", se habilita el Paso 5 final.

---

## PASO 5: VALORACIÓN Y RETORNOS (Solo para Inversores)

### **Objetivo:**
Calcular el valor de salida del activo y los retornos esperados al equity (IRR y MOIC).

### **Qué se va a encontrar el usuario:**

#### **PARTE A: Configuración de Valoración**
Un formulario para definir el método de valoración en el exit:

**Método 1: Cap Rate**
- Cap rate de salida (%)
- Valor salida = NOI último año / Cap rate

**Método 2: Múltiplo**
- Múltiplo de salida (ej. 12x EBITDA)
- Valor salida = EBITDA último año × Múltiplo

**Común a ambos métodos:**
- Coste de transacción en la venta (%)

#### **PARTE B: Resultados Completos**

Al calcular, se generan automáticamente **6 secciones de análisis:**

##### **1. Chequeo de Plausibilidad del Exit**
- Valor de salida total y por habitación
- NOI del último año (total y por key)
- Cap rate implícito
- Propósito: Validar que el exit sea razonable

##### **2. Uses & Sources**
**USES (Inversión total):**
- Precio de compra
- CAPEX inicial
- Costes de transacción compra
- **TOTAL INVERSIÓN** (total y por key)

**SOURCES (Financiación):**
- Deuda (LTV aplicado)
- **EQUITY REQUERIDO** (total y por key)

##### **3. Flujos de Efectivo al Equity (Pre-Impuestos)**
Tabla anual mostrando:
- EBITDA - FF&E (flujos operativos)
- Servicio de deuda (intereses + amortización)
- **Caja neta al equity durante holding**
- En el último año: Valor de salida - Deuda pendiente = **Caja en la salida**

##### **4. Retornos (Pre-Impuestos)**
**Sin Apalancamiento (Unlevered):**
- IRR Unlevered
- MOIC Unlevered
- Base: EBITDA-FF&E vs Inversión total

**Con Apalancamiento (Levered):**
- **IRR Levered** ⭐ (métrica clave)
- **MOIC Levered** ⭐ (métrica clave)
- Base: Flujos netos al equity vs Equity invertido

**Resumen:**
- Equity invertido (t=0) total y por key
- Efecto del apalancamiento en retornos

##### **5. Análisis de Sensibilidad - Stress Test**
Heatmap multivariable mostrando cómo varía el **IRR Levered** según:
- Eje X: Crecimiento ADR anual (ej. -1% a +4%)
- Eje Y: Delta ocupación anual (ej. -1pp a +2pp)
- Código de colores: Verde (IRR alto) → Rojo (IRR bajo)

Se genera también análisis de sensibilidad del Cap Rate de salida.

**Propósito:** Entender la robustez del proyecto ante distintos escenarios.

##### **6. INSIGHTS DEL PROYECTO**
Resumen narrativo completo generado automáticamente que explica:
- Contexto del proyecto (ubicación, categoría, habitaciones)
- Inversión total y equity requerido
- Performance operativa (ingresos, GOP, EBITDA)
- Impacto de la financiación
- Valor de salida y retornos (IRR, MOIC)
- Análisis de robustez
- Nota metodológica (pre-impuestos, sin amortizaciones fiscales)

### **Qué debe hacer:**
1. Elegir el método de valoración (Cap Rate o Múltiplo)
2. Introducir el cap rate de salida (típicamente 6-9% para hoteles) o múltiplo
3. Definir los costes de transacción en la venta (típicamente 2-4%)
4. Hacer clic en "Calcular Valoración y Retornos"
5. Analizar todos los resultados:
   - ¿El valor de salida es razonable?
   - ¿El equity requerido es asumible?
   - ¿El IRR Levered es suficiente? (típicamente >12-15% objetivo)
   - ¿El MOIC Levered es atractivo? (típicamente >2.0x objetivo)
   - ¿El proyecto es robusto en el stress test?
6. Revisar los insights narrativos generados

### **Qué puede editar:**
- ✅ Formulario de valoración
- ❌ Todos los resultados (se calculan automáticamente)

### **Propósito:**
Este es el paso final y más crítico para inversores. Responde a las preguntas clave:
- **¿Cuánto dinero necesito poner?** → Equity requerido
- **¿Qué voy a ganar?** → IRR y MOIC
- **¿Es un buen deal?** → Comparar con hurdle rates del mercado
- **¿Qué tan arriesgado es?** → Análisis de sensibilidad

Los retornos se calculan PRE-IMPUESTOS porque:
- La fiscalidad varía según estructura (persona física, sociedad, REIT, etc.)
- No se incluyen amortizaciones fiscales del activo
- Facilita comparación entre proyectos

### **Acción final:**
Al hacer clic en "FINALIZAR PROYECTO", se:
1. Genera snapshot HTML completo (pasos 1-5)
2. Marca el proyecto como "finalized" tipo "inversión"
3. Permite descargar informe Word completo con todo el análisis

---

## FUNCIONALIDADES ADICIONALES

### **Trazabilidad de Ediciones**
El sistema registra **todos** los campos que se modifican manualmente vs el benchmark o cálculos automáticos:
- En Paso 1: Qué meses y campos comerciales se editaron
- En Paso 2: Qué meses y campos USALI se editaron
- En Paso 3: Qué años y campos de proyección se editaron

Estas ediciones se muestran en notas al pie cuando se visualiza el proyecto finalizado.

**Propósito:** Transparencia total sobre qué supuestos vienen del modelo y cuáles fueron ajustados manualmente.

### **Selector de Oportunidades**
Los proyectos finalizados aparecen en un dashboard con filtros:
- Segmento (Urbano/Vacacional)
- Categoría (2* a 5*)
- Tipo (Operador/Inversión)
- Rango de IRR (para proyectos de inversión)
- Fecha de creación
- Búsqueda por nombre

**Propósito:** Comparar múltiples oportunidades y tomar decisiones informadas.

---

## RESUMEN DE ESTADOS DEL PROYECTO

1. **draft:** Proyecto creado, sin datos guardados
2. **y1_commercial:** Paso 1 guardado
3. **y1_usali:** Paso 2 guardado
4. **projection_2n:** Paso 3 guardado
5. **finalized:** Proyecto completado (operador o inversión)

---

## MEJORES PRÁCTICAS

### **Para Operadores:**
- Ser realista con ocupaciones y ADR (no sobreestimar)
- Ajustar estacionalidad según experiencia en mercados similares
- Revisar que los fees del operador estén alineados con estándares de mercado
- Validar que el GOP margin sea coherente (típicamente 35-45% en hoteles bien gestionados)

### **Para Inversores:**
- Usar cap rates de salida conservadores (más altos = valoración más baja)
- No ser agresivo con crecimiento de ADR (típicamente 2-3% anual)
- Revisar que el LTV no supere niveles bancables (típicamente max 70%)
- Validar que el IRR objetivo sea superior al hurdle rate del fondo/inversor
- Analizar el stress test: ¿Qué pasa si ocupación es 2pp menor? ¿Y si ADR crece menos?
- Considerar exit timing: ¿Tiene sentido vender en año N?

---

## FLUJO RESUMIDO

```
INICIO
  ↓
Configuración Inicial → PASO 1 (Comercial Y1) → PASO 2 (USALI Y1) → PASO 3 (Proyección)
                                                                            ↓
                                                                       DECISIÓN
                                                                     /          \
                                                            OPERADOR          INVERSOR
                                                               ↓                  ↓
                                                          FINALIZAR      PASO 4 (Deuda)
                                                                              ↓
                                                                    PASO 5 (Valoración)
                                                                              ↓
                                                                         FINALIZAR
```

---

## DOCUMENTACIÓN COMPLEMENTARIA

Para más detalles técnicos sobre:
- Cálculos USALI: Ver backend `usaliService.js`
- Amortización de deuda: Ver backend `debtService.js`
- Valoración y retornos: Ver backend `valuationService.js`
- Interfaz de usuario: Ver frontend `Wizard.tsx`

---

**Versión:** 1.0
**Fecha:** Enero 2026
**Aplicación:** Hotel Screening - The Total Profit Journey
