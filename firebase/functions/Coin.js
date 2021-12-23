/*
*
*
* */

const axios = require('axios');
const Binance = require('node-binance-api');
const binance = new Binance();

class Coin {
    constructor() {
        this.hotNewsList = [];
        this.coinNewsList = [];

    }

    async getCoinPrice(coin) {
        let symbol = coin + 'USDT';
        try {
            let result = await binance.prices();
            let price = parseFloat(result[symbol]);
            return  price;
        } catch (error){
            return error;
        }
    }


    getHotNews() {
        let apiUrl = 'https://cryptopanic.com/api/v1/posts/?auth_token=f9ea6488d66276436a65695a038699d8ddea9ed0&filter=hot';
        let self = this;

        return self.hotNewsList = axios.get(apiUrl)
            .then(response => {
                let news = response.data;
                return news.results;
            })
            .catch(error => {
                console.log('no news were found')
                console.log(error);
            });
    }


    getCoinNews(coin) {
        let apiUrl = 'https://cryptopanic.com/api/v1/posts/?auth_token=f9ea6488d66276436a65695a038699d8ddea9ed0&filter=hot&currencies=' + coin;
        let self = this;

        return self.coinNewsList = axios.get(apiUrl)
            .then(function (response) {
                let news = response.data;
                return news.results;
            })
            .catch(function (error) {
                console.log('no news were found')
                console.log(error);
            });
    }

}

module.exports.Coin = Coin;