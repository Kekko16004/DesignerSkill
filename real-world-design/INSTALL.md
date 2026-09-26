# Installazione Real-World Design

Skill anti-slop per HUD/inventario/shop, app telefono e landing. Include Variant Studio (galleria live, griglia/confronto, commenti su elementi, Approva/Modifiche/Combina). Senza API key funziona (Playwright + WebSearch). La key sblocca solo il catalogo 21st.

## 1. Installer interattivo

Doppio click **oppure** da cmd:

```
C:\Users\FRANCY\Desktop\DesignerSkill\real-world-design\install.bat
```

Ti chiede tre cose. Enter = consigliati (`*`). `all` / `none` / numeri (`1 3 4`).

1. **Hosts** — dove copiare la skill  
   Consigliati: Kilo, Claude Code, Codex, Antigravity. Opzionali: Cursor, OpenCode, Copilot, Windsurf.
2. **Modules** — Variant Studio, comando `/design`, MCP 21st, transitions.dev.
3. **Sites** — quali siti la skill può aprire in reverse-engineering (Game UI Database, Interface In Game, 21st, Beautiful UI, …). Quelli non scelti restano `false` in `config.json` e l’agente non li visita.

Non-interattivo:

```bat
install.bat -All
install.bat -Quiet
install.bat -Hosts kilo,claude -SkipSources aceternity,artStation
```

Poi **chiudi e riapri** i client scelti.

Node.js ≥ 18 serve per Variant Studio. Senza Node il resto della skill resta valido.

## 2. Cosa viene scritto

| Host | Cartella skill |
|---|---|
| Kilo | `%USERPROFILE%\.config\kilo\skills\real-world-design\` |
| Claude Code | `%USERPROFILE%\.claude\skills\real-world-design\` |
| Codex | `%USERPROFILE%\.codex\skills\` e `\.agents\skills\` |
| Antigravity | `%USERPROFILE%\.gemini\antigravity\skills\` e `\.antigravity\skills\` |
| Cursor / OpenCode / Copilot / Windsurf | solo se li selezioni |

Ogni copia riceve `config.json` con hosts/modules/sources scelti. La skill legge quello, non “tutto il web”.

Kilo `/design` solo se il modulo `designCommand` è on: `%USERPROFILE%\.config\kilo\command\design.md`.

## 3. API key (solo se hai scelto gli MCP)

Non committare. Non incollare in chat.

### 21st.dev

1. https://21st.dev — login.
2. https://21st.dev/settings/api-keys
3. Env: `API_KEY_21ST`. Vecchie Magic key `an_…` morte.

```powershell
setx API_KEY_21ST "incolla_qui"
```

Chiudi **ogni** terminale e IDE. `setx` non vale nella sessione già aperta.

Senza key: ignora il server. Reverse-engineering e companion restano.

## 4. MCP (solo moduli scelti)

L’installer scrive placeholder `${API_KEY_21ST}` se la variabile utente è vuota.

| Client | File |
|---|---|
| Kilo | `~\.config\kilo\kilo.json` (`mcp`) |
| Claude Code | `~\.claude.json` top-level `mcpServers` — **non** `~\.claude\settings.json` |
| Cursor | `~\.cursor\mcp.json` |
| Antigravity | `~\.gemini\antigravity\mcp.json` |

Se 401: il client non espande `${}`. Incolla la key solo in quel file, mai in git.

## 5. Variant Studio

Vive dentro la skill (`scripts/studio.mjs` + `scripts/ui/`). Pipeline: token → round 3–8 varianti in gallery → Approva / Modifiche / Combina / Rifai → implementazione.

Artifact: `<progetto>/.variant-studio/` (gitignore automatico se c’è git). URL sempre con `?k=`.

## 6. Uso

```
/design HUD dark fantasy desktop come Hades
```

oppure: *usa real-world-design per un inventario Dark Souls*.

Da zero: placeholder verosimili. Modifica/rifai: dati, icone e copy già nel progetto.

## 7. Vietato

- Key in README, chat, repo
- 21st come layout di un HUD
- `generate` 21st come primo passo
- Aprire siti con `sources.* = false`
