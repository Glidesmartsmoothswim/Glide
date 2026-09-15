// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  availableCountByType,
  deadlineLabel,
  emptyTokenCount,
  tokenTypeForService,
  tokenUsageLabel,
} from "./tokens";

test("tokenTypeForService — ogni servizio ha il suo saldo, e non si scambiano", () => {
  assert.equal(tokenTypeForService("pool_60"), "private_lesson");
  assert.equal(tokenTypeForService("pool_30"), "private_lesson");
  assert.equal(tokenTypeForService("group_45"), "group_lesson");
  assert.equal(tokenTypeForService("call_30"), "call");
  assert.equal(tokenTypeForService("call_60"), "call");
  // Un codice ignoto ricade sulla lezione privata, come prima dei tipi.
  assert.equal(tokenTypeForService("qualcosa_di_nuovo"), "private_lesson");
});

test("emptyTokenCount — i tre saldi partono da zero, call compresa", () => {
  assert.deepEqual(emptyTokenCount(), {
    private_lesson: 0,
    group_lesson: 0,
    call: 0,
  });
});

test("availableCountByType — i check-in non gonfiano il saldo delle lezioni", () => {
  const tokens = [
    { redeemable_for: "call" as const, redeemed_at: null, expires_at: null },
    { redeemable_for: "call" as const, redeemed_at: null, expires_at: null },
    {
      redeemable_for: "call" as const,
      redeemed_at: "2026-09-12T09:00:00Z",
      expires_at: null,
    },
    {
      redeemable_for: "private_lesson" as const,
      redeemed_at: null,
      expires_at: null,
    },
  ];
  assert.deepEqual(availableCountByType(tokens), {
    private_lesson: 1,
    group_lesson: 0,
    call: 2,
  });
});

const ORA = Date.parse("2026-09-15T10:00:00Z");

test("tokenUsageLabel — dice il giorno della lezione, non quello del riscatto", () => {
  // Il caso vero: token preso l'11/09 prenotando, lezione nuotata il 12/09.
  // Prima si leggeva «Usato il 11/09» e i conti non tornavano a nessuno.
  assert.equal(
    tokenUsageLabel(
      {
        redeemed_at: "2026-09-11T08:29:24Z",
        expires_at: null,
        lessonStartsAt: "2026-09-12T09:00:00Z",
      },
      ORA,
    ),
    "Usato per la lezione di sab 12/09",
  );
});

test("tokenUsageLabel — una lezione da fare è impegnata, non spesa", () => {
  assert.equal(
    tokenUsageLabel(
      {
        redeemed_at: "2026-09-13T08:39:31Z",
        expires_at: null,
        lessonStartsAt: "2026-09-19T09:00:00Z",
      },
      ORA,
    ),
    "Impegnato per la lezione di sab 19/09",
  );
});

test("tokenUsageLabel — senza prenotazione agganciata resta la data del riscatto", () => {
  assert.equal(
    tokenUsageLabel(
      { redeemed_at: "2026-09-05T07:45:00Z", expires_at: null, lessonStartsAt: null },
      ORA,
    ),
    "Usato il sab 05/09",
  );
  assert.equal(
    tokenUsageLabel({ redeemed_at: null, expires_at: "2026-09-01T00:00:00Z" }, ORA),
    "Scaduto",
  );
});

test("deadlineLabel — i check-in di stagione dicono entro quando", () => {
  const stagione = [
    { redeemed_at: null, expires_at: "2027-07-01T00:00:00Z" },
    { redeemed_at: null, expires_at: "2027-07-01T00:00:00Z" },
  ];
  assert.equal(deadlineLabel(stagione, ORA), "Da usare entro il 1 luglio 2027.");
});

test("deadlineLabel — vince la scadenza più vicina", () => {
  const misti = [
    { redeemed_at: null, expires_at: "2027-07-01T00:00:00Z" },
    { redeemed_at: null, expires_at: "2026-12-31T00:00:00Z" },
  ];
  assert.equal(deadlineLabel(misti, ORA), "Da usare entro il 31 dicembre 2026.");
});

test("deadlineLabel — se anche uno solo non scade, nessuna data inventata", () => {
  assert.equal(
    deadlineLabel(
      [
        { redeemed_at: null, expires_at: "2027-07-01T00:00:00Z" },
        { redeemed_at: null, expires_at: null },
      ],
      ORA,
    ),
    null,
  );
  // I riscattati non contano: la scadenza parla di quelli che restano.
  assert.equal(
    deadlineLabel([{ redeemed_at: "2026-09-01T00:00:00Z", expires_at: null }], ORA),
    null,
  );
});
