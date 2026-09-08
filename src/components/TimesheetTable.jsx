import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit3, Trash2, Search, X, Sparkles, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, Check } from 'lucide-react';

function SearchableClientSelect({ clients = [], value, onChange, placeholder = "Pesquisar ou selecionar cliente..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);

  const sorted = [...clients].sort((a, b) => 
    (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' })
  );

  const filtered = sorted.filter(c => 
    (c.name || '').toLowerCase().includes(query.toLowerCase().trim()) ||
    (c.cnpj || '').includes(query.trim())
  );

  const selectedClient = clients.find(c => c.id === value);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between border rounded-lg p-2.5 text-xs text-left bg-gray-50/70 hover:bg-white focus:bg-white focus:outline-none transition-all cursor-pointer ${
          isOpen ? 'border-gray-900 ring-2 ring-gray-900/10 bg-white' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <span className={selectedClient ? "text-gray-950 font-bold" : "text-gray-400"}>
          {selectedClient ? selectedClient.name : placeholder}
        </span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-gray-900' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-2 flex flex-col gap-1.5 max-h-56 animate-in fade-in-0 zoom-in-95">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              autoFocus
              placeholder="Digite o nome do cliente..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-8 pr-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-900 focus:bg-white text-gray-900 font-medium placeholder-gray-400"
            />
          </div>

          <div className="overflow-y-auto max-h-40 divide-y divide-gray-50 scrollbar-thin">
            {filtered.length === 0 ? (
              <div className="p-2 text-center text-xs text-gray-400">Nenhum cliente encontrado.</div>
            ) : (
              filtered.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onChange(c.id);
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className={`w-full text-left p-2 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors flex items-center justify-between cursor-pointer ${
                    c.id === value ? 'bg-gray-100 text-gray-950 font-bold border border-gray-200' : 'text-gray-700'
                  }`}
                >
                  <span>{c.name}</span>
                  {c.id === value && <Check size={13} className="text-gray-950 font-bold" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TimesheetTable({ entries, clients, onAddEntry, onUpdateEntry, onDeleteEntry }) {
  const [filteredEntries, setFilteredEntries] = useState([]);
  
  // Filter States
  const [filterClient, setFilterClient] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterBillable, setFilterBillable] = useState('all'); // 'all' | 'billable' | 'non-billable'
  const [searchQuery, setSearchQuery] = useState('');

  // Table Column Sorting State
  const [sortField, setSortField] = useState('date'); // 'client' | 'date' | 'description' | 'hours' | 'billable'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  // Form State
  const [clientId, setClientId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [description, setDescription] = useState('');
  const [hours, setHours] = useState('1.00');
  const [billable, setBillable] = useState(true);
  const [status, setStatus] = useState('Finalizado');

  const dialogRef = useRef(null);

  // Alphabetically sorted clients list
  const sortedClients = [...clients].sort((a, b) => 
    (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' })
  );

  // Auto-populate first client if available on modal open
  useEffect(() => {
    if (sortedClients.length > 0 && !clientId) {
      setClientId(sortedClients[0].id);
    }
  }, [sortedClients, clientId]);

  useEffect(() => {
    if (!dialogRef.current) return;
    if (isModalOpen) {
      dialogRef.current.showModal();
    } else {
      dialogRef.current.close();
    }
  }, [isModalOpen]);

  // Fallback close behavior when clicking backdrop
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleBackdropClick = (e) => {
      if (e.target === dialog) {
        handleCloseModal();
      }
    };

    dialog.addEventListener('click', handleBackdropClick);
    return () => {
      dialog.removeEventListener('click', handleBackdropClick);
    };
  }, []);

  // Consolidate identical entries by Client + Description + Billable status
  const groupTimesheetEntries = (entriesList) => {
    const map = new Map();

    entriesList.forEach(entry => {
      const rawDesc = (entry.description || '').trim();
      const entryDate = entry.deliveryDate || entry.requestDate || '';
      const key = `${entry.clientId}___${rawDesc.toLowerCase()}___${!!entry.billable}`;

      if (!map.has(key)) {
        map.set(key, {
          ...entry,
          description: rawDesc,
          hours: entry.hours || 0,
          deliveryDate: entryDate,
          requestDate: entryDate,
          rawIds: [entry.id]
        });
      } else {
        const existing = map.get(key);
        existing.hours += (entry.hours || 0);
        existing.rawIds.push(entry.id);
        if (entryDate && new Date(entryDate) > new Date(existing.deliveryDate)) {
          existing.deliveryDate = entryDate;
          existing.requestDate = entryDate;
        }
      }
    });

    return Array.from(map.values());
  };

  // Filter & Sort Logic
  useEffect(() => {
    let consolidated = groupTimesheetEntries(entries);
    let result = consolidated;

    if (filterClient !== 'all') {
      result = result.filter(e => e.clientId === filterClient);
    }

    if (filterMonth !== 'all') {
      result = result.filter(e => {
        const dateStr = e.deliveryDate || e.requestDate;
        if (!dateStr) return false;
        const dateObj = new Date(dateStr + 'T00:00:00');
        const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        return monthKey === filterMonth;
      });
    }

    if (filterBillable !== 'all') {
      const isTargetBillable = filterBillable === 'billable';
      result = result.filter(e => e.billable === isTargetBillable);
    }

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(e => {
        const clientName = (clients.find(c => c.id === e.clientId)?.name || '').toLowerCase();
        const desc = (e.description || '').toLowerCase();
        return desc.includes(query) || clientName.includes(query);
      });
    }

    // Dynamic Column Sorting
    result.sort((a, b) => {
      let valA, valB;
      if (sortField === 'date') {
        valA = new Date(a.deliveryDate || a.requestDate).getTime() || 0;
        valB = new Date(b.deliveryDate || b.requestDate).getTime() || 0;
      } else if (sortField === 'client') {
        valA = (clients.find(c => c.id === a.clientId)?.name || '').toLowerCase();
        valB = (clients.find(c => c.id === b.clientId)?.name || '').toLowerCase();
        return sortOrder === 'asc' ? valA.localeCompare(valB, 'pt-BR') : valB.localeCompare(valA, 'pt-BR');
      } else if (sortField === 'description') {
        valA = (a.description || '').toLowerCase();
        valB = (b.description || '').toLowerCase();
        return sortOrder === 'asc' ? valA.localeCompare(valB, 'pt-BR') : valB.localeCompare(valA, 'pt-BR');
      } else if (sortField === 'hours') {
        valA = a.hours || 0;
        valB = b.hours || 0;
      } else if (sortField === 'billable') {
        valA = a.billable ? 1 : 0;
        valB = b.billable ? 1 : 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredEntries(result);
  }, [entries, filterClient, filterMonth, filterBillable, searchQuery, clients, sortField, sortOrder]);

  const handleHeaderSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const renderSortIndicator = (field) => {
    if (sortField !== field) return <ArrowUpDown size={11} className="text-gray-300 ml-1 inline-block" />;
    return sortOrder === 'asc' 
      ? <ArrowUp size={11} className="text-yellow-600 ml-1 inline-block" /> 
      : <ArrowDown size={11} className="text-yellow-600 ml-1 inline-block" />;
  };

  // Get unique months list for filter
  const getUniqueMonths = () => {
    const months = new Set();
    entries.forEach(e => {
      const dateStr = e.deliveryDate || e.requestDate;
      if (dateStr) {
        const dateObj = new Date(dateStr + 'T00:00:00');
        const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        months.add(monthKey);
      }
    });
    return Array.from(months).sort().reverse();
  };

  const getMonthNamePT = (monthKey) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(year, parseInt(month) - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const handleOpenAddModal = () => {
    setEditingEntry(null);
    setClientId(sortedClients.length > 0 ? sortedClients[0].id : '');
    
    const todayStr = new Date().toISOString().split('T')[0];
    setDeliveryDate(todayStr);
    setDescription('');
    setHours('1.00');
    setBillable(true);
    setStatus('Finalizado');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (entry) => {
    setEditingEntry(entry);
    setClientId(entry.clientId);
    setDeliveryDate(entry.deliveryDate || entry.requestDate);
    setDescription(entry.description);
    // Format to maximum 2 decimal places
    setHours(entry.hours ? Number(parseFloat(entry.hours).toFixed(2)).toString() : '0.00');
    setBillable(entry.billable !== undefined ? entry.billable : true);
    setStatus(entry.status || 'Finalizado');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEntry(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dateVal = deliveryDate || new Date().toISOString().split('T')[0];
    if (!clientId || !description.trim() || !dateVal) return;

    // Max 2 decimal places rounding
    const parsedHours = parseFloat(parseFloat(hours || 0).toFixed(2));

    const entryData = {
      clientId,
      requestDate: dateVal,
      deliveryDate: dateVal,
      description: description.trim(),
      type: 'Digital',
      requester: '',
      hours: parsedHours,
      jobLink: '',
      billable,
      status
    };

    if (editingEntry) {
      onUpdateEntry({ ...editingEntry, ...entryData });
    } else {
      onAddEntry(entryData);
    }
    handleCloseModal();
  };

  const handleDeleteGroupedEntry = (entry) => {
    if (entry.rawIds && entry.rawIds.length > 0) {
      entry.rawIds.forEach(id => onDeleteEntry(id));
    } else {
      onDeleteEntry(entry.id);
    }
  };

  const getClientName = (id) => {
    const client = clients.find(c => c.id === id);
    return client ? client.name : 'Desconhecido';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-title text-2xl font-bold text-gray-900">Timesheet</h1>
          <p className="text-sm text-gray-500">Histórico de lançamentos e demandas consolidadas por cliente.</p>
        </div>
        <button 
          className="flex items-center gap-1.5 px-4 py-2 bg-yellow-400 text-gray-950 rounded-lg text-xs font-bold hover:bg-yellow-500 shadow-xs transition-colors self-start sm:self-center cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
          onClick={handleOpenAddModal}
          disabled={clients.length === 0}
        >
          <Plus size={16} /> Lançar Demanda
        </button>
      </div>

      <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs flex flex-col gap-4">
        
        {/* Filters Bar with Search */}
        <div className="flex flex-wrap gap-3 items-center border-b border-gray-100 pb-4">
          
          {/* Live Search Input */}
          <div className="relative flex-grow sm:max-w-xs min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text"
              placeholder="Buscar demanda ou cliente..."
              className="w-full pl-9 pr-8 py-2 bg-gray-50/70 hover:bg-white focus:bg-white border border-gray-200 focus:border-gray-900 rounded-lg text-xs font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900/10 transition-all"
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

          <select 
            className="bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs font-semibold text-gray-700 hover:border-gray-300 focus:outline-none focus:border-gray-900 cursor-pointer transition-colors" 
            value={filterClient} 
            onChange={(e) => setFilterClient(e.target.value)}
          >
            <option value="all">Todos Clientes</option>
            {sortedClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select 
            className="bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs font-semibold text-gray-700 hover:border-gray-300 focus:outline-none focus:border-gray-900 cursor-pointer transition-colors" 
            value={filterMonth} 
            onChange={(e) => setFilterMonth(e.target.value)}
          >
            <option value="all">Todos os Meses</option>
            {getUniqueMonths().map(m => (
              <option key={m} value={m}>{getMonthNamePT(m)}</option>
            ))}
          </select>

          <select 
            className="bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs font-semibold text-gray-700 hover:border-gray-300 focus:outline-none focus:border-gray-900 cursor-pointer transition-colors" 
            value={filterBillable} 
            onChange={(e) => setFilterBillable(e.target.value)}
          >
            <option value="all">Faturáveis & Internos</option>
            <option value="billable">Faturáveis (Billable)</option>
            <option value="non-billable">Internos / Não Cobrados</option>
          </select>

          {(filterClient !== 'all' || filterMonth !== 'all' || filterBillable !== 'all' || searchQuery !== '') && (
            <button 
              className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors px-2 cursor-pointer"
              onClick={() => {
                setFilterClient('all');
                setFilterMonth('all');
                setFilterBillable('all');
                setSearchQuery('');
              }}
            >
              Limpar Filtros
            </button>
          )}
        </div>

        {/* List Table with Clickable Header Sort */}
        {filteredEntries.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center justify-center gap-1.5">
            <p className="text-gray-400 text-sm">Nenhum lançamento encontrado para os filtros selecionados.</p>
            {clients.length === 0 && (
              <p className="text-xs text-yellow-600 font-semibold">* Cadastre um cliente na aba Clientes primeiro.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto w-full border border-gray-150 rounded-lg">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-150 text-gray-500 font-bold uppercase tracking-wider font-title select-none">
                  <th 
                    className="py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleHeaderSort('client')}
                  >
                    <span>Cliente</span>
                    {renderSortIndicator('client')}
                  </th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleHeaderSort('date')}
                  >
                    <span>Data</span>
                    {renderSortIndicator('date')}
                  </th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleHeaderSort('description')}
                  >
                    <span>Demanda</span>
                    {renderSortIndicator('description')}
                  </th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleHeaderSort('hours')}
                  >
                    <span>Horas</span>
                    {renderSortIndicator('hours')}
                  </th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleHeaderSort('billable')}
                  >
                    <span>Tipo Lançamento</span>
                    {renderSortIndicator('billable')}
                  </th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-gray-900">{getClientName(entry.clientId)}</td>
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{formatDate(entry.deliveryDate || entry.requestDate)}</td>
                    <td className="py-3 px-4 max-w-[320px] text-gray-700 font-medium break-words leading-relaxed">{entry.description}</td>
                    <td className="py-3 px-4 font-bold text-gray-900 whitespace-nowrap">{entry.hours.toFixed(2).replace('.', ',')}h</td>
                    <td className="py-3 px-4">
                      {entry.billable ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-yellow-50 text-yellow-700 border border-yellow-100 rounded-full font-semibold">
                          <Sparkles size={8} /> Billable
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 bg-gray-50 text-gray-400 border border-gray-100 rounded-full font-semibold">
                          Interno (Não cobrado)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          className="p-1 border border-gray-100 rounded text-gray-400 hover:text-gray-900 hover:bg-gray-50 cursor-pointer" 
                          onClick={() => handleOpenEditModal(entry)}
                          title="Editar lançamento"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button 
                          className="p-1 border border-gray-100 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer" 
                          onClick={() => handleDeleteGroupedEntry(entry)}
                          title="Excluir lançamento"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal (With Searchable Client Selection) */}
      <dialog ref={dialogRef} onClose={handleCloseModal} className="bg-white p-6 rounded-xl border border-gray-200 max-w-[460px] w-full">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
          <h3 className="font-title text-base font-bold text-gray-900">
            {editingEntry ? 'Editar Lançamento' : 'Lançar Nova Demanda'}
          </h3>
          <button className="text-gray-400 hover:text-gray-900 cursor-pointer" onClick={handleCloseModal}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">Cliente</label>
            <SearchableClientSelect 
              clients={clients}
              value={clientId}
              onChange={(id) => setClientId(id)}
              placeholder="Pesquisar ou selecionar cliente..."
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600" htmlFor="entry-del-date">Data da Demanda</label>
            <input 
              id="entry-del-date" 
              type="date" 
              className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 bg-white" 
              value={deliveryDate} 
              onChange={(e) => setDeliveryDate(e.target.value)} 
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600" htmlFor="entry-desc">Demanda / Descrição</label>
            <textarea 
              id="entry-desc" 
              className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 bg-white" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Ex: Automação e publicação de novas artes de mídias sociais"
              rows={2}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-600" htmlFor="entry-hours">Consumo em Horas (máx 2 casas)</label>
              <input 
                id="entry-hours" 
                type="number" 
                step="0.01" 
                min="0.01"
                className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 bg-white" 
                value={hours} 
                onChange={(e) => setHours(e.target.value)} 
                required
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-600" htmlFor="entry-status">Status</label>
              <select 
                id="entry-status" 
                className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-gray-900 bg-white cursor-pointer" 
                value={status} 
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Finalizado">Finalizado</option>
                <option value="Em Andamento">Em Andamento</option>
              </select>
            </div>
          </div>

          {/* Billable Checkbox */}
          <div className="flex items-center gap-2 py-2 px-3 border border-gray-150 rounded-lg bg-gray-50 mt-1">
            <input 
              id="entry-billable" 
              type="checkbox" 
              className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900 cursor-pointer" 
              checked={billable} 
              onChange={(e) => setBillable(e.target.checked)} 
            />
            <label className="text-xs font-bold text-gray-800 cursor-pointer select-none" htmlFor="entry-billable">
              Faturável / Cobrado do Cliente (Billable)
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 mt-2">
            <button 
              type="button" 
              className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-semibold cursor-pointer" 
              onClick={handleCloseModal}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-yellow-400 text-gray-950 hover:bg-yellow-500 rounded-lg text-xs font-bold cursor-pointer"
            >
              Salvar Lançamento
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
