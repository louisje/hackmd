#!/usr/bin/env bash

set -euo pipefail

if [[ "$#" -gt 0 ]]; then
    exec "$@"
    exit $?
fi

# Wait until the configured PostgreSQL endpoint accepts TCP connections.
node - <<'NODE'
const net = require('node:net')
const url = new URL(process.env.CMD_DB_URL)
const port = Number(url.port || 5432)
let attempts = 0
function check () {
  const socket = net.connect({ host: url.hostname, port })
  socket.setTimeout(3000)
  socket.once('connect', () => { socket.destroy(); process.exit(0) })
  const retry = () => {
    socket.destroy()
    if (++attempts >= 30) { console.error('Database is not reachable'); process.exit(1) }
    setTimeout(check, 2000)
  }
  socket.once('error', retry)
  socket.once('timeout', retry)
}
check()
NODE

# run DB migrate
NEED_MIGRATE=${CMD_AUTO_MIGRATE:=true}

if [[ "$NEED_MIGRATE" = "true" ]] && [[ -f .sequelizerc ]] ; then
    npx sequelize db:migrate
fi

# start application
node app.js
