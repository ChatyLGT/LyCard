# La Oreja como psicólogo: diseño propuesto (sin código)

Fecha: 2026-10-14. Estado: **PROPUESTA, pendiente de aprobación de Gunnar.** Reemplaza
la idea anterior de "concierge". No se construye nada hasta aprobar.

## 1. La idea (palabras de Gunnar)

- Las Orejas son **psicólogos reales**.
- Acompañan a los N0 en el **impuesto de la soledad** del emprendedor o dueño de pyme.
- Cada psicólogo tiene **su propia consulta** y puede apoyarse en **su ejército de
  agentes y expertos** (WowHeads) para su estudio.
- Dentro de su consulta puede destinar un **tiempo prepago mensual** a atender ese
  tema, u otro puntual.
- **Cada N0 ve y negocia** ese acuerdo con su Oreja, caso por caso.

## 2. Qué existe hoy y qué falta

| Pieza | Hoy |
|---|---|
| WowJob "Oreja" (leads, entrevistas, puerta, sesiones, BizToCard) | Existe |
| Bitácora de sesiones con notas libres | Existe |
| Comisión por sesión y mensual fija ($35/$15, $12/$5) | Existe, pero es el modelo viejo |
| WowHeads (agentes y expertos que la Oreja puede contratar) | Existe, sin vínculo a la consulta |
| **Perfil de consulta de la Oreja** (especialidad, matrícula, tarifa) | **No existe** |
| **Pack de tiempo prepago mensual** con tema | **No existe** |
| **Negociación N0 ↔ Oreja** (propuesta, contrapropuesta, acuerdo) | **No existe** |
| **Consumo de horas** al registrar sesión | **No existe** |
| Recordatorios y cola de pendientes del mes | **No existe** |
| Cobro real | **No existe** (todo es cálculo) |

## 3. Piezas propuestas

1. **Consulta de la Oreja** (`OrejaConsulta`): nombre profesional, especialidad,
   matrícula o licencia, tarifa de referencia por hora, descripción. Visible para
   los N0 del Programa.
2. **Acuerdo mensual** (`AcuerdoOreja`): entre un N0 y su Oreja. Tema (por defecto
   "Impuesto de la soledad", editable), horas por mes, precio mensual acordado, estado
   (propuesto, contrapropuesto, vigente, pausado, terminado). Lo propone cualquiera
   de las dos partes y el otro acepta o contrapropone. Queda el historial.
3. **Horas del mes** (`HorasMes`): saldo prepago por acuerdo y por mes. Cada sesión
   registrada descuenta del saldo. Alerta cuando queda poco o no se usó.
4. **Cola del mes** para la Oreja: sus N0 con acuerdo vigente, horas usadas y
   pendientes, y quién no tuvo contacto este mes.
5. **Apoyo con WowHeads**: la Oreja asocia agentes y expertos a su consulta. Hoy la
   asociación es solo organizativa (no hay IA entrenada real todavía).
6. **Vista del N0**: ve a su Oreja, el acuerdo vigente, las horas y puede proponer
   cambios. Vive en su Oficina Virtual, junto a WowHeads.

## 4. Acuerdos de Gunnar (2026-10-14)

### Metodología en tres etapas
1. **Entendimiento** (dura un mes, empieza por el N0): información, memorias, proceso
   mental y pilares; creación del Códice, el pilar 360 y los tres primeros niveles de la
   escalera fractal (N0, N1, N2); herramientas de "carbono" (escaneo y scraping de su
   información y redes); llenado de un WLM con memoria y estructura de pensamiento.
2. **Oficina y equipo:** diseño, creación y parametrización de la Oficina Virtual y del
   equipo de trabajo. Si la empresa es grande o el proyecto complejo, sube la tarifa.
3. **Pruebas, ajustes y modificaciones.**

### Quién hace cada etapa y cuándo se paga (aclaración del 2026-10-14)
- Las etapas 2 y 3 **no las hace la Oreja**: las hacen consultores de negocio y de TI
  (junior y senior), también en sesiones. La metodología de la etapa 2 todavía no está
  planeada y se va a discutir aparte con el protocolo de excelencia.
- La Oreja **participa en el setup y está pendiente** de él, como parte de su pago mensual.
- El N0 paga **$500 el mes 1** (setup) y **$100 por mes desde el mes 2**. Por eso la
  mensualidad de la Oreja ($12 o $5) **empieza en el mes 2**.

### Sesiones de la etapa 1 (10 en total)
Masterclass (grupal, la da un Sherpa) + 8 sesiones de onboarding 1 a 1 con la Oreja +
entrega del Códice (la hace un Sherpa, que además verifica y da el visto bueno).
El **Sherpa** es un psicólogo senior: da la Masterclass y hace la doble verificación del
Códice. Todo se paga del **setup de $500** del N0.

### Pagos (modelo cerrado)
- **Oreja:** $15 por cada sesión de onboarding efectivamente hecha, trajera o no al lead.
- **Bono de captación:** $120, una sola vez, si la Oreja trajo al lead. Se libera cuando
  el N0 **paga sus $500**.
- **Sherpa:** cobra **por cada N0 registrado gracias a su Masterclass**. El doble que la Oreja por sesión: $30 por la Masterclass y $30 por la
  verificación del Códice ($60 por N0). Monto sujeto a ajuste cuando Gunnar defina el real.
- **Mensualidad** (suscripción de $100): $12 si la Oreja trajo al lead, $5 si lo asignó
  la empresa. Sin cambios.
- **Abandono:** el N0 ya pagó, así que se paga por hora efectivamente hecha. Lo no hecho
  no se paga. Las sesiones se acumulan y se liquidan al cerrar el caso (entrega del
  Códice o abandono).

| | Oreja trajo al lead | Lo asignó la empresa |
|---|---|---|
| Oreja (8 × $15) | $120 | $120 |
| Bono de captación | $120 | $0 |
| Sherpa (2 × $30) | $60 | $60 |
| Total pagado | $300 | $180 |
| Margen de LyCard sobre $500 | 40% | 64% |

### Nomenclatura interna (puede cambiar si se vuelve comercial)
- **Oreja:** acompaña al N0 en la etapa 1 (entendimiento, psicólogo).
- **Hayuko:** la contraparte de la Oreja en la etapa 2 (Oficina Virtual y equipo).
  Nombre inventado por Gunnar el 2026-10-14, interno.
- **Padawan, Mutant, Superhuman, Sherpa** (y Seeker, Ancient): niveles de la escalera de
  Sabiduría (`RANKS` en `lib/data.ts`, hoy con nombres Curioso, Aprendiz, Practicante,
  Maestro, Sherpa, Ancient). "Sherpa para arriba" significa nivel Sherpa o Ancient.

### Escaneo de redes (carbono)
- Etapa personal: lo hace la **Oreja**.
- Etapa de negocio: lo hace el **"Hayuko"** (pendiente de aclarar qué es).
- Pendiente: consentimiento expreso del N0 antes de escanear.

### Qué hace la Oreja durante el setup
Solo se define que **acompaña**. El detalle se define al discutir la etapa 2.

### Cómo circula el dinero
Todo movimiento es interno, en tokens propios del ecosistema que luego se convierten en
dinero por on-ramp y off-ramp, mediante fideicomiso. **Hoy todo es cálculo en dólares,
simulado.** No hay código de tokens, on-ramp ni fideicomiso: es actividad financiera
regulada y la definen Sergio, Fabricio y asesoría legal.

### Diferencias con el código actual (a corregir cuando se construya)
- Hoy se suma $35 o $15 en cada sesión registrada, y $12 o $5 en cada registro de un
  cliente con suscripción. Debe pasar a: $15 fijo por sesión hecha, bono de $120 al pago
  del setup, y liquidación al cierre del caso.
- No existe el concepto de Sherpa en las comisiones.

### Pendiente de definir
- Etapas 2 y 3: de dónde sale la tarifa de los consultores (si está dentro de los $500 o
  es aparte) y cómo cobran. Se discute aparte.
- Escaneo de redes: qué es el "Hayuko" y el consentimiento expreso del N0.
- Qué es "acompañar" en el setup y cómo se registra para cobrar la mensualidad (etapa 2).
- Servicios que la Oreja recomienda (expertos de Legacy o propios) y cómo se pagan.

## 5. Riesgos que no se pueden saltear

- **Ejercicio profesional.** Un psicólogo real necesita licencia o matrícula
  habilitante en su país. Hay que verificarla antes de dar el WowJob y mostrar el
  dato al N0. La plataforma no debe presentar a nadie sin habilitación como psicólogo.
- **Datos sensibles.** Notas de sesión, estados emocionales e "indicadores de estrés"
  son datos de salud. Hoy las notas son texto libre sin cifrado ni consentimiento
  explícito. Antes de usarlo con personas reales hace falta: consentimiento
  informado, cifrado, control de quién ve qué (el N0 no debería leer las notas
  clínicas de la Oreja) y política de retención.
- **Alcance del servicio.** Si los agentes IA asisten a la Oreja, no deben atender al
  N0 directamente en temas clínicos ni dar diagnósticos.
- **Revisión legal.** Todo lo anterior lo revisan Sergio y Fabricio, y un abogado con
  experiencia en salud, antes de producción real.

Todo esto es fase de estructura con datos de prueba, como el resto del repo.

## 6. Plan por fases (cada una con su PR y su E2E)

1. **Consulta de la Oreja** y su vista para el N0.
2. **Acuerdo mensual** con propuesta y contrapropuesta.
3. **Horas del mes**, consumo al registrar sesión y cola del mes.
4. **Vínculo con WowHeads** de la consulta.
5. **Comisiones nuevas**, cuando Gunnar defina el modelo (§4).

Lo clínico (cifrado, consentimiento, privacidad de notas) se diseña antes de la fase 3.

## 7. Preguntas para Gunnar (las de dinero ya están cerradas en §4)

1. ¿Matrícula obligatoria para recibir el WowJob Oreja?
2. ¿El N0 puede leer las notas de sesión o solo ve horas y tema?
3. ¿Un N0 puede tener acuerdos con más de una Oreja?
4. ¿Qué pasa con las horas no usadas del mes (se pierden, se acumulan)?
5. Los puntos de "Pendiente de definir" de §4.
