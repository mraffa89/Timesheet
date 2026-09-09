import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';

/**
 * Reusable SearchableSelect with rich autocomplete, search-by-name,
 * and search-by-CNPJ (with or without formatting / punctuation).
 */
export default function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Selecione um cliente...',
  searchPlaceholder = 'Buscar por nome ou CNPJ (com ou sem pontos)...',
  allowCustom = false,
  icon: IconComponent = null,
  required = false,
  className = '',
  buttonClassName = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const selectedOption = options.find(opt => String(opt.value) === String(value));

  const filteredOptions = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return options;
    const cleanNumTerm = term.replace(/\D/g, '');

    return options.filter(opt => {
      const l = (opt.label || '').toLowerCase();
      const sub = (opt.sublabel || '').toLowerCase();
      const kw = (opt.keywords || '').toLowerCase();

      // Busca padrão por texto
      if (l.includes(term) || sub.includes(term) || kw.includes(term)) {
        return true;
      }

      // Busca inteligente por CNPJ / números desconsiderando pontuação
      if (cleanNumTerm.length > 0) {
        const cleanSub = sub.replace(/\D/g, '');
        const cleanKw = kw.replace(/\D/g, '');
        if (cleanSub.includes(cleanNumTerm) || cleanKw.includes(cleanNumTerm)) {
          return true;
        }
      }

      return false;
    });
  }, [options, search]);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between border rounded-xl px-3 py-2.5 text-xs text-left bg-white hover:bg-gray-50 focus:outline-none transition-all cursor-pointer ${
          isOpen ? 'border-amber-500 ring-2 ring-amber-500/15 shadow-sm' : 'border-gray-300 hover:border-gray-400 shadow-2xs'
        } ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1 mr-1">
          {IconComponent && <IconComponent size={14} className="text-gray-400 shrink-0" />}
          {selectedOption ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-bold text-gray-900 truncate">{selectedOption.label}</span>
              {selectedOption.sublabel && (
                <span className="text-gray-500 text-[11px] font-mono bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 shrink-0">
                  {selectedOption.sublabel}
                </span>
              )}
            </div>
          ) : value && allowCustom ? (
            <span className="font-bold text-gray-900 truncate">{value}</span>
          ) : (
            <span className="text-gray-400 font-normal truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-gray-400">
          {(selectedOption || (value && allowCustom)) && !required && (
            <span
              onClick={handleClear}
              className="p-0.5 hover:text-gray-700 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
              title="Limpar seleção"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-gray-900' : 'text-gray-400'}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-[80] left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-2xl p-2 flex flex-col gap-1.5 animate-in fade-in-0 zoom-in-95">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-2.5 py-2 text-xs focus:outline-none focus:border-amber-500 focus:bg-white text-gray-900"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="max-h-56 overflow-y-auto flex flex-col gap-0.5 pt-1">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-gray-400">
                Nenhum resultado encontrado para "{search}"
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50 text-amber-900 font-bold'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="flex flex-col gap-0.5 truncate mr-2">
                      <span className="truncate font-semibold">{opt.label}</span>
                      {opt.sublabel && (
                        <span className="text-[11px] text-gray-500 font-mono">
                          {opt.sublabel}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check size={14} className="text-amber-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
