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

## 4. Cambios en comisiones (a decidir)

Las comisiones actuales ($35/$15 por sesión, $12/$5 mensual) estaban pensadas para
una Oreja que acompaña y cobra por la empresa. Con consultas propias y precio
negociado hay que decidir:
- ¿LyCard cobra una **comisión sobre el acuerdo** (porcentaje) o un monto fijo?
- ¿La captación sigue pagando distinto si la Oreja trajo al N0 o lo asignó la empresa?
- ¿El pago de la Oreja lo hace el N0 directo o pasa por LyCard?

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

## 7. Preguntas para Gunnar

1. ¿Matrícula obligatoria para recibir el WowJob Oreja?
2. ¿Quién cobra y cuánto retiene LyCard (§4)?
3. ¿El N0 puede leer las notas de sesión o solo ve horas y tema?
4. ¿El tema por defecto es "Impuesto de la soledad" o lo elige cada acuerdo?
5. ¿Un N0 puede tener acuerdos con más de una Oreja?
6. ¿Qué pasa con las horas no usadas del mes (se pierden, se acumulan)?
