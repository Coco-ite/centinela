# AGENTS.md — centinela

Instrucciones para cualquier agente de IA (OpenCode, Copilot, Gemini CLI, Claude Code, etc.) que trabaje en este repo. La documentación completa del proyecto está en `README.md`: léelo antes de cambiar algo.

## Sobre el dueño

- Marcos es principiante en programación. Explica en español, paso a paso, con comandos exactos para copiar y pegar.
- **Pregunta antes de cambiar archivos, hacer commits o push.** Propón el cambio primero.
- Un cambio por vez. Nada de varios commits "fix:" seguidos deshaciendo el anterior: si algo falla dos veces, detente y explica.

## Qué es

Dashboard estático (GitHub Pages) que mide si cada jugador de Guild Wars 2 juega su meta diaria en sus 5 días laborales. Un grabador en GitHub Actions guarda "fotos" del tiempo acumulado (`age` de la API de GW2) en Supabase.

| Archivo | Qué hace |
|---|---|
| `index.html` | Toda la app en un archivo (HTML + CSS + JS, interfaz ES/EN). Usa `supabase-js` con la clave **anon**. |
| `record.mjs` | Grabador en Node: lee jugadores y claves con la **service key**, consulta GW2 y guarda snapshots. |
| `.github/workflows/record.yml` | Ejecuta `record.mjs`. Solo `workflow_dispatch`: lo dispara cron-job.org cada ~15 min. |

No hay build, dependencias de npm ni tests. Para probar `index.html`, ábrelo en el navegador o sirve la carpeta con `python -m http.server`.

## Reglas que no se rompen

1. **El repo es público** y los logs de Actions también. Nunca imprimas en `record.mjs` nombres de cuenta, claves de GW2 ni minutos por jugador; solo conteos agregados.
2. **La service key (`SUPABASE_SERVICE_KEY`) nunca va en el código ni en `index.html`.** Vive solo en GitHub → Settings → Secrets. La clave `anon` en `index.html` sí es pública por diseño.
3. **`record.yml` debe conservar `workflow_dispatch:`.** Si se quita, cron-job.org falla con 422. No agregues `schedule:`.
4. **`player_keys` no tiene política de lectura (RLS).** No agregues una: las claves de GW2 deben ser solo de escritura desde el navegador.
5. El esquema de Supabase (tablas, RLS, funciones `player_login` y `admin_set_player_pin`, vista `daily_snapshots`) **no está en el repo**. No inventes columnas: pregunta o pide que se revise en el panel de Supabase.
6. Las fechas se calculan en la zona horaria IANA de cada jugador. No uses la hora local del navegador para decidir a qué día pertenece una foto.

## Al terminar un cambio

- Si cambia cómo funciona algo, actualiza `README.md` en el mismo commit.
- Mensajes de commit en español, en imperativo y que describan el cambio (ej. "Agregar filtro por semana").
