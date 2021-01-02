var mongoose = require("mongoose");

var Schema = mongoose.Schema;

var groupSchema = Schema({
  name: String,
  password: String,
  members: Object,
  moduleVars: Object,
});
var groupModel = mongoose.model("group", groupSchema);

module.exports = groupModel;
