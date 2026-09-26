# Fidelity

Due regimi. Sbagliare regime = mock inutile o UI rotta.

## Da zero (`greenfield`)

Nuova superficie, nessun markup/dati nel repo.

- Placeholder ammessi: nomi, valute, HP, slot, screenshot di prodotto.
- Devono sembrare **verosimili** per quel mondo (non “Item 1”, non Lorem).
- Layout, radius, bordi, type = token lockati. Variant Studio confronta direzioni, non palette nuove.
- Dopo la scelta: implementa il mock vero, poi Playwright, poi (se mode lo richiede) React.

## Modifica / rifai / polish (`existing`)

C’è già HTML/CSS/JS, NUI, React, o copy/dati nel progetto.

- **Vietato** sostituire con placeholder.
- Leggi i file attuali. Riusa stringhe, icone, valute, stati, ID, callback.
- Varianti studio = fork visivo della UI vera (stessi dati, gerarchia diversa).
- Dopo la scelta: patch i file esistenti. Nessun secondo mock “demo” che diverga dal prodotto.

Segnali `existing`: cartella `html/` FiveM, `index.html` già popolato, componenti React, `config.lua` con item/job, richiesta “sistema / rifai / sistema sta roba / cambia colore”.

## Mix

Parte nuova su prodotto esistente (es. tab Impound nuovo in garage già fatto): i pannelli vecchi restano reali; solo il pezzo nuovo può usare placeholder *di quel dominio* (targa, multa) non “Card Title”.
