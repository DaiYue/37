var mongodb = require('mongodb');
var mongojs = require('mongojs');
var config = require('../config.json');

module.exports = mongojs(config.mongodb, ['user', 'post']);

exports.ObjectID = mongodb.ObjectID;
