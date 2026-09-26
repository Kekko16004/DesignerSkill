# Real-World Design

Skill globale anti-slop per UI di **videogiochi**, **app telefono** e **landing**. Reverse-engineering su reference reali, token prima del codice, **Variant Studio** (galleria 3–8 varianti, commenti, confronto), mock HTML/CSS, React+Tailwind se serve, loop Playwright.

Da zero: placeholder verosimili. Su UI esistente: patch funzionante con dati/icone/copy attuali.

## Install

Guida: **[real-world-design/INSTALL.md](real-world-design/INSTALL.md)**

Doppio click (scegli host, moduli, siti):

```
real-world-design\install.bat
```

Tutto, senza domande:

```
real-world-design\install.bat -All
```

Poi, solo se hai abilitato l'MCP 21st:

```bat
setx API_KEY_21ST "la_tua_key"
```

- 21st: https://21st.dev/settings/api-keys

Riavvia l'IDE. Senza key la skill funziona (Playwright + WebSearch + Variant Studio). Serve Node ≥ 18 per lo studio.

## Uso (Kilo)

```
/design HUD dark fantasy desktop come Hades
```

## Pipeline

`mode → brief → references (siti enabled) → tokens → anti-slop → Variant Studio pick/comment → implementazione → Playwright QA (≤3) → React se app/landing`

## Layout

```
real-world-design/SKILL.md
real-world-design/config.json
real-world-design/references/
real-world-design/assets/
real-world-design/scripts/install-variant-studio.bat
real-world-design/scripts/install-variant-studio.ps1
real-world-design/command/design.md
real-world-design/install.bat
real-world-design/install.ps1
```
