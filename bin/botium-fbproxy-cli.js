#!/usr/bin/env node
const util = require('util')
const yargsCmd = require('yargs')
const debug = require('debug')('botium-fbproxy-cli')

const startProxy = require('../src/proxy').startProxy

const wrapHandler = (builder) => {
  const origHandler = builder.handler
  builder.handler = (argv) => {
    if (argv.verbose) {
      require('debug').enable('botium*')
    }
    debug(`command options: ${util.inspect(argv)}`)
    origHandler(argv)
  }
  return builder
}

yargsCmd.usage('Botium Facebook Proxy\n\nUsage: $0 [options]') // eslint-disable-line
  .help('help').alias('help', 'h')
  .version('version', require('../package.json').version).alias('version', 'V')
  .showHelpOnFail(true)
  .strict(true)
  .demandCommand(1, 'You need at least one command before moving on')
  .env('BOTIUM_FBPROXY')
  .command(wrapHandler({
    command: 'start',
    describe: 'Launch Botium Facebook Proxy',
    builder: (yargs) => {
      yargs
        .option('port', {
          describe: 'Local port the proxy is listening to (also read from env variable "BOTIUM_FBPROXY_PORT")',
          demandOption: true,
          number: true,
          default: 5000
        })
        .option('verify', {
          describe: 'Facebook Verification Token (also read from env variable "BOTIUM_FBPROXY_VERIFY")',
          demandOption: true
        })
        .option('endpoint', {
          describe: 'Facebook Webhook Endpoint (also read from env variable "BOTIUM_FBPROXY_ENDPOINT")',
          demandOption: true,
          default: '/api/botium-connector-fbpagereceiver'
        })
    },
    handler: startProxy
  }))
  .option('verbose', {
    alias: 'v',
    describe: 'Enable verbose output (also read from env variable "BOTIUM_FBPROXY_VERBOSE" - "1" means verbose)',
    default: false
  })
  .argv
