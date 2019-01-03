const util = require('util')
const Redis = require('ioredis')
const fblogin = require('facebook-chat-api')
const _ = require('lodash')
const debug = require('debug')('botium-connector-fbpagereceiver')
const debugFbApi = require('debug')('botium-connector-fbpagereceiver-FbApi')

const Capabilities = {
  FBPAGERECEIVER_PAGEID: 'FBPAGERECEIVER_PAGEID',
  FBPAGERECEIVER_TESTUSER: 'FBPAGERECEIVER_TESTUSER',
  FBPAGERECEIVER_TESTPASSWORD: 'FBPAGERECEIVER_TESTPASSWORD',
  FBPAGERECEIVER_TESTUSER_FULLNAME: 'FBPAGERECEIVER_TESTUSER_FULLNAME',
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
    await this._startFacebookApi()
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

    await this._stopFacebookApi()
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
      this.redis.on('message', (channel, message) => {
        if (this.queueReceivedMessages) {
          if (!_.isString(message)) {
            return debug(`WARNING: received non-string message from ${channel}, ignoring: ${message}`)
          }
          try {
            message = JSON.parse(message)
          } catch (err) {
            return debug(`WARNING: received non-json message from ${channel}, ignoring: ${message}`)
          }

          if (!message.sender.id || message.sender.id !== this.caps[Capabilities.FBPAGERECEIVER_PAGEID]) {
            return debug(`Received a message not originiating from my page at ${channel}: ${util.inspect(message)}`)
          }
          if (!message.recipient.id || message.recipient.name !== this.caps[Capabilities.FBPAGERECEIVER_TESTUSER_FULLNAME]) {
            return debug(`Received a message not targeted at current user "${this.caps[Capabilities.FBPAGERECEIVER_TESTUSER_FULLNAME]}" at ${channel}: ${util.inspect(message)}`)
          }

          const botMsg = { sender: 'bot', sourceData: message, messageText: message.text }
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
          return reject(new Error(`Facebook login failed: ${util.inspect(err)}`))
        }
        debug('logging into facebook ready')
        this.fbapi = api
        resolve()
      })
    })
  }

  _startFacebookApi () {
    this._stopFacebookApi()

    this.fbapiStopListener = this.fbapi.listen((err, event) => {
      if (err) {
        debug(`fbapi Error: ${util.inspect(err)}`)
      } else if (event.type === 'message') {
        debug(`fbapi received message: ${util.inspect(event)}`)
      } else {
        debug(`fbapi received ignored event: ${util.inspect(event)}`)
      }
    })
  }

  _stopFacebookApi () {
    if (this.fbapiStopListener) {
      this.fbapiStopListener()
      this.fbapiStopListener = null
    }
  }

  _cleanFacebookApi () {
    this._stopFacebookApi()

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
