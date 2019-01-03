# Botium Connector for Facebook Messenger Bots 

[![NPM](https://nodei.co/npm/botium-connector-fbpagereceiver.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/botium-connector-fbpagereceiver/)

[ ![Codeship Status for codeforequity-at/botium-connector-dialogflow](https://app.codeship.com/projects/1c935480-633f-0136-f02a-52b5f01093c8/status?branch=master)](https://app.codeship.com/projects/296958)
[![npm version](https://badge.fury.io/js/botium-connector-fbpagereceiver.svg)](https://badge.fury.io/js/botium-connector-fbpagereceiver)
[![license](https://img.shields.io/github/license/mashape/apistatus.svg)]()

This is a [Botium](https://github.com/codeforequity-at/botium-core) connector for testing your Facebook Messenger chatbot.

__Did you read the [Botium in a Nutshell](https://medium.com/@floriantreml/botium-in-a-nutshell-part-1-overview-f8d0ceaf8fb4) articles ? Be warned, without prior knowledge of Botium you won't be able to properly use this library!__

## How it works ?
Botium runs your conversations against the Dialogflow API.

It can be used as any other Botium connector with all Botium Stack components:
* [Botium CLI](https://github.com/codeforequity-at/botium-cli/)
* [Botium Bindings](https://github.com/codeforequity-at/botium-bindings/)
* [Botium Box](https://www.botium.at)

## Requirements

* __Node.js and NPM__
* a __Facebook Messenger__ chatbot, and a facebook developer account with administrative rights
* a __project directory__ on your workstation to hold test cases and Botium configuration

## Install Secondary Receiver Webhook

Events to subscribe to: messages, messaging_postbacks, message_echoes, standby



## Install Botium and Dialogflow Connector

When using __Botium CLI__:

```
> npm install -g botium-cli
> npm install -g botium-connector-fbpagereceiver
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

## Connecting Dialogflow Agent to Botium

Open the file _botium.json_ in your working directory and add the Google credentials for accessing your Dialogflow agent. [This article](https://chatbotsmagazine.com/3-steps-setup-automated-testing-for-google-assistant-and-dialogflow-de42937e57c6) shows how to retrieve all those settings.

```
{
  "botium": {
    "Capabilities": {
      "PROJECTNAME": "<whatever>",
      "CONTAINERMODE": "dialogflow",
      "DIALOGFLOW_PROJECT_ID": "<google project id>",
      "DIALOGFLOW_CLIENT_EMAIL": "<service credentials email>",
      "DIALOGFLOW_PRIVATE_KEY": "<service credentials private key>"
    }
  }
}
```

To check the configuration, run the emulator (Botium CLI required) to bring up a chat interface in your terminal window:

```
> botium-cli emulator
```

Botium setup is ready, you can begin to write your [BotiumScript](https://github.com/codeforequity-at/botium-core/wiki/Botium-Scripting) files.

## Supported Capabilities

Set the capability __CONTAINERMODE__ to __fbpagereceiver__ to activate this connector.

### FBPAGERECEIVER_PAGEID
### FBPAGERECEIVER_TESTUSER
### FBPAGERECEIVER_TESTPASSWORD
### FBPAGERECEIVER_TESTUSER_FULLNAME
### FBPAGERECEIVER_ASKFORLOGINAPPROVAL
### FBPAGERECEIVER_REDISURL

## Open Issues and Restrictions

* Quick Reply buttons are not delivered to the Secondary Receiver webhook, so Botium won't receive it. It will receive cards and pictures though.