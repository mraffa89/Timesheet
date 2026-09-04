import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  DollarSign, 
  Users, 
  TrendingUp, 
  AlertCircle, 
  ArrowUpRight, 
  Calendar,
  ThumbsUp,
  ThumbsDown,
  Percent,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function Dashboard({ entries, clients, onNavigateToTab }) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [stats, setStats] = useState({
    totalHours: 0,
    estimatedBilling: 0,
    activeClientsCount: 0,
    completedDemandsCount: 0
  });
  const [clientHoursBreakdown, setClientHoursBreakdown] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [profitabilityList, setProfitabilityList] = useState([]);
  const [expandedClientId, setExpandedClientId] = useState(null);

  const getYearMonth = (dateStr) => {
    if (!dateStr) return '';
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}`;
      } else {
        return `${parts[2]}-${parts[1].padStart(2, '0')}`;
      }
    }
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}`;
      } else {
        return `${parts[0]}-${parts[1].padStart(2, '0')}`;
      }
    }
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
    } catch (e) {}
    return '';
  };

  // Calculate statistics when month, entries, or clients change
  useEffect(() => {
    if (!selectedMonth) return;

    // Filter entries for selected month using deliveryDate or requestDate
    const monthEntries = entries.filter(e => {
      const dateStr = e.deliveryDate || e.requestDate;
      if (!dateStr) return false;
      const yearMonth = getYearMonth(dateStr);
      return yearMonth === selectedMonth;
    });

    // 1. Total hours spent (billable + non-billable)
    const totalHours = monthEntries.reduce((sum, e) => sum + e.hours, 0);

    // 2. Extra Jobs (completed unique billable demands count)
    const billableEntries = monthEntries.filter(e => e.billable);
    const uniqueBillableDemands = new Set(
      billableEntries.map(e => (e.description || '').trim().toLowerCase())
    );
    const extraJobsCount = uniqueBillableDemands.size;

    // Group hours by client: split into billable and non-billable
    const clientStatsMap = {};
    clients.forEach(c => {
      clientStatsMap[c.id] = {
        billableHours: 0,
        nonBillableHours: 0,
        totalHours: 0
      };
    });

    monthEntries.forEach(e => {
      if (clientStatsMap[e.clientId]) {
        if (e.billable) {
          clientStatsMap[e.clientId].billableHours += e.hours;
        } else {
          clientStatsMap[e.clientId].nonBillableHours += e.hours;
        }
        clientStatsMap[e.clientId].totalHours += e.hours;
      }
    });

    let totalFixedBilling = 0;
    let totalVariableBilling = 0;
    const profitabilityData = [];

    clients.forEach(client => {
      const clientHours = clientStatsMap[client.id] || { billableHours: 0, nonBillableHours: 0, totalHours: 0 };
      const billable = clientHours.billableHours;
      const total = clientHours.totalHours;
      
      let fixedBillingForClient = 0;
      let variableBillingForClient = 0;

      if (client.contractType === 'fixed') {
        fixedBillingForClient = client.fixedFee;
      } else if (client.contractType === 'hourly') {
        variableBillingForClient = billable * client.hourlyRate;
      } else if (client.contractType === 'hybrid') {
        fixedBillingForClient = client.fixedFee;
        const extraHours = Math.max(0, billable - client.hoursIncluded);
        variableBillingForClient = extraHours * client.hourlyRate;
      }

      const billingForClient = fixedBillingForClient + variableBillingForClient;
      totalFixedBilling += fixedBillingForClient;
      totalVariableBilling += variableBillingForClient;

      // Calculate Profitability Metrics: Effective Hourly Rate
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
        contractType: client.contractType,
        fixedFee: client.fixedFee,
        hourlyRate: client.hourlyRate,
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

    // Sort profitability list: descending of billing value
    profitabilityData.sort((a, b) => b.billing - a.billing || b.effectiveRate - a.effectiveRate);

    setProfitabilityList(profitabilityData);

    // 4. Client hours breakdown (for donut chart)
    const breakdownColors = [
      '#facc15', // yellow-400
      '#eab308', // yellow-500
      '#ca8a04', // yellow-600
      '#a16207', // yellow-700
      '#78350f', // yellow-900
      '#9ca3af', // gray-400
      '#4b5563', // gray-600
    ];

    const breakdown = clients.map((c, idx) => {
      const hours = (clientStatsMap[c.id] && clientStatsMap[c.id].totalHours) || 0;
      return {
        id: c.id,
        name: c.name,
        hours,
        color: breakdownColors[idx % breakdownColors.length]
      };
    }).filter(item => item.hours > 0);

    breakdown.sort((a, b) => b.hours - a.hours);
    setClientHoursBreakdown(breakdown);

    // Set stats state
    setStats({
      totalHours,
      estimatedBilling: totalFixedBilling + totalVariableBilling,
      variableBilling: totalVariableBilling,
      activeClientsCount: clients.length,
      completedDemandsCount: extraJobsCount
    });

  }, [selectedMonth, entries, clients]);

  const getUniqueMonths = () => {
    const months = new Set();
    entries.forEach(e => {
      const dateStr = e.deliveryDate || e.requestDate;
      if (dateStr) {
        const ym = getYearMonth(dateStr);
        if (ym) {
          months.add(ym);
        }
      }
    });
    return Array.from(months).sort().reverse();
  };

  // Sincroniza o mês selecionado exclusivamente com os meses presentes nos CSVs importados
  useEffect(() => {
    const available = getUniqueMonths();
    if (available.length > 0) {
      if (!selectedMonth || !available.includes(selectedMonth)) {
        setSelectedMonth(available[0]);
      }
    } else {
      setSelectedMonth('');
    }
  }, [entries]);

  const getMonthNamePT = (monthKey) => {
    if (!monthKey) return '';
    const [year, month] = monthKey.split('-');
    const date = new Date(year, parseInt(month) - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getProfitabilityStyles = (status) => {
    switch (status) {
      case 'excellent':
        return { bg: 'bg-green-50 border-green-200 text-green-700', icon: <CheckCircle2 className="text-green-600" size={14} /> };
      case 'good':
        return { bg: 'bg-blue-50 border-blue-200 text-blue-700', icon: <CheckCircle2 className="text-blue-600" size={14} /> };
      case 'warning':
        return { bg: 'bg-amber-50 border-amber-200 text-amber-700', icon: <AlertTriangle className="text-amber-600" size={14} /> };
      case 'critical':
        return { bg: 'bg-red-50 border-red-200 text-red-700', icon: <AlertCircle className="text-red-600" size={14} /> };
      default:
        return { bg: 'bg-gray-50 border-gray-200 text-gray-500', icon: <Clock className="text-gray-400" size={14} /> };
    }
  };

  const totalChartHours = clientHoursBreakdown.reduce((sum, item) => sum + item.hours, 0);
  let accumulatedAngle = 0;

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-title text-2xl font-bold text-gray-900">Visão Geral</h1>
          <p className="text-sm text-gray-500">Métricas consolidadas de faturamento e produtividade de horas.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <Calendar size={16} className="text-gray-400" />
          <select 
            className="bg-white border border-gray-200 rounded-lg py-1.5 px-3 text-xs font-semibold text-gray-700 focus:outline-none focus:border-yellow-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            disabled={getUniqueMonths().length === 0}
          >
            {getUniqueMonths().length === 0 ? (
              <option value="">Nenhum mês de CSV</option>
            ) : (
              getUniqueMonths().map(m => (
                <option key={m} value={m}>{getMonthNamePT(m)}</option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Metric cards (Clean white grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-gray-400">
            <span className="text-[11px] font-bold tracking-wider uppercase">Faturamento Mensal</span>
            <div className="text-gray-900 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold font-title text-gray-900 leading-none">{formatCurrency(stats.estimatedBilling)}</span>
            <span className="text-[10px] text-gray-400 font-semibold mt-1">
              Sendo <strong className="text-yellow-600">{formatCurrency(stats.variableBilling)}</strong> extra/variável
            </span>
          </div>
          <span className="text-[10px] text-yellow-600 font-semibold cursor-pointer flex items-center gap-0.5 mt-1" onClick={() => onNavigateToTab('reports')}>
            Faturas ativas <ArrowUpRight size={10} />
          </span>
        </div>

        <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-gray-400">
            <span className="text-[11px] font-bold tracking-wider uppercase">Total Horas Gastas</span>
            <div className="text-gray-900 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
              <Clock size={16} />
            </div>
          </div>
          <span className="text-xl font-bold font-title text-gray-900">{stats.totalHours.toFixed(2).replace('.', ',')}h</span>
          <span className="text-[10px] text-yellow-600 font-semibold cursor-pointer flex items-center gap-0.5" onClick={() => onNavigateToTab('timesheet')}>
            Ver no timesheet <ArrowUpRight size={10} />
          </span>
        </div>

        <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-gray-400">
            <span className="text-[11px] font-bold tracking-wider uppercase">Clientes Cadastrados</span>
            <div className="text-gray-900 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
              <Users size={16} />
            </div>
          </div>
          <span className="text-xl font-bold font-title text-gray-900">{stats.activeClientsCount}</span>
          <span className="text-[10px] text-yellow-600 font-semibold cursor-pointer flex items-center gap-0.5" onClick={() => onNavigateToTab('clients')}>
            Gerenciar contratos <ArrowUpRight size={10} />
          </span>
        </div>

        <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-gray-400">
            <span className="text-[11px] font-bold tracking-wider uppercase">Jobs Extras</span>
            <div className="text-gray-900 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
              <TrendingUp size={16} />
            </div>
          </div>
          <span className="text-xl font-bold font-title text-gray-900">{stats.completedDemandsCount}</span>
          <span className="text-[10px] text-gray-400 font-medium">Lançamentos faturáveis</span>
        </div>

      </div>

      {/* Main Grid: Profitability Analysis vs Hour charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Profitability Monitor */}
        <div className="bg-white border border-gray-150 rounded-xl p-6 shadow-xs lg:col-span-2 flex flex-col gap-4">
          <div>
            <h3 className="font-title text-base font-bold text-gray-900">Faturamento & Retorno por Cliente</h3>
            <p className="text-xs text-gray-500">Visão unificada de faturamento (fixo + extra) e retorno da lucratividade operacional por esforço.</p>
          </div>

          <div className="flex flex-col gap-3">
            {profitabilityList.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">Nenhum cliente cadastrado neste período.</p>
            ) : (
              profitabilityList.map(c => {
                const styles = getProfitabilityStyles(c.status);
                const rateText = c.effectiveRate === Infinity 
                  ? 'Retorno Máximo' 
                  : c.totalHoursSpent === 0 
                    ? 'Sem horas'
                    : `${formatCurrency(c.effectiveRate)}/h`;
                
                const isExpanded = expandedClientId === c.clientId;
                
                // Fetch the client's internal hourly rate/value
                const clientObj = clients.find(cl => cl.id === c.clientId);
                const refHourlyRate = clientObj?.hourlyRate || 150; // fallback if not set
                const refFixedFee = clientObj?.fixedFee || 0;
                const contractTypeName = clientObj?.contractType === 'fixed' 
                  ? 'Fee Fixo' 
                  : clientObj?.contractType === 'hybrid' 
                    ? 'Misto (Fixo + Extra)' 
                    : 'Cobrança por Hora';
                
                // Calculate operational cost (effort) and profit
                const effortCost = c.totalHoursSpent * refHourlyRate;
                const profit = c.billing - effortCost;
                
                // Generate qualitative advice
                let advice = "";
                if (c.totalHoursSpent === 0) {
                  advice = "Nenhum esforço operacional registrado neste período.";
                } else if (profit < -100) {
                  advice = `⚠️ O custo estimado de esforço (${formatCurrency(effortCost)}) superou o faturamento proporcional deste mês. Recomenda-se renegociar o valor do fee ou ajustar o limite de horas do escopo contratado.`;
                } else if (profit > 200) {
                  advice = `✅ Retorno operacional altamente rentável. O esforço operacional dedicado está abaixo do valor previsto no contrato.`;
                } else {
                  advice = `⚖️ Equilíbrio financeiro e operacional saudável para o período.`;
                }
                
                return (
                  <div 
                    key={c.clientId} 
                    className="flex flex-col p-4 border border-gray-100 rounded-lg hover:border-gray-200 transition-all gap-3 cursor-pointer select-none bg-white shadow-xs"
                    onClick={() => setExpandedClientId(isExpanded ? null : c.clientId)}
                  >
                    {/* Collapsed Top Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                      
                      {/* Client info */}
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <div className="flex items-center justify-center w-8 h-8 bg-gray-50 border border-gray-100 rounded-lg text-gray-800 font-bold font-title text-xs shrink-0">
                          {c.clientName.slice(0,2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <div className="text-sm font-semibold text-gray-900 leading-tight">{c.clientName}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">
                              {contractTypeName}
                            </span>
                            {c.billing > 0 && (
                              <>
                                <span className="text-gray-300 text-[9px]">•</span>
                                <div className="w-12 bg-gray-100 h-1 rounded-full overflow-hidden border border-gray-50/50">
                                  <div 
                                    className="bg-yellow-400 h-full rounded-full transition-all duration-1000"
                                    style={{ width: `${Math.min(100, (c.billing / (Math.max(...profitabilityList.map(item => item.billing)) || 1)) * 100)}%` }}
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Billing detail (Previsão de Faturamento consolidada) */}
                      <div className="text-left sm:text-right sm:ml-auto">
                        <div className="text-sm font-extrabold text-yellow-600">
                          {formatCurrency(c.billing)}
                        </div>
                        <span className="text-[9px] text-gray-400 font-medium">
                          {c.variableBilling > 0 
                            ? `${formatCurrency(c.fixedBilling)} fixo + ${formatCurrency(c.variableBilling)} extra` 
                            : 'Faturamento previsto'}
                        </span>
                      </div>

                      {/* Hours detail */}
                      <div className="text-left sm:text-right">
                        <div className="text-xs font-semibold text-gray-700">
                          {c.totalHoursSpent.toFixed(2).replace('.', ',')}h gastas
                        </div>
                        <div className="text-[9px] text-gray-400">
                          {c.billableHours.toFixed(1).replace('.', ',')}h fat. • {c.nonBillableHours.toFixed(1).replace('.', ',')}h int.
                        </div>
                      </div>

                      {/* Status Badge & Effective Rate */}
                      <div className="flex items-center gap-3 sm:justify-end">
                        <div className="text-left sm:text-right">
                          <div className="text-xs font-bold text-gray-900">{rateText}</div>
                          <span className="text-[9px] text-gray-400 font-medium">Taxa Efetiva</span>
                        </div>
                        <div className={`flex items-center gap-1.5 border px-2 py-0.5 rounded-full text-[11px] font-semibold ${styles.bg}`}>
                          {styles.icon}
                          <span>{c.statusLabel}</span>
                        </div>
                        {isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                      </div>

                    </div>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 pt-3 mt-1 flex flex-col gap-3 text-xs text-gray-600 bg-gray-50/20 p-3 rounded-lg" onClick={(e) => e.stopPropagation()}>
                        
                        {/* Financial and Hour breakdowns */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] text-gray-450 font-bold uppercase tracking-wider">Divisão de Esforço</span>
                            <div className="flex flex-col gap-0.5 text-gray-700">
                              <p>Horas Faturáveis: <strong className="text-gray-900">{c.billableHours.toFixed(2).replace('.', ',')}h</strong></p>
                              <p>Horas Internas: <strong className="text-gray-900">{c.nonBillableHours.toFixed(2).replace('.', ',')}h</strong></p>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] text-gray-450 font-bold uppercase tracking-wider">Valores de Contrato</span>
                            <div className="flex flex-col gap-0.5 text-gray-700">
                              {clientObj?.contractType !== 'hourly' && <p>Fee Fixo Mensal: <strong className="text-gray-900">{formatCurrency(refFixedFee)}</strong></p>}
                              <p>Taxa Hora Referência: <strong className="text-gray-900">{formatCurrency(refHourlyRate)}/h</strong></p>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] text-gray-450 font-bold uppercase tracking-wider">Análise de Lucratividade</span>
                            <div className="flex flex-col gap-0.5 text-gray-700">
                              <p>Faturamento Real: <strong className="text-gray-900">{formatCurrency(c.billing)}</strong></p>
                              <p>Custo Ref. de Esforço: <strong className="text-gray-900">{formatCurrency(effortCost)}</strong></p>
                              <p>
                                Retorno Líquido: {' '}
                                <strong className={profit >= 0 ? "text-green-600" : "text-red-650"}>
                                  {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                                </strong>
                              </p>
                            </div>
                          </div>

                        </div>

                        {/* Qualitative Advice */}
                        <div className="border-t border-gray-100 pt-2 text-[11px] font-medium text-gray-500 italic leading-relaxed">
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

        {/* Right 1 Col: Donut Hours Chart */}
        <div className="bg-white border border-gray-150 rounded-xl p-6 shadow-xs flex flex-col gap-4">
          <div>
            <h3 className="font-title text-base font-bold text-gray-900">Horas por Cliente</h3>
            <p className="text-xs text-gray-500">Distribuição percentual do total de esforço (horas) registradas.</p>
          </div>

          {totalChartHours === 0 ? (
            <div className="flex flex-col items-center justify-center flex-grow py-8 gap-2">
              <Clock className="text-gray-300" size={32} />
              <p className="text-xs text-gray-400 text-center">Nenhuma hora registrada neste mês.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-grow">
              
              {/* Donut Circle */}
              <div className="relative flex items-center justify-center w-36 h-36 mb-6">
                <svg className="-rotate-90" width="120" height="120" viewBox="0 0 42 42">
                  <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f3f4f6" strokeWidth="4.5" />
                  {clientHoursBreakdown.map((item, idx) => {
                    const percent = (item.hours / totalChartHours) * 100;
                    const strokeDasharray = `${percent} ${100 - percent}`;
                    const strokeDashoffset = 100 - accumulatedAngle;
                    accumulatedAngle += percent;

                    return (
                      <circle
                        key={item.id}
                        cx="21"
                        cy="21"
                        r="15.915"
                        fill="transparent"
                        stroke={item.color}
                        strokeWidth="4.5"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-500"
                      />
                    );
                  })}
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-xl font-bold font-title text-gray-900 leading-none">
                    {stats.totalHours.toFixed(1).replace('.', ',')}
                  </span>
                  <span className="text-[9px] text-gray-400 uppercase tracking-widest font-semibold mt-0.5">Horas</span>
                </div>
              </div>

              {/* Legend list */}
              <div className="flex flex-col gap-2 w-full">
                {clientHoursBreakdown.map(item => (
                  <div key={item.id} className="flex items-center justify-between text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="font-medium text-gray-900 truncate max-w-[120px]" title={item.name}>
                        {item.name}
                      </span>
                    </div>
                    <span className="font-bold text-gray-700">
                      {item.hours.toFixed(1).replace('.', ',')}h ({((item.hours / totalChartHours) * 100).toFixed(0)}%)
                    </span>
                  </div>
                ))}
              </div>

            </div>
          )}
        </div>

      </div>

    </div>
  );
}
