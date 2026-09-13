// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

/**
 * Compressione dei video gara lato client, prima del caricamento.
 *
 * PERCHÉ ESISTE. Lo Storage sul piano Free si ferma a 50 MB e il tetto non è
 * alzabile (migration_053). Un video di gara girato col telefono supera
 * quella soglia con facilità: senza compressione l'unica risposta possibile
 * sarebbe «troppo grande, arrangiati», che per un nuotatore a bordo vasca non
 * è una risposta. Qui si prova a farcelo stare.
 *
 * COME. Nessuna dipendenza nuova: il video si riproduce in un <video>
 * nascosto, ogni fotogramma si ridisegna su un <canvas> più piccolo, e
 * `MediaRecorder` registra il canvas a un bitrate calcolato sulla durata.
 * Sono API native del browser.
 *
 * I DUE COSTI, entrambi dichiarati all'utente:
 *  1. È in TEMPO REALE. Comprimere due minuti di gara richiede due minuti:
 *     si ridisegna mentre il video scorre, non si può andare più veloci.
 *  2. L'AUDIO SI PERDE. `captureStream` su un canvas cattura solo immagini.
 *     Per un'analisi tecnica il rumore del bordo vasca non serve, e toglierlo
 *     libera banda per i fotogrammi — ma va detto, non lasciato scoprire.
 *
 * FALLISCE MORBIDO, SEMPRE. Se il browser non supporta MediaRecorder, se il
 * codec manca, se la registrazione va storta: si torna il file ORIGINALE e
 * decide il chiamante. Una compressione che fallisce non deve mai impedire un
 * caricamento che sarebbe comunque passato.
 */

import { VIDEO_MAX_BYTES, videoMb } from "./video";

/** Lato lungo massimo del video compresso. 720p è più che sufficiente per
 *  vedere una bracciata; oltre si spende banda in dettaglio inutile. */
const MAX_LATO_LUNGO = 1280;

/** Margine sotto il tetto: si punta al 90%, non al 100%. Il muxer aggiunge
 *  overhead e il bitrate è un obiettivo, non una garanzia. */
const MARGINE = 0.9;

/** Limiti di sanità per il bitrate calcolato (bit al secondo). */
const BITRATE_MIN = 400_000;
const BITRATE_MAX = 6_000_000;

export type EsitoCompressione = {
  /** Il file da caricare: compresso se è servito ed è riuscito, altrimenti l'originale. */
  file: File;
  /** true se il file è stato davvero ricompresso. */
  compresso: boolean;
  /** Dimensione di partenza, per poterlo raccontare all'utente. */
  bytesOriginali: number;
  /** Perché non si è compresso, quando `compresso` è false e serviva farlo. */
  motivo?: string;
};

/** I formati che proviamo, in ordine di preferenza. */
const FORMATI = [
  { mime: "video/mp4", ext: "mp4" },
  { mime: "video/webm;codecs=vp9", ext: "webm" },
  { mime: "video/webm;codecs=vp8", ext: "webm" },
  { mime: "video/webm", ext: "webm" },
];

function formatoSupportato(): { mime: string; ext: string } | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const f of FORMATI)
    if (MediaRecorder.isTypeSupported(f.mime)) return f;
  return null;
}

/** true se il browser ha tutto il necessario. Usato anche dalla UI per
 *  decidere se promettere la compressione o tacere. */
export function compressioneDisponibile(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    typeof HTMLCanvasElement !== "undefined" &&
    typeof HTMLCanvasElement.prototype.captureStream === "function" &&
    formatoSupportato() !== null
  );
}

/** Carica i metadati del file in un <video> e restituisce l'elemento pronto. */
function apriVideo(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.playsInline = true;
    v.src = url;
    v.onloadedmetadata = () => resolve(v);
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Il browser non riesce a leggere questo video."));
    };
  });
}

/**
 * Comprime `file` se supera `limite`. Non tocca un file già abbastanza
 * piccolo: ricomprimerlo perderebbe qualità senza guadagnare niente.
 *
 * `onProgress` riceve 0→1 e serve a non lasciare l'utente davanti a una
 * barra ferma per minuti.
 */
export async function comprimiVideo(
  file: File,
  opts: { limite?: number; onProgress?: (frazione: number) => void } = {},
): Promise<EsitoCompressione> {
  const limite = opts.limite ?? VIDEO_MAX_BYTES;
  const bytesOriginali = file.size;

  if (file.size <= limite)
    return { file, compresso: false, bytesOriginali };

  const formato = formatoSupportato();
  if (!formato)
    return {
      file,
      compresso: false,
      bytesOriginali,
      motivo: "Questo browser non sa comprimere i video.",
    };

  let video: HTMLVideoElement;
  try {
    video = await apriVideo(file);
  } catch (e) {
    return {
      file,
      compresso: false,
      bytesOriginali,
      motivo: e instanceof Error ? e.message : "Video illeggibile.",
    };
  }

  const url = video.src;
  try {
    const durata = video.duration;
    if (!Number.isFinite(durata) || durata <= 0)
      return {
        file,
        compresso: false,
        bytesOriginali,
        motivo: "Durata del video non leggibile.",
      };

    // Scala mantenendo le proporzioni. Le dimensioni pari evitano artefatti
    // con i codec che campionano la crominanza a blocchi di 2×2.
    const scala = Math.min(
      1,
      MAX_LATO_LUNGO / Math.max(video.videoWidth, video.videoHeight),
    );
    const w = Math.max(2, Math.round((video.videoWidth * scala) / 2) * 2);
    const h = Math.max(2, Math.round((video.videoHeight * scala) / 2) * 2);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx)
      return {
        file,
        compresso: false,
        bytesOriginali,
        motivo: "Canvas non disponibile.",
      };

    // Il bitrate esce dal budget, non da un numero a caso: quanti bit al
    // secondo posso spendere per stare sotto il limite con questa durata.
    const bitrate = Math.min(
      BITRATE_MAX,
      Math.max(BITRATE_MIN, Math.floor((limite * MARGINE * 8) / durata)),
    );

    const stream = canvas.captureStream(30);
    const rec = new MediaRecorder(stream, {
      mimeType: formato.mime,
      videoBitsPerSecond: bitrate,
    });
    const pezzi: Blob[] = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) pezzi.push(e.data);
    };

    const finito = new Promise<void>((resolve, reject) => {
      rec.onstop = () => resolve();
      rec.onerror = () => reject(new Error("Registrazione interrotta."));
    });

    rec.start(1000);
    await video.play();

    let raf = 0;
    const disegna = () => {
      if (video.ended || video.paused) return;
      ctx.drawImage(video, 0, 0, w, h);
      opts.onProgress?.(Math.min(1, video.currentTime / durata));
      raf = requestAnimationFrame(disegna);
    };
    disegna();

    await new Promise<void>((resolve) => {
      video.onended = () => resolve();
    });
    cancelAnimationFrame(raf);
    rec.stop();
    await finito;
    opts.onProgress?.(1);

    const blob = new Blob(pezzi, { type: formato.mime.split(";")[0] });
    if (blob.size === 0)
      return {
        file,
        compresso: false,
        bytesOriginali,
        motivo: "La compressione non ha prodotto nulla.",
      };

    // Se la compressione ha peggiorato le cose — può succedere su un file già
    // ottimizzato — si tiene l'originale. Non si carica il peggiore dei due.
    if (blob.size >= file.size)
      return {
        file,
        compresso: false,
        bytesOriginali,
        motivo: "Il video è già compresso al meglio.",
      };

    const base = file.name.replace(/\.[^.]+$/, "");
    const compresso = new File([blob], `${base}.${formato.ext}`, {
      type: formato.mime.split(";")[0],
      lastModified: Date.now(),
    });
    return { file: compresso, compresso: true, bytesOriginali };
  } catch (e) {
    return {
      file,
      compresso: false,
      bytesOriginali,
      motivo: e instanceof Error ? e.message : "Compressione fallita.",
    };
  } finally {
    video.pause();
    URL.revokeObjectURL(url);
  }
}

/**
 * Il messaggio da mostrare quando, dopo tutto, il file non ci sta.
 *
 * Dice tre cose in quest'ordine: quanto pesa, quanto può pesare, e che cosa
 * può FARE chi legge. Un limite senza una via d'uscita è solo un muro.
 */
export function messaggioTroppoGrande(esito: EsitoCompressione): string {
  const ora = videoMb(esito.file.size);
  const tetto = Math.round(VIDEO_MAX_BYTES / (1024 * 1024));

  if (esito.compresso)
    return (
      `Anche dopo la compressione il video pesa ${ora} MB, e il limite è ${tetto} MB. ` +
      `Ritaglia la parte che conta — di solito bastano la partenza, una vasca e l'arrivo — ` +
      `oppure rigiralo a risoluzione più bassa dalle impostazioni della fotocamera.`
    );

  const perche = esito.motivo ? ` (${esito.motivo})` : "";
  return (
    `Il video pesa ${ora} MB e il limite è ${tetto} MB${perche}. ` +
    `Ritaglia la parte che conta, oppure rigiralo a risoluzione più bassa ` +
    `dalle impostazioni della fotocamera.`
  );
}
