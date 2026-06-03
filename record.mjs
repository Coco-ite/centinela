import { readFile, writeFile, mkdir } from "node:fs/promises";

const KEY = process.env.GW2_API_KEY;
if (!KEY) { console.error("Falta el secreto GW2_API_KEY"); process.exit(1); }

const res = await fetch("https://api.guildwars2.com/v2/account", {
  headers: { Authorization: `Bearer ${KEY}` },
});
if (!res.ok) { console.error("Error API:", res.status, await res.text()); process.exit(1); }
const acc = await res.json();

const path = "data/snapshots.json";
let snaps = [];
try { snaps = JSON.parse(await readFile(path, "utf8")); if (!Array.isArray(snaps)) snaps = []; } catch { snaps = []; }

snaps.push({ t: new Date().toISOString(), age: acc.age, name: acc.name });

await mkdir("data", { recursive: true });
await writeFile(path, JSON.stringify(snaps, null, 2));
console.log(`OK ${acc.name} total ${acc.age}s fotos ${snaps.length}`);
