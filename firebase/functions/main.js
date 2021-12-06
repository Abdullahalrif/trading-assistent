const axios = require('axios');
const fs = require('fs')

const apiClient = axios.create({
    headers: {
        "Content-Type": "application/json"
    }
});

/*
fs.readFile('response.json', 'utf8' , (err, data) => {
    if (err) {
        console.error(err)
        return
    }
    let res = JSON.parse(data)
    console.log(res.results[1].description)
})

const Binance = require('node-binance-api');
const binance = new Binance();

binance.candlesticks("BNBUSDT", "1d", (error, ticks, symbol) => {
    //console.info("candlesticks()", ticks);
    let last_tick = ticks[ticks.length - 1];
    let [time, open, high, low, close, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored] = last_tick;
    console.info(symbol+" last close: "+close);
}, {limit: 500, endTime: 1626820831000});


*/

const Binance = require('node-binance-api');
const binance = new Binance();

const price = async (coin) => {
    let symbol = coin + 'USDT'
    const result = await binance.prices()
    return  result[symbol]
}


// google handler
(async () => {
    // let coin = agent.parameters[sys-currency]
    let coin = 'ETH'
    const p = await price(coin)
    console.log(p)
})()
/*
displayNews()

function displayNews(){
    return axios.get('https://cryptopanic.com/api/v1/posts/?auth_token=f9ea6488d66276436a65695a038699d8ddea9ed0&filter=hot')
        .then(function (response) {
            let news = response.data
            console.log(news);
        })
        .catch(function (error) {
            console.log(error);
        });
}
*/