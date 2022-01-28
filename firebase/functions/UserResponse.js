
const { BasicCard, Button, Image, List, Suggestions} = require('actions-on-google');

class UserResponse {

    constructor(conv) {
        this.conv = conv;
    }

    buildSingelNewsResponse(){
        let responseToUser = '';
        if (this.conv.data.news.length === 0){
            responseToUser = 'No news available now';
            this.conv.ask(responseToUser);
        }else {
            let newsItem = this.conv.data.news[this.conv.data.newsCounter];
            responseToUser = 'News number ' + (this.conv.data.newsCounter+1)  + ' ';
            responseToUser += newsItem.title;

            this.conv.ask(responseToUser);

            // display newsItem in a card
            if (this.conv.surface.capabilities.has("actions.capability.SCREEN_OUTPUT")){ // check if screen is available
                this.conv.ask(new BasicCard({
                    text: newsItem.title,
                    subtitle: '',
                    title: `News number ${this.conv.data.newsCounter+1}`,
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
                this.conv.ask(new Suggestions('Next'));
            }
        }
        return this.conv;
    }



    buildNewsListResponse(){
        let responseToUser = '';
        if (this.conv.data.news.length === 0){
            responseToUser = 'no news available at this time! try again later';
            this.conv.close(responseToUser); // close conversation later call another intent
        } else {
            let textList = 'This is a list of news. Please select one to proceed ';
            let items = {};

            for (let i = 0; i < this.conv.data.news.length; i++){
                let newsItem = this.conv.data.news[i];
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
            this.conv.ask(textList);
            this.conv.ask(responseToUser);

            // show list
            if (this.conv.surface.capabilities.has("actions.capability.SCREEN_OUTPUT")){  // check if screen is available
                this.conv.ask(new List({
                    title: 'List of news',
                    items
                }));
            }
        }

        return this.conv;
    }

    buildCoinInvestmentResponseInBasicCard(coin, investmentDate, candleTicksInvestmentDate, purchasedCoinAmount, candleTicksToday, earned){

        let response = 'Invest price on ' + investmentDate.toDateString() + ' was: ' + candleTicksInvestmentDate.openPrice + '. ' +
            'With the investment of: ' + 1000 + ' $ ' +
            'you would buy ' + purchasedCoinAmount.toFixed(2) + ' ' + coin + ' . ' +
            'Selling Price today is ' + candleTicksToday.openPrice + ' $. ' +
            'if you sell your ' + purchasedCoinAmount.toFixed(2) + ' of '+ coin +' today ' +
            'you will earn ' + earned.toFixed(2) + ' $ ';

        this.conv.ask(response);

        if (this.conv.surface.capabilities.has("actions.capability.SCREEN_OUTPUT")){ // check if screen is available
            this.conv.ask(new BasicCard({
                text: `${coin} price on ${investmentDate.toDateString()}: ${candleTicksInvestmentDate.openPrice}. \n
Investment: 1000 $ \n
Selling price today: ${candleTicksToday.openPrice} $ \n
Revenue: ${earned.toFixed(2)} $ \n`,
                subtitle: `Investment date: ${investmentDate.toDateString()}`,
                title: `Investment return: ${earned.toFixed(2)} $`,
                buttons: new Button({
                    title: `Buy / Sell ${coin} now`,
                    url: 'https://www.binance.com/',
                }),
            }));
        }

        return this.conv;
    }

}


module.exports.UserResponse = UserResponse;