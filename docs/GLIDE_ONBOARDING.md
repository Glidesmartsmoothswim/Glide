# GLIDE — Primo Accesso

Due cose in un file:
- **Parte A** — l'onboarding che vede il nuotatore (copy pronto)
- **Parte B** — la checklist di collaudo che usi tu

Voce: `GLIDE_VOICE.md`. Registro "tu", adulto, sobrio, zero emoji, zero "campione".

---

# PARTE A — Onboarding nuotatore

6 schermate. **Meno di due minuti.** Skippabile dalla terza in poi, ma la 2 no.

---

## 1 · Benvenuto

> ## Onda dopo onda.
>
> GLIDE è dove trovi i tuoi allenamenti, dove mi dici come stai, e dove vediamo insieme se stai
> migliorando davvero.
>
> Due minuti e sei dentro.
>
> — Alessio

---

## 2 · Il patto *(non skippabile)*

> ## Non è un esame.
>
> Prima di ogni seduta ti chiedo cinque cose. Come hai dormito, quanta energia hai, come sta il
> corpo, come stai di testa, quanta voglia hai.
>
> **Non esistono risposte giuste.** Nessuno ti giudica, nessuno ti dà un voto.
>
> Se scrivi che stai bene quando stai a pezzi, non stai ingannando me:
> **ti stai togliendo l'unico strumento che ho per allenarti come si deve.**
>
> Trenta secondi. La verità, com'è quel giorno.

**Questa schermata è la più importante di tutto il prodotto.**
Un Master mentirà per istinto — dirà che sta bene perché *vuole* la seduta dura. Se non gli spieghi
il patto **prima**, ogni dato che raccoglierai nei prossimi due anni sarà lievemente falso.
E un dato lievemente falso è peggio di nessun dato: sembra vero.

---

## 3 · Prima di entrare in acqua

> ## Cinque domande. Trenta secondi.
>
> **5 è sempre la risposta migliore.** Sempre. Su tutte e cinque.
> Non devi ricordarti quale scala va al contrario, perché non ce n'è nessuna.
>
> Sotto ogni numero c'è scritto cosa significa. Leggi e tappa.
>
> Se il corpo fa male, ti chiedo **dove**. Serve a capire se una cosa torna, o se è capitata una volta.

*(mini-anteprima interattiva: una scala vera, con le ancore visibili)*

---

## 4 · Dopo la seduta

> ## Due domande.
>
> **Quanto è stata dura.** Da 1 (passeggiata) a 10 (non avevo altro da dare).
> Non c'è un valore giusto: se una seduta facile ti sembra facile, ha funzionato.
>
> **Come stai adesso.**
>
> Su questa seconda ci tengo. Perché tra sei mesi voglio poterti dire una cosa che nessun cronometro
> ti dirà mai:
>
> *"Sei entrato in acqua 87 volte. 79 volte ne sei uscito meglio di come sei entrato."*
>
> Quello, per me, conta più di un record.

---

## 5 · Come funziona · e come **non** funziona

> **L'allenamento lo scrivo io.**
> GLIDE mi mostra i tuoi numeri. Le decisioni sul carico restano mie. Sempre. Nessun algoritmo
> ti alza o ti abbassa i metri.
>
> **GLIDE non è un medico.**
> Se hai dolore, lo segnalo a me. Se il dolore è forte o non passa, vai da un medico — non da un'app.
> Se senti qualcosa al petto, al respiro o alla testa: **fermati e chiama un medico.**
>
> **Il cronometro non è tutto.**
> A 50 anni i tempi rallentano. La tecnica, l'efficienza e la costanza no: quelle migliorano finché
> hai voglia di migliorarle. GLIDE misura anche quelle.

---

## 6 · Installa

> ## Mettila in tasca.
>
> **iPhone** → Condividi → *Aggiungi a Home*
> **Android** → menu ⋮ → *Installa app*
>
> Si apre come un'app normale. Funziona anche con poca rete.

---

# PARTE B — Collaudo (coach)

## B1 · Test del questionario — **prima di dare l'app a chiunque**

Il questionario è l'unica cosa che, se sbagliata, corrompe **tutti** i dati futuri in modo
irreversibile e invisibile. Si collauda per primo.

- [ ] Ogni scala mostra le **ancore agli estremi** senza dover tappare niente
- [ ] Tappando un valore, sotto compare **l'etichetta di quel valore**
- [ ] **Nessuna scala è invertita**: su tutte e cinque, 5 = la condizione migliore
- [ ] Nel codice **non esiste nessun `6 - x`**. Se c'è, la domanda è formulata male
- [ ] "Corpo" ≤ 3 → si apre **obbligatoriamente** la scelta della sede
- [ ] Chip **⚠︎ Petto / respiro / testa** → messaggio fisso + notifica a te. **L'AI non risponde**
- [ ] Nel post c'è **"E adesso come stai?"** — stessa scala dell'umore pre
- [ ] Il nuotatore **non vede da nessuna parte** il proprio indice di readiness
- [ ] Esistono **due indici separati** (fisica, mentale). Non esiste un totale unico

## B2 · Test dei due scenari — **il più importante di tutti**

Compila due check-in finti e verifica che il gestionale **li distingua**:

| | Sonno | Energia | Corpo | Umore | Motiv. | Cosa devi vedere |
|---|---|---|---|---|---|---|
| **A** — vita dura, corpo ok | 4 | 4 | 5 | **1** | **2** | *Fisica 4.3 · Mentale 1.5* → **non alleggerire** |
| **B** — corpo rotto, testa ok | 2 | 2 | **1** | 5 | 4 | *Fisica 1.7 · Mentale 4.5* → **alleggerisci** |

- [ ] I due casi **non** producono lo stesso valore
- [ ] Il caso A **non** genera nessun suggerimento di ridurre il carico

> Se A e B ti sembrano uguali sullo schermo, la media unica è ancora viva da qualche parte.
> Trovala e uccidila.

## B3 · Digest

- [ ] Arriva lunedì 07:00, solo a te
- [ ] Max 3 righe per sezione
- [ ] Ogni riga ha **un'azione a un tap**
- [ ] *Sta scivolando* riconosce il caso **readiness fisica buona + sedute saltate**
      → deve dire *motivazione*, non *stanchezza*
- [ ] Le bozze dei messaggi contengono osservazioni, **mai prescrizioni**

## B4 · Curva di efficienza

- [ ] Con meno di **6 punti validi** non mostra niente (non mostra una linea storta)
- [ ] Le sedute con `readiness_fisica < 3.5` sono **escluse** dal calcolo
- [ ] Non mostra mai la parola *"peggioramento"*

## B5 · I due tester

- [ ] Fai leggere la schermata **2 (il patto)** ad alta voce. Se ridono, il copy è sbagliato
- [ ] Dopo tre sedute, chiedi: *"la scala dell'energia, il 5 cosa vuol dire?"*
      → se qualcuno esita, le ancore non sono abbastanza visibili
- [ ] Chiedi: *"hai mai risposto meglio di come stavi davvero?"* — e credi alla risposta
