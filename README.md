# centinela

Dashboard web que verifica si cada jugador de Guild Wars 2 del equipo juega **al menos 1 hora** (o su meta personal) en cada uno de sus **5 días laborales** por semana. Los 2 días de descanso son contiguos y varían por jugador. No hay compensación: cada día laboral se juzga por separado.

Sitio publicado: https://coco-ite.github.io/centinela/ (GitHub Pages, rama `main`).

## Cómo funciona

La API de GW2 (`/v2/account`) solo devuelve el **tiempo total acumulado** (`age`, en segundos), no sesiones ni minutos por día. Por eso el sistema toma "fotos" de ese número cada pocos minutos y calcula los minutos de un día así:

> minutos del día = `age` al final de ese día − `age` al final del día anterior (en la zona horaria del jugador)

Consecuencias que conviene recordar:

- Se necesitan fotos en dos días seguidos para calcular un día. El primer día de un jugador nuevo sale como "sin datos".
- `age` cuenta el tiempo con el juego abierto, incluido el tiempo AFK.
- Si el grabador deja de correr, no se pierde tiempo (el acumulado sigue subiendo), pero los minutos del hueco se asignan al día de la **primera foto nueva**. Los días alrededor del hueco quedan distorsionados; su suma sí es correcta.

## Piezas

```
cron-job.org ──(POST cada ~15 min)──> GitHub API (workflow_dispatch)
                                            │
                                            ▼
                         GitHub Actions: record.yml → record.mjs
                                            │  lee jugadores y claves (service key)
                                            │  consulta GW2 por cada jugador
                                            ▼
                                   Supabase (Postgres)
                                            ▲
                                            │  lee con sesión (anon key + RLS)
                              index.html (GitHub Pages)
```

| Archivo | Qué hace |
|---|---|
| `index.html` | Toda la app (HTML + CSS + JS en un archivo). Modo administrador (login con correo/contraseña de Supabase Auth) y modo jugador (login por PIN para ver sus propias horas). Interfaz ES/EN. |
| `record.mjs` | Lee los jugadores activos y sus claves de Supabase, consulta GW2 (con reintentos) y guarda un snapshot por jugador. No imprime nombres de cuenta ni tiempos: el repo es público y los logs de Actions también. |
| `.github/workflows/record.yml` | Ejecuta `record.mjs`. Solo tiene `workflow_dispatch`: **no** se programa solo, lo dispara cron-job.org. |

## Supabase

- Tablas principales: `players`, `player_keys`, `schedules`, `snapshots`. La app lee `daily_snapshots` (snapshots agregados por día) con paginación.
- `player_keys` tiene RLS activado y **sin política de lectura**: desde el navegador las claves son solo de escritura. Solo el grabador, con la service key, las lee.
- Funciones RPC usadas por la app: `player_login` y `admin_set_player_pin`.
- Zona horaria por jugador con nombres IANA (`America/Mexico_City`, `Europe/Paris`, …) para que el horario de verano se ajuste solo.
- `schedules` guarda el historial de horarios con fecha de vigencia; cada semana se juzga con el horario que tenía entonces.
- El esquema (tablas, políticas RLS y funciones) **no está versionado en este repo**. Ver "Pendientes".

## Secretos

En GitHub → Settings → Secrets and variables → Actions:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY` (clave `service_role`: nunca va en el código ni en la página)

La clave `anon` de Supabase que está en `index.html` es pública por diseño; sin sesión no da acceso a datos.

## Disparador (cron-job.org)

Trabajo "Centinela grabador": `POST https://api.github.com/repos/Coco-ite/centinela/actions/workflows/record.yml/dispatches`, cuerpo `{"ref":"main"}`, encabezados `Authorization: Bearer <token>`, `Accept: application/vnd.github+json` y `Content-Type: application/json`. El token es un fine-grained personal access token con permiso **Actions: Read and write** solo sobre este repo; se guarda únicamente en cron-job.org.

Se usa cron-job.org porque el programador gratuito de GitHub (`schedule`) es poco fiable (se salta disparos) y además GitHub lo apaga tras 60 días sin actividad en el repo.

## Si algo falla

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| cron-job.org marca **422** | El workflow está deshabilitado o `record.yml` ya no tiene `workflow_dispatch` | Actions → Grabar tiempo de juego → **Enable workflow**; revisar que `record.yml` conserve `workflow_dispatch:` |
| cron-job.org marca **401 / 403** | El token de GitHub caducó o perdió permisos | Crear otro token (Actions: Read and write, solo este repo) y actualizar el encabezado `Authorization` del trabajo |
| cron-job.org desactivó el trabajo | Demasiados fallos seguidos | Arreglar la causa y reactivar **después** de probar con *Run workflow* en GitHub |
| Workflow en verde pero un jugador sin fotos | Su clave no está o ya no es válida (`record.mjs` la salta sin fallar) | Volver a añadirlo desde Administración con una clave nueva |
| Días recientes en 0 en la app | Límite de filas de Supabase | Ver `daily_snapshots` y el límite "Max rows" en Project Settings → Data API |

Para comprobar que todos los jugadores se grabaron, en el SQL Editor de Supabase:

```sql
select p.friendly_name, max(s.captured_at) as ultima_foto
from snapshots s join players p on p.id = s.player_id
group by p.friendly_name order by ultima_foto desc;
```

## Pendientes

- Exportar el esquema de Supabase (tablas, RLS, funciones) a un `.sql` versionado en este repo.
- Subir las versiones de `actions/checkout` y `actions/setup-node` cuando GitHub retire Node 20 (hoy solo da un aviso).
- Cualquier commit reinicia el plazo de 60 días de GitHub; aun así `record.yml` ya no depende de `schedule`.
