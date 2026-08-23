# GLIDE — Estensione · Diritto di recesso al checkout

> Estende `glide-ext-pagamenti.md` (percorso `stripe`). Riferimento: artt. 52-59 Codice del Consumo.
> Non riscrive il checkout: aggiunge una checkbox obbligatoria al passaggio online. Il percorso `cash` non è toccato.

---

## 1. Il problema

Un consumatore che sottoscrive online ha **14 giorni di recesso pieno per legge**. Se il servizio parte subito (accesso immediato all'app) e il cliente recede dopo averlo usato, senza rinuncia esplicita il rimborso resta dovuto per intero. Serve raccogliere il consenso alla perdita del diritto **prima** del pagamento, non dopo.

## 2. Cosa aggiunge

Prima del redirect a Stripe Checkout: checkbox **non pre-flaggata**, CTA "Paga" disabilitata finché non è spuntata.

> "Richiedo l'esecuzione immediata del servizio e sono consapevole di perdere il diritto di recesso di 14 giorni una volta iniziato l'utilizzo (Art. 59, lett. a, Codice del Consumo)."

Testo esatto, non riformulare (stesso principio già usato per l'onboarding: copy fissato, non "migliorabile").

## 3. Tracciamento — è una prova, non un dettaglio UI

Stesso principio del consenso Art. 9 (ADR-007): va registrato con timestamp, scritto dal server.

```sql
alter table public.subscriptions
  add column withdrawal_waived_at     timestamptz,
  add column withdrawal_waiver_ip_hash text;
```

Valorizzato **solo lato server**, al momento della creazione della sessione Checkout — mai da un flag client.

## 4. Se la checkbox non è spuntata

Non si procede al pagamento immediato. Per un abbonamento SaaS la checkbox è l'unico percorso pratico: senza, niente accesso immediato.

## 5. Collaudo

- [ ] Checkbox non pre-flaggata; CTA disabilitata finché non spuntata
- [ ] `withdrawal_waived_at` valorizzato lato server, mai lato client
- [ ] Testo identico a §2
- [ ] Caso di test: utente che recede entro 14gg **senza** aver spuntato la checkbox → rimborso pieno dovuto
