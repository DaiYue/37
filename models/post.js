var db = require('./db.js');

exports.add = function (post, callback) {
  db.post.insert(post, function (err, p) {
    return callback(err);
  });
};

exports.get = function (max_id, limit, callback) {
  if (max_id) {
    db.post.find({ _id: { $lt: max_id } })
           .limit(limit).sort({ _id: -1 }, callback);
  } else {
    db.post.find()
           .limit(limit).sort({ _id: -1 }, callback);
  }
};
