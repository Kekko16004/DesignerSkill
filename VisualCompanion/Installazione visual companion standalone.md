<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Riscrivila tu per fare in modo che sia autonoma, e voglio installarla globalmente per claude code

Ho riscritto la guida come **skill autonoma**, senza riferimenti operativi a Superpowers o alla skill `brainstorming`. È disponibile nel file allegato `visual-companion-SKILL.md`.

## Installazione globale

Claude Code carica le skill personali globali da `~/.claude/skills/<nome>/SKILL.md`, rendendole disponibili in tutti i progetti.[^1][^2]

1. Scarica il file allegato e imposta il suo percorso nella variabile `SKILL_SRC`.
2. Esegui questo in Git Bash, WSL, macOS o Linux:
```bash
SKILL_SRC="/percorso/dove/hai-scaricato/visual-companion-SKILL.md"
SKILL_DIR="$HOME/.claude/skills/visual-companion"
TMP_DIR="$(mktemp -d)"

mkdir -p "$SKILL_DIR"

# Installa la guida standalone come skill globale
cp "$SKILL_SRC" "$SKILL_DIR/SKILL.md"

# Preleva soltanto i file server necessari dal repository Superpowers
git clone --depth 1 --filter=blob:none --sparse \
  https://github.com/obra/superpowers.git "$TMP_DIR/superpowers"

git -C "$TMP_DIR/superpowers" sparse-checkout set skills/brainstorming/scripts

cp -R "$TMP_DIR/superpowers/skills/brainstorming/scripts" \
  "$SKILL_DIR/scripts"

chmod +x "$SKILL_DIR/scripts/"*.sh

rm -rf "$TMP_DIR"
```

La struttura finale deve essere questa:

```text
~/.claude/
└── skills/
    └── visual-companion/
        ├── SKILL.md
        └── scripts/
            ├── start-server.sh
            ├── stop-server.sh
            ├── frame-template.html
            └── ...
```

La cartella `scripts` è indispensabile: contiene il server locale, il template HTML e la gestione degli eventi browser; non basta copiare il solo Markdown.[^3][^4]

## Verifica

Chiudi e riapri Claude Code, quindi esegui:

```text
/skills
```

Dovresti vedere `visual-companion`. Potrai anche richiamarla esplicitamente:

```text
/visual-companion
```

Oppure lasciare che Claude la attivi in automatico, ad esempio:

```text
Mostrami tre possibili layout per una dashboard cyberpunk FiveM
e fammeli scegliere nel browser.
```


## Nota Windows

Con **Windows**, tieni la skill nella stessa posizione sotto la tua home, cioè:

```text
C:\Users\TUO_UTENTE\.claude\skills\visual-companion\
```

Ma avvia Claude Code e gli script preferibilmente da **Git Bash** o **WSL**, perché il companion usa `start-server.sh`. La documentazione di Claude Code conferma che le skill personali usano comunque `~/.claude/skills/`, dove `~` corrisponde alla home dell’utente.[^2]

Nel progetto in cui userai i mockup, aggiungi inoltre:

```gitignore
.superpowers/
```

Quella cartella conterrà le schermate e lo stato locale generati durante le sessioni visuali.
<span style="display:none">[^10][^11][^12][^13][^14][^15][^16][^17][^5][^6][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://code.claude.com/docs/en/skills

[^2]: https://code.claude.com/docs/it/skills

[^3]: https://github.com/obra/superpowers/blob/main/skills/brainstorming/scripts/start-server.sh

[^4]: https://github.com/obra/superpowers/blob/main/skills/brainstorming/visual-companion.md

[^5]: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview

[^6]: https://code.claude.com/docs/id/skills

[^7]: https://code.claude.com/docs/en/claude-directory

[^8]: https://code.claude.com/docs/fr/skills

[^9]: https://code.claude.com/docs/en/agent-sdk/skills

[^10]: https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf

[^11]: https://code.claude.com/docs/pt/skills

[^12]: https://github.com/ruvnet/agentic-flow/blob/main/.claude/skills/skill-builder/SKILL.md

[^13]: https://github.com/anthropics/skills/discussions/244

[^14]: https://www.verdent.ai/guides/claude-code-skills

[^15]: https://claudskills.com/learn/installing-claude-code-skills/

[^16]: https://www.verdent.ai/guides/claude-code-skills-configuration

[^17]: https://note.com/nobunosuke/n/nd8531c12caeb?hl=en

