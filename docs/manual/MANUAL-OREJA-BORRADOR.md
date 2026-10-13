# Manual de la Oreja (BORRADOR)

Estado: borrador v0, 2026-10-13. Escrito desde el código y los flujos reales de
LyCard v1.103.x. Las partes marcadas **[verificar]** están sin confirmar con
Gunnar o sin probar en pantalla. Lo simulado está marcado como tal.

## 1. Qué es una Oreja

Una Oreja es la persona que acompaña a un Lead desde que se anota a la
Masterclass hasta que es cliente: lo toma, agenda su entrevista 1:1, le asigna
una puerta de acceso, registra sus sesiones y cobra comisión por eso.
Trabaja dentro de **un Programa** y solo ve lo de ese Programa.

## 2. Cómo entrar

1. Tu N0 (o el MasterN0) te tiene que dar el rol. Antes, vos tenés que haber
   entrado una vez con Google a la app.
2. Entrá a `/empleados/login` y tocá **Continuar con Google**, con la misma
   cuenta con la que te dieron el rol.
3. Llegás al **Panel de Empleados** (`/empleados`).

Si te manda a otra pantalla o no te deja entrar: todavía no tenés el rol de
Oreja en ese Programa. Pedíselo a tu N0.

No hay contraseña. Se entra solo con Google.

## 3. Mapa del panel

De arriba hacia abajo:

| Sección | Para qué sirve |
|---|---|
| **Tu propia Membresía** | Darte de alta como Member con tus 3 Cards, para conseguir tus propios clientes |
| **Comando** | Resumen de tu actividad: comisiones, leads, entrevistas, clientes |
| **Bolsa de Leads** | Tomar leads, seguir su estado, agendar la entrevista, chatear |
| **Miembros** | Tus clientes: asignar puerta, marcar pago, registrar sesiones, BizToCard |

## 4. Paso a paso

### 4.1 Tu propia Membresía (una sola vez)
1. Abrí **Tu propia Membresía**.
2. Poné tu nombre (obligatorio), WhatsApp y email (opcionales).
3. Tocá **Crear mi Membresía**. Se crean tus 3 Cards (proyecto, empresa, personal).
4. Para administrarla entrás aparte, con Google, a `/m/login`. Es una sesión
   distinta de tu sesión de Oreja.

### 4.2 Comando
Seis números, todos de datos reales tuyos:
- **Comisiones acumuladas**: suma de lo calculado por tus sesiones. Es un
  acumulado, **no un pago**: hoy no hay cobro real.
- **Leads libres en la bolsa**, **Mis leads**, **Entrevistas agendadas**,
  **Clientes cerrados**, **Clientes pagados**.

### 4.3 Bolsa de Leads
Un Lead es alguien que se anotó a la Masterclass y todavía no es Miembro activo.

1. **Tomar un lead**: elegí uno libre y tocá tomarlo. Pasa a **Mis leads** y
   desaparece de la bolsa para las demás Orejas.
2. **Color del lead** (estado real, no un puntaje inventado): verde, amarillo,
   rojo o "asistió", según su asistencia a la Masterclass y si reagendó.
   **[verificar]** el significado exacto de cada color con Gunnar.
3. **Marcar asistencia a la Masterclass**: a mano, no hay integración con
   Zoom/Meet todavía.
4. **Agendar la entrevista 1:1**: solo con un lead en verde. La agendás vos
   directo con el lead desde acá; **no** pasa por la tarjeta pública (ahí solo
   se agenda la Masterclass).
5. **Chat**: conversación interna con el lead. Solo funciona si el lead ya es
   un Member real del Programa. **[verificar]** qué pasa si todavía no lo es.

### 4.4 Miembros: cerrar y acompañar
1. **Agregar Miembro**: nombre + WhatsApp. Queda activo con sus 3 Cards.
2. **Asignar puerta** (la oferta):
   - **Un tap**: tocá la puerta (Empezar, Armar, Emprendedor, Constructor,
     Arquitecto, Pyme, Pyme+, Programa). Se asigna con el precio de referencia
     y la primera forma de pago permitida.
   - **A medida**: el formulario de abajo, con precio, forma de pago y
     "quién lo trajo" (empresa u oreja). Ese último dato define tu comisión.
3. **Marcar como pagada**: a mano. No hay pasarela de pago real.
4. **Registrar sesión**: notas libres, numeradas en orden. Cada sesión calcula
   su comisión y la suma al acumulado del cliente.
5. **BizToCard**: link "BizToCard: tarjeta personal →". Es el cuestionario guiado
   que hacés EN VIVO con el cliente para armar su tarjeta personal (hoy:
   Niveles 1 y 2, 6 preguntas). Cada respuesta se guarda directo en su Card.
   Podés saltar una con "Prefiero no responder ahora".

## 5. Comisiones (montos informados por Gunnar)

| Situación | Por sesión de 45 min | Mensual (suscripción $100) |
|---|---|---|
| Vos trajiste al lead | $35 USD | $12 USD |
| Te lo asignó la empresa | $15 USD | $5 USD |

Sin puerta asignada, la comisión es $0. Lo mensual cubre 15 min de revisión de
los "indicadores de estrés" del cliente. **[verificar]** si el mensual ya se
calcula solo o es manual.

## 6. Lo que es demo o simulado
- Comisiones: cálculo, no pago.
- Pagos y asistencia: marcados a mano.
- Gemelo Digital del cliente: chat guiado de demostración, no IA entrenada.
- Nada de esto está validado para producción real: lo revisan Sergio y Fabricio.

## 7. Problemas comunes
- **No veo el panel**: no tenés el rol, o entraste con otra cuenta de Google.
- **No aparece un Miembro en las listas**: solo ves los de tu Programa.
- **No puedo agendar la entrevista**: el lead tiene que estar en verde.

## 8. Pendientes del manual
- Capturas de pantalla de cada sección.
- Confirmar los **[verificar]** con Gunnar.
- Versión corta de una página para capacitación.
- Manuales de Member, N0 de Programa y MasterN0.
