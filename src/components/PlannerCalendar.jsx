import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  User, 
  Trash2, 
  X, 
  Link, 
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { classifyDemand } from '../utils/classification';

export default function PlannerCalendar({ entries, clients, onAddEntry, onUpdateEntry, onDeleteEntry }) {
  // Calendar Navigation State
  const [currentDate, setCurrentDate] = useState(new Date(2026, 5, 1)); // Default to June 2026
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'week'
  const [clientFilter, setClientFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Quick edit modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [modalDate, setModalDate] = useState('');
  
  // Form fields
  const [formClientId, setFormClientId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formHours, setFormHours] = useState(1);
  const [formType, setFormType] = useState('Digital');
  const [formRequester, setFormRequester] = useState('');
  const [formJobLink, setFormJobLink] = useState('Direto WhatsApp');
  const [formBillable, setFormBillable] = useState(true);
  const [formStatus, setFormStatus] = useState('Finalizado');

  // Automatic type classification on description change
  useEffect(() => {
    if (!editingEntry && formDescription) {
      const type = classifyDemand(formDescription);
      setFormType(type);
    }
  }, [formDescription, editingEntry]);

  // Handle month/week navigation
  const nextPeriod = () => {
    setCurrentDate(prev => {
      const next = new Date(prev);
      if (viewMode === 'month') {
        next.setMonth(next.getMonth() + 1);
      } else {
        next.setDate(next.getDate() + 7);
      }
      return next;
    });
  };

  const prevPeriod = () => {
    setCurrentDate(prev => {
      const next = new Date(prev);
      if (viewMode === 'month') {
        next.setMonth(next.getMonth() - 1);
      } else {
        next.setDate(next.getDate() - 7);
      }
      return next;
    });
  };

  // Get start/end dates
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday...

  // Category Color Map
  const categoryStyles = {
    'Digital': { bg: 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100/50', indicator: 'bg-blue-500' },
    'Impressos': { bg: 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100/50', indicator: 'bg-rose-500' },
    'Reunião': { bg: 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/50', indicator: 'bg-emerald-500' },
    'Programação': { bg: 'bg-violet-50 border-violet-200 text-violet-800 hover:bg-violet-100/50', indicator: 'bg-violet-500' },
    'Planejamento': { bg: 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100/50', indicator: 'bg-amber-500' }
  };

  // Filter entries
  const getFilteredEntries = () => {
    return entries.filter(e => {
      const matchClient = clientFilter === 'all' || e.clientId === clientFilter;
      const matchSearch = e.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (e.requester && e.requester.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchClient && matchSearch;
    });
  };

  const filteredEntries = getFilteredEntries();

  // Divide entries into: Scheduled (has delivery date in range) vs Backlog (no date or date outside month/week)
  const isDateInCurrentView = (dateStr) => {
    if (!dateStr) return false;
    const dateObj = new Date(dateStr + 'T00:00:00');
    if (viewMode === 'month') {
      return dateObj.getFullYear() === year && dateObj.getMonth() === month;
    } else {
      // Check if within the 7 days starting from startOfWeek
      const startOfWeek = getStartOfWeek(currentDate);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      
      return dateObj >= startOfWeek && dateObj <= endOfWeek;
    }
  };

  const scheduledEntries = filteredEntries.filter(e => e.deliveryDate && isDateInCurrentView(e.deliveryDate));
  
  // Backlog: entries with NO delivery date, OR those marked 'Pendente' or 'Em Andamento' (unscheduled)
  const backlogEntries = filteredEntries.filter(e => !e.deliveryDate || e.status === 'Pendente');

  // Drag and drop handlers
  const handleDragStart = (e, entryId) => {
    e.dataTransfer.setData('text/plain', entryId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetDateStr) => {
    e.preventDefault();
    const entryId = e.dataTransfer.getData('text/plain');
    if (!entryId) return;

    const entry = entries.find(item => item.id === entryId);
    if (entry) {
      onUpdateEntry({
        ...entry,
        deliveryDate: targetDateStr,
        requestDate: targetDateStr, // keep requestDate synced
        status: entry.status === 'Pendente' ? 'Finalizado' : entry.status // auto-complete if dragged to calendar
      });
    }
  };

  const handleRemoveFromSchedule = (e, entry) => {
    e.stopPropagation();
    onUpdateEntry({
      ...entry,
      deliveryDate: '',
      status: 'Pendente'
    });
  };

  // Helper: Start of week calculation
  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // adjust to Sunday
    return new Date(d.setDate(diff));
  };

  // Render Month Cells
  const renderMonthGrid = () => {
    const totalCells = [];
    
    // Add empty cells for padding from previous month days
    for (let i = 0; i < firstDayIndex; i++) {
      totalCells.push({ type: 'empty', id: `empty-${i}` });
    }

    // Add days of the current month
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(dayNum).padStart(2, '0');
      const dateKey = `${year}-${monthStr}-${dayStr}`;
      
      const dayEntries = scheduledEntries.filter(e => e.deliveryDate === dateKey);

      totalCells.push({
        type: 'day',
        dayNumber: dayNum,
        dateString: dateKey,
        entries: dayEntries
      });
    }

    // Fill remaining cells for standard 6-week layout (42 cells)
    const remaining = 42 - totalCells.length;
    for (let i = 0; i < remaining; i++) {
      totalCells.push({ type: 'empty', id: `empty-post-${i}` });
    }

    return totalCells;
  };

  // Render Week Cells
  const renderWeekGrid = () => {
    const days = [];
    const startOfWeek = getStartOfWeek(currentDate);

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + i);

      const yearStr = dayDate.getFullYear();
      const monthStr = String(dayDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(dayDate.getDate()).padStart(2, '0');
      const dateKey = `${yearStr}-${monthStr}-${dayStr}`;

      const dayEntries = scheduledEntries.filter(e => e.deliveryDate === dateKey);

      days.push({
        dayName: dayDate.toLocaleDateString('pt-BR', { weekday: 'short' }),
        dayNumber: dayDate.getDate(),
        dateString: dateKey,
        entries: dayEntries
      });
    }
    return days;
  };

  // Open Modal for adding/editing
  const openModalForAdd = (dateString) => {
    setEditingEntry(null);
    setModalDate(dateString);
    setFormClientId(clients[0]?.id || '');
    setFormDescription('');
    setFormHours(1);
    setFormType('Digital');
    setFormRequester('');
    setFormJobLink('Direto WhatsApp');
    setFormBillable(true);
    setFormStatus('Finalizado');
    setIsModalOpen(true);
  };

  const openModalForEdit = (entry) => {
    setEditingEntry(entry);
    setModalDate(entry.deliveryDate || '');
    setFormClientId(entry.clientId);
    setFormDescription(entry.description);
    setFormHours(entry.hours);
    setFormType(entry.type);
    setFormRequester(entry.requester || '');
    setFormJobLink(entry.jobLink || 'Direto WhatsApp');
    setFormBillable(entry.billable);
    setFormStatus(entry.status);
    setIsModalOpen(true);
  };

  const handleSaveEntry = (e) => {
    e.preventDefault();

    if (!formClientId) {
      alert("Por favor, selecione um cliente.");
      return;
    }
    if (!formDescription.trim()) {
      alert("Por favor, informe a descrição da demanda.");
      return;
    }

    const data = {
      clientId: formClientId,
      description: formDescription,
      hours: parseFloat(formHours) || 0,
      type: formType,
      requester: formRequester || null,
      jobLink: formJobLink,
      billable: formBillable,
      status: formStatus,
      deliveryDate: modalDate || null,
      requestDate: modalDate || new Date().toISOString().split('T')[0]
    };

    if (editingEntry) {
      onUpdateEntry({
        ...editingEntry,
        ...data
      });
    } else {
      onAddEntry(data);
    }
    setIsModalOpen(false);
  };

  const handleDeleteClick = () => {
    if (editingEntry && confirm("Deseja realmente excluir esta demanda permanentemente?")) {
      onDeleteEntry(editingEntry.id);
      setIsModalOpen(false);
    }
  };

  const formatMonthTitle = () => {
    return currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
  };

  const formatWeekTitle = () => {
    const start = getStartOfWeek(currentDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${start.getDate()} a ${end.getDate()} de ${start.toLocaleDateString('pt-BR', { month: 'short' })} / ${start.getFullYear()}`;
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-title text-2xl font-bold text-gray-900">Planejador Calendário</h1>
          <p className="text-sm text-gray-500">Agende demandas no calendário estilo Planyway arrastando-as do Backlog.</p>
        </div>
        
        {/* Navigation & View Toggle */}
        <div className="flex items-center gap-3">
          
          <div className="flex bg-white border border-gray-200 rounded-lg p-0.5 shadow-xs">
            <button 
              onClick={() => setViewMode('month')} 
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${viewMode === 'month' ? 'bg-yellow-400 text-gray-950 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Mês
            </button>
            <button 
              onClick={() => setViewMode('week')} 
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${viewMode === 'week' ? 'bg-yellow-400 text-gray-950 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Semana
            </button>
          </div>

          <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
            <button onClick={prevPeriod} className="p-2 border-r border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"><ChevronLeft size={14} /></button>
            <span className="px-4 text-xs font-bold text-gray-700 select-none min-w-[140px] text-center">
              {viewMode === 'month' ? formatMonthTitle() : formatWeekTitle()}
            </span>
            <button onClick={nextPeriod} className="p-2 border-l border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"><ChevronRight size={14} /></button>
          </div>

        </div>
      </div>

      {/* Filter panel */}
      <div className="bg-white border border-gray-150 rounded-xl p-4 shadow-xs flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Filtrar por</span>
        </div>

        <select 
          className="bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs font-semibold text-gray-700 hover:border-gray-300 focus:outline-none focus:border-gray-900 cursor-pointer transition-colors"
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
        >
          <option value="all">💼 Todos os Clientes</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <div className="relative max-w-xs w-full ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Pesquisar demandas..." 
            className="w-full bg-gray-50/70 hover:bg-white focus:bg-white border border-gray-200 focus:border-gray-900 rounded-lg pl-9 pr-8 py-2 text-xs font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900/10 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 cursor-pointer"
              title="Limpar busca"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Workspace Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        
        {/* Left column: Unscheduled Backlog (25%) */}
        <div className="w-full lg:w-[280px] bg-white border border-gray-150 rounded-xl p-5 shadow-xs flex flex-col gap-4">
          <div>
            <h3 className="font-title text-sm font-bold text-gray-900">Backlog (Sem Data)</h3>
            <p className="text-[11px] text-gray-400">Arraste os cards para o calendário para agendá-los.</p>
          </div>

          <div className="flex-grow overflow-y-auto max-h-[500px] lg:max-h-[600px] flex flex-col gap-2.5 pr-1">
            {backlogEntries.length === 0 ? (
              <p className="text-xs text-gray-400 py-8 text-center italic">Nenhuma atividade no backlog.</p>
            ) : (
              backlogEntries.map(e => {
                const clientObj = clients.find(c => c.id === e.clientId);
                const styles = categoryStyles[e.type] || categoryStyles['Digital'];
                
                return (
                  <div 
                    key={e.id}
                    draggable
                    onDragStart={(evt) => handleDragStart(evt, e.id)}
                    className="p-3 border border-gray-100 rounded-lg hover:border-gray-300 bg-white shadow-xs cursor-grab active:cursor-grabbing hover:shadow-sm transition-all flex flex-col gap-2 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-gray-400 uppercase truncate max-w-[120px]">
                        {clientObj?.name || 'Cliente'}
                      </span>
                      <span className={`w-2.5 h-2.5 rounded-full ${styles.indicator}`} title={e.type} />
                    </div>
                    
                    <p className="text-xs font-semibold text-gray-900 leading-snug break-words pr-4">
                      {e.description}
                    </p>

                    <div className="flex items-center gap-3 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1 font-bold text-gray-700">
                        <Clock size={11} /> {e.hours.toFixed(2).replace('.', ',')}h
                      </span>
                      {e.requester && (
                        <span className="flex items-center gap-0.5 truncate max-w-[80px]">
                          <User size={10} /> {e.requester}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <button 
            onClick={() => openModalForAdd('')}
            className="w-full py-2 bg-yellow-400 text-gray-950 font-bold hover:bg-yellow-500 rounded-lg text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-auto"
          >
            <Plus size={14} /> Nova Demanda
          </button>
        </div>

        {/* Right column: Calendar Grid (75%) */}
        <div className="flex-grow bg-white border border-gray-150 rounded-xl p-5 shadow-xs flex flex-col min-w-0">
          
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 border-b border-gray-100 pb-2 mb-1 text-center font-bold text-[10px] uppercase text-gray-400 tracking-wider">
            <span>Dom</span>
            <span>Seg</span>
            <span>Ter</span>
            <span>Qua</span>
            <span>Qui</span>
            <span>Sex</span>
            <span>Sáb</span>
          </div>

          {/* Month View Grid */}
          {viewMode === 'month' && (
            <div className="grid grid-cols-7 gap-1 flex-grow grid-rows-6 min-h-[480px]">
              {renderMonthGrid().map((cell, index) => {
                if (cell.type === 'empty') {
                  return (
                    <div 
                      key={cell.id} 
                      className="bg-gray-50/20 border border-gray-50/50 rounded-lg min-h-[80px]" 
                    />
                  );
                }

                // Check if date is today
                const isToday = new Date().toISOString().split('T')[0] === cell.dateString;

                return (
                  <div 
                    key={cell.dateString}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, cell.dateString)}
                    onDoubleClick={() => openModalForAdd(cell.dateString)}
                    className={`bg-white border rounded-lg p-1.5 flex flex-col gap-1 min-h-[85px] hover:bg-gray-50/10 transition-colors ${
                      isToday ? 'border-yellow-400 bg-yellow-50/5/20 shadow-inner' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex justify-between items-center select-none">
                      <span className={`text-[10px] font-bold ${isToday ? 'bg-yellow-400 text-gray-950 px-1.5 py-0.5 rounded-full' : 'text-gray-400'}`}>
                        {cell.dayNumber}
                      </span>
                      {cell.entries.length > 0 && (
                        <span className="text-[9px] text-gray-400 font-bold">
                          {cell.entries.reduce((sum, entry) => sum + entry.hours, 0).toFixed(1).replace('.', ',')}h
                        </span>
                      )}
                    </div>

                    <div className="flex-grow overflow-y-auto flex flex-col gap-1 pr-0.5 max-h-[80px]">
                      {cell.entries.map(entry => {
                        const styles = categoryStyles[entry.type] || categoryStyles['Digital'];
                        return (
                          <div 
                            key={entry.id}
                            draggable
                            onDragStart={(evt) => handleDragStart(evt, entry.id)}
                            onClick={() => openModalForEdit(entry)}
                            className={`px-1.5 py-0.5 border rounded text-[9px] font-semibold flex items-center justify-between cursor-pointer truncate ${styles.bg}`}
                            title={`${entry.description} (${entry.hours}h)`}
                          >
                            <span className="truncate flex-grow mr-1">{entry.description}</span>
                            <span className="shrink-0 text-gray-500 font-bold">{entry.hours.toFixed(1).replace('.', ',')}h</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Week View Grid */}
          {viewMode === 'week' && (
            <div className="grid grid-cols-7 gap-1.5 flex-grow min-h-[380px]">
              {renderWeekGrid().map((day) => {
                const isToday = new Date().toISOString().split('T')[0] === day.dateString;
                return (
                  <div 
                    key={day.dateString}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, day.dateString)}
                    onDoubleClick={() => openModalForAdd(day.dateString)}
                    className={`bg-white border rounded-xl p-3 flex flex-col gap-3 min-h-[350px] transition-all hover:shadow-xs ${
                      isToday ? 'border-yellow-400 bg-yellow-50/5' : 'border-gray-150'
                    }`}
                  >
                    <div className="flex flex-col items-center pb-2 border-b border-gray-100 select-none">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{day.dayName}</span>
                      <span className={`text-base font-extrabold mt-0.5 ${isToday ? 'bg-yellow-400 text-gray-950 w-7 h-7 flex items-center justify-center rounded-full shadow-sm' : 'text-gray-700'}`}>
                        {day.dayNumber}
                      </span>
                    </div>

                    <div className="flex-grow overflow-y-auto flex flex-col gap-2 pr-0.5 max-h-[300px]">
                      {day.entries.map(entry => {
                        const styles = categoryStyles[entry.type] || categoryStyles['Digital'];
                        const clientObj = clients.find(c => c.id === entry.clientId);

                        return (
                          <div 
                            key={entry.id}
                            draggable
                            onDragStart={(evt) => handleDragStart(evt, entry.id)}
                            onClick={() => openModalForEdit(entry)}
                            className={`p-2.5 border rounded-lg cursor-pointer flex flex-col gap-1.5 shadow-xs transition-shadow hover:shadow-sm ${styles.bg}`}
                          >
                            <div className="flex justify-between items-start">
                              <span className="text-[8px] font-bold uppercase text-gray-500 truncate max-w-[70px]">
                                {clientObj?.name || 'Cliente'}
                              </span>
                              <button 
                                onClick={(e) => handleRemoveFromSchedule(e, entry)}
                                className="text-gray-400 hover:text-red-600 transition-colors"
                                title="Mover para o Backlog"
                              >
                                <X size={10} />
                              </button>
                            </div>
                            
                            <p className="text-[10px] font-bold text-gray-900 leading-snug line-clamp-2">
                              {entry.description}
                            </p>

                            <div className="flex justify-between items-center mt-1 text-[8px] text-gray-400">
                              <span className="flex items-center gap-0.5 font-bold text-gray-700"><Clock size={9} /> {entry.hours.toFixed(1).replace('.', ',')}h</span>
                              {entry.requester && <span className="truncate max-w-[50px]">{entry.requester}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>

      {/* Add / Edit Task Modal */}
      {isModalOpen && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4">
          <form onSubmit={handleSaveEntry} className="bg-white border border-gray-150 rounded-xl p-6 shadow-lg max-w-md w-full flex flex-col gap-4">
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-title text-base font-bold text-gray-900 flex items-center gap-1.5">
                <Calendar size={18} className="text-yellow-600" />
                <span>{editingEntry ? 'Editar Lançamento' : 'Novo Lançamento'}</span>
              </h3>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3.5 text-xs">
              
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-gray-500">Cliente</label>
                <select 
                  className="border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-gray-900 bg-white cursor-pointer"
                  value={formClientId}
                  onChange={(e) => setFormClientId(e.target.value)}
                >
                  <option value="" disabled>Selecione um Cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-gray-500">Demanda / Atividade</label>
                <input 
                  type="text" 
                  placeholder="Ex: Arte para Campanha de Matrículas"
                  className="border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 bg-white"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-gray-500">Horas Operacionais</label>
                  <input 
                    type="number" 
                    step="0.25"
                    className="border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 bg-white"
                    value={formHours}
                    onChange={(e) => setFormHours(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-gray-500">Categoria (Tipo)</label>
                  <select 
                    className="border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-gray-900 bg-white cursor-pointer"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                  >
                    <option value="Digital">Digital</option>
                    <option value="Impressos">Impressos</option>
                    <option value="Reunião">Reunião</option>
                    <option value="Programação">Programação</option>
                    <option value="Planejamento">Planejamento</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-gray-500">Solicitante</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Mari Orse"
                    className="border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 bg-white"
                    value={formRequester}
                    onChange={(e) => setFormRequester(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-gray-500">Data Agendada</label>
                  <input 
                    type="date" 
                    className="border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 bg-white"
                    value={modalDate}
                    onChange={(e) => setModalDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-gray-500">Link do Job (Trello/Planyway)</label>
                <input 
                  type="text" 
                  placeholder="Ex: https://trello.com/c/..."
                  className="border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 bg-white"
                  value={formJobLink}
                  onChange={(e) => setFormJobLink(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-1.5">
                <label className="flex items-center gap-2 font-semibold text-gray-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900 cursor-pointer"
                    checked={formBillable}
                    onChange={(e) => setFormBillable(e.target.checked)}
                  />
                  <span>Faturável (Billable)</span>
                </label>
                
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-gray-550 mr-1">Status:</span>
                  <select 
                    className="border border-gray-200 rounded-lg py-1 px-2 text-xs focus:outline-none focus:border-gray-900 bg-white cursor-pointer"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Em Andamento">Em Andamento</option>
                    <option value="Finalizado">Finalizado</option>
                  </select>
                </div>
              </div>

            </div>

            <div className="flex justify-between items-center border-t border-gray-100 pt-4 mt-3 gap-2">
              {editingEntry ? (
                <button 
                  type="button"
                  onClick={handleDeleteClick}
                  className="px-3.5 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer mr-auto"
                >
                  <Trash2 size={13} /> Excluir
                </button>
              ) : <div className="flex-grow" />}
              
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-bold rounded-lg text-xs shadow-xs cursor-pointer"
              >
                Salvar
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
}
