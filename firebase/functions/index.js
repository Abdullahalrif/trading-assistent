// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';

const {Coin} = require("./Coin");
const {UserResponse} = require("./UserResponse");
const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
//const {Card, Suggestion} = require('dialogflow-fulfillment');
const {BasicCard, Button, Image, List, Suggestions} = require('actions-on-google');

const fs = require('fs') // to read data from file

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
    const agent = new WebhookClient({request, response});
    console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
    console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
    console.log('Dialogflow Intent: ' + agent.intent);
    console.log('Dialogflow Parameters: ' + agent.parameters);

    let conv = agent.conv(); // Get Actions on Google library conv instance

    if (conv !== null && conv.data.news === undefined) {
        conv.data.news = [];
    }

    if (conv !== null && conv.data.newsCounter === undefined) {
        conv.data.newsCounter = 0;
    }

    if (conv !== null && conv.data.currentCoin === undefined) {
        conv.data.currentCoin = '';
    }

    // Helpers
    let coinHelper = new Coin();
    let userResponseBuilder = new UserResponse(conv);

    function welcome(agent) {
        if (conv.user.last.seen) {
            conv.ask(`Hey you're back...`);
        } else {
            conv.ask('Welcome to my agent!') // Use Actions on Google library
        }
        agent.add(conv); // Add Actions on Google library responses to the agent's response
    }

    function fallback(agent) {
        agent.add(`I didn't understand`);
        agent.add(`I'm sorry, can you try again?`);
    }


    function defineTerm(agent) {
        let searchTerm = agent.parameters['search-term'];
        let response = getTermDefinition(searchTerm)

        agent.add(response);
    }

    function getTermDefinition(searchTerm) {
        let data = fs.readFileSync('response.json', 'utf8');
        let res = JSON.parse(data)
        for (let item of res.results) {
            if (item.term === searchTerm || item.abbreviation === searchTerm){
                return item.definition;
            }
            else {
                return "i dont know what " + searchTerm + " is! " + "please say something else";
            }
        }
    }


    async function listNews(agent) {

        let response = await getNewsList();
        agent.add(response);
    }

    async function getNewsList() {
        // reset newsCounter and news list and currentCoin
        conv.data.news = [];
        conv.data.newsCounter = 0;
        conv.data.currentCoin = '';

        if (conv.data.news.length === 0) { // check if we have data from the api service
            conv.data.news = await coinHelper.getHotNews();

            return userResponseBuilder.buildNewsListResponse();
        } else {
            return userResponseBuilder.buildNewsListResponse();
        }
    }

    /*
    * this method will handle tow cases:
    *   1- if user clicks on the items in the news list
    *   2- if user says or writes the number of a news
    * */
    async function selectNewsByNumber(agent) {
        // if user clicks on the item in the news list
        let option = agent.contexts.find(function (obj) {
            return obj.name === 'actions_intent_option';
        });

        if (option && option.hasOwnProperty('parameters') && option.parameters.hasOwnProperty('OPTION')) {
            conv.data.newsCounter = parseInt(option.parameters.OPTION.replace('news ', ''))
        }

        // if user says or writes the number of a news
        let number = agent.parameters['number'];
        if (number.length > 0) {
            conv.data.newsCounter = parseInt(number[0]) - 1;
        }

        let response = await displayNews();
        agent.add(response);
    }

    /*
    *
    * */
    async function showHotNews(agent) {
        // reset newsCounter and news list and currentCoin
        conv.data.news = [];
        conv.data.newsCounter = 0;
        conv.data.currentCoin = '';

        let response = await displayNews();
        agent.add(response);
    }

    /*
    *
    * */
    async function showNewsByCoin(agent) {
        // reset newsCounter and news list
        conv.data.news = [];
        conv.data.newsCounter = 0;
        conv.data.currentCoin = agent.parameters['currency'];

        let response = await displayNews();

        response.ask("Do you want to know more about " + conv.data.currentCoin + "?")
        agent.add(response);
    }

    function showMoreAboutCoin(agent) {
        let currency = conv.contexts.get('pass_search_term').parameters['currency'];
        let response = getTermDefinition(currency);
        conv.ask(response)
        agent.add(conv);
    }

    /*
    *
    * */
    async function nextNews(agent) {
        conv.data.newsCounter++;
        let response = await displayNews();
        agent.add(response);
    }

    /*
    *
    * */
    async function previousNews(agent) {
        if (conv.data.newsCounter > 0) {
            conv.data.newsCounter--;
            let response = await displayNews();
            agent.add(response);
        }
    }

    /*
    * show price
    * */
    async function showPrice(agent) {
        let coin = agent.parameters['currency'];
        let response = await coinHelper.getCoinPrice(coin);
        agent.add(coin + ' is ' + response + ' $');
    }

    async function earnWithCoinInSpecificPeriod(agent){

        let coin = agent.parameters['currency'];
        let dateUnit = agent.parameters['buydate']['date-unit'] ? agent.parameters['buydate']['date-unit'] : false;  // day, month, year otherwise false
        let datePeriod = agent.parameters['buydate']['date-period'] ? agent.parameters['buydate']['date-period'] : false;  // beginning, end otherwise false
        let number = agent.parameters['buydate']['number'] ? agent.parameters['buydate']['number'] : 0;  // 2011, 2012, 2018, ...  otherwise 0
        if (!datePeriod && number === 0) number = 1;  // when user says a [period ago] for example a year ago or one month ago

        let dateNow = new Date();
        let investmentDate = new Date(); // this date will be calculated in the next switch statement 05.01.2022

        switch (dateUnit){
            case 'day':
                investmentDate.setDate(dateNow.getDate() - number);
                break;

            case 'month':
                investmentDate.setMonth(dateNow.getMonth() - number); // when user says for example 2 month ago
                if (datePeriod === 'beginning'){
                    investmentDate.setDate(1);
                }
                break;

            case 'year':
                if (datePeriod === 'end'){ // if user says 'end' for example end of year 2014 => month will set to December the 12th month and the day will be 31
                    investmentDate.setDate(31);
                    investmentDate.setMonth(11);
                }
                else if (datePeriod === 'beginning'){ // if user says 'beginning' for example beginning of year 2014 => month will set to January the first month and the day will be 1
                    investmentDate.setDate(1);
                    investmentDate.setMonth(0); // month 0 is january
                }

                if (number > 2000){
                    investmentDate.setFullYear(number); // if the user passes the year
                }
                else if (number < 20 ){ // if the user says for example 8 years ago
                    investmentDate.setFullYear(dateNow.getFullYear() - number)
                }
                break;
        }

        let candleTicksInvestmentDate = await coinHelper.getCoinCandleTicks(coin, investmentDate.getTime()); // the price of the coin at the investment date, example: 31.12.2018
        let candleTicksToday = await coinHelper.getCoinCandleTicks(coin, new Date().getTime()); // the price of the coin now

        let purchasedCoinAmount = 1000 / candleTicksInvestmentDate.openPrice;
        let earned = purchasedCoinAmount * candleTicksToday.openPrice - 1000;

        let response = userResponseBuilder.buildCoinInvestmentResponseInBasicCard(coin,investmentDate, candleTicksInvestmentDate, purchasedCoinAmount, candleTicksToday, earned);

        agent.add(response);
    }


    /*
    *
    * */
    async function displayNews() {

        if (conv === null || conv.data.news.length === 0) { // check if we have already fetched news
            if (conv.data.currentCoin === '') {
                conv.data.news = await coinHelper.getHotNews();
            } else {
                conv.data.news = await coinHelper.getCoinNews(conv.data.currentCoin);
            }

            // display
            return userResponseBuilder.buildSingelNewsResponse();
        } else {
            // display
            return userResponseBuilder.buildSingelNewsResponse();
        }
    }

    // Run the proper function handler based on the matched Dialogflow intent name
    let intentMap = new Map();
    intentMap.set('Default Welcome Intent', welcome);
    intentMap.set('Default Fallback Intent', fallback);


    intentMap.set('show news', showHotNews);
    intentMap.set('show news - next', nextNews);
    intentMap.set('show news - next - previous', previousNews);


    intentMap.set('show news by coin', showNewsByCoin);
    intentMap.set('show news by coin - next', nextNews);
    intentMap.set('show news by coin - yes', showMoreAboutCoin);

    intentMap.set('show news list', listNews);
    intentMap.set('show news list - select.number', selectNewsByNumber);


    intentMap.set('coin price', showPrice);


    intentMap.set('earn with coin in specific period', earnWithCoinInSpecificPeriod);

    /*
    * Tutorial Skill intents
    * */
    intentMap.set('define term', defineTerm);

    agent.handleRequest(intentMap);
});
