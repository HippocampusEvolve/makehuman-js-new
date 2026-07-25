/**
 * Zero-dependency static server for the demo.
 *
 * Serves the repository root, because the page pulls three from node_modules/, the
 * library from dist/, and ~256 MB of meshes, morph targets and clothing from
 * node_modules/makehuman-data/. Run `npm run build` first, then `npm run example`.
 */
import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const PORT = Number(process.env.PORT || 8080)
const HOST = process.env.HOST || '127.0.0.1'

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.bin': 'application/octet-stream',
  '.map': 'application/json; charset=utf-8',
}

createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`)
  let pathname = decodeURIComponent(url.pathname)
  if (pathname === '/') pathname = '/example/index.html'

  const target = normalize(join(ROOT, pathname))
  if (!target.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep)) {
    response.writeHead(403).end('forbidden')
    return
  }

  let stats
  try {
    stats = statSync(target)
  } catch {
    response.writeHead(404).end('not found')
    return
  }

  const file = stats.isDirectory() ? join(target, 'index.html') : target
  const size = stats.isDirectory() ? statSync(file).size : stats.size

  response.writeHead(200, {
    'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
    'content-length': size,
    'cache-control': 'no-cache',
  })
  createReadStream(file).pipe(response)
}).listen(PORT, HOST, () => {
  console.log(`demo: http://${HOST}:${PORT}/example/`)
})
