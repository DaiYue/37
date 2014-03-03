var express = require('express.io');
var path = require('path');
var fs = require('fs');
var passport = require('./passport');
var user = require('./models/user.js');
var post = require('./models/post.js');
var config = require('./config.json');

app = express().http().io();

app.configure(function() {
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'ejs');
  app.use(express.favicon());
  app.use(express.logger(config.logger));
  app.use(express.json());
  app.use(express.urlencoded());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({ 
    secret: "top secret of girls' day 2014",
    cookie: { maxAge: 1000 * 3600 * 24 * 365 }
  }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.get('/auth', 
  passport.authenticate('google', { 
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ]
  })
);

app.get('/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  function (req, res) {
    res.redirect('/');
  }
);

app.get('/logout', function (req, res) {
  req.logout();
  res.redirect('/');
});

app.io.route('post', function (req) {
  if (!req.data) return;
  if (!req.session.user || !req.session.user.authorized) {
    req.io.emit('post:err', { err: 'unauthorized' });
    return;
  }
  req.data.user = req.session.user;
  req.data.timestamp = new Date().getTime();
  post.add(req.data, function (err) {
    if (err) {
      req.io.emit('post:err', { err: err.message });
    } else {
      req.io.emit('post:ok');
      if (req.data.secret) req.io.emit('post', req.data);
      else app.io.broadcast('post', req.data);
    }
  });
});

app.io.route('get-post', function (req) {
  if (!req.data) return;
  post.get(req.data.max_id, req.data.limit, function (err, result) {
    if (err) {
      req.io.emit('get-post:err', { err: err.message });
    } else {
      req.io.emit('get-post', result);
    }
  });
});

app.get('/', function (req, res) {
  console.log(req.user || "not signed in");
  req.session.user = req.user;
  res.render('index', { user: req.session.user });
});

app.get('/invitation', function (req, res) {
  if (!req.session.user) return res.send(403);
  var filepath = path.join(__dirname, 'invitation/' + req.session.user.email + '.png');
  fs.exists(filepath, function (exists) {
    if (!exists) return res.send(403);
    return res.sendfile(filepath);
  });
});

app.listen(config.port);
