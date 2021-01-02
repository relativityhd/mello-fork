var mongoose = require("mongoose");
var bcrypt = require("bcryptjs");
var express = require("express");
var fs = require("fs");
var passport = require("passport");
var LocalStrategy = require("passport-local").Strategy;

var Schema = mongoose.Schema;
//const findOrCreate = require('mongoose-find-or-create')

// User Schema
var UserSchema = new mongoose.Schema({
  username: {
    type: String,
    index: true,
    //unique: true,
    trim: true,
  },

  password: {
    type: String,
  },

  email: {
    type: String,
    //unique: true,
    trim: true,
  },

  firstname: {
    type: String,
    trim: true,
  },

  secondname: {
    type: String,
    trim: true,
  },

  lastname: {
    type: String,
    trim: true,
  },

  google: {
    id: String,
    token: String,
    email: String,
    name: String,
  },

  googleId: {
    type: String,
  },

  twitterId: {
    type: String,
  },

  biography: {
    type: String,
  },

  birthday: {
    type: String,
  },

  tel: {
    type: String,
    trim: true,
  },

  mob: {
    type: String,
    trim: true,
  },

  sex: {
    type: String,
    trim: true,
  },

  last_change: {
    type: Date,
  },

  design_theme: {
    type: String,
  },
  admin: {
    type: String,
  },

  //Für Module:
  modules: {
    type: Object,
  },

  dashed: {
    type: Object,
  },

  uservars: {
    type: Object,
  },

  friends: {
    type: [{ type: Schema.Types.String, ref: "User" }],
  },

  friends_requests: {
    type: [{ type: Schema.Types.String, ref: "User" }],
  },

  friends_inquiries: {
    type: [{ type: Schema.Types.String, ref: "User" }],
  },

  images: {
    type: [Object],
  },

  privateChatUserListID: {
    type: Array,
  },

  privateChatUserListUsername: {
    type: Array,
  },

  privateChatStrangerListID: {
    type: Array,
  },

  privateChatStrangerListUsername: {
    type: Array,
  },

  MissedMessageArrayID: {
    type: Array,
  },

  MissedMessageArrayCount: {
    type: Array,
  },
});

var User = mongoose.model("User", UserSchema);
module.exports = User;

module.exports.findOrCreate = function (googleeeff, callback) {
  /*User.count(googleeeff)
	.then((count) => {
	  if (count > 0) {
	    console.log('User exists.');
	    callback();
	  } else {
	    console.log('User does not exist.');
	    var newUser = new User({
                username: 'Robert',
                email:  'TEST',
                password: 'lulu',
		name: 'testname',
		googleeeff
		});
	    User.createUser(newUser);
	    passport.authenticate('local', { successRedirect: callback(), failureRedirect: callback()})
		callback();
	  }
	});*/
};

module.exports.createUser = function (newUser, callback) {
  bcrypt.genSalt(10, function (err, salt) {
    bcrypt.hash(newUser.password, salt, function (err, hash) {
      newUser.password = hash;
      newUser.save(callback);
    });
  });
};

module.exports.updatePassword = function (userID, newPassword, callback) {
  var query;
  var newpass;
  var hashpswd;
  User.findOne(
    {
      _id: userID,
    },
    function (err, user) {
      console.log(user.username);

      bcrypt.genSalt(10, function (err, salt) {
        bcrypt.hash(newPassword, salt, function (err, hash) {
          newpass = {
            password: hash,
          };
          query = {
            _id: userID,
          };
          //User.updateUserById(userID, newpass);
          /*User.updateOne(query,newpass);*/
          hashpswd = hash;
          //callback(err, hash);
          User.updateOne(query, newpass, function (err, res) {
            if (err) throw err;
            callback(err, hashpswd, user);
          });
        });
      });
    }
  );
  //callback(hashpswd);
};

// findet über den usernamen die Daten des users in der Datenbank
module.exports.getUserByUsername = function (username, callback) {
  var query = {
    username: username,
  };
  User.findOne(query, callback);
};
// findet über die ID die Daten des users in der Datenbank
module.exports.getUserById = function (id, callback) {
  User.findById(id, callback);
};
// vergleicht das eingebene Passwort mit dem in der Datenbank
module.exports.comparePassword = function (candidatePassword, hash, callback) {
  bcrypt.compare(candidatePassword, hash, function (err, isMatch) {
    if (err) throw err;
    callback(null, isMatch);
  });
};

module.exports.updateUserById = function (id, new_values) {
  var query = {
    _id: id,
  };
  user.updateOne(query, new_values);
};

/*
var imgPath = "views/pics/cat.jpg";

var picSchema = new mongoose.Schema({
    img: { data: Buffer, contentType: String }
});

var upload = mongoose.model('profilepicture', UserSchema);

var a = new upload;
    a.img.data = fs.readFileSync(imgPath);
    a.img.contentType = 'image/jpg';
    a.save(function (err, a) {
      if (err) throw err;

	  console.error('saved img to mongo');
	});
	*/
