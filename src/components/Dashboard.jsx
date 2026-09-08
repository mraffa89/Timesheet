import React, { useState, useMemo } from 'react';
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
  Activity,
  ArrowUpDown,
  ArrowDown,
  ArrowUp
} from 'lucide-react';

export default function Dashboard({ entries = [], clients = [], onNavigateToTab }) {
  // 1. Filtro de Período exclusivo ('current_month', 'prev_month', 'select_month')
  const [periodFilter, setPeriodFilter] = useState('current_month');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  // 2. Ordenação Global (Gráfico + Tabela)
  const [sortBy, setSortBy] = useState('hours'); // 'hours' | 'billing'
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' | 'asc'

  // 3. Hover no Gráfico e Pesquisa de Clientes
  const [hoveredClientChart, setHoveredClientChart] = useState(null);
  const [clientSearch, setClientSearch] = useState('');
  const [expandedClientId, setExpandedClientId] = useState(null);

  // Helper para normalizar formatos de datas para YYYY-MM-DD
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

  // Helper para extrair iniciais limpas de um cliente (ex: Colégio Pedro e Rafael -> CP, Brasilis -> BR)
  const getClientInitials = (name) => {
    if (!name) return 'CL';
    const clean = name.trim().replace(/[^\w\sÀ-ú]/gi, '');
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
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

  // Intervalo de datas do período ativo (Apenas Mês Atual, Mês Anterior ou Selecionar Mês)
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

    // 'select_month'
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
  }, [periodFilter, selectedMonth]);

  // Filtra lançamentos dentro do período ativo
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

  // 3. Cálculo do Histórico Médio de Consumo de Horas por Cliente
  const clientHistoricalStats = useMemo(() => {
    const map = {};
    (entries || []).forEach(e => {
      if (!e.clientId) return;
      const cid = e.clientId;
      if (!map[cid]) {
        map[cid] = {
          totalHours: 0,
          monthsSet: new Set()
        };
      }
      const h = parseFloat(e.hours) || 0;
      map[cid].totalHours += h;

      const raw = e.deliveryDate || e.requestDate;
      if (raw) {
        const iso = normalizeDateStr(raw);
        if (iso && iso.length >= 7) {
          map[cid].monthsSet.add(iso.slice(0, 7));
        }
      }
    });

    const result = {};
    Object.keys(map).forEach(cid => {
      const total = map[cid].totalHours;
      const countMonths = Math.max(1, map[cid].monthsSet.size);
      result[cid] = {
        totalHistoricalHours: total,
        monthsCount: countMonths,
        averageMonthlyHours: total / countMonths
      };
    });

    return result;
  }, [entries]);

  // 4. Consolidação: Métricas do Período, Faturamento (Fixo + Extra) e Ordenação
  const {
    stats,
    profitabilityList,
    clientChartData
  } = useMemo(() => {
    // Horas totais do período
    const totalHours = filteredEntries.reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0);

    // Jobs únicos faturáveis
    const billableEntries = filteredEntries.filter(e => e.billable);
    const uniqueBillableDemands = new Set(
      billableEntries.map(e => (e.description || '').trim().toLowerCase())
    );
    const extraJobsCount = uniqueBillableDemands.size;

    // Horas por cliente no período
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

      // Somente clientes ativos ou com horas consumidas no período
      const isClientActive = client.isActive !== false;
      const hasConsumedHours = total > 0;

      if (!isClientActive && !hasConsumedHours) {
        return;
      }

      let fixedBillingForClient = 0;
      let variableBillingForClient = 0;

      const hourlyRate = parseFloat(client.hourlyRate) || 150;
      const fixedFee = parseFloat(client.fixedFee) || 0;

      if (client.contractType === 'fixed') {
        fixedBillingForClient = fixedFee;
      } else if (client.contractType === 'hourly') {
        variableBillingForClient = billable * hourlyRate;
      } else if (client.contractType === 'hybrid') {
        // Misto: Soma Fixo + Faturamento Extra dos jobs
        fixedBillingForClient = fixedFee;
        variableBillingForClient = billable * hourlyRate;
      }

      const billingForClient = fixedBillingForClient + variableBillingForClient;
      totalFixedBilling += fixedBillingForClient;
      totalVariableBilling += variableBillingForClient;

      // Cálculo de Rentabilidade
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

      const hist = clientHistoricalStats[client.id] || {
        totalHistoricalHours: total,
        monthsCount: 1,
        averageMonthlyHours: total
      };

      profitabilityData.push({
        clientId: client.id,
        clientName: client.name,
        initials: getClientInitials(client.name),
        isActive: isClientActive,
        contractType: client.contractType,
        fixedFee,
        hourlyRate,
        totalHoursSpent: total,
        billableHours: billable,
        nonBillableHours: clientHours.nonBillableHours,
        billing: billingForClient,
        fixedBilling: fixedBillingForClient,
        variableBilling: variableBillingForClient,
        effectiveRate,
        status: profitStatus,
        statusLabel,
        historicalAvgHours: hist.averageMonthlyHours,
        totalHistoricalHours: hist.totalHistoricalHours,
        historicalMonthsCount: hist.monthsCount
      });
    });

    // APLICAÇÃO DA ORDENAÇÃO DINÂMICA (Solicitada: Por Quantidade de Horas ou Faturamento, Crescente/Decrescente)
    profitabilityData.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'hours') {
        diff = a.totalHoursSpent - b.totalHoursSpent;
        if (diff === 0) diff = a.billing - b.billing;
      } else {
        diff = a.billing - b.billing;
        if (diff === 0) diff = a.totalHoursSpent - b.totalHoursSpent;
      }
      return sortOrder === 'desc' ? -diff : diff;
    });

    // Gráfico segue rigorosamente a mesma ordenação
    const chartData = profitabilityData
      .filter(item => item.totalHoursSpent > 0 || item.historicalAvgHours > 0 || item.billing > 0)
      .map(item => ({
        id: item.clientId,
        name: item.clientName,
        initials: item.initials,
        totalHours: item.totalHoursSpent,
        billableHours: item.billableHours,
        nonBillableHours: item.nonBillableHours,
        billing: item.billing,
        fixedBilling: item.fixedBilling,
        variableBilling: item.variableBilling,
        contractType: item.contractType,
        status: item.status,
        historicalAvgHours: item.historicalAvgHours,
        totalHistoricalHours: item.totalHistoricalHours,
        historicalMonthsCount: item.historicalMonthsCount
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
  }, [filteredEntries, clients, clientHistoricalStats, sortBy, sortOrder]);

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

  // Filtragem por busca textual
  const filteredProfitabilityList = useMemo(() => {
    if (!clientSearch.trim()) return profitabilityList;
    const term = clientSearch.toLowerCase().trim();
    return profitabilityList.filter(c => c.clientName.toLowerCase().includes(term));
  }, [profitabilityList, clientSearch]);

  // Escala Máxima do Gráfico
  const chartMaxHours = useMemo(() => {
    if (clientChartData.length === 0) return 10;
    const maxVal = Math.max(
      ...clientChartData.map(d => Math.max(d.totalHours, d.historicalAvgHours || 0)),
      5
    );
    return Math.ceil(maxVal * 1.15);
  }, [clientChartData]);

  const periodAverageHours = useMemo(() => {
    if (clientChartData.length === 0) return 0;
    return stats.totalHours / clientChartData.length;
  }, [stats.totalHours, clientChartData.length]);

  const topDemander = useMemo(() => {
    if (clientChartData.length === 0) return null;
    return [...clientChartData].sort((a, b) => b.totalHours - a.totalHours)[0];
  }, [clientChartData]);

  // Layout 100% Responsivo Sem Barra de Rolagem (viewBox fixo de 1000 unidades)
  const svgViewBoxWidth = 1000;
  const svgViewBoxHeight = 280;
  const plotPaddingLeft = 45;
  const plotPaddingRight = 35;
  const plotPaddingTop = 32;
  const plotPaddingBottom = 45;
  const plotWidth = svgViewBoxWidth - plotPaddingLeft - plotPaddingRight;
  const plotHeight = svgViewBoxHeight - plotPaddingTop - plotPaddingBottom;

  // Cálculo das Coordenadas (Colunas com Iniciais + Linha Média)
  const chartCoordinates = useMemo(() => {
    if (clientChartData.length === 0) return [];
    const count = clientChartData.length;
    const step = plotWidth / count;
    // Largura proporcional e estreitada para caber confortavelmente sem rolagem
    const colW = Math.max(14, Math.min(44, step * 0.52));

    return clientChartData.map((client, i) => {
      const centerX = plotPaddingLeft + (i + 0.5) * step;
      
      const colHeight = (client.totalHours / chartMaxHours) * plotHeight;
      const colY = plotPaddingTop + (plotHeight - colHeight);

      const billableRatio = client.totalHours > 0 ? (client.billableHours / client.totalHours) : 0;
      const billableH = colHeight * billableRatio;
      const nonBillableH = colHeight - billableH;

      const lineAvgY = plotPaddingTop + (plotHeight - ((client.historicalAvgHours || 0) / chartMaxHours) * plotHeight);

      return {
        client,
        centerX,
        colW,
        colHeight,
        colY,
        billableH,
        nonBillableH,
        lineAvgY
      };
    });
  }, [clientChartData, plotWidth, plotHeight, chartMaxHours]);

  const averageLinePolyline = useMemo(() => {
    return chartCoordinates.map(c => `${c.centerX},${c.lineAvgY}`).join(' ');
  }, [chartCoordinates]);

  const periodAvgLineY = plotPaddingTop + (plotHeight - (periodAverageHours / chartMaxHours) * plotHeight);

  return (
    <div className="flex flex-col gap-6">
      
      {/* 1. Cabeçalho com Título, Filtro de Período e Barra de Ordenação */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="font-title text-2xl font-bold text-gray-900">Visão Geral</h1>
            <p className="text-sm text-gray-500">Métricas consolidadas de faturamento, esforço e rentabilidade por cliente.</p>
          </div>
        </div>

        {/* Barra Unificada de Filtro de Período e Ordenação */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
          
          {/* Período: Mês Atual, Mês Anterior, Selecionar Mês */}
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gray-50 text-gray-700 rounded-xl border border-gray-200">
                <Calendar size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Período</span>
                <span className="text-sm font-bold text-gray-900">{periodLabel}</span>
              </div>
            </div>

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
            </div>

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
          </div>

          {/* CONTROLE DE ORDENAÇÃO (Gráfico + Tabela) */}
          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto xl:justify-end border-t xl:border-t-0 pt-3 xl:pt-0 border-gray-100">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold mr-1">
              <ArrowUpDown size={14} className="text-gray-400" />
              <span>Ordenar por:</span>
            </div>

            {/* Métrica de Ordenação: Horas vs Faturamento */}
            <div className="inline-flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSortBy('hours')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  sortBy === 'hours'
                    ? 'bg-white text-gray-950 font-bold shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Horas Gastas
              </button>
              <button
                type="button"
                onClick={() => setSortBy('billing')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  sortBy === 'billing'
                    ? 'bg-white text-gray-950 font-bold shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Faturamento (R$)
              </button>
            </div>

            {/* Direção: Crescente ou Decrescente */}
            <button
              type="button"
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              title={sortOrder === 'desc' ? 'Ordenação Decrescente (Maior primeiro)' : 'Ordenação Crescente (Menor primeiro)'}
            >
              {sortOrder === 'desc' ? (
                <>
                  <ArrowDown size={13} className="text-yellow-600" />
                  <span>Decrescente</span>
                </>
              ) : (
                <>
                  <ArrowUp size={13} className="text-yellow-600" />
                  <span>Crescente</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* 2. Cartões de Métricas */}
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

      {/* 3. GRÁFICO EXCLUSIVO DE COLUNAS (COM INICIAIS, SEM ROLAGEM, LINHA MÉDIA HISTÓRICA) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col gap-4">
        
        {/* Cabeçalho do Gráfico e Legenda */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-yellow-600" />
              <h3 className="font-title text-base font-bold text-gray-900">
                Consumo de Horas vs. Histórico Médio por Cliente
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Ordenado por <strong>{sortBy === 'hours' ? 'horas gastas' : 'faturamento'}</strong> ({sortOrder === 'desc' ? 'maior para menor' : 'menor para maior'}). As iniciais na base identificam cada conta.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-150">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-yellow-500" />
              <span className="font-medium text-[11px]">Horas Faturáveis</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-gray-400" />
              <span className="font-medium text-[11px]">Horas Internas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-1 bg-indigo-600 rounded-full flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-white ring-1 ring-indigo-600" />
              </div>
              <span className="font-bold text-indigo-700 text-[11px]">Média Histórica</span>
            </div>
            <div className="flex items-center gap-1.5 border-l border-gray-200 pl-2">
              <div className="w-3 h-0 border-b border-dashed border-gray-400" />
              <span className="text-gray-500 text-[11px]">Média do Mês: <strong>{periodAverageHours.toFixed(1).replace('.', ',')}h</strong></span>
            </div>
          </div>
        </div>

        {/* Resumo Rápido */}
        {clientChartData.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50/70 p-3 rounded-xl border border-gray-100 text-xs">
            <div>
              <span className="text-[10px] text-gray-400 font-semibold uppercase block">Maior Demandante</span>
              <span className="font-bold text-gray-900 truncate block" title={topDemander?.name}>
                {topDemander ? `${topDemander.name} (${topDemander.initials})` : 'N/A'}
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
                {periodAverageHours.toFixed(1).replace('.', ',')}h
              </span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-semibold uppercase block">Histórico Consolidado</span>
              <span className="font-bold text-indigo-700 flex items-center gap-1">
                <Activity size={12} />
                {(Object.values(clientHistoricalStats).reduce((sum, h) => sum + h.totalHistoricalHours, 0)).toFixed(0)}h totais
              </span>
            </div>
          </div>
        )}

        {/* ÁREA DO GRÁFICO 100% RESPONSIVA (SEM BARRA DE ROLAGEM) */}
        {clientChartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
            <Clock className="text-gray-300" size={36} />
            <p className="text-sm font-semibold text-gray-700">Nenhum consumo registrado para {periodLabel}</p>
            <p className="text-xs text-gray-400 max-w-md">
              Altere o filtro no menu superior para visualizar períodos com lançamentos ativos.
            </p>
          </div>
        ) : (
          <div className="relative w-full overflow-hidden">
            
            {/* Popover no Hover */}
            {hoveredClientChart && (
              <div 
                className="absolute z-30 bg-gray-950 text-white rounded-xl p-3 shadow-xl pointer-events-none text-xs flex flex-col gap-1 border border-gray-800 animate-in fade-in-0 -translate-x-1/2"
                style={{
                  left: `${(hoveredClientChart.centerX / svgViewBoxWidth) * 100}%`,
                  top: '10px'
                }}
              >
                <div className="font-bold text-sm text-yellow-400">
                  {hoveredClientChart.client.name} ({hoveredClientChart.client.initials})
                </div>
                <div className="flex items-center justify-between gap-4 text-gray-300">
                  <span>Horas no Período:</span>
                  <strong className="text-white">{hoveredClientChart.client.totalHours.toFixed(1).replace('.', ',')}h</strong>
                </div>
                <div className="text-[10px] text-gray-400 pl-2 border-l border-gray-700">
                  {hoveredClientChart.client.billableHours.toFixed(1).replace('.', ',')}h faturáveis • {hoveredClientChart.client.nonBillableHours.toFixed(1).replace('.', ',')}h internas
                </div>
                <div className="flex items-center justify-between gap-4 text-yellow-500 font-semibold border-t border-gray-800 pt-1 mt-0.5">
                  <span>Faturamento:</span>
                  <span>{formatCurrency(hoveredClientChart.client.billing)}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-indigo-300">
                  <span>Média Histórica:</span>
                  <strong className="text-indigo-400">{hoveredClientChart.client.historicalAvgHours.toFixed(1).replace('.', ',')}h/mês</strong>
                </div>
                <div className="text-[10px] text-gray-400">
                  Total histórico: {hoveredClientChart.client.totalHistoricalHours.toFixed(1).replace('.', ',')}h ({hoveredClientChart.client.historicalMonthsCount} {hoveredClientChart.client.historicalMonthsCount === 1 ? 'mês' : 'meses'})
                </div>
              </div>
            )}

            {/* SVG Responsivo com viewBox - Ajuste 100% sem Scrollbar */}
            <svg 
              viewBox={`0 0 ${svgViewBoxWidth} ${svgViewBoxHeight}`}
              className="w-full h-auto overflow-visible select-none"
            >
              {/* Linhas de Grade e Escala Y */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = plotPaddingTop + plotHeight - (ratio * plotHeight);
                const val = Math.round(ratio * chartMaxHours);
                return (
                  <g key={ratio}>
                    <line 
                      x1={plotPaddingLeft} 
                      y1={y} 
                      x2={svgViewBoxWidth - plotPaddingRight} 
                      y2={y} 
                      stroke="#f1f5f9" 
                      strokeWidth="1.5" 
                      strokeDasharray={ratio === 0 ? "none" : "3 3"} 
                    />
                    <text 
                      x={plotPaddingLeft - 8} 
                      y={y + 3.5} 
                      textAnchor="end" 
                      fontSize="10" 
                      fill="#94a3b8" 
                      fontWeight="600"
                    >
                      {val}h
                    </text>
                  </g>
                );
              })}

              {/* Linha Média Geral do Período */}
              {periodAverageHours > 0 && (
                <g>
                  <line 
                    x1={plotPaddingLeft} 
                    y1={periodAvgLineY} 
                    x2={svgViewBoxWidth - plotPaddingRight} 
                    y2={periodAvgLineY} 
                    stroke="#94a3b8" 
                    strokeWidth="1.5" 
                    strokeDasharray="4 4" 
                  />
                  <text 
                    x={svgViewBoxWidth - plotPaddingRight} 
                    y={periodAvgLineY - 5} 
                    textAnchor="end" 
                    fontSize="9" 
                    fill="#64748b" 
                    fontWeight="bold"
                  >
                    Média: {periodAverageHours.toFixed(1).replace('.', ',')}h
                  </text>
                </g>
              )}

              {/* COLUNAS DE HORAS COM INICIAIS NO EIXO X */}
              {chartCoordinates.map((coord) => {
                const isHovered = hoveredClientChart?.client.id === coord.client.id;

                return (
                  <g 
                    key={coord.client.id}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredClientChart(coord)}
                    onMouseLeave={() => setHoveredClientChart(null)}
                  >
                    {/* Barra Não-Faturável (Cinza) */}
                    {coord.nonBillableH > 0 && (
                      <rect 
                        x={coord.centerX - coord.colW / 2} 
                        y={coord.colY + coord.billableH} 
                        width={coord.colW} 
                        height={coord.nonBillableH} 
                        fill={isHovered ? "#64748b" : "#94a3b8"} 
                        rx="3"
                        className="transition-colors duration-200"
                      />
                    )}

                    {/* Barra Faturável (Amarelo Ouro) */}
                    {coord.billableH > 0 && (
                      <rect 
                        x={coord.centerX - coord.colW / 2} 
                        y={coord.colY} 
                        width={coord.colW} 
                        height={coord.billableH} 
                        fill={isHovered ? "#d97706" : "#eab308"} 
                        rx="3"
                        className="transition-colors duration-200"
                      />
                    )}

                    {coord.client.totalHours === 0 && (
                      <line 
                        x1={coord.centerX - coord.colW / 4} 
                        y1={plotPaddingTop + plotHeight - 1} 
                        x2={coord.centerX + coord.colW / 4} 
                        y2={plotPaddingTop + plotHeight - 1} 
                        stroke="#cbd5e1" 
                        strokeWidth="3" 
                        strokeLinecap="round" 
                      />
                    )}

                    {/* Valor de Horas no Topo */}
                    <text 
                      x={coord.centerX} 
                      y={Math.max(plotPaddingTop - 6, coord.colY - 6)} 
                      textAnchor="middle" 
                      fontSize="10" 
                      fill={isHovered ? "#b45309" : "#334155"} 
                      fontWeight="bold"
                    >
                      {coord.client.totalHours > 0 ? `${coord.client.totalHours.toFixed(1).replace('.', ',')}h` : '0h'}
                    </text>

                    {/* INICIAIS DO CLIENTE NO EIXO X (Solicitado: CO, BL, DA, etc.) */}
                    <text 
                      x={coord.centerX} 
                      y={plotPaddingTop + plotHeight + 18} 
                      textAnchor="middle" 
                      fontSize="11" 
                      fill={isHovered ? "#0f172a" : "#475569"} 
                      fontWeight="bold"
                      className="transition-colors font-title"
                    >
                      {coord.client.initials}
                    </text>
                  </g>
                );
              })}

              {/* LINHA MÉDIA HISTÓRICA DO CLIENTE (Traçado Índigo + Marcadores) */}
              {chartCoordinates.length > 0 && (
                <g>
                  <polyline 
                    points={averageLinePolyline} 
                    fill="none" 
                    stroke="#4f46e5" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                  />

                  {chartCoordinates.map((coord) => {
                    const isHovered = hoveredClientChart?.client.id === coord.client.id;
                    return (
                      <circle 
                        key={`pt-${coord.client.id}`}
                        cx={coord.centerX} 
                        cy={coord.lineAvgY} 
                        r={isHovered ? "6" : "4"} 
                        fill="#ffffff" 
                        stroke="#4f46e5" 
                        strokeWidth={isHovered ? "3.5" : "2.5"} 
                        className="transition-all duration-200 cursor-pointer"
                        onMouseEnter={() => setHoveredClientChart(coord)}
                        onMouseLeave={() => setHoveredClientChart(null)}
                      />
                    );
                  })}
                </g>
              )}
            </svg>
          </div>
        )}

      </div>

      {/* 4. FATURAMENTO & RETORNO POR CLIENTE (100% WIDTH, ORDENADA DINAMICAMENTE) */}
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
              Ordenado por <strong>{sortBy === 'hours' ? 'horas gastas' : 'faturamento'}</strong> ({sortOrder === 'desc' ? 'maior para menor' : 'menor para maior'}). Soma completa de fee fixo + jobs extras.
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

        {/* Lista de Clientes */}
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
                    
                    {/* Info do Cliente com Iniciais e Nome */}
                    <div className="flex items-center gap-3 min-w-[220px]">
                      <div className="flex items-center justify-center w-9 h-9 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 font-bold font-title text-xs shrink-0">
                        {c.initials}
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

                    {/* Previsão de Faturamento Total (Fixo + Extra) */}
                    <div className="text-left sm:text-right sm:ml-auto">
                      <div className="text-sm font-black text-yellow-600">
                        {formatCurrency(c.billing)}
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {c.variableBilling > 0 && c.fixedBilling > 0 
                          ? `${formatCurrency(c.fixedBilling)} fixo + ${formatCurrency(c.variableBilling)} extra` 
                          : c.variableBilling > 0
                            ? `${formatCurrency(c.variableBilling)} faturável`
                            : c.fixedBilling > 0
                              ? `${formatCurrency(c.fixedBilling)} fee fixo`
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
                            <p className="text-[10px] text-indigo-600 font-semibold mt-1">
                              Média Histórica: {c.historicalAvgHours.toFixed(1).replace('.', ',')}h/mês
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Valores de Contrato</span>
                          <div className="flex flex-col gap-0.5 text-gray-700">
                            {c.fixedBilling > 0 && (
                              <p>Fee Fixo Mensal: <strong className="text-gray-900">{formatCurrency(refFixedFee)}</strong></p>
                            )}
                            {c.variableBilling > 0 && (
                              <p>Faturamento Extra ({c.billableHours.toFixed(1).replace('.', ',')}h): <strong className="text-yellow-600">{formatCurrency(c.variableBilling)}</strong></p>
                            )}
                            <p>Taxa Hora Referência: <strong className="text-gray-900">{formatCurrency(refHourlyRate)}/h</strong></p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Análise de Lucratividade</span>
                          <div className="flex flex-col gap-0.5 text-gray-700">
                            <p>
                              Faturamento Total: <strong className="text-gray-900">{formatCurrency(c.billing)}</strong>
                            </p>
                            <p>Custo Estimado de Esforço: <strong className="text-gray-900">{formatCurrency(effortCost)}</strong></p>
                            <p>
                              Retorno Líquido Real: {' '}
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
