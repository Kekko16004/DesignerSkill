// designer lint fixture: Tailwind on tokens. MUST PASS with zero hits.
export function Hero() {
  return (
    <section className="relative min-h-[72svh] bg-paper text-ink">
      <h1 className="font-display text-5xl text-ink">Sourdough by the loaf, three a morning</h1>
      <p className="text-base text-ink-dim">Order by 9pm, collect from 7am at Saragozza 41.</p>
      <div className="grid grid-cols-[2fr_1fr] gap-6">
        <figure className="p-6">Rye</figure>
        <figure className="p-6">Spelt</figure>
      </div>
      <button className="px-4 py-2 transition-transform motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-ink">Reserve a loaf</button>
    </section>
  );
}
