// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';

const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

const axios = require('axios');

const Binance = require('node-binance-api');
const binance = new Binance();

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
  console.log('Dialogflow Intent: ' + agent.intent);
  console.log('Dialogflow Parameters: ' + agent.parameters);
  console.log('Dialogflow Music: ' + agent.parameters['music-artist']);

  let conv = agent.conv(); // Get Actions on Google library conv instance

  if (conv !== null && conv.data.news === undefined ) {
    conv.data.news = [];
  }

  function welcome(agent) {
    agent.add(`Welcome to my agent!!!`);
  }

  function fallback(agent) {
    agent.add(`I didn't understand`);
    agent.add(`I'm sorry, can you try again?`);
  }

  function voting(agent) {
      agent.add(`Voting to`);
  }

  function coinPrice(agent){
    agent.add(`BNB price is 640.66`);
  }

  async function showNews(agent) {
    let response = await displayNews();
    agent.add(response);
  }

  async function displayNews(){
    if (conv === null || conv.data.news.length === 0){ // check if we have already fetched news
      await getNews();
      // display
      return buildSingelNewsResponse();
    } else {
      // display
      return buildSingelNewsResponse();
    }
  }

  function buildSingelNewsResponse(){
    let responseToUser;
    if (conv.data.news.length === 0){
      responseToUser = 'No news available now';
    }else {
      let newsItem = conv.data.news[0];
      responseToUser = 'News number 1 ';
      responseToUser += newsItem.title;

      conv.ask(responseToUser);

      // TODO display newsItem in a card
    }

    return conv;
  }

  function getNews(){
    return axios.get('https://cryptopanic.com/api/v1/posts/?auth_token=f9ea6488d66276436a65695a038699d8ddea9ed0&filter=hot')
        .then(function (response) {
          let news = response.data;
          saveNews(news.results);
        })
        .catch(function (error) {
          console.log('no news were found')
          console.log(error);
        });
  }

  // we save the data to avoid call the api every time
  function saveNews(news){
    if (conv !== null){
      conv.data.news = news;
    }
  }

  // // Uncomment and edit to make your own intent handler
  // // uncomment `intentMap.set('your intent name here', yourFunctionHandler);`
  // // below to get this function to be run when a Dialogflow intent is matched
  // function yourFunctionHandler(agent) {
  //   agent.add(`This message is from Dialogflow's Cloud Functions for Firebase editor!`);
  //   agent.add(new Card({
  //       title: `Title: this is a card title`,
  //       imageUrl: 'https://developers.google.com/actions/images/badges/XPM_BADGING_GoogleAssistant_VER.png',
  //       text: `This is the body text of a card.  You can even use line\n  breaks and emoji! 💁`,
  //       buttonText: 'This is a button',
  //       buttonUrl: 'https://assistant.google.com/'
  //     })
  //   );
  //   agent.add(new Suggestion(`Quick Reply`));
  //   agent.add(new Suggestion(`Suggestion`));
  //   agent.setContext({ name: 'weather', lifespan: 2, parameters: { city: 'Rome' }});
  // }

  // // Uncomment and edit to make your own Google Assistant intent handler
  // // uncomment `intentMap.set('your intent name here', googleAssistantHandler);`
  // // below to get this function to be run when a Dialogflow intent is matched
  // function googleAssistantHandler(agent) {
  //   let conv = agent.conv(); // Get Actions on Google library conv instance
  //   conv.ask('Hello from the Actions on Google client library!') // Use Actions on Google library
  //   agent.add(conv); // Add Actions on Google library responses to your agent's response
  // }
  // // See https://github.com/dialogflow/fulfillment-actions-library-nodejs
  // // for a complete Dialogflow fulfillment library Actions on Google client library v2 integration sample

  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Default Fallback Intent', fallback);
  intentMap.set('music vote', voting);
  intentMap.set('show news', showNews);
  intentMap.set('coin price', coinPrice);
  // intentMap.set('your intent name here', yourFunctionHandler);
  // intentMap.set('your intent name here', googleAssistantHandler);
  agent.handleRequest(intentMap);
});
