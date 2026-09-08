import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  DollarSign, 
  Users, 
  TrendingUp, 
  AlertCircle, 
  ArrowUpRight, 
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Search,
  Layers,
  Filter
} from 'lucide-react';

export default function Dashboard({ entries = [], clients = [], onNavigateToTab }) {
  // 1. Filtro de Período ('current_month', 'prev_month', 'select_month', 'all', 'custom')
  const [periodFilter, setPeriodFilter] = useState('current_month');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // 2. Visualização do Gráfico
  const [chartMetric, setChartMetric] = useState('hours'); // 'hours' | 'billing'
  const [chartViewType, setChartViewType] = useState('columns'); // 'columns' | 'bars'

  // 3. Pesquisa e expansão de clientes
  const [clientSearch, setClientSearch] = useState('');
  const [expandedClientId, setExpandedClientId] = useState(null);

  // Helper para normalizar qualquer formato de data para YYYY-MM-DD
  const normalizeDateStr = (dateStr) => {
    if (!dateStr) return '';
    const s = String(dateStr).trim();
    if (s.includes('T')) {
      return s.split('T')[0];
    }
    if (s.includes('/')) {
      const parts = s.split('/');
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          // DD/MM/YYYY
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else if (parts[0].length === 4) {
          // YYYY/MM/DD
          return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
      }
    }
    if (s.includes('-')) {
      const parts = s.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        } else if (parts[2].length === 4) {
          // DD-MM-YYYY
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
    }
    try {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
    } catch (e) {}
    return '';
  };

  const formatDateBR = (isoStr) => {
    if (!isoStr) return '';
    const parts = isoStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoStr;
  };

  // Meses únicos disponíveis
  const availableMonths = useMemo(() => {
    const map = new Map();
    (entries || []).forEach(e => {
      const raw = e.deliveryDate || e.requestDate;
      const iso = normalizeDateStr(raw);
      if (iso && iso.length >= 7) {
        const ym = iso.slice(0, 7);
        if (!map.has(ym)) {
          const [y, m] = ym.split('-');
          const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
          const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
          map.set(ym, label.charAt(0).toUpperCase() + label.slice(1));
        }
      }
    });

    // Garante que o mês atual e meses recentes estejam disponíveis
    const now = new Date();
    for (let i = 0; i < 4; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(ym)) {
        const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        map.set(ym, label.charAt(0).toUpperCase() + label.slice(1));
      }
    }

    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([value, label]) => ({ value, label }));
  }, [entries]);

  // Intervalo calculado do período ativo
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

    if (periodFilter === 'select_month') {
      if (!selectedMonth) {
        return { periodStart: null, periodEnd: null, periodLabel: 'Selecione um mês' };
      }
      const [sYear, sMonth] = selectedMonth.split('-');
      const start = `${selectedMonth}-01`;
      const lastDay = new Date(parseInt(sYear, 10), parseInt(sMonth, 10), 0).getDate();
      const end = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
      const dateObj = new Date(parseInt(sYear, 10), parseInt(sMonth, 10) - 1, 1);
      const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
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
        periodLabel: (customStartDate && customEndDate)
          ? `${formatDateBR(customStartDate)} a ${formatDateBR(customEndDate)}`
          : 'Período Personalizado'
      };
    }

    return {
      periodStart: null,
      periodEnd: null,
      periodLabel: 'Todo o Período'
    };
  }, [periodFilter, selectedMonth, customStartDate, customEndDate]);

  // Filtra lançamentos que pertencem ao período selecionado
  const filteredEntries = useMemo(() => {
    return (entries || []).filter(e => {
      if (!periodStart && !periodEnd) return true;
      const rawDate = e.deliveryDate || e.requestDate;
      if (!rawDate) return false;
      const iso = normalizeDateStr(rawDate);
      if (!iso) return false;
      if (periodStart && iso < periodStart) return false;
      if (periodEnd && iso > periodEnd) return false;
      return true;
    });
  }, [entries, periodStart, periodEnd]);

  // Formatação de moeda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  // Cálculo consolidado de faturamento, horas e rentabilidade por cliente
  const {
    stats,
    profitabilityList,
    clientChartData
  } = useMemo(() => {
    // 1. Horas totais gastas
    const totalHours = filteredEntries.reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0);

    // 2. Jobs únicos faturáveis
    const billableEntries = filteredEntries.filter(e => e.billable);
    const uniqueBillableDemands = new Set(
      billableEntries.map(e => (e.description || '').trim().toLowerCase())
    );
    const extraJobsCount = uniqueBillableDemands.size;

    // 3. Mapeamento de horas por cliente
    const clientStatsMap = {};
    (clients || []).forEach(c => {
      clientStatsMap[c.id] = {
        billableHours: 0,
        nonBillableHours: 0,
        totalHours: 0
      };
    });

    filteredEntries.forEach(e => {
      if (clientStatsMap[e.clientId]) {
        const h = parseFloat(e.hours) || 0;
        if (e.billable) {
          clientStatsMap[e.clientId].billableHours += h;
        } else {
          clientStatsMap[e.clientId].nonBillableHours += h;
        }
        clientStatsMap[e.clientId].totalHours += h;
      }
    });

    let totalFixedBilling = 0;
    let totalVariableBilling = 0;
    const profitabilityData = [];

    (clients || []).forEach(client => {
      const clientHours = clientStatsMap[client.id] || { billableHours: 0, nonBillableHours: 0, totalHours: 0 };
      const billable = clientHours.billableHours;
      const total = clientHours.totalHours;

      // REGRA SOLICITADA PELO USUÁRIO:
      // "Em relação a faturamento e retorno por cliente, ter somente dos clientes que estão ativos ou que geraram consumo de horas naquele mês."
      const isClientActive = client.isActive !== false;
      const hasConsumedHours = total > 0;

      // Se o cliente estiver inativo E não gerou nenhuma hora no período, é completamente ignorado
      if (!isClientActive && !hasConsumedHours) {
        return;
      }

      let fixedBillingForClient = 0;
      let variableBillingForClient = 0;

      const hourlyRate = parseFloat(client.hourlyRate) || 0;
      const fixedFee = parseFloat(client.fixedFee) || 0;
      const hoursIncluded = parseFloat(client.hoursIncluded) || 0;

      if (client.contractType === 'fixed') {
        fixedBillingForClient = fixedFee;
      } else if (client.contractType === 'hourly') {
        variableBillingForClient = billable * hourlyRate;
      } else if (client.contractType === 'hybrid') {
        fixedBillingForClient = fixedFee;
        const extraHours = Math.max(0, billable - hoursIncluded);
        variableBillingForClient = extraHours * hourlyRate;
      }

      const billingForClient = fixedBillingForClient + variableBillingForClient;
      totalFixedBilling += fixedBillingForClient;
      totalVariableBilling += variableBillingForClient;

      // Cálculo de Rentabilidade / Taxa Efetiva
      let effectiveRate = 0;
      let profitStatus = 'neutral';
      let statusLabel = 'Sem Horas';

      if (total > 0) {
        effectiveRate = billingForClient / total;
        if (effectiveRate >= 220) {
          profitStatus = 'excellent';
          statusLabel = 'Alta Lucratividade';
        } else if (effectiveRate >= 140) {
          profitStatus = 'good';
          statusLabel = 'Retorno Coerente';
        } else if (effectiveRate >= 80) {
          profitStatus = 'warning';
          statusLabel = 'Alerta / Margem Baixa';
        } else {
          profitStatus = 'critical';
          statusLabel = 'Prejuízo / Esforço Alto';
        }
      } else if (billingForClient > 0) {
        effectiveRate = Infinity;
        profitStatus = 'excellent';
        statusLabel = 'Lucratividade Máxima';
      }

      profitabilityData.push({
        clientId: client.id,
        clientName: client.name,
        isActive: isClientActive,
        contractType: client.contractType,
        fixedFee,
        hourlyRate,
        hoursIncluded,
        totalHoursSpent: total,
        billableHours: billable,
        nonBillableHours: clientHours.nonBillableHours,
        billing: billingForClient,
        fixedBilling: fixedBillingForClient,
        variableBilling: variableBillingForClient,
        effectiveRate,
        status: profitStatus,
        statusLabel
      });
    });

    // Ordena clientes por maior faturamento e depois por horas gastas
    profitabilityData.sort((a, b) => b.billing - a.billing || b.totalHoursSpent - a.totalHoursSpent);

    // Dados para o gráfico em largura total (100% width)
    const chartData = profitabilityData
      .filter(item => item.totalHoursSpent > 0 || item.billing > 0)
      .map(item => ({
        id: item.clientId,
        name: item.clientName,
        totalHours: item.totalHoursSpent,
        billableHours: item.billableHours,
        nonBillableHours: item.nonBillableHours,
        billing: item.billing,
        contractType: item.contractType,
        status: item.status
      }));

    return {
      stats: {
        totalHours,
        estimatedBilling: totalFixedBilling + totalVariableBilling,
        variableBilling: totalVariableBilling,
        activeClientsCount: profitabilityData.length,
        completedDemandsCount: extraJobsCount
      },
      profitabilityList: profitabilityData,
      clientChartData: chartData
    };
  }, [filteredEntries, clients]);

  // Estilos de badge de lucratividade
  const getProfitabilityStyles = (status) => {
    switch (status) {
      case 'excellent':
        return { bg: 'bg-green-50 border-green-200 text-green-700', icon: <CheckCircle2 className="text-green-600" size={13} /> };
      case 'good':
        return { bg: 'bg-blue-50 border-blue-200 text-blue-700', icon: <CheckCircle2 className="text-blue-600" size={13} /> };
      case 'warning':
        return { bg: 'bg-amber-50 border-amber-200 text-amber-700', icon: <AlertTriangle className="text-amber-600" size={13} /> };
      case 'critical':
        return { bg: 'bg-red-50 border-red-200 text-red-700', icon: <AlertCircle className="text-red-600" size={13} /> };
      default:
        return { bg: 'bg-gray-50 border-gray-200 text-gray-500', icon: <Clock className="text-gray-400" size={13} /> };
    }
  };

  // Filtragem de clientes por busca textual
  const filteredProfitabilityList = useMemo(() => {
    if (!clientSearch.trim()) return profitabilityList;
    const term = clientSearch.toLowerCase().trim();
    return profitabilityList.filter(c => c.clientName.toLowerCase().includes(term));
  }, [profitabilityList, clientSearch]);

  // Métricas para o gráfico
  const maxChartHours = useMemo(() => {
    if (clientChartData.length === 0) return 1;
    return Math.max(...clientChartData.map(d => d.totalHours), 1);
  }, [clientChartData]);

  const maxChartBilling = useMemo(() => {
    if (clientChartData.length === 0) return 1;
    return Math.max(...clientChartData.map(d => d.billing), 1);
  }, [clientChartData]);

  const topDemander = useMemo(() => {
    if (clientChartData.length === 0) return null;
    return [...clientChartData].sort((a, b) => b.totalHours - a.totalHours)[0];
  }, [clientChartData]);

  return (
    <div className="flex flex-col gap-6">
      
      {/* 1. Header com Título e Barra de Filtro de Período */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="font-title text-2xl font-bold text-gray-900">Visão Geral</h1>
            <p className="text-sm text-gray-500">Métricas consolidadas de faturamento, esforço e rentabilidade por cliente.</p>
          </div>
        </div>

        {/* Barra de Filtro de Período (Mês Atual, Mês Anterior, Selecionar Mês, Todo o Período, Personalizado) */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gray-50 text-gray-700 rounded-xl border border-gray-200">
              <Calendar size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Período de Referência</span>
              <span className="text-sm font-bold text-gray-900">{periodLabel}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="inline-flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPeriodFilter('current_month')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  periodFilter === 'current_month'
                    ? 'bg-white text-gray-950 font-bold shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900 font-medium'
                }`}
              >
                Mês Atual
              </button>
              <button
                type="button"
                onClick={() => setPeriodFilter('prev_month')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  periodFilter === 'prev_month'
                    ? 'bg-white text-gray-950 font-bold shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900 font-medium'
                }`}
              >
                Mês Anterior
              </button>
              <button
                type="button"
                onClick={() => setPeriodFilter('select_month')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  periodFilter === 'select_month'
                    ? 'bg-white text-gray-950 font-bold shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900 font-medium'
                }`}
              >
                Selecionar Mês
              </button>
              <button
                type="button"
                onClick={() => setPeriodFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  periodFilter === 'all'
                    ? 'bg-white text-gray-950 font-bold shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900 font-medium'
                }`}
              >
                Todo o Período
              </button>
              <button
                type="button"
                onClick={() => setPeriodFilter('custom')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  periodFilter === 'custom'
                    ? 'bg-white text-gray-950 font-bold shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900 font-medium'
                }`}
              >
                Personalizado
              </button>
            </div>

            {/* Sub-menu caso 'Selecionar Mês' esteja ativo */}
            {periodFilter === 'select_month' && (
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1 text-xs animate-in fade-in-0">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent font-semibold text-gray-800 focus:outline-none cursor-pointer text-xs"
                >
                  {availableMonths.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Sub-menu caso 'Personalizado' esteja ativo */}
            {periodFilter === 'custom' && (
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1 text-xs animate-in fade-in-0">
                <span className="text-[10px] font-bold text-gray-400 uppercase">De:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-white border border-gray-200 rounded px-1.5 py-0.5 text-xs text-gray-800 font-medium focus:outline-none focus:border-yellow-500"
                />
                <span className="text-[10px] font-bold text-gray-400 uppercase">Até:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-white border border-gray-200 rounded px-1.5 py-0.5 text-xs text-gray-800 font-medium focus:outline-none focus:border-yellow-500"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Metric Cards (Clean white grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-gray-400">
            <span className="text-[11px] font-bold tracking-wider uppercase">Faturamento do Período</span>
            <div className="text-gray-900 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold font-title text-gray-900 leading-none">{formatCurrency(stats.estimatedBilling)}</span>
            <span className="text-[10px] text-gray-400 font-semibold mt-1">
              Sendo <strong className="text-yellow-600">{formatCurrency(stats.variableBilling)}</strong> faturamento extra
            </span>
          </div>
          <span className="text-[10px] text-yellow-600 font-semibold cursor-pointer flex items-center gap-0.5 mt-1" onClick={() => onNavigateToTab('reports')}>
            Ver faturas e relatórios <ArrowUpRight size={10} />
          </span>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-gray-400">
            <span className="text-[11px] font-bold tracking-wider uppercase">Total de Horas Gastas</span>
            <div className="text-gray-900 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
              <Clock size={16} />
            </div>
          </div>
          <span className="text-xl font-bold font-title text-gray-900">{stats.totalHours.toFixed(2).replace('.', ',')}h</span>
          <span className="text-[10px] text-yellow-600 font-semibold cursor-pointer flex items-center gap-0.5" onClick={() => onNavigateToTab('timesheet')}>
            Ver no timesheet <ArrowUpRight size={10} />
          </span>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-gray-400">
            <span className="text-[11px] font-bold tracking-wider uppercase">Clientes com Atividade</span>
            <div className="text-gray-900 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
              <Users size={16} />
            </div>
          </div>
          <span className="text-xl font-bold font-title text-gray-900">{stats.activeClientsCount}</span>
          <span className="text-[10px] text-yellow-600 font-semibold cursor-pointer flex items-center gap-0.5" onClick={() => onNavigateToTab('clients')}>
            Gerenciar clientes <ArrowUpRight size={10} />
          </span>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-gray-400">
            <span className="text-[11px] font-bold tracking-wider uppercase">Jobs Faturáveis</span>
            <div className="text-gray-900 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
              <TrendingUp size={16} />
            </div>
          </div>
          <span className="text-xl font-bold font-title text-gray-900">{stats.completedDemandsCount}</span>
          <span className="text-[10px] text-gray-400 font-medium">Lançamentos únicos faturáveis</span>
        </div>

      </div>

      {/* 3. GRÁFICO EM COLUNA INTEIRA (100% WIDTH) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col gap-5">
        
        {/* Cabeçalho do Gráfico e Controles de Visualização */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-yellow-600" />
              <h3 className="font-title text-base font-bold text-gray-900">Distribuição e Desempenho por Cliente</h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Comparativo visual em coluna única do esforço técnico dedicado e receita gerada por conta.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Seletor de Métrica: Horas vs Faturamento */}
            <div className="inline-flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setChartMetric('hours')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  chartMetric === 'hours'
                    ? 'bg-white text-gray-900 font-bold shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Horas Gastas (h)
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('billing')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  chartMetric === 'billing'
                    ? 'bg-white text-gray-900 font-bold shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Faturamento (R$)
              </button>
            </div>

            {/* Formato: Colunas vs Barras */}
            <div className="inline-flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setChartViewType('columns')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  chartViewType === 'columns'
                    ? 'bg-white text-gray-900 font-bold shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                title="Gráfico de Colunas Verticais"
              >
                Colunas
              </button>
              <button
                type="button"
                onClick={() => setChartViewType('bars')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  chartViewType === 'bars'
                    ? 'bg-white text-gray-900 font-bold shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                title="Gráfico de Barras Horizontais"
              >
                Barras
              </button>
            </div>
          </div>
        </div>

        {/* Resumo Rápido de Indicadores do Gráfico */}
        {clientChartData.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50/70 p-3 rounded-xl border border-gray-100 text-xs">
            <div>
              <span className="text-[10px] text-gray-400 font-semibold uppercase block">Maior Demandante</span>
              <span className="font-bold text-gray-900 truncate block" title={topDemander?.name}>
                {topDemander?.name || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-semibold uppercase block">Pico de Horas</span>
              <span className="font-bold text-gray-900">
                {topDemander ? `${topDemander.totalHours.toFixed(1).replace('.', ',')}h` : '0h'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-semibold uppercase block">Média por Cliente</span>
              <span className="font-bold text-gray-900">
                {(stats.totalHours / (clientChartData.length || 1)).toFixed(1).replace('.', ',')}h
              </span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-semibold uppercase block">Faturamento Médio</span>
              <span className="font-bold text-yellow-600">
                {formatCurrency(stats.estimatedBilling / (clientChartData.length || 1))}
              </span>
            </div>
          </div>
        )}

        {/* Área do Gráfico */}
        {clientChartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
            <Clock className="text-gray-300" size={36} />
            <p className="text-sm font-semibold text-gray-700">Nenhum consumo ou faturamento registrado neste período</p>
            <p className="text-xs text-gray-400 max-w-md">
              Não encontramos lançamentos para o período de {periodLabel}. Selecione outro período no menu acima para analisar dados históricos.
            </p>
          </div>
        ) : chartViewType === 'columns' ? (
          /* MODO COLUNAS VERTICAIS */
          <div className="flex flex-col gap-3">
            {/* Legenda */}
            {chartMetric === 'hours' && (
              <div className="flex items-center gap-4 text-[11px] text-gray-600 self-end">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-yellow-500" />
                  <span>Horas Faturáveis</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-gray-400" />
                  <span>Horas Internas</span>
                </div>
              </div>
            )}

            {/* Gráfico de Colunas com scroll horizontal responsivo se houver muitos clientes */}
            <div className="w-full overflow-x-auto pb-2">
              <div className="min-w-[640px] h-[270px] pt-8 pb-10 px-4 flex items-end justify-between gap-4 border-b border-gray-200 relative">
                {/* Linhas de grade horizontais de referência (25%, 50%, 75%, 100%) */}
                <div className="absolute inset-0 pt-8 pb-10 flex flex-col justify-between pointer-events-none opacity-40">
                  <div className="border-b border-dashed border-gray-200 w-full" />
                  <div className="border-b border-dashed border-gray-200 w-full" />
                  <div className="border-b border-dashed border-gray-200 w-full" />
                  <div className="border-b border-dashed border-gray-200 w-full" />
                </div>

                {clientChartData.map(client => {
                  const val = chartMetric === 'hours' ? client.totalHours : client.billing;
                  const maxVal = chartMetric === 'hours' ? maxChartHours : maxChartBilling;
                  const heightPercent = Math.max(8, Math.round((val / (maxVal || 1)) * 100));

                  const billableRatio = client.totalHours > 0 ? (client.billableHours / client.totalHours) : 1;
                  const nonBillableRatio = 1 - billableRatio;

                  return (
                    <div 
                      key={client.id} 
                      className="flex-1 flex flex-col items-center h-full justify-end group relative min-w-[48px] max-w-[90px] z-10"
                    >
                      {/* Tooltip no Hover */}
                      <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[11px] rounded-lg py-1 px-2.5 shadow-lg pointer-events-none whitespace-nowrap z-30 font-medium">
                        <div className="font-bold">{client.name}</div>
                        {chartMetric === 'hours' ? (
                          <div>{client.totalHours.toFixed(1)}h ({client.billableHours.toFixed(1)}h fat. / {client.nonBillableHours.toFixed(1)}h int.)</div>
                        ) : (
                          <div>{formatCurrency(client.billing)}</div>
                        )}
                      </div>

                      {/* Rótulo superior com valor */}
                      <span className="text-[10px] font-bold text-gray-700 mb-1.5 group-hover:text-yellow-600 transition-colors">
                        {chartMetric === 'hours' ? `${client.totalHours.toFixed(1)}h` : formatCurrency(client.billing)}
                      </span>

                      {/* Coluna / Barra */}
                      <div 
                        className="w-full rounded-t-lg overflow-hidden flex flex-col justify-end transition-all duration-300 group-hover:brightness-95 group-hover:scale-y-[1.02] origin-bottom shadow-xs cursor-pointer"
                        style={{ height: `${heightPercent}%` }}
                      >
                        {chartMetric === 'hours' ? (
                          <>
                            {client.nonBillableHours > 0 && (
                              <div 
                                className="w-full bg-gray-400 transition-all"
                                style={{ height: `${nonBillableRatio * 100}%` }}
                                title={`Internas: ${client.nonBillableHours.toFixed(1)}h`}
                              />
                            )}
                            {client.billableHours > 0 && (
                              <div 
                                className="w-full bg-yellow-500 transition-all"
                                style={{ height: `${billableRatio * 100}%` }}
                                title={`Faturáveis: ${client.billableHours.toFixed(1)}h`}
                              />
                            )}
                            {client.totalHours === 0 && (
                              <div className="w-full h-full bg-gray-200" />
                            )}
                          </>
                        ) : (
                          <div 
                            className="w-full h-full bg-gradient-to-t from-yellow-500 to-amber-400" 
                          />
                        )}
                      </div>

                      {/* Nome do Cliente no Eixo X */}
                      <div className="absolute -bottom-7 w-full text-center">
                        <span 
                          className="text-[11px] font-semibold text-gray-600 truncate block group-hover:text-gray-950 transition-colors"
                          title={client.name}
                        >
                          {client.name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* MODO BARRAS HORIZONTAIS */
          <div className="flex flex-col gap-3">
            {clientChartData.map((client, index) => {
              const val = chartMetric === 'hours' ? client.totalHours : client.billing;
              const maxVal = chartMetric === 'hours' ? maxChartHours : maxChartBilling;
              const widthPercent = Math.max(3, Math.round((val / (maxVal || 1)) * 100));

              return (
                <div key={client.id} className="flex items-center gap-3 text-xs group">
                  {/* Rank e Nome */}
                  <div className="w-36 sm:w-48 shrink-0 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 w-4">#{index + 1}</span>
                    <span className="font-semibold text-gray-900 truncate" title={client.name}>
                      {client.name}
                    </span>
                  </div>

                  {/* Barra de Progresso */}
                  <div className="flex-1 bg-gray-100 h-6 rounded-lg overflow-hidden flex items-center p-0.5 border border-gray-150">
                    <div
                      className={`h-full rounded-md transition-all duration-500 flex items-center justify-end px-2 ${
                        chartMetric === 'hours' 
                          ? 'bg-yellow-500' 
                          : 'bg-gradient-to-r from-amber-400 to-yellow-500'
                      }`}
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>

                  {/* Valor Formatado */}
                  <div className="w-24 text-right shrink-0">
                    <span className="font-bold text-gray-900">
                      {chartMetric === 'hours' ? `${client.totalHours.toFixed(1).replace('.', ',')}h` : formatCurrency(client.billing)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* 4. FATURAMENTO & RETORNO POR CLIENTE (100% WIDTH) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col gap-4">
        
        {/* Cabeçalho da Lista e Barra de Busca */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-title text-base font-bold text-gray-900">Faturamento & Retorno por Cliente</h3>
              <span className="bg-gray-100 text-gray-600 text-[11px] font-bold px-2 py-0.5 rounded-full">
                {filteredProfitabilityList.length} {filteredProfitabilityList.length === 1 ? 'cliente' : 'clientes'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Exibindo apenas clientes ativos no sistema ou que geraram consumo de horas neste período.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por cliente..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-yellow-500 focus:bg-white transition-all font-medium"
            />
          </div>
        </div>

        {/* Lista de Clientes Elegíveis */}
        <div className="flex flex-col gap-3">
          {filteredProfitabilityList.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center font-medium">
              {clientSearch 
                ? 'Nenhum cliente encontrado com este nome.' 
                : 'Nenhum cliente ativo ou com horas no período selecionado.'}
            </p>
          ) : (
            filteredProfitabilityList.map(c => {
              const styles = getProfitabilityStyles(c.status);
              const rateText = c.effectiveRate === Infinity 
                ? 'Retorno Máximo' 
                : c.totalHoursSpent === 0 
                  ? 'Sem horas'
                  : `${formatCurrency(c.effectiveRate)}/h`;
              
              const isExpanded = expandedClientId === c.clientId;
              
              const clientObj = (clients || []).find(cl => cl.id === c.clientId);
              const refHourlyRate = parseFloat(clientObj?.hourlyRate) || 150;
              const refFixedFee = parseFloat(clientObj?.fixedFee) || 0;
              const contractTypeName = clientObj?.contractType === 'fixed' 
                ? 'Fee Fixo' 
                : clientObj?.contractType === 'hybrid' 
                  ? 'Misto (Fixo + Extra)' 
                  : 'Cobrança por Hora';
              
              const effortCost = c.totalHoursSpent * refHourlyRate;
              const profit = c.billing - effortCost;
              
              let advice = "";
              if (c.totalHoursSpent === 0) {
                advice = "Nenhum esforço operacional registrado neste período.";
              } else if (profit < -100) {
                advice = `⚠️ O custo estimado de esforço (${formatCurrency(effortCost)}) superou o faturamento deste período. Recomenda-se renegociar o valor do contrato ou alinhar limites de escopo.`;
              } else if (profit > 200) {
                advice = `✅ Retorno operacional altamente rentável. O esforço operacional dedicado está abaixo do valor previsto no contrato.`;
              } else {
                advice = `⚖️ Equilíbrio financeiro e operacional saudável para o período.`;
              }
              
              return (
                <div 
                  key={c.clientId} 
                  className="flex flex-col p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-all gap-3 cursor-pointer select-none bg-white shadow-2xs"
                  onClick={() => setExpandedClientId(isExpanded ? null : c.clientId)}
                >
                  {/* Linha Principal do Cliente */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                    
                    {/* Info do Cliente */}
                    <div className="flex items-center gap-3 min-w-[220px]">
                      <div className="flex items-center justify-center w-9 h-9 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 font-bold font-title text-xs shrink-0">
                        {c.clientName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900 leading-tight">{c.clientName}</span>
                          {!c.isActive && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-gray-100 text-gray-500 rounded border border-gray-200">
                              Inativo
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                            {contractTypeName}
                          </span>
                          {c.billing > 0 && (
                            <>
                              <span className="text-gray-300 text-[10px]">•</span>
                              <div className="w-14 bg-gray-100 h-1.5 rounded-full overflow-hidden border border-gray-200/50">
                                <div 
                                  className="bg-yellow-500 h-full rounded-full transition-all duration-700"
                                  style={{ width: `${Math.min(100, (c.billing / (Math.max(...profitabilityList.map(item => item.billing)) || 1)) * 100)}%` }}
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Previsão de Faturamento */}
                    <div className="text-left sm:text-right sm:ml-auto">
                      <div className="text-sm font-black text-yellow-600">
                        {formatCurrency(c.billing)}
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {c.variableBilling > 0 
                          ? `${formatCurrency(c.fixedBilling)} fixo + ${formatCurrency(c.variableBilling)} extra` 
                          : 'Faturamento previsto'}
                      </span>
                    </div>

                    {/* Horas Gastas */}
                    <div className="text-left sm:text-right">
                      <div className="text-xs font-bold text-gray-700">
                        {c.totalHoursSpent.toFixed(2).replace('.', ',')}h gastas
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {c.billableHours.toFixed(1).replace('.', ',')}h fat. • {c.nonBillableHours.toFixed(1).replace('.', ',')}h int.
                      </div>
                    </div>

                    {/* Taxa Efetiva & Badge de Status */}
                    <div className="flex items-center gap-3 sm:justify-end">
                      <div className="text-left sm:text-right">
                        <div className="text-xs font-bold text-gray-900">{rateText}</div>
                        <span className="text-[10px] text-gray-400 font-medium">Taxa Efetiva</span>
                      </div>
                      <div className={`flex items-center gap-1.5 border px-2.5 py-1 rounded-full text-[11px] font-semibold ${styles.bg}`}>
                        {styles.icon}
                        <span>{c.statusLabel}</span>
                      </div>
                      {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>

                  </div>

                  {/* Painel Expandido com Detalhes Analíticos */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 pt-3 mt-1 flex flex-col gap-3 text-xs text-gray-600 bg-gray-50/50 p-3.5 rounded-xl animate-in fade-in-0" onClick={(e) => e.stopPropagation()}>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Divisão de Esforço</span>
                          <div className="flex flex-col gap-0.5 text-gray-700">
                            <p>Horas Faturáveis: <strong className="text-gray-900">{c.billableHours.toFixed(2).replace('.', ',')}h</strong></p>
                            <p>Horas Internas: <strong className="text-gray-900">{c.nonBillableHours.toFixed(2).replace('.', ',')}h</strong></p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Valores de Contrato</span>
                          <div className="flex flex-col gap-0.5 text-gray-700">
                            {clientObj?.contractType !== 'hourly' && (
                              <p>Fee Fixo Mensal: <strong className="text-gray-900">{formatCurrency(refFixedFee)}</strong></p>
                            )}
                            <p>Taxa Hora Referência: <strong className="text-gray-900">{formatCurrency(refHourlyRate)}/h</strong></p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Análise de Lucratividade</span>
                          <div className="flex flex-col gap-0.5 text-gray-700">
                            <p>Faturamento Real: <strong className="text-gray-900">{formatCurrency(c.billing)}</strong></p>
                            <p>Custo Estimado de Esforço: <strong className="text-gray-900">{formatCurrency(effortCost)}</strong></p>
                            <p>
                              Retorno Líquido: {' '}
                              <strong className={profit >= 0 ? "text-green-600" : "text-red-600"}>
                                {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                              </strong>
                            </p>
                          </div>
                        </div>

                      </div>

                      <div className="border-t border-gray-200 pt-2 text-[11px] font-medium text-gray-500 italic leading-relaxed">
                        {advice}
                      </div>

                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
