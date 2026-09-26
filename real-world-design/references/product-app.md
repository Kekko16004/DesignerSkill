# Product app

App telefono e UI prodotto. Non HUD.

## Source loop

1. Nomina 2–3 app reali (es. Things / Linear / Telegram / Health).
2. Playwright sulle loro marketing pages o App Store screenshots **e** pattern noti (tab bar, large title, sheets).
3. Beautiful UI (https://www.beautifului.dev/) solo per stati agent: thinking, stream, approval, tool chips, task rows. Copia il *pattern*, restyle sui token. Non è beUI.
4. 21st `search` → `get_component` come pezzo (input, tabs), poi sostituisci colori/radius/type con i token.
5. thinking-orbs: solo stato thinking. Nel progetto target: `npm i thinking-orbs`. Non globale. Non su ogni spinner.

## Mobile native tells

- Tab bar basso o top large-title, non sidebar desktop compressa
- Hit target 44px
- Keyboard avoidance sul composer
- Swipe-back / sheet detents se il brief è iOS-like
- Status bar padding

## Agent surfaces (Beautiful UI)

Usa questi nomi, non reinventare:

- Loading / elapsed
- Thinking traces (steps, search, coding)
- Streaming text + sources
- Approval card (human-in-the-loop)
- Tool chips
- Task rows (running / failed / done)
- Prompt bar (@ sources, / commands)

Restyle: i loro default sono editoriali/AI-native. Se il prodotto è banca o fitness, cambia type, raggio, inchiostro.

## 21st

Path: `search` → scegli 1 componente → `get_component` → adatta. Mai `generate` prima. Quota free: se esaurita, screenshot del componente sul sito e ricostruisci.

## Output

Mock HTML/CSS a viewport 390×844. Poi React+Tailwind con i token (CSS variables), non `bg-zinc-950 text-indigo-400`.
