var whitelist = require('./whitelist.json');
var db = require('./models/db.js');
var user = require('./models/user.js');

function update() {
  var u = whitelist.shift();
  if (!u) return db.close();
  user.add(u, function (err) {
    if (err) console.log(err);
    update();
  });
};

update();
