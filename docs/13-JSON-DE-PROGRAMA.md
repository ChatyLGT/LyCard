# Cargar un Programa completo con un .json (v1.106.0)

Dónde: `/admin/programs` → "Subir Programa completo (.json)". Cada Programa tiene
además "Importar / exportar Programa (.json)" y el botón **Exportar** (descarga el
Programa tal como está, para editarlo y volver a subirlo).

## Cómo se usa (3 pasos)

1. Elegí el archivo `.json` o pegá el texto.
2. **Validar**: no guarda nada. Muestra qué se va a crear o cambiar, y qué se
   descartó y por qué. Si hay errores, dice cuál y dónde.
3. **Importar** (solo se habilita después de validar sin errores, y solo MasterN0):
   aplica todo o nada. Cada importación queda guardada como una versión nueva.

## Reglas

- **Clave ausente = no se toca. Clave presente = reemplaza ese campo entero.**
- Lo que existe en el Programa y no viene en el JSON (puestos, tarjetas) **se conserva**.
- Importar el mismo archivo dos veces no duplica nada: el Programa se identifica por
  `slug` y cada tarjeta por su `slug`.
- Un Programa nuevo necesita `program.origin` (slug del Programa del que deriva).
  La única raíz es Legacy; si todavía no hay Programas, el primero se crea como raíz.
- Los links (logo, retratos, íconos, medios) tienen que ser `https` o una ruta propia
  que empiece con `/`. Las imágenes no viajan dentro del JSON.
- Máximo 256 KB, 500 tarjetas, 60 puestos, 30 niveles por escala.
- `meta` es un bloque libre (hasta 8 KB) que se guarda con cada versión.
- El N0 de un Programa puede exportar y validar **el suyo**, no importar.
- Una tarjeta con `ownerEmail` queda con dueño pendiente: pasa a ser de esa persona
  la primera vez que entra con Google con ese email. Si ya tiene dueño, el JSON no
  lo reasigna (da error).

## Esquema `lycard.program/1`

```
{
  "schema": "lycard.program/1",
  "meta": { ... libre ... },
  "program": {
    "name", "slug", "origin", "logoUrl", "cardAppName", "primaryColor" (#RRGGBB),
    "social": { "wa","ig","li","x","fb","tiktok","yt","web" },
    "vaultTitle", "vaultPalabraSecreta",
    "cardLabels", "medalScale", "rankScale", "contactsScale",
    "officeSkills", "motivationalPhrases", "podiumButtons",
    "modalBlocks", "modalIcons", "tierIntros"
  },
  "puestos": [ { "siglas", "denominacion", "descripcion", "icono", "order" } ],
  "cards": [ {
    "slug", "name", "title", "quote", "kind" (project|company|personal),
    "siglas", "tooltip", "storyQuote", "storyBody",
    "medal", "rank", "contacts"  (claves de las escalas del Programa),
    "puesto" (siglas de un puesto), "ownerEmail",
    "wa","ig","li","x","fb","tiktok","yt","web","email","location",
    "islandLabel", "oficinaObjetivo", "defaultTheme" (dark|light), "defaultLang" (es|en),
    "logoUrl", "portraitUrl"
  } ]
}
```

Cada nivel de `medalScale` / `rankScale` / `contactsScale`:
`{ key, nombre, subtitulo, icono (Material Symbol), color, descripcion }`.
Una tarjeta nueva sin `medal`/`rank`/`contacts` arranca en el primer nivel de la escala.

Ejemplo completo: `docs/ejemplos/legacy.program.json`.

## Fuera de v1

Subir imágenes y skins, membresías, roles, y restaurar una versión anterior desde la
pantalla (la versión guarda el JSON original y el estado previo, listo para eso).
