import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Calendar, 
  CreditCard, 
  CheckCircle2, 
  Copy, 
  ExternalLink, 
  X, 
  AlertCircle, 
  Phone, 
  Mail, 
  Building, 
  MapPin, 
  QrCode, 
  Check,
  Send,
  FileText,
  RefreshCw
} from 'lucide-react';
import { createAsaasBilling, attachDocumentToAsaasPayment } from '../utils/asaasIntegration';
import { generateInvoicePdf } from '../utils/pdfGenerator';
import { formatCpfCnpj, formatPhone } from '../utils/cnpjLookup';
import { sendDirectEmail, isSmtpConfigured } from '../utils/smtpService';

const groupEntriesByDescription = (entriesList) => {
  const map = new Map();

  entriesList.forEach(entry => {
    const rawDesc = (entry.description || '').trim();
    const key = rawDesc.toLowerCase();
    const entryDate = entry.deliveryDate || entry.requestDate || '';

    if (!map.has(key)) {
      map.set(key, {
        ...entry,
        description: rawDesc,
        hours: entry.hours || 0,
        latestDate: entryDate,
        originalCount: 1
      });
    } else {
      const existing = map.get(key);
      existing.hours += (entry.hours || 0);
      existing.originalCount += 1;
      
      if (entryDate && (!existing.latestDate || new Date(entryDate) > new Date(existing.latestDate))) {
        existing.latestDate = entryDate;
      }
    }
  });

  return Array.from(map.values()).map(item => ({
    ...item,
    deliveryDate: item.latestDate,
    requestDate: item.latestDate
  }));
};

export default function InvoiceView({ entries, clients, companyInfo = {}, emailSubjectTemplate = '', emailBodyTemplate = '' }) {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [client, setClient] = useState(null);
  const [clientEntries, setClientEntries] = useState([]);
  const [allEntriesCount, setAllEntriesCount] = useState(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [copiedEmailBody, setCopiedEmailBody] = useState(false);
  
  // Fechar modal de e-mail com ESC
  useEffect(() => {
    if (!isEmailModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsEmailModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEmailModalOpen]);
  
  // Financial State
  const [financials, setFinancials] = useState({
    fixedFee: 0,
    hoursIncluded: 0,
    hourlyRate: 0,
    totalHours: 0,
    billableHours: 0,
    extraHours: 0,
    extraBilling: 0,
    totalAmount: 0
  });

  // Asaas Billing Integration State
  const [isGeneratingAsaas, setIsGeneratingAsaas] = useState(false);
  const [asaasBilling, setAsaasBilling] = useState(null);
  const [copiedPix, setCopiedPix] = useState(false);

  // Fallback company defaults matching user profile
  const company = {
    brandName: companyInfo.brandName || 'Matheus Raffa',
    brandSubtitle: companyInfo.brandSubtitle || 'Inteligência Digital',
    legalName: companyInfo.legalName || 'MHB Raffa Design Estratégico LTDA',
    cnpj: companyInfo.cnpj || '00.000.000/0001-00',
    email: companyInfo.email || 'contato@matheusraffa.com.br',
    phone: companyInfo.phone || '(19) 99630-7776',
    website: companyInfo.website || 'matheusraffa.com.br',
    city: companyInfo.city || 'Campinas / SP'
  };

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

  const getFilteredClients = () => {
    if (!selectedMonth) return [];

    return clients.filter(c => {
      const clientBillableMonthEntries = entries.filter(e => {
        if (e.clientId !== c.id) return false;
        // Apenas lançamentos faturáveis (billables)
        const isBillable = e.billable === true || String(e.billable).toLowerCase() === 'true' || e.isBillable === true;
        if (!isBillable) return false;
        const dateStr = e.deliveryDate || e.requestDate;
        if (!dateStr) return false;
        const yearMonth = getYearMonth(dateStr);
        if (yearMonth !== selectedMonth) return false;
        const hours = parseFloat(e.hours) || 0;
        return hours > 0;
      });

      return clientBillableMonthEntries.length > 0;
    });
  };

  const filteredClients = getFilteredClients();

  // Data de vencimento personalizável (formato YYYY-MM-DD)
  const [customDueDate, setCustomDueDate] = useState('');

  // Calcula o vencimento padrão (sempre no mês subsequente à leitura dos dados, ex: Agosto -> Outubro, dia 10)
  const getDefaultDueDateForMonth = (monthKey) => {
    if (monthKey && monthKey.includes('-')) {
      const parts = monthKey.split('-');
      let year = parseInt(parts[0], 10);
      let month = parseInt(parts[1], 10);
      let targetMonth = month + 2;
      let targetYear = year;
      if (targetMonth > 12) {
        targetMonth = targetMonth - 12;
        targetYear += 1;
      }
      return `${targetYear}-${String(targetMonth).padStart(2, '0')}-10`;
    }
    const now = new Date();
    let curMonth = now.getMonth() + 1;
    let curYear = now.getFullYear();
    let targetMonth = curMonth + 2;
    let targetYear = curYear;
    if (targetMonth > 12) {
      targetMonth = targetMonth - 12;
      targetYear += 1;
    }
    return `${targetYear}-${String(targetMonth).padStart(2, '0')}-10`;
  };

  // Formata a data ISO (YYYY-MM-DD) para exibição brasileira (DD/MM/AAAA)
  const formatDueDateDisplay = (dateIso) => {
    if (!dateIso) return '-';
    if (dateIso.includes('-')) {
      const parts = dateIso.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }
    }
    return dateIso;
  };

  // Handler para quando o usuário altera a data de vencimento no input
  const handleDueDateChange = (newDate) => {
    setCustomDueDate(newDate);
    if (selectedClientId && selectedMonth) {
      localStorage.setItem(`raffa_invoice_due_${selectedClientId}_${selectedMonth}`, newDate);
    }
  };

  // Obtém estritamente os meses existentes nos lançamentos importados (CSVs)
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

  const uniqueMonths = getUniqueMonths();

  // Sincroniza o mês selecionado exclusivamente com os meses existentes dos CSVs importados
  useEffect(() => {
    const availableMonths = getUniqueMonths();
    if (availableMonths.length > 0) {
      if (!selectedMonth || !availableMonths.includes(selectedMonth)) {
        setSelectedMonth(availableMonths[0]);
      }
    } else {
      setSelectedMonth('');
    }
  }, [entries]);

  // Atualiza o cliente selecionado quando o mês ou a lista de clientes mudam
  useEffect(() => {
    if (!selectedMonth) {
      setSelectedClientId('');
      return;
    }

    const available = getFilteredClients();
    if (available.length > 0) {
      if (!selectedClientId || !available.some(c => c.id === selectedClientId)) {
        setSelectedClientId(available[0].id);
      }
    } else {
      setSelectedClientId('');
    }
  }, [clients, entries, selectedMonth, selectedClientId]);

  // Carrega a data de vencimento salva para o cliente e mês ou define a padrão
  useEffect(() => {
    if (!selectedClientId || !selectedMonth) {
      setCustomDueDate('');
      return;
    }

    const savedDue = localStorage.getItem(`raffa_invoice_due_${selectedClientId}_${selectedMonth}`);
    if (savedDue) {
      setCustomDueDate(savedDue);
    } else {
      setCustomDueDate(getDefaultDueDateForMonth(selectedMonth));
    }
  }, [selectedClientId, selectedMonth]);

  // Load persistent Asaas billing when client and month change
  useEffect(() => {
    if (selectedClientId && selectedMonth) {
      const savedBilling = localStorage.getItem(`raffa_asaas_billing_${selectedClientId}_${selectedMonth}`);
      if (savedBilling) {
        try {
          const parsed = JSON.parse(savedBilling);
          setAsaasBilling(parsed);
          if (parsed?.dueDate) {
            setCustomDueDate(parsed.dueDate);
          }
        } catch (e) {
          setAsaasBilling(null);
        }
      } else {
        setAsaasBilling(null);
      }
    } else {
      setAsaasBilling(null);
    }
  }, [selectedClientId, selectedMonth]);

  // Update client details and entries list when filters change
  useEffect(() => {
    if (!selectedClientId || !selectedMonth) {
      setClient(null);
      setClientEntries([]);
      setAllEntriesCount(0);
      setFinancials({
        fixedFee: 0,
        hoursIncluded: 0,
        hourlyRate: 0,
        totalHours: 0,
        billableHours: 0,
        extraHours: 0,
        extraBilling: 0,
        totalAmount: 0
      });
      return;
    }

    const currentClient = clients.find(c => c.id === selectedClientId);
    setClient(currentClient);

    // Fetch all entries for this client and month
    const filteredAll = entries.filter(e => {
      if (e.clientId !== selectedClientId) return false;
      const dateStr = e.deliveryDate || e.requestDate;
      if (!dateStr) return false;
      const yearMonth = getYearMonth(dateStr);
      return yearMonth === selectedMonth;
    });

    setAllEntriesCount(filteredAll.length);

    // Strictly filter to BILLABLE entries and group them by description across the month
    const filteredBillableRaw = filteredAll.filter(e => e.billable);
    const filteredBillable = groupEntriesByDescription(filteredBillableRaw);

    // Sort chronologically
    filteredBillable.sort((a, b) => new Date(a.deliveryDate || a.requestDate) - new Date(b.deliveryDate || b.requestDate));

    // O Demonstrativo de Serviços fatura os jobs faturáveis (billables) multiplicando as horas técnicas pelo valor da hora
    let hourlyRate = currentClient ? (currentClient.hourlyRate || 0) : 0;
    let fixedFee = currentClient ? (currentClient.fixedFee || 0) : 0;
    let hoursIncluded = currentClient ? (currentClient.hoursIncluded || 0) : 0;
    let totalHoursSpent = filteredAll.reduce((sum, e) => sum + e.hours, 0);
    const billableHours = filteredBillable.reduce((sum, e) => sum + e.hours, 0);

    let totalAmount = 0;
    if (hourlyRate > 0) {
      totalAmount = billableHours * hourlyRate;
    } else {
      totalAmount = fixedFee;
    }

    setFinancials({
      fixedFee,
      hoursIncluded,
      hourlyRate,
      totalHours: totalHoursSpent,
      billableHours,
      extraHours: 0,
      extraBilling: 0,
      totalAmount
    });

    setClientEntries(filteredBillable);

  }, [selectedClientId, selectedMonth, entries, clients]);

  const getMonthNamePT = (monthKey) => {
    if (!monthKey) return '';
    const [year, month] = monthKey.split('-');
    const date = new Date(year, parseInt(month) - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const issueDateStr = new Date().toLocaleDateString('pt-BR');
  const dueDateStr = formatDueDateDisplay(customDueDate || getDefaultDueDateForMonth(selectedMonth));

  // Gerador de PDF 100% Vetorial Monocromático
  const handleGeneratePdf = async () => {
    if (!client) return;

    setIsGeneratingPdf(true);

    try {
      const doc = await generateInvoicePdf({
        client,
        clientEntries,
        financials,
        selectedMonth,
        company,
        asaasBilling,
        issueDateStr,
        dueDateStr,
        monthName: getMonthNamePT(selectedMonth)
      });

      const safeClientName = (client.name || 'Cliente').replace(/[^a-zA-Z0-9_-]/g, '_').toUpperCase();
      const monthParts = selectedMonth.split('-');
      const monthStr = getMonthNamePT(selectedMonth).split(' ')[0];
      const filename = `Demonstrativo_${safeClientName}_${monthStr}_${monthParts[0]}.pdf`;

      doc.save(filename);
    } catch (err) {
      console.error('Erro ao gerar PDF monocromático:', err);
      alert('Erro ao gerar o arquivo PDF: ' + err.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Gerar cobrança no Asaas em segundo plano com Boleto/PIX e data de vencimento configurável
  const handleGenerateAsaasBilling = async () => {
    if (!client) return;
    setIsGeneratingAsaas(true);

    try {
      const storedToken = localStorage.getItem('raffa_asaas_token') || '';
      const storedEnv = localStorage.getItem('raffa_asaas_env') || 'sandbox';
      const effectiveDueDate = customDueDate || getDefaultDueDateForMonth(selectedMonth);

      // Validação amigável de data no passado para evitar rejeição pela API do Asaas
      const todayIso = new Date().toISOString().split('T')[0];
      if (effectiveDueDate < todayIso) {
        const proceedPast = window.confirm(`Atenção: A data de vencimento configurada (${formatDueDateDisplay(effectiveDueDate)}) é anterior ao dia de hoje.\nA API do Asaas normalmente não aceita emissão de cobranças vencidas.\n\nDeseja prosseguir mesmo assim?`);
        if (!proceedPast) {
          setIsGeneratingAsaas(false);
          return;
        }
      }

      const result = await createAsaasBilling({
        client,
        financials,
        selectedMonth,
        dueDate: effectiveDueDate,
        billingType: 'BOLETO', // Emite diretamente como Boleto Bancário com PIX (sem 'perguntar ao cliente')
        apiKey: storedToken,
        environment: storedEnv
      });

      // Salva no estado e no localStorage
      setAsaasBilling(result);
      localStorage.setItem(`raffa_asaas_billing_${client.id}_${selectedMonth}`, JSON.stringify(result));
      
      // Gera o PDF formatado com o QR Code e anexa automaticamente à cobrança no Asaas
      let attachedMsg = '';
      try {
        const doc = await generateInvoicePdf({
          client,
          clientEntries,
          financials,
          selectedMonth,
          company,
          asaasBilling: result,
          issueDateStr,
          dueDateStr: formatDueDateDisplay(result.dueDate || effectiveDueDate),
          monthName: getMonthNamePT(selectedMonth)
        });

        const safeClientName = (client.name || 'Cliente').replace(/[^a-zA-Z0-9_-]/g, '_').toUpperCase();
        const monthParts = selectedMonth.split('-');
        const monthStr = getMonthNamePT(selectedMonth).split(' ')[0];
        const filename = `Demonstrativo_${safeClientName}_${monthStr}_${monthParts[0]}.pdf`;
        const pdfBlob = doc.output('blob');

        // Delay para garantir propagação no Asaas antes do envio do arquivo
        await new Promise(r => setTimeout(r, 600));
        const attachRes = await attachDocumentToAsaasPayment(result.billingId, pdfBlob, filename);
        if (attachRes.success) {
          attachedMsg = `\n\n📄 O arquivo "${filename}" foi anexado com sucesso à cobrança no Asaas!`;
        }
      } catch (pdfErr) {
        console.warn("Aviso ao anexar PDF no Asaas:", pdfErr);
      }

      // Feedback amigável
      let nfeMsg = '';
      if (result.invoiceScheduled) {
        const issLabel = result.retainIss 
          ? 'Tomador do ISS (Retenção na fonte por conta do cliente)' 
          : 'ISS por conta do prestador (Sem retenção)';
        nfeMsg = `\n\n🧾 Nota Fiscal (NFS-e): Programada com sucesso para emissão automática após o pagamento!\n• Enquadramento ISS: ${issLabel}`;
      } else if (result.invoiceMessage) {
        nfeMsg = `\n\nℹ️ ${result.invoiceMessage}`;
      }

      alert(`Cobrança gerada com sucesso no Asaas via Boleto/PIX! O QR Code PIX e o link de acesso rápido foram inseridos no demonstrativo.${attachedMsg}${nfeMsg}`);
    } catch (err) {
      alert("Erro ao processar integração com Asaas: " + err.message);
    } finally {
      setIsGeneratingAsaas(false);
    }
  };

  const handleCopyPix = () => {
    if (!asaasBilling?.pixCopiaCola) return;
    navigator.clipboard.writeText(asaasBilling.pixCopiaCola);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  const handleOpenEmailModal = () => {
    if (!client) return;

    const rawSubj = emailSubjectTemplate || localStorage.getItem('raffa_email_subject_tpl') || 'Demonstrativo de Serviços Técnicos - {cliente} ({mes_extenso})';
    const rawBody = emailBodyTemplate || localStorage.getItem('raffa_email_body_tpl') || `Olá, equipe {cliente}!

Segue em anexo o Demonstrativo de Serviços Técnicos referente ao mês de {mes_extenso}.

Resumo do Fechamento:
• Total de Horas Técnicas: {horas_tecnicas}h
• Valor Total Faturado: {valor_total}
• Data de Vencimento: {data_vencimento}

Link direto para acessar a fatura online e pagamento:
{link_fatura}

Chave PIX Copia e Cola:
{pix_copia_cola}

O documento em anexo (PDF) contém o detalhamento completo de todas as demandas e tarefas executadas no período.

Permanecemos à disposição para eventuais dúvidas.

Atenciosamente,
{minha_empresa}
{meu_telefone} | {meu_email}`;

    const monthParts = selectedMonth.split('-');
    const mesExtenso = getMonthNamePT(selectedMonth);
    const mesAno = `${monthParts[1]}/${monthParts[0]}`;

    const replacements = {
      '{cliente}': client.name,
      '{empresa}': client.name,
      '{mes_extenso}': mesExtenso,
      '{mes_ano}': mesAno,
      '{horas_tecnicas}': financials.billableHours.toFixed(2).replace('.', ','),
      '{valor_total}': formatCurrency(financials.totalAmount),
      '{data_vencimento}': dueDateStr,
      '{link_fatura}': asaasBilling?.invoiceUrl || 'Acesse a fatura no link em anexo',
      '{pix_copia_cola}': asaasBilling?.pixCopiaCola || 'Código PIX disponível no demonstrativo em anexo',
      '{minha_empresa}': company.brandName,
      '{meu_telefone}': company.phone,
      '{meu_email}': company.email
    };

    let processedSubj = rawSubj;
    let processedBody = rawBody;

    Object.entries(replacements).forEach(([key, val]) => {
      processedSubj = processedSubj.split(key).join(val || '');
      processedBody = processedBody.split(key).join(val || '');
    });

    setEmailSubject(processedSubj);
    setEmailBody(processedBody);
    setIsEmailModalOpen(true);
  };

  const handleLaunchEmailClient = () => {
    try {
      // Copia o texto integral para a área de transferência como garantia
      try {
        navigator.clipboard.writeText(`Para: ${client?.email || ''}\nAssunto: ${emailSubject}\n\n${emailBody}`);
      } catch (_) {}

      const to = client?.email || '';
      const cc = client?.additionalEmail || '';
      const subj = encodeURIComponent(emailSubject);

      // Orçamento seguro para URL mailto (< 1800 caracteres totais)
      const baseLen = `mailto:${to}?cc=${encodeURIComponent(cc)}&subject=${subj}&body=`.length;
      const budget = Math.max(200, 1800 - baseLen);
      let safeBody = emailBody;
      if (encodeURIComponent(safeBody).length > budget) {
        let truncated = safeBody;
        while (encodeURIComponent(truncated + '\n\n[Mensagem completa no Demonstrativo anexo]').length > budget && truncated.length > 50) {
          truncated = truncated.substring(0, truncated.length - 50);
        }
        safeBody = truncated + '\n\n[Mensagem completa no Demonstrativo anexo]';
      }
      const body = encodeURIComponent(safeBody);

      let mailtoUrl = `mailto:${to}?subject=${subj}&body=${body}`;
      if (cc) {
        mailtoUrl = `mailto:${to}?cc=${cc}&subject=${subj}&body=${body}`;
      }

      // 1. Disparo síncrono ultra-seguro via <iframe> oculto (nunca navega nem deixa tela branca)
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.setAttribute('src', mailtoUrl);
      document.body.appendChild(iframe);
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 1000);

      // 2. Dispara geração e download do PDF em segundo plano
      handleGeneratePdf().catch((err) => {
        console.warn('Erro ao gerar PDF em segundo plano:', err);
      });
    } catch (err) {
      alert('Erro ao preparar e-mail: ' + err.message);
    }
  };

  const handleLaunchGmailWeb = () => {
    try {
      // Copia o texto integral para o clipboard caso o usuário precise colar no Gmail
      try {
        navigator.clipboard.writeText(`Para: ${client?.email || ''}\nAssunto: ${emailSubject}\n\n${emailBody}`);
      } catch (_) {}

      const to = encodeURIComponent(client?.email || '');
      const cc = client?.additionalEmail ? encodeURIComponent(client.additionalEmail) : '';
      const subj = encodeURIComponent(emailSubject);

      // Orçamento estrito para o endpoint do Gmail não devolver tela branca por URI Too Long (< 1800 chars)
      const baseLen = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}${cc ? `&cc=${cc}` : ''}&su=${subj}&body=`.length;
      const budget = Math.max(200, 1800 - baseLen);
      let safeBody = emailBody;
      if (encodeURIComponent(safeBody).length > budget) {
        let truncated = safeBody;
        while (encodeURIComponent(truncated + '\n\n[Mensagem completa no Demonstrativo anexo]').length > budget && truncated.length > 50) {
          truncated = truncated.substring(0, truncated.length - 50);
        }
        safeBody = truncated + '\n\n[Mensagem completa no Demonstrativo anexo]';
      }
      const body = encodeURIComponent(safeBody);

      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}${cc ? `&cc=${cc}` : ''}&su=${subj}&body=${body}`;

      // Abre síncrono no clique do usuário (100% livre de bloqueios ou abas em branco)
      window.open(gmailUrl, '_blank');

      // Dispara geração e download do PDF em segundo plano
      handleGeneratePdf().catch((err) => {
        console.warn('Erro ao gerar PDF em segundo plano:', err);
      });
    } catch (err) {
      alert('Erro ao abrir Gmail: ' + err.message);
    }
  };

  const handleCopyEmailText = () => {
    navigator.clipboard.writeText(`Assunto: ${emailSubject}\n\n${emailBody}`);
    setCopiedEmailBody(true);
    setTimeout(() => setCopiedEmailBody(false), 2500);
  };

  const [isSendingDirectEmail, setIsSendingDirectEmail] = useState(false);

  const handleSendDirectSmtpEmail = async () => {
    if (!client?.email) {
      alert('Por favor, informe o e-mail do cliente destinatário.');
      return;
    }

    if (!isSmtpConfigured()) {
      alert('Servidor SMTP não configurado!\n\nPor favor, acesse a aba "Configurações" e vincule seu servidor SMTP (Host, Usuário e Senha) para enviar faturas e demonstrativos diretamente.');
      return;
    }

    try {
      setIsSendingDirectEmail(true);

      const safeClientName = (client.name || 'Cliente').replace(/[^a-zA-Z0-9]/g, '_');
      const safePeriod = (selectedMonth || 'periodo').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Demonstrativo_${safeClientName}_${safePeriod}.pdf`;

      // 1. Gera o PDF oficial em memória
      const doc = await generateInvoicePdf({
        client,
        entries: clientEntries,
        financials,
        selectedMonth,
        company: companyInfo
      });

      // 2. Extrai base64 do PDF
      const dataUri = doc.output('datauristring');
      const pdfBase64 = dataUri.split(',')[1];

      // 3. Transmite o e-mail diretamente via SMTP com o demonstrativo anexo
      await sendDirectEmail({
        to: client.email,
        cc: client.additionalEmail || '',
        subject: emailSubject,
        body: emailBody,
        pdfBase64,
        pdfFilename: filename
      });

      // 4. Também salva o PDF localmente
      try {
        doc.save(filename);
      } catch (_) {}

      alert(`✓ Demonstrativo enviado com sucesso diretamente via SMTP para ${client.email} com o PDF anexo!`);
      setIsEmailModalOpen(false);
    } catch (err) {
      alert('Erro no envio direto via SMTP: ' + err.message);
    } finally {
      setIsSendingDirectEmail(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      
      {/* Page Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-title text-2xl font-bold text-gray-900">Faturamento e Relatórios</h1>
          <p className="text-sm text-gray-500">Gere faturas comerciais e demonstrativos de serviços (exportação em PDF 100% preto/cinza).</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button 
            className="flex items-center gap-1.5 px-4 py-2 bg-yellow-400 text-gray-950 rounded-lg text-xs font-extrabold hover:bg-yellow-500 shadow-xs transition-all cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed" 
            onClick={handleGeneratePdf} 
            disabled={!client || (client.contractType === 'hourly' && clientEntries.length === 0) || isGeneratingPdf}
            title="Baixar PDF do demonstrativo formatado"
          >
            <Download size={15} /> {isGeneratingPdf ? 'Baixando PDF...' : 'Baixar Demonstrativo (PDF)'}
          </button>

          <button 
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-xs transition-colors cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed" 
            onClick={handleGenerateAsaasBilling} 
            disabled={!client || (client.contractType === 'hourly' && clientEntries.length === 0) || isGeneratingAsaas}
            title="Gerar cobrança no Asaas e anexar o PDF automaticamente"
          >
            <CreditCard size={15} /> {isGeneratingAsaas ? 'Gerando Cobrança...' : asaasBilling ? 'Regerar Cobrança Asaas' : 'Gerar Cobrança Asaas'}
          </button>

          <button 
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-xs transition-colors cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed" 
            onClick={handleOpenEmailModal} 
            disabled={!client || (client.contractType === 'hourly' && clientEntries.length === 0)}
            title="Enviar e-mail para o cliente com demonstrativo e link de pagamento"
          >
            <Send size={14} /> Enviar por E-mail
          </button>
        </div>
      </div>

      {/* Filter panel inside App */}
      <div className="no-print bg-white border border-gray-150 rounded-xl p-5 shadow-xs">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold tracking-wider uppercase pr-2">
            <Calendar size={14} />
            <span>Selecionar Fatura</span>
          </div>

          <select 
            className="bg-white border border-gray-200 rounded-lg py-1.5 px-3 text-xs font-semibold text-gray-700 focus:outline-none focus:border-yellow-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            disabled={filteredClients.length === 0}
          >
            {filteredClients.length === 0 ? (
              <option value="">Nenhum cliente disponível</option>
            ) : (
              filteredClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
            )}
          </select>

          <select 
            className="bg-white border border-gray-200 rounded-lg py-1.5 px-3 text-xs font-semibold text-gray-700 focus:outline-none focus:border-yellow-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            disabled={uniqueMonths.length === 0}
          >
            {uniqueMonths.length === 0 ? (
              <option value="">Nenhum mês de CSV importado</option>
            ) : (
              uniqueMonths.map(m => (
                <option key={m} value={m}>{getMonthNamePT(m)}</option>
              ))
            )}
          </select>

          {/* Campo para alterar a data de vencimento (Tons de cinza) */}
          {selectedMonth && (
            <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-lg py-1 px-3 shadow-2xs">
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                <Calendar size={13} className="text-gray-500 shrink-0" />
                <span>Vencimento:</span>
              </span>
              <input 
                type="date" 
                value={customDueDate || getDefaultDueDateForMonth(selectedMonth)}
                onChange={(e) => handleDueDateChange(e.target.value)}
                className="bg-white border border-gray-300 rounded px-2 py-0.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-400 cursor-pointer"
                title="Alterar data de vencimento para o demonstrativo (PDF) e cobrança Asaas"
              />
            </div>
          )}

          {client && (
            <div className="text-xs font-semibold text-gray-500 flex items-center gap-1 sm:pl-3 sm:border-l sm:border-gray-200">
              Visualizando faturáveis: <span className="text-yellow-600 font-bold">{clientEntries.length} demandas ({financials.billableHours.toFixed(2).replace('.', ',')}h)</span> de {allEntriesCount} lançamentos totais.
            </div>
          )}
        </div>
      </div>

      {/* Document / On-Screen Layout Container */}
      {uniqueMonths.length === 0 ? (
        <div className="bg-white border border-gray-150 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-2">
          <p className="text-gray-600 font-semibold text-sm">Nenhum CSV foi importado no sistema ainda.</p>
          <p className="text-gray-400 text-xs">Utilize o botão "Importar CSV" no topo para carregar suas horas do Planyway e visualizar as faturas.</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-white border border-gray-150 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-2">
          <p className="text-gray-400 text-sm">Não há faturamentos ou demandas registradas neste mês.</p>
        </div>
      ) : !client ? (
        <div className="bg-white border border-gray-150 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-2">
          <p className="text-gray-400 text-sm">Selecione um cliente para carregar a fatura.</p>
        </div>
      ) : (
        <div className="print-container w-full">
          <div 
            id="invoice-screen-card" 
            className="print-card bg-white border border-gray-150 rounded-2xl shadow-xs text-gray-800 w-full font-sans leading-relaxed"
          >
            
            {/* ═══════ SEÇÃO 1: HEADER (Dados da Empresa + Metadados do Documento) ═══════ */}
            <div className="px-8 sm:px-12 md:px-14 pt-8 sm:pt-12 md:pt-14 pb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b-2 border-gray-200 pb-6">
                
                {/* Left Side: Brand & Company Legal Info */}
                <div className="flex flex-col gap-2 max-w-sm">
                  <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain shrink-0" />
                    <div>
                      <h2 className="font-title text-lg font-bold text-gray-900 leading-tight">{company.brandName}</h2>
                      <p className="text-[10px] text-gray-500 font-semibold tracking-widest uppercase">{company.brandSubtitle}</p>
                    </div>
                  </div>

                  <div className="text-[11px] text-gray-500 leading-relaxed mt-1.5 space-y-0.5">
                    <p className="font-semibold text-gray-700">{company.legalName}</p>
                    {company.cnpj && <p>CNPJ: {formatCpfCnpj(company.cnpj)}</p>}
                    {company.city && <p>{company.city}</p>}
                    <p>{company.email} | {company.phone}</p>
                  </div>
                </div>

                {/* Right Side: Document Title & Period */}
                <div className="flex flex-col sm:items-end text-left sm:text-right gap-1 max-w-sm">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-700 bg-gray-100 px-3 py-1 rounded-md border border-gray-300 inline-block">
                    Timesheet
                  </span>
                  <h3 className="font-title text-xl font-extrabold text-gray-900 uppercase mt-1">
                    {getMonthNamePT(selectedMonth)}
                  </h3>

                  <div className="text-[11px] text-gray-500 font-medium flex flex-wrap sm:justify-end gap-x-3 gap-y-0.5 mt-1.5">
                    <span>Emissão: <strong className="text-gray-900">{issueDateStr}</strong></span>
                    <span className="text-gray-300">|</span>
                    <span>Vencimento: <strong className="text-gray-900 font-bold">{dueDateStr}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* ═══════ SEÇÃO 2: TOMADOR DOS SERVIÇOS / CLIENTE ═══════ */}
            <div className="px-8 sm:px-12 md:px-14 pb-6">
              <div className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-xl p-5 w-full">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                  <span className="text-yellow-500 font-black text-xs">›</span> Tomador dos Serviços / Cliente
                </p>

                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  {/* Left: Name, CNPJ, Address */}
                  <div className="flex flex-col gap-1 flex-grow">
                    <h4 className="text-base font-extrabold text-gray-950 leading-tight">{client.name}</h4>
                    
                    {client.cnpj && (
                      <p className="font-mono text-xs text-gray-600">
                        CNPJ / CPF: <span className="text-gray-900 font-semibold">{formatCpfCnpj(client.cnpj)}</span>
                      </p>
                    )}
                    {client.address && (
                      <p className="text-xs text-gray-500 flex items-start gap-1 mt-0.5">
                        <MapPin size={12} className="shrink-0 mt-0.5 text-gray-400" />
                        <span>{client.address}</span>
                      </p>
                    )}
                  </div>

                  {/* Right: Contacts */}
                  <div className="flex flex-col gap-1 text-xs sm:text-right shrink-0 border-t sm:border-t-0 border-gray-200 pt-2 sm:pt-0 w-full sm:w-auto">
                    {client.email && (
                      <p className="flex sm:justify-end items-center gap-1.5 text-gray-600">
                        <Mail size={12} className="text-gray-400 shrink-0" />
                        <span>E-mail: <strong className="text-gray-900">{client.email}</strong></span>
                      </p>
                    )}
                    {client.additionalEmail && (
                      <p className="flex sm:justify-end items-center gap-1.5 text-gray-400 text-[11px]">
                        <span>Cópia (CC): {client.additionalEmail}</span>
                      </p>
                    )}
                    {client.phone && (
                      <p className="flex sm:justify-end items-center gap-1.5 text-gray-600">
                        <Phone size={12} className="text-gray-400 shrink-0" />
                        <span>Telefone: <strong className="text-gray-900">{formatPhone(client.phone)}</strong></span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ═══════ SEÇÃO 3: TABELA DE SERVIÇOS PRESTADOS ═══════ */}
            <div className="px-8 sm:px-12 md:px-14 pb-6">
              <div className="flex justify-between items-end mb-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="text-yellow-500 font-black text-xs">›</span> Detalhamento dos Serviços Prestados
                </p>
                <span className="text-[11px] font-semibold text-gray-400">
                  {clientEntries.length} {clientEntries.length === 1 ? 'demanda faturável' : 'demandas faturáveis'}
                </span>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-900 text-white font-semibold">
                      <th className="py-3 px-4 w-28">Data</th>
                      <th className="py-3 px-4">Demanda / Atividade Entregue</th>
                      <th className="py-3 px-4 text-right w-24">Horas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    {clientEntries.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="py-8 text-center text-gray-400 italic">
                          Nenhum lançamento faturável registrado neste período para este cliente.
                        </td>
                      </tr>
                    ) : (
                      clientEntries.map((entry, idx) => (
                        <tr key={entry.id || idx} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-3 px-4 text-gray-500 font-mono text-[11px]">
                            {formatDate(entry.deliveryDate || entry.requestDate)}
                          </td>
                          <td className="py-3 px-4 font-semibold text-gray-800">
                            {entry.description}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-gray-900">
                            {Number(entry.hours || 0).toFixed(2).replace('.', ',')}h
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {clientEntries.length > 0 && (
                    <tfoot>
                      <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold text-gray-900">
                        <td colSpan="2" className="py-3 px-4 text-right text-gray-600">Total de Horas Técnicas:</td>
                        <td className="py-3 px-4 text-right text-gray-950 font-extrabold">
                          {financials.billableHours.toFixed(2).replace('.', ',')}h
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* ═══════ SEÇÃO 4: RESUMO FINANCEIRO (Boxes Alinhados pelo Topo) ═══════ */}
            {clientEntries.length > 0 && (
              <div className="px-8 sm:px-12 md:px-14 pb-6">
                <div className="border-t-2 border-gray-200 pt-6 flex flex-col gap-3">
                  
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="text-gray-400 font-black text-xs">›</span> Resumo Financeiro
                  </p>

                  <div className="flex flex-col sm:flex-row gap-5 items-stretch">
                    
                    {/* LEFT BOX: Payment / Asaas PIX (100% Preto e Branco / Neutro) */}
                    <div className="flex-grow min-w-0">
                      {asaasBilling ? (
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex flex-col gap-4 h-full">
                          <div className="flex items-start gap-4">
                            {/* QR Code */}
                            <div className="w-36 h-36 bg-white border border-gray-200 rounded-xl p-2 flex items-center justify-center shrink-0 shadow-sm">
                              {asaasBilling.qrCodeImage ? (
                                <img src={asaasBilling.qrCodeImage} alt="QR Code PIX Asaas" className="w-full h-full object-contain" />
                              ) : (
                                <svg className="w-full h-full text-gray-900" viewBox="0 0 100 100" fill="currentColor">
                                  <rect x="10" y="10" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="6" />
                                  <rect x="15" y="15" width="15" height="15" />
                                  <rect x="65" y="10" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="6" />
                                  <rect x="70" y="15" width="15" height="15" />
                                  <rect x="10" y="65" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="6" />
                                  <rect x="15" y="70" width="15" height="15" />
                                  <rect x="45" y="20" width="10" height="10" />
                                  <rect x="45" y="45" width="10" height="10" />
                                  <rect x="20" y="45" width="10" height="10" />
                                  <rect x="75" y="45" width="15" height="10" />
                                  <rect x="70" y="70" width="20" height="20" />
                                  <rect x="45" y="75" width="15" height="10" />
                                </svg>
                              )}
                            </div>

                            {/* Payment Details */}
                            <div className="flex flex-col gap-1.5 flex-grow text-xs">
                              <div className="flex items-center gap-1.5 text-gray-950 font-bold">
                                <CheckCircle2 size={16} className="text-gray-700 shrink-0" />
                                <span>Cobrança Integrada ao Asaas</span>
                              </div>
                              <p className="text-[11px] text-gray-600 leading-snug">
                                Escaneie o QR Code ao lado para pagar via PIX instantâneo.
                              </p>
                              <div className="flex items-center gap-1.5 text-[11px] mt-0.5">
                                <span className="font-semibold text-gray-700">Vencimento:</span>
                                <span className="text-gray-900 font-bold bg-white px-2.5 py-0.5 rounded border border-gray-300">
                                  {dueDateStr}
                                </span>
                              </div>
                              
                              {asaasBilling.invoiceUrl && (
                                <a 
                                  href={asaasBilling.invoiceUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-900 hover:text-black underline mt-1"
                                >
                                  <span>Acessar Fatura Completa Online</span>
                                  <ExternalLink size={12} />
                                </a>
                              )}

                              {asaasBilling.invoiceScheduled && (
                                <div className="flex items-center gap-1.5 text-[10px] text-gray-800 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-md font-semibold mt-1">
                                  <CheckCircle2 size={13} className="text-gray-700 shrink-0" />
                                  <span>NFS-e agendada (emissão automática ao receber pagamento)</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* PIX Copia e Cola */}
                          {asaasBilling.pixCopiaCola && (
                            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                              <input 
                                type="text" 
                                readOnly 
                                value={asaasBilling.pixCopiaCola} 
                                className="text-[10px] text-gray-600 bg-transparent flex-grow outline-none font-mono truncate"
                              />
                              <button 
                                onClick={handleCopyPix}
                                className="flex items-center gap-1 text-[10px] font-bold text-gray-800 hover:text-black cursor-pointer shrink-0"
                                title="Copiar Código PIX"
                              >
                                {copiedPix ? <Check size={12} className="text-gray-700" /> : <Copy size={12} />}
                                <span>{copiedPix ? 'Copiado!' : 'Copiar PIX'}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col justify-between gap-3 p-5 bg-gray-50 border border-gray-200 rounded-xl h-full">
                          <p className="text-xs text-gray-600">Faturamento via link de cobrança digital (Asaas / PIX / Boleto bancário).</p>
                          <p className="text-xs font-bold text-gray-800">
                            Vencimento: <span className="text-gray-900 bg-gray-100 px-2.5 py-0.5 rounded border border-gray-300">{dueDateStr}</span>
                          </p>
                          <button 
                            onClick={handleGenerateAsaasBilling}
                            className="mt-2 inline-flex items-center gap-1.5 self-start text-xs text-gray-800 hover:text-black font-bold cursor-pointer"
                          >
                            <CreditCard size={14} />
                            <span>Clique em "Gerar Cobrança Asaas" para anexar o QR Code PIX aqui</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* RIGHT BOX: Financial Breakdown */}
                    <div className="w-full sm:w-[310px] shrink-0">
                      <div className="flex flex-col justify-between gap-3 p-5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 h-full">
                        <div className="flex justify-between items-center">
                          <span>Total de Horas Técnicas:</span>
                          <strong className="text-gray-950 font-black text-sm">{financials.billableHours.toFixed(2).replace('.', ',')}h</strong>
                        </div>

                        {financials.hourlyRate > 0 && (
                          <div className="flex justify-between items-center text-gray-500 text-[11px]">
                            <span>Valor por Hora:</span>
                            <span>{formatCurrency(financials.hourlyRate)}/h</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center border-t border-gray-200 pt-3 text-sm font-bold text-gray-950">
                          <span>Valor Total Faturado:</span>
                          <span className="text-gray-950 font-title text-xl font-black">{formatCurrency(financials.totalAmount)}</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* ═══════ SEÇÃO 5: FOOTER / WATERMARK ═══════ */}
            <div className="px-8 sm:px-12 md:px-14 pb-8 sm:pb-12 md:pb-14">
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-gray-200 pt-8 mt-4 text-[10px] text-gray-400 gap-2">
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="Logo" className="w-5 h-5 opacity-40 grayscale" />
                  <span>{company.brandName} | {company.brandSubtitle} | {company.website}</span>
                </div>
                <span>{company.email} | {company.phone}</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal de Envio por E-mail */}
      {isEmailModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEmailModalOpen(false);
          }}
        >
          <div 
            className="bg-white border border-gray-200 rounded-2xl p-6 shadow-2xl max-w-xl w-full flex flex-col gap-4 animate-in fade-in-0 zoom-in-95 my-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Mail size={18} className="text-indigo-600" />
                <h3 className="font-title text-base font-bold text-gray-900">Enviar Demonstrativo por E-mail</h3>
              </div>
              <button 
                onClick={() => setIsEmailModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 border border-gray-150 p-3 rounded-xl">
                <div>
                  <span className="text-gray-500 font-semibold">Destinatário Principal:</span>
                  <p className="font-bold text-gray-900">{client?.email || '(E-mail não cadastrado)'}</p>
                </div>
                <div>
                  <span className="text-gray-500 font-semibold">Cópia (CC Adicional):</span>
                  <p className="font-bold text-gray-900">{client?.additionalEmail || '(Nenhum)'}</p>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-gray-700">Assunto do E-mail:</label>
                <input 
                  type="text" 
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="border border-gray-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 bg-white"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-gray-700">Mensagem:</label>
                <textarea 
                  rows={8}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="border border-gray-200 rounded-lg p-3 text-xs leading-relaxed focus:outline-none focus:border-indigo-500 bg-white font-mono"
                />
              </div>

              <div className={`p-3 rounded-xl flex items-start gap-2.5 text-xs ${
                isSmtpConfigured() 
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-950' 
                  : 'bg-indigo-50 border border-indigo-200 text-indigo-950'
              }`}>
                {isSmtpConfigured() ? (
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <FileText size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                )}
                <div>
                  {isSmtpConfigured() ? (
                    <>
                      <strong className="block text-emerald-900">Servidor SMTP Vinculado & Pronto para Envio Direto</strong>
                      <span>
                        Ao clicar em <strong>"Enviar Direto (SMTP)"</strong>, a mensagem será transmitida diretamente através do seu servidor de e-mail com o demonstrativo em anexo PDF oficial: <strong>Demonstrativo_{client?.name ? client.name.replace(/[^a-zA-Z0-9_-]/g, '_').toUpperCase() : 'CLIENTE'}_{getMonthNamePT(selectedMonth).split(' ')[0]}_{selectedMonth.split('-')[0]}.pdf</strong>.
                      </span>
                    </>
                  ) : (
                    <>
                      <strong className="block text-indigo-900">Anexo em PDF Automático</strong>
                      <span>
                        O demonstrativo em PDF oficial será baixado automaticamente. Vincule seu servidor SMTP na aba <em>Configurações</em> para envio direto com o PDF em anexo sem sair do sistema.
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
              <button 
                type="button"
                onClick={handleCopyEmailText}
                className="px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                {copiedEmailBody ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                <span>{copiedEmailBody ? 'Texto Copiado!' : 'Copiar Texto'}</span>
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button 
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  className="px-3 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Fechar
                </button>

                <button 
                  type="button"
                  onClick={handleLaunchGmailWeb}
                  disabled={isSendingDirectEmail}
                  className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors disabled:opacity-60"
                  title="Abrir diretamente na versão Web do Gmail"
                >
                  <Mail size={14} className="text-red-600" />
                  <span>Abrir no Gmail</span>
                </button>

                <button 
                  type="button"
                  onClick={handleLaunchEmailClient}
                  disabled={isSendingDirectEmail}
                  className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors disabled:opacity-60"
                  title="Baixar PDF e abrir no aplicativo de e-mail padrão do sistema"
                >
                  <Mail size={14} className="text-gray-500" />
                  <span>App E-mail</span>
                </button>

                <button 
                  type="button"
                  onClick={handleSendDirectSmtpEmail}
                  disabled={isSendingDirectEmail}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
                  title="Enviar demonstrativo diretamente via servidor SMTP com o PDF anexo"
                >
                  {isSendingDirectEmail ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Transmitindo via SMTP...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Enviar Direto (SMTP)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
