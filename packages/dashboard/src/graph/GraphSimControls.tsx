import { useState } from 'react';

export interface SimParams {
  linkDistance: number;
  repulsion: number;
  clusterStrength: number;
  collisionRadius: number;
}

export const DEFAULT_SIM_PARAMS: SimParams = {
  linkDistance: 120,
  repulsion: -180,
  clusterStrength: 0.15,
  collisionRadius: 22,
};

interface Props {
  params: SimParams;
  onChange: (params: SimParams) => void;
}

const sliders: {
  key: keyof SimParams;
  label: string;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}[] = [
  { key: 'linkDistance', label: 'Link Distance', min: 40, max: 300, step: 5, format: (v) => String(v) },
  { key: 'repulsion', label: 'Repulsion', min: -500, max: 0, step: 10, format: (v) => String(v) },
  { key: 'clusterStrength', label: 'Cluster Strength', min: 0, max: 0.5, step: 0.01, format: (v) => v.toFixed(2) },
  { key: 'collisionRadius', label: 'Collision Radius', min: 5, max: 50, step: 1, format: (v) => String(v) },
];

export default function GraphSimControls({ params, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`px-3 py-1.5 text-xs font-mono border rounded-lg transition-all duration-200 ${
          open
            ? 'bg-neon-cyan/10 border-neon-cyan/40 text-neon-cyan shadow-neon'
            : 'bg-white/5 border-white/10 text-white/50 hover:border-white/20 hover:text-white/70'
        }`}
      >
        Simulation {open ? '▾' : '▸'}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 w-72 glass rounded-xl neon-border p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">
              Force Parameters
            </span>
            <button
              onClick={() => onChange({ ...DEFAULT_SIM_PARAMS })}
              className="text-[10px] font-mono text-white/30 hover:text-neon-cyan transition-colors"
            >
              Reset
            </button>
          </div>

          {sliders.map((s) => (
            <div key={s.key}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-mono text-white/50">{s.label}</label>
                <span className="text-[10px] font-mono text-neon-cyan/70">{s.format(params[s.key])}</span>
              </div>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={params[s.key]}
                onChange={(e) => onChange({ ...params, [s.key]: parseFloat(e.target.value) })}
                className="w-full h-1 appearance-none bg-white/10 rounded-full outline-none cursor-pointer accent-neon-cyan [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neon-cyan [&::-webkit-slider-thumb]:shadow-neon"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
