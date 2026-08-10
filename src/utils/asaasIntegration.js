/**
 * Utilitário de Integração Direta com a API do Asaas v3
 * Documentação oficial: https://docs.asaas.com/reference/comece-por-aqui
 */

function getAsaasBaseUrl(env = 'sandbox') {
  if (typeof window !== 'undefined') {
    // No navegador (Vite Dev / Prod), utiliza o proxy configurado no Vite para evitar qualquer bloqueio de CORS
    return env === 'production' ? '/api/asaas-prod' : '/api/asaas-sandbox';
  }
  return env === 'production' 
    ? 'https://api.asaas.com/v3' 
    : 'https://sandbox.asaas.com/v3';
}

/**
 * Busca um cliente no Asaas pelo CNPJ ou CPF
 */
export async function fetchAsaasCustomerByCnpj(cnpj) {
  const token = localStorage.getItem('raffa_asaas_token');
  const env = localStorage.getItem('raffa_asaas_env') || 'sandbox';

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
  const token = localStorage.getItem('raffa_asaas_token');
  const env = localStorage.getItem('raffa_asaas_env') || 'sandbox';

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

      const custData = await custRes.json();
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
  
  // Vencimento: Dia 10 do mês seguinte à emissão (YYYY-MM-10)
  const now = new Date();
  let nextMonth = now.getMonth() + 2;
  let nextYear = now.getFullYear();
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  const dueDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-10`;

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

    // 3. Cria a cobrança no Asaas (Cobrança única avulsa com opção de PIX / Boleto / Cartão)
    const paymentResponse = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'access_token': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: 'UNDEFINED', // Permite que o cliente pague por PIX, Boleto ou Cartão
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
    let invoiceScheduled = false;
    let invoiceId = '';
    let invoiceStatus = '';
    let invoiceMessage = '';

    const autoNfeEnabled = localStorage.getItem('raffa_asaas_auto_nfe') !== 'false';
    if (autoNfeEnabled) {
      try {
        const invoiceDescription = `PRESTAÇÃO DE SERVIÇOS DE MARKETING - JOBS AVULSOS - ${monthYearFormatted}`;
        
        const invoiceResponse = await fetch(`${baseUrl}/invoices`, {
          method: 'POST',
          headers: {
            'access_token': token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            payment: paymentData.id,
            serviceDescription: invoiceDescription,
            value: Number(amount.toFixed(2)),
            deductions: 0
          })
        });

        if (invoiceResponse.ok) {
          const invoiceData = await invoiceResponse.json();
          invoiceScheduled = true;
          invoiceId = invoiceData.id;
          invoiceStatus = invoiceData.status || 'SCHEDULED';
          invoiceMessage = 'NFS-e agendada com sucesso (será emitida automaticamente assim que o cliente pagar a fatura).';
        } else {
          try {
            const errData = await invoiceResponse.json();
            const errDesc = errData.errors?.map(e => e.description).join(', ');
            invoiceMessage = `Aviso NFS-e: ${errDesc || invoiceResponse.statusText}`;
          } catch (e) {
            invoiceMessage = 'Módulo fiscal de NFS-e não habilitado no Asaas.';
          }
        }
      } catch (errNfe) {
        console.warn('Nota fiscal não agendada:', errNfe);
        invoiceMessage = 'Módulo fiscal de NFS-e não habilitado no Asaas.';
      }
    }

    return {
      success: true,
      billingId: paymentData.id,
      invoiceUrl: paymentData.invoiceUrl,
      pixCopiaCola: pixCode || '',
      qrCodeImage: pixQr ? `data:image/png;base64,${pixQr}` : null,
      dueDate,
      invoiceScheduled,
      invoiceId,
      invoiceStatus,
      invoiceMessage,
      simulated: false
    };

  } catch (error) {
    console.error('Erro no processamento da cobrança Asaas:', error);
    throw error;
  }
}

/**
 * Anexa o documento PDF do Demonstrativo de Serviços à cobrança criada no Asaas
 * @param {string} paymentId - ID da cobrança no Asaas
 * @param {Blob} pdfBlob - Blob binário do PDF gerado
 * @param {string} fileName - Nome do arquivo PDF (ex: Demonstrativo_CLIENTE_Mes_Ano.pdf)
 */
export async function attachDocumentToAsaasPayment(paymentId, pdfBlob, fileName) {
  const token = localStorage.getItem('raffa_asaas_token');
  const env = localStorage.getItem('raffa_asaas_env') || 'sandbox';

  if (!token || !paymentId || !pdfBlob) {
    return { success: false, error: 'Parâmetros insuficientes para upload do documento anexo.' };
  }

  const baseUrl = getAsaasBaseUrl(env);

  try {
    const formData = new FormData();
    const cleanFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    const file = new File([pdfBlob], cleanFileName, { type: 'application/pdf' });
    formData.append('file', file);
    formData.append('type', 'DOCUMENT');
    formData.append('availableAfterPayment', 'true');

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

