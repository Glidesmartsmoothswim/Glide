# GLIDE — Tipografia web

> Chiude ADR-009. Vale per sito, PWA e gestionale. Non vale per Canva (vedi §7).

---

## 1. Una famiglia, due pesi

**Glacial Indifference** — SIL OFL 1.1. Regular (400), Bold (700), Italic (400).
Non esistono 300, 500, 600. Non li invocare.

**Vietato:** `font-weight: 500` · `600` · `300`.
Il browser li **finge** allargando il Regular (synthetic bold): bordi impastati, chiaroscuro
irregolare. Sembra un errore di stampa, e lo è.

```css
* { font-synthesis: none; }   /* niente grassetti né corsivi finti. Mai. */
```

**La gerarchia si costruisce con quattro leve, non col peso:**

| Leva | Sostituisce |
|---|---|
| **Dimensione** | i salti di gerarchia |
| **MAIUSCOLO + tracking** | il peso 600 (etichette, occhielli, tab) |
| **Colore** (turchese, navy) | il peso 500 (enfasi) |
| **Grigio / opacità** | il testo secondario |

---

## 2. ⚠️ Il vincolo che nessun design system generico ti dirà

**I tuoi utenti hanno 40–60 anni. La presbiopia comincia a 42.**

E leggeranno questa app **a bordo vasca**: schermo bagnato, mani umide, luce che sbatte,
occhiali da vista in borsa. Non seduti a una scrivania.

Glacial Indifference è geometrica (ispirazione Bauhaus): x-height contenuta, forme circolari.
Bellissima nei titoli. **A 13px, su uno schermo bagnato, per un cinquantenne, è illeggibile.**

**Regole non negoziabili:**

- **Corpo del testo: 17px minimo.** Mai 16, mai 15.
- **Niente scende sotto i 14px.** Nemmeno le didascalie.
- **Nessun grigio sotto il 70% di opacità** su fondo scuro. Il "grigio elegante" è una vanità
  da designer ventenne.
- **Contrasto sempre pieno.** Il fondo nero del brand aiuta: su OLED, sotto il sole, il nero
  con testo bianco è la combinazione più leggibile che esista.
- **`user-select` attivo sui numeri.** Devono poterli copiare.

> Un'app di nuoto per Master che si legge solo con gli occhiali è un'app che non si legge.

---

## 3. Scala tipografica

Base 17px. Mobile-first; sul gestionale desktop si può salire di uno step.

| Token | px / line-height | Peso | Trattamento |
|---|---|---|---|
| `display` | 40 / 44 | 700 | MAIUSCOLO, tracking −0.02em |
| `h1` | 32 / 38 | 700 | — |
| `h2` | 25 / 32 | 700 | — |
| `h3` | 21 / 28 | 700 | — |
| `body-lg` | 19 / 30 | 400 | Effetto Acqua, messaggi del coach |
| `body` | **17 / 26** | 400 | default |
| `small` | 15 / 22 | 400 | minimo assoluto per la prosa |
| `label` | 14 / 18 | 700 | **MAIUSCOLO, tracking +0.09em** ← l'occhiello. Sostituisce il 600 |
| `data` | 21 / 24 | 400 | `font-variant-numeric: tabular-nums` |

**`label` è il pezzo che fa funzionare tutto il sistema.** Maiuscolo stretto + spaziatura larga
dà il gradino di gerarchia che di solito si otterrebbe con un peso medio. Usalo per: etichette
di sezione, tab, titoletti di card, intestazioni di colonna.

---

## 4. I numeri — la parte che si rompe per prima

La notazione allenamento è fatta di numeri: `8x50 SL @1'40" Z2`. Zone, RPE, passi, metri.

**Due vincoli:**

```css
.data, table, .workout, .rpe, .pace {
  font-variant-numeric: tabular-nums;   /* le colonne si allineano */
}
```

**⚠️ Da verificare al primo commit:** i font geometrici hanno lo **0 e la O quasi identici**,
e l'**1 spesso è un'asta nuda**, confondibile con `l` e `I`.

Test da fare a schermo, non a occhio sul Figma:

```
8x50 SL @1'40" Z2      0O1lI      100 · 200 · 400
```

Se `1'40"` e `l'40"` si somigliano, il problema è reale e va risolto **prima** di scrivere
l'editor allenamenti — non dopo, quando un nuotatore legge male un passo e nuota la serie sbagliata.

**Piano B se la verifica fallisce:** un mono per la sola notazione tecnica
(`JetBrains Mono`, OFL, gratis). Un font in più, ma solo dove serve la disambiguazione.

---

## 5. Implementazione Next.js

I `woff2` in `/public/fonts/`. Mai il CDN: Glacial Indifference non è su Google Fonts, e i mirror
tipo `onlinewebfonts` sono di provenienza legalmente dubbia.

```ts
// app/fonts.ts
import localFont from 'next/font/local'

export const glacial = localFont({
  src: [
    { path: '../public/fonts/GlacialIndifference-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/GlacialIndifference-Italic.woff2',  weight: '400', style: 'italic' },
    { path: '../public/fonts/GlacialIndifference-Bold.woff2',    weight: '700', style: 'normal' },
  ],
  variable: '--font-glide',
  display: 'swap',
  fallback: ['Avenir Next', 'Century Gothic', 'system-ui', 'sans-serif'],
  adjustFontFallback: false,   // regoliamo a mano il size-adjust, vedi sotto
})
```

**Il fallback va tarato**, o il testo salta quando il font arriva (CLS: penalizza SEO e dà
la sensazione di app scadente). Misura l'x-height reale e imposta `size-adjust` sul fallback
finché il salto non si vede più.

**Spedisci il file di licenza OFL** insieme ai font, in `/public/fonts/OFL.txt`.
È una condizione della licenza, costa dieci secondi, e ti mette al riparo.

---

## 6. Colore — nessun colore nuovo

Palette ufficiale, chiusa:

```
nero      #000000
turchese  #00FFE6
navy      #203979
blu       #0E5EAB
bianco    #FFFFFF
```

Il **Teal `#0B7A6E`** proposto da `glide-ext-booking` **non entra**. Serviva a distinguere
remoto da vasca nell'agenda: si fa con la palette esistente.

| | Colore |
|---|---|
| Lezione in **vasca** | Blu `#0E5EAB` |
| Call **remota** | Navy `#203979` |
| **Evento** | bordo Turchese `#00FFE6` |
| Slot libero | bordo Turchese, fondo trasparente |

**Il turchese è l'accento, non un colore di sfondo.** Su ampie superfici stanca e urla —
e GLIDE non urla. Usalo per: bordi, un dato che conta, un'azione.

**Nessun rosso.** Non c'è uno stato di fallimento in questo prodotto: l'onda scende, non si rompe;
il Glide Score si congela, non crolla. Se in una UI compare un rosso di errore su un dato del
nuotatore, quella UI sta violando ADR-005.

---

## 7. Cosa NON cambia

Il **logo resta identico.** È un'immagine: Kotex e ITC Franklin Gothic ci vivono legittimamente,
coperti dall'abbonamento Canva.

Locandine, post, PDF, materiali stampati: **tutto resta in Canva, com'è.**

Cambia solo **cosa scarica il browser**. Nessuno se ne accorgerà, tranne Monotype — che infatti
non avrà niente da dirti.
