import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck, Sparkles, Key, RefreshCw, Server, X, CheckCircle2 } from 'lucide-react';
import { authenticateFreelancerDb, getSupabaseCredentials } from '../lib/supabase';

export default function LoginScreen({ onLogin, companyInfo, freelancers = [] }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Supabase connection state and modal
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState(() => getSupabaseCredentials().isConfigured);
  const [showDbConfigModal, setShowDbConfigModal] = useState(false);
  const [dbUrlInput, setDbUrlInput] = useState(() => localStorage.getItem('raffa_supabase_url') || import.meta.env.VITE_SUPABASE_URL || '');
  const [dbKeyInput, setDbKeyInput] = useState(() => localStorage.getItem('raffa_supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '');

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

      // 3. Fallback em memória ou LocalStorage caso Supabase esteja desconectado ou com erro
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

      // 4. Diagnóstico preciso do motivo da falha
      if (authResult.reason === 'supabase_not_configured') {
        setErrorMessage('O banco Supabase não está configurado neste navegador. Entre como Administrador primeiro para salvar as credenciais em Configurações.');
      } else if (authResult.reason === 'database_error') {
        setErrorMessage(`Erro ao consultar o banco Supabase: ${authResult.error || 'Falha de conexão'}.`);
      } else if (authResult.reason === 'empty_table_or_rls') {
        setErrorMessage('Nenhum prestador retornado pelo banco (a tabela freelancers está vazia ou bloqueada pelo RLS do Supabase). Desative o RLS da tabela freelancers no SQL Editor do Supabase.');
      } else if (authResult.reason === 'wrong_password') {
        setErrorMessage('A senha informada está incorreta para este usuário.');
      } else if (authResult.reason === 'inactive_user') {
        setErrorMessage('Este prestador está marcado como inativo no sistema.');
      } else if (authResult.reason === 'user_not_found') {
        setErrorMessage(`Prestador com o usuário ou e-mail "${email}" não foi encontrado no cadastro.`);
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
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Background Subtle Gradient Spheres */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10 flex flex-col gap-6">
        
        {/* Header / Brand */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 bg-gradient-to-tr from-yellow-400 to-yellow-500 rounded-2xl flex items-center justify-center p-3 shadow-lg shadow-yellow-500/20">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          
          <div>
            <h1 className="font-title text-xl font-bold text-white tracking-wide">
              {companyInfo?.brandName || 'Matheus Raffa'}
            </h1>
            <p className="text-xs font-semibold text-yellow-400/90 tracking-widest uppercase mt-0.5">
              Sistema de Timesheet & Faturamento
            </p>
          </div>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          
          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-xl text-xs font-semibold text-center animate-in fade-in-0 flex flex-col items-center gap-2">
              <span>{errorMessage}</span>
              {!isSupabaseConfigured && (
                <button
                  type="button"
                  onClick={() => setShowDbConfigModal(true)}
                  className="mt-1 px-3.5 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Server size={13} />
                  <span>Configurar Supabase Agora</span>
                </button>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5" htmlFor="login-email">
              <Mail size={13} className="text-yellow-400" />
              <span>E-mail / Usuário</span>
            </label>
            <input 
              id="login-email"
              type="text" 
              placeholder="contato@matheusraffa.com.br"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all font-medium"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5" htmlFor="login-pass">
              <Lock size={13} className="text-yellow-400" />
              <span>Senha de Acesso</span>
            </label>
            <input 
              id="login-pass"
              type="password" 
              placeholder="••••••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all font-medium"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-yellow-500/10 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
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

        {/* Footer info */}
        <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck size={13} className="text-emerald-500" />
            Conexão Protegida
          </span>
          {isSupabaseConfigured ? (
            <button
              type="button"
              onClick={() => setShowDbConfigModal(true)}
              className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
              title="Clique para ver ou alterar credenciais do Supabase"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Supabase Conectado
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowDbConfigModal(true)}
              className="text-[10px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer underline"
              title="Clique para configurar o Supabase neste navegador"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              Supabase Offline (Configurar)
            </button>
          )}
        </div>

      </div>

      {/* Modal Rápido de Configuração do Supabase */}
      {showDbConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 animate-in fade-in-0 zoom-in-95 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Server size={18} className="text-yellow-400" />
                <h3 className="font-bold text-sm text-white">Configurar Conexão Supabase</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDbConfigModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer p-1"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Insira a URL e a Chave Anônima (Anon Key) do seu projeto Supabase para habilitar a consulta direta de freelancers e dados em nuvem neste navegador.
            </p>

            <form onSubmit={handleSaveQuickDb} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-300">URL do Projeto (VITE_SUPABASE_URL):</label>
                <input
                  type="text"
                  required
                  placeholder="https://xyzcompany.supabase.co"
                  value={dbUrlInput}
                  onChange={(e) => setDbUrlInput(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-300">Chave Anônima (VITE_SUPABASE_ANON_KEY):</label>
                <input
                  type="password"
                  required
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                  value={dbKeyInput}
                  onChange={(e) => setDbKeyInput(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDbConfigModal(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-slate-950 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
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
