const MongoClient = require("mongodb").MongoClient;
const client = require("../../../scripts/standart_functions.js").moduleClient;
const dashClient = require("../../../scripts/standart_functions.js")
  .dashboardClient;
const express = require("express");
var mongoose = require("mongoose");
const app = express();
const path = require("path");
var pathsimport = require("../../../scripts/paths.js");
var ensureAuthenticated = require("../../../scripts/standart_functions.js")
  .ensureAuthenticated;
var router = express.Router();
var User = require("../../../Mongoose/user");
var bodyParser = require("body-parser");

router.use(bodyParser.urlencoded({ extended: true }));

const url = pathsimport.db_url;

mongoose.connect(url);

MongoClient.connect(url, function (err, client) {
  //console.log("haalllllloo");
});

var ToDoSchema = new mongoose.Schema({
  inhalt: String,
  user_id: String,
  ticked: String,
});

var toDo = mongoose.model("ToDo", ToDoSchema);

var db = mongoose.connection;
var to_do_list = db.collection("todos");

client.on("connection", function (socket) {
  socket.on("TODO_inhalte", function (data) {
    console.log("data");
    to_do_list.deleteOne({ inhalt: data.inhalt, user_id: data.id });
  });
  socket.on("TODO_ticked", function (data) {
    console.log(data);
    var myquery = { user_id: data.id, inhalt: data.inhalt };
    var newvalue = { $set: { ticked: data.ticked } };
    to_do_list.updateOne(myquery, newvalue, function (err, res) {
      if (err) throw err;
    });
  });

  socket.on("TODO_todosansage", function (data) {
    //console.log(data.name);
    User.getUserByUsername(data.name, function (err, user) {
      var id = user._id;

      toDo.find({ user_id: id }, function (err, ToDos) {
        socket.emit("TODO_todos", {
          ToDos: ToDos,
        });
      });
    });
  });
});

dashClient.on("connection", function (socket) {
  socket.on("ticked", function (data) {
    console.log(data);
    var myquery = { user_id: data.id, inhalt: data.inhalt };
    var newvalue = { $set: { ticked: data.ticked } };
    to_do_list.updateOne(myquery, newvalue, function (err, res) {
      if (err) throw err;
    });
  });

  socket.on("todosansage", function (data) {
    //console.log(data.name);
    User.getUserByUsername(data.name, function (err, user) {
      var id = user._id;

      toDo.find({ user_id: id }, function (err, ToDos) {
        socket.emit("todos", {
          ToDos: ToDos,
        });
      });
    });
  });
});

router.get("/main", ensureAuthenticated, function (req, res) {
  toDo.find({ user_id: req.session.passport.user }, function (err, ToDos) {
    //console.log(ToDos);
    //console.log(ToDos.length);
    User.getUserById(req.session.passport.user, function (err, user) {
      res.render("./../modules/modules/To_Do_List/index", {
        ToDos: ToDos,
        error: "",
        paths: pathsimport,
        user: req.isAuthenticated(),
        theme: user.design_theme,
        _user: user,
      });
    });
  });
});

router.post("/main", function (req, res) {
  toDo.find(
    { user_id: req.session.passport.user, inhalt: req.body.inhalt },
    function (err, ToDos) {
      console.log(ToDos);
      console.log("ToDos");
      if (ToDos[0]) {
        console.log("nein");
        toDo.find(
          { user_id: req.session.passport.user },
          function (err, ToDos) {
            //console.log(ToDos);
            //console.log(ToDos.length);
            User.getUserById(req.session.passport.user, function (err, user) {
              var err = "This entry already exists";
              res.render("./../modules/modules/To_Do_List/index", {
                ToDos: ToDos,
                error: err,
                paths: pathsimport,
                user: req.isAuthenticated(),
                theme: user.design_theme,
                _user: user,
              });
            });
          }
        );
      } else {
        //console.log("hallo");
        var newToDo = new toDo({
          inhalt: req.body.inhalt,
          user_id: req.session.passport.user,
          ticked: "",
        });
        newToDo.save();

        res.redirect("/module/To_Do_List/main");
      }
    }
  );
});

module.exports = {
  router: router,
  path_main: "/To_Do_List",
  name: "ToDo-List",
  db_name: "ToDo",
  info: "This is a ToDo-List, there you can ...",
  path_site: "/main",
  path_view: "/view",
};
