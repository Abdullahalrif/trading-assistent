// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';

const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
//const {Card, Suggestion} = require('dialogflow-fulfillment');
const { BasicCard, Button, Image, List, Suggestions} = require('actions-on-google');

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

  if ( conv !== null && conv.data.newsCounter === undefined ) {
    conv.data.newsCounter = 0;
  }

  function welcome(agent) {
    agent.add(`Welcome to my agent!!!`);
  }

  function fallback(agent) {
    agent.add(`I didn't understand`);
    agent.add(`I'm sorry, can you try again?`);
  }

  async function listNews(agent) {
    let response = await getNewsList();
    agent.add(response);
  }

  async function getNewsList(){
    conv.data.newsCounter = 0;
    if (conv.data.news.length === 0){ // check if we have data from the api service
      await getNews();

      return buildNewsListResponse();
    } else {
      return buildNewsListResponse();
    }
  }

  function buildNewsListResponse(){
    let responseToUser;
    if (conv.data.news.length === 0){
      responseToUser = 'no news available at this time! try again later';
      conv.close(responseToUser); // close conversation later call another intent
    } else {
      let textList = 'This is a list of news. Please select one to proceed';
      let items = {};

      for (let i = 0; i < conv.data.news.length; i++){
        let newsItem = conv.data.news[i];
        items['news ' + i] ={
          title: 'News ' + (i + 1),
          description: newsItem.title,
          image: new Image({
            url: 'https://storage.googleapis.com/actionsresources/logo_assistant_2x_64dp.png',
            alt: 'test image'
          })
        }
        if (i < 3){
          responseToUser += ' News number  ' + (i + 1) + ':';
          responseToUser += newsItem.title;
        }
      }
      conv.ask(textList);
      conv.ask(responseToUser);

      // show list
      if (conv.surface.capabilities.has("actions.capability.SCREEN_OUTPUT")){  // check if screen is available
        conv.ask(new List({
          title: 'List of news',
          items
        }));
      }
    }

    return conv;
  }

  /*
  * this method will handle tow cases:
  *   1- if user clicks on the items in the news list
  *   2- if user says or writes the number of a news
  * */
  async function selectNewsByNumber(agent){
    // if user clicks on the items in the news list
    let option = agent.contexts.find(function (obj){
      return obj.name === 'actions_intent_option';
    });
    if (option && option.hasOwnProperty('parameters') && option.parameters.hasOwnProperty('OPTION')){
      conv.data.newsCounter = parseInt(option.parameters.OPTION.replace('news ', ''))
    }

    // if user says or writes the number of a news
    let number = agent.parameters['number'];
    if (number.length > 0){
      conv.data.newsCounter = parseInt(number[0]) -1;
    }

    let response = await displayNews();
    agent.add(response);
  }

  /*
  *
  * */
  async function showNews(agent) {
    let response = await displayNews();
    agent.add(response);
    // next intent: call tutorial intent
  }

  /*
  *
  * */
  async function showNewsByCoin(agent) {
    let coin = agent.parameters['currency-name'];
    let response = await displayNews(coin);
    agent.add(response);
    // next intent: call tutorial intent
  }

  /*
  *
  * */
  async function nextNews(agent){
    conv.data.newsCounter++;
    let response = await displayNews();
    agent.add(response);
  }

  /*
  *
  * */
  async function previousNews(agent){
    if (conv.data.newsCounter > 0){
      conv.data.newsCounter--;
      let response = await displayNews();
      agent.add(response);
    }
  }

  /*
  * show price
  * */
  async function showPrice(agent){
    let coin = agent.parameters['currency-name'];
    let response = await getCoinPrice(coin);

    agent.add(coin + ' is '  + response + ' $');
  }


  const getCoinPrice = async (coin) => {
    let symbol = coin + 'USDT'
    const result = await binance.prices()
    return  result[symbol]
  }


  /*
  *
  * */
  async function displayNews(coin){

    if (conv === null || conv.data.news.length === 0){ // check if we have already fetched news
      await getNews(coin);
      // display
      return buildSingelNewsResponse();
    } else {
      // display
      return buildSingelNewsResponse();
    }
  }

  /*
  *
  * */
  function buildSingelNewsResponse(){
    let responseToUser;
    if (conv.data.news.length === 0){
      responseToUser = 'No news available now';
      conv.ask(responseToUser);
    }else {
      let newsItem = conv.data.news[conv.data.newsCounter];
      responseToUser = 'News number ' + (conv.data.newsCounter+1)  + ' ';
      responseToUser += newsItem.title;

      conv.ask(responseToUser);

      // display newsItem in a card
      if (conv.surface.capabilities.has("actions.capability.SCREEN_OUTPUT")){ // check if screen is available
        conv.ask(new BasicCard({
          text: newsItem.title,
          subtitle: 'This is a subtitle',
          title: 'Title: this is a title',
          buttons: new Button({
            title: 'Read more',
            url: newsItem.url,
          }),
          image: new Image({
            url: 'https://storage.googleapis.com/actionsresources/logo_assistant_2x_64dp.png',
            alt: 'Image alternate text',
          }),
          display: 'CROPPED',
        }));

        conv.ask(new Suggestions('Next'));
      }
    }
    return conv;
  }

  /*
  *
  * */
  function getNews(coin){
    coin = (typeof coin === 'undefined') ? 'default' : coin; // check if the parameter coin is passed
    let apiUrl;
    if (coin !== "default"){
      apiUrl = 'https://cryptopanic.com/api/v1/posts/?auth_token=f9ea6488d66276436a65695a038699d8ddea9ed0&filter=hot&currencies=' + coin;
    }
    else {
      apiUrl = 'https://cryptopanic.com/api/v1/posts/?auth_token=f9ea6488d66276436a65695a038699d8ddea9ed0&filter=hot';
    }
    return axios.get(apiUrl)
        .then(function (response) {
          let news = response.data;
          saveNews(news.results);
        })
        .catch(function (error) {
          console.log('no news were found')
          console.log(error);
        });
  }

  /*
  * this method is used to save the data (news) coming from the api to avoid call the api every time
  * */
  function saveNews(news){
    if (conv !== null){
      conv.data.news = news;
    }
  }

  /*
  * Get Coin price
  * */


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
  intentMap.set('show news', showNews);
  intentMap.set('show news by coin', showNewsByCoin);
  intentMap.set('show news - next', nextNews);
  intentMap.set('show news - next - previous', previousNews);
  intentMap.set('show news list', listNews);
  intentMap.set('show news list - select.number', selectNewsByNumber);
  intentMap.set('coin price', showPrice);
  // intentMap.set('your intent name here', yourFunctionHandler);
  // intentMap.set('your intent name here', googleAssistantHandler);
  agent.handleRequest(intentMap);
});
