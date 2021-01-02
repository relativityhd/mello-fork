var mongoose = require("mongoose");
var bcrypt = require("bcryptjs");
var express = require("express");
var fs = require("fs");

var passport = require("passport");
var LocalStrategy = require("passport-local").Strategy;

// example schema
var StandardAvatarScheme = new mongoose.Schema({
  img: {
    data: Buffer,
    contentType: String,
  },
  filename: {
    type: String,
  },
  contentType: {
    type: String,
  },
  IsAvatar: {
    type: Boolean,
  },
});

// our model
var standardAvatar = mongoose.model("uploads.files", StandardAvatarScheme);
module.exports = standardAvatar;
