const path = require ('path');
const logger = require ('morgan');
const express = require ('express'),
  session = require ('express-session'),
  body_parser = require ('body-parser'),
  cookie_parser = require ('cookie-parser'),
  flash = require ('connect-flash'),
  pug = require ('pug');
const https = require ('https');

const app = express ();
app.use (logger('dev'));
app.use (cookie_parser ());
app.use (body_parser.urlencoded ({extended: false}));
app.use (body_parser.json ());
app.use (session ({
  secret: 'panic violet',
  saveUninitialized: false,
  resave: false
}));
app.use (flash ());

app.set ('view engine', 'pug');
app.set ('/views', path.join (__dirname, 'views'));
app.use ("/bootstrap", express.static(path.join(__dirname, "/static/bootstrap")));
app.use ("/stylesheets", express.static(path.join(__dirname, "/static/stylesheets")));
app.use ("/js", express.static(path.join(__dirname, "/static/js")));


const KEY = process.env.ALPHA_KEY
const url = 'https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=MSFT&interval=1min&apikey=' + KEY;

app.get ('/', (req, rsp) => {
  https.get(url, (res) => {
    var chunk = '';

    res.on('data', (data) => {
      chunk += data;
    });

    res.on ('end', (unknown) => {
      const json = JSON.parse(chunk);
      console.log(json);
      const series = json['Time Series (1min)'];
      var label = '';
      var xvalues = [];
      var yvalues = [];

      label = json['Meta Data']['2. Symbol'];

      var i = 0;
      for (var k in series) {
        xvalues.push (++i);
        yvalues.push (series[k]['1. open']);
      }

      rsp.render ('home', {
        'label': label,
        'xvalues': xvalues,
        'yvalues': yvalues
      });
    });
  }).on('error', (e) => {
    console.error(e);
  });  
});

port = process.env.PORT || 3000
app.listen(port);
console.log('Server listening on http://localhost:' + port);
