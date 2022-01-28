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


    /**
     * the method getCoinCandleTicks returns the CandleTicks of a passed coin in a specific date
     * example:
     *        {
              openTime: 1546214400000,
              openPrice: 3803.12,
              high: 3810,
              low: 3630.33,
              closePrice: 3702.9,
              volume: 29991.77835,
              closeTime: 1546300799999,
              assetVolume: 111847216.11708207
            }
     * */
    async getCoinCandleTicks(coin, date){
        let symbol = coin + 'USDT';
        let data  = await binance.candlesticks(symbol, "1d", null, {limit: 1 ,endTime: date})
        let [openTime, openPrice, high, low, closePrice, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored] = data[0];

        parseFloat(openTime);
        parseFloat(openPrice);
        parseFloat(high);
        parseFloat(low);
        parseFloat(closePrice);
        parseFloat(volume);
        parseFloat(closeTime);
        parseFloat(assetVolume);

        return {
            openTime: openTime,
            openPrice: parseFloat(openPrice),
            high: parseFloat(high),
            low: parseFloat(low),
            closePrice: parseFloat(closePrice),
            volume: parseFloat(volume),
            closeTime: closeTime,
            assetVolume: parseFloat(assetVolume)
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