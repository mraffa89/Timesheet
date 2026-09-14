import React, { createContext, useContext, useState, useEffect } from 'react';

const PrivacyContext = createContext({
  isPrivacyActive: false,
  togglePrivacy: () => {},
  setPrivacyActive: () => {}
});

export const PRIVACY_STORAGE_KEY = 'mhb_raffa_privacy_mode';

export function PrivacyProvider({ children }) {
  const [isPrivacyActive, setIsPrivacyActive] = useState(() => {
    try {
      return localStorage.getItem(PRIVACY_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const togglePrivacy = () => {
    setIsPrivacyActive(prev => {
      const next = !prev;
      try {
        localStorage.setItem(PRIVACY_STORAGE_KEY, String(next));
      } catch (err) {
        console.error('Erro ao salvar preferência de privacidade:', err);
      }
      return next;
    });
  };

  const setPrivacyActive = (val) => {
    const booleanVal = Boolean(val);
    setIsPrivacyActive(booleanVal);
    try {
      localStorage.setItem(PRIVACY_STORAGE_KEY, String(booleanVal));
    } catch (err) {
      console.error('Erro ao salvar preferência de privacidade:', err);
    }
  };

  // Aplica classe auxiliar no body/html para estilizações globais se necessário
  useEffect(() => {
    if (isPrivacyActive) {
      document.documentElement.classList.add('privacy-mode-active');
    } else {
      document.documentElement.classList.remove('privacy-mode-active');
    }
  }, [isPrivacyActive]);

  return (
    <PrivacyContext.Provider value={{ isPrivacyActive, togglePrivacy, setPrivacyActive }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const context = useContext(PrivacyContext);
  if (!context) {
    throw new Error('usePrivacy deve ser usado dentro de um PrivacyProvider');
  }
  return context;
}
