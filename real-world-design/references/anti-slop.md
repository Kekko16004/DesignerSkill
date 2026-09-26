# Anti-slop

Filtro, non stile. Se 3+ ban matchano, rifare token e layout. Non ritoccare un colore.

## Hard bans

### Type
- Inter, Geist, Roboto, Arial, Open Sans come unico font
- `font-sans` Tailwind default su UI di gioco
- Tracking ultra-wide su ogni heading
- Testo tutto uppercase senza una display face intenzionale

### Colore
- Purple/indigo gradient (`from-indigo-500 to-purple-600`, `#6366f1`, `#8b5cf6`)
- Paletta "SaaS dark": zinc-950 + indigo-500 + white
- Glow neon su ogni bottone
- Accento identico su fill, bordo, testo e shadow

### Shape
- `rounded-xl` / `rounded-2xl` / `rounded-3xl` su tutti i pannelli
- 8px radius di default "perché Tailwind"
- Pill buttons su HUD medievale/militare
- Card tutte della stessa altezza in griglia 3

### Layout
- Hero + 3 feature cards
- Bento 3×2
- Navbar SaaS (logo | links | CTA) su HUD o inventario
- Sidebar shadcn su pause menu
- Footer con 4 colonne di link su overlay di gioco

### Icone
- Emoji come icone UI
- Lucide/Heroicons generici su armi, valute, classi
- SVG path inventati ("spada abbozzata")
- Icone tutte dello stesso stroke 1.5px in un HUD pittorico

### Materiale
- Glassmorphism (`backdrop-blur-xl` + bianco 10%) senza pannelli nidificati
- `shadow-lg` / `shadow-xl` Tailwind default come unica profondità
- Un solo piano piatto per inventario/shop
- Texture nominata nel brief e mai usata

### Motion
- Bounce/elastic su popup diegetici
- Shimmer infinito su testo statico
- Fade 300ms su tutto
- Particelle decorative senza funzione

### Copy
- "Unlock your potential", "next-generation", "seamless", "elevate"
- Fake stats (10x, 99.9%, "loved by thousands")
- CTA "Get Started" su shop di gioco

## Game-specific bans

- Card bianche su sfondo 3D
- Safe-area ignorata (notch, home indicator)
- HP bar da Bootstrap
- Menu centrato tipo modal SaaS per inventario AAA (spesso è full-bleed o left-rail)
- Touch target < 44px su mobile

## Product-app bans

- Stessi componenti 21st non restyled
- thinking-orbs su ogni spinner (solo stato thinking)
- Chat bubble iMessage clonata senza motivo

## Marketing bans

- Gradient mesh viola
- Screenshot MacBook fake
- Social proof inventato
- Tre colonne identiche sotto l'hero

## Gate

Prima del codice: confronta il piano visivo con questa lista.

Dopo Playwright: se lo screenshot sembra "template v0/shadcn", conta i ban. ≥3 → torna ai token. 1–2 → patch mirata nel ciclo QA.

## Distinctiveness check

Rispondi in una riga: "Questa UI potrebbe essere di [titolo/app X], non di un boilerplate." Se non sai nominare X, non è abbastanza specifica.
