import { readFile, writeFile, mkdir } from "node:fs/promises";

const KEY = process.env.GW2_API_KEY;
if (!KEY) { console.error("Falta el secreto GW2_API_KEY"); process.exit(1); }

async function getAccount() {
  let last;
  for (let i = 1; i <= 4; i++) {
    try {
      const res = await fetch("https://api.guildwars2.com/v2/account", { headers: { Authorization: `Bearer ${KEY}` } });
      if (res.ok) return await res.json();
      last = "HTTP " + res.status;
    } catch (e) { last = String(e); }
    console.log(`Intento ${i} falló (${last}); reintento...`);
    await new Promise(r => setTimeout(r, 4000 * i));
  }
  throw new Error("La API no respondió tras varios intentos: " + last);
}

const acc = await getAccount();
const path = "data/snapshots.json";
let snaps = [];
try { snaps = JSON.parse(await readFile(path, "utf8")); if (!Array.isArray(snaps)) snaps = []; } catch { snaps = []; }
snaps.push({ t: new Date().toISOString(), age: acc.age, name: acc.name });
await mkdir("data", { recursive: true });
await writeFile(path, JSON.stringify(snaps, null, 2));
console.log(`OK ${acc.name} total ${acc.age}s fotos ${snaps.length}`);
