/**
 * Utilitário de E-mail Direto via SMTP
 * Comunica com o backend Node.js (/api/send-email e /api/test-smtp)
 * permitindo disparos autenticados diretos com anexos em PDF.
 */

export function getSmtpConfig() {
  return {
    host: (localStorage.getItem('raffa_smtp_host') || '').trim(),
    port: (localStorage.getItem('raffa_smtp_port') || '587').trim(),
    user: (localStorage.getItem('raffa_smtp_user') || '').trim(),
    pass: (localStorage.getItem('raffa_smtp_pass') || '').trim(),
    sender: (localStorage.getItem('raffa_smtp_sender') || '').trim()
  };
}

export function isSmtpConfigured() {
  const config = getSmtpConfig();
  return !!(config.host && config.user && config.pass);
}

/**
 * Testa a conexão real com o servidor SMTP através do backend
 */
export async function testSmtpConnection(customConfig = null) {
  const config = customConfig || getSmtpConfig();
  if (!config.host || !config.user || !config.pass) {
    throw new Error('Preencha Servidor (Host), Usuário e Senha/Token de App para testar.');
  }

  const response = await fetch('/api/test-smtp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.error || `Falha na conexão SMTP (Status ${response.status})`);
  }

  return data;
}

/**
 * Envia um e-mail diretamente via SMTP com suporte a anexo em PDF (em formato Base64)
 */
export async function sendDirectEmail({
  to,
  cc = '',
  subject,
  body,
  html = null,
  pdfBase64 = null,
  pdfFilename = 'relatorio.pdf',
  customConfig = null
}) {
  const config = customConfig || getSmtpConfig();
  if (!config.host || !config.user || !config.pass) {
    throw new Error('Servidor SMTP não configurado. Por favor, acesse a aba Configurações e configure as credenciais de SMTP.');
  }

  if (!to || !to.trim()) {
    throw new Error('E-mail do destinatário não informado.');
  }

  const payload = {
    ...config,
    to: to.trim(),
    cc: cc ? cc.trim() : '',
    subject: subject || 'Relatório de Fechamento',
    body: body || '',
    html: html || null,
    pdfBase64: pdfBase64 || null,
    pdfFilename: pdfFilename || 'relatorio.pdf'
  };

  const response = await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.error || `Erro no envio via SMTP (Status ${response.status})`);
  }

  return data;
}
