"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
};

export default function SearchInput({
  value,
  onChange,
  placeholder = "Buscar...",
  className = "",
  debounceMs = 350,
}: Props) {
  const [internalValue, setInternalValue] = useState(value);
  const initialized = useRef(false);

  useEffect(() => {
    if (value !== internalValue) setInternalValue(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    const t = setTimeout(() => {
      if (internalValue !== value) onChange(internalValue);
    }, debounceMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [internalValue, debounceMs]);

  const handleClear = () => {
    setInternalValue("");
    onChange("");
  };

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
      <input
        type="text"
        className="form-input w-full pl-9 pr-8"
        placeholder={placeholder}
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        aria-label={placeholder}
      />
      {internalValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Limpiar busqueda"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
