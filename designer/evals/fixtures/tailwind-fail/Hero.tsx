// designer lint fixture: Tailwind tells. Expected REDO_TOKENS.
export function Hero() {
  return (
    <section className="relative min-h-screen bg-white">
      <div className="absolute -top-24 left-1/3 h-96 w-96 rounded-full bg-fuchsia-400 blur-3xl" />
      <span className="text-xs uppercase tracking-widest text-gray-500">New release</span>
      <h1 className="bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">Ship faster today</h1>
      <div className="grid grid-cols-3 gap-6">
        <div className="p-6">Sync</div>
        <div className="p-6">Share</div>
        <div className="p-6">Ship</div>
      </div>
      <button className="transition-all outline-none px-4 py-2">Start now</button>
    </section>
  );
}
