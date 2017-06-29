const https = require('https');

const KEY = process.env.ALPHA_KEY
const url = 'https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=MSFT&interval=1min&apikey=' + KEY;

https.get(url, (res) => {
  var chunk = '';

  res.on('data', (data) => {
    chunk += data;
  });

  res.on ('end', (unknown) => {
    var json = JSON.parse(chunk);
    console.log (json['Meta Data']['2. Symbol']);
    var series = json['Time Series (1min)'];
    for (var k in series) {
      console.log (series[k]['1. open']);
    }
  });

}).on('error', (e) => {
  console.error(e);
});
