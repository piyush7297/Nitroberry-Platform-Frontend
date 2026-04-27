import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search users...",
}: SearchBarProps) {
  return (
    <div className="relative group">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--app-text))]/40 group-focus-within:text-[rgb(var(--app-accent))]"
      />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[rgb(var(--app-text))]/5 border border-transparent focus:border-[rgb(var(--app-accent))]/30 py-2 pl-10 pr-10 rounded-lg text-sm outline-none transition-all text-[rgb(var(--app-text))] placeholder:text-[rgb(var(--app-text))]/30"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--app-text))]/40 hover:text-[rgb(var(--app-text))]"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
