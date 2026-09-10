#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

/**
 * GLIDE — controllo delle licenze dell'albero delle dipendenze.
 *
 * Blocca (exit 1) se compare copyleft forte o una licenza "source available":
 * GPL, AGPL, SSPL, BUSL, OSL, CPAL, EUPL. Segnala (senza bloccare) il copyleft
 * debole o a livello di file — LGPL, MPL, CDDL, EPL — e i pacchetti senza
 * campo license, che vanno verificati a mano.
 *
 * Va eseguito DOPO `npm ci`: legge i package.json dentro node_modules, non il
 * lockfile, perché lockfileVersion 3 non riporta la licenza in modo affidabile.
 *
 * Uso:
 *   node scripts/check-licenses.mjs
 *   node scripts/check-licenses.mjs --report docs/legal/licenze-dipendenze.txt
 */

import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

const ROOT = "node_modules";

// Copyleft forte / network copyleft / source-available: blocca la build.
const DENY = /(?<![A-Z])(A?GPL)-|(?<![A-Z])GPL$|\bSSPL\b|\bBUSL\b|\bOSL-|\bCPAL-|\bEUPL/i;
// Copyleft debole o per singolo file: da conoscere e documentare nel NOTICE.
const WARN = /\bLGPL|\bMPL-|\bCDDL|\bEPL-|\bCC-BY(?!-SA)|\bCC-BY-SA|\bPython-2\.0/i;

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function licenseOf(pkg) {
  if (typeof pkg.license === "string") return pkg.license;
  if (pkg.license && typeof pkg.license.type === "string") return pkg.license.type;
  if (Array.isArray(pkg.licenses)) {
    return pkg.licenses.map((l) => (typeof l === "string" ? l : l.type)).join(" OR ");
  }
  return null;
}

/** Percorre node_modules gestendo scope (@org/name) e nesting. */
function walk(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (!e.isDirectory() && !e.isSymbolicLink()) continue;
    if (e.name === ".bin" || e.name === ".cache") continue;

    const full = join(dir, e.name);
    if (e.name.startsWith("@")) {
      walk(full, out);
      continue;
    }
    const pkg = readJson(join(full, "package.json"));
    if (pkg && pkg.name) {
      const key = `${pkg.name}@${pkg.version ?? "?"}`;
      if (!out.has(key)) out.set(key, licenseOf(pkg));
    }
    const nested = join(full, "node_modules");
    if (existsSync(nested)) walk(nested, out);
  }
  return out;
}

if (!existsSync(ROOT)) {
  console.error(`node_modules non trovato: esegui prima "npm ci".`);
  process.exit(2);
}

const packages = walk(ROOT, new Map());
const denied = [];
const warned = [];
const unknown = [];
const counts = new Map();

for (const [name, lic] of [...packages].sort(([a], [b]) => a.localeCompare(b))) {
  const label = lic ?? "(nessun campo license)";
  counts.set(label, (counts.get(label) ?? 0) + 1);
  if (!lic) unknown.push(name);
  else if (DENY.test(lic)) denied.push([name, lic]);
  else if (WARN.test(lic)) warned.push([name, lic]);
}

const lines = [];
lines.push("GLIDE — LICENZE DELL'ALBERO DELLE DIPENDENZE");
lines.push(`Generato il ${new Date().toISOString().slice(0, 10)} · ${packages.size} pacchetti`);
lines.push("");
lines.push("== DISTRIBUZIONE ==");
for (const [lic, n] of [...counts].sort((a, b) => b[1] - a[1])) {
  lines.push(`${String(n).padStart(5)}  ${lic}`);
}
lines.push("");
lines.push("== COPYLEFT DEBOLE / ATTRIBUZIONE (da tenere allineato al NOTICE) ==");
if (warned.length === 0) lines.push("  nessuno");
for (const [name, lic] of warned) lines.push(`  ${lic.padEnd(38)} ${name}`);
lines.push("");
lines.push("== SENZA CAMPO LICENSE (da verificare a mano) ==");
if (unknown.length === 0) lines.push("  nessuno");
for (const name of unknown) lines.push(`  ${name}`);
lines.push("");
lines.push("== COPYLEFT FORTE / SOURCE-AVAILABLE (bloccante) ==");
if (denied.length === 0) lines.push("  nessuno");
for (const [name, lic] of denied) lines.push(`  ${lic.padEnd(38)} ${name}`);

const report = lines.join("\n") + "\n";

const flag = process.argv.indexOf("--report");
if (flag !== -1 && process.argv[flag + 1]) {
  const dest = process.argv[flag + 1];
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, report, "utf8");
  console.log(`Report scritto in ${dest}`);
}

console.log(report);

if (denied.length > 0) {
  console.error(
    `\nBLOCCO: ${denied.length} pacchetti sotto copyleft forte o licenza source-available.` +
      `\nNon aggiornare il lockfile finché non è stato deciso come procedere.`
  );
  process.exit(1);
}
if (warned.length > 0 || unknown.length > 0) {
  console.log(
    `\nNessun blocco. Da controllare: ${warned.length} copyleft debole, ${unknown.length} senza licenza.` +
      `\nSe l'elenco è cambiato rispetto al NOTICE, aggiorna il NOTICE §2.4.`
  );
}
