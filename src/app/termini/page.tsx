import type { Metadata } from "next";
import { LegalDocument, LegalSection } from "@/components/legal/legal-document";

/**
 * Testo copiato 1:1 da docs/legal/GLIDE_TERMINI_CONDIZIONI.md — solo le
 * sezioni numerate (1–13). Escluso l'header "bozza pre-legale" e la nota
 * interna finale (uso interno, non per pubblicazione). Nessuna modifica al
 * contenuto: non "migliorarlo".
 */
export const metadata: Metadata = { title: "Termini e Condizioni" };

export default function TerminiPage() {
  return (
    <LegalDocument title="Termini e Condizioni d'Uso">
      <LegalSection number="1" title="Chi siamo">
        <p>
          I presenti termini regolano l&apos;uso del servizio Glide, coaching
          di nuoto Master fornito da Alessio Coppola (P.IVA 02381880505),
          tramite sito, app e piattaforma di gestione (&laquo;il
          Servizio&raquo;).
        </p>
      </LegalSection>

      <LegalSection number="2" title="Accettazione">
        <p>
          Utilizzando il Servizio accetti questi termini e l&apos;Informativa
          Privacy collegata. Se non li accetti, non puoi utilizzare il
          Servizio.
        </p>
      </LegalSection>

      <LegalSection number="3" title="Requisiti d'accesso">
        <ul className="flex flex-col gap-1 list-disc pl-5">
          <li>Maggiore età (18 anni compiuti)</li>
          <li>Account personale, non cedibile a terzi</li>
        </ul>
      </LegalSection>

      <LegalSection number="4" title="Descrizione del servizio">
        <p>
          Il Servizio comprende: programmazione dell&apos;allenamento,
          prenotazione di sessioni individuali e di gruppo (in vasca o da
          remoto), monitoraggio della readiness, analisi video, comunicazione
          con il coach, contenuti didattici.
        </p>
        <p>
          Il Servizio <strong>non fornisce consulenza medica</strong>. In
          presenza di dubbi sulla propria idoneità fisica, l&apos;utente deve
          consultare un medico prima di proseguire l&apos;attività.
        </p>
      </LegalSection>

      <LegalSection number="5" title="Prenotazioni e cancellazioni">
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li>
            Le lezioni si prenotano tramite l&apos;app, negli slot resi
            disponibili dal coach.
          </li>
          <li>
            <strong>Cancellazione gratuita fino a 24 ore prima</strong>{" "}
            dell&apos;inizio della sessione: il credito/lezione viene
            restituito.
          </li>
          <li>
            Cancellazioni con meno di 24 ore di preavviso: il
            credito/lezione non viene restituito.
          </li>
          <li>
            Mancata presentazione senza disdetta (<strong>no-show</strong>):
            trattata come sessione erogata.
          </li>
          <li>
            Il coach può chiudere l&apos;agenda per indisponibilità (es.
            chiusura piscina); in tal caso l&apos;utente viene avvisato e la
            sessione riprogrammata senza perdita di credito.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number="6" title="Pagamenti">
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li>
            I pagamenti sono gestiti tramite <strong>Stripe</strong>; i dati
            della carta non transitano mai sui sistemi di Glide.
          </li>
          <li>
            Le lezioni incluse nell&apos;abbonamento sono definite dal piano
            sottoscritto e si rinnovano a inizio periodo.
          </li>
          <li>
            Lezioni oltre la soglia inclusa nel piano sono acquistabili
            singolarmente al prezzo indicato in app al momento della
            prenotazione.
          </li>
          <li>
            [Politica di rimborso su abbonamenti — da definire prima della
            pubblicazione: es. nessun rimborso su periodo già iniziato,
            disdetta valida dal periodo successivo.]
          </li>
        </ul>
      </LegalSection>

      <LegalSection number="7" title="Proprietà intellettuale">
        <p>
          Programmi di allenamento, protocolli, contenuti video e materiali
          didattici forniti tramite il Servizio sono di proprietà di Alessio
          Coppola/Glide. È vietata la riproduzione, redistribuzione o
          cessione a terzi senza autorizzazione scritta.
        </p>
      </LegalSection>

      <LegalSection number="8" title="Responsabilità dell'utente">
        <p>L&apos;utente si impegna a:</p>
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li>
            essere consapevole che l&apos;attività sportiva richiede
            idoneità fisica, attestata da certificato medico dove previsto
            dalla normativa vigente — il possesso del certificato è
            responsabilità esclusiva dell&apos;utente; GLIDE non lo richiede
            né lo conserva
          </li>
          <li>
            fornire informazioni veritiere sul proprio stato di salute e
            sulla propria idoneità fisica
          </li>
          <li>
            comunicare tempestivamente al coach qualsiasi variazione
            rilevante per la sicurezza dell&apos;allenamento (infortuni,
            sintomi, terapie in corso)
          </li>
          <li>non condividere il proprio account con terzi</li>
        </ul>
      </LegalSection>

      <LegalSection number="9" title="Limitazione di responsabilità">
        <p>
          L&apos;attività sportiva comporta rischi intrinseci. Nei limiti
          consentiti dalla legge, il Titolare non risponde di infortuni
          derivanti da: dichiarazioni non veritiere sullo stato di salute,
          mancato rispetto delle indicazioni del coach, o cause di forza
          maggiore.
        </p>
      </LegalSection>

      <LegalSection number="10" title="Sospensione e cessazione">
        <p>
          Il Titolare si riserva il diritto di sospendere o chiudere
          l&apos;account in caso di violazione dei presenti termini o di
          comportamento lesivo verso il coach o altri utenti.
        </p>
      </LegalSection>

      <LegalSection number="11" title="Modifiche ai termini">
        <p>
          I termini possono essere aggiornati. L&apos;uso continuato del
          Servizio dopo una modifica sostanziale, comunicata preventivamente,
          costituisce accettazione dei nuovi termini.
        </p>
      </LegalSection>

      <LegalSection number="12" title="Legge applicabile e foro competente">
        <p>
          Legge italiana. Per i clienti che agiscono in qualità di
          consumatori, il foro competente è quello di residenza o domicilio
          del consumatore, ai sensi dell&apos;Art. 33, comma 2, lett. u) del
          Codice del Consumo — clausola non derogabile.
        </p>
      </LegalSection>

      <LegalSection number="13" title="Contatti">
        <p>
          <a href="mailto:glide.smartswim@gmail.com" className="underline">
            glide.smartswim@gmail.com
          </a>{" "}
          — PEC:{" "}
          <a href="mailto:coach.coppola@pec.it" className="underline">
            coach.coppola@pec.it
          </a>
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
