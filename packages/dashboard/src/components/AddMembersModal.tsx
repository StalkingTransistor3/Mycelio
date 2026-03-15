import { useState } from 'react';
import { usePeople } from '../hooks/usePeople.js';
import Modal from './Modal.js';
import SearchBar from './SearchBar.js';
import { Button } from './FormField.js';
import type { Person, CampaignMemberEnriched } from '@mycelio/shared';

interface Props {
  open: boolean;
  onClose: () => void;
  existingMemberIds: string[];
  onAdd: (personIds: string[]) => void;
  isAdding?: boolean;
}

const tierGlow: Record<number, string> = {
  1: 'text-neon-magenta border-neon-magenta/30 bg-neon-magenta/10',
  2: 'text-neon-cyan border-neon-cyan/30 bg-neon-cyan/10',
  3: 'text-neon-green border-neon-green/30 bg-neon-green/10',
  4: 'text-neon-yellow border-neon-yellow/30 bg-neon-yellow/10',
  5: 'text-white/40 border-white/10 bg-white/5',
};

export default function AddMembersModal({ open, onClose, existingMemberIds, onAdd, isAdding }: Props) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data: people, isLoading } = usePeople(search ? { q: search } : undefined);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    onAdd(Array.from(selected));
    setSelected(new Set());
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Members">
      <div className="mb-4">
        <SearchBar onSearch={setSearch} placeholder="Search people..." />
      </div>

      <div className="max-h-80 overflow-y-auto space-y-1">
        {isLoading && <p className="text-white/30 animate-pulse text-sm">Loading...</p>}
        {people?.map((person: Person) => {
          const isExisting = existingMemberIds.includes(person.id);
          const isChecked = selected.has(person.id);

          return (
            <button
              key={person.id}
              type="button"
              onClick={() => !isExisting && toggle(person.id)}
              disabled={isExisting}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                isExisting
                  ? 'opacity-30 cursor-not-allowed'
                  : isChecked
                  ? 'bg-neon-cyan/10 border border-neon-cyan/30'
                  : 'hover:bg-white/5 border border-transparent'
              }`}
            >
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                  isChecked ? 'bg-neon-cyan border-neon-cyan' : 'border-white/20'
                }`}
              >
                {isChecked && <span className="text-[10px] text-black font-bold">&#10003;</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{person.name}</p>
                {person.title && <p className="text-xs text-white/30 truncate">{person.title}</p>}
              </div>
              <span className={`px-2 py-0.5 text-[10px] rounded border flex-shrink-0 ${tierGlow[person.tier]}`}>
                T{person.tier}
              </span>
              {isExisting && <span className="text-[10px] text-white/30">already added</span>}
            </button>
          );
        })}
        {people?.length === 0 && (
          <p className="text-white/20 text-sm text-center py-4">No people found</p>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
        <span className="text-xs text-white/30">
          {selected.size} selected
        </span>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={selected.size === 0 || isAdding}>
            {isAdding ? 'Adding...' : `Add ${selected.size} Member${selected.size !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
