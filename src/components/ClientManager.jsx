import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit3, Trash2, Mail, Clock, DollarSign, X, Search, Phone, Building, MapPin, RefreshCw, CheckCircle2, AlertCircle, Globe, LayoutGrid, List, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { fetchAsaasCustomerByCnpj, syncAllAsaasClients } from '../utils/asaasIntegration';
import { formatCpfCnpj, formatPhone, fetchPublicCnpjData } from '../utils/cnpjLookup';

export default function ClientManager({ clients, onAddClient, onUpdateClient, onDeleteClient, onSyncClients }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [isSyncingAsaas, setIsSyncingAsaas] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'active' | 'inactive'
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [tableSortField, setTableSortField] = useState('name'); // 'status' | 'name' | 'cnpj' | 'contract' | 'contacts'
  const [tableSortOrder, setTableSortOrder] = useState('asc'); // 'asc' | 'desc'
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [additionalEmail, setAdditionalEmail] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isImportingCnpj, setIsImportingCnpj] = useState(false);
  const [isConsultingPublicCnpj, setIsConsultingPublicCnpj] = useState(false);
  const [contractType, setContractType] = useState('hybrid'); // 'fixed' | 'hourly' | 'hybrid'
  const [fixedFee, setFixedFee] = useState('1400');
  const [hoursIncluded, setHoursIncluded] = useState('7');
  const [hourlyRate, setHourlyRate] = useState(() => localStorage.getItem('raffa_default_hourly_rate') || '200');
  const [retainIss, setRetainIss] = useState(false);

  const dialogRef = useRef(null);

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

  // Auto-calculate hoursIncluded based on fixedFee / hourlyRate
  useEffect(() => {
    if (contractType === 'fixed' || contractType === 'hybrid') {
      const fee = parseFloat(fixedFee) || 0;
      const rate = parseFloat(hourlyRate) || 0;
      if (rate > 0) {
        setHoursIncluded((fee / rate).toFixed(2));
      } else {
        setHoursIncluded('0');
      }
    } else {
      setHoursIncluded('0');
    }
  }, [fixedFee, hourlyRate, contractType]);

  const handleOpenAddModal = () => {
    const globalRate = localStorage.getItem('raffa_default_hourly_rate') || '200';
    setEditingClient(null);
    setName('');
    setEmail('');
    setAdditionalEmail('');
    setCnpj('');
    setPhone('');
    setAddress('');
    setIsActive(true);
    setRetainIss(false);
    setContractType('fixed');
    setFixedFee('1000');
    setHourlyRate(globalRate);
    setHoursIncluded((1000 / (parseFloat(globalRate) || 200)).toFixed(2));
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (client) => {
    setEditingClient(client);
    setName(client.name);
    setEmail(client.email || '');
    setAdditionalEmail(client.additionalEmail || '');
    setCnpj(formatCpfCnpj(client.cnpj || ''));
    setPhone(formatPhone(client.phone || ''));
    setAddress(client.address || '');
    setIsActive(client.isActive !== false);
    const clientNameLower = (client.name || '').toLowerCase();
    const isPedroRafael = clientNameLower.includes('pedro') && (clientNameLower.includes('rafael') || clientNameLower.includes('&'));
    setRetainIss(client.retainIss !== undefined ? Boolean(client.retainIss) : isPedroRafael);
    setContractType(client.contractType);
    setFixedFee(client.fixedFee.toString());
    setHourlyRate(client.hourlyRate.toString());
    setHoursIncluded(client.hoursIncluded.toString());
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const handleImportAsaasByCnpj = async () => {
    if (!cnpj.trim()) {
      alert("Por favor, preencha o CNPJ para buscar no Asaas.");
      return;
    }
    
    setIsImportingCnpj(true);
    try {
      const data = await fetchAsaasCustomerByCnpj(cnpj);
      if (data.success) {
        if (data.name) setName(data.name);
        if (data.email) setEmail(data.email);
        if (data.phone) setPhone(formatPhone(data.phone));
        if (data.cnpj) setCnpj(formatCpfCnpj(data.cnpj));
        if (data.address) setAddress(data.address);

        let alertMsg = "Cliente localizado com sucesso no Asaas!";

        // Se encontrou assinatura ativa (Fee Mensal / 12 meses)
        if (data.subscription && data.subscription.value > 0) {
          setFixedFee(data.subscription.value.toString());
          if (contractType === 'hourly') {
            setContractType('hybrid');
          }
          const formattedValue = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.subscription.value);
          const durationStr = data.subscription.maxPayments ? ` (${data.subscription.maxPayments} meses)` : '';
          alertMsg += `\n\nAssinatura Ativa de Fee Mensal Encontrada: ${formattedValue}/mês${durationStr}.\nO campo 'Valor Mensal Fixo / Contrato' foi preenchido automaticamente.`;
        }

        alert(alertMsg);
      }
    } catch (err) {
      alert("Erro ao buscar CNPJ no Asaas: " + err.message);
    } finally {
      setIsImportingCnpj(false);
    }
  };

  const handleConsultPublicCnpj = async () => {
    if (!cnpj.trim()) {
      alert("Por favor, preencha o CNPJ para consultar na base pública da Receita Federal.");
      return;
    }
    
    setIsConsultingPublicCnpj(true);
    try {
      const data = await fetchPublicCnpjData(cnpj);
      if (data.success) {
        if (!name || name.trim() === '') {
          setName(data.name || data.legalName);
        }
        if (data.address) setAddress(data.address);
        if (data.email && (!email || email.trim() === '')) setEmail(data.email);
        if (data.phone && (!phone || phone.trim() === '')) setPhone(data.phone);
        if (data.cnpj) setCnpj(data.cnpj);
        alert(`Dados da empresa localizados com sucesso na base pública (${data.source})!\n\n• Razão Social: ${data.legalName}\n• Nome Fantasia: ${data.name || 'Não informado'}\n• Endereço: ${data.address}`);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setIsConsultingPublicCnpj(false);
    }
  };

  const handleSyncAllAsaas = async () => {
    setIsSyncingAsaas(true);
    try {
      const result = await syncAllAsaasClients();
      if (result.success) {
        // Mapeia clientes existentes por CNPJ limpo ou nome minúsculo
        const existingClientsMap = new Map();
        clients.forEach(c => {
          const key = (c.cnpj ? c.cnpj.replace(/\D/g, '') : '') || c.name.trim().toLowerCase();
          existingClientsMap.set(key, c);
        });

        const updatedClientsList = [...clients];

        result.clients.forEach(asaasClient => {
          const key = (asaasClient.cnpj ? asaasClient.cnpj.replace(/\D/g, '') : '') || asaasClient.name.trim().toLowerCase();
          
          if (existingClientsMap.has(key)) {
            // Atualiza cliente existente preservando ID e tarifa horária configurada
            const existing = existingClientsMap.get(key);
            const index = updatedClientsList.findIndex(c => c.id === existing.id);
            if (index !== -1) {
              updatedClientsList[index] = {
                ...existing,
                name: asaasClient.name || existing.name,
                email: asaasClient.email || existing.email,
                phone: asaasClient.phone || existing.phone,
                cnpj: asaasClient.cnpj || existing.cnpj,
                address: asaasClient.address || existing.address,
                isActive: asaasClient.isActive,
                fixedFee: asaasClient.fixedFee > 0 ? asaasClient.fixedFee : existing.fixedFee,
                contractType: asaasClient.fixedFee > 0 ? 'hybrid' : existing.contractType,
                hoursIncluded: asaasClient.fixedFee > 0 ? asaasClient.hoursIncluded : existing.hoursIncluded
              };
            }
          } else {
            // Novo cliente vindo do Asaas
            const newClient = {
              id: `client_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              name: asaasClient.name,
              email: asaasClient.email || '',
              cnpj: asaasClient.cnpj || '',
              phone: asaasClient.phone || '',
              address: asaasClient.address || '',
              contractType: asaasClient.contractType || 'hybrid',
              fixedFee: asaasClient.fixedFee || 0,
              hoursIncluded: asaasClient.hoursIncluded || 0,
              hourlyRate: asaasClient.hourlyRate || 150,
              isActive: asaasClient.isActive
            };
            updatedClientsList.push(newClient);
          }
        });

        if (onSyncClients) {
          await onSyncClients(updatedClientsList);
        } else {
          updatedClientsList.forEach(c => {
            if (clients.some(existing => existing.id === c.id)) {
              onUpdateClient(c);
            } else {
              onAddClient(c);
            }
          });
        }

        alert(`Sincronização com o Asaas concluída com sucesso!\n\n• Total de clientes processados: ${result.totalSynced}\n• Clientes Ativos (com contratos/assinaturas/faturas): ${result.activeCount}\n• Clientes Inativos: ${result.inactiveCount}`);
      }
    } catch (err) {
      alert("Erro ao sincronizar clientes com o Asaas: " + err.message);
    } finally {
      setIsSyncingAsaas(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const clientData = {
      name: name.trim(),
      email: email.trim(),
      additionalEmail: additionalEmail.trim(),
      cnpj: cnpj.trim(),
      phone: phone.trim(),
      address: address.trim(),
      contractType,
      fixedFee: contractType === 'hourly' ? 0 : (parseFloat(fixedFee) || 0),
      hoursIncluded: contractType === 'hourly' ? 0 : (parseFloat(hoursIncluded) || 0),
      hourlyRate: parseFloat(hourlyRate) || 0,
      isActive: isActive,
      retainIss: retainIss
    };

    if (editingClient) {
      onUpdateClient({ ...editingClient, ...clientData });
    } else {
      onAddClient(clientData);
    }
    handleCloseModal();
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getContractTypeName = (type) => {
    switch (type) {
      case 'fixed': return 'Fee Fixo';
      case 'hourly': return 'Faturamento por Hora';
      case 'hybrid': return 'Misto (Fixo + Hora Extra)';
      default: return type;
    }
  };

  // Filter clients
  const activeCount = clients.filter(c => c.isActive !== false).length;
  const inactiveCount = clients.filter(c => c.isActive === false).length;

  const handleTableSort = (field) => {
    if (tableSortField === field) {
      setTableSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setTableSortField(field);
      setTableSortOrder('asc');
    }
  };

  const renderTableSortIcon = (field) => {
    if (tableSortField !== field) return <ArrowUpDown size={11} className="text-white/40 ml-1 inline-block" />;
    return tableSortOrder === 'asc'
      ? <ArrowUp size={11} className="text-yellow-400 ml-1 inline-block" />
      : <ArrowDown size={11} className="text-yellow-400 ml-1 inline-block" />;
  };

  const filteredClients = clients.filter(client => {
    if (filterStatus === 'active' && client.isActive === false) return false;
    if (filterStatus === 'inactive' && client.isActive !== false) return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const matchName = (client.name || '').toLowerCase().includes(term);
      const matchCnpj = (client.cnpj || '').includes(term);
      const matchEmail = (client.email || '').toLowerCase().includes(term);
      return matchName || matchCnpj || matchEmail;
    }
    return true;
  }).sort((a, b) => {
    // In cards mode, always sort alphabetically
    if (viewMode === 'cards') {
      return (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' });
    }
    // In table mode, use column sorting
    let valA, valB;
    if (tableSortField === 'status') {
      valA = a.isActive !== false ? 1 : 0;
      valB = b.isActive !== false ? 1 : 0;
    } else if (tableSortField === 'name') {
      valA = (a.name || '').toLowerCase();
      valB = (b.name || '').toLowerCase();
      return tableSortOrder === 'asc'
        ? valA.localeCompare(valB, 'pt-BR', { sensitivity: 'base' })
        : valB.localeCompare(valA, 'pt-BR', { sensitivity: 'base' });
    } else if (tableSortField === 'cnpj') {
      valA = (a.cnpj || '').replace(/\D/g, '');
      valB = (b.cnpj || '').replace(/\D/g, '');
      return tableSortOrder === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    } else if (tableSortField === 'contract') {
      valA = a.fixedFee || 0;
      valB = b.fixedFee || 0;
    } else if (tableSortField === 'contacts') {
      valA = (a.email || '').toLowerCase();
      valB = (b.email || '').toLowerCase();
      return tableSortOrder === 'asc'
        ? valA.localeCompare(valB, 'pt-BR', { sensitivity: 'base' })
        : valB.localeCompare(valA, 'pt-BR', { sensitivity: 'base' });
    }
    if (valA < valB) return tableSortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return tableSortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-title text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500">Configure os dados cadastrais (CNPJ, Endereço, E-mail, Telefone) e regras de contrato dos seus clientes.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            onClick={handleSyncAllAsaas}
            disabled={isSyncingAsaas}
            title="Sincroniza todos os clientes, assinaturas e faturas ativas direto do Asaas"
          >
            <RefreshCw size={14} className={isSyncingAsaas ? "animate-spin" : ""} />
            <span>{isSyncingAsaas ? 'Sincronizando...' : 'Sincronizar clientes ASAAS'}</span>
          </button>

          <button 
            className="flex items-center gap-1.5 px-4 py-2 bg-yellow-400 text-gray-950 rounded-lg text-xs font-bold hover:bg-yellow-500 shadow-xs transition-colors cursor-pointer"
            onClick={handleOpenAddModal}
          >
            <Plus size={16} /> Adicionar Cliente
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar Row */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterStatus === 'all' 
                ? 'bg-gray-900 text-white shadow-2xs' 
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Todos ({clients.length})
          </button>

          <button 
            onClick={() => setFilterStatus('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterStatus === 'active' 
                ? 'bg-emerald-600 text-white shadow-2xs' 
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Ativos no Asaas ({activeCount})
          </button>

          <button 
            onClick={() => setFilterStatus('inactive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterStatus === 'inactive' 
                ? 'bg-gray-600 text-white shadow-2xs' 
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
            Inativos ({inactiveCount})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Bar */}
          <div className="relative flex-grow sm:w-72">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar por nome, CNPJ, e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-yellow-500 text-gray-900"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-700"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* View Mode Toggle Buttons */}
          <div className="flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-lg shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'cards' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Visualização em Cards"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Visualização em Lista / Tabela"
            >
              <List size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Render Mode: Table or Grid */}
      {filteredClients.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-4">
          <p className="text-gray-400 text-sm">
            {searchTerm 
              ? `Nenhum cliente encontrado para "${searchTerm}".` 
              : filterStatus === 'inactive' 
              ? 'Nenhum cliente inativo encontrado.' 
              : filterStatus === 'active' 
              ? 'Nenhum cliente ativo encontrado.' 
              : 'Nenhum cliente cadastrado ainda.'}
          </p>
          {clients.length === 0 && (
            <div className="flex gap-2">
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-xs transition-colors"
                onClick={handleSyncAllAsaas}
              >
                Sincronizar clientes ASAAS
              </button>
              <button 
                className="px-4 py-2 bg-yellow-400 text-gray-950 rounded-lg text-xs font-bold hover:bg-yellow-500 shadow-xs transition-colors"
                onClick={handleOpenAddModal}
              >
                Adicionar Manualmente
              </button>
            </div>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* Visualização em Lista / Tabela */
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-900 text-white font-semibold select-none">
                <th className="py-3 px-4 cursor-pointer hover:bg-gray-800 transition-colors" onClick={() => handleTableSort('status')}>
                  <span>Status</span>{renderTableSortIcon('status')}
                </th>
                <th className="py-3 px-4 cursor-pointer hover:bg-gray-800 transition-colors" onClick={() => handleTableSort('name')}>
                  <span>Cliente / Empresa</span>{renderTableSortIcon('name')}
                </th>
                <th className="py-3 px-4 cursor-pointer hover:bg-gray-800 transition-colors" onClick={() => handleTableSort('cnpj')}>
                  <span>CNPJ / CPF</span>{renderTableSortIcon('cnpj')}
                </th>
                <th className="py-3 px-4 cursor-pointer hover:bg-gray-800 transition-colors" onClick={() => handleTableSort('contract')}>
                  <span>Contrato</span>{renderTableSortIcon('contract')}
                </th>
                <th className="py-3 px-4 cursor-pointer hover:bg-gray-800 transition-colors" onClick={() => handleTableSort('contacts')}>
                  <span>Contatos</span>{renderTableSortIcon('contacts')}
                </th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {filteredClients.map((client) => {
                const initials = client.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                const isClientActive = client.isActive !== false;

                return (
                  <tr key={client.id} className={`hover:bg-gray-50/80 transition-colors ${!isClientActive ? 'bg-gray-50/50 text-gray-500' : ''}`}>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {isClientActive ? (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Ativo
                        </span>
                      ) : (
                        <span className="bg-gray-200 text-gray-600 border border-gray-300 px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span> Inativo
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-[11px] shrink-0 ${
                          isClientActive ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {initials}
                        </div>
                        <span>{client.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-600 whitespace-nowrap">
                      {formatCpfCnpj(client.cnpj) || '-'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">{getContractTypeName(client.contractType)}</span>
                        {client.contractType !== 'hourly' && (
                          <span className="text-[10px] text-gray-500">Fee: {formatCurrency(client.fixedFee)}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-gray-600">
                      <div className="flex flex-col gap-0.5">
                        {client.email && <span>{client.email}</span>}
                        {client.phone && <span className="text-gray-500">{formatPhone(client.phone)}</span>}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          className="p-1.5 border border-gray-200 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
                          onClick={() => handleOpenEditModal(client)}
                          title="Editar Cliente"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button 
                          className="p-1.5 border border-gray-200 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          onClick={() => onDeleteClient(client.id)}
                          title="Excluir Cliente"
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
      ) : (
        /* Visualização em Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => {
            const initials = client.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
            const isClientActive = client.isActive !== false;

            return (
              <div 
                key={client.id} 
                className={isClientActive 
                  ? "bg-white border border-gray-150 rounded-xl p-5 shadow-xs flex flex-col gap-4 transition-all"
                  : "bg-gray-100/90 border border-gray-200 rounded-xl p-5 shadow-none flex flex-col gap-4 text-gray-500 opacity-75 hover:opacity-100 transition-all"
                }
              >
                
                {/* Header card info */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-lg font-bold font-title text-sm shrink-0 border ${
                      isClientActive 
                        ? "bg-yellow-50 border-yellow-100 text-yellow-600" 
                        : "bg-gray-200 border-gray-300 text-gray-500"
                    }`}>
                      {initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className={`text-sm font-semibold ${isClientActive ? 'text-gray-900' : 'text-gray-600'}`}>
                          {client.name}
                        </h4>
                        {isClientActive ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded text-[9px] font-bold inline-flex items-center gap-0.5">
                            Ativo
                          </span>
                        ) : (
                          <span className="bg-gray-200 text-gray-500 border border-gray-300 px-1.5 py-0.5 rounded text-[9px] font-bold">
                            Inativo
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                        {getContractTypeName(client.contractType)}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <button 
                      className="p-1.5 border border-gray-100 rounded-md text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all cursor-pointer"
                      onClick={() => handleOpenEditModal(client)}
                      title="Editar Cliente"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button 
                      className="p-1.5 border border-gray-100 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                      onClick={() => onDeleteClient(client.id)}
                      title="Excluir Cliente"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Details list */}
                <div className="flex flex-col gap-1.5 text-xs text-gray-500 border-t border-b border-gray-100 py-3">
                  {client.cnpj && (
                    <div className="flex items-center gap-2">
                      <Building size={13} className="text-gray-400 shrink-0" />
                      <span>CNPJ/CPF: <strong className="font-mono text-gray-700">{formatCpfCnpj(client.cnpj)}</strong></span>
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={13} className="text-gray-400 shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.additionalEmail && (
                    <div className="flex items-center gap-2 text-gray-400 text-[11px]">
                      <Mail size={12} className="text-gray-300 shrink-0" />
                      <span className="truncate">CC: {client.additionalEmail}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-gray-400 shrink-0" />
                      <span>{formatPhone(client.phone)}</span>
                    </div>
                  )}
                </div>

                {/* Financial Summary per Client */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {client.contractType !== 'hourly' && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">Fee Mensal Fixo</span>
                      <span className={`text-xs font-bold flex items-center gap-1 ${isClientActive ? 'text-gray-900' : 'text-gray-600'}`}>
                        <DollarSign size={12} className="text-gray-400" /> {formatCurrency(client.fixedFee)}
                      </span>
                    </div>
                  )}
                  {client.contractType === 'hybrid' && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">Franquia de Horas</span>
                      <span className={`text-xs font-bold flex items-center gap-1 ${isClientActive ? 'text-gray-900' : 'text-gray-600'}`}>
                        <Clock size={12} className="text-gray-400" /> {client.hoursIncluded}h
                      </span>
                    </div>
                  )}
                  {client.contractType !== 'fixed' && (
                    <div className="flex flex-col gap-0.5" style={{ gridColumn: client.contractType === 'hourly' ? '1 / -1' : 'auto' }}>
                      <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">
                        {client.contractType === 'hybrid' ? 'Hora Extra' : 'Valor da Hora'}
                      </span>
                      <span className={`text-xs font-bold flex items-center gap-1 ${isClientActive ? 'text-gray-900' : 'text-gray-600'}`}>
                        <DollarSign size={12} className="text-gray-400" /> {formatCurrency(client.hourlyRate)}/h
                      </span>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <dialog ref={dialogRef} onClose={handleCloseModal} className="bg-white p-6 rounded-xl border border-gray-200 max-w-[520px] w-full shadow-xl">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
          <h3 className="font-title text-base font-bold text-gray-900">
            {editingClient ? 'Editar Cliente' : 'Adicionar Novo Cliente'}
          </h3>
          <button className="text-gray-400 hover:text-gray-900 cursor-pointer" onClick={handleCloseModal}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Asaas CNPJ Importer */}
          <div className="flex flex-col gap-1.5 bg-gray-50 border border-gray-150 p-3 rounded-lg">
            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Importar dados do Asaas por CNPJ</span>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="CNPJ (apenas números ou formatado)"
                className="flex-grow border border-gray-200 rounded-lg p-2 text-xs focus:outline-none focus:border-yellow-500 bg-white font-mono"
                value={cnpj}
                onChange={(e) => setCnpj(formatCpfCnpj(e.target.value))}
              />
              <button 
                type="button"
                onClick={handleImportAsaasByCnpj}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 text-xs font-bold cursor-pointer shrink-0 disabled:opacity-55 flex items-center gap-1"
                disabled={isImportingCnpj}
              >
                <Search size={12} /> {isImportingCnpj ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700" htmlFor="client-name">Nome da Empresa / Cliente</label>
            <input 
              id="client-name" 
              type="text" 
              className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-yellow-500 bg-white" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Ex: CPR (MHB Raffa)"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-gray-700" htmlFor="client-cnpj-input">CNPJ / CPF do Cliente</label>
                <button
                  type="button"
                  onClick={handleConsultPublicCnpj}
                  disabled={isConsultingPublicCnpj}
                  className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Consultar dados da empresa na Receita Federal via API pública gratuita"
                >
                  <Globe size={11} />
                  <span>{isConsultingPublicCnpj ? 'Consultando...' : 'Buscar na Receita'}</span>
                </button>
              </div>
              <input 
                id="client-cnpj-input" 
                type="text" 
                className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-yellow-500 bg-white font-mono" 
                value={cnpj} 
                onChange={(e) => setCnpj(formatCpfCnpj(e.target.value))} 
                placeholder="00.000.000/0000-00"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700" htmlFor="client-phone-input">Telefone / WhatsApp</label>
              <input 
                id="client-phone-input" 
                type="text" 
                className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-yellow-500 bg-white font-mono" 
                value={phone} 
                onChange={(e) => setPhone(formatPhone(e.target.value))} 
                placeholder="(19) 99999-9999"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700" htmlFor="client-address-input">Endereço Completo</label>
            <input 
              id="client-address-input" 
              type="text" 
              className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-yellow-500 bg-white" 
              value={address} 
              onChange={(e) => setAddress(e.target.value)} 
              placeholder="Av. Exemplo, 100 - Bairro, Cidade/UF - CEP: 13000-000"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700" htmlFor="client-email">E-mail Financeiro Principal</label>
              <input 
                id="client-email" 
                type="email" 
                className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-yellow-500 bg-white" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="financeiro@empresa.com.br"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700" htmlFor="client-additional-email">E-mail Adicional (Opcional - Cópia)</label>
              <input 
                id="client-additional-email" 
                type="email" 
                className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-yellow-500 bg-white" 
                value={additionalEmail} 
                onChange={(e) => setAdditionalEmail(e.target.value)} 
                placeholder="diretoria@empresa.com.br"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input 
              id="client-is-active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-yellow-500 rounded border-gray-300 focus:ring-yellow-400 cursor-pointer"
            />
            <label htmlFor="client-is-active" className="text-xs font-semibold text-gray-700 cursor-pointer">
              Cliente Ativo (com contrato ou demandas correntes)
            </label>
          </div>

          <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5 cursor-pointer">
                <span>Retenção de ISS (Emissão NFS-e no Asaas)</span>
              </label>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${retainIss ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-gray-100 text-gray-700'}`}>
                {retainIss ? 'Tomador retém o ISS' : 'ISS por conta do prestador'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <input 
                id="client-retain-iss"
                type="checkbox"
                checked={retainIss}
                onChange={(e) => setRetainIss(e.target.checked)}
                className="w-4 h-4 text-yellow-500 rounded border-gray-300 focus:ring-yellow-400 cursor-pointer"
              />
              <label htmlFor="client-retain-iss" className="text-xs text-gray-700 cursor-pointer">
                Este cliente retém o ISS na fonte (Tomador do ISS, como o <strong>Colégio Pedro e Rafael</strong>).
              </label>
            </div>
            <p className="text-[11px] text-gray-500">
              {retainIss 
                ? 'ℹ️ Ao gerar faturas para este cliente no Asaas, a NFS-e será programada com retenção de ISS pelo tomador.' 
                : 'ℹ️ Padrão: O imposto ISS é recolhido pelo prestador (sem retenção de ISS pelo cliente).'}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700" htmlFor="client-contract">Modelo de Contrato</label>
            <select 
              id="client-contract" 
              className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-yellow-500 bg-white cursor-pointer" 
              value={contractType} 
              onChange={(e) => setContractType(e.target.value)}
            >
              <option value="fixed">Fee Fixo (Valor Fechado Mensal)</option>
              <option value="hourly">Faturamento por Hora (Sem Franquia)</option>
              <option value="hybrid">Misto (Fee Fixo + Cobrança de Hora Extra)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {contractType !== 'hourly' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700" htmlFor="client-fixed-fee">Valor Mensal Fixo (R$)</label>
                <input 
                  id="client-fixed-fee" 
                  type="number" 
                  step="0.01" 
                  className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-yellow-500 bg-white" 
                  value={fixedFee} 
                  onChange={(e) => setFixedFee(e.target.value)} 
                  placeholder="0.00"
                  required
                />
              </div>
            )}

            {contractType !== 'fixed' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700" htmlFor="client-rate">
                  {contractType === 'hybrid' ? 'Tarifa Hora Extra (R$)' : 'Tarifa por Hora (R$)'}
                </label>
                <input 
                  id="client-rate" 
                  type="number" 
                  step="0.01" 
                  className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-yellow-500 bg-white" 
                  value={hourlyRate} 
                  onChange={(e) => setHourlyRate(e.target.value)} 
                  placeholder="0.00"
                  required
                />
              </div>
            )}

            {contractType !== 'hourly' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700" htmlFor="client-hours">
                  Horas Inclusas (Calculado)
                </label>
                <input 
                  id="client-hours" 
                  type="text" 
                  readOnly 
                  className="border border-gray-200 bg-gray-50 rounded-lg p-2.5 text-sm text-gray-600 font-semibold focus:outline-none" 
                  value={`${hoursIncluded}h`} 
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 mt-2">
            <button 
              type="button" 
              className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer" 
              onClick={handleCloseModal}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-yellow-400 text-gray-950 rounded-lg text-xs font-bold hover:bg-yellow-500 shadow-xs cursor-pointer"
            >
              {editingClient ? 'Salvar Alterações' : 'Adicionar Cliente'}
            </button>
          </div>

        </form>
      </dialog>

    </div>
  );
}
