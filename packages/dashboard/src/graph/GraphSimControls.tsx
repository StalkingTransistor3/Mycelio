import { useState } from 'react';

export interface SimParams {
  linkDistance: number;
  charge: number;
  clusterTightness: number;
  collisionRadius: number;
}

export const DEFAULT_SIM_PARAMS: SimParams = {
  linkDistance: 40,
  charge: -80,
  clusterTightness: 20,
  collisionRadius: 12,
};

interface Props {
  params: SimParams;
  onChange: (params: SimParams) => void;
  frozen: boolean;
  onFrozenChange: (frozen: boolean) => void;
}

const sliders: {
  key: keyof SimParams;
  label: string;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}[] = [
  { key: 'linkDistance', label: 'Link Distance', min: 20, max: 200, step: 5, format: (v) => String(v) },
  { key: 'charge', label: 'Charge Strength', min: -300, max: 0, step: 5, format: (v) => String(v) },
  { key: 'clusterTightness', label: 'Cluster Tightness', min: 10, max: 150, step: 5, format: (v) => String(v) },
  { key: 'collisionRadius', label: 'Collision Radius', min: 5, max: 30, step: 1, format: (v) => String(v) },
];

export default function GraphSimControls({ params, onChange, frozen, onFrozenChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {/* Freeze button — prominent */}
      <button
        onClick={() => onFrozenChange(!frozen)}
        className={`px-4 py-1.5 text-sm font-mono font-bold border rounded-lg transition-all duration-200 flex items-center gap-2 ${
          frozen
            ? 'bg-[#ff00e5]/15 border-[#ff00e5]/60 text-[#ff00e5] shadow-[0_0_12px_rgba(255,0,229,0.3)]'
            : 'bg-[#00f0ff]/10 border-[#00f0ff]/40 text-[#00f0ff] shadow-[0_0_8px_rgba(0,240,255,0.15)] hover:shadow-[0_0_12px_rgba(0,240,255,0.3)]'
        }`}
      >
        <span className="text-base">{frozen ? '▶' : '⏸'}</span>
        {frozen ? 'Unfreeze' : 'Freeze'}
      </button>

      {/* Sim params toggle */}
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className={`px-3 py-1.5 text-xs font-mono border rounded-lg transition-all duration-200 ${
            open
              ? 'bg-[#00f0ff]/10 border-[#00f0ff]/40 text-[#00f0ff] shadow-[0_0_8px_rgba(0,240,255,0.2)]'
              : 'bg-white/5 border-white/10 text-white/50 hover:border-white/20 hover:text-white/70'
          }`}
        >
          ⚙ Forces {open ? '▾' : '▸'}
        </button>

        {open && (
          <div className="absolute top-full left-0 mt-2 z-50 w-72 bg-[#0a0a0f]/95 backdrop-blur-md rounded-xl border border-white/10 p-4 space-y-3 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">
                Force Parameters
              </span>
              <button
                onClick={() => onChange({ ...DEFAULT_SIM_PARAMS })}
                className="text-[10px] font-mono text-white/30 hover:text-[#00f0ff] transition-colors"
              >
                Reset
              </button>
            </div>

            {sliders.map((s) => (
              <div key={s.key}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-mono text-white/50">{s.label}</label>
                  <span className="text-[10px] font-mono text-[#00f0ff]/70">{s.format(params[s.key])}</span>
                </div>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={params[s.key]}
                  onChange={(e) => onChange({ ...params, [s.key]: parseFloat(e.target.value) })}
                  className="w-full h-1 appearance-none bg-white/10 rounded-full outline-none cursor-pointer accent-[#00f0ff] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#00f0ff] [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(0,240,255,0.5)]"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
