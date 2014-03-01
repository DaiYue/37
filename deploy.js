var whitelist = require('./whitelist.json');
var db = require('./models/db.js');
var user = require('./models/user.js');

function update() {
  var email = whitelist.shift();
  if (!email) return db.close();
  user.add(email, function (err) {
    if (err) console.log(err);
    update();
  });
};

update();
