# Playwright visual QA

Obbligatorio dopo il primo mock. Max 3 cicli. Poi stop o rifai token.

## Setup

1. Scrivi il mock su disco (workspace o `DesignerSkill/previews/`).
2. Apri con Playwright: `file:///` assoluto, oppure un preview locale.
3. Non giudicare solo dal codice.

## Ciclo

1. `browser_navigate` all'URL del mock.
2. `browser_resize` 1440×900. `browser_take_screenshot` viewport (+ fullPage se landing).
3. `browser_snapshot` — nomi, ruoli, target cliccabili.
4. Stati: `browser_hover` CTA, `browser_click` tab/modale, disabled visibile.
5. `browser_resize` 390×844. Screenshot. Check: thumb zone, notch padding, testo non tagliato, 44px target.
6. Confronta con [anti-slop.md](anti-slop.md) e i reference screenshot.

## Fail → patch

| Sintomo | Azione |
|---|---|
| Piatto / SaaS | Nested panels, doppio bordo, material tokens |
| Gradiente rotto | Sostituisci con token; niente indigo |
| Texture assente | CSS layered gradients / SVG frame, non stock photo |
| Hover inesistente | Glow/inset da motion.md |
| Mobile rotto | Safe-area, stack, font-size ≥ 14px body |
| Icone strane | SVG reale, togli path inventati |

Reload, screenshot di nuovo. Ciclo 2 e 3 solo su fail.

## Pass

Gate anti-slop < 3 ban. Distinctiveness: sai nominare un titolo/app affine. Hit target ok. Poi React port se mode lo richiede.

In `existing`, lo screenshot deve mostrare i dati veri del prodotto (targhe, job, valute, copy), non placeholder dello studio.

## Agentation

Se esiste preview React: l'utente può annotare. Non sostituisce gli screenshot Playwright. Skip su HTML puro.
