// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';

const {Coin} = require("./Coin");
const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
//const {Card, Suggestion} = require('dialogflow-fulfillment');
const { BasicCard, Button, Image, List, Suggestions} = require('actions-on-google');

const fs = require('fs') // to read data from file

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

const Binance = require('node-binance-api');
const binance = new Binance();

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
  console.log('Dialogflow Intent: ' + agent.intent);
  console.log('Dialogflow Parameters: ' + agent.parameters);

  let conv = agent.conv(); // Get Actions on Google library conv instance
  let coinHelper = new Coin();



  if (conv !== null && conv.data.news === undefined ) {
    conv.data.news = [];
  }

  if ( conv !== null && conv.data.newsCounter === undefined ) {
    conv.data.newsCounter = 0;
  }

  if ( conv !== null && conv.data.currentCoin === undefined ) {
    conv.data.currentCoin = '';
  }

  function welcome(agent) {
    //agent.add(`Welcome to my agent!!!`);
      conv.ask('Hello from the Actions on Google client library!') // Use Actions on Google library
      agent.add(conv); // Add Actions on Google library responses to your agent's response
  }

  function fallback(agent) {
    agent.add(`I didn't understand`);
    agent.add(`I'm sorry, can you try again?`);
  }

  /*
  * Tutorial
  * */
  function defineTerm(agent){
    let searchTerm = agent.parameters['search-term'];
    let response = getTermDefinition(searchTerm)

    agent.add(response);
  }

  function getTermDefinition(searchTerm){
    let data = fs.readFileSync('response.json','utf8');
    let res = JSON.parse(data)
    for(let item of res.results) {
      if (item.term === searchTerm || item.abbreviation === searchTerm)
        return item.definition;
    }
  }


  async function listNews(agent) {
    let response = await getNewsList();
    agent.add(response);
  }

  async function getNewsList(){
    // reset newsCounter and news list and currentCoin
    conv.data.news = [];
    conv.data.newsCounter = 0;
    conv.data.currentCoin = '';

    if (conv.data.news.length === 0){ // check if we have data from the api service
      conv.data.news= await coinHelper.getHotNews();

      return buildNewsListResponse();
    } else {
      return buildNewsListResponse();
    }
  }

  function buildNewsListResponse(){
    let responseToUser = '';
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
    // reset newsCounter and news list and currentCoin
    conv.data.news = [];
    conv.data.newsCounter = 0;
    conv.data.currentCoin = '';

    let response = await displayNews();
    agent.add(response);
    // next intent: call tutorial intent
  }

  /*
  *
  * */
  async function showNewsByCoin(agent) {
    // reset newsCounter and news list
    conv.data.news = [];
    conv.data.newsCounter = 0;

    conv.data.currentCoin = agent.parameters['currency-name'];
    let response = await displayNews();
    response.ask("Do you want to know more about " + conv.data.currentCoin + "?")
    agent.add(response);

    // clear currentCoin to give the user the ability to ask for different coin
    //conv.data.currentCoin = '';

    // next intent: call tutorial intent
  }

  function showMoreAboutCoin(agent){

    let currency = conv.contexts.get('pass_search_term').parameters['currency-name'];
    let response = getTermDefinition(currency);
    conv.ask(response)
    agent.add(conv);
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
    let response = await coinHelper.getCoinPrice(coin);
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
  async function displayNews(){

    if (conv === null || conv.data.news.length === 0){ // check if we have already fetched news
      if (conv.data.currentCoin === ''){
        conv.data.news = await coinHelper.getHotNews();
      }
      else {
        conv.data.news = await coinHelper.getCoinNews(conv.data.currentCoin);
      }
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

  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Default Fallback Intent', fallback);
  intentMap.set('show news', showNews);
  intentMap.set('show news by coin', showNewsByCoin);
  intentMap.set('show news by coin - yes', showMoreAboutCoin);
  intentMap.set('show news - next', nextNews);
  intentMap.set('show news by coin - next', nextNews);
  intentMap.set('show news - next - previous', previousNews);
  intentMap.set('show news list', listNews);
  intentMap.set('show news list - select.number', selectNewsByNumber);
  intentMap.set('coin price', showPrice);

  /*
  * Tutorial Skill intents
  * */
  intentMap.set('define term', defineTerm);

  agent.handleRequest(intentMap);
});
