var express = require("express");
var request1 = require("request-promise");
var mongoose = require("mongoose");
var bodyParser = require("body-parser");
var mongo = require("mongodb");
var MongoClient = require("mongodb").MongoClient;
var app = express();
var request = require("request");
const client = require("../../../scripts/standart_functions.js").moduleClient;
const dashClient = require("../../../scripts/standart_functions.js")
  .dashboardClient;
const apiKey2 = "9eaad94d073e04bc9c610257a5cd070a";
const apiKey = "5dd63de471c31970e62715b5b0b7bf21";
var pathsimport = require("../../../scripts/paths.js");
var ensureAuthenticated = require("../../../scripts/standart_functions.js")
  .ensureAuthenticated;
var router = express.Router();
var User = require("../../../Mongoose/user");

//app.set('view engine', 'ejs');
router.use(bodyParser.urlencoded({ extended: true }));

const url = pathsimport.db_url;

mongoose.connect(url);

MongoClient.connect(url, function (err, client) {
  //console.log("haalllllloo");
});

var citySchema = new mongoose.Schema({
  name: String,
  user_id: String,
});

var cityModel = mongoose.model("City", citySchema);

var db = mongoose.connection;
var city = db.collection("cities");

async function getWeather(cities) {
  var weather_data = [];

  for (var city_obj of cities) {
    var city = city_obj.name;
    var url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`;

    var response_body = await request1(url);

    var weather_json = JSON.parse(response_body);

    var weather = {
      city: city,
      temperature: Math.round(weather_json.main.temp),
      description: weather_json.weather[0].description,
      icon: weather_json.weather[0].icon,
    };

    weather_data.push(weather);
  }

  return weather_data;
}

client.on("connection", function (socket) {
  socket.on("WEATHER_clear", function (data) {
    city.deleteOne({ name: data.name, user_id: data.id });

    /*var socket_id =socket.id; 
			//console.log(socket.id);
			//console.log("socket_id");
			//console.log(data.socket_id);
			var id = data.socket_id;
			 socket.broadcast.to("id").emit('cleared');
			 console.log("jepp");*/
  });

  socket.on("WEATHER_wetteransage", function (data) {
    //console.log(data.name);
    User.getUserByUsername(data.name, function (err, user) {
      var id = user._id;

      cityModel.find({ user_id: id }, function (err, cities) {
        getWeather(cities).then(function (results) {
          //console.log("nono");

          socket.emit("WEATHER_wetter", {
            weather_data: results,
            //paths:pathsimport,
            //user:req.isAuthenticated()
          });
        });
      });
    });
  });
});

dashClient.on("connection", function (socket) {
  socket.on("clear", function (data) {
    city.deleteOne({ name: data.name, user_id: data.id });
  });

  socket.on("wetteransage", function (data) {
    //console.log(data.name);
    User.getUserByUsername(data.name, function (err, user) {
      var id = user._id;

      cityModel.find({ user_id: id }, function (err, cities) {
        getWeather(cities).then(function (results) {
          //console.log("nono");

          socket.emit("wetter", {
            weather_data: results,
            //paths:pathsimport,
            //user:req.isAuthenticated()
          });
        });
      });
    });
  });
});

router.get("/main", ensureAuthenticated, function (req, res) {
  cityModel.find(
    { user_id: req.session.passport.user },
    function (err, cities) {
      getWeather(cities).then(function (results) {
        //console.log(results);
        //var weather_data = {weather_data : results};

        User.getUserById(req.session.passport.user, function (err, user) {
          res.render("./../modules/modules/Weather_app/index", {
            weather_data: results,
            error: "",
            paths: pathsimport,
            user: req.isAuthenticated(),
            theme: user.design_theme,
            _user: user,
          });
        });
      });
    }
  );
});

router.post("/main", function (req, res) {
  let city = req.body.city_name;
  let url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=imperial&appid=${apiKey}`;

  request(url, function (err, response, body) {
    if (err) {
      cityModel.find(
        { user_id: req.session.passport.user },
        function (err, cities) {
          console.log("cities");
          getWeather(cities).then(function (results) {
            // var weather_data = {weather_data : results};

            User.getUserById(req.session.passport.user, function (err, user) {
              var err1 = "problem with the server";
              res.render("./../modules/modules/Weather_app/index", {
                weather_data: results,
                error: err1,
                paths: pathsimport,
                user: req.isAuthenticated(),
                theme: user.design_theme,
              });
            });
          });
        }
      );
    } else {
      let weather = JSON.parse(body);
      console.log(weather.main);
      if (weather.main == undefined) {
        cityModel.find(
          { user_id: req.session.passport.user },
          function (err, cities) {
            console.log("cities2");
            getWeather(cities).then(function (results) {
              // var weather_data = {weather_data : results};
              console.log("cities3");
              console.log(results);
              User.getUserById(req.session.passport.user, function (err, user) {
                var err = "Unknown City";
                res.render("./../modules/modules/Weather_app/index", {
                  weather_data: results,
                  error: err,
                  paths: pathsimport,
                  user: req.isAuthenticated(),
                  _user: user,
                  theme: user.design_theme,
                });
              });
            });
          }
        );
      } else {
        var newCity = new cityModel({
          name: req.body.city_name,
          user_id: req.session.passport.user,
        });
        newCity.save();

        res.redirect("/module/Weather_app/main");
      }
    }
  });
});

module.exports = {
  router: router,
  path_main: "/Weather_app",
  name: "Weather",
  db_name: "weather",
  info: "This is a Weather-app, there you can see the weather.",
  path_site: "/main",
  path_view: "/view",
  //variables: b
};
