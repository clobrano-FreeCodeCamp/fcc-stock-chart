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
const server = require ('http').Server (app);
const io = require('socket.io')(server);

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

io.listen (3000);

const KEY = process.env.ALPHA_KEY
const service_host = 'https://www.alphavantage.co/'
const time_sampling = ['1m', '5m', '15m', '30m' ]
const time_series_data = ['TIME_SERIES_DAILY', 'TIME_SERIES_WEEKLY', 'TIME_SERIES_MONTHLY' ]
const time_series_name = ['Time Series (Daily)', 'Weekly Time Series', 'Monthly Time Series' ]
var sel_sampling = 0;
var sel_series = 0;

const colors = ['#3e95cd', '#7a910d', 'red', 'blue', 'green', 'yellow', 'magenta', 'cyan', 'orange' ];
var stocks = ['GOOGL'];

app.get ('/', (req, rsp) => {
  if (stocks.length == 0) {
    return rsp.render ('home', {messages: req.flash ('error')});
  }
  
  var callbacks = 0;
  var datasets = [];
  var title = null;

  for (i in stocks) {
    var stock = stocks [i];
    var url = service_host + 'query?function=' + time_series_data [sel_series] + '&symbol=' + stock + '&interval=' + time_sampling [sel_sampling] + ' &apikey=' + KEY;
    console.log ('Getting url: ' + url);

    callbacks++;

    https.get(url, (res) => {
      var chunk = '';

      res.on('data', (data) => {
        chunk += data;
      });

      res.on ('end', (unknown) => {
        console.log ('End of data for stock');
        const json = JSON.parse(chunk);
        const err = json['Error Message'];
        var xvalues = [];
        var yvalues = [];

        if (err) {
          console.error (err);
          req.flash ('error', 'Error: could not retrieve data');
        } else{
          title = title || json['Meta Data']['1. Information']
          const stock_name = json['Meta Data']['2. Symbol'].toUpperCase();
          const series = json[ time_series_name [sel_series] ];

          for (var k in series) {
            xvalues.push ("'" + k + "'");
            yvalues.push (series[k]['4. close']);
          }

          var dataset = {
            data: yvalues,
            label: stock_name,
            borderColor: colors [callbacks - 1 ],
            fill: false
          };

          datasets.push (dataset);
        }

        callbacks--;

        if (callbacks <= 0) {
          console.log ('Rendering the page');
          rsp.render ('home', {
            stocks: stocks,
            title: title,
            xvalues: xvalues,
            datasets: JSON.stringify (datasets),
            messages: req.flash ('error')
          });
        }
      });
    });
  }
});

io.on ('connection', (socket) => {
    socket.emit ('news', {hello: 'world'});
    socket.on ('other event', data => {
        console.log (data);
    });
});


app.post ('/search', (req, rsp) => {
  var new_stock = null;

  if (req.body.stock)
    new_stock = req.body.stock.toUpperCase ();

  if (stocks.indexOf (new_stock) == -1)
    stocks.push (new_stock);

  rsp.redirect ('/');
});

app.get ('/remove/:stock', (req, rsp) => {
  var stock = req.params.stock.toUpperCase ();
  var id = stocks.indexOf (stock);

  if (id != -1) {
    stocks.splice (id, 1);
  }

  rsp.redirect ('/');
});

app.get ('/select/:type/:id', (req, rsp) => {
  var type = req.params.type;
  var id = req.params.id;

  if (type === 'series') {
    if (id < time_series_data.length)
      sel_series = id;
  }

  if (type === 'sampling') {
    if (id < time_sampling.length)
      sel_sampling = id;
  }

  rsp.redirect ('/');
})

port = process.env.PORT || 3000
app.listen(port);
console.log('Server listening on http://localhost:' + port);
