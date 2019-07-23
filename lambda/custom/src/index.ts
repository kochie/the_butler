/* eslint-disable  func-names */
/* eslint-disable  no-console */

import { SkillBuilders, HandlerInput, ErrorHandler } from 'ask-sdk-core';
import { SessionEndedRequest, IntentRequest } from 'ask-sdk-model';
import axios from 'axios';
// import { device } from 'aws-iot-device-sdk';
import { IotData } from 'aws-sdk'
import { NEWS_URL, THING_NAME, ENDPOINT, DEFAULT_COFFEE } from './constants';

const LaunchRequestHandler = {
  canHandle(handlerInput: HandlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput: HandlerInput) {
    const introText = 'Welcome from your butler, I\'m here to make your day.';
    const coffeePrompt = 'Would you like a coffee?'

    return handlerInput.responseBuilder
      .speak(`${introText} ${coffeePrompt}`)
      .reprompt(coffeePrompt)
      .withSimpleCard('Welcome, Coffee?', `${introText} ${coffeePrompt}`)
      .getResponse();
  },
};

const HelloWorldIntentHandler = {
  canHandle(handlerInput: HandlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'HelloWorldIntent';
  },
  handle(handlerInput: HandlerInput) {
    const speechText = 'Hello World!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('Hello World', speechText)
      .getResponse();
  },
};

const MakeCoffeeIntentHandler = {
  canHandle(handlerInput: HandlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'MakeCoffeeIntent';
  },
  async handle(handlerInput: HandlerInput) {
    const speechText = 'Alright, what coffee should I make?';

    const request = <IntentRequest>handlerInput.requestEnvelope.request

    // if (!(request.intent.slots && request.intent.slots['coffeeType'])){
    //   return handlerInput.responseBuilder
    //     .addDelegateDirective(request.intent)
    //     .getResponse();
    //   // return handlerInput.responseBuilder.speak(speechText).getResponse()
    // }
    const coffeeType = (request.intent.slots && request.intent.slots['coffeeType']) || DEFAULT_COFFEE
    console.log(coffeeType)
    const makingCoffee = `Making Coffee ${coffeeType.value}`

    const accessKeyId = process.env.ACCESS_KEY_ID
    const secretAccessKey = process.env.SECRET_ACCESS_KEY

    const iotData = new IotData({accessKeyId, secretAccessKey, region: 'us-east-1', endpoint: ENDPOINT})
    const response = await iotData.getThingShadow({thingName: THING_NAME}).promise()
    if (!response.$response.data) throw Error("Bad response from getThingShadow")
    console.log("SHADOW", response.$response.data)
    const state = JSON.parse(response.$response.data.payload as string).state.desired || {}
    const cupsMade = state['cupsMade'] ? state['cupsMade'] : 0
    const payload = JSON.stringify({state: {reported: {...state, cupsMade: cupsMade+1}}})
    await iotData.updateThingShadow({thingName: THING_NAME, payload}).promise()

    return handlerInput.responseBuilder
      .speak(makingCoffee)
      .reprompt(makingCoffee)
      .withSimpleCard(makingCoffee, speechText)
      .getResponse();
  },
};

const ReadNewsIntentHandler = {
  canHandle(handlerInput: HandlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'ReadNewsIntent';
  },
  async handle(handlerInput: HandlerInput) {
    
    const news = await axios.get(NEWS_URL).then(data => data.data)
    // console.log(news)
    const newsItem = news.articles[Math.floor(Math.random()*news.articles.length)];

    const response = `From ${newsItem.author} at the ${newsItem.source.name}. ${newsItem.title}`

    return handlerInput.responseBuilder
      .speak(response)
      // .speak("hi coffee")
      .withSimpleCard('In the news today', newsItem.description)
      .getResponse();
  },
};

const RecommendationHandler = {
  canHandle(handlerInput: HandlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'RecommendCoffeeIntent';
  },
  handle(handlerInput: HandlerInput) {
    const speechText = 'Have you tried the new brew from The Roasting Warehouse? They\'re woody and sweet. I can order some if you want?';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Bean Recommendation', speechText)
      .getResponse();
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput: HandlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput: HandlerInput) {
    const speechText = 'I can make you coffee, or recommend different beans to try. I can also tell you the news.';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('What can I do?', speechText)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput: HandlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput: HandlerInput) {
    const speechText = 'Goodbye!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('Hello World', speechText)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput: HandlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput: HandlerInput) {
    console.log(`Session ended with reason: ${
        (handlerInput.requestEnvelope.request as SessionEndedRequest).reason
    }`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput: HandlerInput, error: Error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

const skillBuilder = SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    HelloWorldIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler,
    MakeCoffeeIntentHandler,
    ReadNewsIntentHandler,
    RecommendationHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
