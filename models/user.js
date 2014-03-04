var db = require('./db.js');

exports.add = function (user, callback) {
  db.user.findOne({ _id: user.email }, function (err, u) {
    if (err) return callback(err);
    if (u) {
      db.user.update(
        { _id: user.email },
        { $set: user },
        callback
      );
    } else {
      db.user.insert(user, callback);
    }
  });
};

exports.login = function (user, callback) {
  db.user.findOne({ _id: user.email }, function (err, u) {
    if (err) return callback(err);
    if (!u) return callback(new Error('unauthorized'));
    delete user.gender;
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
