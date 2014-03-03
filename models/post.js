var db = require('./db.js');

exports.add = function (post, callback) {
  db.post.insert(post, function (err, p) {
    return callback(err);
  });
};

exports.get = function (max_id, limit, callback) {
  if (max_id) {
    db.post.find({ _id: { $lt: db.ObjectID(max_id) }, secret: { $ne: true } })
           .limit(limit).sort({ _id: -1 }, callback);
  } else {
    db.post.find({ secret: { $ne: true } })
           .limit(limit).sort({ _id: -1 }, callback);
  }
};
