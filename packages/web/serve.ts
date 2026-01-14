/**
 * Simple static file server for the AIN dashboard
 */

const PORT = 3000;

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname;

    // Default to index.html
    if (path === '/') path = '/index.html';

    // Serve from public directory
    const file = Bun.file(`./public${path}`);

    if (await file.exists()) {
      return new Response(file);
    }

    // 404
    return new Response('Not found', { status: 404 });
  },
});

console.log(`Dashboard running at http://localhost:${PORT}`);
