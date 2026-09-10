# Baseline di titolarità — procedura

Scopo: poter dimostrare, in qualunque momento futuro, **cosa esisteva e a
quale data**. Il diritto d'autore sul software nasce con la creazione e non
richiede alcun deposito; quello che manca, in una controversia, non è il
diritto ma la **prova della data certa**.

Il `git log` da solo non basta: le date dei commit sono liberamente
modificabili (`GIT_AUTHOR_DATE`), quindi una controparte può contestarle. La
marca temporale qualificata no.

---

## 1. Generare il manifest

```bash
./scripts/baseline-manifest.sh
```

Lo script rifiuta di procedere se ci sono modifiche non committate, poi
produce in `baseline/AAAA-MM-GG/`:

| File              | Contenuto                                              |
| ----------------- | ------------------------------------------------------ |
| `MANIFEST.txt`    | intestazione + elenco ordinato dei file, con SHA-256 di ciascuno |
| `MANIFEST.sha256` | impronta complessiva del manifest                      |

Il manifest è **deterministico**: stesso commit, stesso hash, su qualsiasi
macchina. È questa riproducibilità a renderlo una prova utilizzabile — un
terzo può rifare il conto e verificare.

Subito dopo, fissa il punto anche in git:

```bash
git tag -a baseline-2026-09-10 -m "Baseline di titolarità 2026-09-10"
git push origin baseline-2026-09-10
```

---

## 2. Applicare la marca temporale

Si marca **solo `MANIFEST.txt`** (pochi KB), non l'intero repository:
l'impronta dei singoli file è già dentro il manifest, quindi marcare il
manifest equivale a marcare tutto.

### Opzione A — Marca temporale qualificata (consigliata)

Un time stamp qualificato ai sensi del Regolamento eIDAS gode di
**presunzione di accuratezza della data e di integrità del documento**
(art. 41). È l'opzione con il valore probatorio più alto in rapporto al
costo, ed è ripetibile a ogni release.

Si acquista a lotti da un prestatore di servizi fiduciari qualificato
italiano (Aruba, InfoCert, Namirial e altri iscritti all'elenco AgID). Il
costo è nell'ordine di pochi centesimi a marca.

Con la utility del fornitore, oppure via OpenSSL contro il loro endpoint
RFC 3161:

```bash
cd baseline/2026-09-10

# 1. richiesta di marcatura sull'impronta del manifest
openssl ts -query -data MANIFEST.txt -sha256 -cert -out MANIFEST.tsq

# 2. invio al servizio del fornitore (URL e credenziali dal tuo contratto)
curl -s -H "Content-Type: application/timestamp-query" \
     --data-binary @MANIFEST.tsq \
     -u "UTENTE:PASSWORD" \
     "https://URL-DEL-SERVIZIO-TSA" \
     -o MANIFEST.tsr

# 3. verifica immediata (non rimandarla: una marca non verificata è carta)
openssl ts -reply -in MANIFEST.tsr -text | head -20
openssl ts -verify -data MANIFEST.txt -in MANIFEST.tsr \
     -CAfile catena-tsa.pem
```

Conserva `MANIFEST.txt`, `MANIFEST.tsr` e il certificato della TSA
(`catena-tsa.pem`): senza la catena, tra qualche anno, la verifica non è
più eseguibile.

### Opzione B — Registro SIAE per i programmi per elaboratore

Registrazione nel Registro Pubblico Speciale per i programmi per elaboratore
tenuto dalla SIAE. Ha natura **dichiarativa**, non costitutiva: crea una
presunzione relativa di titolarità, superabile con prova contraria. Costa
molto più di una marca temporale e ha una procedura più lenta, ma è un
riferimento riconoscibile e ha un peso pratico nelle trattative e nelle
diffide, dove conta anche l'apparenza di serietà.

Ha senso farla **una volta**, su una versione stabile e significativa —
tipicamente alla prima release commerciale — e affiancarla alle marche
temporali, non sostituirla ad esse. Verifica sul sito SIAE modulistica e
importi aggiornati prima di procedere.

### Opzione C — PEC a sé stessi

Invio di `MANIFEST.txt` a una propria casella PEC. Costo zero se hai già la
PEC, valore probatorio più debole ma non nullo: la ricevuta di consegna ha
riferimento temporale opponibile. Va bene come rete di sicurezza
immediata, in attesa di attivare la A. Non come soluzione definitiva.

> Le marche su blockchain (OpenTimestamps e simili) sono un utile
> complemento gratuito, ma non godono della presunzione eIDAS: usale in
> aggiunta, mai al posto della marca qualificata.

---

## 3. Archiviare

Tre copie, due supporti diversi, una fuori sede:

1. cartella `baseline/` nel repository (comoda, ma non è archiviazione);
2. archivio cifrato su disco esterno o NAS;
3. copia su servizio cloud diverso da quello che ospita il codice.

Non tenere l'unica copia della prova nello stesso posto della cosa che
dovrebbe provare.

---

## 4. Quando rifarla

| Occasione                                      | Marca | Registro |
| ---------------------------------------------- | :---: | :------: |
| Prima release pubblica / commerciale           |   ✓   |    ✓     |
| Ogni rilascio significativo di funzionalità    |   ✓   |    —     |
| Prima di mostrare il codice a terzi (investitori, partner, federazione) | ✓ | — |
| Prima di conferire il software a una società   |   ✓   |    —     |
| In ogni caso, almeno ogni sei mesi             |   ✓   |    —     |

Annota ogni baseline nel registro qui sotto.

---

## Registro delle baseline

| Data       | Commit    | Tag                | SHA-256 manifest | Marca | Archiviata |
| ---------- | --------- | ------------------ | ---------------- | ----- | ---------- |
|            |           |                    |                  | ☐     | ☐          |

> Nessuna baseline ancora registrata. La prima riga va compilata con i
> valori restituiti da `scripts/baseline-manifest.sh`: data di esecuzione,
> commit fotografato, tag creato e impronta SHA-256 completa.
