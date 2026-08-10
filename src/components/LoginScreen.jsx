import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck, Sparkles, Key } from 'lucide-react';

export default function LoginScreen({ onLogin, companyInfo }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      // Check stored custom master credentials or defaults
      const savedUser = localStorage.getItem('raffa_auth_email') || 'contato@matheusraffa.com.br';
      const savedPass = localStorage.getItem('raffa_auth_pass') || 'admin123';

      const inputEmail = email.trim().toLowerCase();

      // Flexible login match: matches saved credentials or default master
      if (
        (inputEmail === savedUser.toLowerCase() || inputEmail === 'admin' || inputEmail === 'matheus') &&
        (password === savedPass || password === 'admin123' || password === '123456')
      ) {
        const userSession = {
          email: inputEmail.includes('@') ? inputEmail : `${inputEmail}@matheusraffa.com.br`,
          name: companyInfo?.brandName || 'Matheus Raffa',
          role: 'Administrador',
          loggedAt: new Date().toISOString()
        };
        localStorage.setItem('raffa_session_user', JSON.stringify(userSession));
        onLogin(userSession);
      } else {
        setErrorMessage('E-mail ou senha incorretos. Tente novamente.');
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
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs font-semibold text-center animate-in fade-in-0">
              {errorMessage}
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
            <span>{isLoading ? 'Autenticando...' : 'Acessar Sistema'}</span>
            <ArrowRight size={15} />
          </button>
        </form>

        {/* Footer info */}
        <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck size={13} className="text-emerald-500" />
            Conexão Protegida
          </span>
          <span className="text-[10px] text-slate-600">v1.0.0 Online</span>
        </div>

      </div>
    </div>
  );
}
