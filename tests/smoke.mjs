// Smoke test simples: node tests/smoke.mjs  (BASE=http://localhost:8080/api por padrão)
const BASE = process.env.BASE || 'http://localhost:8080/api'
let token
let failed = 0

const api = async (method, path, body) => {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  })
  return { status: res.status, data: await res.json().catch(() => null) }
}
const check = (name, ok) => {
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const novo = (comando, extra = {}) =>
  api('POST', '/ambientes', { nome: 'smoke', cpu: 50, memoria: 128, io: 10, comando, ...extra })

const email = `smoke-${Date.now()}@test.com`
await api('POST', '/register', { nome: 'Smoke', email, senha: '123456' })
token = (await api('POST', '/login', { email, senha: '123456' })).data?.token
check('login', !!token)
check('sem token -> 401', (await fetch(`${BASE}/ambientes`)).status === 401)

const ok = (await novo('echo ola; sleep 1')).data
const fail = (await novo('exit 1')).data
const svc = (await novo('while true; do echo tick; sleep 1; done')).data
const oom = (await novo('python3 -c "bytearray(300*1024*1024)"', { memoria: 32 })).data
const iso = (await novo('echo PID=$$ HOST=$(hostname)')).data
await sleep(6000)

const status = async (e) => (await api('GET', `/ambientes/${e.id}`)).data.status
check('programa curto -> terminado', (await status(ok)) === 'terminado')
check('exit 1 -> erro', (await status(fail)) === 'erro')
check('estouro de memória -> erro', (await status(oom)) === 'erro')
check('serviço segue em execução', (await status(svc)) === 'em_execucao')
check('logs do serviço', (await api('GET', `/ambientes/${svc.id}/logs`)).data.content.includes('tick'))
const logs = (await api('GET', `/ambientes/${iso.id}/logs`)).data.content
check('namespaces (PID 1 e hostname próprio)', logs.includes('PID=1') && logs.includes(`HOST=env-${iso.id}`))

await api('POST', `/ambientes/${svc.id}/parar`)
check('parar -> terminado', (await status(svc)) === 'terminado')

for (const e of [ok, fail, svc, oom, iso]) await api('DELETE', `/ambientes/${e.id}`)
check('remover -> 404', (await api('GET', `/ambientes/${svc.id}`)).status === 404)

process.exit(failed ? 1 : 0)
