<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Paternità e attribuzione dei commit

Dal 10 settembre 2026 il campo `Author` di ogni commit indica la persona che
ha diretto e approvato il lavoro — Alessio Coppola
`<glide.smartswim@gmail.com>` — mai un assistente. La procedura completa,
con le verifiche periodiche, è in `docs/legal/paternita-e-commit.md`; la
motivazione sta nel NOTICE §1.3.

Regole operative:

- **Non aggiungere trailer di attribuzione automatica** ai messaggi di
  commit: né `Co-Authored-By: Claude`, né `Claude-Session:`, né
  `🤖 Generated with`. L'hook `.githooks/commit-msg` li rimuove comunque e
  li sostituisce con la riga `Strumenti:`, ma non va usato come rete di
  sicurezza per un'abitudine sbagliata.
- **L'uso di assistenti si dichiara, non si nasconde.** Resta annotato nel
  corpo del messaggio: l'obiettivo è attribuire la paternità a chi compie le
  scelte creative, non far sparire il resto.
- **La cronologia già pubblicata su `main` non si riscrive**, per nessun
  motivo. Alterare a posteriori date o autori distrugge l'integrità
  temporale, che è essa stessa la prova che il progetto sta costruendo. La
  storia anteriore al 10 settembre 2026 resta com'è.
- Un branch di lavoro non ancora unito non è storia condivisa: lì l'autore
  si può correggere prima del merge, come descritto nel documento.

Ogni file sorgente porta l'intestazione SPDX `LicenseRef-GLIDE-Proprietary`.
Se ne crei uno nuovo con estensione gestita, esegui
`node scripts/add-license-headers.mjs`, altrimenti la CI fallisce.
