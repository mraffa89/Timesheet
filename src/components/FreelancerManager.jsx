import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Users, 
  Briefcase, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Download, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  Check, 
  Send, 
  X,
  Phone,
  Mail,
  Key,
  Shield,
  Building,
  Tag,
  PieChart,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Receipt,
  CreditCard,
  Layers,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatPhone, formatCpfCnpj } from '../utils/cnpjLookup';
import { createAsaasPixTransfer, fetchAsaasTransferReceipt, detectPixKeyType } from '../utils/asaasIntegration';
import { generatePayrollPdf } from '../utils/pdfGenerator';

const CATEGORIES = [
  'Digital',
  'Material Impresso',
  'Folheto / Catálogo',
  'Rede Social / Post',
  'Anúncio / Tráfego',
  'Landing Page / Site',
  'Vídeo / Motion',
  'Outro'
];

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

const AVAILABLE_TABS = [
  { id: 'freelancer-tasks', label: 'Minhas Demandas (Portal Freela)' },
  { id: 'timesheet', label: 'Visualizar Timesheet Geral' },
  { id: 'clients', label: 'Visualizar Clientes' },
  { id: 'dashboard', label: 'Visualizar Dashboard' }
];

/**
 * Componente reutilizável de seleção com busca dinâmica por escrita e autopreenchimento
 */
function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Selecione...',
  searchPlaceholder = 'Digite para filtrar...',
  allowCustom = false,
  icon: IconComponent = null,
  required = false,
  className = '',
  buttonClassName = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

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

  const selectedOption = options.find(opt => String(opt.value) === String(value));

  const filteredOptions = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return options;
    return options.filter(opt => {
      const l = (opt.label || '').toLowerCase();
      const sub = (opt.sublabel || '').toLowerCase();
      const kw = (opt.keywords || '').toLowerCase();
      return l.includes(term) || sub.includes(term) || kw.includes(term);
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

  const showCustomOption = allowCustom && search.trim().length > 0 && !options.some(o => (o.label || '').toLowerCase() === search.trim().toLowerCase());

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between border rounded-lg px-3 py-2 text-xs text-left bg-gray-50/70 hover:bg-white focus:bg-white focus:outline-none transition-all cursor-pointer ${
          isOpen ? 'border-gray-900 ring-2 ring-gray-900/10 bg-white' : 'border-gray-200 hover:border-gray-300'
        } ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1 mr-1">
          {IconComponent && <IconComponent size={13} className="text-gray-400 shrink-0" />}
          {selectedOption ? (
            <div className="flex items-center gap-1.5 truncate">
              {selectedOption.badge && (
                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 border ${selectedOption.badgeClass || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                  {selectedOption.badge}
                </span>
              )}
              <span className="font-bold text-gray-900 truncate">{selectedOption.label}</span>
              {selectedOption.sublabel && (
                <span className="text-gray-400 text-[11px] truncate hidden sm:inline">({selectedOption.sublabel})</span>
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
              <X size={12} />
            </span>
          )}
          <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-gray-900' : 'text-gray-400'}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-[70] left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl p-2 flex flex-col gap-1.5 animate-in fade-in-0 zoom-in-95">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              autoFocus
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-900 focus:bg-white text-gray-900 font-medium placeholder-gray-400"
            />
          </div>

          <div className="overflow-y-auto max-h-48 divide-y divide-gray-50 scrollbar-thin">
            {showCustomOption && (
              <button
                type="button"
                onClick={() => handleSelect(search.trim())}
                className="w-full text-left p-2 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-900 flex items-center justify-between cursor-pointer mb-1 border border-gray-200"
              >
                <span>Usar "<strong>{search.trim()}</strong>"</span>
                <span className="text-[10px] bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded font-bold">Novo</span>
              </button>
            )}

            {filteredOptions.length === 0 && !showCustomOption ? (
              <div className="p-3 text-center text-xs text-gray-400">
                Nenhum resultado encontrado.
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full text-left p-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-gray-100 text-gray-950 font-bold border border-gray-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      {opt.badge && (
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 border ${opt.badgeClass || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                          {opt.badge}
                        </span>
                      )}
                      <div className="flex flex-col truncate">
                        <span className="truncate">{opt.label}</span>
                        {opt.sublabel && (
                          <span className="text-[10px] text-gray-400 font-normal truncate">{opt.sublabel}</span>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check size={14} className="text-gray-950 shrink-0 font-bold" />}
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

export default function FreelancerManager({
  freelancers = [],
  tasks = [],
  clients = [],
  entries = [],
  companyInfo = {},
  categories = [],
  freelancerEmailSubjectTemplate,
  freelancerEmailBodyTemplate,
  onAddCategory,
  onAddFreelancer,
  onUpdateFreelancer,
  onDeleteFreelancer,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onBatchUpdateTasks,
  onBatchDeleteTasks
}) {
  const [activeSubTab, setActiveSubTab] = useState('tasks'); // 'tasks', 'freelancers', 'payroll'
  
  // Task filters
  const [taskStatusFilter, setTaskStatusFilter] = useState('all');
  const [taskFreelancerFilter, setTaskFreelancerFilter] = useState('all');
  const [taskClientFilter, setTaskClientFilter] = useState('all');
  const [taskSearchTerm, setTaskSearchTerm] = useState('');

  // Task Table Sorting
  const [taskSortField, setTaskSortField] = useState('requestDate');
  const [taskSortOrder, setTaskSortOrder] = useState('desc');

  // Batch Selection & Operations
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchUpdates, setBatchUpdates] = useState({
    clientId: '',
    freelancerId: '',
    category: '',
    status: ''
  });

  // PIX Payments via Asaas
  const [isPixPaymentModalOpen, setIsPixPaymentModalOpen] = useState(false);
  const [pixScheduleDate, setPixScheduleDate] = useState('');
  const [isSubmittingPix, setIsSubmittingPix] = useState(false);
  const [pixSuccessData, setPixSuccessData] = useState(null);
  const [viewingReceiptTask, setViewingReceiptTask] = useState(null);

  const handleHeaderSort = (field) => {
    if (taskSortField === field) {
      setTaskSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setTaskSortField(field);
      setTaskSortOrder('asc');
    }
  };

  const renderSortIndicator = (field) => {
    if (taskSortField !== field) return <ArrowUpDown size={11} className="text-gray-300 ml-1.5 inline-block shrink-0" />;
    return taskSortOrder === 'asc' 
      ? <ArrowUp size={11} className="text-yellow-600 ml-1.5 inline-block shrink-0" /> 
      : <ArrowDown size={11} className="text-yellow-600 ml-1.5 inline-block shrink-0" />;
  };

  // Payroll Period Filters (Mês Atual, Mês Anterior, Selecionar Mês, Período Customizado)
  const [payrollPeriodFilter, setPayrollPeriodFilter] = useState('current_month');
  const [payrollSelectedMonth, setPayrollSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [payrollCustomStartDate, setPayrollCustomStartDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  });
  const [payrollCustomEndDate, setPayrollCustomEndDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  const [payrollFreelancerId, setPayrollFreelancerId] = useState('all');
  const [payrollStatusFilter, setPayrollStatusFilter] = useState('all'); // 'all', 'delivered' (não pago), 'paid' (pago)

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [isFreelancerModalOpen, setIsFreelancerModalOpen] = useState(false);
  const [editingFreelancer, setEditingFreelancer] = useState(null);

  const [copiedWhatsAppMsg, setCopiedWhatsAppMsg] = useState(false);

  // Email modal state
  const [isFreelancerEmailModalOpen, setIsFreelancerEmailModalOpen] = useState(false);
  const [freelancerEmailTo, setFreelancerEmailTo] = useState('');
  const [freelancerEmailCc, setFreelancerEmailCc] = useState('');
  const [freelancerEmailSubject, setFreelancerEmailSubject] = useState('');
  const [freelancerEmailBody, setFreelancerEmailBody] = useState('');
  const [copiedFreelancerEmailBody, setCopiedFreelancerEmailBody] = useState(false);
  const [isSendingFreelancerEmail, setIsSendingFreelancerEmail] = useState(false);
  const [freelancerEmailSuccess, setFreelancerEmailSuccess] = useState(false);

  // Form states - Task
  const [taskForm, setTaskForm] = useState({
    title: '',
    freelancerId: '',
    clientId: '',
    category: 'Digital',
    requestDate: new Date().toISOString().split('T')[0],
    expectedDueDate: '',
    actualDeliveryDate: '',
    hours: '',
    briefingUrl: '',
    notes: '',
    status: 'pending'
  });

  // Form states - Freelancer
  const [freelancerForm, setFreelancerForm] = useState({
    name: '',
    username: '',
    password: '',
    hourlyRate: '50',
    specialty: 'Designer',
    pixKey: '',
    phone: '',
    allowedTabs: ['freelancer-tasks'],
    isActive: true
  });

  // Helper de clientes
  const getClientName = (clientId) => {
    const c = clients.find(cl => cl.id === clientId);
    return c ? c.name : 'Cliente MHB Raffa';
  };

  // Helper de freelancers
  const getFreelancer = (fId) => {
    return freelancers.find(f => f.id === fId);
  };

  const getFreelancerName = (fId) => {
    const f = getFreelancer(fId);
    return f ? f.name : 'Não Atribuído';
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

  // Unique months presentes nas tarefas
  const uniqueMonths = useMemo(() => {
    const months = new Set();
    const today = new Date();
    months.add(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
    tasks.forEach(t => {
      const d = t.actualDeliveryDate || t.requestDate;
      if (d && d.length >= 7) {
        months.add(d.substring(0, 7));
      }
    });
    return Array.from(months).sort().reverse();
  }, [tasks]);

  const getMonthNamePT = (mKey) => {
    if (!mKey || !mKey.includes('-')) return mKey;
    const [y, m] = mKey.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  // Opções estruturadas para os SearchableSelects (Autocomplete / Digitação)
  const clientOptions = useMemo(() => {
    return [...clients]
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' }))
      .map(c => ({
        value: c.id,
        label: c.name,
        sublabel: c.cnpj ? formatCpfCnpj(c.cnpj) : '',
        keywords: `${c.cnpj || ''} ${c.email || ''}`
      }));
  }, [clients]);

  // Apenas clientes com assinatura ativa ou fatura/demanda faturável no mês de referência
  const activeClientOptions = useMemo(() => {
    // Determina o mês de referência da demanda (data de pedido da demanda ou mês do fechamento)
    const targetMonth = (taskForm.requestDate && taskForm.requestDate.length >= 7)
      ? taskForm.requestDate.substring(0, 7)
      : payrollSelectedMonth;

    return clients
      .filter(c => {
        // Se estiver editando e o cliente já estiver associado à demanda, mantém na lista
        if (taskForm.clientId && c.id === taskForm.clientId) return true;

        // Cliente não pode estar inativo
        if (c.isActive === false) return false;

        // 1. Possui assinatura recorrente ativa (Asaas ou contrato fixo/híbrido)
        const hasSub = c.hasActiveSubscription === true || 
                       c.has_active_subscription === true || 
                       ((c.contractType === 'fixed' || c.contractType === 'hybrid') && parseFloat(c.fixedFee) > 0);
        if (hasSub) return true;

        // 2. Possui demanda faturável (billable) com horas no mês de referência
        const hasBillableInMonth = entries.some(e => {
          if (e.clientId !== c.id) return false;
          const isBillable = e.billable === true || String(e.billable).toLowerCase() === 'true' || e.isBillable === true;
          if (!isBillable) return false;
          const hours = parseFloat(e.hours) || 0;
          if (hours <= 0) return false;
          const dateStr = e.deliveryDate || e.requestDate || '';
          return dateStr.includes(targetMonth);
        });
        if (hasBillableInMonth) return true;

        // 3. Possui cobrança Asaas salva para o cliente e mês
        const hasSavedInvoice = !!localStorage.getItem(`raffa_asaas_billing_${c.id}_${targetMonth}`);
        if (hasSavedInvoice) return true;

        return false;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' }))
      .map(c => ({
        value: c.id,
        label: c.name,
        sublabel: c.cnpj ? formatCpfCnpj(c.cnpj) : '',
        keywords: `${c.cnpj || ''} ${c.email || ''}`
      }));
  }, [clients, taskForm.clientId, taskForm.requestDate, payrollSelectedMonth, entries]);

  const freelancerOptions = useMemo(() => {
    return [...freelancers]
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' }))
      .map(f => ({
        value: f.id,
        label: f.name,
        sublabel: `${f.specialty || 'Prestador'} • ${formatCurrency(f.hourlyRate)}/h`,
        keywords: `${f.specialty || ''} ${f.username || ''} ${f.pixKey || ''}`
      }));
  }, [freelancers]);

  const categoryOptions = useMemo(() => {
    const list = categories && categories.length > 0 ? categories : CATEGORIES;
    return list.map(cat => ({
      value: cat,
      label: cat,
      badge: cat,
      badgeClass: CATEGORY_COLORS[cat] || 'bg-yellow-50 text-yellow-800 border-yellow-200'
    }));
  }, [categories]);

  const statusOptions = useMemo(() => [
    { value: 'pending', label: 'Pendente', badge: 'Pendente', badgeClass: 'bg-gray-100 text-gray-700 border-gray-200' },
    { value: 'in_progress', label: 'Em Andamento', badge: 'Em Andamento', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
    { value: 'delivered', label: 'Entregue', badge: 'Entregue', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
    { value: 'paid', label: 'Pago', badge: 'Pago', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  ], []);

  const filterStatusOptions = useMemo(() => [
    { value: 'all', label: 'Todos os Status' },
    { value: 'pending', label: 'Pendentes', badge: 'Pendente', badgeClass: 'bg-gray-100 text-gray-700 border-gray-200' },
    { value: 'in_progress', label: 'Em Andamento', badge: 'Em Andamento', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
    { value: 'delivered', label: 'Entregues', badge: 'Entregue', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
    { value: 'paid', label: 'Pagas', badge: 'Pago', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  ], []);

  const filterFreelancerOptions = useMemo(() => [
    { value: 'all', label: 'Todos os Prestadores' },
    ...freelancerOptions
  ], [freelancerOptions]);

  const filterClientOptions = useMemo(() => [
    { value: 'all', label: 'Todos os Clientes' },
    ...clientOptions
  ], [clientOptions]);

  // Filtragem e ordenação dinâmica de tarefas
  const filteredTasks = useMemo(() => {
    const list = tasks.filter(t => {
      if (taskStatusFilter !== 'all' && t.status !== taskStatusFilter) return false;
      if (taskFreelancerFilter !== 'all' && t.freelancerId !== taskFreelancerFilter) return false;
      if (taskClientFilter !== 'all' && t.clientId !== taskClientFilter) return false;
      if (taskSearchTerm.trim()) {
        const term = taskSearchTerm.toLowerCase();
        const title = (t.title || '').toLowerCase();
        const clientName = getClientName(t.clientId).toLowerCase();
        const freelaName = getFreelancerName(t.freelancerId).toLowerCase();
        return title.includes(term) || clientName.includes(term) || freelaName.includes(term);
      }
      return true;
    });

    return list.sort((a, b) => {
      let comparison = 0;
      switch (taskSortField) {
        case 'title':
          comparison = (a.title || '').localeCompare(b.title || '', 'pt-BR', { sensitivity: 'base' });
          break;
        case 'freelancer': {
          const nameA = getFreelancer(a.freelancerId)?.name || '';
          const nameB = getFreelancer(b.freelancerId)?.name || '';
          comparison = nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
          break;
        }
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
  }, [tasks, taskStatusFilter, taskFreelancerFilter, taskClientFilter, taskSearchTerm, clients, freelancers, taskSortField, taskSortOrder]);

  // Intervalo de datas do período de fechamento (Mês Atual, Mês Anterior, Selecionar Mês, Customizado)
  const payrollDateRange = useMemo(() => {
    const today = new Date();
    if (payrollPeriodFilter === 'current_month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
      return { start, end };
    }
    if (payrollPeriodFilter === 'prev_month') {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
      const end = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
      return { start, end };
    }
    if (payrollPeriodFilter === 'select_month') {
      if (!payrollSelectedMonth || !payrollSelectedMonth.includes('-')) {
        const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
        return { start, end };
      }
      const [y, m] = payrollSelectedMonth.split('-').map(Number);
      const start = new Date(y, m - 1, 1).toISOString().split('T')[0];
      const end = new Date(y, m, 0).toISOString().split('T')[0];
      return { start, end };
    }
    if (payrollPeriodFilter === 'custom') {
      return {
        start: payrollCustomStartDate || '2000-01-01',
        end: payrollCustomEndDate || '2099-12-31'
      };
    }
    return { start: '2000-01-01', end: '2099-12-31' };
  }, [payrollPeriodFilter, payrollSelectedMonth, payrollCustomStartDate, payrollCustomEndDate]);

  const payrollPeriodLabel = useMemo(() => {
    if (payrollPeriodFilter === 'current_month') {
      const today = new Date();
      return `Mês Atual (${today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })})`;
    }
    if (payrollPeriodFilter === 'prev_month') {
      const today = new Date();
      const prevDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return `Mês Anterior (${prevDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })})`;
    }
    if (payrollPeriodFilter === 'select_month') {
      return getMonthNamePT(payrollSelectedMonth);
    }
    if (payrollPeriodFilter === 'custom') {
      return `${formatDateBR(payrollCustomStartDate)} a ${formatDateBR(payrollCustomEndDate)}`;
    }
    return 'Período Completo';
  }, [payrollPeriodFilter, payrollSelectedMonth, payrollCustomStartDate, payrollCustomEndDate]);

  // Cálculos de Fechamento / Folha de Pagamento por Intervalo
  const payrollData = useMemo(() => {
    const { start, end } = payrollDateRange;
    const monthTasks = tasks.filter(t => {
      const date = t.actualDeliveryDate || t.requestDate || (t.paymentDate ? t.paymentDate.split('T')[0] : '') || '';
      if (date < start || date > end) return false;
      if (payrollFreelancerId !== 'all' && t.freelancerId !== payrollFreelancerId) return false;
      return true;
    });

    const deliveredMonthTasks = monthTasks.filter(t => {
      if (payrollStatusFilter === 'delivered') return t.status === 'delivered';
      if (payrollStatusFilter === 'paid') return t.status === 'paid';
      return t.status === 'delivered' || t.status === 'paid';
    });

    const totalHours = deliveredMonthTasks.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0);
    
    // Total R$ a pagar
    let totalAmountToPay = 0;
    deliveredMonthTasks.forEach(t => {
      const freela = getFreelancer(t.freelancerId);
      const rate = freela ? (parseFloat(freela.hourlyRate) || 0) : 0;
      totalAmountToPay += (parseFloat(t.hours) || 0) * rate;
    });

    // Identificação de quitação
    const paidTasks = deliveredMonthTasks.filter(t => t.status === 'paid');
    const isAllPaid = deliveredMonthTasks.length > 0 && paidTasks.length === deliveredMonthTasks.length;
    const hasAnyPaid = paidTasks.length > 0;
    const paymentIds = Array.from(new Set(paidTasks.map(t => t.paymentId).filter(Boolean)));
    const paymentDates = Array.from(new Set(paidTasks.map(t => t.paymentDate).filter(Boolean)));
    const paymentReceiptUrls = Array.from(new Set(paidTasks.map(t => t.paymentReceiptUrl).filter(Boolean)));

    // Distribuição por cliente
    const byClientMap = {};
    deliveredMonthTasks.forEach(t => {
      const cName = getClientName(t.clientId);
      byClientMap[cName] = (byClientMap[cName] || 0) + (parseFloat(t.hours) || 0);
    });

    // Distribuição por categoria
    const byCategoryMap = {};
    deliveredMonthTasks.forEach(t => {
      const cat = t.category || 'Digital';
      byCategoryMap[cat] = (byCategoryMap[cat] || 0) + (parseFloat(t.hours) || 0);
    });

    return {
      monthTasks,
      deliveredMonthTasks,
      totalHours,
      totalAmountToPay,
      isAllPaid,
      hasAnyPaid,
      paymentIds,
      paymentDates,
      paymentReceiptUrls,
      byClient: Object.entries(byClientMap).map(([name, hours]) => ({ name, hours })),
      byCategory: Object.entries(byCategoryMap).map(([name, hours]) => ({ name, hours }))
    };
  }, [tasks, payrollDateRange, payrollFreelancerId, payrollStatusFilter, freelancers, clients]);

  // ═══════════════════════════════════════════════════════════════════════
  // CÁLCULOS E AÇÕES EM LOTE (SELEÇÃO, SOMA DE HORAS, PIX, EXCLUSÃO)
  // ═══════════════════════════════════════════════════════════════════════
  const selectedTasksList = useMemo(() => {
    return tasks.filter(t => selectedTaskIds.has(t.id));
  }, [tasks, selectedTaskIds]);

  const selectedTasksTotalHours = useMemo(() => {
    return selectedTasksList.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0);
  }, [selectedTasksList]);

  // Verifica se todas as demandas selecionadas pertencem ao mesmo prestador
  const selectedTasksFreelancer = useMemo(() => {
    if (selectedTasksList.length === 0) return null;
    const firstFreelaId = selectedTasksList[0].freelancerId;
    const allSame = selectedTasksList.every(t => t.freelancerId === firstFreelaId);
    if (!allSame) return null;
    return getFreelancer(firstFreelaId) || null;
  }, [selectedTasksList, freelancers]);

  const selectedTasksTotalAmount = useMemo(() => {
    if (!selectedTasksFreelancer) return 0;
    const rate = parseFloat(selectedTasksFreelancer.hourlyRate) || 0;
    return selectedTasksTotalHours * rate;
  }, [selectedTasksTotalHours, selectedTasksFreelancer]);

  const handleToggleSelectAll = () => {
    if (selectedTaskIds.size === filteredTasks.length && filteredTasks.length > 0) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(filteredTasks.map(t => t.id)));
    }
  };

  const handleToggleSelectTask = (taskId, e) => {
    if (e) e.stopPropagation();
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleBatchApplyField = async (field, value) => {
    if (selectedTaskIds.size === 0) return;
    if (onBatchUpdateTasks) {
      await onBatchUpdateTasks(Array.from(selectedTaskIds), { [field]: value });
    }
  };

  const handleBatchSubmitModal = async (e) => {
    e.preventDefault();
    const updates = {};
    if (batchUpdates.clientId) updates.clientId = batchUpdates.clientId;
    if (batchUpdates.freelancerId) updates.freelancerId = batchUpdates.freelancerId;
    if (batchUpdates.category) updates.category = batchUpdates.category;
    if (batchUpdates.status) updates.status = batchUpdates.status;

    if (Object.keys(updates).length === 0) {
      alert('Nenhum campo selecionado para alteração.');
      return;
    }

    if (onBatchUpdateTasks) {
      await onBatchUpdateTasks(Array.from(selectedTaskIds), updates);
    }
    setIsBatchModalOpen(false);
    setBatchUpdates({ clientId: '', freelancerId: '', category: '', status: '' });
  };

  const handleBatchDelete = async () => {
    if (selectedTaskIds.size === 0) return;
    if (!confirm(`Deseja realmente excluir as ${selectedTaskIds.size} demandas selecionadas? Esta ação não pode ser desfeita.`)) {
      return;
    }
    if (onBatchDeleteTasks) {
      await onBatchDeleteTasks(Array.from(selectedTaskIds));
      setSelectedTaskIds(new Set());
    }
  };

  const handleOpenPixPaymentModal = () => {
    if (selectedTasksList.length === 0) return;

    if (!selectedTasksFreelancer) {
      alert('Para realizar o pagamento PIX em lote, todas as demandas selecionadas devem pertencer ao mesmo prestador/freelancer.');
      return;
    }

    if (!selectedTasksFreelancer.pixKey) {
      alert(`O prestador ${selectedTasksFreelancer.name} não possui chave PIX cadastrada. Acesse a aba Prestadores e adicione a chave PIX antes de efetuar o pagamento.`);
      return;
    }

    setPixScheduleDate('');
    setIsPixPaymentModalOpen(true);
  };

  const handleConfirmPixTransfer = async () => {
    if (!selectedTasksFreelancer) return;
    setIsSubmittingPix(true);
    try {
      const pixKeyType = detectPixKeyType(selectedTasksFreelancer.pixKey);
      const res = await createAsaasPixTransfer({
        value: selectedTasksTotalAmount,
        pixKey: selectedTasksFreelancer.pixKey,
        pixKeyType,
        description: `Fechamento ${selectedTasksFreelancer.name} (${selectedTasksTotalHours.toFixed(1)}h)`,
        scheduleDate: pixScheduleDate || null
      });

      const paymentDate = new Date().toISOString().split('T')[0];
      const updates = {
        status: 'paid',
        paymentId: res.id || `pix_${Date.now()}`,
        paymentDate: paymentDate,
        paymentValue: selectedTasksTotalAmount,
        paymentReceiptUrl: res.receiptUrl || null
      };

      if (onBatchUpdateTasks) {
        await onBatchUpdateTasks(Array.from(selectedTaskIds), updates);
      }

      setIsPixPaymentModalOpen(false);
      setPixSuccessData({
        transfer: res,
        freelancer: selectedTasksFreelancer,
        tasks: selectedTasksList,
        totalHours: selectedTasksTotalHours,
        totalAmount: selectedTasksTotalAmount,
        date: paymentDate
      });
      setSelectedTaskIds(new Set());
    } catch (err) {
      alert('Erro ao realizar transferência no Asaas: ' + (err.message || 'Falha na conexão'));
    } finally {
      setIsSubmittingPix(false);
    }
  };

  const handleSendWhatsAppReceipt = (data) => {
    const freela = data.freelancer;
    const phoneDigits = (freela.phone || '').replace(/\D/g, '');
    let text = `*COMPROVANTE DE PAGAMENTO PIX - MHB RAFFA*\n`;
    text += `Olá, ${freela.name}!\n\n`;
    text += `Seu pagamento referente às demandas prestadas foi efetuado/agendado via PIX com sucesso!\n\n`;
    text += `📋 *DEMANDAS QUITADAS:*\n`;
    data.tasks.forEach((t, i) => {
      text += `${i + 1}. *${t.title}* - ${parseFloat(t.hours).toFixed(1)}h (${getClientName(t.clientId)})\n`;
    });
    text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `⏱️ *Total de Horas:* ${data.totalHours.toFixed(1).replace('.', ',')}h\n`;
    text += `💰 *Valor Total Pago:* ${formatCurrency(data.totalAmount)}\n`;
    text += `🔑 *Chave PIX:* ${freela.pixKey}\n`;
    if (data.transfer?.id) {
      text += `🆔 *ID Transferência Asaas:* ${data.transfer.id}\n`;
    }
    text += `📅 *Data:* ${formatDateBR(data.date)}\n`;
    text += `\nAgradecemos muito pela dedicação e parceria!\n`;
    text += `*${companyInfo?.brandName || 'Matheus Raffa'}*`;

    navigator.clipboard.writeText(text);
    if (phoneDigits) {
      window.open(`https://wa.me/55${phoneDigits}?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      alert('Relatório copiado para a área de transferência! (O prestador não possui telefone com WhatsApp cadastrado)');
    }
  };

  const handleOpenFreelancerEmailModal = (customPayload = null) => {
    let freela = null;
    let targetTasks = [];
    let totalHours = 0;
    let totalAmount = 0;
    let paymentId = '';
    let paymentDate = '';

    if (customPayload) {
      freela = customPayload.freelancer;
      targetTasks = customPayload.tasks || [];
      totalHours = customPayload.totalHours || 0;
      totalAmount = customPayload.totalAmount || 0;
      paymentId = customPayload.transfer?.id || '';
      paymentDate = customPayload.date || '';
    } else {
      if (payrollData.deliveredMonthTasks.length === 0) {
        alert('Não há demandas entregues ou pagas no período selecionado.');
        return;
      }
      freela = getFreelancer(payrollFreelancerId);
      targetTasks = payrollData.deliveredMonthTasks;
      totalHours = payrollData.totalHours;
      totalAmount = payrollData.totalAmountToPay;
      paymentId = payrollData.paymentIds.join(', ') || '';
      paymentDate = payrollData.paymentDates[0] || '';
    }

    if (!freela && targetTasks.length > 0) {
      freela = getFreelancer(targetTasks[0].freelancerId);
    }

    const recipientEmail = freela?.email || (freela?.username && freela.username.includes('@') ? freela.username : '') || '';
    setFreelancerEmailTo(recipientEmail);
    setFreelancerEmailCc(companyInfo?.email || '');
    setFreelancerEmailSuccess(false);
    setIsSendingFreelancerEmail(false);

    const rawSubj = freelancerEmailSubjectTemplate || 'Comprovante de Pagamento PIX - Fechamento de Demandas - {nome_freelancer}';
    const rawBody = freelancerEmailBodyTemplate || `Olá, {nome_freelancer}!\n\nInformamos que o seu pagamento referente às demandas prestadas foi efetuado via PIX com sucesso!\n\n📋 RESUMO DO FECHAMENTO:\n• Período de Referência: {periodo_referencia}\n• Quantidade de Demandas: {quantidade_demandas}\n• Total de Horas Realizadas: {total_horas}h\n• Valor Total Quitado: {valor_total}\n• Favorecido: {nome_freelancer}\n• Chave PIX: {chave_pix}\n• ID da Transação Asaas: {id_transacao_pix}\n• Data da Quitação: {data_pagamento}\n\nDEMANDAS QUITADAS:\n{lista_demandas}\n\nO relatório completo e detalhado com todas as atividades executadas segue em anexo em formato PDF.\n\nAtenciosamente,\n{minha_empresa}\n{meu_telefone} | {meu_email}`;

    const demandListStr = targetTasks.map((t, idx) => {
      const cName = getClientName(t.clientId);
      return `${idx + 1}. ${t.title} (${cName}) - ${parseFloat(t.hours).toFixed(1)}h`;
    }).join('\n');

    const replacements = {
      '{nome_freelancer}': freela?.name || 'Prestador',
      '{periodo_referencia}': payrollPeriodLabel || 'Período Atual',
      '{quantidade_demandas}': String(targetTasks.length),
      '{total_horas}': totalHours.toFixed(1).replace('.', ','),
      '{valor_total}': formatCurrency(totalAmount),
      '{chave_pix}': freela?.pixKey || '-',
      '{id_transacao_pix}': paymentId || 'PIX Asaas',
      '{data_pagamento}': paymentDate ? formatDateBR(paymentDate) : formatDateBR(new Date().toISOString().split('T')[0]),
      '{lista_demandas}': demandListStr,
      '{minha_empresa}': companyInfo?.brandName || companyInfo?.legalName || 'MHB Raffa',
      '{meu_telefone}': companyInfo?.phone || '',
      '{meu_email}': companyInfo?.email || ''
    };

    let processedSubj = rawSubj;
    let processedBody = rawBody;

    Object.entries(replacements).forEach(([key, val]) => {
      processedSubj = processedSubj.split(key).join(val || '');
      processedBody = processedBody.split(key).join(val || '');
    });

    setFreelancerEmailSubject(processedSubj);
    setFreelancerEmailBody(processedBody);
    setIsFreelancerEmailModalOpen(true);
  };

  const handleLaunchFreelancerEmailClient = async () => {
    if (!freelancerEmailTo.trim()) {
      alert('Por favor, informe o e-mail do destinatário.');
      return;
    }

    try {
      setIsSendingFreelancerEmail(true);

      // 1. Gera e faz o download do PDF executivo de fechamento
      await handleExportPayrollPDF();

      // 2. Monta a URL mailto conforme RFC 6068 (não codificar @ no destinatário)
      const to = freelancerEmailTo.trim();
      const cc = freelancerEmailCc.trim();
      const subj = freelancerEmailSubject;
      const body = freelancerEmailBody;

      const params = [];
      if (cc) params.push(`cc=${encodeURIComponent(cc)}`);
      if (subj) params.push(`subject=${encodeURIComponent(subj)}`);
      if (body) {
        // Limita comprimento do body na URL mailto para prevenir bloqueio em clientes de desktop
        const safeBody = body.length > 1500 ? body.substring(0, 1500) + '\n\n[Mensagem completa disponível no PDF anexo]' : body;
        params.push(`body=${encodeURIComponent(safeBody)}`);
      }

      const queryString = params.length > 0 ? `?${params.join('&')}` : '';
      const mailtoUrl = `mailto:${to}${queryString}`;

      // 3. Disparo seguro via <a> no mesmo frame (previne about:blank no Chrome/Safari)
      const link = document.createElement('a');
      link.href = mailtoUrl;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
      }, 500);

      // 4. Feedback visual de sucesso
      setFreelancerEmailSuccess(true);
    } catch (err) {
      alert('Erro ao processar fechamento e e-mail: ' + err.message);
    } finally {
      setIsSendingFreelancerEmail(false);
    }
  };

  const handleLaunchGmailWeb = async () => {
    if (!freelancerEmailTo.trim()) {
      alert('Por favor, informe o e-mail do destinatário.');
      return;
    }

    try {
      setIsSendingFreelancerEmail(true);
      await handleExportPayrollPDF();

      const to = encodeURIComponent(freelancerEmailTo.trim());
      const cc = freelancerEmailCc.trim() ? encodeURIComponent(freelancerEmailCc.trim()) : '';
      const subj = encodeURIComponent(freelancerEmailSubject);
      const body = encodeURIComponent(freelancerEmailBody);

      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}${cc ? `&cc=${cc}` : ''}&su=${subj}&body=${body}`;
      window.open(gmailUrl, '_blank');
      setFreelancerEmailSuccess(true);
    } catch (err) {
      alert('Erro ao abrir Gmail: ' + err.message);
    } finally {
      setIsSendingFreelancerEmail(false);
    }
  };

  const handleCopyFreelancerEmailText = () => {
    navigator.clipboard.writeText(`Para: ${freelancerEmailTo}\nAssunto: ${freelancerEmailSubject}\n\n${freelancerEmailBody}`);
    setCopiedFreelancerEmailBody(true);
    setTimeout(() => setCopiedFreelancerEmailBody(false), 2500);
  };

  // Handlers de Tarefas
  const handleOpenNewTaskModal = () => {
    setEditingTask(null);
    setTaskForm({
      title: '',
      freelancerId: freelancers.length > 0 ? freelancers[0].id : '',
      clientId: clients.length > 0 ? clients[0].id : '',
      category: 'Digital',
      requestDate: new Date().toISOString().split('T')[0],
      expectedDueDate: '',
      actualDeliveryDate: '',
      hours: '',
      briefingUrl: '',
      notes: '',
      status: 'pending'
    });
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTaskModal = (task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title || '',
      freelancerId: task.freelancerId || '',
      clientId: task.clientId || '',
      category: task.category || 'Digital',
      requestDate: task.requestDate || '',
      expectedDueDate: task.expectedDueDate || '',
      actualDeliveryDate: task.actualDeliveryDate || '',
      hours: task.hours ? String(task.hours) : '',
      briefingUrl: task.briefingUrl || '',
      notes: task.notes || '',
      status: task.status || 'pending'
    });
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) {
      alert('Informe o nome da demanda.');
      return;
    }
    if (!taskForm.clientId) {
      alert('Selecione o cliente associado à demanda.');
      return;
    }
    if (!taskForm.freelancerId) {
      alert('Selecione o prestador/freelancer para executar a demanda.');
      return;
    }

    const payload = {
      ...taskForm,
      hours: parseFloat(String(taskForm.hours).replace(',', '.')) || 0
    };

    if (editingTask) {
      await onUpdateTask({ ...editingTask, ...payload });
    } else {
      await onAddTask(payload);
    }
    setIsTaskModalOpen(false);
  };

  // Handlers de Freelancers
  const handleOpenNewFreelancerModal = () => {
    setEditingFreelancer(null);
    setFreelancerForm({
      name: '',
      username: '',
      password: '',
      hourlyRate: '50',
      specialty: 'Designer',
      pixKey: '',
      phone: '',
      allowedTabs: ['freelancer-tasks'],
      isActive: true
    });
    setIsFreelancerModalOpen(true);
  };

  const handleOpenEditFreelancerModal = (freela) => {
    setEditingFreelancer(freela);
    setFreelancerForm({
      name: freela.name || '',
      username: freela.username || freela.email || '',
      password: freela.password || '',
      hourlyRate: freela.hourlyRate ? String(freela.hourlyRate) : '0',
      specialty: freela.specialty || '',
      pixKey: freela.pixKey || '',
      phone: formatPhone(freela.phone || ''),
      allowedTabs: freela.allowedTabs || ['freelancer-tasks'],
      isActive: freela.isActive !== undefined ? freela.isActive : true
    });
    setIsFreelancerModalOpen(true);
  };

  const handleSaveFreelancer = async (e) => {
    e.preventDefault();
    if (!freelancerForm.name.trim() || !freelancerForm.username.trim() || !freelancerForm.password.trim()) {
      alert('Preencha nome, usuário/e-mail e senha do prestador.');
      return;
    }

    const payload = {
      ...freelancerForm,
      phone: formatPhone(freelancerForm.phone || ''),
      hourlyRate: parseFloat(String(freelancerForm.hourlyRate).replace(',', '.')) || 0
    };

    if (editingFreelancer) {
      await onUpdateFreelancer({ ...editingFreelancer, ...payload });
    } else {
      await onAddFreelancer(payload);
    }
    setIsFreelancerModalOpen(false);
  };

  // Copiar resumo para WhatsApp (Enxuto e com indicação clara de PAGO ou A PAGAR)
  const handleCopyWhatsAppSummary = () => {
    const freela = getFreelancer(payrollFreelancerId);
    const targetName = freela ? freela.name : 'Equipe';
    const periodName = payrollPeriodLabel;
    const isPaid = payrollData.isAllPaid;
    const hasPaid = payrollData.hasAnyPaid;

    let text = `*FECHAMENTO DE SERVIÇOS - ${periodName.toUpperCase()}*\n`;
    text += `Olá, ${targetName}!\n\n`;

    if (isPaid) {
      text += `✅ *STATUS: PAGO VIA PIX*\n`;
      if (payrollData.paymentDates.length > 0) {
        text += `📅 *Data:* ${formatDateBR(payrollData.paymentDates[0])}\n`;
      }
      if (payrollData.paymentIds.length > 0) {
        text += `🆔 *ID Asaas:* ${payrollData.paymentIds.join(', ')}\n`;
      }
    } else if (hasPaid) {
      text += `⚠️ *STATUS: PARCIALMENTE PAGO*\n`;
    } else {
      text += `⏳ *STATUS: APROVADO / AGUARDANDO PAGAMENTO*\n`;
    }

    text += `\n📋 *Demandas:*\n`;
    payrollData.deliveredMonthTasks.forEach((t) => {
      const clientName = getClientName(t.clientId);
      text += `• ${t.title} (${clientName}) - ${parseFloat(t.hours).toFixed(1).replace('.', ',')}h\n`;
    });

    text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `⏱️ *Total de Horas:* ${payrollData.totalHours.toFixed(1).replace('.', ',')}h\n`;
    if (freela?.hourlyRate > 0) {
      text += `💰 *Valor Total:* ${formatCurrency(payrollData.totalAmountToPay)} (${formatCurrency(freela.hourlyRate)}/h)\n`;
    } else {
      text += `💰 *Valor Total:* ${formatCurrency(payrollData.totalAmountToPay)}\n`;
    }
    if (freela?.pixKey) {
      text += `🔑 *Chave PIX:* ${freela.pixKey}\n`;
    }
    text += `\nAgradecemos pela parceria!\n`;
    text += `*${companyInfo?.brandName || 'Matheus Raffa'}*`;

    navigator.clipboard.writeText(text);
    setCopiedWhatsAppMsg(true);
    setTimeout(() => setCopiedWhatsAppMsg(false), 2500);
  };

  // Exportar PDF de Fechamento do Freelancer (Layout Corporativo Monocromático + Comprovante Oficial Asaas)
  const handleExportPayrollPDF = async () => {
    try {
      const freela = getFreelancer(payrollFreelancerId);
      const targetName = freela ? freela.name : 'Todos_Prestadores';
      const safeName = targetName.replace(/[^a-zA-Z0-9]/g, '_');
      const safePeriod = (payrollPeriodLabel || 'periodo').replace(/[^a-zA-Z0-9]/g, '_');

      const doc = await generatePayrollPdf({
        freelancer: freela,
        tasks: payrollData.deliveredMonthTasks,
        totalHours: payrollData.totalHours,
        totalAmount: payrollData.totalAmountToPay,
        periodLabel: payrollPeriodLabel,
        company: companyInfo,
        getClientName,
        isPaid: payrollData.isAllPaid,
        paymentIds: payrollData.paymentIds,
        paymentDates: payrollData.paymentDates,
        paymentReceiptUrls: payrollData.paymentReceiptUrls
      });

      doc.save(`Fechamento_${safeName}_${safePeriod}.pdf`);
    } catch (err) {
      alert('Erro ao gerar PDF: ' + err.message);
    }
  };

  // Exportar CSV
  const handleExportPayrollCSV = () => {
    const freela = getFreelancer(payrollFreelancerId);
    let csv = 'Tarefa;Cliente;Categoria;Data Solicitada;Data Entregue;Horas;Valor Hora;Subtotal R$\n';

    payrollData.deliveredMonthTasks.forEach(t => {
      const cName = getClientName(t.clientId);
      const fRate = freela ? (parseFloat(freela.hourlyRate) || 0) : 0;
      const subtotal = (parseFloat(t.hours) || 0) * fRate;

      csv += `"${t.title.replace(/"/g, '""')}";"${cName}";"${t.category}";${t.requestDate};${t.actualDeliveryDate};${t.hours};${fRate};${subtotal.toFixed(2)}\n`;
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const safePeriod = (payrollPeriodLabel || 'periodo').replace(/[^a-zA-Z0-9]/g, '_');
    link.setAttribute('download', `fechamento_freelancers_${safePeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-title text-2xl font-black text-gray-950 flex items-center gap-2.5">
            <Briefcase className="text-yellow-600" size={24} />
            <span>Prestadores de Serviço & Freelancers</span>
          </h1>
          <p className="text-sm text-gray-500">
            Controle de demandas terceirizadas, acessos de prestadores e fechamento de pagamentos por hora.
          </p>
        </div>

        {/* SubTab Navigation */}
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl self-start sm:self-center border border-gray-200">
          <button
            onClick={() => setActiveSubTab('tasks')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'tasks' 
                ? 'bg-white text-gray-950 shadow-2xs' 
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Clock size={14} />
            <span>Demandas ({tasks.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('freelancers')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'freelancers' 
                ? 'bg-white text-gray-950 shadow-2xs' 
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Users size={14} />
            <span>Prestadores ({freelancers.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('payroll')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'payroll' 
                ? 'bg-white text-gray-950 shadow-2xs' 
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <DollarSign size={14} />
            <span>Fechamento & Pagamentos</span>
          </button>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ABA 1: DEMANDAS & TAREFAS                                             */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'tasks' && (
        <div className="flex flex-col gap-4">
          {/* Controls Bar */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pesquisar demandas, clientes..."
                  value={taskSearchTerm}
                  onChange={(e) => setTaskSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs bg-gray-50/70 hover:bg-white focus:bg-white border border-gray-200 focus:border-gray-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900/10 text-gray-900 transition-all placeholder-gray-400 font-medium"
                />
                {taskSearchTerm && (
                  <button
                    onClick={() => setTaskSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 cursor-pointer"
                    title="Limpar busca"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="w-36">
                <SearchableSelect
                  value={taskStatusFilter}
                  onChange={setTaskStatusFilter}
                  options={filterStatusOptions}
                  placeholder="Status"
                  searchPlaceholder="Filtrar status..."
                  icon={Filter}
                  buttonClassName="py-1.5 bg-white border-gray-200"
                />
              </div>

              {/* Freelancer Filter */}
              <div className="w-48">
                <SearchableSelect
                  value={taskFreelancerFilter}
                  onChange={setTaskFreelancerFilter}
                  options={filterFreelancerOptions}
                  placeholder="Prestador"
                  searchPlaceholder="Filtrar prestador..."
                  icon={Users}
                  buttonClassName="py-1.5 bg-white border-gray-200"
                />
              </div>

              {/* Client Filter */}
              <div className="w-48">
                <SearchableSelect
                  value={taskClientFilter}
                  onChange={setTaskClientFilter}
                  options={filterClientOptions}
                  placeholder="Cliente"
                  searchPlaceholder="Filtrar cliente..."
                  icon={Building}
                  buttonClassName="py-1.5 bg-white border-gray-200"
                />
              </div>
            </div>

            <button
              onClick={handleOpenNewTaskModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-950 rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer ml-auto"
            >
              <Plus size={15} />
              <span>Nova Demanda</span>
            </button>
          </div>

          {/* Barra Flutuante / Fixa de Ações em Lote */}
          {selectedTaskIds.size > 0 && (
            <div className="sticky top-2 z-30 bg-gray-950 text-white border border-gray-800 rounded-2xl p-3.5 shadow-2xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in-0 slide-in-from-top-2">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-gray-900 px-3 py-1.5 rounded-xl border border-gray-800">
                  <Layers size={15} className="text-yellow-400" />
                  <span className="text-xs font-bold text-gray-200">
                    {selectedTaskIds.size} de {filteredTasks.length} selecionada{selectedTaskIds.size === 1 ? '' : 's'}
                  </span>
                </div>

                {/* Soma Destacada de Horas Selecionadas */}
                <div className="flex items-center gap-2 bg-yellow-400 text-gray-950 px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs">
                  <Clock size={14} />
                  <span>Total Selecionado: {selectedTasksTotalHours.toFixed(1).replace('.', ',')}h</span>
                </div>

                {/* Subtotal se pertencer ao mesmo prestador */}
                {selectedTasksFreelancer && (
                  <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-300 bg-gray-900 px-3 py-1.5 rounded-xl border border-gray-800 font-medium">
                    <span>{selectedTasksFreelancer.name}:</span>
                    <span className="font-bold text-emerald-400 font-title">{formatCurrency(selectedTasksTotalAmount)}</span>
                    <span className="text-[10px] text-gray-400">({formatCurrency(selectedTasksFreelancer.hourlyRate)}/h)</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Botão de Pagamento PIX via Asaas */}
                <button
                  type="button"
                  onClick={handleOpenPixPaymentModal}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer hover:scale-102 active:scale-98"
                  title="Efetuar pagamento das demandas selecionadas via PIX no Asaas"
                >
                  <CreditCard size={14} />
                  <span>Realizar Pagamento PIX</span>
                </button>

                {/* Alteração Rápida de Status */}
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBatchApplyField('status', e.target.value);
                      e.target.value = '';
                    }
                  }}
                  defaultValue=""
                  className="bg-gray-900 border border-gray-800 text-gray-200 text-xs rounded-xl px-2.5 py-1.5 font-medium focus:outline-none focus:border-yellow-400 cursor-pointer"
                >
                  <option value="" disabled>Alterar Status...</option>
                  <option value="pending">Pendente</option>
                  <option value="in_progress">Em Andamento</option>
                  <option value="delivered">Entregue</option>
                  <option value="paid">Pago</option>
                </select>

                {/* Alteração Rápida de Categoria */}
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBatchApplyField('category', e.target.value);
                      e.target.value = '';
                    }
                  }}
                  defaultValue=""
                  className="bg-gray-900 border border-gray-800 text-gray-200 text-xs rounded-xl px-2.5 py-1.5 font-medium focus:outline-none focus:border-yellow-400 cursor-pointer hidden sm:block"
                >
                  <option value="" disabled>Alterar Categoria...</option>
                  {(categories && categories.length > 0 ? categories : CATEGORIES).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                {/* Modal de Alterações em Lote Completo */}
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(true)}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  title="Abrir editor completo de campos em lote"
                >
                  Mais Edições...
                </button>

                {/* Excluir Selecionadas */}
                <button
                  type="button"
                  onClick={handleBatchDelete}
                  className="p-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 rounded-xl transition-colors cursor-pointer border border-red-800/40"
                  title="Excluir demandas selecionadas"
                >
                  <Trash2 size={15} />
                </button>

                {/* Desmarcar todas */}
                <button
                  type="button"
                  onClick={() => setSelectedTaskIds(new Set())}
                  className="p-1.5 text-gray-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                  title="Desmarcar todas"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Tasks Table */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-2xs overflow-hidden">
            {filteredTasks.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
                <Briefcase size={36} className="text-gray-300 mb-1" />
                <p className="text-sm font-bold text-gray-800">Nenhuma demanda cadastrada ou encontrada.</p>
                <p className="text-xs text-gray-400">
                  Clique no botão "+ Nova Demanda" acima para delegar tarefas a seus freelancers.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px] select-none">
                      <th className="py-3 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={filteredTasks.length > 0 && selectedTaskIds.size === filteredTasks.length}
                          onChange={handleToggleSelectAll}
                          className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                          title="Selecionar todas as demandas visíveis"
                        />
                      </th>
                      <th 
                        className="py-3 px-4 cursor-pointer hover:bg-gray-100 hover:text-gray-900 transition-colors"
                        onClick={() => handleHeaderSort('title')}
                        title="Ordenar por Demanda"
                      >
                        <span className="inline-flex items-center">Demanda {renderSortIndicator('title')}</span>
                      </th>
                      <th 
                        className="py-3 px-4 cursor-pointer hover:bg-gray-100 hover:text-gray-900 transition-colors"
                        onClick={() => handleHeaderSort('freelancer')}
                        title="Ordenar por Prestador"
                      >
                        <span className="inline-flex items-center">Prestador {renderSortIndicator('freelancer')}</span>
                      </th>
                      <th 
                        className="py-3 px-4 cursor-pointer hover:bg-gray-100 hover:text-gray-900 transition-colors"
                        onClick={() => handleHeaderSort('client')}
                        title="Ordenar por Cliente"
                      >
                        <span className="inline-flex items-center">Cliente {renderSortIndicator('client')}</span>
                      </th>
                      <th 
                        className="py-3 px-4 cursor-pointer hover:bg-gray-100 hover:text-gray-900 transition-colors"
                        onClick={() => handleHeaderSort('category')}
                        title="Ordenar por Categoria"
                      >
                        <span className="inline-flex items-center">Categoria {renderSortIndicator('category')}</span>
                      </th>
                      <th 
                        className="py-3 px-4 cursor-pointer hover:bg-gray-100 hover:text-gray-900 transition-colors"
                        onClick={() => handleHeaderSort('requestDate')}
                        title="Ordenar por Data de Pedido"
                      >
                        <span className="inline-flex items-center">Solicitado {renderSortIndicator('requestDate')}</span>
                      </th>
                      <th 
                        className="py-3 px-4 cursor-pointer hover:bg-gray-100 hover:text-gray-900 transition-colors"
                        onClick={() => handleHeaderSort('expectedDueDate')}
                        title="Ordenar por Prazo Previsto"
                      >
                        <span className="inline-flex items-center">Prazo Previsto {renderSortIndicator('expectedDueDate')}</span>
                      </th>
                      <th 
                        className="py-3 px-4 cursor-pointer hover:bg-gray-100 hover:text-gray-900 transition-colors"
                        onClick={() => handleHeaderSort('actualDeliveryDate')}
                        title="Ordenar por Data de Entrega"
                      >
                        <span className="inline-flex items-center">Entregue {renderSortIndicator('actualDeliveryDate')}</span>
                      </th>
                      <th 
                        className="py-3 px-4 text-center cursor-pointer hover:bg-gray-100 hover:text-gray-900 transition-colors"
                        onClick={() => handleHeaderSort('hours')}
                        title="Ordenar por Horas"
                      >
                        <span className="inline-flex items-center justify-center">Horas {renderSortIndicator('hours')}</span>
                      </th>
                      <th 
                        className="py-3 px-4 text-center cursor-pointer hover:bg-gray-100 hover:text-gray-900 transition-colors"
                        onClick={() => handleHeaderSort('status')}
                        title="Ordenar por Status"
                      >
                        <span className="inline-flex items-center justify-center">Status {renderSortIndicator('status')}</span>
                      </th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    {filteredTasks.map(task => {
                      const freela = getFreelancer(task.freelancerId);
                      const clientName = getClientName(task.clientId);
                      const catBadge = CATEGORY_COLORS[task.category] || CATEGORY_COLORS['Outro'] || 'bg-yellow-50 text-yellow-800 border-yellow-200';
                      const isSelected = selectedTaskIds.has(task.id);

                      return (
                        <tr 
                          key={task.id} 
                          className={`transition-colors ${isSelected ? 'bg-yellow-50/70' : 'hover:bg-yellow-50/30'}`}
                        >
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleToggleSelectTask(task.id, e)}
                              className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                            />
                          </td>

                          <td className="py-3 px-4 font-semibold text-gray-900">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-gray-950 text-xs">{task.title}</span>
                              {task.briefingUrl && (
                                <a 
                                  href={task.briefingUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                                >
                                  <span>Briefing</span>
                                  <ExternalLink size={10} />
                                </a>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-gray-800 font-medium">
                            <span className="flex items-center gap-1.5">
                              <Users size={12} className="text-gray-400 shrink-0" />
                              <span>{freela ? freela.name : 'Não Atribuído'}</span>
                            </span>
                          </td>

                          <td className="py-3 px-4 text-gray-700">
                            <span className="flex items-center gap-1.5">
                              <Building size={12} className="text-gray-400 shrink-0" />
                              <span>{clientName}</span>
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${catBadge}`}>
                              <Tag size={9} />
                              <span>{task.category || 'Digital'}</span>
                            </span>
                          </td>

                          <td className="py-3 px-4 text-gray-500 font-mono text-[11px]">
                            {formatDateBR(task.requestDate)}
                          </td>

                          <td className="py-3 px-4 font-mono text-[11px]">
                            {formatDateBR(task.expectedDueDate)}
                          </td>

                          <td className="py-3 px-4 font-mono text-[11px]">
                            {task.actualDeliveryDate ? (
                              <span className="text-green-700 font-bold">{formatDateBR(task.actualDeliveryDate)}</span>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center">
                            {task.hours > 0 ? (
                              <span className="inline-block px-2 py-0.5 bg-yellow-100 text-yellow-950 font-bold rounded text-xs">
                                {task.hours.toFixed(1).replace('.', ',')}h
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs">-</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center justify-center gap-1">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                task.status === 'paid' 
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                                  : task.status === 'delivered' 
                                  ? 'bg-blue-50 text-blue-800 border-blue-200' 
                                  : task.status === 'in_progress' 
                                  ? 'bg-amber-50 text-amber-800 border-amber-200' 
                                  : 'bg-gray-100 text-gray-700 border-gray-200'
                              }`}>
                                {task.status === 'paid' ? 'Pago' : task.status === 'delivered' ? 'Entregue' : task.status === 'in_progress' ? 'Em Andamento' : 'Pendente'}
                              </span>

                              {/* Ícone de Comprovante quando a demanda está Paga */}
                              {task.status === 'paid' && (
                                <button
                                  type="button"
                                  onClick={() => setViewingReceiptTask(task)}
                                  className="p-1 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100 rounded-full transition-colors cursor-pointer"
                                  title="Visualizar Comprovante de Pagamento PIX"
                                >
                                  <Receipt size={13} />
                                </button>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditTaskModal(task)}
                                className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                                title="Editar Demanda"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Deseja excluir a demanda "${task.title}"?`)) {
                                    onDeleteTask(task.id);
                                  }
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                title="Excluir Demanda"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ABA 2: PRESTADORES DE SERVIÇO & ACESSOS                               */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'freelancers' && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Prestadores Cadastrados</h2>
              <p className="text-xs text-gray-500">Gerencie usuários, senhas de login, valor hora e permissões de telas.</p>
            </div>
            <button
              onClick={handleOpenNewFreelancerModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-950 rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer"
            >
              <Plus size={15} />
              <span>Novo Prestador</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {freelancers.length === 0 ? (
              <div className="col-span-full bg-white border border-gray-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-2">
                <Users size={36} className="text-gray-300 mb-1" />
                <p className="text-sm font-bold text-gray-800">Nenhum prestador cadastrado.</p>
                <p className="text-xs text-gray-400">Clique em "+ Novo Prestador" para criar o login de acesso do seu primeiro freelancer.</p>
              </div>
            ) : (
              freelancers.map(freela => {
                const freelaTasks = tasks.filter(t => t.freelancerId === freela.id);
                const deliveredCount = freelaTasks.filter(t => t.status === 'delivered' || t.status === 'paid').length;
                const totalHours = freelaTasks.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0);

                return (
                  <div key={freela.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs flex flex-col justify-between gap-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-base font-black text-gray-950 leading-tight">{freela.name}</h3>
                          <span className="text-xs font-semibold text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-md inline-block mt-1">
                            {freela.specialty || 'Freelancer'}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          freela.isActive !== false ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'
                        }`}>
                          {freela.isActive !== false ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>

                      {/* Login info & Hourly rate */}
                      <div className="bg-gray-50 border border-gray-150 rounded-xl p-3 flex flex-col gap-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 flex items-center gap-1">
                            <Mail size={12} /> Usuário/Login:
                          </span>
                          <span className="font-bold text-gray-900 font-mono">{freela.username || freela.email}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 flex items-center gap-1">
                            <Key size={12} /> Senha:
                          </span>
                          <span className="font-bold text-gray-900 font-mono">••••••••</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                          <span className="text-gray-500 flex items-center gap-1">
                            <DollarSign size={12} /> Valor por Hora:
                          </span>
                          <span className="font-black text-gray-950 font-title">{formatCurrency(freela.hourlyRate)}/h</span>
                        </div>
                        {freela.pixKey && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">Chave PIX:</span>
                            <span className="font-semibold text-gray-700 truncate max-w-[140px]">{freela.pixKey}</span>
                          </div>
                        )}
                        {freela.phone && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500 flex items-center gap-1">
                              <Phone size={12} /> WhatsApp:
                            </span>
                            <span className="font-semibold text-gray-700">{formatPhone(freela.phone)}</span>
                          </div>
                        )}
                      </div>

                      {/* Stats summary */}
                      <div className="grid grid-cols-2 gap-2 text-center text-xs">
                        <div className="bg-yellow-50/50 border border-yellow-100 rounded-lg p-2">
                          <span className="text-[10px] text-gray-500 block">Demandas Entregues</span>
                          <span className="font-bold text-gray-900">{deliveredCount} de {freelaTasks.length}</span>
                        </div>
                        <div className="bg-yellow-50/50 border border-yellow-100 rounded-lg p-2">
                          <span className="text-[10px] text-gray-500 block">Total de Horas</span>
                          <span className="font-bold text-gray-900">{totalHours.toFixed(1).replace('.', ',')}h</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer buttons */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => handleOpenEditFreelancerModal(freela)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer border border-gray-200"
                      >
                        <Edit3 size={13} />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Deseja realmente remover o cadastro de "${freela.name}"?`)) {
                            onDeleteFreelancer(freela.id);
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Excluir Prestador"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ABA 3: FECHAMENTO & PAGAMENTOS (RELATÓRIOS DO MÊS)                   */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'payroll' && (
        <div className="flex flex-col gap-6">
          {/* Controls / Filter bar */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4.5 shadow-2xs flex flex-col gap-4">
            {/* Linha 1: Filtros de Período, Prestador e Status */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-2 mr-1">
                  <div className="p-2 bg-yellow-50 text-yellow-600 rounded-xl border border-yellow-150 shrink-0">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Período</span>
                    <span className="text-xs font-bold text-gray-900 whitespace-nowrap">{payrollPeriodLabel}</span>
                  </div>
                </div>

                {/* 4 Botões de Filtro de Período */}
                <div className="inline-flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setPayrollPeriodFilter('current_month')}
                    className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                      payrollPeriodFilter === 'current_month'
                        ? 'bg-white text-gray-950 font-bold shadow-2xs'
                        : 'text-gray-500 hover:text-gray-900 font-medium'
                    }`}
                  >
                    Mês Atual
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayrollPeriodFilter('prev_month')}
                    className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                      payrollPeriodFilter === 'prev_month'
                        ? 'bg-white text-gray-950 font-bold shadow-2xs'
                        : 'text-gray-500 hover:text-gray-900 font-medium'
                    }`}
                  >
                    Mês Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayrollPeriodFilter('select_month')}
                    className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                      payrollPeriodFilter === 'select_month'
                        ? 'bg-white text-gray-950 font-bold shadow-2xs'
                        : 'text-gray-500 hover:text-gray-900 font-medium'
                    }`}
                  >
                    Selecionar Mês
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayrollPeriodFilter('custom')}
                    className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                      payrollPeriodFilter === 'custom'
                        ? 'bg-white text-gray-950 font-bold shadow-2xs'
                        : 'text-gray-500 hover:text-gray-900 font-medium'
                    }`}
                  >
                    Personalizado
                  </button>
                </div>

                {payrollPeriodFilter === 'select_month' && (
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1 text-xs animate-in fade-in-0">
                    <select
                      value={payrollSelectedMonth}
                      onChange={(e) => setPayrollSelectedMonth(e.target.value)}
                      className="bg-transparent font-semibold text-gray-800 focus:outline-none cursor-pointer text-xs"
                    >
                      {uniqueMonths.map(m => (
                        <option key={m} value={m}>{getMonthNamePT(m)}</option>
                      ))}
                    </select>
                  </div>
                )}

                {payrollPeriodFilter === 'custom' && (
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1 text-xs animate-in fade-in-0">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">De:</span>
                    <input
                      type="date"
                      value={payrollCustomStartDate}
                      onChange={(e) => setPayrollCustomStartDate(e.target.value)}
                      className="bg-white border border-gray-300 rounded px-1.5 py-0.5 text-xs text-gray-800 font-medium"
                    />
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Até:</span>
                    <input
                      type="date"
                      value={payrollCustomEndDate}
                      onChange={(e) => setPayrollCustomEndDate(e.target.value)}
                      className="bg-white border border-gray-300 rounded px-1.5 py-0.5 text-xs text-gray-800 font-medium"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="w-52">
                  <SearchableSelect
                    value={payrollFreelancerId}
                    onChange={setPayrollFreelancerId}
                    options={filterFreelancerOptions}
                    placeholder="Prestador"
                    searchPlaceholder="Filtrar prestador..."
                    icon={Users}
                    buttonClassName="py-1.5 bg-white border-gray-200"
                  />
                </div>

                {/* Filtro de Status de Pagamento */}
                <div className="inline-flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setPayrollStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                      payrollStatusFilter === 'all'
                        ? 'bg-white text-gray-950 font-bold shadow-2xs'
                        : 'text-gray-500 hover:text-gray-900 font-medium'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayrollStatusFilter('delivered')}
                    className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                      payrollStatusFilter === 'delivered'
                        ? 'bg-white text-blue-900 font-bold shadow-2xs'
                        : 'text-gray-500 hover:text-gray-900 font-medium'
                    }`}
                    title="Demandas entregues aguardando pagamento"
                  >
                    Apenas Entregues
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayrollStatusFilter('paid')}
                    className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                      payrollStatusFilter === 'paid'
                        ? 'bg-white text-emerald-900 font-bold shadow-2xs'
                        : 'text-gray-500 hover:text-gray-900 font-medium'
                    }`}
                    title="Demandas já quitadas via PIX"
                  >
                    Apenas Pagos
                  </button>
                </div>
              </div>
            </div>

            {/* Linha 2: Barra de Ações Padronizada (Mesma altura, mesmo peso, ícones e sem quebras feias) */}
            {/* Linha 2: Barra de Ações Padronizada (Alinhada à direita, habilitada apenas ao selecionar um prestador específico) */}
            <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-end gap-2.5">
              {payrollFreelancerId === 'all' && (
                <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl mr-auto font-medium">
                  Selecione um prestador específico para habilitar as ações de fechamento.
                </span>
              )}

              <button
                onClick={handleCopyWhatsAppSummary}
                disabled={payrollFreelancerId === 'all'}
                className="h-10 px-4 flex-1 sm:flex-initial min-w-[145px] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap border border-transparent"
                title={payrollFreelancerId === 'all' ? "Selecione um prestador específico para habilitar" : "Copiar mensagem formatada para WhatsApp"}
              >
                {copiedWhatsAppMsg ? <Check size={15} /> : <Copy size={15} />}
                <span>{copiedWhatsAppMsg ? 'Copiado WhatsApp!' : 'Copiar WhatsApp'}</span>
              </button>

              <button
                onClick={() => handleOpenFreelancerEmailModal()}
                disabled={payrollFreelancerId === 'all'}
                className="h-10 px-4 flex-1 sm:flex-initial min-w-[145px] bg-indigo-50 hover:bg-indigo-100 disabled:opacity-40 disabled:hover:bg-indigo-50 disabled:cursor-not-allowed text-indigo-900 border border-indigo-200 rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap"
                title={payrollFreelancerId === 'all' ? "Selecione um prestador específico para habilitar" : "Enviar relatório e comprovante por e-mail para o prestador"}
              >
                <Mail size={15} className="text-indigo-600" />
                <span>Enviar p/ E-mail</span>
              </button>

              <button
                onClick={handleExportPayrollPDF}
                disabled={payrollFreelancerId === 'all'}
                className="h-10 px-4 flex-1 sm:flex-initial min-w-[145px] bg-gray-900 hover:bg-gray-800 disabled:opacity-40 disabled:hover:bg-gray-900 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap border border-transparent"
                title={payrollFreelancerId === 'all' ? "Selecione um prestador específico para habilitar" : "Exportar PDF de Fechamento"}
              >
                <Download size={15} />
                <span>Exportar PDF</span>
              </button>

              {payrollData.paymentReceiptUrls.length > 0 && (
                <button
                  onClick={() => {
                    payrollData.paymentReceiptUrls.forEach(url => window.open(url, '_blank'));
                  }}
                  disabled={payrollFreelancerId === 'all'}
                  className="h-10 px-4 flex-1 sm:flex-initial min-w-[145px] bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 disabled:hover:bg-emerald-50 disabled:cursor-not-allowed text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap"
                  title={payrollFreelancerId === 'all' ? "Selecione um prestador específico para habilitar" : "Visualizar Comprovante Oficial emitido pelo Asaas"}
                >
                  <Receipt size={15} />
                  <span>Comprovante Asaas</span>
                </button>
              )}

              <button
                onClick={handleExportPayrollCSV}
                disabled={payrollFreelancerId === 'all'}
                className="h-10 px-4 flex-1 sm:flex-initial min-w-[145px] bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:hover:bg-gray-100 disabled:cursor-not-allowed text-gray-800 border border-gray-300 rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap"
                title={payrollFreelancerId === 'all' ? "Selecione um prestador específico para habilitar" : "Exportar CSV"}
              >
                <FileSpreadsheet size={15} className="text-gray-600" />
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <Clock size={22} />
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500 block">Total de Horas Realizadas</span>
                <span className="text-2xl font-black text-gray-950 font-title">
                  {payrollData.totalHours.toFixed(1).replace('.', ',')}h
                </span>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center text-green-600 shrink-0">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500 block">Demandas Entregues no Período</span>
                <span className="text-2xl font-black text-gray-950 font-title">
                  {payrollData.deliveredMonthTasks.length} de {payrollData.monthTasks.length}
                </span>
              </div>
            </div>

            <div className={`bg-white border rounded-2xl p-5 shadow-2xs flex items-center gap-4 ${
              payrollData.isAllPaid ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200'
            }`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                payrollData.isAllPaid 
                  ? 'bg-emerald-100 border-emerald-200 text-emerald-700' 
                  : 'bg-yellow-50 border-yellow-200 text-yellow-700'
              }`}>
                <DollarSign size={22} />
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500 block">
                  {payrollData.isAllPaid 
                    ? 'Total Quitado (Pago via PIX)' 
                    : payrollData.hasAnyPaid 
                    ? 'Total a Pagar / Quitado' 
                    : 'Total a Pagar aos Prestadores'}
                </span>
                <span className={`text-2xl font-black font-title ${payrollData.isAllPaid ? 'text-emerald-950' : 'text-yellow-950'}`}>
                  {formatCurrency(payrollData.totalAmountToPay)}
                </span>
                {payrollData.isAllPaid && payrollData.paymentDates.length > 0 && (
                  <span className="text-[10px] font-bold text-emerald-700 block">
                    Pago em {formatDateBR(payrollData.paymentDates[0])}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Breakdown by Client & Category */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* By Client */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs flex flex-col gap-3">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Building size={14} className="text-yellow-600" />
                <span>Horas de Freelancer por Cliente</span>
              </h3>
              {payrollData.byClient.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">Nenhuma demanda concluída neste período.</p>
              ) : (
                <div className="flex flex-col gap-2 pt-1">
                  {payrollData.byClient.map(item => {
                    const percentage = payrollData.totalHours > 0 ? (item.hours / payrollData.totalHours) * 100 : 0;
                    return (
                      <div key={item.name} className="flex flex-col gap-1 text-xs">
                        <div className="flex justify-between font-medium text-gray-800">
                          <span>{item.name}</span>
                          <span className="font-bold">{item.hours.toFixed(1).replace('.', ',')}h ({percentage.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div className="bg-yellow-400 h-full rounded-full" style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* By Category */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs flex flex-col gap-3">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Tag size={14} className="text-yellow-600" />
                <span>Horas de Freelancer por Categoria</span>
              </h3>
              {payrollData.byCategory.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">Nenhuma demanda concluída neste período.</p>
              ) : (
                <div className="flex flex-col gap-2 pt-1">
                  {payrollData.byCategory.map(item => {
                    const percentage = payrollData.totalHours > 0 ? (item.hours / payrollData.totalHours) * 100 : 0;
                    return (
                      <div key={item.name} className="flex flex-col gap-1 text-xs">
                        <div className="flex justify-between font-medium text-gray-800">
                          <span>{item.name}</span>
                          <span className="font-bold">{item.hours.toFixed(1).replace('.', ',')}h ({percentage.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div className="bg-blue-500 h-full rounded-full" style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Detailed Statement Table */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-gray-150 flex justify-between items-center">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Extrato Detalhado de Demandas do Período
              </h3>
              <span className="text-xs text-gray-400">
                {payrollData.deliveredMonthTasks.length} demandas contabilizadas
              </span>
            </div>

            {payrollData.deliveredMonthTasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">
                Nenhuma demanda encontrada para o filtro de status e período selecionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-4">Demanda</th>
                      <th className="py-2.5 px-4">Prestador</th>
                      <th className="py-2.5 px-4">Cliente</th>
                      <th className="py-2.5 px-4">Categoria</th>
                      <th className="py-2.5 px-4">Solicitado</th>
                      <th className="py-2.5 px-4">Entregue</th>
                      <th className="py-2.5 px-4 text-center">Horas</th>
                      <th className="py-2.5 px-4 text-right">Subtotal</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    {payrollData.deliveredMonthTasks.map(t => {
                      const freela = getFreelancer(t.freelancerId);
                      const rate = freela ? (parseFloat(freela.hourlyRate) || 0) : 0;
                      const subtotal = (parseFloat(t.hours) || 0) * rate;

                      return (
                        <tr key={t.id} className="hover:bg-yellow-50/20">
                          <td className="py-2.5 px-4 font-bold text-gray-900">{t.title}</td>
                          <td className="py-2.5 px-4 text-gray-700">{freela ? freela.name : 'Não Atribuído'}</td>
                          <td className="py-2.5 px-4 text-gray-700">{getClientName(t.clientId)}</td>
                          <td className="py-2.5 px-4 text-gray-600">{t.category}</td>
                          <td className="py-2.5 px-4 text-gray-500 font-mono text-[11px]">{formatDateBR(t.requestDate)}</td>
                          <td className="py-2.5 px-4 text-green-700 font-mono text-[11px] font-bold">{formatDateBR(t.actualDeliveryDate)}</td>
                          <td className="py-2.5 px-4 text-center font-bold">{parseFloat(t.hours).toFixed(1).replace('.', ',')}h</td>
                          <td className="py-2.5 px-4 text-right font-black text-gray-950 font-title">{formatCurrency(subtotal)}</td>
                          <td className="py-2.5 px-4 text-center">
                            <div className="inline-flex items-center justify-center gap-1">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                t.status === 'paid' 
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                                  : 'bg-blue-50 text-blue-800 border-blue-200'
                              }`}>
                                {t.status === 'paid' ? 'Pago' : 'Entregue'}
                              </span>
                              {t.status === 'paid' && (
                                <button
                                  type="button"
                                  onClick={() => setViewingReceiptTask(t)}
                                  className="p-1 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100 rounded-full transition-colors cursor-pointer"
                                  title="Ver Comprovante PIX"
                                >
                                  <Receipt size={12} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: CRIAR / EDITAR DEMANDA                                         */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {isTaskModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsTaskModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-xl w-full p-6 animate-in fade-in-0 zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-sm font-bold text-gray-950 flex items-center gap-2">
                <Briefcase size={16} className="text-yellow-600" />
                <span>{editingTask ? 'Editar Demanda de Freelancer' : 'Nova Demanda para Freelancer'}</span>
              </h3>
              <button 
                onClick={() => setIsTaskModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="flex flex-col gap-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Título da Demanda / Tarefa:</label>
                <input 
                  type="text"
                  required
                  placeholder="Ex: Criação de posts para Instagram da campanha de verão"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 focus:bg-white text-gray-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1 flex items-center justify-between">
                    <span>Cliente Associado (Base MHB):</span>
                    {taskForm.clientId && (
                      <span className="text-[10px] text-gray-400 font-normal">Selecionado</span>
                    )}
                  </label>
                  <SearchableSelect
                    value={taskForm.clientId}
                    onChange={(val) => setTaskForm({ ...taskForm, clientId: val })}
                    options={activeClientOptions}
                    placeholder="Pesquisar ou selecionar cliente..."
                    searchPlaceholder="Digite o nome ou CNPJ do cliente..."
                    icon={Building}
                    required={true}
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1 flex items-center justify-between">
                    <span>Prestador / Freelancer:</span>
                    {taskForm.freelancerId && (
                      <span className="text-[10px] text-yellow-700 font-bold">
                        {formatCurrency(getFreelancer(taskForm.freelancerId)?.hourlyRate)}/h
                      </span>
                    )}
                  </label>
                  <SearchableSelect
                    value={taskForm.freelancerId}
                    onChange={(val) => setTaskForm({ ...taskForm, freelancerId: val })}
                    options={freelancerOptions}
                    placeholder="Pesquisar ou selecionar prestador..."
                    searchPlaceholder="Digite o nome ou especialidade..."
                    icon={Users}
                    required={true}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Categoria:</label>
                  <SearchableSelect
                    value={taskForm.category}
                    onChange={(val) => setTaskForm({ ...taskForm, category: val })}
                    options={categoryOptions}
                    placeholder="Selecione a categoria..."
                    searchPlaceholder="Digite para filtrar ou criar..."
                    allowCustom={true}
                    icon={Tag}
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Data do Pedido:</label>
                  <input 
                    type="date"
                    value={taskForm.requestDate}
                    onChange={(e) => setTaskForm({ ...taskForm, requestDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 focus:bg-white text-gray-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Prazo Esperado (Entrega):</label>
                  <input 
                    type="date"
                    value={taskForm.expectedDueDate}
                    onChange={(e) => setTaskForm({ ...taskForm, expectedDueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 focus:bg-white text-gray-900 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Data de Entrega de Fato:</label>
                  <input 
                    type="date"
                    value={taskForm.actualDeliveryDate}
                    onChange={(e) => setTaskForm({ ...taskForm, actualDeliveryDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 focus:bg-white text-gray-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Horas Realizadas:</label>
                  <input 
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="Ex: 3.5"
                    value={taskForm.hours}
                    onChange={(e) => setTaskForm({ ...taskForm, hours: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 focus:bg-white text-gray-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Status:</label>
                  <SearchableSelect
                    value={taskForm.status}
                    onChange={(val) => setTaskForm({ ...taskForm, status: val })}
                    options={statusOptions}
                    placeholder="Selecione o status..."
                    searchPlaceholder="Filtrar status..."
                    icon={Clock}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Link de Briefing / Arquivos (opcional):</label>
                <input 
                  type="url"
                  placeholder="https://figma.com/... ou link do Google Drive"
                  value={taskForm.briefingUrl}
                  onChange={(e) => setTaskForm({ ...taskForm, briefingUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 focus:bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Observações / Instruções:</label>
                <textarea 
                  rows={2}
                  placeholder="Detalhes adicionais para o freelancer..."
                  value={taskForm.notes}
                  onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 focus:bg-white text-gray-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  {editingTask ? 'Salvar Alterações' : 'Criar Demanda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: CADASTRAR / EDITAR PRESTADOR                                   */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {isFreelancerModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsFreelancerModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-lg w-full p-6 animate-in fade-in-0 zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-sm font-bold text-gray-950 flex items-center gap-2">
                <Users size={16} className="text-yellow-600" />
                <span>{editingFreelancer ? 'Editar Prestador de Serviço' : 'Cadastrar Novo Prestador'}</span>
              </h3>
              <button 
                onClick={() => setIsFreelancerModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveFreelancer} className="flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nome Completo:</label>
                  <input 
                    type="text"
                    required
                    placeholder="Ex: João da Silva"
                    value={freelancerForm.name}
                    onChange={(e) => setFreelancerForm({ ...freelancerForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 focus:bg-white text-gray-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Especialidade / Função:</label>
                  <input 
                    type="text"
                    placeholder="Ex: Designer, Redator, Editor..."
                    value={freelancerForm.specialty}
                    onChange={(e) => setFreelancerForm({ ...freelancerForm, specialty: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 focus:bg-white text-gray-900"
                  />
                </div>
              </div>

              {/* Login credentials */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex flex-col gap-2.5">
                <span className="text-[11px] font-bold text-gray-900 flex items-center gap-1">
                  <Key size={13} className="text-gray-600" /> Credenciais de Login para o Freelancer
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">E-mail ou Usuário de Acesso:</label>
                    <input 
                      type="text"
                      required
                      placeholder="Ex: joao ou joao@gmail.com"
                      value={freelancerForm.username}
                      onChange={(e) => setFreelancerForm({ ...freelancerForm, username: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 text-gray-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Senha de Acesso:</label>
                    <input 
                      type="text"
                      required
                      placeholder="Defina a senha"
                      value={freelancerForm.password}
                      onChange={(e) => setFreelancerForm({ ...freelancerForm, password: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 text-gray-900 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Financial & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Valor da Hora (R$/h):</label>
                  <input 
                    type="number"
                    step="1"
                    min="0"
                    placeholder="Ex: 50"
                    value={freelancerForm.hourlyRate}
                    onChange={(e) => setFreelancerForm({ ...freelancerForm, hourlyRate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 focus:bg-white text-gray-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Chave PIX (Pagamento):</label>
                  <input 
                    type="text"
                    placeholder="CPF, E-mail ou Telefone"
                    value={freelancerForm.pixKey}
                    onChange={(e) => setFreelancerForm({ ...freelancerForm, pixKey: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 focus:bg-white text-gray-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">WhatsApp / Telefone:</label>
                  <input 
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={freelancerForm.phone}
                    onChange={(e) => setFreelancerForm({ ...freelancerForm, phone: formatPhone(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 focus:bg-white text-gray-900"
                  />
                </div>
              </div>

              {/* Screen Permissions */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex flex-col gap-2">
                <span className="font-bold text-gray-800 flex items-center gap-1.5">
                  <Shield size={13} className="text-yellow-600" />
                  <span>Controle de Permissões (Quais telas este usuário pode ver):</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  {AVAILABLE_TABS.map(tab => {
                    const isChecked = freelancerForm.allowedTabs.includes(tab.id);
                    return (
                      <label key={tab.id} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFreelancerForm({
                                ...freelancerForm,
                                allowedTabs: [...freelancerForm.allowedTabs, tab.id]
                              });
                            } else {
                              setFreelancerForm({
                                ...freelancerForm,
                                allowedTabs: freelancerForm.allowedTabs.filter(id => id !== tab.id)
                              });
                            }
                          }}
                          className="rounded text-yellow-500 focus:ring-yellow-400"
                        />
                        <span>{tab.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsFreelancerModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  {editingFreelancer ? 'Salvar Alterações' : 'Cadastrar Prestador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: EDIÇÃO EM LOTE DE DEMANDAS                                   */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {isBatchModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsBatchModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-lg w-full p-6 animate-in fade-in-0 zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-yellow-50 text-yellow-700 rounded-xl border border-yellow-200">
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-950">Alteração em Lote</h3>
                  <p className="text-xs text-gray-500">
                    Modificando {selectedTaskIds.size} demanda{selectedTaskIds.size === 1 ? '' : 's'} selecionada{selectedTaskIds.size === 1 ? '' : 's'}.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsBatchModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBatchSubmitModal} className="flex flex-col gap-4 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-600">
                Preencha somente os campos que você deseja alterar em todas as demandas selecionadas. Campos em branco não serão modificados.
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Novo Cliente:</label>
                <select
                  value={batchUpdates.clientId}
                  onChange={(e) => setBatchUpdates({ ...batchUpdates, clientId: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:outline-none focus:border-gray-900"
                >
                  <option value="">-- Não alterar cliente --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Novo Prestador / Freelancer:</label>
                <select
                  value={batchUpdates.freelancerId}
                  onChange={(e) => setBatchUpdates({ ...batchUpdates, freelancerId: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:outline-none focus:border-gray-900"
                >
                  <option value="">-- Não alterar prestador --</option>
                  {freelancers.map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.specialty || 'Prestador'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Nova Categoria:</label>
                  <select
                    value={batchUpdates.category}
                    onChange={(e) => setBatchUpdates({ ...batchUpdates, category: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:outline-none focus:border-gray-900"
                  >
                    <option value="">-- Não alterar --</option>
                    {(categories && categories.length > 0 ? categories : CATEGORIES).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Novo Status:</label>
                  <select
                    value={batchUpdates.status}
                    onChange={(e) => setBatchUpdates({ ...batchUpdates, status: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:outline-none focus:border-gray-900"
                  >
                    <option value="">-- Não alterar --</option>
                    <option value="pending">Pendente</option>
                    <option value="in_progress">Em Andamento</option>
                    <option value="delivered">Entregue</option>
                    <option value="paid">Pago</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-150 mt-2">
                <button
                  type="button"
                  onClick={handleBatchDelete}
                  className="flex items-center gap-1.5 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg font-bold transition-colors cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Excluir Selecionadas</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBatchModalOpen(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-bold rounded-lg shadow-xs cursor-pointer"
                  >
                    Aplicar Alterações
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: CONFIRMAÇÃO DE PAGAMENTO PIX VIA ASAAS                       */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {isPixPaymentModalOpen && selectedTasksFreelancer && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => !isSubmittingPix && setIsPixPaymentModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-lg w-full p-6 animate-in fade-in-0 zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-950">Pagamento PIX via Asaas</h3>
                  <p className="text-xs text-gray-500">Transferência bancária automática</p>
                </div>
              </div>
              <button 
                onClick={() => !isSubmittingPix && setIsPixPaymentModalOpen(false)}
                disabled={isSubmittingPix}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4 text-xs">
              {/* Prestador Card */}
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Favorecido / Prestador:</span>
                  <span className="font-bold text-gray-950 text-sm">{selectedTasksFreelancer.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Chave PIX:</span>
                  <span className="font-mono font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">
                    {selectedTasksFreelancer.pixKey}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Tipo de Chave Detectado:</span>
                  <span className="font-bold text-gray-800 bg-gray-200/80 px-1.5 py-0.5 rounded text-[10px]">
                    {detectPixKeyType(selectedTasksFreelancer.pixKey)}
                  </span>
                </div>
              </div>

              {/* Total Calculation Card */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-col gap-2">
                <div className="flex justify-between items-center text-emerald-900 font-medium">
                  <span>Demandas Selecionadas:</span>
                  <span className="font-bold">{selectedTasksList.length} tarefa{selectedTasksList.length === 1 ? '' : 's'}</span>
                </div>
                <div className="flex justify-between items-center text-emerald-900 font-medium">
                  <span>Soma Total de Horas:</span>
                  <span className="font-bold text-sm">{selectedTasksTotalHours.toFixed(1).replace('.', ',')}h</span>
                </div>
                <div className="flex justify-between items-center text-emerald-900 font-medium">
                  <span>Valor da Hora Técnica:</span>
                  <span className="font-bold">{formatCurrency(selectedTasksFreelancer.hourlyRate)}/h</span>
                </div>
                <div className="pt-2 border-t border-emerald-200 flex justify-between items-center text-emerald-950">
                  <span className="font-bold text-xs">VALOR TOTAL DO PIX:</span>
                  <span className="text-xl font-black font-title text-emerald-950">
                    {formatCurrency(selectedTasksTotalAmount)}
                  </span>
                </div>
              </div>

              {/* Schedule Date */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Data de Agendamento (Opcional):
                </label>
                <input
                  type="date"
                  value={pixScheduleDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setPixScheduleDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:outline-none focus:border-gray-900"
                />
                <span className="text-[11px] text-gray-400 mt-1 block">
                  Deixe em branco para efetuar a transferência imediatamente hoje.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-150">
                <button
                  type="button"
                  disabled={isSubmittingPix}
                  onClick={() => setIsPixPaymentModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium cursor-pointer disabled:opacity-40"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSubmittingPix || selectedTasksTotalAmount <= 0}
                  onClick={handleConfirmPixTransfer}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingPix ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Processando no Asaas...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      <span>Confirmar e Transferir PIX</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 3: SUCESSO PIX & DISPARO DE COMPROVANTE VIA WHATSAPP            */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {pixSuccessData && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPixSuccessData(null)}
        >
          <div 
            className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in-0 zoom-in-95 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 mx-auto mb-3 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-200">
              <CheckCircle2 size={32} />
            </div>

            <h3 className="text-base font-bold text-gray-950 mb-1">
              Transferência PIX Realizada com Sucesso!
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              As demandas foram atualizadas automaticamente para o status <strong>"Pago"</strong>.
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-left text-xs flex flex-col gap-2 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Prestador:</span>
                <span className="font-bold text-gray-900">{pixSuccessData.freelancer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Valor Transferido:</span>
                <span className="font-bold text-emerald-600 font-title text-sm">{formatCurrency(pixSuccessData.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total de Horas:</span>
                <span className="font-bold text-gray-900">{pixSuccessData.totalHours.toFixed(1).replace('.', ',')}h</span>
              </div>
              {pixSuccessData.transfer?.id && (
                <div className="flex justify-between pt-1 border-t border-gray-200 font-mono text-[11px]">
                  <span className="text-gray-500">ID Asaas:</span>
                  <span className="font-bold text-gray-800">{pixSuccessData.transfer.id}</span>
                </div>
              )}
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-left text-[11px] mb-4 flex items-start gap-2">
              <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Atenção:</strong> Se a sua conta do Asaas exigir aprovação por Token de segurança no aplicativo celular, acesse o app do Asaas para autorizar a transferência.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => handleSendWhatsAppReceipt(pixSuccessData)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
              >
                <Send size={14} />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenFreelancerEmailModal(pixSuccessData)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
              >
                <Mail size={14} />
                <span>Enviar E-mail</span>
              </button>

              <button
                type="button"
                onClick={() => setPixSuccessData(null)}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 4: DETALHES DO COMPROVANTE DIGITAL (DEMANDA PAGA)               */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {viewingReceiptTask && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setViewingReceiptTask(null)}
        >
          <div 
            className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in-0 zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
                  <Receipt size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-950">Comprovante de Quitação</h3>
                  <p className="text-xs text-gray-500">Registro de pagamento de demanda</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingReceiptTask(null)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-col gap-1.5">
                <span className="text-gray-400 font-bold text-[10px] uppercase">Demanda</span>
                <span className="font-bold text-gray-900 text-sm">{viewingReceiptTask.title}</span>
                <span className="text-gray-500">Cliente: {getClientName(viewingReceiptTask.clientId)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-gray-400 font-bold text-[10px] uppercase block">Prestador</span>
                  <span className="font-bold text-gray-900">{getFreelancerName(viewingReceiptTask.freelancerId)}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-gray-400 font-bold text-[10px] uppercase block">Horas Realizadas</span>
                  <span className="font-bold text-gray-900">{parseFloat(viewingReceiptTask.hours || 0).toFixed(1).replace('.', ',')}h</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-emerald-900 font-bold text-[10px] uppercase">Valor Quitado</span>
                  <span className="font-bold text-gray-500 text-[10px]">
                    Data: {formatDateBR(viewingReceiptTask.paymentDate || viewingReceiptTask.actualDeliveryDate)}
                  </span>
                </div>
                <span className="text-lg font-black text-emerald-950 font-title">
                  {formatCurrency(viewingReceiptTask.paymentValue || ((parseFloat(viewingReceiptTask.hours) || 0) * (getFreelancer(viewingReceiptTask.freelancerId)?.hourlyRate || 0)))}
                </span>
                {viewingReceiptTask.paymentId && (
                  <span className="text-[10px] text-emerald-800 font-mono pt-1 border-t border-emerald-200">
                    ID Transação: {viewingReceiptTask.paymentId}
                  </span>
                )}
              </div>

              {viewingReceiptTask.paymentReceiptUrl && (
                <a
                  href={viewingReceiptTask.paymentReceiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-900 text-white rounded-xl font-bold text-xs hover:bg-gray-800 transition-colors"
                >
                  <ExternalLink size={14} />
                  <span>Visualizar Comprovante Asaas</span>
                </a>
              )}

              <div className="flex justify-end pt-3 border-t border-gray-150">
                <button
                  type="button"
                  onClick={() => setViewingReceiptTask(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 5: ENVIAR COMPROVANTE & FECHAMENTO POR E-MAIL AO PRESTADOR    */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {isFreelancerEmailModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsFreelancerEmailModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-xl w-full p-6 animate-in fade-in-0 zoom-in-95 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-200">
                  <Mail size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-950">Enviar Fechamento & Comprovante por E-mail</h3>
                  <p className="text-xs text-gray-500">Revise os dados antes de disparar a mensagem para o prestador.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsFreelancerEmailModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {freelancerEmailSuccess ? (
              <div className="flex flex-col items-center justify-center py-6 px-2 gap-3 text-center animate-in fade-in-0 zoom-in-95">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-200">
                  <CheckCircle2 size={30} />
                </div>
                <div>
                  <h3 className="font-title text-base font-bold text-gray-950">E-mail Preparado com Sucesso!</h3>
                  <p className="text-xs text-gray-600 mt-1 max-w-md">
                    O relatório de fechamento em PDF foi gerado e baixado. Seu aplicativo de e-mail foi aberto com todas as informações e destinatários preenchidos.
                  </p>
                </div>
                {freelancerEmailCc && (
                  <div className="text-[11px] text-gray-600 bg-gray-50 border border-gray-200 px-3.5 py-1.5 rounded-xl">
                    Cópia do e-mail (CC): <strong>{freelancerEmailCc}</strong>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-center gap-2 mt-3 pt-3 border-t border-gray-100 w-full">
                  <button
                    type="button"
                    onClick={handleCopyFreelancerEmailText}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    {copiedFreelancerEmailBody ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedFreelancerEmailBody ? 'Copiado!' : 'Copiar Texto Completo'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsFreelancerEmailModalOpen(false);
                      setFreelancerEmailSuccess(false);
                    }}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-gray-700">E-mail do Prestador (Destinatário):</label>
                      <input 
                        type="email"
                        value={freelancerEmailTo}
                        onChange={(e) => setFreelancerEmailTo(e.target.value)}
                        placeholder="ex: prestador@gmail.com"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono text-gray-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-gray-700">Com Cópia (CC - Meu E-mail):</label>
                      <input 
                        type="email"
                        value={freelancerEmailCc}
                        onChange={(e) => setFreelancerEmailCc(e.target.value)}
                        placeholder="ex: contato@minhaempresa.com"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono text-gray-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-700">Assunto do E-mail:</label>
                    <input 
                      type="text"
                      value={freelancerEmailSubject}
                      onChange={(e) => setFreelancerEmailSubject(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-700">Mensagem (Prévia do Corpo do E-mail):</label>
                    <textarea 
                      rows={8}
                      value={freelancerEmailBody}
                      onChange={(e) => setFreelancerEmailBody(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono leading-relaxed text-gray-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                    />
                  </div>

                  <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl text-[11px] text-indigo-950 flex items-start gap-2">
                    <FileText size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Anexo em PDF Automático:</strong> Ao clicar em <strong>"Enviar E-mail"</strong>, o relatório executivo em PDF é salvo automaticamente em seus downloads e o seu aplicativo de e-mail abre pronto com Destinatário, Cópia (CC), Assunto e Mensagem preenchidos.
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleCopyFreelancerEmailText}
                    className="w-full sm:w-auto px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {copiedFreelancerEmailBody ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedFreelancerEmailBody ? 'Copiado!' : 'Copiar Mensagem'}</span>
                  </button>

                  <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setIsFreelancerEmailModalOpen(false)}
                      className="px-3 py-2 text-gray-600 hover:bg-gray-100 font-medium rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      onClick={handleLaunchGmailWeb}
                      disabled={isSendingFreelancerEmail}
                      className="px-3.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold rounded-xl text-xs transition-colors shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
                      title="Abrir diretamente na versão Web do Gmail"
                    >
                      <Mail size={14} className="text-red-600" />
                      <span>Abrir no Gmail</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleLaunchFreelancerEmailClient}
                      disabled={isSendingFreelancerEmail}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2"
                      title="Abrir no aplicativo padrão de e-mail do sistema"
                    >
                      {isSendingFreelancerEmail ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Preparando...</span>
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          <span>Abrir App E-mail</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
