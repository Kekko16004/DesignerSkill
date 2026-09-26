# Tokens

Definisci i token **prima** di HTML/JSX. Usa [assets/token-template.css](../assets/token-template.css). Dopo il lock, niente hex nuovi.

## Cosa lockare

1. **Ink / paper / accent / danger / rare** — 5 ruoli, non 12 colori sparsi
2. **Radius language** — uno: `0` | `chamfer` (clip-path) | `small (2–4px)` | `mixed` (pannello 0, chip 999). Non `xl` globale.
3. **Border** — spesso doppio: chiaro interno, scuro esterno. Spessore 1–2px, non ring-4 indigo
4. **Type** — display + body con nomi veri (Cinzel, Unifraktur, IBM Plex, Newsreader, JetBrains Mono…). Mai Inter-only
5. **Elevation** — 2–3 piani: inset highlight, drop scuro, eventuale glow **solo** su stato attivo
6. **Motion** — durata e easing per mode (vedi motion.md)
7. **Density** — HUD tight; app mobile 8/12/16; marketing più aria ma non vuoto

## Radius per mondo

| Mondo | Radius |
|---|---|
| Dark fantasy / souls | 0, corner ornament o chamfer 8px |
| Sci-fi HUD | 0 o 2px, tagli diagonali |
| Mobile casual | 6–12px ma non 24px su ogni card |
| iOS product | sistema, non inventare 16px ovunque |
| Marketing editoriale | 0, o un raggio solo sui CTA |

## Bordi da reverse-engineering

Cerca nei reference:
- Doppio bordo (light inside / dark outside) per profondità
- Frame a 9-slice / ornamento angoli
- Hairline 1px vs barra 4px di accento solo sul selected

## Testo su scena busy

HUD e overlay 3D: scrim (`linear-gradient` o pannello semisolido) + `text-shadow` netto. Non testo bianco su screenshot di gameplay.

## Output atteso (prima del markup)

```
tokens:
  mode: game
  ink: #...
  paper: #...
  accent: #...
  radius: chamfer-8
  border: 1px #c9b896 inside / 2px #1a1208 outside
  display: Cinzel
  body: Source Serif
  motion: 90ms / 140ms, ease-out
```
