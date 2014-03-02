var mongodb = require('mongodb');
var mongojs = require('mongojs');
var config = require('../config.json');

var db = mongojs(config.mongodb, ['user', 'post']);
db.ObjectID = mongodb.ObjectID;
module.exports = db;
