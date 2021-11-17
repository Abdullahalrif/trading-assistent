const axios = require('axios');
const fs = require('fs')

const apiClient = axios.create({
    headers: {
        "Content-Type": "application/json"
    }
});


fs.readFile('test.json', 'utf8' , (err, data) => {
    if (err) {
        console.error(err)
        return
    }
    let res = JSON.parse(data)
    console.log(res.results[1].description)
})

const Binance = require('node-binance-api');
const binance = new Binance();

const price = async () => {
    let symbol = 'BNBUSDT'
    const result = await binance.prices()
    return  result[symbol]
}

(async () => {
    const users = await price()
    console.log(users)
})()

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

