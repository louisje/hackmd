'use strict'

// The preceding secure middleware validates the signed session cookie.
function authorizeSocket (store, passport) {
  return function (socket, next) {
    const req = socket.request
    req.user = { logged_in: false }
    store.get(req.sessionID, (err, session) => {
      if (err || !session || !session.passport || session.passport.user === undefined) return next()
      passport.deserializeUser(session.passport.user, req, (err, user) => {
        if (!err && user) {
          req.user = user
          req.user.logged_in = true
        }
        next()
      })
    })
  }
}

module.exports = { authorizeSocket }
