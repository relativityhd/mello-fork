const mongo = require("mongodb").MongoClient;
const client = require("../../../scripts/standart_functions.js").moduleListen;
const express = require("express");
const app = express();
const path = require("path");
var pathsimport = require("../../../scripts/paths.js");
var router = express.Router();
var User = require("../../../Mongoose/user");
var groupModelScheme = require("../groups/schema");
var ensureAuthenticated = require("../../../scripts/standart_functions.js")
  .ensureAuthenticated;

//var sio = require("socket.io")(server);

/*
function returnUserId(req, res, next){
    if(req.isAuthenticated()){
        console.log('User ID: ' + req.session.passport.user);
        return req.session.passport.user;
      } else {
        //req.flash('error_msg','You are not logged in');
        var err = new Error('Not authorized! Go back!');
              err.status = 400;
              return next(err);
      }
};
*/

var currentId = {};

router.get("/main", ensureAuthenticated, function (req, res) {
  User.getUserById(req.session.passport.user, function (err, user) {
    currentId.id = user._id;

    res.render("./../modules/modules/einzel_chat/index", {
      paths: pathsimport,
      user: req.isAuthenticated(),
      name: user.username,
      currentuser_id: req.session.passport.user,
      userlist: user.userlist,
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
    let privateChat = dbo.collection("privateChats");

    // Create function to send status
    sendStatus = function (s) {
      client.sockets.in(s.User).emit("status", s);
      //socket.emit('status', s);
    };

    socket.on("addUser", function (data) {
      console.log(data);
      var query = {
        username: data.username,
      };

      console.log("query:");
      console.log(query);

      var query2 = {
        _id: data.currentUser,
      };
      //var userSearch = dbo.collection('users').findOne(query);

      User.findOne(query, function (err, user) {
        if (user) {
          //var u1 = user._id;

          User.findOne(query2, function (err, user2) {
            if (user.username === user2.username) {
              console.log(user2.username);
              // Send status object
              sendStatus({
                Symbol: "err",
                success: false,
                User: user2._id,
                message: "Don´t be selfish",
                clear: true,
              });

              return null;
            } else {
              var checkList;
              var check = false;

              checkList = user2.privateChatUserListID;

              for (i = 0; i < checkList.length; i++) {
                console.log(user._id);
                console.log(checkList[i]);

                if ("" + user._id + "" == "" + checkList[i] + "") {
                  check = true;
                }
                console.log(check);
              }

              console.log(check);

              if (check == false) {
                console.log("user exists and will be added to the userList");

                var userListID = user2.privateChatUserListID;
                var userListUsername = user2.privateChatUserListUsername;

                /*
                            User.findOne(query2, function(err, user2){
                                userListID = user2.privateChatUserListID;
                                userListUsername = user2.privateChatUserListUsername;
                            });
                            */

                userListID.push(user._id);
                userListUsername.push(user.username);

                var newuserList = {
                  privateChatUserListID: userListID,
                  privateChatUserListUsername: userListUsername,
                };

                User.updateOne(query2, newuserList, function (err, res) {
                  if (err) throw err;
                  //callback(err, hashpswd, user);
                });

                var uNameArray = [];
                var uIDArray = [];

                uNameArray.push(user.username);
                uIDArray.push(user._id);
                /*
                            uNameArray[0] = user.username;
                            uIDArray[0] =  user._id;
*/
                console.log(
                  "DATA BACK ________________________------_________________"
                );
                console.log(data.currentUser);
                var dataBack = {
                  new: true,
                  exists: true,
                  newUserUsername: uNameArray,
                  newUserID: uIDArray,
                };
                console.log(dataBack);

                client.sockets
                  .in(data.currentUser)
                  .emit("addUserResult", dataBack);

                //socket.in(data.currentUser).emit('addUserResult', dataBack);

                console.log("lolololol");
                console.log(currentId);

                User.findOne(query2, function (err, user4) {
                  var privateChatUserIDList = user4.privateChatUserListID;
                  var privateChatUsernameList =
                    user4.privateChatUserListUsername;

                  var userShowData = {
                    exists: true,
                    newUserUsername:
                      privateChatUsernameList[
                        privateChatUsernameList.length - 1
                      ],
                    newUserID:
                      privateChatUserIDList[privateChatUserIDList.length - 1],
                  };
                  console.log(userShowData);
                  //socket.emit('addUserResult', userShowData);
                  //socket.in(data.currentUser).emit('addUserResult', userShowData);
                });

                /*
                for (i = 0; i < privateChatUserIDList.length; i++){
                    uquery = {
                        _id: privateChatUserIDList[i]
                    }
                    User.findById(uquery, function(err, user){
                        console.log(user.username);
                        if(user){

                            privateChatUsernameList[i] = user.username;
                        } 
                    });
                }*/

                /* old
                var dataBack={
                    exists: true,
                    newUserUsername: user.username,
                    newUserID: user._id
                } */

                //socket.emit
                //socket.in(data4.username).emit('output', {});

                /*

                            //console.log(req.session.passport.user);
                                var firstQuery = {
                                    firstUser: data.currentUser,
                                    secondUser: '' + user._id + ''
                                }

                            
                                var secondQuery = {
                                    firstUser: '' + user._id + '',
                                    secondUser: data.currentUser
                                }

                                console.log('firstQuery');
                                console.log(firstQuery);
                                console.log('secondQuery');
                                console.log(secondQuery);
            //////////////////////////////////////////////////////////////////////////////////////hääääääääääääääääääääääääääääääääääääääää////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////hääääääääääääääääääääääääääääääääääääääää////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////hääääääääääääääääääääääääääääääääääääääää////////////////////////////////////////////////////////////////////////////
//emit flasch
//////////////////////////////////////////////////////////////////////////////////////hääääääääääääääääääääääääääääääääääääääää////////////////////////////////////////////////////////////////////////////
                                // Get chats from mongo collection
                                privateChat.find(firstQuery).limit(100).sort({_id:1}).toArray(function(err, res){
                                if(err){
                                    throw err;
                                    }
                                    console.log('res coming');
                                    console.log(res);
                                    socket.emit('output', res);
                                // Emit the messages
                                    //io.sockets.emit('output', res);
                                    socket.in(data.currentUser).emit('output', res);
                                    socket.in(data.username).emit('output', res);
                                });

                                privateChat.find(secondQuery).limit(100).sort({_id:1}).toArray(function(err, res){
                                    if(err){
                                        throw err;
                                        }
                                        console.log('res coming');
                                        console.log(res);
                                        //socket.emit('output', res);
                                    // Emit the messages
                                        //io.sockets.emit('output', res);
                                        socket.in(data.currentUser).emit('output', res);
                                        socket.in(data.username).emit('output', res);
                                    });

*/
              } else {
                sendStatus({
                  Symbol: "err",
                  success: false,
                  User: user2._id,
                  message: "User is already in your list!",
                  clear: true,
                });
              }
            }
          });
        } else {
          User.findOne(query2, function (err, user3) {
            if (data.username == "") {
              sendStatus({
                Symbol: "err",
                success: false,
                User: user3._id,
                message: "Please enter a Username",
                clear: true,
              });
            } else {
              sendStatus({
                Symbol: "err",
                success: false,
                User: user3._id,
                message: "User does not exist!",
                clear: true,
              });
            }
          });
        }
      });
    });

    socket.on("firstRequest", function (data4) {
      socket.join(data4.username);

      var query = {
        _id: data4.username,
      };

      User.findOne(query, function (err, user) {
        if (user) {
          console.log(user.username);

          var privateChatUserIDList = user.privateChatUserListID;
          var privateChatUsernameList = user.privateChatUserListUsername;
          var UserStrangerListID = user.privateChatStrangerListID;
          var MissedMessageArrayID = user.MissedMessageArrayID;
          var MissedMessageArrayCount = user.MissedMessageArrayCount;

          if (UserStrangerListID.length > 0) {
            var strangeDataReqfirst = {
              numberOfStrangers: UserStrangerListID.length,
            };

            client.sockets
              .in(data4.username)
              .emit("StrangerRequest", [strangeDataReqfirst]);
          }

          // emit the groups ;)
          // User.uservars.groups.groups[] // last is an array

          if (user.uservars.groups.groups) {
            console.log("we are in the Groups first output section");

            var groups = user.uservars.groups.groups;

            console.log("Groups Array:");
            console.log(groups);

            for (var i = 0; i < groups.length; i++) {
              var GroupName = groups[i];
              var GroupMembers;
              var GroupID;

              var groupQuery = {
                name: groups[i],
              };

              groupModelScheme.findOne(groupQuery, function (err, group) {
                console.log("group:");
                console.log(group);

                console.log("GroupQuery");

                GroupMembers = group.members;
                console.log(GroupMembers);

                var GroupID = group._id;
                console.log(GroupID);

                var GroupSendObject = {
                  name: group.name,
                  members: GroupMembers,
                  id: GroupID,
                };

                console.log("GroupSendObject");
                console.log(GroupSendObject);

                client.sockets
                  .in(data4.username)
                  .emit("GroupOutput", GroupSendObject);
              });
            }
          }

          /*
                for (i = 0; i < privateChatUserIDList.length; i++){
                    uquery = {
                        _id: privateChatUserIDList[i]
                    }
                    User.findById(uquery, function(err, user){
                        console.log(user.username);
                        if(user){

                            privateChatUsernameList[i] = user.username;
                        } 
                    });
                }*/

          var userShowData = {
            new: false,
            exists: true,
            newUserUsername: privateChatUsernameList,
            newUserID: privateChatUserIDList,
          };

          /* old
                var dataBack={
                    exists: true,
                    newUserUsername: user.username,
                    newUserID: user._id
                } */

          console.log(userShowData);
          socket.emit("addUserResult", userShowData);

          //socket.emit
          socket.in(data4.username).emit("output", {});

          if (MissedMessageArrayID.length > 0) {
            var nullData = {
              name: "null",
              message: "null",
              thisUser: "null",
              secondUser: "null",
            };

            var dataToEmit = {
              IDMissedMessageArray: MissedMessageArrayID,
              MissedMessageArrayCount: MissedMessageArrayCount,
              messageOutput: nullData,
            };

            console.log("DATAToEMIT");
            console.log(dataToEmit);

            setTimeout(() => {
              client.sockets.in(data4.username).emit("NewMessage", dataToEmit);
            }, 500);
          }
        }
      });

      //socket.emit('output', {});
    });

    socket.on("showGroupMessanges", function (data) {
      var UserWhoRequests = data.ownID;
      var GroupChatID = data.userID;
      var GroupName = data.username;
      //var secondUsername = data.username;

      // privateChat.insert({sendUser: sendUser, group: secondUser, name: name, message: message}, function()

      var firstQueryM = {
        group: GroupChatID,
      };

      console.log("firstQueryM");
      console.log(firstQueryM);

      // Get chats from mongo collection
      privateChat
        .find(firstQueryM)
        .limit(50)
        .sort({ _id: -1 })
        .toArray(function (err, res) {
          if (err) {
            throw err;
          }
          console.log("Res Group First Output");
          console.log(res);
          client.sockets.in(UserWhoRequests).emit("firstoutput", res);
          //client.sockets.in(secondUser).emit('output', res);
        });
    });

    socket.on("inputGroup", function (data) {
      var sendUser = data.secondUser;
      var groupToSend = data.thisUser;
      var name = data.name;
      var messageToSend = data.message;

      if (name == "" || messageToSend == "") {
        // Send error status
        //sendStatus('Please enter a name and message');
        sendStatus({
          Symbol: "err",
          success: false,
          User: sendUser,
          message: "Please enter a message",
          clear: true,
        });
      } else {
        privateChat.insert(
          {
            sendUser: sendUser,
            group: groupToSend,
            name: name,
            message: messageToSend,
          },
          function () {
            var dataToEmitSendUser = {
              IDMissedMessageArray: null,
              MissedMessageArrayCount: null,
              messageOutput: data,
            };

            //Emit to the person who send it!

            client.sockets.in(sendUser).emit("NewMessage", dataToEmitSendUser);

            //Now emit has to be done to all the other member

            var groupQuery = {
              _id: groupToSend,
            };

            console.log("GroupQuery: äääääääääää " + groupQuery);

            groupModelScheme.findOne(groupQuery, function (err, groupFound) {
              var GroupMembers = groupFound.members;
              console.log(GroupMembers);

              for (property in GroupMembers) {
                console.log(property);

                console.log(name);
                if (property != name) {
                  var queryInput = {
                    username: property,
                  };

                  User.findOne(queryInput, function (err, user) {
                    if (user) {
                      //if (client.sockets.adapter.rooms[secondUser]){
                      console.log("User is online!");
                      console.log(property);

                      var queryfirstUser = {
                        _id: data.secondUser,
                      };

                      //User.findOne(queryfirstUser, function(err, user7){

                      var UserStrangerListID = user.MissedMessageObject;
                      var MissedMessageArrayID = user.MissedMessageArrayID;
                      var MissedMessageArrayCount =
                        user.MissedMessageArrayCount;

                      console.log("Missed Message ArrayID Index of");
                      console.log(MissedMessageArrayID.indexOf(groupToSend));

                      if (MissedMessageArrayID.indexOf(groupToSend) == -1) {
                        //User will be added to the MissedMessageArray

                        console.log("Group ID");
                        console.log(groupToSend);

                        console.log("user 6 username");
                        console.log(user.username);

                        MissedMessageArrayID.push(groupToSend);
                        MissedMessageArrayCount.push(1);
                      } else {
                        //User is already in the MissedMessageArray

                        var indexMM = MissedMessageArrayID.indexOf(groupToSend);

                        console.log("indexMM");
                        console.log(indexMM);

                        MissedMessageArrayCount[indexMM] =
                          MissedMessageArrayCount[indexMM] + 1;
                      }

                      var newMissedMessageArray = {
                        MissedMessageArrayID: MissedMessageArrayID,
                        MissedMessageArrayCount: MissedMessageArrayCount,
                      };

                      console.log("newMissedMessageArray");
                      console.log(newMissedMessageArray);

                      var queryInput2 = {
                        _id: user._id,
                      };

                      User.updateOne(
                        queryInput2,
                        newMissedMessageArray,
                        function (err, res) {
                          if (err) throw err;
                          //callback(err, hashpswd, user);
                        }
                      );

                      var dataToEmit = {
                        IDMissedMessageArray: MissedMessageArrayID,
                        MissedMessageArrayCount: MissedMessageArrayCount,
                        messageOutput: data,
                      };

                      console.log("DATAToEMIT");
                      console.log(dataToEmit);

                      console.log(
                        "---------------------Property--------------------------: " +
                          user.username
                      );
                      console.log("User6 ID: " + user._id);

                      if (user._id != sendUser) {
                        client.sockets
                          .in(user._id)
                          .emit("NewMessage", dataToEmit);
                      }

                      //});
                    }

                    sendStatus({
                      Symbol: "send",
                      success: true,
                      User: sendUser,
                      message: "Message sent",
                      clear: true,
                    });

                    /*}else{
                                    console.log("User is dead!");
    
                                 
    
    
    
    
                                    var queryInput2 = {
                                        _id: secondUser
                                    }
                
                                    var queryfirstUser = {
                                        _id: data.thisUser
                                    }
    
                                    User.findOne(queryInput2, function(err, user6){
                                        
                                        User.findOne(queryfirstUser, function(err, user7){
    
    
                                        var UserStrangerListID = user6.MissedMessageObject;
                                        var MissedMessageArrayID = user6.MissedMessageArrayID
                                        var MissedMessageArrayCount = user6.MissedMessageArrayCount
    
                                        console.log("Missed Message ArrayID Index of");
                                        console.log(MissedMessageArrayID.indexOf(data.thisUser));
    
                                        if (MissedMessageArrayID.indexOf(data.thisUser) == -1){
    
                                            //User will be added to the MissedMessageArray
    
                                            console.log("USER ID");
                                            console.log(user7._id);
    
                                            console.log("user 6 username");
                                            console.log(user6.username);
    
                                            MissedMessageArrayID.push(user7._id);
                                            MissedMessageArrayCount.push(1);
    
    
                                        }else{
                                             //User is already in the MissedMessageArray
    
                                             var indexMM = MissedMessageArrayID.indexOf(data.thisUser)
    
                                             console.log("indexMM");
                                             console.log(indexMM);
     
                                             MissedMessageArrayCount[indexMM] = MissedMessageArrayCount[indexMM] + 1;
     
    
    
                                        }
    
                                        
    
    
                                        var newMissedMessageArray = {
                                            MissedMessageArrayID: MissedMessageArrayID,
                                            MissedMessageArrayCount: MissedMessageArrayCount
                                        }
            
                                        console.log("newMissedMessageArray");
                                        console.log(newMissedMessageArray);
            
                                        User.updateOne(queryInput2, newMissedMessageArray, function(err, res) {
                                            if (err) throw err;
                                            //callback(err, hashpswd, user);
                                        });
                                        
                                       
                                        var dataToEmit = {
                                            IDMissedMessageArray: MissedMessageArrayID,
                                            MissedMessageArrayCount: MissedMessageArrayCount,
                                            messageOutput: data
                                        }
        
                                        console.log("DATAToEMIT");
                                        console.log(dataToEmit);
                                        
                                        client.sockets.in(secondUser).emit('NewMessage', dataToEmit);
    
    
                                    });
                                    });
    
    
    
                                    
    
    
    
                                    
    
                                }*/
                  });
                }
              }
            });
          }
        );
      }
    });

    socket.on("showMessanges", function (data) {
      var firstUser = data.ownID;
      var secondUser = data.userID;
      //var secondUsername = data.username;

      var firstQueryM = {
        firstUser: firstUser,
        secondUser: "" + secondUser + "",
      };

      var secondQueryM = {
        firstUser: "" + secondUser + "",
        secondUser: firstUser,
      };

      console.log("firstQueryM");
      console.log(firstQueryM);
      console.log("secondQueryM");
      console.log(secondQueryM);

      // Get chats from mongo collection
      privateChat
        .find({ $or: [firstQueryM, secondQueryM] })
        .limit(50)
        .sort({ _id: -1 })
        .toArray(function (err, res) {
          if (err) {
            throw err;
          }
          client.sockets.in(firstUser).emit("firstoutput", res);
          //client.sockets.in(secondUser).emit('output', res);
        });
      /*
            privateChat.find(secondQueryM).limit(50).sort({_id:1}).toArray(function(err, res){
                if(err){
                    throw err;
                }
                client.sockets.in(firstUser).emit('firstoutput', res);
                //client.sockets.in(data.username).emit('output', res);
            });
*/

      var query = {
        firstUser: currentId,
        secondUser: data.userID,
      };
      privateChat
        .find(query)
        .limit(100)
        .sort({ _id: 1 })
        .toArray(function (err, res) {
          if (err) {
            throw err;
          }

          // Emit the messages
          //socket.emit('output', res);
        });
    });

    /*
        // Get chats from mongo collection
        var secondUser = "";
        var query = {
            doubleId: req.session.passport.user + "-" + secondUser
            };   
        chat.find(query).limit(100).sort({_id:1}).toArray(function(err, res){
            if(err){
                throw err;
            }

            // Emit the messages
            socket.emit('output', res);
        });*/

    // Handle input events
    socket.on("input", function (data) {
      var name = data.name;
      var message = data.message;
      var firstUser = data.thisUser;
      console.log(firstUser);
      var secondUser = data.secondUser;
      console.log("secondUSer: " + secondUser);
      // Check for name and message
      if (name == "" || message == "") {
        // Send error status
        //sendStatus('Please enter a name and message');
        sendStatus({
          Symbol: "err",
          success: false,
          User: firstUser,
          message: "Please enter a message",
          clear: true,
        });
      } else {
        // Insert message
        privateChat.insert(
          {
            firstUser: firstUser,
            secondUser: secondUser,
            name: name,
            message: message,
          },
          function () {
            //client.emit('output', [data]);

            // var message = {}

            //socket.in(data.currentUser).emit('output', res);
            //socket.in(data.username).emit('output', res);

            client.sockets.in(firstUser).emit("output", [data]);
            //client.sockets.in(secondUser).emit('output', [data]);

            //Check if second User has first User in List

            var queryInput = {
              _id: secondUser,
            };

            User.findOne(queryInput, function (err, user) {
              if (user) {
                UList = user.privateChatUserListID;

                if (UList.length == 0) {
                  //check if is in stranger list
                  var StrangerList = user.privateChatStrangerListID;
                  //Check if User is already in stranger List
                  if (StrangerList.length == 0) {
                    //add it to the stranger List and continue                                                              +----------
                    AddToStrangerListAndEmit();
                  } else {
                    var firstUserIsInStrangerList = false;
                    for (var c = 0; c < StrangerList.length; c++) {
                      if (StrangerList[c] == firstUser) {
                        //user is already in List
                        var firstUserIsInStrangerList = true;
                      }
                    }

                    if (firstUserIsInStrangerList == true) {
                      // emit that stranger wants to chat should light up                                                 /----------
                      StrangerRequest();
                    } else {
                      //add it to the stranger List and continue                                                              +----------
                      AddToStrangerListAndEmit();
                    }
                  }
                } else {
                  var firstUserIsInUserList = false;

                  for (var b = 0; b < UList.length; b++) {
                    if (UList[b] == firstUser) {
                      firstUserIsInUserList = true;
                    }
                  }

                  if (firstUserIsInUserList == true) {
                    // normal output // emit that there is one more message                                                 ----------

                    addToMissedMessageObject();
                  } else {
                    //check if is in stranger list
                    var StrangerList = user.privateChatStrangerListID;
                    //Check if User is already in stranger List
                    if (StrangerList.length == 0) {
                      //add it to the stranger List and continue                                                              +----------
                      AddToStrangerListAndEmit();
                    } else {
                      var firstUserIsInStrangerList = false;
                      for (var c = 0; c < StrangerList.length; c++) {
                        if (StrangerList[c] == firstUser) {
                          //user is already in List
                          var firstUserIsInStrangerList = true;
                        }
                      }

                      if (firstUserIsInStrangerList == true) {
                        // emit that stranger wants to chat should light up                                                     /----------
                        StrangerRequest();
                      } else {
                        //add it to the stranger List and continue                                                              +----------
                        AddToStrangerListAndEmit();
                      }
                    }
                  }
                }

                function addToMissedMessageObject() {
                  if (client.sockets.adapter.rooms[secondUser]) {
                    console.log("User is online!");

                    var queryInput2 = {
                      _id: secondUser,
                    };

                    var queryfirstUser = {
                      _id: data.thisUser,
                    };

                    User.findOne(queryInput2, function (err, user6) {
                      User.findOne(queryfirstUser, function (err, user7) {
                        var UserStrangerListID = user6.MissedMessageObject;
                        var MissedMessageArrayID = user6.MissedMessageArrayID;
                        var MissedMessageArrayCount =
                          user6.MissedMessageArrayCount;

                        console.log("Missed Message ArrayID Index of");
                        console.log(
                          MissedMessageArrayID.indexOf(data.thisUser)
                        );

                        if (MissedMessageArrayID.indexOf(data.thisUser) == -1) {
                          //User will be added to the MissedMessageArray

                          console.log("USER ID");
                          console.log(user7._id);

                          console.log("user 6 username");
                          console.log(user6.username);

                          MissedMessageArrayID.push(user7._id);
                          MissedMessageArrayCount.push(1);
                        } else {
                          //User is already in the MissedMessageArray

                          var indexMM = MissedMessageArrayID.indexOf(
                            data.thisUser
                          );

                          console.log("indexMM");
                          console.log(indexMM);

                          MissedMessageArrayCount[indexMM] =
                            MissedMessageArrayCount[indexMM] + 1;
                        }

                        var newMissedMessageArray = {
                          MissedMessageArrayID: MissedMessageArrayID,
                          MissedMessageArrayCount: MissedMessageArrayCount,
                        };

                        console.log("newMissedMessageArray");
                        console.log(newMissedMessageArray);

                        User.updateOne(
                          queryInput2,
                          newMissedMessageArray,
                          function (err, res) {
                            if (err) throw err;
                            //callback(err, hashpswd, user);
                          }
                        );

                        var dataToEmit = {
                          IDMissedMessageArray: MissedMessageArrayID,
                          MissedMessageArrayCount: MissedMessageArrayCount,
                          messageOutput: data,
                        };

                        console.log("DATAToEMIT");
                        console.log(dataToEmit);

                        client.sockets
                          .in(secondUser)
                          .emit("NewMessage", dataToEmit);
                      });
                    });
                  } else {
                    console.log("User is dead!");

                    var queryInput2 = {
                      _id: secondUser,
                    };

                    var queryfirstUser = {
                      _id: data.thisUser,
                    };

                    User.findOne(queryInput2, function (err, user6) {
                      User.findOne(queryfirstUser, function (err, user7) {
                        var UserStrangerListID = user6.MissedMessageObject;
                        var MissedMessageArrayID = user6.MissedMessageArrayID;
                        var MissedMessageArrayCount =
                          user6.MissedMessageArrayCount;

                        console.log("Missed Message ArrayID Index of");
                        console.log(
                          MissedMessageArrayID.indexOf(data.thisUser)
                        );

                        if (MissedMessageArrayID.indexOf(data.thisUser) == -1) {
                          //User will be added to the MissedMessageArray

                          console.log("USER ID");
                          console.log(user7._id);

                          console.log("user 6 username");
                          console.log(user6.username);

                          MissedMessageArrayID.push(user7._id);
                          MissedMessageArrayCount.push(1);
                        } else {
                          //User is already in the MissedMessageArray

                          var indexMM = MissedMessageArrayID.indexOf(
                            data.thisUser
                          );

                          console.log("indexMM");
                          console.log(indexMM);

                          MissedMessageArrayCount[indexMM] =
                            MissedMessageArrayCount[indexMM] + 1;
                        }

                        var newMissedMessageArray = {
                          MissedMessageArrayID: MissedMessageArrayID,
                          MissedMessageArrayCount: MissedMessageArrayCount,
                        };

                        console.log("newMissedMessageArray");
                        console.log(newMissedMessageArray);

                        User.updateOne(
                          queryInput2,
                          newMissedMessageArray,
                          function (err, res) {
                            if (err) throw err;
                            //callback(err, hashpswd, user);
                          }
                        );

                        var dataToEmit = {
                          IDMissedMessageArray: MissedMessageArrayID,
                          MissedMessageArrayCount: MissedMessageArrayCount,
                          messageOutput: data,
                        };

                        console.log("DATAToEMIT");
                        console.log(dataToEmit);

                        client.sockets
                          .in(secondUser)
                          .emit("NewMessage", dataToEmit);
                      });
                    });
                  }
                }

                function AddToStrangerListAndEmit() {
                  var UserStrangerListID = user.privateChatStrangerListID;
                  var UserStrangerListUsername =
                    user.privateChatStrangerListUsername;

                  UserStrangerListID.push(firstUser);
                  UserStrangerListUsername.push(name);

                  var newStrangerList = {
                    privateChatStrangerListID: UserStrangerListID,
                    privateChatStrangerListUsername: UserStrangerListUsername,
                  };

                  console.log("NewStrngerList");
                  console.log(newStrangerList);

                  User.updateOne(
                    queryInput,
                    newStrangerList,
                    function (err, res) {
                      if (err) throw err;
                      //callback(err, hashpswd, user);
                    }
                  );

                  var strangeData = {
                    numberOfStrangers: UserStrangerListID.length,
                  };

                  client.sockets
                    .in(secondUser)
                    .emit("NewUserInStrangerList", [strangeData]);
                }

                function StrangerRequest() {
                  console.log(client.sockets.adapter.rooms[secondUser]);

                  var UserStrangerListID = user.privateChatStrangerListID;

                  var testf = {};

                  if (client.sockets.adapter.rooms[secondUser]) {
                    console.log("User is online!");
                  } else {
                    console.log("User is dead!");

                    testf.penis = 3;
                    console.log(testf);
                    testf.lol = 4;

                    for (property in testf) {
                      console.log(property);
                    }

                    delete testf.penis;
                    console.log(testf);
                  }

                  var strangeDataReq = {
                    numberOfStrangers: UserStrangerListID.length,
                  };

                  client.sockets
                    .in(secondUser)
                    .emit("StrangerRequest", [strangeDataReq]);
                }
              }
            });

            //client.sockets.in(secondUser).emit('output', [data]);

            //client.emit('output', [data]);

            // Send status object
            sendStatus({
              Symbol: "send",
              success: true,
              User: firstUser,
              message: "Message sent",
              clear: true,
            });
          }
        );
      }
    });

    socket.on("removeStranger", function (data) {
      var currentUser = data.currentUser;
      var usernameToRemove = data.usernameToRemove;
      var userIDToRemove = data.userIDToRemove;

      var queryRemoveStranger = {
        _id: currentUser,
      };

      User.findOne(queryRemoveStranger, function (err, user) {
        if (user) {
          var UserStrangerListID = user.privateChatStrangerListID;
          var UserStrangerListUsername = user.privateChatStrangerListUsername;

          var indexToRemoveID = UserStrangerListID.indexOf(userIDToRemove);
          var indexToRemoveUsername = UserStrangerListUsername.indexOf(
            usernameToRemove
          );

          UserStrangerListID.splice(indexToRemoveID, 1);
          UserStrangerListUsername.splice(indexToRemoveUsername, 1);

          var newStrangerList2 = {
            privateChatStrangerListID: UserStrangerListID,
            privateChatStrangerListUsername: UserStrangerListUsername,
          };

          User.updateOne(
            queryRemoveStranger,
            newStrangerList2,
            function (err, res) {
              if (err) throw err;
              //callback(err, hashpswd, user);
            }
          );
        }
      });
    });

    socket.on("StrangerListDataRequest", function (data) {
      var query = {
        _id: data.thisUser,
      };

      User.findOne(query, function (err, user) {
        if (user) {
          var UserStrangerListID = user.privateChatStrangerListID;
          var UserStrangerListUsername = user.privateChatStrangerListUsername;

          var returnData = {
            UserStrangerListID: UserStrangerListID,
            UserStrangerListUsername: UserStrangerListUsername,
          };

          console.log("This Data is returned!");
          console.log(returnData);

          client.sockets
            .in(data.thisUser)
            .emit("StrangerListDataReturn", returnData);
        }
      });
    });

    socket.on("removeMissedMessangesFromCertainUser", function (dat) {
      var RemoveFromID = dat.RemoveFromID;
      var RemoveID = dat.RemoveID;

      var RemoveFromQuery = {
        _id: RemoveFromID,
      };

      var RemoveIDQuery = {
        _id: RemoveID,
      };

      User.findOne(RemoveFromQuery, function (err, RemoveFromUser) {
        User.findOne(RemoveIDQuery, function (err, RemoveIDUser) {
          var MissedMessageArrayID = RemoveFromUser.MissedMessageArrayID;
          var MissedMessageArrayCount = RemoveFromUser.MissedMessageArrayCount;
          var userFound = false;

          for (var y = 0; y < MissedMessageArrayID.length; y++) {
            if (MissedMessageArrayID[y] == RemoveID) {
              userFound = true;
            }
          }

          if (userFound == true) {
            console.log(
              "User was found in missed Messages and will be deletet!"
            );
            var indexFromRemoveID = MissedMessageArrayID.indexOf(RemoveID);

            console.log(indexFromRemoveID);

            MissedMessageArrayID.splice(indexFromRemoveID, 1);
            MissedMessageArrayCount.splice(indexFromRemoveID, 1);

            var newMissedMessages = {
              MissedMessageArrayID: MissedMessageArrayID,
              MissedMessageArrayCount: MissedMessageArrayCount,
            };

            User.updateOne(
              RemoveFromQuery,
              newMissedMessages,
              function (err, res) {
                if (err) throw err;
                //callback(err, hashpswd, user);
              }
            );
          }
        });
      });
    });

    // Handle clear
    socket.on("clear", function (data) {
      // Emit cleared
      socket.emit("cleared");
    });
  });
});

module.exports = {
  router: router,
  path_main: "/single_chat",
  name: "Mello Chat",
  db_name: "singleChat",
  info:
    "This is a Single-Chat, there you can chat with other dedicated people.",
  path_site: "/main",
};
