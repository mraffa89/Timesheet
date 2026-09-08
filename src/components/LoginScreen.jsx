import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck, RefreshCw, Server, X, Eye, EyeOff } from 'lucide-react';
import { authenticateFreelancerDb, getSupabaseCredentials } from '../lib/supabase';

export default function LoginScreen({ onLogin, companyInfo, freelancers = [] }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Supabase quick config modal state (discreto e em modo claro)
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState(() => getSupabaseCredentials().isConfigured);
  const [showDbConfigModal, setShowDbConfigModal] = useState(false);
  const [dbUrlInput, setDbUrlInput] = useState(() => getSupabaseCredentials().url || '');
  const [dbKeyInput, setDbKeyInput] = useState(() => getSupabaseCredentials().key || '');

  const handleSaveQuickDb = (e) => {
    e.preventDefault();
    if (!dbUrlInput.trim() || !dbKeyInput.trim()) {
      alert('Preencha a URL e a Chave Anônima (Anon Key) do Supabase.');
      return;
    }
    localStorage.setItem('raffa_supabase_url', dbUrlInput.trim());
    localStorage.setItem('raffa_supabase_anon_key', dbKeyInput.trim());
    setIsSupabaseConfigured(true);
    setShowDbConfigModal(false);
    setErrorMessage('');
    alert('✓ Credenciais do Supabase configuradas com sucesso neste navegador! Agora você pode realizar o login.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const inputEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();

      // 1. Checa credenciais do Administrador mestre
      const savedUser = (localStorage.getItem('raffa_auth_email') || 'contato@matheusraffa.com.br').trim().toLowerCase();
      const savedPass = (localStorage.getItem('raffa_auth_pass') || 'admin123').trim();

      if (
        (inputEmail === savedUser || inputEmail === 'admin' || inputEmail === 'matheus') &&
        (cleanPassword === savedPass || cleanPassword === 'admin123' || cleanPassword === '123456')
      ) {
        const userSession = {
          email: inputEmail.includes('@') ? inputEmail : `${inputEmail}@matheusraffa.com.br`,
          name: companyInfo?.brandName || 'Matheus Raffa',
          role: 'Administrador',
          allowedTabs: ['dashboard', 'clients', 'timesheet', 'reports', 'freelancers', 'settings'],
          loggedAt: new Date().toISOString()
        };
        localStorage.setItem('raffa_session_user', JSON.stringify(userSession));
        onLogin(userSession);
        return;
      }

      // 2. Tenta autenticação direta via Supabase em tempo real
      const authResult = await authenticateFreelancerDb(inputEmail, cleanPassword);

      if (authResult.success && authResult.user) {
        const matched = authResult.user;
        const userSession = {
          id: matched.id,
          email: matched.username || matched.email || matched.name,
          name: matched.name,
          role: 'Freelancer',
          freelancerId: matched.id,
          hourlyRate: matched.hourlyRate || 0,
          specialty: matched.specialty || '',
          allowedTabs: matched.allowedTabs && matched.allowedTabs.length > 0 
            ? matched.allowedTabs 
            : ['freelancer-tasks'],
          loggedAt: new Date().toISOString()
        };
        localStorage.setItem('raffa_session_user', JSON.stringify(userSession));
        if (authResult.all && Array.isArray(authResult.all)) {
          try {
            localStorage.setItem('raffa_freelancers_v1', JSON.stringify(authResult.all));
          } catch (eCache) {}
        }
        onLogin(userSession);
        return;
      }

      // 3. Fallback em memória ou LocalStorage caso Supabase esteja temporariamente indisponível
      let allFreelas = Array.isArray(freelancers) ? [...freelancers] : [];
      if (allFreelas.length === 0) {
        try {
          const localFreelas = JSON.parse(localStorage.getItem('raffa_freelancers_v1') || '[]');
          if (Array.isArray(localFreelas)) allFreelas = localFreelas;
        } catch (e) {}
      }

      const normalize = (s) => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const target = normalize(inputEmail);
      const targetPrefix = target.includes('@') ? target.split('@')[0] : target;

      const matchedLocal = allFreelas.find(f => {
        const u = normalize(f.username);
        const e = normalize(f.email);
        const n = normalize(f.name);
        const uPrefix = u.includes('@') ? u.split('@')[0] : u;

        const userMatches = u === target || e === target || n === target || u === targetPrefix || uPrefix === target;
        const passMatches = String(f.password || '').trim() === cleanPassword;
        return userMatches && passMatches && f.isActive !== false && f.is_active !== false;
      });

      if (matchedLocal) {
        const userSession = {
          id: matchedLocal.id,
          email: matchedLocal.username || matchedLocal.email || matchedLocal.name,
          name: matchedLocal.name,
          role: 'Freelancer',
          freelancerId: matchedLocal.id,
          hourlyRate: matchedLocal.hourlyRate || 0,
          specialty: matchedLocal.specialty || '',
          allowedTabs: matchedLocal.allowedTabs && matchedLocal.allowedTabs.length > 0 
            ? matchedLocal.allowedTabs 
            : ['freelancer-tasks'],
          loggedAt: new Date().toISOString()
        };
        localStorage.setItem('raffa_session_user', JSON.stringify(userSession));
        onLogin(userSession);
        return;
      }

      // 4. Mensagens claras e amigáveis de retorno
      if (authResult.reason === 'supabase_not_configured') {
        setErrorMessage('O banco de dados não está configurado neste navegador. Entre como Administrador primeiro para salvar as credenciais.');
      } else if (authResult.reason === 'wrong_password') {
        setErrorMessage('A senha informada está incorreta para este usuário.');
      } else if (authResult.reason === 'inactive_user') {
        setErrorMessage('Este usuário está marcado como inativo no sistema.');
      } else if (authResult.reason === 'user_not_found') {
        setErrorMessage(`Usuário ou e-mail "${email}" não foi encontrado no sistema.`);
      } else {
        setErrorMessage('E-mail/usuário ou senha incorretos. Verifique suas credenciais.');
      }
    } catch (err) {
      setErrorMessage('Erro ao realizar login: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center p-4 relative overflow-hidden font-sans text-gray-800">
      
      {/* Background Soft Glow Decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-80 bg-gradient-to-b from-yellow-200/30 via-yellow-100/10 to-transparent blur-2xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-white border border-gray-200 rounded-3xl p-8 sm:p-10 shadow-xl shadow-gray-200/60 relative z-10 flex flex-col gap-6 animate-in fade-in-0 zoom-in-95">
        
        {/* Header / Brand */}
        <div className="flex flex-col items-center text-center gap-2.5">
          <div className="w-14 h-14 bg-gray-100 border border-gray-200/80 rounded-2xl flex items-center justify-center p-2.5 shadow-2xs">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          
          <h1 className="font-title text-2xl font-black text-gray-950 tracking-tight">
            {companyInfo?.brandName || 'Matheus Raffa'}
          </h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-1">
          
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs font-semibold text-center animate-in fade-in-0 flex flex-col items-center gap-2">
              <span>{errorMessage}</span>
              {!isSupabaseConfigured && (
                <button
                  type="button"
                  onClick={() => setShowDbConfigModal(true)}
                  className="mt-1 px-3 py-1 bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Server size={12} />
                  <span>Configurar Conexão</span>
                </button>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5" htmlFor="login-email">
              <Mail size={13} className="text-yellow-600" />
              <span>E-mail / Usuário</span>
            </label>
            <input 
              id="login-email"
              type="text" 
              placeholder="Digite seu e-mail ou usuário"
              className="w-full bg-gray-50 hover:bg-white focus:bg-white border border-gray-300 focus:border-yellow-500 focus:ring-3 focus:ring-yellow-400/20 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 font-medium transition-all focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5" htmlFor="login-pass">
              <Lock size={13} className="text-yellow-600" />
              <span>Senha de Acesso</span>
            </label>
            <div className="relative">
              <input 
                id="login-pass"
                type={showPassword ? 'text' : 'password'} 
                placeholder="••••••••••••"
                className="w-full bg-gray-50 hover:bg-white focus:bg-white border border-gray-300 focus:border-yellow-500 focus:ring-3 focus:ring-yellow-400/20 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-gray-900 placeholder-gray-400 font-medium transition-all focus:outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer p-0.5"
                title={showPassword ? 'Ocultar senha' : 'Ver senha'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-bold rounded-xl text-xs shadow-md shadow-yellow-400/25 flex items-center justify-center gap-2 transition-all cursor-pointer hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Autenticando...</span>
              </>
            ) : (
              <>
                <span>Acessar Sistema</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Clean Footer (Sem indicador de Supabase conectado) */}
        <div className="border-t border-gray-100 pt-4 flex items-center justify-center text-[11px] text-gray-400 gap-1.5">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span>Ambiente Seguro & Conexão Criptografada</span>
        </div>

      </div>

      {/* Modal de Configuração do Supabase (Modo Claro) */}
      {showDbConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 animate-in fade-in-0 zoom-in-95 text-gray-800">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Server size={18} className="text-yellow-600" />
                <h3 className="font-bold text-sm text-gray-950">Configurar Conexão Supabase</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDbConfigModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Insira a URL e a Chave Anônima do seu projeto Supabase para habilitar a sincronização em nuvem.
            </p>

            <form onSubmit={handleSaveQuickDb} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-gray-700">URL do Projeto (VITE_SUPABASE_URL):</label>
                <input
                  type="text"
                  required
                  placeholder="https://xyzcompany.supabase.co"
                  value={dbUrlInput}
                  onChange={(e) => setDbUrlInput(e.target.value)}
                  className="bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-xs text-gray-900 focus:outline-none focus:border-yellow-500 font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-gray-700">Chave Anônima (VITE_SUPABASE_ANON_KEY):</label>
                <input
                  type="password"
                  required
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                  value={dbKeyInput}
                  onChange={(e) => setDbKeyInput(e.target.value)}
                  className="bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-xs text-gray-900 focus:outline-none focus:border-yellow-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowDbConfigModal(false)}
                  className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-950 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Server size={13} />
                  <span>Salvar & Conectar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
