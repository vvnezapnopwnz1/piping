import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
const root = new URL('.', import.meta.url).pathname.replace(/\/$/,'');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.svg':'image/svg+xml'};
http.createServer(async (req,res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {res.writeHead(405);return res.end();}
    const path = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const target = resolve(root,'.' + (path === '/' ? '/review/index.html' : path));
    if (!target.startsWith(root + sep) || !/^\/(a|b|c|d|review)\//.test(path === '/' ? '/review/index.html' : path) || !types[extname(target)]) {res.writeHead(404);return res.end();}
    const data = await readFile(target);
    res.writeHead(200,{'Content-Type':types[extname(target)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {res.writeHead(404);res.end('Not found');}
}).listen(4178,'127.0.0.1',()=>console.log('PipeQC UX review: http://127.0.0.1:4178/review/index.html'));

