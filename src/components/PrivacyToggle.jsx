import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';

export default function PrivacyToggle({ className = '', showLabel = true }) {
  const { isPrivacyActive, togglePrivacy } = usePrivacy();

  return (
    <button
      type="button"
      onClick={togglePrivacy}
      className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all duration-200 cursor-pointer select-none shadow-2xs ${
        isPrivacyActive
          ? 'bg-amber-500/10 border-amber-500/40 text-amber-900 hover:bg-amber-500/20'
          : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
      } ${className}`}
      title={
        isPrivacyActive
          ? 'Modo Sigilo ATIVADO: nomes de clientes e valores em R$ estão borrados. Clique para desativar.'
          : 'Modo Sigilo DESATIVADO: clique para borrar nomes de clientes e valores em R$ para reuniões ou gravações.'
      }
      aria-label="Alternar modo de privacidade e sigilo"
    >
      <div className={`p-1 rounded-lg transition-colors ${
        isPrivacyActive ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500'
      }`}>
        {isPrivacyActive ? <EyeOff size={14} /> : <Eye size={14} />}
      </div>

      {showLabel && (
        <span className="hidden sm:inline font-medium">
          {isPrivacyActive ? 'Modo Sigilo' : 'Modo Sigilo'}
        </span>
      )}

      {/* Pill Switch Indicator */}
      <div className="flex items-center gap-1.5 pl-0.5">
        <div
          className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 flex items-center ${
            isPrivacyActive ? 'bg-amber-500 justify-end' : 'bg-gray-300 justify-start'
          }`}
        >
          <div className="w-3.5 h-3.5 rounded-full bg-white shadow-xs transition-transform" />
        </div>
        <span className={`text-[10px] font-black tracking-wider uppercase ${
          isPrivacyActive ? 'text-amber-700' : 'text-gray-400'
        }`}>
          {isPrivacyActive ? 'ON' : 'OFF'}
        </span>
      </div>
    </button>
  );
}
