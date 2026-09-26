# Variant Studio

Galleria live **dopo** mode, brief, reverse-engineering, token lock e anti-slop gate. Sostituisce Visual Companion. Lo script è `scripts/studio.mjs` (Node ≥ 18, zero dipendenze).

Sotto, `STUDIO` = `node "<SKILL>/scripts/studio.mjs"`. Passa sempre `--project "<PROJECT>"` così tutto vive in `<project>/.variant-studio/` (aggiunto al `.gitignore` da solo).

Config: `config.json` → `companion.enabled`. Se `false`, salta e vai al mock.

Dettaglio schema: [studio-manifest.md](studio-manifest.md). Harness: [studio-platforms.md](studio-platforms.md). React/Storybook: [studio-frameworks.md](studio-frameworks.md).

## Quando

- Da zero: 3–8 varianti (layout / densità / materiale) **sui token già lockati**.
- Modifica / rifai / polish su UI esistente: varianti **funzionanti** con dati, icone, copy, stati reali.
- Non usare per requisiti testuali, API, trade-off in prosa.

Non chiedere “vuoi aprire lo studio?” se `companion.askBeforeOpen` è `false` (default). Dì in una riga cosa stai mostrando e apri.

Cap `companion.maxVariants` (default **8**). Non fermarti a 3–4 se hai più idee distinte.

## Avvio

```powershell
node "<SKILL>/scripts/studio.mjs" start --project "<PROJECT>" --open
```

Kilo: se il processo viene killato a fine comando, avvia con `background_process` (`persistent: true`) e `--foreground`, poi `status`. Serve `node` sul PATH.

`start` di nuovo è safe: riusa server/port/key, stampa `server-already-running`. L’URL include `?k=` — **sempre intero**.

Remote/container: `start --host 0.0.0.0 --url-host localhost`. Sandbox senza porte: `STUDIO build` e apri `gallery.html`.

## Kind (obbligatorio, mapping design)

| Superficie | `--kind` | `--viewports` |
|---|---|---|
| HUD / inventario / shop / pause / NUI FiveM | `page` | `desktop` (1440). Mai mobile salvo brief esplicito |
| Schermata app telefono | `page` | `mobile` o `mobile,laptop` se `both` |
| Hero / banda landing | `section` | `laptop,mobile` |
| Bottone, card, input, chip | `component` | `auto` |

`page` = viewport fisso, fold onesto. `component` = centrato, auto-height — **non** per un HUD.

## Loop

1. `STUDIO start --project "<PROJECT>" --open`
2. Round nuovo:

```powershell
node "<SKILL>/scripts/studio.mjs" new inventory-density --project "<PROJECT>" --kind page --viewports desktop --title "Inventory" --question "Which inventory density for PC NUI?" --variants a,b,c,d,e
```

3. Edita `round.json`: ogni variante ha `label` (nome dell’idea) e `notes` (reference + trade-off). Schema: [studio-manifest.md](studio-manifest.md).
4. Scrivi `<round>/<id>.html` col tool file (non heredoc). La galleria live-reloada. Placeholder “generating…” finché il file non c’è.
5. Token del brief in `.variant-studio/global.css` **o** `<round>/_shared.css`. Copia le CSS variables lockate. In `existing`, linka CSS reale: `"head": ["/p/html/style.css"]`.
6. Una riga all’utente: URL completo + cosa confronta + “seleziona (1–9), commenta elementi con C, poi Approva / Modifiche / Combina / Rifai”.
7. **Aspetta.** Non chiudere il turno chiedendo la scelta in chat.

```powershell
node "<SKILL>/scripts/studio.mjs" wait --project "<PROJECT>" --timeout 1800
```

Bash/Kilo tool timeout **≥ 1800000** ms. Exit 2 = timeout: `STUDIO decision --project "<PROJECT>"` al turno dopo. Chat vince se l’utente scrive prima.

8. Agisci sulla `action` (sotto). Itera con `--parent <round id>` finché `choose`.
9. Implementa nel codebase reale, poi opzionale `STUDIO stop --project "<PROJECT>"`. I round restano su disco.

## Decisioni

```json
{
  "action": "choose",
  "selected": ["b"],
  "note": "Use B density, A's type",
  "variants": {
    "b": { "label": "Dense grid", "rating": "like", "comment": "…", "annotations": [] }
  },
  "files": { "b": "/abs/path/b.html" },
  "viewed_at": { "viewport": "desktop", "theme": "dark", "layout": "grid" }
}
```

- **choose** → implementa `selected[0]` + commenti/annotazioni. Non incollare il mock se il progetto ha già componenti.
- **revise** → nuovo round `--parent`, 2–3 raffinamenti della selezionata. Ogni nota/annotation visibile. `notes` dice quale feedback risponde.
- **remix** → blend delle `selected`. Se poco chiaro, **una** domanda corta.
- **regenerate** → direzioni diverse, non ritocchi dei rifiuti.
- **annotations** = selettore CSS dentro quella variante. `viewed_at` = viewport/tema da rispettare.
- **render_errors** → la variante era rotta. Fix nel round nuovo.

## Come scrivere le varianti

**Frammenti** (no `<!DOCTYPE` / `<html>`): il server wrappa reset + shared CSS. Full document solo se serve il `<head>`.

- Token lockati in `_shared.css` / `global.css`. Vietato Inter + indigo + `rounded-xl`.
- `greenfield`: placeholder verosimili del mondo. `existing`: copy, icone, dati, stati veri (`/p/...` per CSS/asset del repo).
- Classi scoped (`.inv-a-…`) così lo shared non collide.
- Stati affiancati se servono, non solo hover:

```html
<div class="vs-states">
  <figure data-state="Idle">…</figure>
  <figure data-state="Hover">…</figure>
  <figure data-state="Disabled">…</figure>
</div>
```

- Dark: la gallery setta `data-theme="dark"` + class `dark`.
- Ogni variante = idea distinta (gerarchia, densità, emphasis), non un recolor.
- Fidelity = domanda: wireframe (`.wf-box`, `.wf-line`) per struttura; copy reale per look.

## Altri comandi

| Cmd | Uso |
|---|---|
| `status` | Server vivo? Round, file mancanti, decision |
| `list` | Storico round |
| `decision` | Leggi senza wait |
| `errors` | JS rotto nelle preview |
| `open` | Riapri gallery |
| `build` | `gallery.html` statico (niente server) |
| `stop` | Ferma. Auto-stop dopo 4 h idle |

## Troubleshooting

- 403 → URL senza `?k=`. Rimanda l’URL intero.
- “server stopped” → `start` di nuovo, stesso project; il tab si riconnette.
- Variante bianca → `STUDIO errors`. Path asset `/p/...` o tag non chiuso.
- `height: 100vh` su `body` in kind `component`/`section` sballa l’altezza: non usarlo.
