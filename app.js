const path = require ('path');
const logger = require ('morgan');
const express = require ('express'),
  session = require ('express-session'),
  body_parser = require ('body-parser'),
  cookie_parser = require ('cookie-parser'),
  flash = require ('connect-flash'),
  pug = require ('pug');
const https = require ('https');
const node_cache = require ('node-cache');

const app = express ();
var server = require ('http').createServer (app);
var io = require ('socket.io')(server);

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
const service_host = 'https://www.alphavantage.co/'
const time_sampling = ['1m', '5m', '15m', '30m' ]
const time_series_data = ['TIME_SERIES_DAILY', 'TIME_SERIES_WEEKLY', 'TIME_SERIES_MONTHLY' ]
const time_series_name = ['Time Series (Daily)', 'Weekly Time Series', 'Monthly Time Series' ]
var sel_sampling = 0;
var sel_series = 0;

const colors = ['#3e95cd', '#7a910d', 'red', 'blue', 'green', 'yellow', 'magenta', 'cyan', 'orange' ];
var stocks = ['GOOGL'];
var cache = new node_cache ( {stdTTL: 100, checkperiod: 60} );

io.on ('connect', client => {
  client.emit ('connected', 'Connected with the server');

  client.on ('updated-data', data => {
    client.broadcast.emit ('update-all', 'Client notified new data');
  });
});

app.get ('/', (req, rsp) => {
  if (stocks.length == 0) {
    return rsp.render ('home', {messages: req.flash ('error')});
  }

  var callbacks = 0;
  var datasets = [];
  var title = null;

  for (i in stocks) {
    var stock = stocks [i];
    var query = 'query?function=' + time_series_data [sel_series] + '&symbol=' + stock + '&interval=' + time_sampling [sel_sampling];
    var url = service_host + query + ' &apikey=' + KEY;
    console.log ('gettin cache for ' + query);
    var cached = cache.get (query);
    console.log ('got cache ' + cached);

    if (cached) {
      console.log ('Found cached values');
      datasets.push (cached.dataset);

      if (title === null)
        title = cached.title;

      if (xvalues === undefined)
        var xvalues = cached.xvalues;

      if (i >= stocks.length - 1) {
        console.log ('Rendering the page');
        rsp.render ('home', {
          stocks: stocks,
          title: title,
          xvalues: xvalues,
          datasets: JSON.stringify (datasets),
          messages: req.flash ('error'),
          updates: req.flash ('updates')
        });
      }

    } else {
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
          var yvalues = [];
          var xvalues = [];

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
              borderColor: colors [stocks.indexOf (stock_name)],
              fill: false
            };

            cache.set (query, {
              dataset: dataset,
              title: title,
              xvalues: xvalues
            });
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
              messages: req.flash ('error'),
              updates: req.flash ('updates')
            });
          }
        });
      });
    }
  }
});


app.post ('/search', (req, rsp) => {
  var new_stock = null;

  if (req.body.stock)
    new_stock = req.body.stock.toUpperCase ();

  if (stocks.indexOf (new_stock) == -1) {
    stocks.push (new_stock);
    req.flash ('updates', 'new stuff');
  }

  rsp.redirect ('/');
});

app.get ('/remove/:stock', (req, rsp) => {
  var stock = req.params.stock.toUpperCase ();
  var id = stocks.indexOf (stock);

  if (id != -1) {
    stocks.splice (id, 1);
    req.flash ('updates', 'new stuff');
  }

  rsp.redirect ('/');
});

  app.get ('/select/:type/:id', (req, rsp) => {
    var type = req.params.type;
    var id = req.params.id;

    if (type === 'series') {
      if (id < time_series_data.length) {
        sel_series = id;
        req.flash ('updates', 'new stuff');
      }
    }

    if (type === 'sampling') {
      if (id < time_sampling.length) {
        sel_sampling = id;
        req.flash ('updates', 'new stuff');
      }
    }

    rsp.redirect ('/');
  })

  port = process.env.PORT || 3000
  server.listen(port);

  console.log('Server listening on http://localhost:' + port);
