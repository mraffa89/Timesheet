import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  FileText, 
  Upload, 
  Download, 
  RefreshCw,
  Cloud, 
  CloudOff, 
  Server, 
  Settings as SettingsIcon,
  AlertTriangle,
  Building,
  Save,
  Mail,
  CheckCircle2,
  DollarSign,
  LogOut,
  Key,
  Briefcase,
  Tag,
  Edit2,
  Trash2,
  Plus,
  X,
  MessageSquare,
  MessageCircle,
  Smartphone,
  Eye,
  EyeOff,
  Send
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import ClientManager from './components/ClientManager';
import TimesheetTable from './components/TimesheetTable';
import InvoiceView from './components/InvoiceView';
import ImportModal from './components/ImportModal';
import ConfirmModal from './components/ConfirmModal';
import LoginScreen from './components/LoginScreen';
import FreelancerManager from './components/FreelancerManager';
import FreelancerPortal from './components/FreelancerPortal';

import { defaultClients, defaultEntries } from './data/seedData';
import { testSmtpConnection } from './utils/smtpService';
import { 
  DEFAULT_EVOLUTION_NOTIFICATION_TEMPLATE, 
  testEvolutionConnection 
} from './utils/evolutionService';

// Supabase Connection Import
import { 
  DEFAULT_SUPABASE_URL,
  DEFAULT_SUPABASE_ANON_KEY,
  checkSupabaseConfigured,
  isSupabaseConfigured,
  getClientsDb,
  addClientDb,
  updateClientDb,
  deleteClientDb,
  clearAllClientsDb,
  getEntriesDb,
  addEntryDb,
  updateEntryDb,
  deleteEntryDb,
  clearAllEntriesDb,
  addEntriesBulkDb,
  getSupabaseInstance,
  getFreelancersDb,
  addFreelancerDb,
  updateFreelancerDb,
  deleteFreelancerDb,
  getFreelancerTasksDb,
  addFreelancerTaskDb,
  updateFreelancerTaskDb,
  deleteFreelancerTaskDb
} from './lib/supabase';
import { testAsaasConnection } from './utils/asaasIntegration';

const defaultCompanyProfile = {
  brandName: 'Matheus Raffa',
  brandSubtitle: 'Inteligência Digital',
  legalName: 'MHB Raffa Design Estratégico LTDA',
  cnpj: '00.000.000/0001-00',
  email: 'contato@matheusraffa.com.br',
  phone: '(19) 99630-7776',
  website: 'matheusraffa.com.br',
  city: 'Campinas / SP'
};

const defaultEmailSubject = 'Demonstrativo de Serviços Técnicos - {cliente} ({mes_extenso})';

const defaultEmailBody = `Olá, equipe {cliente}!

Segue em anexo o Demonstrativo de Serviços Técnicos referente ao mês de {mes_extenso}.

Resumo do Fechamento:
• Total de Horas Técnicas: {horas_tecnicas}h
• Valor Total Faturado: {valor_total}
• Data de Vencimento: {data_vencimento}

Link direto para acessar a fatura online e pagamento:
{link_fatura}

Chave PIX Copia e Cola:
{pix_copia_cola}

O documento em anexo (PDF) contém o detalhamento completo de todas as demandas e tarefas executadas no período.

Permanecemos à disposição para eventuais dúvidas.

Atenciosamente,
{minha_empresa}
{meu_telefone} | {meu_email}`;

const defaultFreelancerEmailSubject = 'Comprovante de Pagamento PIX - Fechamento de Demandas - {nome_freelancer}';

const defaultFreelancerEmailBody = `Olá, {primeiro_nome}!

Informamos que o seu pagamento referente às demandas prestadas foi efetuado via PIX com sucesso!

📋 RESUMO DO FECHAMENTO:
• Período de Referência: {periodo_referencia}
• Quantidade de Demandas: {quantidade_demandas}
• Total de Horas Realizadas: {total_horas}h
• Valor Total Quitado: {valor_total}
• Favorecido: {nome_freelancer}
• Chave PIX: {chave_pix}
• ID da Transação Asaas: {id_transacao_pix}
• Data da Quitação: {data_pagamento}

DEMANDAS QUITADAS:
{lista_demandas}

O relatório completo e detalhado com todas as atividades executadas segue em anexo em formato PDF.

Atenciosamente,
{minha_empresa}
{meu_telefone} | {meu_email}`;

function App() {
  const [userSession, setUserSession] = useState(() => {
    try {
      const saved = localStorage.getItem('raffa_session_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [authEmailForm, setAuthEmailForm] = useState(() => localStorage.getItem('raffa_auth_email') || 'contato@matheusraffa.com.br');
  const [authPassForm, setAuthPassForm] = useState(() => localStorage.getItem('raffa_auth_pass') || 'admin123');
  const [authSuccessMessage, setAuthSuccessMessage] = useState(false);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [clients, setClients] = useState([]);
  const [entries, setEntries] = useState([]);
  const [freelancers, setFreelancers] = useState([]);
  const [freelancerTasks, setFreelancerTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [asaasToken, setAsaasToken] = useState(localStorage.getItem('raffa_asaas_token') || '');
  const [asaasEnv, setAsaasEnv] = useState(localStorage.getItem('raffa_asaas_env') || 'sandbox');
  const [asaasAutoNfe, setAsaasAutoNfe] = useState(() => localStorage.getItem('raffa_asaas_auto_nfe') !== 'false');
  const [asaasTestStatus, setAsaasTestStatus] = useState(null);

  // Global Default Hourly Rate (Default: R$ 200)
  const [defaultHourlyRate, setDefaultHourlyRate] = useState(() => localStorage.getItem('raffa_default_hourly_rate') || '200');
  
  // Supabase Connection Settings
  const [supabaseUrl, setSupabaseUrl] = useState(() => localStorage.getItem('raffa_supabase_url') || import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(() => localStorage.getItem('raffa_supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY || '');
  const [supabaseTestStatus, setSupabaseTestStatus] = useState(null);

  // SMTP Email Server Settings
  const [smtpHost, setSmtpHost] = useState(() => localStorage.getItem('raffa_smtp_host') || '');
  const [smtpPort, setSmtpPort] = useState(() => localStorage.getItem('raffa_smtp_port') || '587');
  const [smtpUser, setSmtpUser] = useState(() => localStorage.getItem('raffa_smtp_user') || '');
  const [smtpPass, setSmtpPass] = useState(() => localStorage.getItem('raffa_smtp_pass') || '');
  const [smtpSender, setSmtpSender] = useState(() => localStorage.getItem('raffa_smtp_sender') || '');
  const [smtpTestStatus, setSmtpTestStatus] = useState(null);

  // Email Template Settings (Clientes)
  const [emailSubjectTemplate, setEmailSubjectTemplate] = useState(() => localStorage.getItem('raffa_email_subject_tpl') || defaultEmailSubject);
  const [emailBodyTemplate, setEmailBodyTemplate] = useState(() => localStorage.getItem('raffa_email_body_tpl') || defaultEmailBody);

  // Email Template Settings (Freelancers / Prestadores)
  const [freelancerEmailSubjectTemplate, setFreelancerEmailSubjectTemplate] = useState(() => localStorage.getItem('raffa_freelancer_email_subject_tpl') || defaultFreelancerEmailSubject);
  const [freelancerEmailBodyTemplate, setFreelancerEmailBodyTemplate] = useState(() => localStorage.getItem('raffa_freelancer_email_body_tpl') || defaultFreelancerEmailBody);

  // Evolution API (WhatsApp) Settings
  const [evolutionApiUrl, setEvolutionApiUrl] = useState(() => localStorage.getItem('raffa_evolution_api_url') || '');
  const [evolutionInstance, setEvolutionInstance] = useState(() => localStorage.getItem('raffa_evolution_instance') || '');
  const [evolutionApiKey, setEvolutionApiKey] = useState(() => localStorage.getItem('raffa_evolution_api_key') || '');
  const [evolutionNotificationTemplate, setEvolutionNotificationTemplate] = useState(() => localStorage.getItem('raffa_evolution_notification_tpl') || DEFAULT_EVOLUTION_NOTIFICATION_TEMPLATE);
  const [showEvolutionApiKey, setShowEvolutionApiKey] = useState(false);
  const [evolutionTestStatus, setEvolutionTestStatus] = useState(null);

  // Company Profile Settings for Invoices
  const [companyInfo, setCompanyInfo] = useState(() => {
    const saved = localStorage.getItem('raffa_company_info');
    if (saved) {
      try {
        return { ...defaultCompanyProfile, ...JSON.parse(saved) };
      } catch (e) {}
    }
    return defaultCompanyProfile;
  });

  const [companyForm, setCompanyForm] = useState(() => ({
    brandName: companyInfo?.brandName || defaultCompanyProfile.brandName,
    brandSubtitle: companyInfo?.brandSubtitle || defaultCompanyProfile.brandSubtitle,
    legalName: companyInfo?.legalName || defaultCompanyProfile.legalName,
    cnpj: companyInfo?.cnpj || defaultCompanyProfile.cnpj,
    email: companyInfo?.email || defaultCompanyProfile.email,
    phone: companyInfo?.phone || defaultCompanyProfile.phone,
    website: companyInfo?.website || defaultCompanyProfile.website,
    city: companyInfo?.city || defaultCompanyProfile.city
  }));

  const [savedSuccessMessage, setSavedSuccessMessage] = useState(false);

  // Service Categories Management State
  const [serviceCategories, setServiceCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('raffa_service_categories_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
      'Digital',
      'Material Impresso',
      'Folheto / Catálogo',
      'Rede Social / Post',
      'Anúncio / Tráfego',
      'Landing Page / Site',
      'Vídeo / Motion',
      'Outro'
    ];
  });
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [editingCategoryIndex, setEditingCategoryIndex] = useState(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState('');

  // Modals visibility
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Load data from Supabase or LocalStorage fallback (100% Clean initial load)
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      if (checkSupabaseConfigured()) {
        try {
          const dbClients = await getClientsDb();
          const dbEntries = await getEntriesDb();
          let dbFreelancers = [];
          let dbTasks = [];
          try {
            dbFreelancers = await getFreelancersDb();
            dbTasks = await getFreelancerTasksDb();
          } catch (eFreela) {
            console.warn("Tabelas de freelancers ainda não migradas no Supabase, usando LocalStorage:", eFreela);
            const localFreelas = localStorage.getItem('raffa_freelancers_v1');
            const localTasks = localStorage.getItem('raffa_freelancer_tasks_v1');
            dbFreelancers = localFreelas ? JSON.parse(localFreelas) : [];
            dbTasks = localTasks ? JSON.parse(localTasks) : [];
          }

          let finalTasks = dbTasks || [];
          const localTasksRaw = localStorage.getItem('raffa_freelancer_tasks_v1');
          const localTasks = localTasksRaw ? JSON.parse(localTasksRaw) : [];
          const localTasksMap = new Map(localTasks.map(t => [t.id, t]));

          const tasksToSyncBack = [];
          if (finalTasks.length > 0 && localTasks.length > 0) {
            finalTasks = finalTasks.map(dbTask => {
              const local = localTasksMap.get(dbTask.id);
              if (local) {
                const hasLocalPaid = local.status === 'paid' && dbTask.status !== 'paid';
                const hasLocalPaymentDetails = local.paymentId && !dbTask.paymentId;
                if (hasLocalPaid || hasLocalPaymentDetails) {
                  const merged = {
                    ...dbTask,
                    status: local.status || dbTask.status,
                    paymentId: local.paymentId || dbTask.paymentId,
                    paymentDate: local.paymentDate || dbTask.paymentDate,
                    paymentValue: local.paymentValue || dbTask.paymentValue,
                    paymentReceiptUrl: local.paymentReceiptUrl || dbTask.paymentReceiptUrl
                  };
                  tasksToSyncBack.push(merged);
                  return merged;
                }
              }
              return dbTask;
            });
          } else if (finalTasks.length === 0 && localTasks.length > 0) {
            finalTasks = localTasks;
          }

          setClients(dbClients || []);
          setEntries(dbEntries || []);
          setFreelancers(dbFreelancers || []);
          setFreelancerTasks(finalTasks);
          localStorage.setItem('raffa_freelancer_tasks_v1', JSON.stringify(finalTasks));

          // Sincroniza em segundo plano de volta com o Supabase caso tenha havido recuperação de tarefas pagas
          if (tasksToSyncBack.length > 0) {
            setTimeout(() => {
              tasksToSyncBack.forEach(task => {
                updateFreelancerTaskDb(task.id, {
                  status: task.status,
                  paymentId: task.paymentId,
                  paymentDate: task.paymentDate,
                  paymentValue: task.paymentValue,
                  paymentReceiptUrl: task.paymentReceiptUrl
                }).catch(e => console.warn("Aviso ao sincronizar tarefa paga com o Supabase:", e));
              });
            }, 1200);
          }

          setIsOnline(true);
        } catch (err) {
          console.error("Supabase load error, falling back to LocalStorage:", err);
          loadLocalStorageFallback();
        }
      } else {
        loadLocalStorageFallback();
      }
      setIsLoading(false);
    }

    loadData();
  }, []);

  const saveClients = (newClients) => {
    setClients(newClients);
    localStorage.setItem('raffa_billing_clients_v4', JSON.stringify(newClients));
  };

  const saveEntries = (newEntries) => {
    setEntries(newEntries);
    localStorage.setItem('raffa_billing_entries_v4', JSON.stringify(newEntries));
  };

  const saveFreelancers = (newFreelas) => {
    setFreelancers(newFreelas);
    localStorage.setItem('raffa_freelancers_v1', JSON.stringify(newFreelas));
  };

  const saveFreelancerTasks = (newTasks) => {
    setFreelancerTasks(newTasks);
    localStorage.setItem('raffa_freelancer_tasks_v1', JSON.stringify(newTasks));
  };

  const loadLocalStorageFallback = () => {
    setIsOnline(false);
    const localClients = localStorage.getItem('raffa_billing_clients_v4');
    const localEntries = localStorage.getItem('raffa_billing_entries_v4');
    const localFreelas = localStorage.getItem('raffa_freelancers_v1');
    const localTasks = localStorage.getItem('raffa_freelancer_tasks_v1');

    setClients(localClients ? JSON.parse(localClients) : []);
    setEntries(localEntries ? JSON.parse(localEntries) : []);
    setFreelancers(localFreelas ? JSON.parse(localFreelas) : []);
    setFreelancerTasks(localTasks ? JSON.parse(localTasks) : []);
  };

  const handleSaveCompanyInfo = (e) => {
    e.preventDefault();
    setCompanyInfo(companyForm);
    localStorage.setItem('raffa_company_info', JSON.stringify(companyForm));
    setSavedSuccessMessage(true);
    setTimeout(() => setSavedSuccessMessage(false), 3000);
  };

  const handleTestSupabaseConnection = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      setSupabaseTestStatus({ type: 'error', text: 'Preencha a URL e a Chave Anônima (Anon Key) do Supabase.' });
      return;
    }
    try {
      localStorage.setItem('raffa_supabase_url', supabaseUrl.trim());
      localStorage.setItem('raffa_supabase_anon_key', supabaseAnonKey.trim());
      
      const db = getSupabaseInstance();
      if (!db) throw new Error('Falha ao inicializar o cliente Supabase.');

      const { data, error } = await db.from('clients').select('id').limit(1);
      if (error) throw error;

      setSupabaseTestStatus({ type: 'success', text: '✓ Conexão com o Supabase estabelecida com sucesso! Tabelas verificadas no banco.' });
      setIsOnline(true);
    } catch (err) {
      setSupabaseTestStatus({ type: 'error', text: `Erro ao conectar: ${err.message || 'Verifique suas credenciais e se rodou o script SQL no Supabase.'}` });
    }
  };

  const handleSaveAsaasSettings = async () => {
    if (!asaasToken.trim()) {
      setAsaasTestStatus({ type: 'error', text: 'Por favor, informe a Chave de API (Token) do Asaas.' });
      return;
    }
    localStorage.setItem('raffa_asaas_token', asaasToken.trim());
    localStorage.setItem('raffa_asaas_env', asaasEnv);
    localStorage.setItem('raffa_asaas_auto_nfe', asaasAutoNfe.toString());
    
    setAsaasTestStatus({ type: 'info', text: 'Testando conexão através do túnel proxy com a API do Asaas...' });
    try {
      await testAsaasConnection(asaasToken.trim(), asaasEnv);
      setAsaasTestStatus({ type: 'success', text: '✓ Token do Asaas salvo e validado com sucesso com a API!' });
    } catch (err) {
      setAsaasTestStatus({ type: 'error', text: `Token salvo, mas a API do Asaas retornou: ${err.message}. Verifique se o ambiente (${asaasEnv === 'production' ? 'Produção' : 'Sandbox'}) corresponde à chave informada.` });
    }
  };

  const handleSaveAndTestSmtpConnection = async () => {
    if (!smtpHost.trim()) {
      setSmtpTestStatus({ type: 'error', text: 'Por favor, informe o Servidor SMTP (Host) (ex: smtp.gmail.com ou smtp.titan.email).' });
      return;
    }
    if (!smtpUser.trim() || !smtpPass.trim()) {
      setSmtpTestStatus({ type: 'error', text: 'Por favor, preencha o Usuário/E-mail de autenticação e a Senha/Token de App.' });
      return;
    }

    localStorage.setItem('raffa_smtp_host', smtpHost.trim());
    localStorage.setItem('raffa_smtp_port', smtpPort.trim());
    localStorage.setItem('raffa_smtp_user', smtpUser.trim());
    localStorage.setItem('raffa_smtp_pass', smtpPass.trim());
    localStorage.setItem('raffa_smtp_sender', smtpSender.trim());

    setSmtpTestStatus({ type: 'info', text: 'Conectando ao servidor SMTP e autenticando credenciais em tempo real...' });

    try {
      await testSmtpConnection({
        host: smtpHost.trim(),
        port: smtpPort.trim(),
        user: smtpUser.trim(),
        pass: smtpPass.trim(),
        sender: smtpSender.trim()
      });
      setSmtpTestStatus({ 
        type: 'success', 
        text: `✓ Conexão SMTP autenticada e validada com sucesso! Servidor ${smtpHost.trim()}:${smtpPort.trim()} pronto para envios diretos com anexo em PDF através de "${smtpUser.trim()}".` 
      });
    } catch (err) {
      setSmtpTestStatus({
        type: 'error',
        text: `Falha ao autenticar no servidor SMTP: ${err.message}`
      });
    }
  };

  const handleSaveAndTestEvolution = async () => {
    if (!evolutionApiUrl.trim()) {
      setEvolutionTestStatus({ type: 'error', text: 'Por favor, informe a URL da Evolution API (ex: https://api.meudominio.com.br).' });
      return;
    }
    if (!evolutionInstance.trim() || !evolutionApiKey.trim()) {
      setEvolutionTestStatus({ type: 'error', text: 'Por favor, preencha o Nome da Instância e a API Key (Token).' });
      return;
    }

    localStorage.setItem('raffa_evolution_api_url', evolutionApiUrl.trim());
    localStorage.setItem('raffa_evolution_instance', evolutionInstance.trim());
    localStorage.setItem('raffa_evolution_api_key', evolutionApiKey.trim());
    localStorage.setItem('raffa_evolution_notification_tpl', evolutionNotificationTemplate);

    setEvolutionTestStatus({ type: 'info', text: 'Consultando status da instância na Evolution API em tempo real...' });

    try {
      const res = await testEvolutionConnection({
        serverUrl: evolutionApiUrl.trim(),
        instance: evolutionInstance.trim(),
        apiKey: evolutionApiKey.trim()
      });
      setEvolutionTestStatus({
        type: 'success',
        text: `✓ ${res.message || 'Instância conectada com sucesso ao WhatsApp!'}`
      });
    } catch (err) {
      setEvolutionTestStatus({
        type: 'error',
        text: `Falha ao conectar com a Evolution API: ${err.message}`
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('raffa_session_user');
    setUserSession(null);
  };

  const handleSaveAuthCredentials = (e) => {
    e.preventDefault();
    localStorage.setItem('raffa_auth_email', authEmailForm.trim());
    localStorage.setItem('raffa_auth_pass', authPassForm.trim());
    setAuthSuccessMessage(true);
    setTimeout(() => setAuthSuccessMessage(false), 3000);
  };

  const handleResetSystem = async () => {
    if (window.confirm("Deseja realmente ZERAR todos os dados do sistema? Isso apagará todas as demandas (Timesheet) e reinicializará a lista de clientes para você realizar uma sincronização limpa do Asaas e um novo upload do CSV do Planyway.")) {
      localStorage.removeItem('raffa_billing_clients_v4');
      localStorage.removeItem('raffa_billing_entries_v4');
      
      if (isOnline) {
        try {
          await clearAllEntriesDb();
          await clearAllClientsDb();
        } catch (e) {
          console.error("Erro ao limpar dados no Supabase:", e);
        }
      }

      setClients([]);
      setEntries([]);
      saveClients([]);
      saveEntries([]);
      alert("Todos os dados do sistema foram zerados com sucesso!\n\nAgora você pode clicar em 'Sincronizar clientes ASAAS' para puxar seus clientes atualizados e depois subir o arquivo CSV do Planyway.");
      setActiveTab('clients');
    }
  };

  // Client Management Handlers
  const handleAddClient = async (clientData) => {
    if (isOnline) {
      try {
        const saved = await addClientDb(clientData);
        setClients([...clients, saved]);
        return saved;
      } catch (err) {
        alert("Erro ao salvar no Supabase. " + err.message);
      }
    } else {
      const newClient = {
        ...clientData,
        id: `client-${Date.now()}`
      };
      const nextClients = [...clients, newClient];
      setClients(nextClients);
      saveClients(nextClients);
      return newClient;
    }
  };

  const handleUpdateClient = async (updatedClient) => {
    if (isOnline) {
      try {
        const { id, created_at, ...rest } = updatedClient;
        const saved = await updateClientDb(id, rest);
        setClients(clients.map(c => c.id === id ? saved : c));
      } catch (err) {
        alert("Erro ao atualizar no Supabase. " + err.message);
      }
    } else {
      const nextClients = clients.map(c => c.id === updatedClient.id ? updatedClient : c);
      saveClients(nextClients);
    }
  };

  const handleDeleteClient = (clientId) => {
    const hasEntries = entries.some(e => e.clientId === clientId);
    const clientName = clients.find(c => c.id === clientId)?.name || 'Cliente';
    
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar Exclusão de Cliente',
      message: hasEntries 
        ? `Atenção: O cliente "${clientName}" possui lançamentos de horas associados. Ao excluí-lo, todos os lançamentos também serão excluídos permanentemente do banco de dados. Deseja continuar?`
        : `Deseja realmente excluir o cliente "${clientName}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        if (isOnline) {
          try {
            await deleteClientDb(clientId);
            setClients(clients.filter(c => c.id !== clientId));
            setEntries(entries.filter(e => e.clientId !== clientId));
          } catch (err) {
            alert("Erro ao excluir no Supabase: " + err.message);
          }
        } else {
          const nextClients = clients.filter(c => c.id !== clientId);
          const nextEntries = entries.filter(e => e.clientId !== clientId);
          saveClients(nextClients);
          saveEntries(nextEntries);
        }
      }
    });
  };

  const handleMergeClients = async (sourceClientId, targetClientId) => {
    const sourceClient = clients.find(c => c.id === sourceClientId);
    const targetClient = clients.find(c => c.id === targetClientId);
    if (!sourceClient || !targetClient) return;

    // 1. Atualizar todas as entradas do Timesheet
    const nextEntries = entries.map(e => e.clientId === sourceClientId ? { ...e, clientId: targetClientId } : e);
    setEntries(nextEntries);
    saveEntries(nextEntries);

    // 2. Atualizar todas as demandas de freelancers
    const nextTasks = freelancerTasks.map(t => t.clientId === sourceClientId ? { ...t, clientId: targetClientId } : t);
    saveFreelancerTasks(nextTasks);

    // 3. Remover cliente de origem
    const nextClients = clients.filter(c => c.id !== sourceClientId);
    setClients(nextClients);
    saveClients(nextClients);

    // 4. Sincronizar com Supabase se online
    if (isOnline) {
      try {
        const db = getSupabaseInstance();
        if (db) {
          await db.from('entries').update({ client_id: targetClientId }).eq('client_id', sourceClientId);
          await db.from('freelancer_tasks').update({ client_id: targetClientId }).eq('client_id', sourceClientId);
        }
        await deleteClientDb(sourceClientId);
      } catch (err) {
        console.warn("Aviso ao sincronizar mesclagem no Supabase:", err);
      }
    }

    alert(`Cliente "${sourceClient.name}" mesclado com sucesso em "${targetClient.name}"!`);
  };

  // Time Entry Management Handlers
  const handleAddEntry = async (entryData) => {
    if (isOnline) {
      try {
        const saved = await addEntryDb(entryData);
        setEntries([saved, ...entries]);
      } catch (err) {
        alert("Erro ao lançar no Supabase. " + err.message);
      }
    } else {
      const newEntry = {
        ...entryData,
        id: `entry-${Date.now()}`
      };
      const nextEntries = [newEntry, ...entries];
      saveEntries(nextEntries);
    }
  };

  const handleUpdateEntry = async (updatedEntry) => {
    if (isOnline) {
      try {
        const { id, created_at, ...rest } = updatedEntry;
        const saved = await updateEntryDb(id, rest);
        setEntries(entries.map(e => e.id === id ? saved : e));
      } catch (err) {
        alert("Erro ao atualizar no Supabase. " + err.message);
      }
    } else {
      const nextEntries = entries.map(e => e.id === updatedEntry.id ? updatedEntry : e);
      saveEntries(nextEntries);
    }
  };

  const handleDeleteEntry = (entryId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar Exclusão de Lançamento',
      message: 'Deseja realmente excluir este lançamento de horas? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        if (isOnline) {
          try {
            await deleteEntryDb(entryId);
            setEntries(entries.filter(e => e.id !== entryId));
          } catch (err) {
            alert("Erro ao excluir no Supabase: " + err.message);
          }
        } else {
          const nextEntries = entries.filter(e => e.id !== entryId);
          saveEntries(nextEntries);
        }
      }
    });
  };

  // Bulk CSV Import completed
  const handleImportComplete = async (importedEntries) => {
    if (isOnline) {
      try {
        const savedList = await addEntriesBulkDb(importedEntries);
        setEntries([...savedList, ...entries]);
      } catch (err) {
        alert("Erro ao importar em lote no Supabase: " + err.message);
        return;
      }
    } else {
      const withIds = importedEntries.map((e, idx) => ({
        ...e,
        id: `entry-import-${idx}-${Date.now()}`
      }));
      const nextEntries = [...withIds, ...entries];
      saveEntries(nextEntries);
    }
    
    // Confetti effect
    import('canvas-confetti').then(module => {
      const confetti = module.default;
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#fac800', '#ffd000', '#1c1e21', '#4b5563']
      });
    }).catch(err => console.log("Confetti load error:", err));

    alert(`Sucesso! ${importedEntries.length} demandas foram consolidadas e importadas com sucesso.`);
  };

  // ═══════════════════════════════════════════════════════════════
  // Handlers de Freelancers / Prestadores de Serviço
  // ═══════════════════════════════════════════════════════════════

  const handleAddFreelancer = async (freelaData) => {
    if (isOnline) {
      try {
        const saved = await addFreelancerDb(freelaData);
        if (saved) {
          saveFreelancers([...freelancers, saved]);
        } else {
          const newFreela = { ...freelaData, id: `freela-${Date.now()}` };
          saveFreelancers([...freelancers, newFreela]);
        }
      } catch (err) {
        console.warn("Erro ao salvar prestador no Supabase, salvando localmente:", err);
        const newFreela = { ...freelaData, id: `freela-${Date.now()}` };
        saveFreelancers([...freelancers, newFreela]);
      }
    } else {
      const newFreela = { ...freelaData, id: `freela-${Date.now()}` };
      saveFreelancers([...freelancers, newFreela]);
    }
  };

  const handleUpdateFreelancer = async (updatedFreela) => {
    if (isOnline) {
      try {
        const { id, createdAt, ...rest } = updatedFreela;
        const saved = await updateFreelancerDb(id, rest);
        if (saved) {
          saveFreelancers(freelancers.map(f => f.id === id ? saved : f));
        } else {
          saveFreelancers(freelancers.map(f => f.id === updatedFreela.id ? updatedFreela : f));
        }
      } catch (err) {
        console.warn("Erro ao atualizar prestador no Supabase, salvando localmente:", err);
        saveFreelancers(freelancers.map(f => f.id === updatedFreela.id ? updatedFreela : f));
      }
    } else {
      saveFreelancers(freelancers.map(f => f.id === updatedFreela.id ? updatedFreela : f));
    }
  };

  const handleDeleteFreelancer = async (freelaId) => {
    if (isOnline) {
      try {
        await deleteFreelancerDb(freelaId);
        saveFreelancers(freelancers.filter(f => f.id !== freelaId));
      } catch (err) {
        console.warn("Erro ao excluir prestador no Supabase, excluindo localmente:", err);
        saveFreelancers(freelancers.filter(f => f.id !== freelaId));
      }
    } else {
      saveFreelancers(freelancers.filter(f => f.id !== freelaId));
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // Handlers de Demandas dos Freelancers
  // ═══════════════════════════════════════════════════════════════

  const handleAddFreelancerTask = async (taskData) => {
    if (isOnline) {
      try {
        const saved = await addFreelancerTaskDb(taskData);
        if (saved) {
          saveFreelancerTasks([saved, ...freelancerTasks]);
        } else {
          const newTask = { ...taskData, id: `task-${Date.now()}` };
          saveFreelancerTasks([newTask, ...freelancerTasks]);
        }
      } catch (err) {
        console.warn("Erro ao salvar demanda no Supabase, salvando localmente:", err);
        const newTask = { ...taskData, id: `task-${Date.now()}` };
        saveFreelancerTasks([newTask, ...freelancerTasks]);
      }
    } else {
      const newTask = { ...taskData, id: `task-${Date.now()}` };
      saveFreelancerTasks([newTask, ...freelancerTasks]);
    }
  };

  const handleUpdateFreelancerTask = async (updatedTask) => {
    if (isOnline) {
      try {
        const { id, createdAt, ...rest } = updatedTask;
        const saved = await updateFreelancerTaskDb(id, rest);
        if (saved) {
          saveFreelancerTasks(freelancerTasks.map(t => t.id === id ? saved : t));
        } else {
          saveFreelancerTasks(freelancerTasks.map(t => t.id === updatedTask.id ? updatedTask : t));
        }
      } catch (err) {
        console.warn("Erro ao atualizar demanda no Supabase, salvando localmente:", err);
        saveFreelancerTasks(freelancerTasks.map(t => t.id === updatedTask.id ? updatedTask : t));
      }
    } else {
      saveFreelancerTasks(freelancerTasks.map(t => t.id === updatedTask.id ? updatedTask : t));
    }
  };

  const handleDeleteFreelancerTask = async (taskId) => {
    if (isOnline) {
      try {
        await deleteFreelancerTaskDb(taskId);
        saveFreelancerTasks(freelancerTasks.filter(t => t.id !== taskId));
      } catch (err) {
        console.warn("Erro ao excluir demanda no Supabase, excluindo localmente:", err);
        saveFreelancerTasks(freelancerTasks.filter(t => t.id !== taskId));
      }
    } else {
      saveFreelancerTasks(freelancerTasks.filter(t => t.id !== taskId));
    }
  };

  const handleBatchUpdateFreelancerTasks = async (taskIds, updates) => {
    if (!taskIds || taskIds.length === 0) return;
    const idSet = new Set(taskIds);
    const updatedTasks = freelancerTasks.map(t => {
      if (idSet.has(t.id)) {
        return { ...t, ...updates };
      }
      return t;
    });

    if (isOnline) {
      try {
        await Promise.all(
          taskIds.map(id => updateFreelancerTaskDb(id, updates))
        );
      } catch (err) {
        console.warn("Erro ao atualizar demandas em lote no Supabase:", err);
      }
    }
    saveFreelancerTasks(updatedTasks);
  };

  const handleBatchDeleteFreelancerTasks = async (taskIds) => {
    if (!taskIds || taskIds.length === 0) return;
    const idSet = new Set(taskIds);
    if (isOnline) {
      try {
        await Promise.all(
          taskIds.map(id => deleteFreelancerTaskDb(id))
        );
      } catch (err) {
        console.warn("Erro ao excluir demandas em lote no Supabase:", err);
      }
    }
    saveFreelancerTasks(freelancerTasks.filter(t => !idSet.has(t.id)));
  };

  // ═══════════════════════════════════════════════════════════════
  // Categorias de Serviços / Demandas
  // ═══════════════════════════════════════════════════════════════

  const handleAddCategory = (newCat) => {
    const trimmed = (newCat || '').trim();
    if (!trimmed) return;
    if (serviceCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      alert('Esta categoria já existe.');
      return;
    }
    const updated = [...serviceCategories, trimmed];
    setServiceCategories(updated);
    localStorage.setItem('raffa_service_categories_v1', JSON.stringify(updated));
  };

  const handleUpdateCategory = (oldCat, newCat) => {
    const trimmed = (newCat || '').trim();
    if (!trimmed) return;
    if (trimmed.toLowerCase() !== oldCat.toLowerCase() && serviceCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      alert('Já existe outra categoria com este nome.');
      return;
    }
    const updated = serviceCategories.map(c => c === oldCat ? trimmed : c);
    setServiceCategories(updated);
    localStorage.setItem('raffa_service_categories_v1', JSON.stringify(updated));

    // Atualiza tarefas de freelancers e timesheet que usavam essa categoria
    setFreelancerTasks(prev => prev.map(t => t.category === oldCat ? { ...t, category: trimmed } : t));
    setEntries(prev => prev.map(e => e.type === oldCat ? { ...e, type: trimmed } : e));
  };

  const handleDeleteCategory = (catToDelete) => {
    if (serviceCategories.length <= 1) {
      alert('É necessário manter pelo menos uma categoria no sistema.');
      return;
    }
    if (!window.confirm(`Deseja realmente excluir a categoria "${catToDelete}"?`)) {
      return;
    }
    const updated = serviceCategories.filter(c => c !== catToDelete);
    setServiceCategories(updated);
    localStorage.setItem('raffa_service_categories_v1', JSON.stringify(updated));
  };

  const handleResetCategories = () => {
    if (window.confirm('Deseja restaurar as categorias padrão do sistema?')) {
      const defaultCats = [
        'Digital',
        'Material Impresso',
        'Folheto / Catálogo',
        'Rede Social / Post',
        'Anúncio / Tráfego',
        'Landing Page / Site',
        'Vídeo / Motion',
        'Outro'
      ];
      setServiceCategories(defaultCats);
      localStorage.setItem('raffa_service_categories_v1', JSON.stringify(defaultCats));
    }
  };

  // Backup handlers
  const handleExportBackup = () => {
    const backupData = {
      clients,
      entries,
      freelancers,
      freelancerTasks,
      serviceCategories,
      companyInfo,
      version: '1.2.0',
      exportedAt: new Date().toISOString()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `raffa_timesheet_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportBackup = (e) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (parsed.clients && parsed.entries) {
            if (isOnline) {
              if (confirm("Você está no modo Online. A restauração enviará TODOS os clientes e lançamentos do arquivo para o Supabase (pode gerar duplicatas). Deseja prosseguir?")) {
                for (const c of parsed.clients) {
                  const { id, created_at, ...rest } = c;
                  await addClientDb(rest);
                }
                const refreshedClients = await getClientsDb();
                
                const entriesToSave = parsed.entries.map(ent => {
                  const oldClient = parsed.clients.find(pc => pc.id === ent.clientId);
                  const newClient = refreshedClients.find(rc => rc.name === oldClient?.name);
                  const { id, created_at, ...rest } = ent;
                  return {
                    ...rest,
                    clientId: newClient?.id || ent.clientId
                  };
                });
                await addEntriesBulkDb(entriesToSave);
                
                const refreshedEntries = await getEntriesDb();
                setClients(refreshedClients);
                setEntries(refreshedEntries);
                alert("Backup restaurado no Supabase com sucesso!");
              }
            } else {
              saveClients(parsed.clients);
              saveEntries(parsed.entries);
              if (parsed.freelancers) {
                saveFreelancers(parsed.freelancers);
              }
              if (parsed.freelancerTasks) {
                saveFreelancerTasks(parsed.freelancerTasks);
              }
              if (parsed.serviceCategories && Array.isArray(parsed.serviceCategories)) {
                setServiceCategories(parsed.serviceCategories);
                localStorage.setItem('raffa_service_categories_v1', JSON.stringify(parsed.serviceCategories));
              }
              if (parsed.companyInfo) {
                setCompanyInfo(parsed.companyInfo);
                setCompanyForm(parsed.companyInfo);
                localStorage.setItem('raffa_company_info', JSON.stringify(parsed.companyInfo));
              }
              alert("Backup local restaurado com sucesso!");
            }
          } else {
            alert("Arquivo de backup inválido.");
          }
        } catch (err) {
          alert("Erro ao decodificar o arquivo de backup.");
        }
      };
      fileReader.readAsText(e.target.files[0]);
    }
  };

  const handleResetDatabase = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Restaurar Dados Originais de Demonstração',
      message: 'Esta ação limpará todas as modificações atuais (locais ou online no Supabase) e restaurará os dados padrões de demonstração. Deseja prosseguir?',
      onConfirm: async () => {
        if (isOnline) {
          try {
            for (const c of clients) {
              await deleteClientDb(c.id);
            }
            const seededClients = [];
            for (const c of defaultClients) {
              const { id, ...rest } = c;
              const saved = await addClientDb(rest);
              seededClients.push(saved);
            }
            const seededEntries = defaultEntries.map(e => {
              const oldClient = defaultClients.find(dc => dc.id === e.clientId);
              const matchingNewClient = seededClients.find(sc => sc.name === oldClient?.name);
              const { id, ...rest } = e;
              return {
                ...rest,
                clientId: matchingNewClient ? matchingNewClient.id : e.clientId
              };
            });
            await addEntriesBulkDb(seededEntries);

            const refreshedClients = await getClientsDb();
            const refreshedEntries = await getEntriesDb();
            setClients(refreshedClients);
            setEntries(refreshedEntries);
            alert("Banco online resetado com sucesso!");
          } catch (err) {
            alert("Erro ao resetar banco online: " + err.message);
          }
        } else {
          saveClients(defaultClients);
          saveEntries(defaultEntries);
          alert("Banco local resetado com sucesso!");
        }
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50 text-gray-500 font-sans">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="animate-spin text-yellow-500" size={32} />
          <p className="text-sm font-semibold tracking-wider">Carregando Timesheet Flow...</p>
        </div>
      </div>
    );
  }

  if (!userSession) {
    return (
      <LoginScreen 
        onLogin={(user) => setUserSession(user)} 
        companyInfo={companyInfo} 
        freelancers={freelancers} 
      />
    );
  }

  // Se o usuário logado for um Freelancer, renderiza o Portal do Freelancer dedicado
  if (userSession && userSession.role === 'Freelancer') {
    return (
      <FreelancerPortal 
        userSession={userSession}
        tasks={freelancerTasks}
        clients={clients}
        freelancers={freelancers}
        categories={serviceCategories}
        onUpdateTask={handleUpdateFreelancerTask}
        onUpdateFreelancer={handleUpdateFreelancer}
        onUpdateSession={setUserSession}
        onLogout={handleLogout}
        companyInfo={companyInfo}
      />
    );
  }

  return (
    <div className="flex w-full min-h-screen bg-gray-50 font-sans text-gray-800">
      
      {/* Sidebar Navigation */}
      <nav className="no-print fixed top-0 left-0 z-50 flex flex-col w-[260px] h-screen bg-white border-r border-gray-200 p-6">
        
        {/* Logo Section with 3D Isometric Logo */}
        <div className="flex items-center gap-3 mb-8 pl-1">
          <img src="/logo.png" alt="Matheus Raffa" className="w-10 h-10 object-contain drop-shadow-xs" />
          <div>
            <h2 className="font-title text-base font-black text-gray-950 tracking-tight leading-none">Matheus Raffa</h2>
            <span className="text-[10px] text-yellow-600 font-extrabold tracking-wider uppercase">&gt; Inteligência Digital</span>
          </div>
        </div>

        {/* Sync Status Indicator */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold mb-6 ${
          isOnline 
            ? 'bg-green-50 border-green-100 text-green-700' 
            : 'bg-amber-50 border-amber-100 text-amber-700'
        }`}>
          {isOnline ? <Cloud size={14} /> : <CloudOff size={14} />}
          <span>{isOnline ? 'Online (Supabase)' : 'Modo Local (Offline)'}</span>
        </div>

        {/* Navigation Items */}
        <ul className="flex flex-col gap-1 list-none flex-grow">
          <li>
            <button 
              className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'dashboard' 
                  ? 'bg-yellow-400 text-gray-950 shadow-sm font-bold' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
              onClick={() => setActiveTab('dashboard')}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </button>
          </li>
          <li>
            <button 
              className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'clients' 
                  ? 'bg-yellow-400 text-gray-950 shadow-sm font-bold' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
              onClick={() => setActiveTab('clients')}
            >
              <Users size={18} />
              <span>Clientes</span>
            </button>
          </li>
          <li>
            <button 
              className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'timesheet' 
                  ? 'bg-yellow-400 text-gray-950 shadow-sm font-bold' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
              onClick={() => setActiveTab('timesheet')}
            >
              <Clock size={18} />
              <span>Timesheet</span>
            </button>
          </li>
          <li>
            <button 
              className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'reports' 
                  ? 'bg-yellow-400 text-gray-950 shadow-sm font-bold' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
              onClick={() => setActiveTab('reports')}
            >
              <FileText size={18} />
              <span>Relatórios / Faturas</span>
            </button>
          </li>
          <li>
            <button 
              className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'freelancers' 
                  ? 'bg-yellow-400 text-gray-950 shadow-sm font-bold' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
              onClick={() => setActiveTab('freelancers')}
            >
              <Briefcase size={18} />
              <span>Prestadores</span>
            </button>
          </li>
          <li>
            <button 
              className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'settings' 
                  ? 'bg-yellow-400 text-gray-950 shadow-sm font-bold' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
              onClick={() => setActiveTab('settings')}
            >
              <SettingsIcon size={18} />
              <span>Configurações</span>
            </button>
          </li>
        </ul>

        {/* Footer Sidebar (Clean: Primary Import & User Session Logout) */}
        <div className="flex flex-col gap-2.5 pt-4 border-t border-gray-100 mt-auto">
          <button 
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-950 text-white rounded-lg text-xs font-bold hover:bg-gray-800 transition-colors shadow-sm cursor-pointer"
            onClick={() => setIsImportModalOpen(true)}
          >
            <Upload size={14} /> Importar Planyway
          </button>

          <div className="flex items-center justify-between bg-gray-50 border border-gray-150 p-2.5 rounded-lg text-xs mt-1">
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-gray-900 truncate text-[11px]">{userSession?.email || 'Administrador'}</span>
              <span className="text-[10px] text-gray-500">Sessão Ativa</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
              title="Sair do Sistema"
            >
              <LogOut size={14} />
            </button>
          </div>

          <div className="flex items-center justify-center gap-1 text-[10px] text-gray-400 mt-1">
            <Server size={10} />
            <span>Versão 1.0.0 Online</span>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow pl-[260px] min-h-screen">
        <div className="p-8 max-w-[1400px] mx-auto min-h-screen">
          {activeTab === 'dashboard' && (
            <Dashboard 
              entries={entries} 
              clients={clients} 
              onNavigateToTab={(tab) => setActiveTab(tab)} 
              onUpdateClient={handleUpdateClient}
              onDeleteClient={handleDeleteClient}
              onMergeClients={handleMergeClients}
            />
          )}
          
          {activeTab === 'clients' && (
            <ClientManager 
              clients={clients}
              onAddClient={handleAddClient}
              onUpdateClient={handleUpdateClient}
              onDeleteClient={handleDeleteClient}
              onMergeClients={handleMergeClients}
              onSyncClients={async (syncedList) => {
                if (!isOnline) {
                  setClients(syncedList);
                  saveClients(syncedList);
                  return;
                }
                
                try {
                  const dbUpdatedClients = [];
                  for (const c of syncedList) {
                    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c.id);
                    
                    if (clients.some(existing => existing.id === c.id) && isValidUuid) {
                      const updated = await updateClientDb(c.id, c);
                      dbUpdatedClients.push(updated);
                    } else {
                      const added = await addClientDb(c);
                      dbUpdatedClients.push(added);
                    }
                  }
                  setClients(dbUpdatedClients);
                  saveClients(dbUpdatedClients);
                } catch (err) {
                  console.error(err);
                  alert("Erro ao sincronizar com Supabase: " + err.message);
                }
              }}
            />
          )}

          {activeTab === 'timesheet' && (
            <TimesheetTable 
              entries={entries}
              clients={clients}
              onAddEntry={handleAddEntry}
              onUpdateEntry={handleUpdateEntry}
              onDeleteEntry={handleDeleteEntry}
            />
          )}

          {activeTab === 'reports' && (
            <InvoiceView 
              entries={entries}
              clients={clients}
              companyInfo={companyInfo}
            />
          )}

          {activeTab === 'freelancers' && (
            <FreelancerManager
              freelancers={freelancers}
              tasks={freelancerTasks}
              clients={clients}
              entries={entries}
              companyInfo={companyInfo}
              categories={serviceCategories}
              freelancerEmailSubjectTemplate={freelancerEmailSubjectTemplate}
              freelancerEmailBodyTemplate={freelancerEmailBodyTemplate}
              evolutionNotificationTemplate={evolutionNotificationTemplate}
              onAddCategory={handleAddCategory}
              onAddFreelancer={handleAddFreelancer}
              onUpdateFreelancer={handleUpdateFreelancer}
              onDeleteFreelancer={handleDeleteFreelancer}
              onAddTask={handleAddFreelancerTask}
              onUpdateTask={handleUpdateFreelancerTask}
              onDeleteTask={handleDeleteFreelancerTask}
              onBatchUpdateTasks={handleBatchUpdateFreelancerTasks}
              onBatchDeleteTasks={handleBatchDeleteFreelancerTasks}
            />
          )}

          {activeTab === 'settings' && (
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="font-title text-2xl font-bold text-gray-900">Configurações</h1>
                <p className="text-sm text-gray-500">Gerencie os dados da sua empresa, valores padrão de horas, conexão Supabase, integrações Asaas e e-mail.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Company Profile & Default Rate Settings Card */}
                <div className="bg-white border border-gray-150 rounded-xl p-6 shadow-xs flex flex-col gap-4 md:col-span-2">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Building size={18} className="text-yellow-600" />
                      <h3 className="font-title text-base font-bold text-gray-900">Dados da Empresa & Regras Padrão de Faturamento</h3>
                    </div>
                    {savedSuccessMessage && (
                      <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-md border border-green-200">
                        ✓ Dados salvos com sucesso!
                      </span>
                    )}
                  </div>

                  <form onSubmit={handleSaveCompanyInfo} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                    <div className="flex flex-col gap-1">
                      <label className="font-semibold text-gray-600" htmlFor="comp-brand">Nome da Marca / Fantasia</label>
                      <input 
                        id="comp-brand"
                        type="text" 
                        className="border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-yellow-500 bg-white"
                        value={companyForm?.brandName || ''}
                        onChange={(e) => setCompanyForm({...companyForm, brandName: e.target.value})}
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-semibold text-gray-600" htmlFor="comp-sub">Slogan / Subtítulo</label>
                      <input 
                        id="comp-sub"
                        type="text" 
                        className="border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-yellow-500 bg-white"
                        value={companyForm?.brandSubtitle || ''}
                        onChange={(e) => setCompanyForm({...companyForm, brandSubtitle: e.target.value})}
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-semibold text-gray-600" htmlFor="comp-legal">Razão Social</label>
                      <input 
                        id="comp-legal"
                        type="text" 
                        className="border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-yellow-500 bg-white"
                        value={companyForm?.legalName || ''}
                        onChange={(e) => setCompanyForm({...companyForm, legalName: e.target.value})}
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-semibold text-gray-600" htmlFor="comp-cnpj">CNPJ</label>
                      <input 
                        id="comp-cnpj"
                        type="text" 
                        className="border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-yellow-500 bg-white"
                        value={companyForm?.cnpj || ''}
                        onChange={(e) => setCompanyForm({...companyForm, cnpj: e.target.value})}
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-semibold text-gray-600" htmlFor="comp-email">E-mail Comercial</label>
                      <input 
                        id="comp-email"
                        type="email" 
                        className="border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-yellow-500 bg-white"
                        value={companyForm?.email || ''}
                        onChange={(e) => setCompanyForm({...companyForm, email: e.target.value})}
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-semibold text-gray-600" htmlFor="comp-phone">Telefone / WhatsApp</label>
                      <input 
                        id="comp-phone"
                        type="text" 
                        className="border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-yellow-500 bg-white"
                        value={companyForm?.phone || ''}
                        onChange={(e) => setCompanyForm({...companyForm, phone: e.target.value})}
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-semibold text-gray-600" htmlFor="comp-web">Site</label>
                      <input 
                        id="comp-web"
                        type="text" 
                        className="border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-yellow-500 bg-white"
                        value={companyForm?.website || ''}
                        onChange={(e) => setCompanyForm({...companyForm, website: e.target.value})}
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-semibold text-gray-600" htmlFor="comp-city">Cidade / UF</label>
                      <input 
                        id="comp-city"
                        type="text" 
                        className="border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-yellow-500 bg-white"
                        value={companyForm?.city || ''}
                        onChange={(e) => setCompanyForm({...companyForm, city: e.target.value})}
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-gray-800 flex items-center gap-1" htmlFor="comp-default-rate">
                        <DollarSign size={13} className="text-yellow-600" /> Valor Padrão da Hora (R$)
                      </label>
                      <input 
                        id="comp-default-rate"
                        type="number" 
                        step="0.01"
                        min="1"
                        className="border border-yellow-300 rounded-lg p-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-yellow-500 bg-yellow-50/40"
                        value={defaultHourlyRate}
                        onChange={(e) => {
                          setDefaultHourlyRate(e.target.value);
                          localStorage.setItem('raffa_default_hourly_rate', e.target.value);
                        }}
                        required
                      />
                    </div>

                    <div className="flex items-end sm:col-span-2 lg:col-span-3 pt-2">
                      <button 
                        type="submit"
                        className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        <Save size={14} /> Salvar Configurações Gerais
                      </button>
                    </div>
                  </form>
                </div>

                {/* Service Categories Management Card */}
                <div className="bg-white border border-gray-150 rounded-xl p-6 shadow-xs flex flex-col gap-4 md:col-span-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-gray-100 gap-2">
                    <div>
                      <h3 className="font-title text-base font-bold text-gray-900 flex items-center gap-2">
                        <Tag size={18} className="text-yellow-600" />
                        <span>Gerenciamento de Categorias de Serviços</span>
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Cadastre, edite ou remova as categorias de serviços utilizadas na delegação de demandas e no Timesheet.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetCategories}
                      className="text-[11px] font-bold text-gray-500 hover:text-gray-800 underline self-start sm:self-auto cursor-pointer"
                    >
                      Restaurar Padrões
                    </button>
                  </div>

                  {/* Add New Category Form */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nome da nova categoria (ex: Produção Gráfica, Branding, Motion 3D...)"
                      value={newCategoryInput}
                      onChange={(e) => setNewCategoryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newCategoryInput.trim()) {
                            handleAddCategory(newCategoryInput);
                            setNewCategoryInput('');
                          }
                        }
                      }}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-xs flex-1 focus:outline-none focus:border-yellow-500 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newCategoryInput.trim()) {
                          handleAddCategory(newCategoryInput);
                          setNewCategoryInput('');
                        }
                      }}
                      className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
                    >
                      <Plus size={14} /> Adicionar Categoria
                    </button>
                  </div>

                  {/* Categories Grid List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-2">
                    {serviceCategories.map((cat, idx) => {
                      const isEditing = editingCategoryIndex === idx;

                      if (isEditing) {
                        return (
                          <div key={idx} className="flex items-center gap-1.5 p-2 bg-yellow-50 border border-yellow-300 rounded-lg">
                            <input
                              type="text"
                              autoFocus
                              value={editingCategoryValue}
                              onChange={(e) => setEditingCategoryValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleUpdateCategory(cat, editingCategoryValue);
                                  setEditingCategoryIndex(null);
                                } else if (e.key === 'Escape') {
                                  setEditingCategoryIndex(null);
                                }
                              }}
                              className="px-2 py-1 bg-white border border-yellow-400 rounded text-xs text-gray-950 font-bold w-full focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                handleUpdateCategory(cat, editingCategoryValue);
                                setEditingCategoryIndex(null);
                              }}
                              className="p-1 text-green-700 hover:bg-green-100 rounded cursor-pointer"
                              title="Salvar"
                            >
                              <CheckCircle2 size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCategoryIndex(null)}
                              className="p-1 text-gray-400 hover:bg-gray-200 rounded cursor-pointer"
                              title="Cancelar"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div 
                          key={idx}
                          className="flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-yellow-50/40 border border-gray-200 hover:border-yellow-300 rounded-lg transition-colors group"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-2 h-2 rounded-full bg-yellow-500 shrink-0"></span>
                            <span className="text-xs font-bold text-gray-800 truncate" title={cat}>
                              {cat}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategoryIndex(idx);
                                setEditingCategoryValue(cat);
                              }}
                              className="p-1 text-gray-400 hover:text-yellow-700 hover:bg-yellow-100 rounded transition-colors cursor-pointer"
                              title="Editar Categoria"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat)}
                              className="p-1 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                              title="Excluir Categoria"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Access Control & Password Settings Card */}
                <div className="bg-white border border-gray-150 rounded-xl p-6 shadow-xs flex flex-col gap-4 md:col-span-2">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Key size={18} className="text-yellow-600" />
                      <h3 className="font-title text-base font-bold text-gray-900">Credenciais de Acesso (Login de Usuário)</h3>
                    </div>
                    {authSuccessMessage && (
                      <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-md border border-green-200">
                        ✓ Credenciais de login salvas com sucesso!
                      </span>
                    )}
                  </div>

                  <form onSubmit={handleSaveAuthCredentials} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="flex flex-col gap-1">
                      <label className="font-semibold text-gray-700" htmlFor="auth-email">E-mail de Login do Administrador</label>
                      <input 
                        id="auth-email"
                        type="email" 
                        className="border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-yellow-500 bg-white"
                        value={authEmailForm}
                        onChange={(e) => setAuthEmailForm(e.target.value)}
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-semibold text-gray-700" htmlFor="auth-pass">Senha de Acesso ao Sistema</label>
                      <input 
                        id="auth-pass"
                        type="password" 
                        className="border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-yellow-500 bg-white"
                        value={authPassForm}
                        onChange={(e) => setAuthPassForm(e.target.value)}
                        required
                      />
                    </div>

                    <div className="flex items-center justify-between sm:col-span-2 pt-2 border-t border-gray-100">
                      <button 
                        type="submit"
                        className="px-6 py-2 bg-gray-900 hover:bg-black text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        <Save size={14} /> Salvar Nova Senha de Acesso
                      </button>

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <LogOut size={13} /> Sair da Conta Agora
                      </button>
                    </div>
                  </form>
                </div>

                {/* Supabase Database Connection Card */}
                <div className="bg-white border border-gray-150 rounded-xl p-6 shadow-xs flex flex-col gap-4">
                  <div>
                    <h3 className="font-title text-base font-bold text-gray-900 flex items-center gap-2">
                      <Server size={18} className="text-emerald-600" />
                      <span>Banco de Dados Supabase</span>
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      Gerencie as credenciais de acesso ao seu banco de dados PostgreSQL no Supabase para sincronização em nuvem.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-700" htmlFor="sp-url">URL do Projeto (VITE_SUPABASE_URL)</label>
                    <input 
                      id="sp-url"
                      type="text"
                      placeholder="https://xyzcompany.supabase.co"
                      className="border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-emerald-500 bg-white font-mono"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-700" htmlFor="sp-key">Chave Anônima (VITE_SUPABASE_ANON_KEY)</label>
                    <input 
                      id="sp-key"
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                      className="border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-emerald-500 bg-white font-mono"
                      value={supabaseAnonKey}
                      onChange={(e) => setSupabaseAnonKey(e.target.value)}
                    />
                  </div>

                  {supabaseTestStatus && (
                    <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                      supabaseTestStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                      {supabaseTestStatus.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> : <AlertTriangle size={16} className="text-red-600 shrink-0" />}
                      <span>{supabaseTestStatus.text}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={handleTestSupabaseConnection}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <Server size={14} /> Salvar & Testar Conexão Supabase
                    </button>
                  </div>

                  <div className="bg-emerald-50/60 border border-emerald-150 p-3.5 rounded-lg text-xs text-emerald-950 leading-relaxed flex flex-col gap-1">
                    <p className="font-bold text-emerald-900">💡 Instruções de Configuração no Supabase:</p>
                    <p className="text-[11px]">
                      O arquivo <code className="bg-white px-1.5 py-0.5 rounded border border-emerald-200 font-mono font-bold text-emerald-900">supabase_schema.sql</code> já está incluso na raiz deste projeto. Basta copiar o conteúdo desse arquivo e colar no <strong>SQL Editor</strong> do seu painel do Supabase para criar as tabelas <code className="font-mono font-bold">clients</code> e <code className="font-mono font-bold">entries</code> automaticamente.
                    </p>
                  </div>
                </div>

                {/* Asaas Integration Card */}
                <div className="bg-white border border-gray-150 rounded-xl p-6 shadow-xs flex flex-col gap-4">
                  <div>
                    <h3 className="font-title text-base font-bold text-gray-900">Integração com o Asaas</h3>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      Configure suas chaves da API do Asaas para permitir a geração direta de faturas financeiras, emissão de cobranças e links de pagamento.
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500" htmlFor="asaas-token">Token de Acesso Asaas (API Key)</label>
                    <input 
                      id="asaas-token"
                      type="password"
                      placeholder="Cole sua API Key do Asaas"
                      className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-yellow-500 bg-white"
                      value={asaasToken}
                      onChange={(e) => {
                        setAsaasToken(e.target.value);
                        localStorage.setItem('raffa_asaas_token', e.target.value);
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500" htmlFor="asaas-env">Ambiente da API</label>
                    <select 
                      id="asaas-env"
                      className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-yellow-500 bg-white cursor-pointer"
                      value={asaasEnv}
                      onChange={(e) => {
                        setAsaasEnv(e.target.value);
                        localStorage.setItem('raffa_asaas_env', e.target.value);
                      }}
                    >
                      <option value="sandbox">Sandbox (Ambiente de Testes)</option>
                      <option value="production">Produção (Ambiente Real)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <input 
                      id="asaas-auto-nfe"
                      type="checkbox"
                      checked={asaasAutoNfe}
                      onChange={(e) => {
                        setAsaasAutoNfe(e.target.checked);
                        localStorage.setItem('raffa_asaas_auto_nfe', e.target.checked.toString());
                      }}
                      className="w-4 h-4 text-yellow-500 rounded border-gray-300 focus:ring-yellow-400 cursor-pointer"
                    />
                    <label htmlFor="asaas-auto-nfe" className="text-xs font-semibold text-gray-700 cursor-pointer">
                      Agendar emissão da Nota Fiscal (NFS-e) automaticamente ao receber o pagamento
                    </label>
                  </div>

                  {asaasTestStatus && (
                    <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                      asaasTestStatus.type === 'success' 
                        ? 'bg-yellow-50 text-yellow-900 border border-yellow-200' 
                        : asaasTestStatus.type === 'info'
                        ? 'bg-blue-50 text-blue-900 border border-blue-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                      {asaasTestStatus.type === 'success' ? <CheckCircle2 size={16} className="text-yellow-600 shrink-0" /> : asaasTestStatus.type === 'info' ? <RefreshCw size={16} className="animate-spin text-blue-600 shrink-0" /> : <AlertTriangle size={16} className="text-red-600 shrink-0" />}
                      <span>{asaasTestStatus.text}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={handleSaveAsaasSettings}
                      className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-950 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <Save size={14} /> Salvar & Validar Integração Asaas
                    </button>
                  </div>
                  
                  <div className="bg-gray-50 border border-gray-100 p-4 rounded-lg text-xs text-gray-500 leading-relaxed flex flex-col gap-2">
                    <p className="font-bold text-gray-700">Como obter as credenciais do Asaas?</p>
                    <ol className="list-decimal pl-4 flex flex-col gap-1 text-[11px]">
                      <li>Acesse sua conta no Asaas (ou <a href="https://sandbox.asaas.com" target="_blank" rel="noopener noreferrer" className="text-yellow-600 font-bold hover:underline">sandbox.asaas.com</a> para testes).</li>
                      <li>Vá em <strong>Minha Conta</strong> &gt; <strong>Integrações</strong> &gt; <strong>Gerar chave de API</strong>.</li>
                      <li>Copie a chave gerada e cole no campo acima correspondente ao ambiente selecionado.</li>
                    </ol>
                  </div>
                </div>

                {/* Email Server / SMTP Settings Card */}
                <div className="bg-white border border-gray-150 rounded-xl p-6 shadow-xs flex flex-col gap-5 md:col-span-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-3 gap-2">
                    <div>
                      <h3 className="font-title text-base font-bold text-gray-900 flex items-center gap-2">
                        <Mail size={18} className="text-indigo-600" />
                        <span>Servidor de E-mail & Disparo (SMTP)</span>
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                        Configure o servidor SMTP para envio direto e automatizado de demonstrativos, faturas e comprovantes de pagamento.
                      </p>
                    </div>
                    {smtpTestStatus && smtpTestStatus.type === 'success' && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 shrink-0 self-start sm:self-auto">
                        ✓ Conexão SMTP Ativa
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Formulário e Credenciais */}
                    <div className="flex flex-col gap-3 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="font-semibold text-gray-700" htmlFor="smtp-host">Servidor SMTP (Host)</label>
                          <input 
                            id="smtp-host"
                            type="text"
                            placeholder="smtp.gmail.com ou smtp.titan.email"
                            className="border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500 bg-white"
                            value={smtpHost}
                            onChange={(e) => {
                              setSmtpHost(e.target.value);
                              localStorage.setItem('raffa_smtp_host', e.target.value);
                            }}
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="font-semibold text-gray-700" htmlFor="smtp-port">Porta SMTP</label>
                          <input 
                            id="smtp-port"
                            type="text"
                            placeholder="587 ou 465"
                            className="border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500 bg-white"
                            value={smtpPort}
                            onChange={(e) => {
                              setSmtpPort(e.target.value);
                              localStorage.setItem('raffa_smtp_port', e.target.value);
                            }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="font-semibold text-gray-700" htmlFor="smtp-user">Usuário / E-mail de Autenticação</label>
                          <input 
                            id="smtp-user"
                            type="email"
                            placeholder="contato@suaempresa.com.br"
                            className="border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500 bg-white"
                            value={smtpUser}
                            onChange={(e) => {
                              setSmtpUser(e.target.value);
                              localStorage.setItem('raffa_smtp_user', e.target.value);
                            }}
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="font-semibold text-gray-700" htmlFor="smtp-pass">Senha / Token de App</label>
                          <input 
                            id="smtp-pass"
                            type="password"
                            placeholder="••••••••••••••••"
                            className="border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500 bg-white"
                            value={smtpPass}
                            onChange={(e) => {
                              setSmtpPass(e.target.value);
                              localStorage.setItem('raffa_smtp_pass', e.target.value);
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-700" htmlFor="smtp-sender">E-mail de Remetente Exibido (From)</label>
                        <input 
                          id="smtp-sender"
                          type="text"
                          placeholder="Matheus Raffa <contato@matheusraffa.com.br>"
                          className="border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-indigo-500 bg-white"
                          value={smtpSender}
                          onChange={(e) => {
                            setSmtpSender(e.target.value);
                            localStorage.setItem('raffa_smtp_sender', e.target.value);
                          }}
                        />
                      </div>

                      {smtpTestStatus && (
                        <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 mt-1 ${
                          smtpTestStatus.type === 'success' 
                            ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
                            : smtpTestStatus.type === 'info'
                            ? 'bg-blue-50 text-blue-900 border border-blue-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                          {smtpTestStatus.type === 'success' ? (
                            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                          ) : smtpTestStatus.type === 'info' ? (
                            <RefreshCw size={16} className="animate-spin text-blue-600 shrink-0" />
                          ) : (
                            <AlertTriangle size={16} className="text-red-600 shrink-0" />
                          )}
                          <span>{smtpTestStatus.text}</span>
                        </div>
                      )}

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleSaveAndTestSmtpConnection}
                          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs active:scale-[0.98]"
                        >
                          <Save size={14} />
                          <span>Salvar e Testar Conexão SMTP</span>
                        </button>
                      </div>
                    </div>

                    {/* Right: Guia de Boas Práticas e Provedores */}
                    <div className="bg-indigo-50/50 border border-indigo-150 p-4 rounded-xl text-xs text-indigo-950 flex flex-col justify-between gap-3">
                      <div className="flex flex-col gap-2">
                        <p className="font-bold text-indigo-900 flex items-center gap-1.5">
                          💡 Como funciona o envio de e-mails:
                        </p>
                        <ul className="list-disc pl-4 flex flex-col gap-1.5 text-[11px] leading-relaxed text-indigo-900/90">
                          <li><strong>Modo Nativo (Browser/App de E-mail)</strong>: Ao clicar em <em>"Enviar por E-mail"</em>, o sistema gera e baixa o PDF oficial e abre seu cliente de e-mail (Gmail, Outlook, Apple Mail) com Destinatário, Assunto e Mensagem preenchidos dinamicamente.</li>
                          <li><strong>Modo Direto (SMTP)</strong>: As credenciais configuradas aqui são utilizadas para autenticar e disparar mensagens automatizadas para clientes e prestadores de serviços.</li>
                        </ul>
                      </div>

                      <div className="bg-white/80 border border-indigo-100 rounded-lg p-3 text-[11px] flex flex-col gap-1">
                        <p className="font-bold text-gray-800">Portas recomendadas:</p>
                        <p className="text-gray-600"><span className="font-bold font-mono text-indigo-900">587</span> — TLS / STARTTLS (Padrão para Gmail, Titan e cPanel)</p>
                        <p className="text-gray-600"><span className="font-bold font-mono text-indigo-900">465</span> — SSL Seguro</p>
                        <p className="text-[10px] text-gray-500 mt-1 italic">* Para contas Google/Gmail, utilize uma "Senha de App" gerada na segurança da sua Conta Google.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Email Template Card (Clientes) */}
                <div className="bg-white border border-gray-150 rounded-xl p-6 shadow-xs flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-4">
                    <div>
                      <h3 className="font-title text-base font-bold text-gray-900 flex items-center gap-2">
                        <Mail size={18} className="text-yellow-600" />
                        <span>Template do E-mail de Fatura (Clientes)</span>
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        Personalize o assunto e a mensagem padrão enviada para o cliente com o demonstrativo em PDF e link do PIX/Asaas.
                      </p>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-gray-700" htmlFor="email-subject-tpl">Assunto do E-mail</label>
                      <input 
                        id="email-subject-tpl"
                        type="text"
                        className="border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-yellow-500 bg-white"
                        value={emailSubjectTemplate}
                        onChange={(e) => {
                          setEmailSubjectTemplate(e.target.value);
                          localStorage.setItem('raffa_email_subject_tpl', e.target.value);
                        }}
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-gray-700" htmlFor="email-body-tpl">Corpo da Mensagem (Texto do E-mail)</label>
                      <textarea 
                        id="email-body-tpl"
                        rows={8}
                        className="border border-gray-200 rounded-lg p-3 text-xs leading-relaxed focus:outline-none focus:border-yellow-500 bg-white font-mono"
                        value={emailBodyTemplate}
                        onChange={(e) => {
                          setEmailBodyTemplate(e.target.value);
                          localStorage.setItem('raffa_email_body_tpl', e.target.value);
                        }}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-150 p-3 rounded-lg flex flex-col gap-1.5 text-xs text-gray-600">
                    <span className="font-bold text-gray-700 text-[10px] uppercase tracking-wider">Variáveis Dinâmicas:</span>
                    <div className="flex flex-wrap gap-1 text-[10px]">
                      <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono font-bold text-yellow-800" title="Primeiro nome do cliente (ex: Pedro)">{'{primeiro_nome}'}</span>
                      <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono font-bold text-yellow-800">{'{cliente}'}</span>
                      <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono font-bold text-yellow-800">{'{mes_extenso}'}</span>
                      <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono font-bold text-yellow-800">{'{mes_ano}'}</span>
                      <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono font-bold text-yellow-800">{'{horas_tecnicas}'}</span>
                      <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono font-bold text-yellow-800">{'{valor_total}'}</span>
                      <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono font-bold text-yellow-800">{'{data_vencimento}'}</span>
                      <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono font-bold text-yellow-800">{'{link_fatura}'}</span>
                      <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono font-bold text-yellow-800">{'{pix_copia_cola}'}</span>
                      <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono font-bold text-yellow-800">{'{minha_empresa}'}</span>
                    </div>
                  </div>
                </div>

                {/* Email Template Card (Prestadores / Freelancers) */}
                <div className="bg-white border border-gray-150 rounded-xl p-6 shadow-xs flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-4">
                    <div>
                      <h3 className="font-title text-base font-bold text-gray-900 flex items-center gap-2">
                        <Briefcase size={18} className="text-emerald-600" />
                        <span>Template do E-mail de Pagamento (Prestadores)</span>
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        Personalize o assunto e a mensagem padrão enviada para o prestador com o relatório em PDF e comprovante de quitação PIX.
                      </p>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-gray-700" htmlFor="freela-email-subject-tpl">Assunto do E-mail</label>
                      <input 
                        id="freela-email-subject-tpl"
                        type="text"
                        className="border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-emerald-500 bg-white"
                        value={freelancerEmailSubjectTemplate}
                        onChange={(e) => {
                          setFreelancerEmailSubjectTemplate(e.target.value);
                          localStorage.setItem('raffa_freelancer_email_subject_tpl', e.target.value);
                        }}
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-gray-700" htmlFor="freela-email-body-tpl">Corpo da Mensagem (Texto do E-mail)</label>
                      <textarea 
                        id="freela-email-body-tpl"
                        rows={8}
                        className="border border-gray-200 rounded-lg p-3 text-xs leading-relaxed focus:outline-none focus:border-emerald-500 bg-white font-mono"
                        value={freelancerEmailBodyTemplate}
                        onChange={(e) => {
                          setFreelancerEmailBodyTemplate(e.target.value);
                          localStorage.setItem('raffa_freelancer_email_body_tpl', e.target.value);
                        }}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-150 p-3 rounded-lg flex flex-col gap-1.5 text-xs text-gray-600">
                    <span className="font-bold text-gray-700 text-[10px] uppercase tracking-wider">Variáveis Dinâmicas:</span>
                    <div className="flex flex-wrap gap-1 text-[10px]">
                      <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono font-bold text-emerald-800" title="Primeiro nome do prestador (ex: Angela)">{'{primeiro_nome}'}</span>
                      <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono font-bold text-emerald-800">{'{nome_freelancer}'}</span>
                      <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono font-bold text-emerald-800">{'{periodo_referencia}'}</span>
                      <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono font-bold text-emerald-800">{'{quantidade_demandas}'}</span>
                      <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono font-bold text-emerald-800">{'{total_horas}'}</span>
                      <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono font-bold text-emerald-800">{'{valor_total}'}</span>
                      <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono font-bold text-emerald-800">{'{chave_pix}'}</span>
                      <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono font-bold text-emerald-800">{'{id_transacao_pix}'}</span>
                      <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono font-bold text-emerald-800">{'{data_pagamento}'}</span>
                      <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono font-bold text-emerald-800">{'{lista_demandas}'}</span>
                      <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono font-bold text-emerald-800">{'{minha_empresa}'}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 italic mt-1 border-t border-gray-200/60 pt-1.5">
                      💡 <strong>Suporta HTML & Texto:</strong> Tags como &lt;b&gt;, &lt;p&gt;, &lt;br&gt;, &lt;a&gt; e listas são suportadas. Texto simples com quebras de linha e tópicos com marcadores (•) também são diagramados automaticamente com tipografia corporativa e espaçamento seguro para anexos PDF.
                    </p>
                  </div>
                </div>

                {/* Evolution API (WhatsApp) Card */}
                <div className="bg-white border border-emerald-200 rounded-xl p-6 shadow-xs flex flex-col gap-5 md:col-span-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div>
                      <h3 className="font-title text-base font-bold text-gray-900 flex items-center gap-2">
                        <MessageSquare size={18} className="text-emerald-600" />
                        <span>Integração Evolution API (WhatsApp) & Notificações de Demandas</span>
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        Conecte sua instância da Evolution API para notificar automaticamente prestadores e freelancers sobre novas demandas delegadas diretamente no WhatsApp.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                      <Smartphone size={12} />
                      <span>WhatsApp API</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Credenciais da API */}
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-700" htmlFor="evo-url">
                          URL da Evolution API (Servidor)
                        </label>
                        <input 
                          id="evo-url"
                          type="url"
                          placeholder="ex: https://whatsapp.meudominio.com.br ou http://meu-vps:8080"
                          className="border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-emerald-500 bg-white font-mono"
                          value={evolutionApiUrl}
                          onChange={(e) => {
                            setEvolutionApiUrl(e.target.value);
                            localStorage.setItem('raffa_evolution_api_url', e.target.value);
                          }}
                        />
                        <span className="text-[10px] text-gray-400">Endereço base onde sua Evolution API está hospedada.</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-gray-700" htmlFor="evo-instance">
                            Nome da Instância
                          </label>
                          <input 
                            id="evo-instance"
                            type="text"
                            placeholder="ex: atendimento ou timesheet"
                            className="border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-emerald-500 bg-white font-mono"
                            value={evolutionInstance}
                            onChange={(e) => {
                              setEvolutionInstance(e.target.value);
                              localStorage.setItem('raffa_evolution_instance', e.target.value);
                            }}
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-gray-700" htmlFor="evo-key">
                            API Key / Token
                          </label>
                          <div className="relative">
                            <input 
                              id="evo-key"
                              type={showEvolutionApiKey ? 'text' : 'password'}
                              placeholder="Chave Global ou da Instância"
                              className="w-full border border-gray-200 rounded-lg p-2.5 pr-8 text-xs focus:outline-none focus:border-emerald-500 bg-white font-mono"
                              value={evolutionApiKey}
                              onChange={(e) => {
                                setEvolutionApiKey(e.target.value);
                                localStorage.setItem('raffa_evolution_api_key', e.target.value);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowEvolutionApiKey(!showEvolutionApiKey)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                              title={showEvolutionApiKey ? 'Ocultar chave' : 'Visualizar chave'}
                            >
                              {showEvolutionApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Status da conexão */}
                      {evolutionTestStatus && (
                        <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                          evolutionTestStatus.type === 'success' 
                            ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
                            : evolutionTestStatus.type === 'info'
                            ? 'bg-blue-50 text-blue-900 border border-blue-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                          {evolutionTestStatus.type === 'success' ? (
                            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                          ) : evolutionTestStatus.type === 'info' ? (
                            <RefreshCw size={16} className="animate-spin text-blue-600 shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
                          )}
                          <span>{evolutionTestStatus.text}</span>
                        </div>
                      )}

                      <div>
                        <button
                          type="button"
                          onClick={handleSaveAndTestEvolution}
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs active:scale-[0.98]"
                        >
                          <Save size={14} />
                          <span>Salvar e Testar Instância da Evolution API</span>
                        </button>
                      </div>
                    </div>

                    {/* Right: Template de Mensagem de Nova Demanda */}
                    <div className="flex flex-col justify-between gap-3 bg-emerald-50/40 border border-emerald-150 p-4 rounded-xl">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-gray-900 flex items-center gap-1.5" htmlFor="evo-tpl">
                            <MessageCircle size={14} className="text-emerald-600" />
                            <span>Template de Notificação de Nova Demanda</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setEvolutionNotificationTemplate(DEFAULT_EVOLUTION_NOTIFICATION_TEMPLATE);
                              localStorage.setItem('raffa_evolution_notification_tpl', DEFAULT_EVOLUTION_NOTIFICATION_TEMPLATE);
                            }}
                            className="text-[10px] text-emerald-700 hover:underline cursor-pointer font-semibold"
                          >
                            Restaurar Padrão
                          </button>
                        </div>
                        <p className="text-[11px] text-gray-600 leading-relaxed">
                          Esta mensagem será disparada para o WhatsApp do prestador quando você clicar no botão de notificar na tabela de demandas ou logo após cadastrar uma nova tarefa.
                        </p>

                        <textarea 
                          id="evo-tpl"
                          rows={7}
                          className="border border-gray-200 rounded-lg p-3 text-xs leading-relaxed focus:outline-none focus:border-emerald-500 bg-white font-mono"
                          value={evolutionNotificationTemplate}
                          onChange={(e) => {
                            setEvolutionNotificationTemplate(e.target.value);
                            localStorage.setItem('raffa_evolution_notification_tpl', e.target.value);
                          }}
                        />
                      </div>

                      <div className="bg-white/90 border border-emerald-150 p-2.5 rounded-lg flex flex-col gap-1.5 text-xs">
                        <span className="font-bold text-gray-700 text-[10px] uppercase tracking-wider">Variáveis Dinâmicas (Clique para Inserir):</span>
                        <div className="flex flex-wrap gap-1 text-[10px]">
                          {[
                            { tag: '{primeiro_nome}', desc: 'Primeiro nome do prestador' },
                            { tag: '{nome}', desc: 'Nome completo' },
                            { tag: '{titulo}', desc: 'Título da demanda' },
                            { tag: '{cliente}', desc: 'Nome do cliente' },
                            { tag: '{categoria}', desc: 'Categoria do serviço' },
                            { tag: '{prazo}', desc: 'Data prevista de entrega' },
                            { tag: '{horas}', desc: 'Estimativa de horas' },
                            { tag: '{link_briefing_bloco}', desc: 'Link do briefing (se houver)' },
                            { tag: '{observacoes_bloco}', desc: 'Observações (se houver)' },
                            { tag: '{portal_url}', desc: 'Link de acesso ao painel' },
                            { tag: '{minha_empresa}', desc: 'Sua empresa' }
                          ].map(({ tag, desc }) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => {
                                const next = evolutionNotificationTemplate + ' ' + tag;
                                setEvolutionNotificationTemplate(next);
                                localStorage.setItem('raffa_evolution_notification_tpl', next);
                              }}
                              title={`Inserir: ${desc}`}
                              className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded font-mono font-bold text-emerald-900 cursor-pointer transition-colors"
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reset System Card */}
                <div className="bg-white border-2 border-red-200 rounded-xl p-6 shadow-sm flex flex-col gap-4 md:col-span-2">
                  <div>
                    <h3 className="font-title text-base font-bold text-red-600 flex items-center gap-2">
                      <AlertTriangle size={20} className="text-red-600" />
                      <span>Zona de Perigo</span>
                    </h3>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      Se você deseja apagar todas as demandas registradas no sistema (Timesheet) e reiniciar com a lista de clientes limpa para realizar um novo upload do CSV do Planyway, utilize a opção abaixo.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button 
                      type="button"
                      onClick={handleResetSystem}
                      className="px-5 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
                    >
                      <AlertTriangle size={16} />
                      <span>Resetar Todo o Sistema (Dados Limpos)</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </main>

      {/* Global Import Modal */}
      <ImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        clients={clients}
        onImportComplete={handleImportComplete}
        onAddClient={handleAddClient}
      />

      {/* Global Confirmation Modal */}
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />
    </div>
  );
}

export default App;
