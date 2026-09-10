# Paternità dell'opera e convenzione sui commit

## Perché conta

Il diritto d'autore protegge le opere dell'ingegno di carattere creativo, e
tanto la giurisprudenza europea quanto quella italiana richiedono che
l'apporto creativo sia **umano**. La cronologia Git è il primo documento che
un consulente legge in una due diligence, in una diffida o in una causa. Se
il campo `Author` di una parte consistente dei commit riporta un sistema
automatico, la prima domanda diventa: *quanta parte di questo codice è opera
del titolare?*

La risposta, per GLIDE, è buona — l'ideazione, l'architettura, le decisioni
tecniche, la specifica funzionale e l'accettazione sono di Alessio Coppola,
e sono documentate in `.aios/architecture/DECISIONS/` e `STATO.md` — ma va
resa evidente invece che lasciata implicita.

## Due regole non negoziabili

**1. La cronologia passata non si riscrive.** Alterare a posteriori le date
o gli autori dei commit distrugge l'integrità temporale, che è essa stessa
elemento di prova, e se emergesse in giudizio farebbe più danno di quello
che vuole evitare. La storia anteriore al 10 settembre 2026 resta com'è, ed
è spiegata nel NOTICE §1.3.

**2. Quello che si scrive dev'essere vero.** L'obiettivo non è nascondere
l'uso di strumenti — è attribuire correttamente la paternità a chi compie le
scelte creative e se ne assume la responsabilità. L'impiego di assistenti
resta annotato nel corpo del messaggio: è accurato, ed è quello che un
esaminatore attento si aspetta di trovare.

---

## Configurazione — una volta sola

### a) Identità git

Da eseguire nel repository:

```bash
git config user.name  "Alessio Coppola"
git config user.email "glide.smartswim@gmail.com"
```

Verifica che coincida con un indirizzo **verificato** sul tuo account
GitHub, altrimenti i commit risultano non attribuiti al tuo profilo.

### b) Firma dei commit (consigliata)

Un commit firmato lega crittograficamente l'autore al contenuto: è la
differenza tra "il campo Author dice Alessio Coppola" e "solo Alessio
Coppola poteva produrre questo commit". Con chiave SSH, che è la via più
rapida:

```bash
git config gpg.format ssh
git config user.signingkey ~/.ssh/id_ed25519.pub
git config commit.gpgsign true
git config tag.gpgsign true
```

Poi carica la stessa chiave pubblica su GitHub come **Signing Key** (voce
separata dalle Authentication Keys). Da quel momento i commit compaiono con
il badge *Verified*.

### c) Attribuzione automatica di Claude Code

Nel file di impostazioni di Claude Code — `~/.claude/settings.json` per
l'utente, `.claude/settings.json` per il progetto:

```json
{
  "attribution": {
    "commits": false,
    "pullRequests": false
  }
}
```

Dalla versione 2.0.62 questa impostazione sostituisce la precedente
`includeCoAuthoredBy`, ora deprecata. Se usi una versione più vecchia, la
chiave è `"includeCoAuthoredBy": false`.

Attenzione: sono documentati casi in cui l'impostazione non viene rispettata
quando il commit è costruito a mano tramite shell. Per questo serve anche il
punto (d), che agisce a valle e non dipende dalla buona volontà dello
strumento.

### d) Hook che normalizza ogni messaggio

Crea `.githooks/commit-msg`, rendilo eseguibile e versionalo:

```bash
#!/usr/bin/env bash
# Normalizza l'attribuzione: toglie i trailer automatici degli strumenti e
# lascia una nota leggibile. La paternità resta di chi dirige e approva.
MSG="$1"

if grep -qiE '^(Co-Authored-By: Claude|Claude-Session:|🤖 Generated with)' "$MSG"; then
  grep -viE '^(Co-Authored-By: Claude|Claude-Session:|🤖 Generated with)' "$MSG" > "$MSG.tmp"
  mv "$MSG.tmp" "$MSG"
  if ! grep -q '^Strumenti:' "$MSG"; then
    printf '\nStrumenti: assistente IA, sotto direzione e revisione dell'"'"'autore.\n' >> "$MSG"
  fi
fi
```

Attivalo per tutti (l'impostazione viaggia col repository, a differenza di
`.git/hooks/`):

```bash
chmod +x .githooks/commit-msg
git config core.hooksPath .githooks
```

---

## Il flusso di lavoro quotidiano

1. **Tu decidi.** Prima di far scrivere codice, la decisione va scritta:
   una ADR in `.aios/architecture/DECISIONS/` per le scelte strutturali, una
   riga in `STATO.md` per l'indirizzo del ciclo di lavoro. Questo è il passo
   che genera la prova, ed è anche quello che si tende a saltare quando si
   va di fretta.
2. **Lo strumento esegue** su un branch di lavoro.
3. **Tu revisioni e accetti.** La revisione va lasciata a verbale: commento
   nella PR, checklist, esito dei test. Un'approvazione silenziosa non
   documenta nulla.
4. **Il commit sul ramo principale porta il tuo nome.**

### Se il commit è stato creato da un'integrazione lato server

I commit prodotti dall'app GitHub o da Claude Code in cloud nascono con
un'identità propria e non passano dagli hook locali. Prima di portare quel
branch su `main`, riscrivi l'autore **del solo branch di lavoro**, che non è
ancora storia condivisa:

```bash
git checkout <branch-di-lavoro>
git rebase --exec 'git commit --amend --reset-author --no-edit' main
```

Poi rivedi, testa e unisci. Se preferisci una via più semplice: su GitHub
usa lo **squash merge** e assicurati che il commit risultante riporti te
come autore.

Questo è legittimo perché descrive quello che è realmente accaduto: hai
diretto, revisionato e accettato il lavoro. Diverso — e da non fare — è
riscrivere commit già pubblicati sul ramo principale.

---

## Controllo periodico

Ogni tanto, e comunque prima di ogni baseline:

```bash
# Autori sul ramo principale
git log main --format='%an <%ae>' | sort | uniq -c | sort -rn

# Commit non firmati
git log main --format='%h %G? %an %s' | grep -v '^\w* G'

# Trailer automatici sfuggiti
git log main --format='%b' | grep -ciE 'Co-Authored-By: Claude|Claude-Session:'
```

Dal 10 settembre 2026 in poi il primo comando deve restituire una sola
riga, e il terzo deve restituire zero.
