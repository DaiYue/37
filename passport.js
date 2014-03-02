var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var config = require('./config.json');
var user = require('./models/user.js');
var exec = require('child_process').exec;

var strategy = new GoogleStrategy({
    clientID: config.clientID,
    clientSecret: config.clientSecret,
    callbackURL: config.callbackURL
  }, 
  function (accessToken, refreshToken, profile, done) {
    process.nextTick(function () {
      var u = profile._json;
      user.login(u, function (err) {
        if (err) console.log(err);
        u.authorized = (err == null);
        return done(null, u);
      });
    });
  }
);

strategy.userProfile = function(accessToken, done) {
  var url = 'https://www.googleapis.com/oauth2/v1/userinfo?access_token=' + accessToken;
  exec('curl ' + url, function (err, body) {
  // this._oauth2.get('https://www.googleapis.com/oauth2/v1/userinfo', accessToken, function (err, body, res) {
    if (err) { return done(new InternalOAuthError('failed to fetch user profile', err)); }
    
    try {
      var json = JSON.parse(body);
      
      var profile = { provider: 'google' };
      profile.id = json.id;
      profile.displayName = json.name;
      profile.name = { familyName: json.family_name,
                       givenName: json.given_name };
      profile.emails = [{ value: json.email }];
      
      profile._raw = body;
      profile._json = json;
      
      done(null, profile);
    } catch(e) {
      done(e);
    }
  });
};

passport.use(strategy);

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (obj, done) {
  done(null, obj);
});

module.exports = passport;
