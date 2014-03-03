var db = require('./db.js');

exports.add = function (email, callback) {
  db.user.findOne({ _id: email }, function (err, u) {
    if (err) return callback(err);
    if (u) return callback(null);
    db.user.insert({ _id: email }, function (err) {
      return callback(err);
    });
  });
};

exports.login = function (user, callback) {
  db.user.findOne({ _id: user.email }, function (err, u) {
    if (err) return callback(err);
    if (!u) return callback(new Error('unauthorized'));
    db.user.update(
      { _id: user.email },
      { $set: user },
      function (err) {
        if (err) return callback(err);
        db.user.findOne({ _id: user.email }, function (err, u) {
          callback(err, u);
        });
      }
    );
  });
};
