interface Props {
  tierFilter: number | null;
  onTierChange: (tier: number | null) => void;
}

const tiers = [
  { value: null, label: 'All Tiers' },
  { value: 1, label: 'T1 — Inner Circle' },
  { value: 2, label: 'T2 — Key' },
  { value: 3, label: 'T3 — Active' },
  { value: 4, label: 'T4 — Extended' },
  { value: 5, label: 'T5 — Acquaintance' },
];

export default function GraphControls({ tierFilter, onTierChange }: Props) {
  return (
    <div className="flex items-center gap-4 mb-4">
      <label className="text-[10px] font-medium text-white/30 uppercase tracking-wider">Filter</label>
      <select
        value={tierFilter ?? ''}
        onChange={(e) => onTierChange(e.target.value ? parseInt(e.target.value) : null)}
        className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white/70 outline-none focus:border-neon-cyan/50 focus:shadow-neon transition-all appearance-none cursor-pointer"
      >
        {tiers.map((t) => (
          <option key={t.label} value={t.value ?? ''} className="bg-[#0a0a0f] text-white/70">
            {t.label}
          </option>
        ))}
      </select>
    </div>
  );
}
