import type { Metadata } from "next";
import {
  LegalDocument,
  LegalSection,
  LegalTable,
} from "@/components/legal/legal-document";

/**
 * Testo copiato 1:1 da docs/legal/GLIDE_INFORMATIVA_PRIVACY.md — solo le
 * sezioni numerate (1–7). Escluso l'header "bozza pre-legale" e la nota
 * interna finale (uso interno, non per pubblicazione). Nessuna modifica al
 * contenuto: non "migliorarlo". Il segnaposto città/CAP in §1 è nel
 * documento sorgente e resta com'è (gap noto, non da inventare).
 */
export const metadata: Metadata = { title: "Informativa Privacy" };

export default function PrivacyPage() {
  return (
    <LegalDocument title="Informativa Privacy">
      <LegalSection number="1" title="Titolare del trattamento">
        <p>
          Alessio Coppola — Coach Nuoto (Glide)
          <br />
          P.IVA: 02381880505
          <br />
          Sede: Via Beato Pio IX n.4, interno 1 [città/CAP da aggiungere]
          <br />
          Email:{" "}
          <a href="mailto:glide.smartswim@gmail.com" className="underline">
            glide.smartswim@gmail.com
          </a>
          <br />
          PEC:{" "}
          <a href="mailto:coach.coppola@pec.it" className="underline">
            coach.coppola@pec.it
          </a>
        </p>
      </LegalSection>

      <LegalSection
        number="2"
        title="Dati trattati, finalità, base giuridica, conservazione"
      >
        <LegalTable
          head={["Dato", "Finalità", "Base giuridica", "Conservazione"]}
          rows={[
            [
              "Nome, email, telefono, data di nascita",
              "Erogazione del servizio",
              "Contratto (Art. 6.1.b)",
              "Durata del rapporto + 10 anni (obblighi fiscali)",
            ],
            [
              "Codice fiscale",
              "Fatturazione",
              "Obbligo di legge",
              "10 anni",
            ],
            [
              "Readiness (sonno, energia, dolori, umore, motivazione)",
              "Personalizzazione dell'allenamento",
              <strong key="a">Consenso esplicito (Art. 9.2.a)</strong>,
              "24 mesi, poi aggregazione anonima",
            ],
            [
              "RPE e note post-sessione",
              "Tracciamento",
              <strong key="b">Consenso esplicito (Art. 9.2.a)</strong>,
              "24 mesi",
            ],
            [
              "Video di allenamento/gara",
              "Analisi tecnica",
              <strong key="c">Consenso dedicato, separato dagli altri</strong>,
              "12 mesi, salvo richiesta di conservazione più lunga",
            ],
            [
              "Messaggi in chat con il coach",
              "Comunicazione e supporto all'allenamento",
              <>
                <strong>Consenso esplicito</strong> (la chat può contenere
                contenuti sanitari, es. dolori riferiti)
              </>,
              "24 mesi",
            ],
            [
              "Prenotazioni, allenamenti assegnati, badge",
              "Erogazione del servizio",
              "Contratto",
              "Durata del rapporto",
            ],
            [
              "Dati di pagamento",
              "Fatturazione",
              "Contratto + obbligo fiscale",
              <>
                Gestiti da Stripe — <strong>non conservati da Glide</strong>
              </>,
            ],
            [
              "Risposte al Test del Nuotatore Master (non ancora cliente)",
              "Contatto commerciale",
              "Consenso (double opt-in)",
              "24 mesi dall'ultimo contatto, poi cancellazione automatica",
            ],
            [
              "Email marketing / newsletter",
              "Comunicazioni promozionali",
              "Consenso (opt-in, revocabile)",
              "Fino a revoca",
            ],
          ]}
        />
        <p>
          I dati di categoria particolare (Art. 9 GDPR — readiness, sintomi,
          certificati medici, video, contenuto sanitario della chat) sono
          raccolti solo previo{" "}
          <strong>
            consenso esplicito, specifico per ciascuna finalità, revocabile
            in ogni momento
          </strong>
          , mai richiesto tramite casella pre-selezionata. Il consenso al
          servizio (contratto) e il consenso ai dati sanitari sono{" "}
          <strong>richiesti separatamente</strong>: rifiutare il secondo non
          preclude l&apos;uso base del servizio, ma limita la
          personalizzazione dell&apos;allenamento.
        </p>
      </LegalSection>

      <LegalSection
        number="3"
        title="Soggetti che trattano i dati per conto del Titolare"
      >
        <LegalTable
          head={["Fornitore", "Funzione", "Nota"]}
          rows={[
            [
              "Supabase",
              "Database e autenticazione",
              "Regione UE — [da confermare]",
            ],
            [
              "Vercel",
              "Hosting applicativo",
              "Funzioni configurate su regione UE",
            ],
            [
              "Stripe",
              "Pagamenti",
              "I dati della carta non transitano mai su Glide (Stripe Checkout ospitato)",
            ],
            [
              "Resend",
              "Invio email transazionali",
              "Regione — [da confermare]",
            ],
            [
              "Cloudflare R2",
              "Storage dei video",
              "Bucket privato, mai pubblico",
            ],
            [
              "[Provider assistente AI]",
              "Assistente in-app",
              "Riceve solo segnali pseudonimizzati, mai nome/email/data di nascita insieme al contenuto",
            ],
          ]}
        />
        <p>
          Tutti i fornitori operano come responsabili del trattamento (Art.
          28 GDPR), con accordo (DPA) sottoscritto o accettato. Per i
          fornitori con infrastruttura extra-UE si applicano le Clausole
          Contrattuali Standard (SCC) previste dalla normativa vigente.
        </p>
      </LegalSection>

      <LegalSection number="4" title="Diritti dell'interessato">
        <p>In qualsiasi momento puoi richiedere:</p>
        <ul className="flex flex-col gap-1 list-disc pl-5">
          <li>accesso ai tuoi dati</li>
          <li>rettifica di dati inesatti</li>
          <li>cancellazione (diritto all&apos;oblio)</li>
          <li>limitazione del trattamento</li>
          <li>portabilità dei dati</li>
          <li>opposizione al trattamento</li>
          <li>revoca del consenso, senza effetto retroattivo su quanto già trattato</li>
        </ul>
        <p>
          Puoi inoltre proporre reclamo al{" "}
          <strong>Garante per la protezione dei dati personali</strong>{" "}
          (www.garanteprivacy.it).
        </p>
        <p>
          Per esercitare questi diritti:{" "}
          <a href="mailto:glide.smartswim@gmail.com" className="underline">
            glide.smartswim@gmail.com
          </a>{" "}
          (o PEC:{" "}
          <a href="mailto:coach.coppola@pec.it" className="underline">
            coach.coppola@pec.it
          </a>
          ).
        </p>
      </LegalSection>

      <LegalSection number="5" title="Minori">
        <p>
          Il servizio è riservato a utenti maggiorenni (18 anni compiuti).
          Non vengono raccolti né trattati dati di minori.
        </p>
      </LegalSection>

      <LegalSection number="6" title="Sicurezza dei dati">
        <p>
          I dati sono protetti con controllo degli accessi basato su ruolo,
          cifratura a riposo (at-rest) presso i fornitori di infrastruttura,
          e separazione tecnica tra dati identificativi e dati sanitari dove
          tecnicamente possibile.
        </p>
      </LegalSection>

      <LegalSection number="7" title="Modifiche a questa informativa">
        <p>
          Questa informativa può essere aggiornata. Le modifiche sostanziali
          saranno comunicate agli utenti attivi prima di diventare
          efficaci.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
