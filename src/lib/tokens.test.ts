// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  availableCountByType,
  emptyTokenCount,
  tokenTypeForService,
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
