const Redis = require('ioredis')

const redis = new Redis('redis://192.168.99.100:6379')

redis.on('message', (channel, message) => {
  console.log(`Received the following message from ${channel}: ${message}`)
})

const channel = '347904289373005'

redis.subscribe(channel, (error, count) => {
  if (error) {
    throw new Error(error)
  }
  console.log(`Subscribed to ${count} channel. Listening for updates on the ${channel} channel.`)
})
