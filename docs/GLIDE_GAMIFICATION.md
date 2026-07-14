# GLIDE — Sistema di Motivazione

> Non "gamification". **Motivazione.** La differenza non è semantica: la gamification aggiunge
> un gioco sopra l'allenamento. Qui invece rendiamo **visibile un miglioramento che esiste già
> ma che il cronometro non sa mostrare.**
>
> Vincoli obbligatori: `GLIDE_ADR.md` → ADR-005.

---

## 1. Il problema vero

Il tuo nuotatore ha 54 anni. Nuota da otto. È in forma.

E nei prossimi tre anni **i suoi tempi non miglioreranno più.** Farà PB nei 100 SL forse una volta,
per caso, in una giornata buona. Poi mai più.

Se l'unica cosa che GLIDE gli mostra è il cronometro, GLIDE gli sta dicendo ogni settimana:
*stai peggiorando.* E lui disdice — non perché l'app non funziona, ma perché funziona benissimo
a raccontargli una storia deprimente.

**Il plateau non è un problema di prodotto. È IL problema di prodotto.**

Chi risolve il plateau tiene il Master a vita. Nessuno lo sta risolvendo, perché tutti misurano
la stessa cosa: quanto vai veloce.

---

## 2. La risposta: misurare l'efficienza, non il tempo

Ci sono cose che un uomo di 55 anni **può migliorare all'infinito**, e non hanno niente a che
fare con la velocità.

### 2.1 Il passo a parità di sforzo (`pace @ RPE`)

La metrica più potente che hai — e **ce l'hai già nel database.**

Novembre: `8x100 @1'40"` → RPE riportato **6**
Febbraio: `8x100 @1'40"` → RPE riportato **4**

**Stesso passo. Meno fatica. È diventato più forte.** Il cronometro non ha visto niente.
GLIDE sì.

Questo è progresso reale, fisiologico, non consolatorio. E si calcola da due campi che raccogli
già oggi: il passo prescritto nella shorthand (`@1'40"`) e l'RPE del post-readiness.

> **Onestà tecnica:** l'RPE è soggettivo e rumoroso. Mai mostrarlo settimana su settimana.
> Solo trend a **8 settimane**, minimo 6 sedute nella stessa fascia di zona. Sotto quella soglia,
> non si mostra niente. Un dato rumoroso spacciato per progresso è peggio di nessun dato.

### 2.2 Le bracciate per vasca

Da 18 a 15 bracciate sui 25m è **tecnica pura**, e si migliora a qualsiasi età. Anzi: a 55 anni
si migliora *meglio*, perché hai la sensibilità in acqua che un ventenne non ha.

Non serve hardware. Serve che il coach marchi una serie come *"conta le bracciate"* e il nuotatore
inserisca **un numero**. Costo di implementazione: un campo. Valore: enorme.

### 2.3 Il controllo del passo

Tenere il passo costante su 8x100 — o chiudere in negative split — è la firma del nuotatore maturo.
La maggior parte dei Master parte forte e muore. Imparare a non farlo è un'abilità **conquistabile**,
misurabile, e non dipende dall'età.

### 2.4 La disciplina di zona

Quasi nessun Master sa fare Z2 davvero in Z2. La trasformano in Z3 perché "andare piano sembra
inutile". Eseguire la prescrizione **come è scritta** è una competenza atletica vera — ed è il cuore
del protocollo Franceschi.

Segnale: RPE dentro la banda attesa per la zona prescritta. Fuori banda = non ha eseguito, ha
improvvisato. Questo è dato prezioso per te, e insegnamento per lui.

### 2.5 La qualità del recupero

Dopo una seduta Z5, quanto ci mette la readiness a tornare alla baseline? Da 72 ore a 36 ore è
**adattamento**. È il segnale più puro di forma che esista, e premia il **riposo**, non la grinta.

---

## 3. L'Onda (sostituisce lo streak)

Lo streak è vietato (ADR-005 §2). Al suo posto, la meccanica che il tuo brand ha già:

> **Onda dopo onda.**

**Come funziona**
- Media mobile esponenziale dell'aderenza su 4 settimane.
- Ogni seduta completata la fa salire. Il tempo la fa scendere.
- **Non si rompe mai.** Salti una settimana, l'onda cala. Torni, risale.
- **Non ha uno stato rosso.** Onda bassa = *"acqua calma"*, non *"hai fallito"*.

```
onda(t) = onda(t-1) · 0.75  +  sedute_completate / sedute_previste · 25
clamp 0–100
```

**Perché è meglio dello streak**
Lo streak ha un solo stato positivo e un burrone. L'onda ha un gradiente. Nessuna ansia,
nessuna colpa, nessun incentivo ad allenarsi infortunato per "non perdere la serie".
E quando torni dopo un mese fermo, l'app non ti dice *"streak perso: 0"* — ti dice
*"l'acqua è calma. Ricominciamo."*

---

## 4. Il Glide Score

**Mai la performance.** Non "mai solo la performance" come dice la Bible: **mai, punto.**
Un indice che scende perché invecchi è una macchina per disdette.

### Le 5 dimensioni (0–100)

| Dimensione | Peso | Cosa misura davvero |
|---|---|---|
| **Costanza** | 25 | Sedute completate / previste (rolling 4 sett.) |
| **Continuità** | 20 | L'Onda |
| **Qualità** | 20 | Disciplina di zona: RPE dentro la banda prescritta |
| **Aderenza** | 20 | Check-in pre/post, video, feedback al coach |
| **Miglioramento** | 15 | Trend curva di efficienza (§2.1, §2.2) |

Tutte e cinque sono **migliorabili a 60 anni**. Tutte sono **auto-riferite**: mai un confronto
con un altro nuotatore.

### Regole di comportamento

- **Si muove lentamente**: max ±3 punti a settimana. Un punteggio che crolla per un'influenza è
  un punteggio di cui nessuno si fida.
- **Si congela in Pausa**: infortunio o malattia → il punteggio si ferma. Mai punire chi si cura.
- **Si salva sempre con `algo_version`.** La formula evolverà; lo storico deve restare leggibile.
  Senza questo, il giorno che ritocchi i pesi fai scendere il punteggio a gente che non ha sbagliato
  niente — e la fiducia non torna più.

---

## 5. I badge

### Il difetto della lista attuale

**"Prima Bracciata" per esserti iscritto è un premio di partecipazione.** Un adulto lo riconosce
in mezzo secondo, e da quel momento **tutti gli altri badge valgono zero.** Un badge che prendono
tutti non è un badge: è un adesivo.

### Riscritti — ognuno va guadagnato

| Badge | Come si prende | Tipo |
|---|---|---|
| **Prima Bracciata** | Primo ciclo **completo**: readiness pre → seduta → readiness post | auto |
| **Prime Onde** | 4 settimane consecutive di aderenza ≥ 75% | auto |
| **Acqua Calma** | La readiness torna a baseline entro 36h dopo una Z5 — **premia il recupero, non la grinta** | auto |
| **Metronomo** | Passo costante entro ±3% su una serie lunga. Controllo, non velocità | auto |
| **Tecnico** | Bracciate/vasca ridotte in modo stabile su 8 settimane | auto |
| **Costruttore** | 12 settimane di volume prescritto tollerato senza cali di readiness | auto |
| **Capitano** | Il nuotatore che tiene su gli altri nel Canale Open | **conferito** |
| **Onda dopo Onda** | 6 mesi senza un mese intero fermo | auto |
| **Occhio in Acqua** | Il coach vede un salto tecnico nel video | **conferito** |

**"Instancabile" l'ho eliminato.** Qualunque criterio gli dai, premia il nuotare tanto — e in
un'app di allenamento questo è un incentivo all'infortunio. Non ci sta un badge che dice a un
54enne *"resisti".*

### La regola d'oro: i badge migliori li dai tu

| | Chi assegna | Prestigio |
|---|---|---|
| **Automatici** | l'algoritmo — costanza, aderenza | ordinario |
| **Conferiti** | **Alessio** — tecnica, crescita, spirito | **raro** |

Un badge dato dall'algoritmo è un fatto. Un badge dato **dal coach che ti ha guardato il video**
è un giudizio umano — e in un ambiente saturo di automazione, il giudizio umano è la merce rara.

**Nessun competitor con un'app generica può fare questo.** A te costa un tap.

---

## 6. Le identità (Bible: Esploratore, Costante, Tecnico, Competitore, Mentore)

**Non è una classe che scegli. È uno specchio che il sistema ti mette davanti.**

Dopo 8 settimane di dati, GLIDE non ti dà punti: ti dice **chi sei**.

> *"Sei un Costante. Non salti. Non è la cosa più appariscente. È la più rara."*

Questa è la forma di motivazione più profonda che esista, ed è anche la meno invasiva: non ti sta
chiedendo di fare niente. Ti sta **riconoscendo**. Un adulto non vuole punti; vuole essere visto
per quello che è già.

L'identità **non ha classifica, non ha livelli, non ha upgrade.** Può cambiare nel tempo. Nessuna
è migliore delle altre.

---

## 7. Le missioni

Vietata: *"nuota 5 volte questa settimana"* — premia il volume, viola l'ADR-005 §1.

Ammessa: **una missione che ti rende un nuotatore migliore, allineata alla prescrizione.**

- *"Questa settimana tieni la Z2 sotto RPE 4. Tutte e tre le sedute."* → insegna la disciplina di zona
- *"Conta le bracciate sull'ultima serie. Ogni volta."* → costruisce consapevolezza tecnica
- *"Chiudi gli 8x100 con l'ultimo più veloce del primo."* → insegna il passo

Una alla settimana. Mai di più. **La missione non aggiunge lavoro: cambia il modo di farlo.**

---

# 8. Il Digest settimanale del Coach

> **Se costruisci una cosa sola di questo documento, costruisci questa.**
> Zero UI di gioco, zero XP, e ottieni il grosso dell'effetto retention — usando l'unica leva
> che nessuno può copiarti: **il fatto che tu abbia notato.**

**Quando:** lunedì mattina, 07:00. Coach only.
**Regola di ferro:** ogni riga ha **un'azione a un tap.** Un digest senza azioni è un'altra
dashboard da ignorare.

---

### § DA GUARDARE — max 3
Anomalie che richiedono il tuo occhio.

- Fatica ≥ 4 per 3+ giorni consecutivi
- Dolore segnalato 2+ volte nella stessa zona corporea
- RPE fuori banda rispetto alla zona prescritta → **sta forzando le sedute facili**
- Readiness che non torna a baseline dopo una Z5

→ *tap: apri la scheda nuotatore*

---

### § DA CELEBRARE — max 3
Il cuore del sistema.

- *"Marco: 6 settimane senza saltare."*
- *"Giulia: stesso passo di novembre, RPE sceso da 6 a 4."*
- *"Fabio: bracciate da 18 a 16 sui 25."*

→ *tap: manda il messaggio* (bozza già scritta, tu la ritocchi e invii)

**Non mandare un badge. Manda una riga tua.**

> *"Marco, sei settimane senza saltare una seduta. Si vede in acqua."*

Vale cento trofei di pixel. Ti costa un tap. E rinforza esattamente ciò che nessun competitor può
replicare: **il rapporto**. Così la gamification **alimenta** la relazione invece di sostituirla.

---

### § STA SCIVOLANDO — max 3
Chi disdirà tra sei settimane, se nessuno fa niente.

- Onda in calo da 3 settimane
- Nessun check-in da 10 giorni
- **Readiness buona ma sedute saltate** → questo non è stanchezza. È **motivazione.**
  E richiede una telefonata, non un carico più leggero.

Quest'ultimo segnale è la cosa più intelligente di tutto GLIDE, e nessun'altra app può calcolarlo:
serve **incrociare readiness e aderenza**, cioè avere sia i dati fisici che l'esecuzione.
Tu hai entrambi.

→ *tap: scrivi al nuotatore*

---

### § I NUMERI
Volume aggregato · distribuzione zone · quanti Open hanno aperto la pubblicazione della settimana.

---

## 9. Cosa costruire, in che ordine

| Fase | Cosa | Perché |
|---|---|---|
| **Ora** | `events` ledger (ADR-003) | senza, in V2 non ricostruisci niente |
| **V1.5** | **Digest coach** | 70% dell'effetto retention, zero UI di gioco |
| **V1.5** | Curva di efficienza `pace @ RPE` | dati già tuoi, zero costo, risolve il plateau |
| **V2** | Onda + Glide Score (versionato) | serve storico eventi |
| **V2** | Badge — prima i **conferiti**, poi gli automatici | i conferiti danno valore agli automatici |
| **V2.5** | Identità, missioni | richiedono 8+ settimane di dati per non essere finte |

**Le medaglie vengono per ultime.** Prima viene il fatto che tu abbia notato.
