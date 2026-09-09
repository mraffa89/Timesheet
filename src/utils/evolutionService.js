/**
 * Utilitário de Integração com a Evolution API (WhatsApp)
 * Comunica com o backend (/api/evolution/...) para evitar restrições de CORS
 * e fornece fallback para chamadas diretas ou WhatsApp Web.
 */

export const DEFAULT_EVOLUTION_NOTIFICATION_TEMPLATE = `Olá, {primeiro_nome}! 👋

Uma nova demanda foi atribuída a você:

📌 *{titulo}*
🏢 *Cliente:* {cliente}
📂 *Categoria:* {categoria}
⏱️ *Estimativa:* {horas}h
📅 *Prazo de Entrega:* {prazo}
{link_briefing_bloco}
{observacoes_bloco}
Por favor, acompanhe e atualize o status da demanda no portal:
{portal_url}

Qualquer dúvida, estou à disposição!`;

export function getEvolutionConfig() {
  return {
    serverUrl: (localStorage.getItem('raffa_evolution_api_url') || '').trim(),
    instance: (localStorage.getItem('raffa_evolution_instance') || '').trim(),
    apiKey: (localStorage.getItem('raffa_evolution_api_key') || '').trim(),
    template: localStorage.getItem('raffa_evolution_notification_tpl') || DEFAULT_EVOLUTION_NOTIFICATION_TEMPLATE
  };
}

export function isEvolutionConfigured() {
  const cfg = getEvolutionConfig();
  return !!(cfg.serverUrl && cfg.instance && cfg.apiKey);
}

export function sanitizeWhatsAppNumber(rawPhone) {
  if (!rawPhone) return '';
  let digits = String(rawPhone).replace(/\D/g, '');
  if (!digits) return '';

  digits = digits.replace(/^0+/, '');

  // Padrão Brasil: 10 ou 11 dígitos (DDD + número) -> adiciona 55
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

/**
 * Formata data ISO (YYYY-MM-DD) para padrão brasileiro (DD/MM/AAAA)
 */
function formatDateBR(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Monta o texto de notificação de demanda com substituição das variáveis dinâmicas
 */
export function buildDemandNotificationText({
  template,
  task,
  freelancer,
  clientName = '',
  companyInfo = {},
  portalUrl = ''
}) {
  const rawTpl = template || DEFAULT_EVOLUTION_NOTIFICATION_TEMPLATE;

  const fullName = freelancer?.name || 'Prestador';
  const firstName = fullName.trim().split(/\s+/)[0] || 'Prestador';
  const hoursNum = parseFloat(task?.hours || 0);
  const hoursStr = hoursNum > 0 ? hoursNum.toFixed(1).replace('.', ',') : '-';
  const dueDateStr = task?.expectedDueDate ? formatDateBR(task.expectedDueDate) : 'A combinar';
  const reqDateStr = task?.requestDate ? formatDateBR(task.requestDate) : formatDateBR(new Date().toISOString().split('T')[0]);

  const briefingLink = (task?.briefingUrl || '').trim();
  const briefingBlock = briefingLink ? `🔗 *Briefing/Arquivos:* ${briefingLink}` : '';

  const notesText = (task?.notes || '').trim();
  const notesBlock = notesText ? `📝 *Observações:* ${notesText}` : '';

  const effectivePortalUrl = portalUrl || (typeof window !== 'undefined' ? `${window.location.origin}` : '');
  const companyName = companyInfo?.brandName || companyInfo?.legalName || 'MHB Raffa';

  const replacements = {
    '{primeiro_nome}': firstName,
    '{primeiro_nome_freelancer}': firstName,
    '{nome}': fullName,
    '{nome_freelancer}': fullName,
    '{titulo}': task?.title || 'Nova Demanda',
    '{titulo_demanda}': task?.title || 'Nova Demanda',
    '{cliente}': clientName || 'Geral',
    '{nome_cliente}': clientName || 'Geral',
    '{categoria}': task?.category || 'Digital',
    '{horas}': hoursStr,
    '{total_horas}': hoursStr,
    '{prazo}': dueDateStr,
    '{data_entrega}': dueDateStr,
    '{data_solicitacao}': reqDateStr,
    '{link_briefing}': briefingLink || '-',
    '{briefing_url}': briefingLink || '-',
    '{link_briefing_bloco}': briefingBlock,
    '{observacoes}': notesText || '-',
    '{observacoes_bloco}': notesBlock,
    '{portal_url}': effectivePortalUrl,
    '{minha_empresa}': companyName
  };

  let processed = rawTpl;
  Object.entries(replacements).forEach(([key, val]) => {
    processed = processed.split(key).join(val || '');
  });

  // Limpa linhas em branco duplicadas causadas por blocos vazios
  processed = processed.replace(/\n{3,}/g, '\n\n').trim();

  return processed;
}

/**
 * Testa a conexão com a Evolution API
 */
export async function testEvolutionConnection(customConfig = null) {
  const config = customConfig || getEvolutionConfig();
  if (!config.serverUrl || !config.instance || !config.apiKey) {
    throw new Error('Preencha a URL da Evolution API, Nome da Instância e API Key para testar.');
  }

  // 1. Tenta via proxy seguro do backend Node.js
  try {
    const response = await fetch('/api/evolution/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      if (data.success) return data;
      throw new Error(data.error || 'Instância não respondeu com sucesso.');
    }
  } catch (err) {
    // Se o backend não estiver rodando (ex: dev puro sem server), tenta chamada direta
    if (!err.message || !err.message.includes('Instância')) {
      const cleanUrl = String(config.serverUrl).trim().replace(/\/+$/, '');
      const endpoint = `${cleanUrl}/instance/connectionState/${encodeURIComponent(config.instance.trim())}`;
      const directResp = await fetch(endpoint, {
        headers: { 'apikey': config.apiKey.trim() }
      });
      if (!directResp.ok) throw new Error(`Falha na Evolution API (HTTP ${directResp.status})`);
      const directData = await directResp.json().catch(() => ({}));
      return { success: true, message: 'Instância conectada com sucesso!', raw: directData };
    }
    throw err;
  }
}

/**
 * Envia mensagem via WhatsApp usando Evolution API
 */
export async function sendEvolutionWhatsApp({
  number,
  text,
  customConfig = null
}) {
  const config = customConfig || getEvolutionConfig();
  if (!config.serverUrl || !config.instance || !config.apiKey) {
    throw new Error('Evolution API não configurada. Acesse Configurações para informar Servidor, Instância e Chave.');
  }

  if (!number) {
    throw new Error('Número de WhatsApp não informado.');
  }

  if (!text || !text.trim()) {
    throw new Error('Mensagem vazia.');
  }

  const payload = {
    ...config,
    number,
    text
  };

  // 1. Envio via backend seguro
  try {
    const response = await fetch('/api/evolution/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (response.ok && data.success) {
      return data;
    }
    throw new Error(data.error || `Erro HTTP ${response.status} ao disparar mensagem`);
  } catch (backendErr) {
    // Se for erro de rede local/dev, tenta fallback direto
    if (backendErr.message && backendErr.message.includes('Failed to fetch')) {
      const cleanUrl = String(config.serverUrl).trim().replace(/\/+$/, '');
      const endpoint = `${cleanUrl}/message/sendText/${encodeURIComponent(config.instance.trim())}`;
      const formattedNum = sanitizeWhatsAppNumber(number);

      const directResp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'apikey': config.apiKey.trim(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ number: formattedNum, text: text.trim() })
      });

      const directData = await directResp.json().catch(() => ({}));
      if (directResp.ok) {
        return { success: true, message: 'Notificação enviada com sucesso!' };
      }
      throw new Error(directData.message || directData.error || `Erro HTTP ${directResp.status}`);
    }
    throw backendErr;
  }
}

/**
 * Abre o link direto no WhatsApp Web como contingência instantânea
 */
export function openWhatsAppWebDirect({ phone, text }) {
  const sanitized = sanitizeWhatsAppNumber(phone);
  const encodedText = encodeURIComponent(text || '');
  const url = sanitized 
    ? `https://wa.me/${sanitized}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
