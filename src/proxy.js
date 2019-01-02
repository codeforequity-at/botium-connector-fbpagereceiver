const util = require('util')
const express = require('express')
const Redis = require('ioredis')
const bodyParser = require('body-parser')
const request = require('request-promise-native')
const debug = require('debug')('botium-fbproxy-proxy')

const userProfileCall = (psid, { accesstoken }) => {
  return request({
    uri: 'https://graph.facebook.com/v3.2/' + psid,
    qs: {
      access_token: accesstoken,
      fields: 'name,metadata{type}',
      metadata: 1
    },
    json: true,
    method: 'GET'
  })
}

const processEvent = async (event, { redis, ...rest }) => {
  if (event.sender && event.sender.id) {
    try {
      const sender = await userProfileCall(event.sender.id, { ...rest })
      event.sender = sender
    } catch (err) {
    }
  }
  if (event.recipient && event.recipient.id) {
    try {
      const recipient = await userProfileCall(event.recipient.id, { ...rest })
      event.recipient = recipient
    } catch (err) {
    }
  }
  try {
    debug('Got Message Event:')
    debug(JSON.stringify(event, null, 2))
    if (event.sender && event.sender.metadata && event.sender.metadata.type === 'page') {
      redis.publish(event.sender.id, JSON.stringify(event))
      debug(`Published event for page sender id ${event.sender.id}`)
    } else if (event.recipient && event.recipient.metadata && event.recipient.metadata.type === 'page') {
      redis.publish(event.recipient.id, JSON.stringify(event))
      debug(`Published event for page recipient id ${event.recipient.id}`)
    } else {
      debug(`Event not published, neither sender nor receiver is of type page`)
    }
  } catch (err) {
    debug('Error while publishing to redis')
    debug(err)
  }
}

const setupEndpoints = ({ app, endpoint, verifytoken, redisurl, ...rest }) => {
  const redis = new Redis(redisurl)
  redis.on('connect', () => {
    debug(`Redis connected to ${util.inspect(redisurl)}`)
  })
  endpoint = endpoint || '/api/botium-connector-fbpagereceiver'

  app.get(endpoint, (req, res) => {
    debug('got GET request')
    debug(req.query)

    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']

    if (mode && mode === 'subscribe' && token === verifytoken) {
      res.status(200).send(challenge)
    } else {
      res.sendStatus(403)
    }
  })
  app.post(endpoint, (req, res) => {
    if (req.body && req.body.object === 'page') {
      req.body.entry && req.body.entry.forEach(entry => {
        entry.standby && entry.standby.forEach(event => {
          if (event.message) {
            processEvent(event, { redis, ...rest })
          }
        })
      })
    }
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
