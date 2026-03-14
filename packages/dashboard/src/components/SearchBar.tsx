import { useState } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export default function SearchBar({ onSearch, placeholder = 'Search...' }: SearchBarProps) {
  const [value, setValue] = useState('');

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onSearch(e.target.value);
        }}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white/90 placeholder-white/20 outline-none focus:border-neon-cyan/50 focus:shadow-neon transition-all duration-200 backdrop-blur-sm"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 text-xs">⌘K</span>
    </div>
  );
}
