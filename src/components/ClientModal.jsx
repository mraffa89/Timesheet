import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Globe, Trash2, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { fetchAsaasCustomerByCnpj } from '../utils/asaasIntegration';
import { formatCpfCnpj, formatPhone, fetchPublicCnpjData } from '../utils/cnpjLookup';

export default function ClientModal({ isOpen, onClose, client, onSave, clients = [], onDelete, onMerge }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [additionalEmail, setAdditionalEmail] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [contractType, setContractType] = useState('hybrid');
  const [fixedFee, setFixedFee] = useState('1400');
  const [hoursIncluded, setHoursIncluded] = useState('7');
  const [hourlyRate, setHourlyRate] = useState(() => localStorage.getItem('raffa_default_hourly_rate') || '200');
  const [retainIss, setRetainIss] = useState(false);
  const [isImportingCnpj, setIsImportingCnpj] = useState(false);
  const [isConsultingPublicCnpj, setIsConsultingPublicCnpj] = useState(false);

  // Estados de Mesclagem
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [mergeSearchTerm, setMergeSearchTerm] = useState('');
  const [targetMergeClientId, setTargetMergeClientId] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (client) {
      setName(client.name || '');
      setEmail(client.email || '');
      setAdditionalEmail(client.additionalEmail || '');
      setCnpj(formatCpfCnpj(client.cnpj || ''));
      setPhone(formatPhone(client.phone || ''));
      setAddress(client.address || '');
      setIsActive(client.isActive !== false);
      const clientNameLower = (client.name || '').toLowerCase();
      const isPedroRafael = clientNameLower.includes('pedro') && (clientNameLower.includes('rafael') || clientNameLower.includes('&'));
      setRetainIss(client.retainIss !== undefined ? Boolean(client.retainIss) : isPedroRafael);
      setContractType(client.contractType || 'hybrid');
      setFixedFee(client.fixedFee ? client.fixedFee.toString() : '0');
      setHourlyRate(client.hourlyRate ? client.hourlyRate.toString() : (localStorage.getItem('raffa_default_hourly_rate') || '200'));
      setHoursIncluded(client.hoursIncluded ? client.hoursIncluded.toString() : '0');
    } else {
      const globalRate = localStorage.getItem('raffa_default_hourly_rate') || '200';
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
    }
  }, [isOpen, client]);

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

  const availableMergeClients = useMemo(() => {
    if (!client || !client.id) return [];
    return clients.filter(c => {
      if (c.id === client.id) return false;
      if (!mergeSearchTerm.trim()) return true;
      const term = mergeSearchTerm.toLowerCase();
      const matchName = (c.name || '').toLowerCase().includes(term);
      const matchCnpj = (c.cnpj || '').replace(/\D/g, '').includes(term.replace(/\D/g, ''));
      return matchName || matchCnpj;
    });
  }, [clients, client, mergeSearchTerm]);

  if (!isOpen) return null;

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
      } else {
        alert(data.message || "Cliente não encontrado no Asaas com este CNPJ.");
      }
    } catch (err) {
      alert("Erro ao buscar no Asaas: " + err.message);
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

    if (client && client.id) {
      onSave({ ...client, ...clientData });
    } else {
      onSave(clientData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-2xl border border-gray-200 max-w-[540px] w-full p-6 shadow-2xl animate-in fade-in-0 zoom-in-95 my-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
          <div>
            <h3 className="font-title text-base font-bold text-gray-900">
              {client ? 'Editar Cadastro do Cliente' : 'Adicionar Novo Cliente'}
            </h3>
            <p className="text-xs text-gray-500">
              {client ? `Alterando dados de ${client.name}` : 'Cadastre um novo tomador de serviços'}
            </p>
          </div>
          <button 
            className="text-gray-400 hover:text-gray-900 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer" 
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Asaas CNPJ Importer */}
          <div className="flex flex-col gap-1.5 bg-gray-50 border border-gray-150 p-3 rounded-xl">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Importar dados do Asaas por CNPJ</span>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="CNPJ (apenas números ou formatado)"
                className="flex-grow border border-gray-200 rounded-lg p-2 text-xs focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 bg-white font-mono"
                value={cnpj} 
                onChange={(e) => setCnpj(formatCpfCnpj(e.target.value))}
              />
              <button 
                type="button"
                onClick={handleImportAsaasByCnpj}
                className="bg-gray-900 hover:bg-black text-white rounded-lg px-3 py-2 text-xs font-bold cursor-pointer shrink-0 disabled:opacity-55 flex items-center gap-1 transition-colors"
                disabled={isImportingCnpj}
              >
                <Search size={12} /> {isImportingCnpj ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700" htmlFor="modal-client-name">Nome da Empresa / Cliente</label>
            <input 
              id="modal-client-name" 
              type="text" 
              className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 bg-white" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Ex: CPR (MHB Raffa)"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-gray-700" htmlFor="modal-client-cnpj">CNPJ / CPF do Cliente</label>
                <button
                  type="button"
                  onClick={handleConsultPublicCnpj}
                  disabled={isConsultingPublicCnpj}
                  className="text-[10px] text-gray-700 hover:text-gray-950 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 underline"
                  title="Consultar dados da empresa na Receita Federal via API pública gratuita"
                >
                  <Globe size={11} />
                  <span>{isConsultingPublicCnpj ? 'Consultando...' : 'Buscar na Receita'}</span>
                </button>
              </div>
              <input 
                id="modal-client-cnpj" 
                type="text" 
                className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 bg-white font-mono" 
                value={cnpj} 
                onChange={(e) => setCnpj(formatCpfCnpj(e.target.value))} 
                placeholder="00.000.000/0000-00"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700" htmlFor="modal-client-phone">Telefone / WhatsApp</label>
              <input 
                id="modal-client-phone" 
                type="text" 
                className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 bg-white font-mono" 
                value={phone} 
                onChange={(e) => setPhone(formatPhone(e.target.value))} 
                placeholder="(19) 99999-9999"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700" htmlFor="modal-client-address">Endereço Completo</label>
            <input 
              id="modal-client-address" 
              type="text" 
              className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 bg-white" 
              value={address} 
              onChange={(e) => setAddress(e.target.value)} 
              placeholder="Av. Exemplo, 100 - Bairro, Cidade/UF - CEP: 13000-000"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700" htmlFor="modal-client-email">E-mail Financeiro Principal</label>
              <input 
                id="modal-client-email" 
                type="email" 
                className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 bg-white" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="financeiro@empresa.com.br"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700" htmlFor="modal-client-additional-email">E-mail Adicional (CC)</label>
              <input 
                id="modal-client-additional-email" 
                type="email" 
                className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 bg-white" 
                value={additionalEmail} 
                onChange={(e) => setAdditionalEmail(e.target.value)} 
                placeholder="diretoria@empresa.com.br"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input 
              id="modal-client-is-active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-gray-900 rounded border-gray-300 focus:ring-gray-900 cursor-pointer"
            />
            <label htmlFor="modal-client-is-active" className="text-xs font-semibold text-gray-700 cursor-pointer">
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
                id="modal-client-retain-iss"
                type="checkbox"
                checked={retainIss}
                onChange={(e) => setRetainIss(e.target.checked)}
                className="w-4 h-4 text-yellow-500 rounded border-gray-300 focus:ring-yellow-400 cursor-pointer"
              />
              <label htmlFor="modal-client-retain-iss" className="text-xs text-gray-700 cursor-pointer">
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
            <label className="text-xs font-semibold text-gray-700" htmlFor="modal-client-contract">Modelo de Contrato</label>
            <select 
              id="modal-client-contract" 
              className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-gray-900 bg-white cursor-pointer" 
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
                <label className="text-xs font-semibold text-gray-700" htmlFor="modal-client-fixed-fee">Valor Mensal Fixo (R$)</label>
                <input 
                  id="modal-client-fixed-fee" 
                  type="number" 
                  step="0.01" 
                  className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 bg-white" 
                  value={fixedFee} 
                  onChange={(e) => setFixedFee(e.target.value)} 
                  placeholder="0.00"
                  required
                />
              </div>
            )}

            {contractType !== 'fixed' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700" htmlFor="modal-client-rate">
                  {contractType === 'hybrid' ? 'Tarifa Hora Extra (R$)' : 'Tarifa por Hora (R$)'}
                </label>
                <input 
                  id="modal-client-rate" 
                  type="number" 
                  step="0.01" 
                  className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 bg-white" 
                  value={hourlyRate} 
                  onChange={(e) => setHourlyRate(e.target.value)} 
                  placeholder="0.00"
                  required
                />
              </div>
            )}

            {contractType !== 'hourly' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700" htmlFor="modal-client-hours">
                  Horas Inclusas (Calculado)
                </label>
                <input 
                  id="modal-client-hours" 
                  type="text" 
                  readOnly 
                  className="border border-gray-200 bg-gray-50 rounded-lg p-2.5 text-sm text-gray-600 font-semibold focus:outline-none" 
                  value={`${hoursIncluded}h`} 
                />
              </div>
            )}
          </div>

          {/* Zona de Ações Avançadas: Excluir ou Mesclar */}
          {client && client.id && (
            <div className="border-t border-gray-150 pt-4 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Gerenciamento da Conta
                </span>
                <div className="flex items-center gap-2">
                  {onMerge && (
                    <button
                      type="button"
                      onClick={() => setIsMergeOpen(!isMergeOpen)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <ArrowRightLeft size={13} />
                      <span>{isMergeOpen ? 'Fechar Mesclagem' : 'Mesclar com Outro Cliente'}</span>
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Deseja realmente excluir o cliente "${client.name}"? Todos os lançamentos e demandas associados serão excluídos permanentemente.`)) {
                          onDelete(client.id);
                          onClose();
                        }
                      }}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 size={13} />
                      <span>Excluir</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Bloco de Mesclagem de Clientes com busca */}
              {isMergeOpen && (
                <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 flex flex-col gap-2.5 animate-in fade-in-0">
                  <div className="flex items-start gap-2 text-xs text-amber-950">
                    <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block">Mesclar "{client.name}" com outro cliente</strong>
                      <span className="text-[11px] text-amber-800 leading-relaxed">
                        Todas as horas do Timesheet e demandas de prestadores vinculadas a este cliente serão transferidas para o cliente selecionado abaixo. O cadastro de <strong>{client.name}</strong> será removido.
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-gray-700">Selecione o Cliente de Destino:</label>
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar cliente por nome ou CNPJ..."
                        value={mergeSearchTerm}
                        onChange={(e) => setMergeSearchTerm(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg pl-8 pr-2.5 py-1.5 text-xs bg-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <select
                      value={targetMergeClientId}
                      onChange={(e) => setTargetMergeClientId(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white font-semibold text-gray-800 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="">Selecione um cliente para mesclar ({availableMergeClients.length} disponíveis)...</option>
                      {availableMergeClients.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.cnpj ? `(${formatCpfCnpj(c.cnpj)})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      disabled={!targetMergeClientId}
                      onClick={() => {
                        if (!targetMergeClientId) return;
                        const targetObj = clients.find(c => c.id === targetMergeClientId);
                        if (confirm(`Confirma a mesclagem? Todas as horas e demandas de "${client.name}" serão migradas para "${targetObj?.name}". Esta ação não pode ser desfeita.`)) {
                          onMerge(client.id, targetMergeClientId);
                          onClose();
                        }
                      }}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg text-xs transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <ArrowRightLeft size={13} />
                      <span>Confirmar e Mesclar</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 mt-2">
            <button 
              type="button" 
              className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer" 
              onClick={onClose}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-yellow-400 text-gray-950 rounded-lg text-xs font-bold hover:bg-yellow-500 shadow-xs cursor-pointer"
            >
              {client ? 'Salvar Alterações' : 'Adicionar Cliente'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
