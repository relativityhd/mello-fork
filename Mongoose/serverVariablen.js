var mongoose = require("mongoose");
var bcrypt = require("bcryptjs");
var express = require("express");
var fs = require("fs");

var passport = require("passport");
var LocalStrategy = require("passport-local").Strategy;

// example schema
var StandardVariablenSchema = new mongoose.Schema({
  vars: Object,
});
// our model
var variablenModel = mongoose.model(
  "server_var",
  StandardVariablenSchema,
  "server_vars"
);
module.exports = variablenModel;
