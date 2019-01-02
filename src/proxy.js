const express = require('express')
const bodyParser = require('body-parser')
const debug = require('debug')('botium-fbproxy-proxy')

const setupEndpoints = ({ app, endpoint, verify }) => {
  endpoint = endpoint || '/api/botium-connector-fbpagereceiver'

  app.get(endpoint, (req, res) => {
    debug('got GET request')
    debug(req.query)

    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']

    if (mode && token === verify) {
      res.status(200).send(challenge)
    } else {
      res.sendStatus(403)
    }
  })
  app.post(endpoint, (req, res) => {
    debug('got POST request')
    debug(JSON.stringify(req.body, null, 2))
    /*
    if (req.body && req.body.object === 'page') {
      req.body.entry.forEach(entry => {
        entry.messaging.forEach(event => {
          if (event.message) {

          }
        })
      })
    } */
    res.status(200).end()
  })
}

const startProxy = ({ port, endpoint, ...rest }) => {
  const app = express()

  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: true }))

  setupEndpoints({ app, endpoint, ...rest })

  app.listen(port, () => {
    console.log(`Botium Facebook Proxy server is listening on port ${port}`)
    console.log(`Facebook Webhook endpoint available at http://127.0.0.1:${port}${endpoint}`)
  })
}

module.exports = {
  setupEndpoints,
  startProxy
}
