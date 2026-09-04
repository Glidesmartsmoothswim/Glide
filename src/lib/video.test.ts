import { test } from "node:test";
import assert from "node:assert/strict";

import {
  VIDEO_MAX_BYTES,
  VIDEO_MAX_MB,
  videoContentType,
  videoFileError,
  videoObjectError,
} from "./video";

const file = (name: string, size: number, type: string) => ({ name, size, type });

test("M-6: il limite è 500 MB", () => {
  assert.equal(VIDEO_MAX_MB, 500);
  assert.equal(VIDEO_MAX_BYTES, 524288000);
});

test("content-type: usa File.type se è un video", () => {
  assert.equal(videoContentType("gara.mp4", "video/mp4"), "video/mp4");
  assert.equal(videoContentType("gara.MOV", "VIDEO/QUICKTIME"), "video/quicktime");
});

test("content-type: fallback sull'estensione quando il browser non lo popola", () => {
  assert.equal(videoContentType("gara.mov", ""), "video/quicktime");
  assert.equal(videoContentType("gara.mkv", "application/octet-stream"), "video/x-matroska");
  assert.equal(videoContentType("gara.pdf", "application/pdf"), null);
  assert.equal(videoContentType("gara", ""), null);
});

test("file ok: sotto al limite e riconosciuto come video", () => {
  assert.equal(videoFileError(file("gara.mp4", 120 * 1024 * 1024, "video/mp4")), null);
  assert.equal(videoFileError(file("gara.mov", VIDEO_MAX_BYTES, "")), null);
});

test("file rifiutato: oltre 500 MB, formato non video, file vuoto", () => {
  const tooBig = videoFileError(file("gara.mp4", VIDEO_MAX_BYTES + 1, "video/mp4"));
  assert.match(tooBig ?? "", /500 MB/);
  assert.match(videoFileError(file("doc.pdf", 1000, "application/pdf")) ?? "", /Formato/);
  assert.match(videoFileError(file("gara.mp4", 0, "video/mp4")) ?? "", /vuoto/);
});

test("check server sui metadati Storage: stessa soglia, MIME reale", () => {
  assert.equal(videoObjectError({ size: 10, mimetype: "video/mp4" }), null);
  assert.match(
    videoObjectError({ size: VIDEO_MAX_BYTES + 1, mimetype: "video/mp4" }) ?? "",
    /500 MB/,
  );
  assert.match(
    videoObjectError({ size: 10, mimetype: "application/octet-stream" }) ?? "",
    /non è un video/,
  );
});
