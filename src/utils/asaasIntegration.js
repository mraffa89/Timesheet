/**
 * Utilitário de Integração Direta com a API do Asaas v3
 * Documentação oficial: https://docs.asaas.com/reference/comece-por-aqui
 */

export function getAsaasBaseUrl(env = 'sandbox') {
  // Sempre usa o proxy reverso do Nginx (em dev ou prod) para evitar bloqueio de CORS do navegador.
  return env === 'production' ? '/api/asaas-prod' : '/api/asaas-sandbox';
}

/**
 * Converte alíquotas decimais (com vírgula ou ponto, ex: "2,643981" ou "2.691535") para Number preciso
 */
export function parseIssRate(rawVal) {
  if (rawVal === undefined || rawVal === null) return null;
  const str = String(rawVal).trim().replace('%', '').trim();
  if (!str) return null;
  const normalized = str.replace(',', '.');
  const num = Number(normalized);
  return Number.isFinite(num) && num >= 0 && num <= 100 ? num : null;
}

/**
 * Formata alíquota de ISS em padrão brasileiro preservando casas decimais (ex: 2.643981 -> "2,643981")
 */
export function formatIssRatePtBr(val) {
  const num = parseIssRate(val);
  if (num === null) return '';
  return String(num).replace('.', ',');
}

/**
 * Verifica se o cliente recolhe o ISS na fonte como Tomador
 */
export function isClientTomadorIss(client) {
  if (!client) return false;
  if (client.retainIss !== undefined && client.retainIss !== null) {
    return Boolean(client.retainIss);
  }
  const rawClientName = (client.name || '').toLowerCase();
  return rawClientName.includes('pedro') && (rawClientName.includes('rafael') || rawClientName.includes('&'));
}

/**
 * Obtém o enquadramento de ISS e a alíquota efetiva aplicável ao cliente:
 * - Se Tomador retém ISS (retainIss = true): usa a alíquota cadastrada no cliente (client.issRate)
 * - Se Prestador recolhe ISS (retainIss = false): usa a alíquota mensal do Prestador definida nas Configurações
 */
export function getEffectiveClientIssInfo(client, providerIssOverride = undefined) {
  const retainIss = isClientTomadorIss(client);

  if (retainIss) {
    const clientRate = parseIssRate(client?.issRate);
    return {
      retainIss: true,
      effectiveIssRate: clientRate !== null ? clientRate : 2.0,
      source: clientRate !== null ? 'client' : 'default_tomador'
    };
  }

  const rawProviderRate = providerIssOverride !== undefined
    ? providerIssOverride
    : (localStorage.getItem('raffa_provider_iss_rate') || localStorage.getItem('raffa_asaas_iss_rate'));
  const providerRate = parseIssRate(rawProviderRate);

  return {
    retainIss: false,
    effectiveIssRate: providerRate !== null ? providerRate : 2.0,
    source: providerRate !== null ? 'provider_settings' : 'default_prestador'
  };
}

/**
 * Testa a conexão com a API do Asaas
 */
export async function testAsaasConnection(tokenParam, envParam) {
  const token = (tokenParam || localStorage.getItem('raffa_asaas_token') || '').trim();
  const env = (envParam || localStorage.getItem('raffa_asaas_env') || 'sandbox').trim();

  if (!token) {
    throw new Error('Chave de API do Asaas não configurada.');
  }

  const baseUrl = getAsaasBaseUrl(env);

  try {
    const response = await fetch(`${baseUrl}/customers?limit=1`, {
      method: 'GET',
      headers: {
        'access_token': token,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      let errorMsg = `Status ${response.status}: ${response.statusText}`;
      try {
        const errData = await response.json();
        if (errData.errors && errData.errors.length > 0) {
          errorMsg = errData.errors.map(e => e.description).join(', ');
        }
      } catch (e) {}

      if (response.status === 401) {
        throw new Error('Chave de API do Asaas inválida ou não autorizada. Verifique se a chave é válida e se o ambiente selecionado (Produção ou Sandbox) está correto.');
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Erro no teste de conexão com o Asaas:', error);
    throw error;
  }
}

/**
 * Busca um cliente no Asaas pelo CNPJ ou CPF
 */
export async function fetchAsaasCustomerByCnpj(cnpj) {
  const token = (localStorage.getItem('raffa_asaas_token') || '').trim();
  const env = (localStorage.getItem('raffa_asaas_env') || 'sandbox').trim();

  if (!token) {
    throw new Error('Chave de API do Asaas não configurada. Acesse Configurações para adicionar seu Token do Asaas.');
  }

  const cleanCnpj = (cnpj || '').replace(/[^0-9]/g, '');
  if (!cleanCnpj) {
    throw new Error('Por favor, informe um CNPJ ou CPF válido para a busca.');
  }

  const baseUrl = getAsaasBaseUrl(env);

  try {
    const response = await fetch(`${baseUrl}/customers?cpfCnpj=${cleanCnpj}`, {
      method: 'GET',
      headers: {
        'access_token': token,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      let errorMsg = `Erro ${response.status}: ${response.statusText}`;
      try {
        const errData = await response.json();
        if (errData.errors && errData.errors.length > 0) {
          errorMsg = errData.errors.map(e => e.description).join(', ');
        }
      } catch (e) {}

      if (response.status === 401) {
        throw new Error('Chave de API do Asaas inválida ou não autorizada. Verifique se o ambiente (Produção ou Sandbox) corresponde à chave.');
      }
      throw new Error(`Erro na API do Asaas: ${errorMsg}`);
    }

    const data = await response.json();
    if (data.data && data.data.length > 0) {
      const customer = data.data[0];

      // Monta o endereço formatado
      const addrParts = [];
      if (customer.address) addrParts.push(customer.address);
      if (customer.addressNumber) addrParts.push(`nº ${customer.addressNumber}`);
      if (customer.complement) addrParts.push(customer.complement);
      if (customer.province) addrParts.push(customer.province);
      const cityState = customer.cityName || customer.city;
      if (cityState) {
        addrParts.push(`${cityState}${customer.state ? '/' + customer.state : ''}`);
      }
      if (customer.postalCode) addrParts.push(`CEP: ${customer.postalCode}`);
      const formattedAddress = addrParts.join(', ');

      // Busca assinaturas ativas do cliente no Asaas para extrair o Fee Mensal Fixo (ex: contrato de 12 meses)
      let activeSubscription = null;
      try {
        const subResponse = await fetch(`${baseUrl}/subscriptions?customer=${customer.id}`, {
          method: 'GET',
          headers: {
            'access_token': token,
            'Content-Type': 'application/json'
          }
        });

        if (subResponse.ok) {
          const subData = await subResponse.json();
          if (subData.data && subData.data.length > 0) {
            // Prioriza assinaturas ativas (status === 'ACTIVE')
            const activeSubs = subData.data.filter(s => s.status === 'ACTIVE');
            const chosenSub = activeSubs.length > 0 ? activeSubs[0] : subData.data[0];
            
            if (chosenSub && chosenSub.value) {
              activeSubscription = {
                id: chosenSub.id,
                value: chosenSub.value,
                cycle: chosenSub.cycle,
                description: chosenSub.description || '',
                status: chosenSub.status,
                maxPayments: chosenSub.maxPayments || null,
                nextDueDate: chosenSub.nextDueDate || '',
                billingType: chosenSub.billingType
              };
            }
          }
        }
      } catch (errSub) {
        console.warn('Não foi possível consultar assinaturas do cliente no Asaas:', errSub);
      }

      return {
        success: true,
        id: customer.id,
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone || customer.mobilePhone || '',
        cnpj: customer.cpfCnpj || cleanCnpj,
        address: formattedAddress || '',
        subscription: activeSubscription,
        simulated: false
      };
    } else {
      throw new Error(`Nenhum cliente cadastrado no Asaas com o CNPJ/CPF ${cleanCnpj}.`);
    }
  } catch (error) {
    console.error('Erro na consulta do Asaas por CNPJ:', error);
    throw error;
  }
}

/**
 * Sincroniza todos os clientes cadastrados no Asaas, detectando assinaturas ativas e faturas futuras/pendentes
 */
export async function syncAllAsaasClients() {
  const token = (localStorage.getItem('raffa_asaas_token') || '').trim();
  const env = (localStorage.getItem('raffa_asaas_env') || 'sandbox').trim();

  if (!token) {
    throw new Error('Chave de API do Asaas não configurada. Acesse Configurações para adicionar seu Token do Asaas.');
  }

  const baseUrl = getAsaasBaseUrl(env);

  try {
    // 1. Busca todos os clientes do Asaas (com paginação até 500)
    let allCustomers = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore && offset < 500) {
      const custRes = await fetch(`${baseUrl}/customers?offset=${offset}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'access_token': token,
          'Content-Type': 'application/json'
        }
      });

      if (!custRes.ok) {
        let errorMsg = `Erro ${custRes.status}: ${custRes.statusText}`;
        try {
          const errData = await custRes.json();
          if (errData.errors && errData.errors.length > 0) {
            errorMsg = errData.errors.map(e => e.description).join(', ');
          }
        } catch (e) {}
        throw new Error(`Erro ao consultar clientes no Asaas: ${errorMsg}`);
      }

      const custText = await custRes.text();
      let custData;
      try {
        custData = JSON.parse(custText);
      } catch (e) {
        throw new Error(`Resposta inválida do Asaas (Status ${custRes.status}). Verifique se sua chave de API e ambiente estão corretos.`);
      }
      const batch = custData.data || [];
      allCustomers = allCustomers.concat(batch);

      if (custData.hasMore && batch.length === limit) {
        offset += limit;
      } else {
        hasMore = false;
      }
    }

    if (allCustomers.length === 0) {
      return {
        success: true,
        totalSynced: 0,
        activeCount: 0,
        inactiveCount: 0,
        clients: []
      };
    }

    // 2. Busca todas as assinaturas ativas
    const activeSubscriptionsMap = new Map(); // customerId -> subscription
    try {
      let subOffset = 0;
      let subHasMore = true;
      while (subHasMore && subOffset < 500) {
        const subRes = await fetch(`${baseUrl}/subscriptions?status=ACTIVE&offset=${subOffset}&limit=${limit}`, {
          method: 'GET',
          headers: {
            'access_token': token,
            'Content-Type': 'application/json'
          }
        });

        if (subRes.ok) {
          const subData = await subRes.json();
          const batch = subData.data || [];
          batch.forEach(sub => {
            if (sub.customer && !activeSubscriptionsMap.has(sub.customer)) {
              activeSubscriptionsMap.set(sub.customer, sub);
            }
          });

          if (subData.hasMore && batch.length === limit) {
            subOffset += limit;
          } else {
            subHasMore = false;
          }
        } else {
          subHasMore = false;
        }
      }
    } catch (errSub) {
      console.warn('Aviso ao buscar assinaturas ativas no Asaas:', errSub);
    }

    // 3. Busca cobranças pendentes e futuras da data atual em diante
    const activePaymentsCustomerSet = new Set();
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const payRes = await fetch(`${baseUrl}/payments?dueDate[ge]=${todayStr}&limit=100`, {
        method: 'GET',
        headers: {
          'access_token': token,
          'Content-Type': 'application/json'
        }
      });

      if (payRes.ok) {
        const payData = await payRes.json();
        (payData.data || []).forEach(p => {
          if (p.customer && ['PENDING', 'CONFIRMED', 'RECEIVED', 'OVERDUE'].includes(p.status)) {
            activePaymentsCustomerSet.add(p.customer);
          }
        });
      }
    } catch (errPay) {
      console.warn('Aviso ao buscar cobranças ativas no Asaas:', errPay);
    }

    // 4. Mapeia cada cliente do Asaas
    const processedClients = allCustomers.map(customer => {
      const addrParts = [];
      if (customer.address) addrParts.push(customer.address);
      if (customer.addressNumber) addrParts.push(`nº ${customer.addressNumber}`);
      if (customer.complement) addrParts.push(customer.complement);
      if (customer.province) addrParts.push(customer.province);
      const cityState = customer.cityName || customer.city;
      if (cityState) {
        addrParts.push(`${cityState}${customer.state ? '/' + customer.state : ''}`);
      }
      if (customer.postalCode) addrParts.push(`CEP: ${customer.postalCode}`);
      const formattedAddress = addrParts.join(', ');

      const sub = activeSubscriptionsMap.get(customer.id);
      const hasActivePayment = activePaymentsCustomerSet.has(customer.id);
      const hasActiveSubscription = !!sub;
      const isActive = hasActiveSubscription || hasActivePayment;

      const fixedFee = sub ? (parseFloat(sub.value) || 0) : 0;
      // Regra: se houver assinatura ativa no ASAAS -> 'fixed' (contrato fixo). Caso contrário -> 'hourly' (job avulso)
      const contractType = fixedFee > 0 ? 'fixed' : 'hourly';

      const defaultRate = parseFloat(localStorage.getItem('raffa_default_hourly_rate') || '200') || 200;

      return {
        asaasId: customer.id,
        name: customer.name,
        email: customer.email || '',
        cnpj: customer.cpfCnpj || '',
        phone: customer.phone || customer.mobilePhone || '',
        address: formattedAddress || '',
        contractType,
        fixedFee,
        hoursIncluded: fixedFee > 0 ? (fixedFee / defaultRate).toFixed(2) : '0',
        hourlyRate: defaultRate,
        isActive,
        hasActiveSubscription,
        subscriptionValue: fixedFee,
        subscriptionCycle: sub?.cycle || '',
        subscriptionPayments: sub?.maxPayments || null
      };
    });

    return {
      success: true,
      totalSynced: processedClients.length,
      activeCount: processedClients.filter(c => c.isActive).length,
      inactiveCount: processedClients.filter(c => !c.isActive).length,
      clients: processedClients
    };
  } catch (error) {
    console.error('Erro na sincronização em lote de clientes do Asaas:', error);
    throw error;
  }
}

/**
 * Cria cobrança no Asaas vinculada ao cliente e mês selecionado
 */
export async function createAsaasBilling(params = {}) {
  const token = params.apiKey || localStorage.getItem('raffa_asaas_token');
  const env = params.environment || localStorage.getItem('raffa_asaas_env') || 'sandbox';

  if (!token) {
    throw new Error('Chave de API do Asaas não configurada. Acesse Configurações para adicionar seu Token do Asaas.');
  }

  const clientName = params.client?.name || params.clientName || 'Cliente';
  const clientEmail = params.client?.email || params.clientEmail || '';
  const clientCnpj = (params.client?.cnpj || params.client?.cpfCnpj || '').replace(/[^0-9]/g, '');
  const clientPhone = params.client?.phone || params.clientPhone || '';
  const clientAddress = params.client?.address || '';
  const amount = params.financials?.totalAmount !== undefined 
    ? params.financials.totalAmount 
    : (params.amount || 0);
  const period = params.selectedMonth || params.period || '';

  if (amount <= 0) {
    throw new Error('O valor do faturamento deve ser maior que zero para gerar uma cobrança.');
  }

  const baseUrl = getAsaasBaseUrl(env);

  // Formata mês/ano para MM/AAAA (ex: 2026-07 -> 07/2026)
  let monthYearFormatted = period;
  if (period && period.includes('-')) {
    const p = period.split('-');
    if (p.length === 2) {
      monthYearFormatted = `${p[1]}/${p[0]}`;
    }
  }

  // Descrição do demonstrativo e fatura Asaas
  const description = `PRESTAÇÃO DE SERVIÇOS DE MARKETING - JOBS AVULSOS - ${monthYearFormatted}`;
  
  // Vencimento: personalizável pelo usuário ou padrão dia 10 do próximo mês (YYYY-MM-10)
  let dueDate = '';
  if (params.dueDate) {
    const rawDue = String(params.dueDate).trim();
    if (rawDue.includes('/')) {
      const parts = rawDue.split('/');
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          dueDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else if (parts[0].length === 4) {
          dueDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
      }
    } else if (rawDue.includes('-')) {
      const parts = rawDue.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          dueDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        } else {
          dueDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
    }
  }

  if (!dueDate) {
    const now = new Date();
    let nextMonth = now.getMonth() + 2;
    let nextYear = now.getFullYear();
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    dueDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-10`;
  }

  // Forma de pagamento no Asaas: 'BOLETO' (Boleto Bancário com PIX integrado no próprio boleto)
  const billingType = params.billingType || 'BOLETO';

  try {
    // 1. Busca se o cliente já existe no Asaas por CNPJ ou E-mail
    let customerId = '';
    let searchUrl = '';
    if (clientCnpj) {
      searchUrl = `${baseUrl}/customers?cpfCnpj=${encodeURIComponent(clientCnpj)}`;
    } else if (clientEmail) {
      searchUrl = `${baseUrl}/customers?email=${encodeURIComponent(clientEmail)}`;
    }
    
    if (searchUrl) {
      const searchResponse = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'access_token': token,
          'Content-Type': 'application/json'
        }
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.data && searchData.data.length > 0) {
          customerId = searchData.data[0].id;
        }
      }
    }

    // 2. Se o cliente não existir, cria o cliente automaticamente no Asaas
    if (!customerId) {
      const createCustBody = {
        name: clientName,
        email: clientEmail || undefined,
        cpfCnpj: clientCnpj || undefined,
        phone: clientPhone || undefined,
        address: clientAddress || undefined
      };

      const createCustResponse = await fetch(`${baseUrl}/customers`, {
        method: 'POST',
        headers: {
          'access_token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createCustBody)
      });

      if (!createCustResponse.ok) {
        let errorMsg = `Erro ${createCustResponse.status}: ${createCustResponse.statusText}`;
        try {
          const errData = await createCustResponse.json();
          if (errData.errors && errData.errors.length > 0) {
            errorMsg = errData.errors.map(e => e.description).join(', ');
          }
        } catch (e) {}
        throw new Error(`Erro ao cadastrar cliente no Asaas: ${errorMsg}`);
      }

      const createCustData = await createCustResponse.json();
      customerId = createCustData.id;
    }

    // 3. Cria a cobrança no Asaas (Cobrança direta com Boleto / PIX, sem 'perguntar ao cliente')
    const paymentResponse = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'access_token': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: billingType, // 'BOLETO' (Gera boleto bancário com PIX integrado)
        value: Number(amount.toFixed(2)),
        dueDate: dueDate,
        description: description,
        postalService: false
      })
    });

    if (!paymentResponse.ok) {
      let errorMsg = `Erro ${paymentResponse.status}: ${paymentResponse.statusText}`;
      try {
        const errData = await paymentResponse.json();
        if (errData.errors && errData.errors.length > 0) {
          errorMsg = errData.errors.map(e => e.description).join(', ');
        }
      } catch (e) {}
      throw new Error(`Erro ao gerar cobrança no Asaas: ${errorMsg}`);
    }

    const paymentData = await paymentResponse.json();
    
    // 4. Busca o QR Code e chave Copia e Cola do PIX para embutir no relatório
    const pixResponse = await fetch(`${baseUrl}/payments/${paymentData.id}/pixQrCode`, {
      method: 'GET',
      headers: {
        'access_token': token
      }
    }).catch(() => null);

    let pixCode = '';
    let pixQr = '';
    if (pixResponse && pixResponse.ok) {
      const pixData = await pixResponse.json();
      pixCode = pixData.payload;
      pixQr = pixData.encodedImage;
    }

    // 5. Agendamento automático da Nota Fiscal de Serviço (NFS-e) vinculada ao pagamento
    const initialIssInfo = getEffectiveClientIssInfo(params.client);
    let retainIss = initialIssInfo.retainIss;
    let effectiveIssRate = initialIssInfo.effectiveIssRate;
    let invoiceScheduled = false;
    let invoiceId = '';
    let invoiceStatus = '';
    let invoiceMessage = '';

    const autoNfeEnabled = localStorage.getItem('raffa_asaas_auto_nfe') !== 'false';
    if (autoNfeEnabled) {
      try {
        const nfeRes = await scheduleAsaasInvoiceForPayment({
          paymentId: paymentData.id,
          amount,
          period,
          dueDate,
          client: params.client,
          apiKey: token,
          environment: env
        });
        invoiceScheduled = nfeRes.invoiceScheduled;
        invoiceId = nfeRes.invoiceId || '';
        invoiceStatus = nfeRes.invoiceStatus || '';
        invoiceMessage = nfeRes.invoiceMessage || '';
        if (nfeRes.retainIss !== undefined) retainIss = nfeRes.retainIss;
        if (nfeRes.effectiveIssRate !== undefined) effectiveIssRate = nfeRes.effectiveIssRate;
      } catch (errNfe) {
        console.warn('Nota fiscal não agendada:', errNfe);
        invoiceMessage = `Aviso NFS-e: ${errNfe.message || 'Módulo fiscal de NFS-e não habilitado ou configurado no Asaas.'}`;
      }
    }

    return {
      success: true,
      billingId: paymentData.id,
      invoiceUrl: paymentData.invoiceUrl,
      pixCopiaCola: pixCode || '',
      qrCodeImage: pixQr ? `data:image/png;base64,${pixQr}` : null,
      dueDate,
      billingType,
      invoiceScheduled,
      invoiceId,
      invoiceStatus,
      invoiceMessage,
      retainIss,
      effectiveIssRate,
      simulated: false
    };

  } catch (error) {
    console.error('Erro no processamento da cobrança Asaas:', error);
    throw error;
  }
}

/**
 * Remove acentos e caracteres especiais de nomes de arquivos,
 * mantendo as letras corretas sem acento (ex: 'COLÉGIO' vira 'COLEGIO').
 * @param {string} str
 * @returns {string}
 */
export function sanitizeFileName(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Anexa o documento PDF do Demonstrativo de Serviços à cobrança criada no Asaas
 * @param {string} paymentId - ID da cobrança no Asaas
 * @param {Blob} pdfBlob - Blob binário do PDF gerado
 * @param {string} fileName - Nome do arquivo PDF (ex: Demonstrativo_CLIENTE_Mes_Ano.pdf)
 * @param {boolean} availableAfterPayment - Se true, restringe para após o pagamento. Padrão false (disponível a qualquer momento).
 */
export async function attachDocumentToAsaasPayment(paymentId, pdfBlob, fileName, availableAfterPayment = false) {
  const token = localStorage.getItem('raffa_asaas_token');
  const env = localStorage.getItem('raffa_asaas_env') || 'sandbox';

  if (!token || !paymentId || !pdfBlob) {
    return { success: false, error: 'Parâmetros insuficientes para upload do documento anexo.' };
  }

  const baseUrl = getAsaasBaseUrl(env);

  try {
    const formData = new FormData();
    const baseName = String(fileName || 'documento').replace(/\.pdf$/i, '');
    const cleanFileName = `${sanitizeFileName(baseName) || 'documento'}.pdf`;
    const file = new File([pdfBlob], cleanFileName, { type: 'application/pdf' });
    formData.append('file', file);
    formData.append('type', 'DOCUMENT');
    formData.append('availableAfterPayment', availableAfterPayment ? 'true' : 'false');

    const response = await fetch(`${baseUrl}/payments/${paymentId}/documents`, {
      method: 'POST',
      headers: {
        'access_token': token
      },
      body: formData
    });

    if (!response.ok) {
      let errorMsg = `Erro ${response.status}: ${response.statusText}`;
      try {
        const errData = await response.json();
        if (errData.errors && errData.errors.length > 0) {
          errorMsg = errData.errors.map(e => e.description).join(', ');
        }
      } catch (e) {}
      console.warn(`Não foi possível anexar o PDF à cobrança Asaas: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }

    const data = await response.json();
    return { success: true, documentId: data.id, fileName: cleanFileName };
  } catch (err) {
    console.error('Erro ao enviar documento anexo para o Asaas:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Consulta as configurações fiscais da conta do Asaas (compatível com o Portal Nacional da NFS-e desde 01/11).
 *IMPORTANTE: Não sobrescreve a alíquota mensal de ISS do Prestador configurada pelo usuário no sistema.
 * @param {string} [apiKey]
 * @param {string} [environment]
 * @returns {Promise<{issRate: number|null, municipalServiceId: string|null, municipalServiceName: string|null, municipalServiceCode: string|null, cnae: string|null, isNationalPortal: boolean}|null>}
 */
export async function fetchAsaasAccountFiscalInfo(apiKey, environment) {
  const token = (apiKey || localStorage.getItem('raffa_asaas_token') || '').trim();
  const env = (environment || localStorage.getItem('raffa_asaas_env') || 'sandbox').trim();
  const baseUrl = getAsaasBaseUrl(env);

  if (!token) return null;

  const forceNationalPortal = localStorage.getItem('raffa_asaas_national_portal') !== 'false';
  let isNationalPortal = forceNationalPortal;
  let issRate = null;
  let municipalServiceId = null;
  let municipalServiceName = null;
  let municipalServiceCode = null;
  let cnae = null;

  // 1. Tenta buscar lista dinâmica de serviços municipais apenas se não estiver em modo Portal Nacional.
  // No Portal Nacional (obrigatório desde 01/11), o Asaas não disponibiliza /fiscalInfo/services e exige municipalServiceId = null.
  if (!forceNationalPortal) {
    try {
      const srvRes = await fetch(`${baseUrl}/fiscalInfo/services?limit=10`, {
        method: 'GET',
        headers: { 'access_token': token }
      });
      if (srvRes.ok) {
        const srvData = await srvRes.json();
        if (srvData?.data && srvData.data.length > 0) {
          const srv = srvData.data[0];
          isNationalPortal = false;
          municipalServiceId = srv.id || null;
          municipalServiceName = srv.description || null;
          if (srv.serviceCode) municipalServiceCode = srv.serviceCode;
          if (srv.issTaxRate !== undefined && srv.issTaxRate !== null && !isNaN(Number(srv.issTaxRate))) {
            issRate = Number(srv.issTaxRate);
          }
        } else {
          isNationalPortal = true;
        }
      } else {
        isNationalPortal = true;
      }
    } catch (e) {
      isNationalPortal = true;
      console.warn("Aviso ao buscar serviços fiscais no Asaas:", e);
    }
  }

  // Se estiver no Portal Nacional, limpa qualquer ID municipal legado (anterior a 01/11)
  if (isNationalPortal) {
    municipalServiceId = null;
    localStorage.removeItem('raffa_asaas_municipal_service_id');
  }

  // 2. Consulta as informações fiscais gerais configuradas na conta do Asaas (GET /fiscalInfo)
  try {
    const fiRes = await fetch(`${baseUrl}/fiscalInfo`, {
      method: 'GET',
      headers: { 'access_token': token }
    });
    if (fiRes.ok) {
      const fiData = await fiRes.json();
      if (fiData) {
        if (fiData.cnae) cnae = String(fiData.cnae);
        if (fiData.municipalServiceCode) {
          municipalServiceCode = String(fiData.municipalServiceCode);
        } else if (fiData.serviceListItem && !municipalServiceCode) {
          municipalServiceCode = String(fiData.serviceListItem);
        }
        if (fiData.municipalServiceName && !municipalServiceName) {
          municipalServiceName = String(fiData.municipalServiceName);
        }
      }
    }
  } catch (e) {
    console.warn("Aviso ao consultar /fiscalInfo no Asaas:", e);
  }

  // 3. Consulta notas fiscais recentes/agendadas na conta (priorizando notas do Portal Nacional sem municipalServiceId)
  try {
    const invRes = await fetch(`${baseUrl}/invoices?limit=10`, {
      method: 'GET',
      headers: { 'access_token': token }
    });
    if (invRes.ok) {
      const invData = await invRes.json();
      if (invData?.data && invData.data.length > 0) {
        const portalInvoice = invData.data.find(i => !i.municipalServiceId && i.municipalServiceCode);
        const anyCodeInvoice = invData.data.find(i => i.municipalServiceCode);
        const chosenInv = portalInvoice || anyCodeInvoice || invData.data[0];

        if (chosenInv?.municipalServiceCode) {
          // Prioriza o código real de uma nota já agendada/emitida no Portal Nacional (ex: 6 dígitos da Tabela Nacional)
          if (portalInvoice || !municipalServiceCode) {
            municipalServiceCode = String(chosenInv.municipalServiceCode);
          }
        }
        if (chosenInv?.municipalServiceName && !municipalServiceName) {
          municipalServiceName = String(chosenInv.municipalServiceName);
        }
        if (!isNationalPortal && !municipalServiceId && chosenInv?.municipalServiceId) {
          municipalServiceId = chosenInv.municipalServiceId;
        }
        if (issRate === null && chosenInv?.taxes?.iss !== undefined && chosenInv?.taxes?.iss !== null && !isNaN(Number(chosenInv.taxes.iss))) {
          issRate = Number(chosenInv.taxes.iss);
        }
      }
    }
  } catch (e) {
    console.warn("Aviso ao buscar histórico de notas no Asaas:", e);
  }

  // 4. Caso ainda não tenha encontrado o código do serviço, verifica configurações de NFS-e de assinaturas ativas
  if (!municipalServiceCode) {
    try {
      const subRes = await fetch(`${baseUrl}/subscriptions?status=ACTIVE&limit=5`, {
        method: 'GET',
        headers: { 'access_token': token }
      });
      if (subRes.ok) {
        const subData = await subRes.json();
        const subs = subData?.data || [];
        for (const sub of subs) {
          const setRes = await fetch(`${baseUrl}/subscriptions/${sub.id}/invoiceSettings`, {
            method: 'GET',
            headers: { 'access_token': token }
          });
          if (setRes.ok) {
            const setJson = await setRes.json();
            if (setJson?.municipalServiceCode) {
              municipalServiceCode = String(setJson.municipalServiceCode);
              if (setJson.municipalServiceName && !municipalServiceName) {
                municipalServiceName = String(setJson.municipalServiceName);
              }
              break;
            }
          }
        }
      }
    } catch (_) {}
  }

  // Inicializa a alíquota do prestador apenas se o usuário nunca tiver configurado nenhuma no sistema
  const existingProviderRate = localStorage.getItem('raffa_provider_iss_rate') || localStorage.getItem('raffa_asaas_iss_rate');
  if (!existingProviderRate && issRate !== null) {
    localStorage.setItem('raffa_provider_iss_rate', issRate.toString());
    localStorage.setItem('raffa_asaas_iss_rate', issRate.toString());
  }

  if (!isNationalPortal && municipalServiceId) {
    localStorage.setItem('raffa_asaas_municipal_service_id', municipalServiceId);
  }
  if (municipalServiceName) {
    localStorage.setItem('raffa_asaas_municipal_service_name', municipalServiceName);
  }
  if (municipalServiceCode) {
    localStorage.setItem('raffa_asaas_municipal_service_code', municipalServiceCode);
  }

  return {
    issRate,
    municipalServiceId: isNationalPortal ? null : municipalServiceId,
    municipalServiceName,
    municipalServiceCode,
    cnae,
    isNationalPortal
  };
}

/**
 * Agenda a emissão de Nota Fiscal de Serviço (NFS-e) vinculada a uma cobrança no Asaas.
 * Totalmente compatível com o Portal Nacional da NFS-e (vigente desde 01/11) e com separação estrita:
 * - Prestador recolhe ISS -> usa a alíquota mensal do Prestador configurada em Configurações
 * - Tomador retém ISS -> usa a alíquota do Tomador cadastrada no Cliente (ex: Colégio Pedro e Rafael)
 */
export async function scheduleAsaasInvoiceForPayment({
  paymentId,
  amount,
  period,
  dueDate,
  client,
  apiKey,
  environment
}) {
  const token = (apiKey || localStorage.getItem('raffa_asaas_token') || '').trim();
  const env = (environment || localStorage.getItem('raffa_asaas_env') || 'sandbox').trim();
  const baseUrl = getAsaasBaseUrl(env);

  if (!token || !paymentId) {
    return { 
      success: false, 
      invoiceScheduled: false, 
      error: 'Parâmetros insuficientes para agendamento da NFS-e.' 
    };
  }

  // 1. Formata período (ex: 2026-09 -> 09/2026)
  let monthYearFormatted = period || '';
  if (monthYearFormatted && monthYearFormatted.includes('-')) {
    const parts = monthYearFormatted.split('-');
    if (parts.length === 2) {
      monthYearFormatted = `${parts[1]}/${parts[0]}`;
    }
  }

  // 2. Determina se o cliente retém ISS (Tomador) ou se o imposto é recolhido pelo Prestador, com suas respectivas alíquotas
  const issInfo = getEffectiveClientIssInfo(client);
  const isTomadorIss = issInfo.retainIss;
  const effectiveIssRate = issInfo.effectiveIssRate;

  const invoiceDescription = `PRESTAÇÃO DE SERVIÇOS DE MARKETING - JOBS AVULSOS - ${monthYearFormatted}`;

  // 3. Consulta configurações fiscais na conta do Asaas (respeitando Portal Nacional)
  const useNationalPortal = localStorage.getItem('raffa_asaas_national_portal') !== 'false';
  const manualServiceCode = (localStorage.getItem('raffa_asaas_service_code_manual') || '').trim();
  const manualServiceName = (localStorage.getItem('raffa_asaas_service_name_manual') || '').trim();

  let accountFiscal = null;
  try {
    accountFiscal = await fetchAsaasAccountFiscalInfo(token, env);
  } catch (e) {
    console.warn("Aviso ao consultar dados fiscais ao vivo no Asaas:", e);
  }

  const isNationalPortal = useNationalPortal || accountFiscal?.isNationalPortal !== false;
  const municipalServiceId = isNationalPortal
    ? null
    : (accountFiscal?.municipalServiceId || localStorage.getItem('raffa_asaas_municipal_service_id') || null);

  const municipalServiceCode = manualServiceCode || accountFiscal?.municipalServiceCode || localStorage.getItem('raffa_asaas_municipal_service_code') || null;
  const municipalServiceName = manualServiceName || accountFiscal?.municipalServiceName || localStorage.getItem('raffa_asaas_municipal_service_name') || 'Prestação de Serviços de Marketing';

  // 4. Conforme especificação OpenAPI InvoiceTaxesRequestDTO do Asaas, todos os 7 campos de taxes são enviados com precisão decimal
  const taxesPayload = {
    retainIss: Boolean(isTomadorIss),
    iss: Number(effectiveIssRate),
    pis: 0,
    cofins: 0,
    csll: 0,
    inss: 0,
    ir: 0
  };

  const todayIso = new Date().toISOString().split('T')[0];
  const effectiveDate = dueDate && dueDate >= todayIso ? dueDate : todayIso;

  const invoicePayload = {
    payment: paymentId,
    serviceDescription: invoiceDescription,
    observations: `Serviços de marketing prestados em ${monthYearFormatted}. Cobrança Asaas: ${paymentId}`,
    value: Number(Number(amount).toFixed(2)),
    deductions: 0,
    effectiveDate: effectiveDate,
    municipalServiceName: municipalServiceName,
    taxes: taxesPayload
  };

  // Regra Asaas para Portal Nacional vs Lista Municipal:
  // Nunca enviar municipalServiceId e municipalServiceCode simultaneamente.
  // No Portal Nacional, municipalServiceId DEVE ser null e usa-se municipalServiceCode.
  if (!isNationalPortal && municipalServiceId) {
    invoicePayload.municipalServiceId = municipalServiceId;
    invoicePayload.municipalServiceCode = null;
  } else {
    invoicePayload.municipalServiceId = null;
    if (municipalServiceCode) {
      invoicePayload.municipalServiceCode = String(municipalServiceCode).trim();
    }
  }

  const formattedIssDisplay = formatIssRatePtBr(effectiveIssRate);

  try {
    const invoiceResponse = await fetch(`${baseUrl}/invoices`, {
      method: 'POST',
      headers: {
        'access_token': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invoicePayload)
    });

    if (invoiceResponse.ok) {
      const invoiceData = await invoiceResponse.json();
      return {
        success: true,
        invoiceScheduled: true,
        invoiceId: invoiceData.id,
        invoiceStatus: invoiceData.status || 'SCHEDULED',
        effectiveIssRate,
        retainIss: isTomadorIss,
        invoiceMessage: `NFS-e agendada com sucesso via ${isNationalPortal ? 'Portal Nacional' : 'Asaas'} (emissão automática após o pagamento). ISS (${formattedIssDisplay}%): ${isTomadorIss ? 'Retido pelo Tomador' : 'Recolhido pelo Prestador'}.`
      };
    } else {
      let errDesc = '';
      try {
        const errData = await invoiceResponse.json();
        errDesc = errData.errors?.map(e => e.description).join(', ');
        console.warn("Erro detalhado ao agendar NFS-e no Asaas:", errData, invoicePayload);
      } catch (_) {}

      return {
        success: false,
        invoiceScheduled: false,
        effectiveIssRate,
        retainIss: isTomadorIss,
        error: errDesc || invoiceResponse.statusText,
        invoiceMessage: `Aviso NFS-e: ${errDesc || invoiceResponse.statusText}${!municipalServiceCode && isNationalPortal ? ' (Verifique o Código de Tributação Nacional / Serviço na aba Configurações > Integração com o Asaas).' : ''}`
      };
    }
  } catch (err) {
    console.error("Exceção ao agendar NFS-e no Asaas:", err);
    return {
      success: false,
      invoiceScheduled: false,
      effectiveIssRate,
      retainIss: isTomadorIss,
      error: err.message,
      invoiceMessage: `Aviso NFS-e: ${err.message}`
    };
  }
}

/**
 * Detecta o tipo de chave PIX a partir do formato da string
 */
export function detectPixKeyType(key) {
  if (!key) return null;
  const clean = String(key).trim();
  
  if (clean.includes('@')) {
    return 'EMAIL';
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(clean)) {
    return 'EVP';
  }
  
  const onlyDigits = clean.replace(/\D/g, '');
  if (onlyDigits.length === 11) {
    return 'CPF';
  }
  if (onlyDigits.length === 14) {
    return 'CNPJ';
  }
  if (clean.startsWith('+') || (onlyDigits.length >= 10 && onlyDigits.length <= 13)) {
    return 'PHONE';
  }
  
  return 'EVP';
}

/**
 * Cria ou agenda uma transferência via PIX no Asaas
 * @param {Object} params
 * @param {number} params.value - Valor a ser transferido (em R$)
 * @param {string} params.pixKey - Chave PIX do destinatário
 * @param {string} [params.pixKeyType] - Tipo da chave (CPF, CNPJ, EMAIL, PHONE, EVP)
 * @param {string} [params.description] - Descrição do pagamento
 * @param {string} [params.scheduleDate] - Data agendada (YYYY-MM-DD), opcional
 */
export async function createAsaasPixTransfer({
  value,
  pixKey,
  pixKeyType = null,
  description = 'Pagamento de Prestador MHB Raffa',
  scheduleDate = null
}) {
  const token = (localStorage.getItem('raffa_asaas_token') || '').trim();
  const env = (localStorage.getItem('raffa_asaas_env') || 'sandbox').trim();

  if (!token) {
    throw new Error('Chave de API do Asaas não configurada nas Configurações.');
  }

  const numericValue = parseFloat(value);
  if (!numericValue || numericValue <= 0) {
    throw new Error('Valor inválido para transferência PIX.');
  }

  if (!pixKey || !String(pixKey).trim()) {
    throw new Error('Chave PIX do prestador não informada.');
  }

  const detectedType = pixKeyType || detectPixKeyType(pixKey);
  let cleanKey = String(pixKey).trim();
  if (detectedType === 'CPF' || detectedType === 'CNPJ') {
    cleanKey = cleanKey.replace(/\D/g, '');
  } else if (detectedType === 'PHONE') {
    const digits = cleanKey.replace(/\D/g, '');
    cleanKey = cleanKey.startsWith('+') ? cleanKey : `+55${digits}`;
  }

  const payload = {
    value: numericValue,
    operationType: 'PIX',
    pixAddressKey: cleanKey,
    pixAddressKeyType: detectedType,
    description: (description || 'Pagamento de Demandas MHB Raffa').slice(0, 140)
  };

  if (scheduleDate) {
    payload.scheduleDate = scheduleDate;
  }

  const baseUrl = getAsaasBaseUrl(env);

  try {
    const response = await fetch(`${baseUrl}/transfers`, {
      method: 'POST',
      headers: {
        'access_token': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorMsg = `Erro ${response.status}: ${response.statusText}`;
      try {
        const errData = await response.json();
        if (errData.errors && errData.errors.length > 0) {
          errorMsg = errData.errors.map(e => e.description).join(', ');
        }
      } catch (e) {}
      throw new Error(`Falha no Asaas: ${errorMsg}`);
    }

    const data = await response.json();
    return {
      success: true,
      transfer: data,
      transferId: data.id,
      status: data.status,
      dateCreated: data.dateCreated,
      scheduleDate: data.scheduleDate,
      value: data.value,
      receiptUrl: data.transactionReceiptUrl || null
    };
  } catch (err) {
    console.error('Erro ao criar transferência PIX no Asaas:', err);
    throw err;
  }
}

/**
 * Consulta o comprovante de uma transferência realizada no Asaas
 */
export async function fetchAsaasTransferReceipt(transferId) {
  const token = (localStorage.getItem('raffa_asaas_token') || '').trim();
  const env = (localStorage.getItem('raffa_asaas_env') || 'sandbox').trim();

  if (!token || !transferId) return null;

  const baseUrl = getAsaasBaseUrl(env);

  try {
    const response = await fetch(`${baseUrl}/transfers/${transferId}`, {
      method: 'GET',
      headers: {
        'access_token': token,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data;
  } catch (err) {
    console.warn('Erro ao buscar comprovante da transferência:', err);
    return null;
  }
}

