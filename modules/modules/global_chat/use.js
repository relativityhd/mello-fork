const mongo = require("mongodb").MongoClient;
const client = require("../../../scripts/standart_functions.js").moduleListen;
const express = require("express");
const app = express();
const path = require("path");
var pathsimport = require("../../../scripts/paths.js");
var ensureAuthenticated = require("../../../scripts/standart_functions.js")
  .ensureAuthenticated;
var router = express.Router();
var User = require("../../../Mongoose/user");

router.get("/main", ensureAuthenticated, function (req, res) {
  User.getUserById(req.session.passport.user, function (err, user) {
    res.render("./../modules/modules/global_chat/index", {
      paths: pathsimport,
      user: req.isAuthenticated(),
      name: user.username,
      theme: user.design_theme,
    });
  });
});

const url = pathsimport.db_url;
// Connect to mongo
mongo.connect(url, function (err, db) {
  if (err) {
    throw err;
  }

  // Connect to Socket.io
  client.on("connection", function (socket) {
    var dbo = db.db("Mello");
    let chat = dbo.collection("chats");

    // Create function to send status
    sendStatus = function (s) {
      socket.emit("GLOBALCHAT_status", s);
    };

    // Get chats from mongo collection
    chat
      .find()
      .limit(100)
      .sort({ _id: 1 })
      .toArray(function (err, res) {
        if (err) {
          throw err;
        }

        // Emit the messages
        socket.emit("GLOBALCHAT_output", res);
        sendStatus({
          clear: true,
        });
      });

    // Handle input events
    socket.on("GLOBALCHAT_input", function (data) {
      var name = data.name;
      var message = data.message;

      // Check for name and message
      if (name == "" || message == "") {
        // Send error status
        sendStatus("Please enter a name and message");
      } else {
        // Insert message
        chat.insert({ name: name, message: message }, function () {
          client.emit("GLOBALCHAT_output", [data]);
        });
      }
    });
  });
});

module.exports = {
  router: router,
  path_main: "/global_chat",
  name: "Global Chat",
  db_name: "global_chat",
  info: "This is a Global-Chat, there you can chat with other people.",
  path_site: "/main",
};
