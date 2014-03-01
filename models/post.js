var db = require('./db.js');

exports.get = function (max_id, limit) {
  db.post.find({ _id: { $lt: max_id } })
            .limit(limit).sort({ _id: -1 }, callback);
};
