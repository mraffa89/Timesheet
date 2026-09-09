import http from 'http';
import nodemailer from 'nodemailer';

const PORT = process.env.SMTP_SERVER_PORT || 3001;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');
}

export function sanitizeWhatsAppNumber(rawPhone) {
  if (!rawPhone) return '';
  let digits = String(rawPhone).replace(/\D/g, '');
  if (!digits) return '';

  // Remove leading zeros if present
  digits = digits.replace(/^0+/, '');

  // Brazilian numbers: if 10 or 11 digits (e.g. 11987654321), prepend country code 55
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  // Already has country code (e.g. 5511987654321 or foreign)
  return digits;
}

export function formatEmailContent(body, customHtml = null, pdfFilename = 'relatorio.pdf') {
  const rawBody = String(body || '').trim();
  const plainText = rawBody
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .trim();

  // If explicit HTML is passed, use it directly wrapped in container
  const hasHtml = customHtml || /<[a-z][\s\S]*>/i.test(rawBody);

  let innerContentHtml = '';

  if (hasHtml) {
    innerContentHtml = customHtml || rawBody;
  } else {
    // Convert plain text into clean, structured HTML
    const lines = rawBody.split('\n');
    const processed = [];
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ')) {
        if (!inList) {
          processed.push('<ul style="margin: 12px 0 16px 0; padding-left: 20px; list-style: disc; color: #334155;">');
          inList = true;
        }
        const bulletText = line.substring(2).trim();
        if (bulletText.includes(':')) {
          const colonIdx = bulletText.indexOf(':');
          const key = bulletText.substring(0, colonIdx);
          const val = bulletText.substring(colonIdx + 1);
          processed.push(`<li style="margin-bottom: 6px; line-height: 1.5; font-size: 14px;"><strong style="color: #0f172a;">${key}:</strong><span style="color: #334155;">${val}</span></li>`);
        } else {
          processed.push(`<li style="margin-bottom: 6px; line-height: 1.5; font-size: 14px; color: #334155;">${bulletText}</li>`);
        }
      } else {
        if (inList) {
          processed.push('</ul>');
          inList = false;
        }

        if (line === '') {
          processed.push('<div style="height: 12px;"></div>');
        } else if (
          line.startsWith('📋') || 
          line.startsWith('DEMANDAS QUITADAS') || 
          (line.toUpperCase() === line && line.length > 5 && !line.includes('@') && !line.includes('HTTP'))
        ) {
          processed.push(`
            <div style="margin: 18px 0 10px 0; padding: 8px 12px; background-color: #f1f5f9; border-left: 4px solid #0284c7; border-radius: 4px;">
              <strong style="color: #0f172a; font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em;">${line}</strong>
            </div>
          `);
        } else {
          processed.push(`<p style="margin: 0 0 10px 0; line-height: 1.6; color: #334155; font-size: 15px;">${line}</p>`);
        }
      }
    }

    if (inList) {
      processed.push('</ul>');
    }

    innerContentHtml = processed.join('\n');
  }

  const fullHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fechamento de Atividades</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.04); overflow: hidden;">
    <tr>
      <td style="padding: 32px 32px 24px 32px; color: #1e293b; font-size: 15px; line-height: 1.6;">
        ${innerContentHtml}

        <!-- Rodapé do e-mail com espaçamento seguro antes dos anexos -->
        <div style="margin-top: 36px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b; line-height: 1.5;">
          📎 <strong>Documento em anexo:</strong> O relatório detalhado em PDF encontra-se anexado a este e-mail logo abaixo.
        </div>
      </td>
    </tr>
  </table>
  <!-- Espaço extra para evitar que clientes como Apple Mail agrupem ícones colados ao texto -->
  <div style="height: 36px; line-height: 36px;">&nbsp;</div>
</body>
</html>
  `.trim();

  const formattedText = `${plainText}\n\n\n___________________________________\n📎 Anexo: ${pdfFilename || 'relatorio.pdf'}\n\n`;

  return {
    text: formattedText,
    html: fullHtml
  };
}

export async function verifySmtp({ host, port, user, pass }) {
  if (!host || !user || !pass) {
    throw new Error('Servidor (Host), Usuário e Senha são obrigatórios.');
  }

  const portNum = Number(port) || 587;
  const isSecure = portNum === 465;

  const transporter = nodemailer.createTransport({
    host: host.trim(),
    port: portNum,
    secure: isSecure,
    auth: {
      user: user.trim(),
      pass: pass.trim()
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });

  await transporter.verify();
  return { success: true, message: `Conexão SMTP validada com sucesso com ${host.trim()}:${portNum}!` };
}

export async function sendMail({ host, port, user, pass, sender, to, cc, subject, body, html, pdfBase64, pdfFilename }) {
  if (!host || !user || !pass) {
    throw new Error('Servidor SMTP não configurado. Por favor, acesse a aba Configurações.');
  }
  if (!to) {
    throw new Error('Destinatário (Para) não informado.');
  }

  const portNum = Number(port) || 587;
  const isSecure = portNum === 465;

  const transporter = nodemailer.createTransport({
    host: host.trim(),
    port: portNum,
    secure: isSecure,
    auth: {
      user: user.trim(),
      pass: pass.trim()
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 12000,
    greetingTimeout: 12000,
    socketTimeout: 20000
  });

  const attachments = [];
  const filename = pdfFilename || 'relatorio_fechamento.pdf';
  if (pdfBase64) {
    attachments.push({
      filename,
      content: Buffer.from(pdfBase64, 'base64'),
      contentType: 'application/pdf',
      contentDisposition: 'attachment' // Força exibição como anexo separado e nunca inline no Apple Mail/Gmail
    });
  }

  const formatted = formatEmailContent(body, html, filename);

  const mailOptions = {
    from: (sender || user).trim(),
    to: to.trim(),
    subject: subject || 'Relatório de Fechamento',
    text: formatted.text,
    html: formatted.html,
    attachments
  };

  if (cc && cc.trim()) {
    mailOptions.cc = cc.trim();
  }

  const info = await transporter.sendMail(mailOptions);
  return { success: true, messageId: info.messageId };
}

// ═══════════════════════════════════════════════════════════════
// Evolution API (WhatsApp) Handlers
// ═══════════════════════════════════════════════════════════════

export async function verifyEvolutionConnection({ serverUrl, instance, apiKey }) {
  if (!serverUrl || !instance || !apiKey) {
    throw new Error('URL da Evolution API, Instância e API Key são obrigatórios.');
  }

  const cleanUrl = String(serverUrl).trim().replace(/\/+$/, '');
  const cleanInstance = String(instance).trim();
  const cleanKey = String(apiKey).trim();

  const endpoint = `${cleanUrl}/instance/connectionState/${encodeURIComponent(cleanInstance)}`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'apikey': cleanKey,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errMsg = data.message || data.error || `Erro HTTP ${response.status}`;
      throw new Error(`Falha na Evolution API: ${errMsg}`);
    }

    const state = data?.instance?.state || data?.state || 'open';
    const isConnected = state === 'open' || state === 'connecting' || state === 'connected';

    return {
      success: true,
      state,
      isConnected,
      message: isConnected 
        ? `Instância "${cleanInstance}" conectada com sucesso ao WhatsApp!`
        : `Instância "${cleanInstance}" encontrada, porém status atual é: ${state}. Escaneie o QR Code no painel da Evolution caso necessário.`
    };
  } catch (err) {
    throw new Error(err.message || 'Erro ao comunicar com a Evolution API.');
  }
}

export async function sendEvolutionWhatsAppMessage({ serverUrl, instance, apiKey, number, text }) {
  if (!serverUrl || !instance || !apiKey) {
    throw new Error('Evolution API não configurada. Verifique Servidor, Instância e Chave na aba Configurações.');
  }
  if (!number) {
    throw new Error('Número de WhatsApp do destinatário não informado.');
  }
  if (!text || !text.trim()) {
    throw new Error('Mensagem vazia.');
  }

  const cleanUrl = String(serverUrl).trim().replace(/\/+$/, '');
  const cleanInstance = String(instance).trim();
  const cleanKey = String(apiKey).trim();
  const formattedNumber = sanitizeWhatsAppNumber(number);

  if (formattedNumber.length < 10) {
    throw new Error(`Número de WhatsApp inválido ("${number}"). Verifique se inclui DDD.`);
  }

  const endpoint = `${cleanUrl}/message/sendText/${encodeURIComponent(cleanInstance)}`;

  const bodyPayload = {
    number: formattedNumber,
    text: text.trim()
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'apikey': cleanKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyPayload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errMsg = data.response?.message || data.message || data.error || `Erro HTTP ${response.status}`;
      throw new Error(`Falha ao disparar WhatsApp: ${errMsg}`);
    }

    return {
      success: true,
      messageId: data?.key?.id || data?.id || 'ok',
      message: 'Notificação enviada com sucesso via WhatsApp!'
    };
  } catch (err) {
    throw new Error(err.message || 'Erro ao disparar mensagem via Evolution API.');
  }
}

const server = http.createServer(async (req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const cleanUrl = (req.url || '').split('?')[0];

  if (req.method === 'GET' && cleanUrl === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'smtp-and-evolution-server' }));
    return;
  }

  const allowedPostEndpoints = [
    '/api/test-smtp',
    '/api/send-email',
    '/api/evolution/test-connection',
    '/api/evolution/send-message'
  ];

  if (req.method === 'POST' && allowedPostEndpoints.includes(cleanUrl)) {
    let rawBody = '';
    req.on('data', chunk => {
      rawBody += chunk;
      // Previne overflow de memória (máximo 25MB para suportar anexos PDF)
      if (rawBody.length > 26214400) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Tamanho da requisição excedeu o limite máximo (25MB).' }));
        req.destroy();
      }
    });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(rawBody || '{}');

        if (cleanUrl === '/api/test-smtp') {
          const result = await verifySmtp(payload);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
          return;
        }

        if (cleanUrl === '/api/send-email') {
          const result = await sendMail(payload);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            messageId: result.messageId,
            message: 'E-mail enviado diretamente via SMTP com o relatório em PDF anexo!' 
          }));
          return;
        }

        if (cleanUrl === '/api/evolution/test-connection') {
          const result = await verifyEvolutionConnection(payload);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
          return;
        }

        if (cleanUrl === '/api/evolution/send-message') {
          const result = await sendEvolutionWhatsAppMessage(payload);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
          return;
        }
      } catch (err) {
        console.error(`Erro ao processar ${cleanUrl}:`, err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: err.message || 'Erro interno no servidor ao processar requisição.' 
        }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Rota não encontrada' }));
});

import { fileURLToPath } from 'url';

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[API Server] Servidor de e-mails e Evolution API ativo na porta ${PORT}`);
  });
}

export default server;

