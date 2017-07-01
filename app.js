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
var stocks = ['GOOGL'];
app.get ('/', (req, rsp) => {

  if (stocks.length == 0) {
    return rsp.render ('home', {messages: req.flash ('error')});
  }

  
  var callbacks = 0;
  var datasets = [];
  const colors = ['#3e95cd', '#7e95cd', 'red', 'blue', 'green', 'yellow', 'magenta', 'cyan', 'orange'];

  for (i in stocks) {
    var stock = stocks [i];
    var url = 'https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=' + stock + '&interval=1min&apikey=' + KEY;

    callbacks++;
    https.get(url, (res) => {
      var chunk = '';

      res.on('data', (data) => {
        chunk += data;
      });

      res.on ('end', (unknown) => {
        const json = JSON.parse(chunk);
        const err = json['Error Message'];
        const series = json['Time Series (1min)'];
        var xvalues = [];
        var yvalues = [];

        if (err) {
          req.flash ('error', 'Error: could not retrieve data for ' + stock);
          callback--;
          return;
        }

        var stock_name = json['Meta Data']['2. Symbol'].toUpperCase();

        for (var k in series) {
          xvalues.push ("'" + k + "'");
          yvalues.push (series[k]['4. close']);
        }

        var dataset = {
          data: yvalues,
          label: stock_name,
          borderColor: colors.pop(),
          fill: false
        };

        datasets.push (dataset);
        callbacks--;

        if (callbacks == 0) {
          rsp.render ('home', {
            xvalues: xvalues,
            datasets: JSON.stringify (datasets),
            messages: req.flash ('error')
          });
        }
      });
    });

    console.log ("exit from loop");
  }

  console.log ("exit from route");
});


app.post ('/search', (req, rsp) => {
  var new_stock = null;

  if (req.body.stock)
    new_stock = req.body.stock.toUpperCase ();

  if (stocks.indexOf (new_stock) == -1)
    stocks.push (req.body.stock);

  rsp.redirect ('/');
});

port = process.env.PORT || 3000
app.listen(port);
console.log('Server listening on http://localhost:' + port);
