import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), '')); // lee .env.local

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'api-dev',
        configureServer(server) {
          server.middlewares.use('/api/briefing', async (req, res) => {
            try {
              let raw = '';
              for await (const chunk of req) raw += chunk;
              req.body = raw ? JSON.parse(raw) : {};
              res.status = (c) => { res.statusCode = c; return res; };
              res.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
              const { default: handler } = await server.ssrLoadModule('/api/briefing.js');
              await handler(req, res);
            } catch (e) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Error en el endpoint local' }));
            }
          });
        },
      },
    ],
  };
});
