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
  Tag
} from 'lucide-react';

const CATEGORY_COLORS = {
  'Digital': 'bg-blue-50 text-blue-700 border-blue-200',
  'Material Impresso': 'bg-purple-50 text-purple-700 border-purple-200',
  'Folheto / Catálogo': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Rede Social / Post': 'bg-pink-50 text-pink-700 border-pink-200',
  'Anúncio / Tráfego': 'bg-amber-50 text-amber-700 border-amber-200',
  'Landing Page / Site': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Vídeo / Motion': 'bg-red-50 text-red-700 border-red-200',
  'Outro': 'bg-gray-100 text-gray-700 border-gray-200'
};

export default function FreelancerPortal({ 
  userSession, 
  tasks = [], 
  clients = [], 
  categories = [],
  onUpdateTask, 
  onLogout,
  companyInfo = {} 
}) {
  const [statusFilter, setStatusFilter] = useState('pending'); // 'all', 'pending', 'delivered'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTaskForDelivery, setSelectedTaskForDelivery] = useState(null);
  
  // Delivery modal form state
  const [deliveryDate, setDeliveryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [deliveryHours, setDeliveryHours] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mapeia nome do cliente pelo ID
  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'Cliente MHB Raffa';
  };

  // Filtra as tarefas exclusivas deste freelancer
  const myTasks = useMemo(() => {
    return tasks.filter(t => t.freelancerId === userSession?.freelancerId || t.freelancerId === userSession?.id);
  }, [tasks, userSession]);

  // Métricas do mês atual
  const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  
  const metrics = useMemo(() => {
    const pendingTasks = myTasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
    const deliveredThisMonth = myTasks.filter(t => {
      if (t.status !== 'delivered' && t.status !== 'paid') return false;
      const date = t.actualDeliveryDate || t.requestDate || '';
      return date.startsWith(currentMonthKey);
    });

    const totalHoursThisMonth = deliveredThisMonth.reduce((acc, t) => acc + (parseFloat(t.hours) || 0), 0);
    const hourlyRate = parseFloat(userSession?.hourlyRate) || 0;
    const estimatedEarnings = totalHoursThisMonth * hourlyRate;

    return {
      pendingCount: pendingTasks.length,
      deliveredMonthCount: deliveredThisMonth.length,
      totalHoursMonth: totalHoursThisMonth,
      estimatedEarnings
    };
  }, [myTasks, currentMonthKey, userSession]);

  // Lista filtrada para exibição
  const filteredTasks = useMemo(() => {
    return myTasks.filter(task => {
      // Filtro de status
      if (statusFilter === 'pending' && task.status !== 'pending' && task.status !== 'in_progress') return false;
      if (statusFilter === 'delivered' && task.status !== 'delivered' && task.status !== 'paid') return false;

      // Filtro de busca
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const clientName = getClientName(task.clientId).toLowerCase();
        const title = (task.title || '').toLowerCase();
        const category = (task.category || '').toLowerCase();
        return title.includes(term) || clientName.includes(term) || category.includes(term);
      }

      return true;
    }).sort((a, b) => {
      // Prioriza pendentes com prazo mais próximo
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.requestDate || 0) - new Date(a.requestDate || 0);
    });
  }, [myTasks, statusFilter, searchTerm, clients]);

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

  const formatDateBR = (dateStr) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  // Verifica urgência da data esperada
  const getDueBadge = (dueDateStr, status) => {
    if (status === 'delivered' || status === 'paid') {
      return <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">Entregue</span>;
    }
    if (!dueDateStr) return <span className="text-gray-400 text-xs">-</span>;

    const todayStr = new Date().toISOString().split('T')[0];
    if (dueDateStr < todayStr) {
      return (
        <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 flex items-center gap-1">
          <AlertCircle size={10} /> Atrasado ({formatDateBR(dueDateStr)})
        </span>
      );
    } else if (dueDateStr === todayStr) {
      return (
        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
          Vence Hoje ({formatDateBR(dueDateStr)})
        </span>
      );
    }
    return (
      <span className="text-[10px] font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
        Prazo: {formatDateBR(dueDateStr)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-title text-base font-black text-gray-900 leading-tight">
                  {companyInfo?.brandName || 'Matheus Raffa'}
                </h1>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-yellow-100 text-yellow-800 border border-yellow-300 px-2 py-0.5 rounded-md">
                  Portal do Prestador
                </span>
              </div>
              <p className="text-[11px] text-gray-500 font-medium">Gestão de Demandas & Lançamento de Horas</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="block text-xs font-bold text-gray-900">{userSession?.name}</span>
              <span className="block text-[10px] text-gray-500">{userSession?.specialty || 'Prestador de Serviço'}</span>
            </div>
            <button 
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-700 text-xs font-bold rounded-lg transition-colors border border-gray-200 cursor-pointer"
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
        {/* Welcome & Banner */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-black text-gray-950 flex items-center gap-2">
              <span>Olá, {userSession?.name?.split(' ')[0]}!</span>
              <Sparkles size={18} className="text-yellow-500" />
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Confira abaixo suas tarefas em aberto. Ao finalizar cada demanda, registre a data de entrega e as horas técnicas gastas.
            </p>
          </div>

          {userSession?.hourlyRate > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2.5 text-right shrink-0">
              <span className="text-[10px] font-bold text-yellow-800 uppercase tracking-wider block">Valor da Hora Contratada</span>
              <span className="text-base font-black text-yellow-950 font-title">{formatCurrency(userSession.hourlyRate)}/h</span>
            </div>
          )}
        </div>

        {/* Metric Cards Grid */}
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
              <span className="text-[11px] font-semibold text-gray-500 block">Entregues no Mês</span>
              <span className="text-xl font-black text-gray-900 font-title">{metrics.deliveredMonthCount}</span>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Calendar size={20} />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-gray-500 block">Horas Realizadas (Mês)</span>
              <span className="text-xl font-black text-gray-900 font-title">{metrics.totalHoursMonth.toFixed(1).replace('.', ',')}h</span>
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

        {/* Filter Bar */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 w-full sm:w-auto bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'pending'
                  ? 'bg-white text-gray-950 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Pendentes ({metrics.pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('delivered')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'delivered'
                  ? 'bg-white text-gray-950 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Concluídas
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-gray-950 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Todas ({myTasks.length})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-3 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por tarefa ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-yellow-500 focus:bg-white text-gray-900"
            />
          </div>
        </div>

        {/* Tasks List / Table */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-2xs overflow-hidden">
          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
              <CheckCircle2 size={36} className="text-gray-300 mb-1" />
              <p className="text-sm font-bold text-gray-800">
                {statusFilter === 'pending' ? 'Tudo em dia! Nenhuma tarefa pendente no momento.' : 'Nenhuma tarefa encontrada com os filtros aplicados.'}
              </p>
              <p className="text-xs text-gray-400">
                Assim que o Matheus atribuir novas demandas a você, elas aparecerão listadas aqui.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Demanda / Tarefa</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4">Pedido em</th>
                    <th className="py-3 px-4">Prazo Esperado</th>
                    <th className="py-3 px-4">Entregue em</th>
                    <th className="py-3 px-4 text-center">Horas</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150">
                  {filteredTasks.map(task => {
                    const clientName = getClientName(task.clientId);
                    const catBadgeStyle = CATEGORY_COLORS[task.category] || CATEGORY_COLORS['Outro'] || 'bg-yellow-50 text-yellow-800 border-yellow-200';
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

                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${catBadgeStyle}`}>
                            <Tag size={10} />
                            <span>{task.category || 'Digital'}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px]">
                          {formatDateBR(task.requestDate)}
                        </td>

                        <td className="py-3.5 px-4">
                          {getDueBadge(task.expectedDueDate, task.status)}
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

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleOpenDeliveryModal(task)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                              isDelivered 
                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                                : 'bg-yellow-400 hover:bg-yellow-500 text-gray-950'
                            }`}
                          >
                            <CheckCircle2 size={13} />
                            <span>{isDelivered ? 'Editar Horas' : 'Entregar & Lançar Horas'}</span>
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
                  <h3 className="text-sm font-bold text-gray-950">Lançar Horas & Entrega</h3>
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
                    className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-yellow-500 font-medium"
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
                    className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-yellow-500 font-bold"
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
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-yellow-500"
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
                  <span>{isSubmitting ? 'Salvando...' : 'Confirmar Entrega & Lançar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
