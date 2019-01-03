const util = require('util')
const Redis = require('ioredis')
const fblogin = require('facebook-chat-api')
const readline = require('readline')
const _ = require('lodash')
const debug = require('debug')('botium-connector-fbpagereceiver')
const debugFbApi = require('debug')('botium-connector-fbpagereceiver-FbApi')

const Capabilities = {
  FBPAGERECEIVER_PAGEID: 'FBPAGERECEIVER_PAGEID',
  FBPAGERECEIVER_TESTUSER: 'FBPAGERECEIVER_TESTUSER',
  FBPAGERECEIVER_TESTPASSWORD: 'FBPAGERECEIVER_TESTPASSWORD',
  FBPAGERECEIVER_TESTUSER_FULLNAME: 'FBPAGERECEIVER_TESTUSER_FULLNAME',
  FBPAGERECEIVER_ASKFORLOGINAPPROVAL: 'FBPAGERECEIVER_ASKFORLOGINAPPROVAL',
  FBPAGERECEIVER_REDISURL: 'FBPAGERECEIVER_REDISURL'
}

class BotiumConnectorFbPageReceiver {
  constructor ({ queueBotSays, caps }) {
    this.queueBotSays = queueBotSays
    this.caps = caps
    this.redis = null
    this.queueReceivedMessages = false
    this.fbapi = null
    this.fbapiStopListener = null
  }

  Validate () {
    debug('Validate called')

    if (!this.caps[Capabilities.FBPAGERECEIVER_PAGEID]) throw new Error('FBPAGERECEIVER_PAGEID capability required')
    if (!this.caps[Capabilities.FBPAGERECEIVER_TESTUSER]) throw new Error('FBPAGERECEIVER_TESTUSER capability required')
    if (!this.caps[Capabilities.FBPAGERECEIVER_TESTPASSWORD]) throw new Error('FBPAGERECEIVER_TESTPASSWORD capability required')
    if (!this.caps[Capabilities.FBPAGERECEIVER_TESTUSER_FULLNAME]) throw new Error('FBPAGERECEIVER_TESTUSER_FULLNAME capability required')

    return Promise.resolve()
  }

  async Build () {
    debug('Build called')
    await this._buildRedis()
    await this._buildFacebookApi()
  }

  async Start () {
    debug('Start called')
    this.queueReceivedMessages = true
  }

  async UserSays (msg) {
    debug(`UserSays called ${util.inspect(msg)}`)
    if (!this.fbapi) return Promise.reject(new Error('not built'))

    this.fbapi.sendMessage(msg.messageText, this.caps[Capabilities.FBPAGERECEIVER_PAGEID])
    return Promise.resolve(this)
  }

  async Stop () {
    debug('Stop called')
    this.queueReceivedMessages = false
  }

  async Clean () {
    debug('Clean called')

    await this._cleanRedis()
    await this._cleanFacebookApi()
  }

  _buildRedis () {
    return new Promise((resolve, reject) => {
      this.redis = new Redis(this.caps[Capabilities.FBPAGERECEIVER_REDISURL])
      this.redis.on('connect', () => {
        debug(`Redis connected to ${util.inspect(this.caps[Capabilities.FBPAGERECEIVER_REDISURL])}`)
        this.redis.subscribe(this.caps[Capabilities.FBPAGERECEIVER_PAGEID], (err, count) => {
          if (err) {
            return reject(new Error(`Redis failed to subscribe channel ${this.caps[Capabilities.FBPAGERECEIVER_PAGEID]}: ${util.inspect(err)}`))
          }
          debug(`Redis subscribed to ${count} channels. Listening for updates on the ${this.caps[Capabilities.FBPAGERECEIVER_PAGEID]} channel.`)
          resolve()
        })
      })
      this.redis.on('message', (channel, event) => {
        if (this.queueReceivedMessages) {
          if (!_.isString(event)) {
            return debug(`WARNING: received non-string message from ${channel}, ignoring: ${event}`)
          }
          try {
            event = JSON.parse(event)
          } catch (err) {
            return debug(`WARNING: received non-json message from ${channel}, ignoring: ${event}`)
          }
          if (!event.message) {
            return debug(`Received a message without content from my page at ${channel}: ${util.inspect(event)}`)
          }
          if (!event.sender.id || parseInt(event.sender.id) !== parseInt(this.caps[Capabilities.FBPAGERECEIVER_PAGEID])) {
            return debug(`Received a message not originiating from my page at ${channel}: ${util.inspect(event)}`)
          }
          if (!event.recipient.id || event.recipient.name !== this.caps[Capabilities.FBPAGERECEIVER_TESTUSER_FULLNAME]) {
            return debug(`Received a message not targeted at current user "${this.caps[Capabilities.FBPAGERECEIVER_TESTUSER_FULLNAME]}" at ${channel}: ${util.inspect(event)}`)
          }

          const botMsg = { sender: 'bot', sourceData: event }
          if (event.message.text) {
            botMsg.messageText = event.message.text
          }
          if (event.message.attachments && event.message.attachments.length > 0) {
            event.message.attachments.forEach(a => {
              if (a.type === 'image' && a.payload && a.payload.url) {
                botMsg.media = botMsg.media || []
                botMsg.media.push({
                  mediaUri: a.payload.url
                })
              }
              if (a.type === 'template' && a.payload && a.payload.template_type === 'generic') {
                a.payload.elements && a.payload.elements.forEach(e => {
                  botMsg.cards = botMsg.cards || []
                  const card = {
                    text: e.title
                  }
                  if (e.image_url) {
                    card.image = { mediaUri: e.image_url }
                  }
                  if (e.buttons) {
                    card.buttons = e.buttons.map(b => ({
                      text: b.title,
                      payload: b.payload
                    }))
                  }
                  botMsg.cards.push(card)
                })
              }
            })
          }

          debug(`Received a message to queue at ${channel}: ${util.inspect(botMsg)}`)
          this.queueBotSays(botMsg)
        } else {
          debug(`Received message from ${channel}, ignoring`)
        }
      })
    })
  }

  _cleanRedis () {
    if (this.redis) {
      this.redis.disconnect()
      this.redis = null
    }
  }

  _buildFacebookApi () {
    return new Promise((resolve, reject) => {
      debug(`logging into facebook page ${this.caps[Capabilities.FBPAGERECEIVER_PAGEID]} with user ${this.caps[Capabilities.FBPAGERECEIVER_TESTUSER]}`)
      fblogin({ email: this.caps[Capabilities.FBPAGERECEIVER_TESTUSER], password: this.caps[Capabilities.FBPAGERECEIVER_TESTPASSWORD] }, { logLevel: debugFbApi.enabled ? 'verbose' : 'warn' }, (err, api) => {
        if (err) {
          if (err.error === 'login-approval' && this.caps[Capabilities.FBPAGERECEIVER_ASKFORLOGINAPPROVAL]) {
            const rl = readline.createInterface({
              input: process.stdin,
              output: process.stdout
            })
            rl.question('Please enter two-factor authentication code or authorise login from another browser: ', (answer) => {
              err.continue(answer)
            })
          } else {
            reject(new Error(`Facebook login failed: ${util.inspect(err)}`))
          }
        } else {
          debug('logging into facebook ready')
          this.fbapi = api
          resolve()
        }
      })
    })
  }

  _cleanFacebookApi () {
    if (this.fbApi) {
      return new Promise((resolve) => {
        this.fbapi.logout((err) => {
          debug(`logging out of facebook ready (${util.inspect(err)})`)
          this.fbapi = null
          resolve()
        })
      })
    }
  }
}

module.exports = BotiumConnectorFbPageReceiver
