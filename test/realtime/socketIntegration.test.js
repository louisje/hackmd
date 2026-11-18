/* eslint-env mocha */
'use strict'

const assert = require('assert').strict
const http = require('http')
const { Server } = require('socket.io')
const { io: connect } = require('socket.io-client')
const signature = require('cookie-signature')
const { authorizeSocket } = require('../../lib/realtime/socketAuth')

describe('Socket.IO 4 integration', function () {
  let server
  let io
  let port
  const clients = []
  const sessions = new Map()
  const secret = 'socket-test-secret'

  beforeEach(async function () {
    sessions.clear()
    server = http.createServer()
    io = new Server(server, { perMessageDeflate: false })
    io.use((socket, next) => {
      const match = /(?:^|; )sid=([^;]+)/.exec(socket.request.headers.cookie || '')
      if (!match) return next(new Error('AUTH failed: No cookie'))
      const id = signature.unsign(decodeURIComponent(match[1]).slice(2), secret)
      if (!id) return next(new Error('AUTH failed: Invalid cookie'))
      socket.request.sessionID = id
      next()
    })
    io.use(authorizeSocket({
      get: (id, done) => done(null, sessions.get(id))
    }, {
      deserializeUser: (id, req, done) => done(null, id === 'alice' ? { id } : false)
    }))
    io.on('connection', socket => {
      socket.join('note')
      socket.on('whoami', ack => ack(socket.request.user))
      socket.on('edit', value => socket.to('note').emit('edit', value))
    })
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    port = server.address().port
  })

  afterEach(async function () {
    for (const client of clients) client.disconnect()
    clients.length = 0
    await new Promise(resolve => io.close(resolve))
  })

  function client (id, headers) {
    const cookie = 'sid=' + encodeURIComponent('s:' + signature.sign(id, secret))
    const socket = connect('http://127.0.0.1:' + port, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
      extraHeaders: headers || { Cookie: cookie }
    })
    clients.push(socket)
    return socket
  }

  function wait (socket, event) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout: ' + event)), 3000)
      socket.once(event, data => { clearTimeout(timeout); resolve(data) })
      if (event !== 'connect_error') {
        socket.once('connect_error', error => { clearTimeout(timeout); reject(error) })
      }
    })
  }

  it('rejects absent and invalid cookies', async function () {
    const missing = client('x', {})
    assert.match((await wait(missing, 'connect_error')).message, /No cookie/)
    const invalid = client('x', { Cookie: 'sid=invalid' })
    assert.match((await wait(invalid, 'connect_error')).message, /Invalid cookie/)
  })

  it('allows anonymous sessions and authenticates valid sessions', async function () {
    sessions.set('valid', { passport: { user: 'alice' } })
    const anonymous = client('unknown')
    await wait(anonymous, 'connect')
    assert.deepEqual(await new Promise(resolve => anonymous.emit('whoami', resolve)), { logged_in: false })
    const authenticated = client('valid')
    await wait(authenticated, 'connect')
    assert.deepEqual(await new Promise(resolve => authenticated.emit('whoami', resolve)), { id: 'alice', logged_in: true })
  })

  it('broadcasts edits after reconnecting', async function () {
    const a = client('one')
    const b = client('two')
    await Promise.all([wait(a, 'connect'), wait(b, 'connect')])
    const received = wait(b, 'edit')
    a.emit('edit', '中文協作')
    assert.equal(await received, '中文協作')
    a.disconnect()
    const rejoined = client('one')
    await wait(rejoined, 'connect')
    const again = wait(rejoined, 'edit')
    b.emit('edit', 'reconnected')
    assert.equal(await again, 'reconnected')
  })
})
