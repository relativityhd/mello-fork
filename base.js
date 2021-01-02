require("dotenv").config();
const clear = require("clear");

// Import/require all necessary files
const db_connection = require("./Mongoose/MongoUtil.js");
const colors = require("./scripts/standart_functions.js").colors;

// Variable for counting the connection requests
var connectionTries = 0;

function init(err) {
  // Clears console at app start
  // clear()
  console.log(" $$ Start WebApp... $$\n");
  connectionTries++;

  // Check if connected successfully to the database
  // Tries after 10 sec. another time to connect
  if (err) {
    console.log(
      " There was an error while connecting to database: \n",
      colors.error(err)
    );
    console.log(
      "\n Could not connect to database! Try Nr. : ",
      connectionTries
    );
    console.log(" Wait for connection...");
    setTimeout(function () {
      db_connection.connectToServer(function (err) {
        init(err);
      });
    }, 10000);
    return;
  }
  console.log(
    " Connected successfully after " + connectionTries + " tries to database!"
  );

  // Programm-Bibliotheken laden, mit denen
  // ein Express-HTTP-Server eingerichtet wird.
  var express = require("express"); //einfaches Web-Framework, zustänfig für GET & POST
  var router = express.Router();
  var app = express();
  var path = require("path"); //wird für routes benötigt
  var server = require("http").createServer(app); //erstellt den Server
  var bodyParser = require("body-parser"); //übermittelt Daten beim POST vom Body des HTMLs    //handles just one body
  var cookieParser = require("cookie-parser"); //don´t really know if needed
  var expressValidator = require("express-validator"); //benutzt um sicherzustellen ob anfragen richtig sind (req.checkBody bei routes)

  var assert = require("assert"); //wird benutzt um, zu checken ob eine Verbindung zu Mongo besteht (keine Ahnung wofür noch)
  var pathsimport = require("./scripts/paths.js");

  var session = require("express-session");
  var MongoStore = require("connect-mongo")(session);
  var mongoose = require("mongoose");
  var passport = require("passport");
  var flash = require("connect-flash");

  //öffentlichen Ordner deklarieren
  app.use(express.static(path.join(__dirname, "public")));

  //Einbinden der View Engine
  app.set("view engine", "ejs");

  // Express Session
  app.use(
    session({
      resave: false,
      saveUninitialized: false,
      secret: "lkdfpokdsfksdfü",
      signed: true,
      cookie: { maxAge: 800000 },
      /* secret: 'jklvjcpowue8zr4w3ifoh43zru239dufi9329z8ue3980f32',
  saveUninitialized: true,
  resave: true,
  cookie: { maxAge: 10000 } */
    })
  );

  // Passport init
  app.use(passport.initialize());
  app.use(passport.session());

  // Express Validator
  app.use(
    expressValidator({
      errorFormatter: function (param, msg, value) {
        var namespace = param.split("."),
          root = namespace.shift(),
          formParam = root;

        while (namespace.length) {
          formParam += "[" + namespace.shift() + "]";
        }
        return {
          param: formParam,
          msg: msg,
          value: value,
        };
      },
    })
  );

  // BodyParser Middleware
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(cookieParser());

  //Einbindung der Routen
  var router_index = require("./routes/index");
  var router_dash = require("./routes/dashboard");
  var router_registration = require("./routes/registration");
  var router_login = require("./routes/login");
  var router_upload = require("./routes/pic-upload");
  var router_settings = require("./routes/usersettings");
  var router_themes = require("./routes/changetheme");
  var router_modules = require("./modules/modules");
  var router_profile = require("./routes/profile");

  app.use(pathsimport.main, router_index);
  app.use(pathsimport.main, router_dash);
  app.use(pathsimport.main, router_settings);
  app.use(pathsimport.main, router_themes);
  app.use(pathsimport.profilesite, router_profile);
  app.use(pathsimport.registration, router_registration);
  app.use(pathsimport.LogIn, router_login);
  app.use(pathsimport.registration, router_upload);

  app.use(pathsimport.Modules.Modules, router_modules);
  //app.get('/', function(req, res){
  //  console.log("hello");
  //res.sendFile(path.join(__dirname, 'public_html/index.html'));
  //});

  //Bibliotheken für unsere Datenbank
  var mongo = require("mongodb");
  var MongoClient = require("mongodb").MongoClient;
  var mongoose = require("mongoose");

  // Die Websocket-Bibliothek laden.
  const io = require("socket.io")(server);

  // Den Port festlegen, an dem der Server auf
  // Verbindungen warten soll.
  const port = process.env.port || 6776;

  // Server auf gegebenem Port starten.
  server.listen(port, function () {
    console.log("Server listening at port %d", port);
  });

  /*
//vielleich löschen
// error handler
// define as the last app.use callback
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.send(err.message);
});

*/

  // Dem Server sagen, dass er alle HTML-Dateien
  // aus dem 'public'-Ordner einfach an den Browser
  // weiterreichen soll.
  //app.use(express.static(path.join(__dirname, 'public')));
}

//Database connection
db_connection.connectToServer(function (err) {
  init(err);
});
