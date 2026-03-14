export default function EntityMap() {
  return (
    <div className="glass rounded-xl p-6">
      <h3 className="text-sm font-medium uppercase tracking-wider neon-text mb-4">How It All Connects</h3>

      <div className="relative flex flex-col items-center gap-1 text-xs font-mono">
        {/* People - center */}
        <div className="flex items-center gap-8">
          <EntityBox name="Organizations" color="purple" />
          <Arrow direction="right" label="belong to" />
          <EntityBox name="People" color="cyan" primary />
          <Arrow direction="right" label="attend" />
          <EntityBox name="Events" color="magenta" />
        </div>

        {/* Vertical connections from People */}
        <div className="flex gap-[280px]">
          <div className="flex flex-col items-center">
            <VertArrow label="grouped in" />
            <EntityBox name="Communities" color="green" />
          </div>
          <div className="flex flex-col items-center">
            <VertArrow label="logged as" />
            <EntityBox name="Interactions" color="yellow" />
          </div>
        </div>

        {/* Connections - bottom */}
        <div className="mt-2 flex flex-col items-center">
          <VertArrow label="linked via" />
          <EntityBox name="Connections" color="cyan" />
          <p className="text-white/20 mt-2 text-center max-w-xs">
            Graph edges between people with strength (strong / medium / weak)
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="glow-line my-4" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
        <Rule icon="T1-T5" text="People have a relationship tier (1 = closest)" />
        <Rule icon="7-90d" text="Follow-up cadence based on tier" />
        <Rule icon="&harr;" text="Connections link two people with context" />
        <Rule icon="tags" text="People, events, communities have freeform tags" />
        <Rule icon="log" text="Interactions update last contact date" />
        <Rule icon="health" text="Community health = avg tier + stale members" />
      </div>
    </div>
  );
}

function EntityBox({ name, color, primary }: { name: string; color: string; primary?: boolean }) {
  const colors: Record<string, string> = {
    cyan: 'border-neon-cyan/40 text-neon-cyan bg-neon-cyan/10',
    magenta: 'border-neon-magenta/40 text-neon-magenta bg-neon-magenta/10',
    green: 'border-neon-green/40 text-neon-green bg-neon-green/10',
    yellow: 'border-neon-yellow/40 text-neon-yellow bg-neon-yellow/10',
    purple: 'border-neon-purple/40 text-neon-purple bg-neon-purple/10',
  };

  return (
    <div className={`px-4 py-2 rounded-lg border text-center text-xs font-medium tracking-wider uppercase ${colors[color]} ${primary ? 'ring-1 ring-neon-cyan/30 shadow-neon px-6 py-3 text-sm' : ''}`}>
      {name}
    </div>
  );
}

function Arrow({ direction, label }: { direction: 'left' | 'right'; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[9px] text-white/20">{label}</span>
      <span className="text-white/20">{direction === 'right' ? '───→' : '←───'}</span>
    </div>
  );
}

function VertArrow({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center my-1">
      <span className="text-white/15">│</span>
      <span className="text-[9px] text-white/20 px-1">{label}</span>
      <span className="text-white/15">↓</span>
    </div>
  );
}

function Rule({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-neon-cyan/40 font-mono shrink-0">{icon}</span>
      <span className="text-white/30">{text}</span>
    </div>
  );
}
