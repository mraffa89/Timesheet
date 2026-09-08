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
  ArrowDown
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatPhone, formatCpfCnpj } from '../utils/cnpjLookup';

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
        className={`w-full flex items-center justify-between border rounded-lg px-3 py-2 text-xs text-left bg-gray-50 focus:bg-white focus:outline-none transition-all cursor-pointer ${
          isOpen ? 'border-yellow-500 ring-2 ring-yellow-400/20 bg-white' : 'border-gray-300 hover:border-gray-400'
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
              className="p-0.5 hover:text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
              title="Limpar seleção"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-yellow-600' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-[70] left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-2xl p-2 flex flex-col gap-1.5 animate-in fade-in-0 zoom-in-95">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input
              type="text"
              autoFocus
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-yellow-500 focus:bg-white text-gray-900 font-medium placeholder-gray-400"
            />
          </div>

          <div className="overflow-y-auto max-h-48 divide-y divide-gray-50 scrollbar-thin">
            {showCustomOption && (
              <button
                type="button"
                onClick={() => handleSelect(search.trim())}
                className="w-full text-left p-2 rounded-lg text-xs font-semibold bg-yellow-50/70 hover:bg-yellow-100 text-yellow-900 flex items-center justify-between cursor-pointer mb-1 border border-yellow-200"
              >
                <span>Usar "<strong>{search.trim()}</strong>"</span>
                <span className="text-[10px] bg-yellow-200 px-1.5 py-0.5 rounded font-bold">Novo</span>
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
                        ? 'bg-yellow-100/80 text-gray-950 font-bold border border-yellow-200'
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
                    {isSelected && <Check size={14} className="text-yellow-700 shrink-0 font-bold" />}
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
  companyInfo = {},
  categories = [],
  onAddCategory,
  onAddFreelancer,
  onUpdateFreelancer,
  onDeleteFreelancer,
  onAddTask,
  onUpdateTask,
  onDeleteTask
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

  // Payroll filters
  const [payrollMonth, setPayrollMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [payrollFreelancerId, setPayrollFreelancerId] = useState('all');

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [isFreelancerModalOpen, setIsFreelancerModalOpen] = useState(false);
  const [editingFreelancer, setEditingFreelancer] = useState(null);

  const [copiedWhatsAppMsg, setCopiedWhatsAppMsg] = useState(false);

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

  // Cálculos de Fechamento / Folha de Pagamento
  const payrollData = useMemo(() => {
    // Filtra tarefas do mês selecionado
    const monthTasks = tasks.filter(t => {
      const date = t.actualDeliveryDate || t.requestDate || '';
      if (!date.startsWith(payrollMonth)) return false;
      if (payrollFreelancerId !== 'all' && t.freelancerId !== payrollFreelancerId) return false;
      return true;
    });

    const deliveredMonthTasks = monthTasks.filter(t => t.status === 'delivered' || t.status === 'paid');
    const totalHours = deliveredMonthTasks.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0);
    
    // Total R$ a pagar
    let totalAmountToPay = 0;
    deliveredMonthTasks.forEach(t => {
      const freela = getFreelancer(t.freelancerId);
      const rate = freela ? (parseFloat(freela.hourlyRate) || 0) : 0;
      totalAmountToPay += (parseFloat(t.hours) || 0) * rate;
    });

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
      byClient: Object.entries(byClientMap).map(([name, hours]) => ({ name, hours })),
      byCategory: Object.entries(byCategoryMap).map(([name, hours]) => ({ name, hours }))
    };
  }, [tasks, payrollMonth, payrollFreelancerId, freelancers, clients]);

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

  // Copiar resumo para WhatsApp
  const handleCopyWhatsAppSummary = () => {
    const freela = getFreelancer(payrollFreelancerId);
    const targetName = freela ? freela.name : 'Equipe';
    const monthName = getMonthNamePT(payrollMonth);
    const pixInfo = freela?.pixKey ? `\n🔑 Chave PIX: ${freela.pixKey}` : '';

    let text = `*FECHAMENTO DE HORAS - ${monthName.toUpperCase()}*\n`;
    text += `Olá, ${targetName}!\n\n`;
    text += `Segue o espelho de demandas concluídas no mês de ${monthName}:\n\n`;

    payrollData.deliveredMonthTasks.forEach((t, i) => {
      const clientName = getClientName(t.clientId);
      text += `${i + 1}. *${t.title}* (${clientName})\n`;
      text += `   • Categoria: ${t.category || 'Geral'}\n`;
      text += `   • Entregue em: ${formatDateBR(t.actualDeliveryDate)}\n`;
      text += `   • Horas: ${parseFloat(t.hours).toFixed(1)}h\n\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `⏱️ *Total de Horas:* ${payrollData.totalHours.toFixed(1).replace('.', ',')}h\n`;
    if (freela?.hourlyRate > 0) {
      text += `💵 *Valor da Hora:* ${formatCurrency(freela.hourlyRate)}/h\n`;
      text += `💰 *VALOR TOTAL A RECEBER:* ${formatCurrency(payrollData.totalAmountToPay)}\n`;
    }
    text += `${pixInfo}\n`;
    text += `\nQualquer dúvida ou ajuste, estamos à disposição!\n`;
    text += `*${companyInfo?.brandName || 'Matheus Raffa'}*`;

    navigator.clipboard.writeText(text);
    setCopiedWhatsAppMsg(true);
    setTimeout(() => setCopiedWhatsAppMsg(false), 2500);
  };

  // Exportar PDF de Fechamento do Freelancer
  const handleExportPayrollPDF = () => {
    try {
      const doc = new jsPDF();
      const freela = getFreelancer(payrollFreelancerId);
      const targetName = freela ? freela.name : 'Todos os Prestadores';
      const monthName = getMonthNamePT(payrollMonth);

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(companyInfo?.brandName || 'Matheus Raffa', 14, 18);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text('Demonstrativo de Fechamento de Prestadores de Serviço', 14, 24);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(20);
      doc.text(`Período: ${monthName.toUpperCase()}`, 196, 18, { align: 'right' });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Prestador: ${targetName}`, 196, 24, { align: 'right' });

      doc.setDrawColor(220);
      doc.line(14, 28, 196, 28);

      // Tabela de tarefas
      const tableRows = payrollData.deliveredMonthTasks.map(t => {
        const cName = getClientName(t.clientId);
        const fRate = freela ? (parseFloat(freela.hourlyRate) || 0) : 0;
        const subtotal = (parseFloat(t.hours) || 0) * fRate;

        return [
          t.title,
          cName,
          t.category || 'Digital',
          formatDateBR(t.requestDate),
          formatDateBR(t.actualDeliveryDate),
          `${parseFloat(t.hours).toFixed(1).replace('.', ',')}h`,
          fRate > 0 ? formatCurrency(subtotal) : '-'
        ];
      });

      autoTable(doc, {
        startY: 34,
        head: [['Demanda / Tarefa', 'Cliente', 'Categoria', 'Solicitado', 'Entregue', 'Horas', 'Subtotal']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [24, 24, 27], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          5: { halign: 'center' },
          6: { halign: 'right' }
        }
      });

      const finalY = doc.lastAutoTable.finalY + 10;

      // Resumo final
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`Total de Horas Realizadas: ${payrollData.totalHours.toFixed(1).replace('.', ',')}h`, 14, finalY);
      if (freela?.hourlyRate > 0) {
        doc.text(`Valor Total a Pagar: ${formatCurrency(payrollData.totalAmountToPay)}`, 196, finalY, { align: 'right' });
      }
      if (freela?.pixKey) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Chave PIX: ${freela.pixKey}`, 14, finalY + 6);
      }

      const safeName = targetName.replace(/[^a-zA-Z0-9]/g, '_');
      doc.save(`Fechamento_${safeName}_${payrollMonth}.pdf`);
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
    link.setAttribute('download', `fechamento_freelancers_${payrollMonth}.csv`);
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
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pesquisar demandas, clientes..."
                  value={taskSearchTerm}
                  onChange={(e) => setTaskSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-yellow-500 focus:bg-white text-gray-900"
                />
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

                      return (
                        <tr key={task.id} className="hover:bg-yellow-50/30 transition-colors">
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
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <Calendar size={14} className="text-yellow-600" />
                <span>Mês de Fechamento:</span>
              </div>

              <select
                value={payrollMonth}
                onChange={(e) => setPayrollMonth(e.target.value)}
                className="bg-white border border-gray-200 rounded-lg py-1.5 px-3 text-xs font-semibold text-gray-800 focus:outline-none focus:border-yellow-500 cursor-pointer"
              >
                {uniqueMonths.map(m => (
                  <option key={m} value={m}>{getMonthNamePT(m)}</option>
                ))}
              </select>

              <div className="w-56">
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
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyWhatsAppSummary}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                title="Copiar mensagem formatada para WhatsApp"
              >
                {copiedWhatsAppMsg ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedWhatsAppMsg ? 'Copiado p/ WhatsApp!' : 'Copiar p/ WhatsApp'}</span>
              </button>

              <button
                onClick={handleExportPayrollPDF}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                title="Exportar PDF de Fechamento"
              >
                <Download size={14} />
                <span>Exportar PDF</span>
              </button>

              <button
                onClick={handleExportPayrollCSV}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-colors border border-gray-200 cursor-pointer"
                title="Exportar CSV"
              >
                <span>CSV</span>
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
                <span className="text-xs font-semibold text-gray-500 block">Demandas Entregues no Mês</span>
                <span className="text-2xl font-black text-gray-950 font-title">
                  {payrollData.deliveredMonthTasks.length} de {payrollData.monthTasks.length}
                </span>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-50 border border-yellow-200 flex items-center justify-center text-yellow-700 shrink-0">
                <DollarSign size={22} />
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500 block">Total a Pagar aos Prestadores</span>
                <span className="text-2xl font-black text-yellow-950 font-title">
                  {formatCurrency(payrollData.totalAmountToPay)}
                </span>
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
                <p className="text-xs text-gray-400 py-4 text-center">Nenhuma demanda concluída neste mês.</p>
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
                <p className="text-xs text-gray-400 py-4 text-center">Nenhuma demanda concluída neste mês.</p>
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
                Extrato Detalhado de Demandas do Mês
              </h3>
              <span className="text-xs text-gray-400">
                {payrollData.deliveredMonthTasks.length} demandas contabilizadas
              </span>
            </div>

            {payrollData.deliveredMonthTasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">
                Nenhuma demanda entregue neste mês selecionado.
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-xl w-full p-6 animate-in fade-in-0 zoom-in-95">
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
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-yellow-500 focus:bg-white text-gray-900 font-medium"
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
                    options={clientOptions}
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
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-yellow-500 focus:bg-white text-gray-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Prazo Esperado (Entrega):</label>
                  <input 
                    type="date"
                    value={taskForm.expectedDueDate}
                    onChange={(e) => setTaskForm({ ...taskForm, expectedDueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-yellow-500 focus:bg-white text-gray-900 font-bold"
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
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-yellow-500 focus:bg-white text-gray-900"
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
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-yellow-500 focus:bg-white text-gray-900 font-bold"
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
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-yellow-500 focus:bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Observações / Instruções:</label>
                <textarea 
                  rows={2}
                  placeholder="Detalhes adicionais para o freelancer..."
                  value={taskForm.notes}
                  onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-yellow-500 focus:bg-white text-gray-900"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-lg w-full p-6 animate-in fade-in-0 zoom-in-95">
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
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-yellow-500 focus:bg-white text-gray-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Especialidade / Função:</label>
                  <input 
                    type="text"
                    placeholder="Ex: Designer, Redator, Editor..."
                    value={freelancerForm.specialty}
                    onChange={(e) => setFreelancerForm({ ...freelancerForm, specialty: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-yellow-500 focus:bg-white text-gray-900"
                  />
                </div>
              </div>

              {/* Login credentials */}
              <div className="bg-yellow-50/50 border border-yellow-200 rounded-xl p-3 flex flex-col gap-2.5">
                <span className="text-[11px] font-bold text-yellow-900 flex items-center gap-1">
                  <Key size={13} /> Credenciais de Login para o Freelancer
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
                      className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-yellow-500 text-gray-900 font-mono"
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
                      className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-yellow-500 text-gray-900 font-mono"
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
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-yellow-500 focus:bg-white text-gray-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Chave PIX (Pagamento):</label>
                  <input 
                    type="text"
                    placeholder="CPF, E-mail ou Telefone"
                    value={freelancerForm.pixKey}
                    onChange={(e) => setFreelancerForm({ ...freelancerForm, pixKey: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-yellow-500 focus:bg-white text-gray-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">WhatsApp / Telefone:</label>
                  <input 
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={freelancerForm.phone}
                    onChange={(e) => setFreelancerForm({ ...freelancerForm, phone: formatPhone(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-yellow-500 focus:bg-white text-gray-900"
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
    </div>
  );
}
