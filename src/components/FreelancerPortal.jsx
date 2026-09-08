import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Calendar, 
  FileText, 
  ExternalLink, 
  AlertCircle, 
  Search, 
  Filter, 
  Sparkles, 
  LogOut, 
  DollarSign, 
  ChevronRight, 
  X,
  Send,
  Building,
  Tag,
  Settings,
  User,
  Key,
  Lock,
  Mail,
  Phone,
  CreditCard,
  Eye,
  EyeOff,
  Save,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { formatPhone } from '../utils/cnpjLookup';

export default function FreelancerPortal({ 
  userSession, 
  tasks = [], 
  clients = [], 
  freelancers = [],
  categories = [],
  onUpdateTask, 
  onUpdateFreelancer,
  onUpdateSession,
  onLogout,
  companyInfo = {} 
}) {
  // Filtros de status: 'all', 'pending', 'in_progress', 'delivered', 'paid'
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtro de seleção de datas: 'current_month', 'prev_month', 'custom', 'all'
  const [periodFilter, setPeriodFilter] = useState('current_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Ordenação da tabela
  const [taskSortField, setTaskSortField] = useState('requestDate');
  const [taskSortOrder, setTaskSortOrder] = useState('desc');

  // Modal de entrega e lançamento de horas
  const [selectedTaskForDelivery, setSelectedTaskForDelivery] = useState(null);
  const [deliveryDate, setDeliveryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [deliveryHours, setDeliveryHours] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal de configurações do prestador
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileUsername, setProfileUsername] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [profilePhone, setProfilePhone] = useState('');
  const [profilePixKey, setProfilePixKey] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  // Busca dados atualizados do freelancer logado
  const currentFreelancer = useMemo(() => {
    return (freelancers || []).find(
      f => f.id === userSession?.freelancerId || f.id === userSession?.id || f.username === userSession?.email
    ) || null;
  }, [freelancers, userSession]);

  // Mapeia nome do cliente pelo ID
  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'Cliente MHB Raffa';
  };

  // Filtra as tarefas exclusivas deste freelancer
  const myTasks = useMemo(() => {
    return tasks.filter(t => t.freelancerId === userSession?.freelancerId || t.freelancerId === userSession?.id);
  }, [tasks, userSession]);

  // Intervalo de datas calculado
  const { periodStart, periodEnd, periodLabel } = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    if (periodFilter === 'current_month') {
      const start = `${curYear}-${String(curMonth + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(curYear, curMonth + 1, 0).getDate();
      const end = `${curYear}-${String(curMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const monthName = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      return { 
        periodStart: start, 
        periodEnd: end, 
        periodLabel: monthName.charAt(0).toUpperCase() + monthName.slice(1)
      };
    }

    if (periodFilter === 'prev_month') {
      const prevDate = new Date(curYear, curMonth - 1, 1);
      const prevYear = prevDate.getFullYear();
      const prevMonth = prevDate.getMonth();
      const start = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(prevYear, prevMonth + 1, 0).getDate();
      const end = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const monthName = prevDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      return { 
        periodStart: start, 
        periodEnd: end, 
        periodLabel: monthName.charAt(0).toUpperCase() + monthName.slice(1)
      };
    }

    if (periodFilter === 'custom') {
      return { 
        periodStart: customStartDate || null, 
        periodEnd: customEndDate || null,
        periodLabel: customStartDate && customEndDate 
          ? `${formatDateBR(customStartDate)} a ${formatDateBR(customEndDate)}`
          : 'Personalizado'
      };
    }

    return { periodStart: null, periodEnd: null, periodLabel: 'Todo o período' };
  }, [periodFilter, customStartDate, customEndDate]);

  // Função para verificar se a demanda pertence ao período
  const isTaskInPeriod = (task) => {
    if (!periodStart && !periodEnd) return true;
    
    // Se a tarefa já foi entregue ou paga, usa a data de entrega
    if (task.status === 'delivered' || task.status === 'paid') {
      const d = task.actualDeliveryDate || task.requestDate;
      if (!d) return true;
      if (periodStart && d < periodStart) return false;
      if (periodEnd && d > periodEnd) return false;
      return true;
    }

    // Se estiver pendente ou em andamento, verifica se o pedido ou prazo está no período
    const refDate = task.expectedDueDate || task.requestDate;
    if (!refDate) return true;
    if (periodStart && refDate < periodStart) return false;
    if (periodEnd && refDate > periodEnd) return false;
    return true;
  };

  // Contadores para as abas de filtro (considerando período atual)
  const filterCounts = useMemo(() => {
    const periodFiltered = myTasks.filter(isTaskInPeriod);
    return {
      all: periodFiltered.length,
      pending: periodFiltered.filter(t => t.status === 'pending').length,
      in_progress: periodFiltered.filter(t => t.status === 'in_progress').length,
      delivered: periodFiltered.filter(t => t.status === 'delivered').length,
      paid: periodFiltered.filter(t => t.status === 'paid').length
    };
  }, [myTasks, periodStart, periodEnd]);

  // Métricas do período selecionado
  const metrics = useMemo(() => {
    const pendingTasks = myTasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
    
    const deliveredInPeriod = myTasks.filter(t => {
      if (t.status !== 'delivered' && t.status !== 'paid') return false;
      const refDate = t.actualDeliveryDate || t.requestDate || '';
      if (!periodStart || !periodEnd) return true;
      return refDate >= periodStart && refDate <= periodEnd;
    });

    const totalHoursPeriod = deliveredInPeriod.reduce((acc, t) => acc + (parseFloat(t.hours) || 0), 0);
    const hourlyRate = parseFloat(currentFreelancer?.hourlyRate || userSession?.hourlyRate) || 0;
    const estimatedEarnings = totalHoursPeriod * hourlyRate;

    return {
      pendingCount: pendingTasks.length,
      deliveredCount: deliveredInPeriod.length,
      totalHours: totalHoursPeriod,
      estimatedEarnings
    };
  }, [myTasks, periodStart, periodEnd, currentFreelancer, userSession]);

  // Manipulação de ordenação da tabela
  const handleSort = (field) => {
    if (taskSortField === field) {
      setTaskSortOrder(taskSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setTaskSortField(field);
      setTaskSortOrder('asc');
    }
  };

  const renderSortIcon = (field) => {
    if (taskSortField !== field) {
      return <ArrowUpDown size={11} className="text-gray-300 group-hover:text-gray-500 transition-colors" />;
    }
    return taskSortOrder === 'asc' ? (
      <ArrowUp size={11} className="text-yellow-600 font-bold" />
    ) : (
      <ArrowDown size={11} className="text-yellow-600 font-bold" />
    );
  };

  // Renderiza status relativo ao prazo como texto puro (verde para no prazo, vermelho para atraso)
  const renderDeadlineStatusText = (task) => {
    const isDelivered = task.status === 'delivered' || task.status === 'paid';
    const dueDateStr = task.expectedDueDate;
    const deliveryDateStr = task.actualDeliveryDate;

    if (isDelivered) {
      if (!dueDateStr) {
        return <span className="text-[11px] font-semibold text-emerald-600">Entregue no prazo</span>;
      }
      if (deliveryDateStr && deliveryDateStr <= dueDateStr) {
        return <span className="text-[11px] font-semibold text-emerald-600">Entregue no prazo</span>;
      } else if (deliveryDateStr && deliveryDateStr > dueDateStr) {
        return <span className="text-[11px] font-semibold text-red-600">Entregue com atraso</span>;
      }
      return <span className="text-[11px] font-semibold text-emerald-600">Entregue</span>;
    }

    // Tarefa pendente ou em andamento
    if (!dueDateStr) {
      return <span className="text-[11px] text-gray-400">Sem prazo</span>;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (dueDateStr < todayStr) {
      return <span className="text-[11px] font-semibold text-red-600">Atrasado</span>;
    } else if (dueDateStr === todayStr) {
      return <span className="text-[11px] font-semibold text-amber-600">Vence hoje</span>;
    } else {
      return <span className="text-[11px] font-semibold text-emerald-600">No prazo</span>;
    }
  };

  // Lista filtrada e ordenada para exibição
  const filteredTasks = useMemo(() => {
    const list = myTasks.filter(task => {
      // Filtro de data / período
      if (!isTaskInPeriod(task)) return false;

      // Filtro de status
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending' && task.status !== 'pending') return false;
        if (statusFilter === 'in_progress' && task.status !== 'in_progress') return false;
        if (statusFilter === 'delivered' && task.status !== 'delivered') return false;
        if (statusFilter === 'paid' && task.status !== 'paid') return false;
      }

      // Filtro de busca
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const clientName = getClientName(task.clientId).toLowerCase();
        const title = (task.title || '').toLowerCase();
        const category = (task.category || '').toLowerCase();
        return title.includes(term) || clientName.includes(term) || category.includes(term);
      }

      return true;
    });

    return list.sort((a, b) => {
      let comparison = 0;
      switch (taskSortField) {
        case 'title':
          comparison = (a.title || '').localeCompare(b.title || '', 'pt-BR', { sensitivity: 'base' });
          break;
        case 'client': {
          const clientA = getClientName(a.clientId) || '';
          const clientB = getClientName(b.clientId) || '';
          comparison = clientA.localeCompare(clientB, 'pt-BR', { sensitivity: 'base' });
          break;
        }
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '', 'pt-BR', { sensitivity: 'base' });
          break;
        case 'requestDate': {
          const dateA = a.requestDate ? new Date(a.requestDate).getTime() : 0;
          const dateB = b.requestDate ? new Date(b.requestDate).getTime() : 0;
          comparison = dateA - dateB;
          break;
        }
        case 'expectedDueDate': {
          const dateA = a.expectedDueDate ? new Date(a.expectedDueDate).getTime() : 0;
          const dateB = b.expectedDueDate ? new Date(b.expectedDueDate).getTime() : 0;
          comparison = dateA - dateB;
          break;
        }
        case 'actualDeliveryDate': {
          const dateA = a.actualDeliveryDate ? new Date(a.actualDeliveryDate).getTime() : 0;
          const dateB = b.actualDeliveryDate ? new Date(b.actualDeliveryDate).getTime() : 0;
          comparison = dateA - dateB;
          break;
        }
        case 'hours': {
          const hoursA = parseFloat(a.hours) || 0;
          const hoursB = parseFloat(b.hours) || 0;
          comparison = hoursA - hoursB;
          break;
        }
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '', 'pt-BR', { sensitivity: 'base' });
          break;
        default:
          comparison = 0;
      }
      return taskSortOrder === 'asc' ? comparison : -comparison;
    });
  }, [myTasks, periodFilter, periodStart, periodEnd, statusFilter, searchTerm, clients, taskSortField, taskSortOrder]);

  // Abre modal de entrega
  const handleOpenDeliveryModal = (task) => {
    setSelectedTaskForDelivery(task);
    setDeliveryDate(task.actualDeliveryDate || new Date().toISOString().split('T')[0]);
    setDeliveryHours(task.hours ? String(task.hours) : '');
    setDeliveryNotes(task.notes || '');
  };

  // Salva a entrega e lançamento de horas
  const handleSubmitDelivery = async (e) => {
    e.preventDefault();
    if (!selectedTaskForDelivery) return;

    const hoursNum = parseFloat(String(deliveryHours).replace(',', '.'));
    if (isNaN(hoursNum) || hoursNum <= 0) {
      alert('Por favor, informe a quantidade de horas válidas gastas nesta demanda.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = {
        ...selectedTaskForDelivery,
        actualDeliveryDate: deliveryDate,
        hours: hoursNum,
        notes: deliveryNotes.trim(),
        status: 'delivered'
      };

      await onUpdateTask(updated);
      setSelectedTaskForDelivery(null);
    } catch (err) {
      alert('Erro ao salvar entrega: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Abre modal de dados/configurações do perfil
  const handleOpenProfileModal = () => {
    const freela = currentFreelancer || {};
    setProfileName(freela.name || userSession?.name || '');
    setProfileUsername(freela.username || userSession?.email || '');
    setProfilePassword(freela.password || '');
    setProfilePhone(freela.phone || '');
    setProfilePixKey(freela.pixKey || '');
    setShowPassword(false);
    setProfileSuccessMsg('');
    setShowProfileModal(true);
  };

  // Salva alterações do perfil do prestador
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileName.trim() || !profileUsername.trim()) {
      alert('Nome completo e E-mail / Usuário são obrigatórios.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const freela = currentFreelancer || {};
      const updatedFreela = {
        ...freela,
        id: freela.id || userSession?.freelancerId || userSession?.id,
        name: profileName.trim(),
        username: profileUsername.trim().toLowerCase(),
        password: profilePassword.trim() || freela.password,
        phone: formatPhone(profilePhone.trim()),
        pixKey: profilePixKey.trim(),
        specialty: freela.specialty || userSession?.specialty || 'Designer',
        hourlyRate: freela.hourlyRate !== undefined ? freela.hourlyRate : (userSession?.hourlyRate || 0),
        allowedTabs: freela.allowedTabs || ['freelancer-tasks'],
        isActive: freela.isActive !== undefined ? freela.isActive : true
      };

      if (onUpdateFreelancer) {
        await onUpdateFreelancer(updatedFreela);
      }

      const updatedSession = {
        ...userSession,
        name: updatedFreela.name,
        email: updatedFreela.username,
        phone: updatedFreela.phone,
        pixKey: updatedFreela.pixKey
      };
      localStorage.setItem('raffa_session_user', JSON.stringify(updatedSession));
      if (onUpdateSession) {
        onUpdateSession(updatedSession);
      }

      setProfileSuccessMsg('✓ Seus dados foram atualizados com sucesso!');
      setTimeout(() => {
        setShowProfileModal(false);
        setProfileSuccessMsg('');
      }, 1400);
    } catch (err) {
      alert('Erro ao salvar alterações: ' + (err.message || 'Tente novamente.'));
    } finally {
      setIsSavingProfile(false);
    }
  };

  function formatDateBR(dateStr) {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  // Retorna badge visual de status geral (Entregue com preenchimento, letra e borda verde)
  const getStatusBadge = (status) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-300">
            <CheckCircle2 size={10} /> Entregue
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-400">
            <CheckCircle2 size={10} /> Pago
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            <Clock size={10} /> Em Andamento
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
            <Clock size={10} /> Pendente
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
            <div>
              <h1 className="font-title text-base font-black text-gray-900 leading-tight">
                {companyInfo?.brandName || 'Matheus Raffa'}
              </h1>
              <p className="text-[11px] text-gray-500 font-medium">Gestão de Demandas & Lançamento de Horas</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-right hidden sm:block">
              <span className="block text-xs font-bold text-gray-900">{userSession?.name}</span>
              <span className="block text-[10px] text-gray-500">{userSession?.specialty || 'Prestador de Serviço'}</span>
            </div>

            {/* Botão de Configurações do Prestador */}
            <button 
              onClick={handleOpenProfileModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-yellow-50 text-gray-700 hover:text-yellow-800 text-xs font-bold rounded-lg transition-colors border border-gray-200 hover:border-yellow-300 cursor-pointer shadow-2xs"
              title="Configurações e Dados do Prestador"
            >
              <Settings size={13} className="text-gray-500 hover:text-yellow-700" />
              <span className="hidden sm:inline">Configurações</span>
            </button>

            {/* Botão de Sair */}
            <button 
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-700 text-xs font-bold rounded-lg transition-colors border border-gray-200 cursor-pointer shadow-2xs"
              title="Sair do Portal"
            >
              <LogOut size={13} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full flex flex-col gap-6">
        
        {/* Welcome Banner */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-2xs">
          <h2 className="text-xl font-black text-gray-950 flex items-center gap-2">
            <span>Olá, {userSession?.name?.split(' ')[0]}!</span>
            <Sparkles size={18} className="text-yellow-500" />
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Confira abaixo suas tarefas em aberto. Ao finalizar cada demanda, registre a data de entrega e as horas técnicas gastas.
          </p>
        </div>

        {/* Barra de Filtro de Período (Mês Atual, Mês Anterior, Personalizado, Todo o período) */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-500 shrink-0" />
            <span className="text-xs font-bold text-gray-900">Período de Referência:</span>
            <span className="text-xs font-semibold text-gray-700">
              {periodLabel}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="inline-flex bg-gray-100 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setPeriodFilter('current_month')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  periodFilter === 'current_month'
                    ? 'bg-white text-gray-950 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Mês Atual
              </button>
              <button
                type="button"
                onClick={() => setPeriodFilter('prev_month')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  periodFilter === 'prev_month'
                    ? 'bg-white text-gray-950 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Mês Anterior
              </button>
              <button
                type="button"
                onClick={() => setPeriodFilter('custom')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  periodFilter === 'custom'
                    ? 'bg-white text-gray-950 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Personalizado
              </button>
              <button
                type="button"
                onClick={() => setPeriodFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  periodFilter === 'all'
                    ? 'bg-white text-gray-950 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Todo o período
              </button>
            </div>

            {periodFilter === 'custom' && (
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1 text-xs animate-in fade-in-0">
                <span className="text-[10px] font-bold text-gray-500 uppercase">De:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-white border border-gray-300 rounded px-1.5 py-0.5 text-xs text-gray-800 font-medium"
                />
                <span className="text-[10px] font-bold text-gray-500 uppercase">Até:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-white border border-gray-300 rounded px-1.5 py-0.5 text-xs text-gray-800 font-medium"
                />
              </div>
            )}
          </div>
        </div>

        {/* Metric Cards Grid com dados do período selecionado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <Clock size={20} />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-gray-500 block">Demandas Pendentes</span>
              <span className="text-xl font-black text-gray-900 font-title">{metrics.pendingCount}</span>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center text-green-600 shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-gray-500 block">Entregues no Período</span>
              <span className="text-xl font-black text-gray-900 font-title">{metrics.deliveredCount}</span>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Calendar size={20} />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-gray-500 block">Horas Realizadas</span>
              <span className="text-xl font-black text-gray-900 font-title">{metrics.totalHours.toFixed(1).replace('.', ',')}h</span>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-yellow-50 border border-yellow-200 flex items-center justify-center text-yellow-700 shrink-0">
              <DollarSign size={20} />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-gray-500 block">Estimativa a Receber</span>
              <span className="text-xl font-black text-gray-900 font-title">{formatCurrency(metrics.estimatedEarnings)}</span>
            </div>
          </div>
        </div>

        {/* Filter Bar com abas completas de status: Todas, Pendentes, Em Andamento, Entregues, Pagas */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs flex flex-col lg:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 w-full lg:w-auto bg-gray-100 p-1 rounded-lg overflow-x-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer shrink-0 ${
                statusFilter === 'all'
                  ? 'bg-white text-gray-950 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Todas ({filterCounts.all})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer shrink-0 ${
                statusFilter === 'pending'
                  ? 'bg-white text-gray-950 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Pendentes ({filterCounts.pending})
            </button>
            <button
              onClick={() => setStatusFilter('in_progress')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer shrink-0 ${
                statusFilter === 'in_progress'
                  ? 'bg-white text-gray-950 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Em Andamento ({filterCounts.in_progress})
            </button>
            <button
              onClick={() => setStatusFilter('delivered')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer shrink-0 ${
                statusFilter === 'delivered'
                  ? 'bg-white text-gray-950 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Entregues ({filterCounts.delivered})
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer shrink-0 ${
                statusFilter === 'paid'
                  ? 'bg-white text-gray-950 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Pagas ({filterCounts.paid})
            </button>
          </div>

          <div className="relative w-full lg:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por tarefa, cliente ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-gray-50/70 hover:bg-white focus:bg-white border border-gray-200 focus:border-gray-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900/10 text-gray-900 font-medium placeholder-gray-400 transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 cursor-pointer"
                title="Limpar busca"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Tasks List / Table com colunas ordenáveis */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-2xs overflow-hidden">
          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
              <CheckCircle2 size={36} className="text-gray-300 mb-1" />
              <p className="text-sm font-bold text-gray-800">
                Nenhuma tarefa encontrada para este filtro/período.
              </p>
              <p className="text-xs text-gray-400">
                Tente alterar o período de datas ou selecionar a aba "Todas".
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    <th 
                      onClick={() => handleSort('title')}
                      className="py-3 px-4 cursor-pointer hover:bg-gray-100/80 transition-colors group select-none"
                      title="Clique para ordenar por Demanda"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={taskSortField === 'title' ? 'text-yellow-950 font-black' : ''}>Demanda / Tarefa</span>
                        {renderSortIcon('title')}
                      </div>
                    </th>

                    <th 
                      onClick={() => handleSort('client')}
                      className="py-3 px-4 cursor-pointer hover:bg-gray-100/80 transition-colors group select-none"
                      title="Clique para ordenar por Cliente"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={taskSortField === 'client' ? 'text-yellow-950 font-black' : ''}>Cliente</span>
                        {renderSortIcon('client')}
                      </div>
                    </th>

                    <th 
                      onClick={() => handleSort('category')}
                      className="py-3 px-4 cursor-pointer hover:bg-gray-100/80 transition-colors group select-none"
                      title="Clique para ordenar por Categoria"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={taskSortField === 'category' ? 'text-yellow-950 font-black' : ''}>Categoria</span>
                        {renderSortIcon('category')}
                      </div>
                    </th>

                    <th 
                      onClick={() => handleSort('requestDate')}
                      className="py-3 px-4 cursor-pointer hover:bg-gray-100/80 transition-colors group select-none"
                      title="Clique para ordenar por Pedido Em"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={taskSortField === 'requestDate' ? 'text-yellow-950 font-black' : ''}>Pedido em</span>
                        {renderSortIcon('requestDate')}
                      </div>
                    </th>

                    <th 
                      onClick={() => handleSort('expectedDueDate')}
                      className="py-3 px-4 cursor-pointer hover:bg-gray-100/80 transition-colors group select-none"
                      title="Clique para ordenar por Prazo Esperado"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={taskSortField === 'expectedDueDate' ? 'text-yellow-950 font-black' : ''}>Prazo Esperado</span>
                        {renderSortIcon('expectedDueDate')}
                      </div>
                    </th>

                    <th 
                      onClick={() => handleSort('status')}
                      className="py-3 px-4 cursor-pointer hover:bg-gray-100/80 transition-colors group select-none"
                      title="Clique para ordenar por Status"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={taskSortField === 'status' ? 'text-yellow-950 font-black' : ''}>Status</span>
                        {renderSortIcon('status')}
                      </div>
                    </th>

                    <th 
                      onClick={() => handleSort('actualDeliveryDate')}
                      className="py-3 px-4 cursor-pointer hover:bg-gray-100/80 transition-colors group select-none"
                      title="Clique para ordenar por Data de Entrega"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={taskSortField === 'actualDeliveryDate' ? 'text-yellow-950 font-black' : ''}>Entregue em</span>
                        {renderSortIcon('actualDeliveryDate')}
                      </div>
                    </th>

                    <th 
                      onClick={() => handleSort('hours')}
                      className="py-3 px-4 text-center cursor-pointer hover:bg-gray-100/80 transition-colors group select-none"
                      title="Clique para ordenar por Horas"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={taskSortField === 'hours' ? 'text-yellow-950 font-black' : ''}>Horas</span>
                        {renderSortIcon('hours')}
                      </div>
                    </th>

                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150">
                  {filteredTasks.map(task => {
                    const clientName = getClientName(task.clientId);
                    const isDelivered = task.status === 'delivered' || task.status === 'paid';

                    return (
                      <tr key={task.id} className="hover:bg-yellow-50/30 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-gray-900">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-bold text-gray-950">{task.title}</span>
                            {task.briefingUrl && (
                              <a 
                                href={task.briefingUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline mt-0.5"
                              >
                                <span>Ver briefing / arquivos</span>
                                <ExternalLink size={10} />
                              </a>
                            )}
                            {task.notes && (
                              <span className="text-[10px] text-gray-400 italic">{task.notes}</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-gray-700 font-medium">
                          <span className="flex items-center gap-1.5">
                            <Building size={12} className="text-gray-400 shrink-0" />
                            <span>{clientName}</span>
                          </span>
                        </td>

                        {/* Categoria padronizada em cinza claro */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                            <Tag size={10} className="text-gray-400" />
                            <span>{task.category || 'Geral'}</span>
                          </span>
                        </td>

                        {/* Pedido em: data em cinza claro */}
                        <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px]">
                          {formatDateBR(task.requestDate)}
                        </td>

                        {/* Prazo Esperado: data em cinza claro igual do pedido em, e texto puro para status (sem borda/fundo) */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-0.5 items-start">
                            <span className="font-mono text-[11px] text-gray-500">
                              {task.expectedDueDate ? formatDateBR(task.expectedDueDate) : <span className="text-gray-400">Sem prazo</span>}
                            </span>
                            {renderDeadlineStatusText(task)}
                          </div>
                        </td>

                        {/* Status Geral (Entregue em verde com borda e preenchimento verde) */}
                        <td className="py-3.5 px-4">
                          {getStatusBadge(task.status)}
                        </td>

                        <td className="py-3.5 px-4 text-gray-700 font-mono text-[11px]">
                          {isDelivered ? (
                            <span className="text-green-700 font-semibold">{formatDateBR(task.actualDeliveryDate)}</span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {task.hours > 0 ? (
                            <span className="inline-block px-2 py-0.5 bg-yellow-100 text-yellow-900 font-bold rounded text-xs">
                              {task.hours.toFixed(1).replace('.', ',')}h
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">-</span>
                          )}
                        </td>

                        {/* Botão de ação: Registrar horas */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleOpenDeliveryModal(task)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                              isDelivered 
                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                                : 'bg-yellow-400 hover:bg-yellow-500 text-gray-950'
                            }`}
                          >
                            <Clock size={13} />
                            <span>Registrar horas</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Profile / Settings Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-lg w-full p-6 animate-in fade-in-0 zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-yellow-100 flex items-center justify-center text-yellow-800 font-bold">
                  <Settings size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-950">Meus Dados & Configurações</h3>
                  <span className="text-[11px] text-gray-500">Atualize seus dados cadastrais, chave PIX/CNPJ e senha de acesso.</span>
                </div>
              </div>
              <button 
                onClick={() => setShowProfileModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {profileSuccessMsg && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={15} />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nome Completo:
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    E-mail / Usuário de Login:
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="email"
                      required
                      value={profileUsername}
                      onChange={(e) => setProfileUsername(e.target.value)}
                      placeholder="exemplo@email.com"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Nova Senha de Acesso:
                  </label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      value={profilePassword}
                      onChange={(e) => setProfilePassword(e.target.value)}
                      placeholder="Deixe em branco p/ manter"
                      className="w-full pl-9 pr-9 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Telefone / WhatsApp:
                  </label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(formatPhone(e.target.value))}
                      placeholder="(99) 99999-9999"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Chave PIX / CNPJ para Pagamento:
                  </label>
                  <div className="relative">
                    <CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text"
                      value={profilePixKey}
                      onChange={(e) => setProfilePixKey(e.target.value)}
                      placeholder="CNPJ, CPF, E-mail ou Telefone"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-yellow-500 font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex items-center gap-1.5 px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-950 text-xs font-bold rounded-lg shadow-xs cursor-pointer transition-colors"
                >
                  <Save size={14} />
                  <span>{isSavingProfile ? 'Salvando...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delivery / Hours Modal */}
      {selectedTaskForDelivery && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-lg w-full p-6 animate-in fade-in-0 zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold">
                  <Clock size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-950">Registrar Horas & Entrega</h3>
                  <span className="text-[11px] text-gray-500">Demanda: {selectedTaskForDelivery.title}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedTaskForDelivery(null)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitDelivery} className="flex flex-col gap-4">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs">
                <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Cliente Associado</span>
                <span className="font-bold text-gray-900 text-sm">{getClientName(selectedTaskForDelivery.clientId)}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Data de Entrega de Fato:
                  </label>
                  <input 
                    type="date"
                    required
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Horas Gastas na Demanda:
                  </label>
                  <input 
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    placeholder="Ex: 3.5"
                    value={deliveryHours}
                    onChange={(e) => setDeliveryHours(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Observações da Entrega / Link do Arquivo Final (opcional):
                </label>
                <textarea 
                  rows={3}
                  placeholder="Ex: Arquivo finalizado enviado no drive, arte pronta para impressão..."
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedTaskForDelivery(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-950 text-xs font-bold rounded-lg shadow-xs cursor-pointer transition-colors"
                >
                  <CheckCircle2 size={14} />
                  <span>{isSubmitting ? 'Salvando...' : 'Confirmar & Lançar Horas'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
