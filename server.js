import http from 'http';
import nodemailer from 'nodemailer';

const PORT = process.env.SMTP_SERVER_PORT || 3001;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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

export async function sendMail({ host, port, user, pass, sender, to, cc, subject, body, pdfBase64, pdfFilename }) {
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
  if (pdfBase64) {
    attachments.push({
      filename: pdfFilename || 'relatorio_fechamento.pdf',
      content: Buffer.from(pdfBase64, 'base64'),
      contentType: 'application/pdf'
    });
  }

  const mailOptions = {
    from: (sender || user).trim(),
    to: to.trim(),
    subject: subject || 'Relatório de Fechamento',
    text: body || '',
    attachments
  };

  if (cc && cc.trim()) {
    mailOptions.cc = cc.trim();
  }

  const info = await transporter.sendMail(mailOptions);
  return { success: true, messageId: info.messageId };
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
    res.end(JSON.stringify({ status: 'ok', service: 'smtp-server' }));
    return;
  }

  if (req.method === 'POST' && (cleanUrl === '/api/test-smtp' || cleanUrl === '/api/send-email')) {
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
      } catch (err) {
        console.error(`Erro ao processar ${cleanUrl}:`, err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: err.message || 'Erro interno ao comunicar com o servidor SMTP.' 
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
    console.log(`[SMTP Server] Servidor de e-mails ativo na porta ${PORT}`);
  });
}

export default server;
