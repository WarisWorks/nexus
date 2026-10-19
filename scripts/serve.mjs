import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('out');
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.json':'application/json', '.png':'image/png', '.woff2':'font/woff2', '.txt':'text/plain; charset=utf-8' };
http.createServer(async (request,response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname);
    let file = path.resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(`${root}${path.sep}`)) { response.writeHead(403).end(); return; }
    if ((await stat(file)).isDirectory()) file = path.join(file,'index.html');
    const body = await readFile(file);
    response.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream','X-Content-Type-Options':'nosniff'});
    response.end(body);
  } catch {
    response.writeHead(404, {'Content-Type':'text/html; charset=utf-8'});
    try { response.end(await readFile(path.join(root,'404.html'))); } catch { response.end('Not found'); }
  }
}).listen(3000,'127.0.0.1',()=>console.log('NEXUS production preview: http://127.0.0.1:3000'));
