import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { verifySmtp, sendMail } from './server.js'

function smtpVitePlugin() {
  return {
    name: 'smtp-vite-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const cleanUrl = (req.url || '').split('?')[0];
        if (req.method === 'POST' && (cleanUrl === '/api/test-smtp' || cleanUrl === '/api/send-email')) {
          let rawBody = '';
          req.on('data', chunk => { rawBody += chunk; });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(rawBody || '{}');
              res.setHeader('Content-Type', 'application/json');

              if (cleanUrl === '/api/test-smtp') {
                const result = await verifySmtp(payload);
                res.statusCode = 200;
                res.end(JSON.stringify(result));
                return;
              }

              if (cleanUrl === '/api/send-email') {
                const result = await sendMail(payload);
                res.statusCode = 200;
                res.end(JSON.stringify({ 
                  success: true, 
                  messageId: result.messageId,
                  message: 'E-mail enviado diretamente via SMTP com o relatório em PDF anexo!' 
                }));
                return;
              }
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message || 'Erro ao processar SMTP' }));
            }
          });
          return;
        }
        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    smtpVitePlugin()
  ],
  server: {
    proxy: {
      '/api/asaas-prod': {
        target: 'https://api.asaas.com/v3',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/asaas-prod/, ''),
        headers: {
          Origin: 'https://api.asaas.com'
        }
      },
      '/api/asaas-sandbox': {
        target: 'https://sandbox.asaas.com/v3',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/asaas-sandbox/, ''),
        headers: {
          Origin: 'https://sandbox.asaas.com'
        }
      }
    }
  }
})
