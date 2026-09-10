#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

/**
 * GLIDE — applica l'intestazione di copyright ai file sorgente tracciati da git.
 *
 * Uso:
 *   node scripts/add-license-headers.mjs           # applica
 *   node scripts/add-license-headers.mjs --dry-run # mostra cosa farebbe
 *
 * Idempotente: un file che riporta già l'identificativo di licenza nelle prime
 * righe viene saltato. Tocca solo i file tracciati da git: mai node_modules.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { extname, basename } from "node:path";

const YEAR = "2026";
const HOLDER = "Alessio Coppola";
const SPDX_ID = "LicenseRef-GLIDE-Proprietary";

const HEADER_LINES = [
  `SPDX-License-Identifier: ${SPDX_ID}`,
  `Copyright (c) ${YEAR} ${HOLDER}. Tutti i diritti riservati.`,
  `Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per`,
  `l'addestramento di sistemi di intelligenza artificiale sono vietati`,
  `senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.`,
];

// Stile di commento per estensione. Le estensioni non elencate sono ignorate.
const STYLE_BY_EXT = {
  ".ts": "slash",
  ".tsx": "slash",
  ".js": "slash",
  ".jsx": "slash",
  ".mjs": "slash",
  ".cjs": "slash",
  ".mts": "slash",
  ".cts": "slash",
  ".css": "cblock",
  ".sql": "dash",
  ".sh": "hash",
  ".bash": "hash",
  ".svg": "xml",
};

// File da non toccare mai, anche se hanno un'estensione gestita.
const SKIP_BASENAMES = new Set(["next-env.d.ts"]);
const SKIP_PATH_PREFIXES = ["public/fonts/", "public/icons/"];

// File di terzi: asset lasciati da `create-next-app` (i loghi Next.js e Vercel
// sono marchi altrui). Non sono nostri: non vanno intestati né pretesi.
const SKIP_PATHS = new Set([
  "public/file.svg",
  "public/globe.svg",
  "public/next.svg",
  "public/vercel.svg",
  "public/window.svg",
]);

const DRY_RUN = process.argv.includes("--dry-run");

function renderHeader(style) {
  switch (style) {
    case "slash":
      return HEADER_LINES.map((l) => `// ${l}`).join("\n") + "\n";
    case "dash":
      return HEADER_LINES.map((l) => `-- ${l}`).join("\n") + "\n";
    case "hash":
      return HEADER_LINES.map((l) => `# ${l}`).join("\n") + "\n";
    case "cblock":
      return "/*\n" + HEADER_LINES.map((l) => ` * ${l}`).join("\n") + "\n */\n";
    case "xml":
      return "<!--\n" + HEADER_LINES.map((l) => `  ${l}`).join("\n") + "\n-->\n";
    default:
      throw new Error(`stile sconosciuto: ${style}`);
  }
}

/**
 * Restituisce l'indice del carattere dopo il quale inserire l'intestazione.
 *
 * Va inserita DOPO shebang, direttive React ("use client" / "use server") e
 * dichiarazione XML. Le direttive React devono restare la prima istruzione del
 * file: i commenti prima sarebbero tollerati dal compilatore, ma metterli dopo
 * elimina ogni rischio con bundler e strumenti di analisi.
 */
function insertionPoint(content, style) {
  let idx = 0;

  const consumeLineIf = (test) => {
    const rest = content.slice(idx);
    const nl = rest.indexOf("\n");
    const line = (nl === -1 ? rest : rest.slice(0, nl)).trim();
    if (line === "") {
      // riga vuota: la salta solo se dopo c'è qualcosa da consumare
      return false;
    }
    if (test(line)) {
      idx += nl === -1 ? rest.length : nl + 1;
      return true;
    }
    return false;
  };

  if (style === "slash" || style === "hash") {
    consumeLineIf((l) => l.startsWith("#!"));
  }
  if (style === "slash") {
    consumeLineIf((l) => /^["'](use client|use server|use strict)["'];?$/.test(l));
  }
  if (style === "xml") {
    consumeLineIf((l) => l.startsWith("<?xml"));
  }
  return idx;
}

function listTrackedFiles() {
  const out = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" });
  return out.split("\0").filter(Boolean);
}

function main() {
  let added = 0;
  let skipped = 0;
  let ignored = 0;

  for (const file of listTrackedFiles()) {
    const style = STYLE_BY_EXT[extname(file)];
    if (!style) {
      ignored++;
      continue;
    }
    if (SKIP_BASENAMES.has(basename(file))) {
      ignored++;
      continue;
    }
    if (SKIP_PATH_PREFIXES.some((p) => file.startsWith(p))) {
      ignored++;
      continue;
    }
    if (SKIP_PATHS.has(file)) {
      ignored++;
      continue;
    }

    let content;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      ignored++;
      continue;
    }

    // Stessa finestra usata da check-license-headers.mjs: solo le prime righe.
    // Cercare in tutto il file darebbe falsi positivi su questi stessi script,
    // che la stringa SPDX la contengono come dato.
    const head = content.split("\n").slice(0, 15).join("\n");
    if (head.includes("SPDX-License-Identifier")) {
      skipped++;
      continue;
    }

    const at = insertionPoint(content, style);
    const header = renderHeader(style);
    // Normalizza le righe vuote in eccesso subito dopo il punto di inserimento,
    // così l'intestazione non lascia buchi che eslint segnalerebbe.
    const rest = content.slice(at).replace(/^\n+/, "");
    const next = content.slice(0, at) + header + (rest ? "\n" + rest : "");

    if (!DRY_RUN) writeFileSync(file, next, "utf8");
    console.log(`${DRY_RUN ? "[dry-run] " : ""}+ ${file}`);
    added++;
  }

  console.log(
    `\nIntestazioni aggiunte: ${added} · già presenti: ${skipped} · non gestiti: ${ignored}`
  );
  if (DRY_RUN && added > 0) {
    console.log("Nessun file modificato (--dry-run).");
  }
}

main();
