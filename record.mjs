const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SB_URL || !SB_KEY) { console.error("Faltan SUPABASE_URL / SUPABASE_SERVICE_KEY"); process.exit(1); }

const H = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

async function gw2(key) {
  for (let i = 1; i <= 4; i++) {
    try {
      const r = await fetch("https://api.guildwars2.com/v2/account", { headers: { Authorization: `Bearer ${key}` } });
      if (r.ok) return await r.json();
    } catch {}
    await new Promise(s => setTimeout(s, 3000 * i));
  }
  return null;
}

const res = await fetch(`${SB_URL}/rest/v1/players?active=eq.true&select=id,player_keys(api_key)`, { headers: H });
const players = await res.json();
if (!Array.isArray(players)) { console.error("Error leyendo jugadores:", players); process.exit(1); }

let ok = 0, fail = 0;
for (const p of players) {
  const kr = Array.isArray(p.player_keys) ? p.player_keys[0] : p.player_keys;
  const key = kr?.api_key;
  if (!key) { console.log(`Jugador ${p.id}: sin clave, salto`); continue; }
  const acc = await gw2(key);
  if (!acc) { console.log(`Jugador ${p.id}: la API no respondio`); fail++; continue; }
  await fetch(`${SB_URL}/rest/v1/snapshots`, { method: "POST", headers: H, body: JSON.stringify({ player_id: p.id, age_seconds: acc.age }) });
  await fetch(`${SB_URL}/rest/v1/players?id=eq.${p.id}`, { method: "PATCH", headers: H, body: JSON.stringify({ account_name: acc.name }) });
  console.log(`${acc.name}: ${acc.age}s`);
  ok++;
}
console.log(`Listo. OK=${ok} fallos=${fail} de ${players.length}`);
