// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

var passport = require('passport')
  , FacebookStrategy = require('passport-facebook').Strategy;

passport.use(new FacebookStrategy({
    clientID: '420707984735968',
    clientSecret: '9aa123361b1172be15d736c712004466',
    callbackURL: "http://localhost:3000/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    User.findOrCreate(null, function(err, user) {
      if (err) { return done(err); }
      done(null, user);
    });
  }
));

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Facebook login
app.get('/auth/facebook',
  passport.authenticate('facebook', { scope: ['public_profile', 'email', 'user_friends'] })
);

// Facebook callback
app.get('/auth/facebook/callback', 
  passport.authenticate('facebook', { successRedirect: '/chat',
                                      failureRedirect: '/login' }));

// CHATROOM

// usernames which are currently connected to the chat
var users = {};
var numUsers = 0;

io.on('connection', function (socket) {
  var addedUser = false;
  console.log('new connection');

  // NEW MESSAGE FROM USER
  socket.on('NEW_MESSAGE', function (data) {
    // we tell the client to execute 'new message'
    socket.broadcast.emit('NEW_MESSAGE', {
      username: socket.username,
      message: data
    });
  });

  // NEW USER
  socket.on('NEW_USER', function (user) {
    // we store the username and city in the socket session for this client
    socket.username = user.username;
    socket.city = user.city
    console.log(user.username + ' ' + user.city);
    // add the client's username to the global list
    users[socket.id] = user.username;
    ++numUsers;
    addedUser = true;

    // LOGIN
    socket.emit('LOGIN', {
      numUsers: numUsers
    });

    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('NEW_USER', {
      id : socket.id,
      username: socket.username,
      city : socket.city,
      numUsers: numUsers
    });
  });

  // USER IS TYPING
  socket.on('TYPING', function () {
    socket.broadcast.emit('TYPING', {
      username: socket.username
    });
  });

  // USER STOP TYPING
  socket.on('STOP_TYPING', function () {
    socket.broadcast.emit('STOP_TYPING', {
      username: socket.username
    });
  });

  // USER LEFT
  socket.on('disconnect', function () {
    // remove the username from global usernames list
    if (addedUser) {
      delete users[socket.id];
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('USER_LEFT', {
        username: socket.username,
        city : socket.city,
        numUsers: numUsers
      });
    }
  });
});