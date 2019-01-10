# Botium Connector for Facebook Messenger Bots 

[![NPM](https://nodei.co/npm/botium-connector-fbpagereceiver.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/botium-connector-fbpagereceiver/)

[ ![Codeship Status for codeforequity-at/botium-connector-fbpagereceiver](https://app.codeship.com/projects/6bffcdf0-f1a7-0136-68b5-1af3614a04bd/status?branch=master)](https://app.codeship.com/projects/320411)
[![npm version](https://badge.fury.io/js/botium-connector-fbpagereceiver.svg)](https://badge.fury.io/js/botium-connector-fbpagereceiver)
[![license](https://img.shields.io/github/license/mashape/apistatus.svg)]()

This is a [Botium](https://github.com/codeforequity-at/botium-core) connector for testing your Facebook Messenger chatbot.

__Did you read the [Botium in a Nutshell](https://medium.com/@floriantreml/botium-in-a-nutshell-part-1-overview-f8d0ceaf8fb4) articles ? Be warned, without prior knowledge of Botium you won't be able to properly use this library!__

## How it works ?
Botium uses two technologies for driving the conversations against your chatbot.

For __Sending Messages__ the great [facebook-chat-api](https://github.com/Schmavery/facebook-chat-api) library is used - it mimicks the behaviour of a browser to login to Facebook and sending a text messages to your chatbot.

For __Receiving Messages__ it's a bit more tricky: we register a special webhook as "Secondary Receiver" at the Facebook Page to receive all your chatbot's input and output messages. The "Secondary Receiver" concept is part of the [handover protocol](https://developers.facebook.com/docs/messenger-platform/handover-protocol/): it allows additional webhooks to be registered in "standby" mode, and this is what Botium does.

__Redis__ is used to connect the webhook to Botium scripts: all messages received over the webhook are published to Redis, and Botium on the other end subscribes to those Redis channels before running a conversation. 

It can be used as any other Botium connector with all Botium Stack components:
* [Botium CLI](https://github.com/codeforequity-at/botium-cli/)
* [Botium Bindings](https://github.com/codeforequity-at/botium-bindings/)
* [Botium Box](https://www.botium.at)

## Requirements

* __Node.js and NPM__
* a __Facebook Messenger__ chatbot, and a facebook developer account with administrative rights
* a __Redis__ instance (Cloud hosted free tier for example from [redislabs](https://redislabs.com/) will do as a starter)
* a __project directory__ on your workstation to hold test cases and Botium configuration

## Install and Run the Botium webhook service

The Botium webhook service is responsible for receiving part, gots messages from Messenger, and puts them into Redis.

It is running outside of Botium as a background service, as it has to be always-on - otherwise Facebook servers will quit transmitting messages to it.

Installation with NPM:

    > npm install -g botium-connector-fbpagereceiver
    > botium-fbproxy-cli start --help

There are several options required for running the Botium webhook service:

_--port_: Local port to listen

_--verifytoken_: Facebook Verification Token

_--accesstoken_: Facebook Page Access Token

_--appsecret_: Facebook App Secret for request verification (optional)

_--endpoint_: Webhook endpoint (url part after the port ...) (optional, default _/api/botium-connector-fbpagereceiver_)

_--redisurl_: Redis connection url

Obviously, you are already familiar with the Facebook developer console to register a webhook, so you already know where to get those tokens and secrets - otherwise, start to learn [here](https://developers.facebook.com/docs/messenger-platform/webhook/)

Botium is providing the service, but you have to take care for connectivity and process management yourself:
* If your server is not reachable from the internet, consider to use a service like [ngrok](https://ngrok.com/) for publishing your endpoint (If you use ngrok start it on the port of the Webhook Service) - __Attentions: Facebook accepts HTTPS secured endpoints only!__
* For process management, logging, monitoring we recommend to use [pm2](https://pm2.keymetrics.io)

## Register Botium webhook service as "Secondary Receiver"

Here are the steps how to register the Botium webhook service as a Secondary Receiver:

1. In the [Facebook developer console](https://developers.facebook.com/) create a new Facebook App, and call it something like _MyChatbot Botium Standby App_
2. Add products _Messenger_ and _Webhooks_ to the app
3. In _Messenger_ section, create a page access key for the page your chatbot is connected to. 
4. Using this page access key, you can now start the Botium webhook service (with _--accesstoken_ parameter)
5. Register the Botium webhook service as Facebook webhook
    1. The webhook url is something like _https://your-public-ip/api/botium-connector-fbpagereceiver_
    2. The _verification token_ has to be the same as handed to the Botium webhook service (with _--verifytoken_ parameter)
    3. Events to subscribe to: messages, messaging_postbacks, message_echoes, standby
6. Now navigate to the Facebook page the chatbot is connected to and open the page settings, section _Messenger Platform_
7. In the _Subscribed Apps_ section, make sure that the actual chatbot app has the role _Primary Receiver_ while the newly created app has the role _Secondary Receiver_. (If you dont see a chatbot app here, check Facebook developer console -> Messenger -> Settings -> Webhooks -> Select a page to subscribe your webhook to the page events. App must be subscribed to the page here.)

## Install Botium and Facebook Connector

When using __Botium CLI__:

```
> npm install -g botium-cli
> npm install -g botium-connector-fbpagereceiver
> cd <your working dir>
> botium-cli init
> botium-cli run
```

When using __Botium Bindings__:

```
> npm install -g botium-bindings
> npm install -g botium-connector-fbpagereceiver
> botium-bindings init mocha
> npm install && npm run mocha
```

When using __Botium Box__:

_Already integrated into Botium Box, no setup required_

## Connecting your Facebook Messenger Chatbot to Botium

Open the file _botium.json_ in your working directory and add the Facebook credentials and Redis connection settings.

```
{
  "botium": {
    "Capabilities": {
      "PROJECTNAME": "<whatever>",
      "CONTAINERMODE": "fbpagereceiver",
      "FBPAGERECEIVER_PAGEID": "...",
      "FBPAGERECEIVER_TESTUSER": "...",
      "FBPAGERECEIVER_TESTPASSWORD": "...",
      "FBPAGERECEIVER_TESTUSER_FULLNAME": "...",
      "FBPAGERECEIVER_REDISURL": "redis://127.0.0.1:6379"
    }
  }
}
```
Botium setup is ready, you can begin to write your [BotiumScript](https://github.com/codeforequity-at/botium-core/wiki/Botium-Scripting) files.

__Important: The Botium webhook service has to be running when Botium is started. Otherwise, Botium scripts will fail to receive any input or output messages from your chatbot!__

## Supported Capabilities

Set the capability __CONTAINERMODE__ to __fbpagereceiver__ to activate this connector.

### FBPAGERECEIVER_PAGEID
Facebook Page ID the chatbot is linked to (Facebook Page -> About -> More Info -> Page ID)

### FBPAGERECEIVER_TESTUSER
Facebook test user to run the conversations

### FBPAGERECEIVER_TESTPASSWORD
Facebook test user password

### FBPAGERECEIVER_TESTUSER_FULLNAME
The full name of the above test user. This is required because the chatbot users and the facebook users are not linked in any way (they have different ids - "page scoped ids"), and Botium needs a way to tell what messages belong together. This is done by using the full name.

### FBPAGERECEIVER_ASKFORLOGINAPPROVAL
Set this capability to true to bring up an input prompt if facebook asks for login approval. This may happen if logged in from a new location or from a cloud server.

### FBPAGERECEIVER_REDISURL
The url of your Redis instance - for example _redis://127.0.0.1:6379_.

Or a Redis options object - see [here](https://github.com/luin/ioredis#connect-to-redis)

## Open Issues and Restrictions

* Quick Reply buttons are not delivered to the Secondary Receiver webhook, so Botium won't receive it. It will receive cards and pictures though.
