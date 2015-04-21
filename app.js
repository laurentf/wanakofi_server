// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').Server(app);
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

// mongodb models
var mongoose = require('mongoose');
// morgan logger
var morgan = require('morgan')

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('express-session')({
    secret: 'MYSECRET',
    resave: false,
    saveUninitialized: false
}));

app.use(morgan('dev'));

var passport = require('passport')
  , FacebookStrategy = require('passport-facebook').Strategy
  , GoogleStrategy = require('passport-google').Strategy
  , TwitterStrategy = require('passport-twitter').Strategy;
  
passport.use(new FacebookStrategy({
    clientID: '420707984735968',
    clientSecret: '9aa123361b1172be15d736c712004466',
    callbackURL: "http://localhost:3000/auth/facebook/callback"
  },
	function(accessToken, refreshToken, profile, done) {
	 process.nextTick(function () {
	   return done(null, profile);
	 });
  }
));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

app.use(passport.initialize());
app.use(passport.session());

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// define a middleware function to be used for every secured routes 
var auth = function(req, res, next){ 
	if (!req.isAuthenticated()) res.send(401); else next();};

// route to log in 

// facebook login
app.get('/auth/facebook',
  passport.authenticate('facebook', { scope: ['public_profile', 'email', 'user_friends'] })
);

// facebook callback
app.get('/auth/facebook/callback', 
  passport.authenticate('facebook', { successRedirect: 'http://localhost/angular/#chat',
                                      failureRedirect: 'http://localhost/angular/#login' }));
					  
// route to check if the user is logged 
app.get('/loggedin', function(req, res) { 
		// Allow cross domain http request (only GET)
		res.set({
		  'Access-Control-Allow-Origin': 'http://localhost',
		  'Access-Control-Allow-Credentials': true,
		  'Access-Control-Allow-Methods': 'GET'
		});
		res.send(req.isAuthenticated() ? req.user : '0'); 
});
	
// route to log out 
app.get('/logout', function(req, res){ 
	res.set({
		  'Access-Control-Allow-Origin': 'http://localhost',
		  'Access-Control-Allow-Credentials': true,
		  'Access-Control-Allow-Methods': 'GET'
	});
	req.logOut(); 
	res.send(200); 
}); 
		
		
// CHATROOM

// usernames which are currently connected to the chat
var users = [];
var numUsers = [];

io.on('connection', function (socket) {
  var addedUser = false;
  console.log('new connection');

  // NEW MESSAGE FROM USER
  socket.on('NEW_MESSAGE', function (data) {
    // we tell the client to execute 'new message'
	console.log('will send message ' + data + ' from ' + socket.username);

    io.sockets.in(socket.city).emit('NEW_MESSAGE', {
      username: socket.username,
      avatar : socket.avatar,
      message: data.message,
      moment: data.moment
    });
	
  });

  // NEW USER
  socket.on('NEW_USER', function (user) {
    // we store the username and city in the socket session for this client
    socket.username = user.username;
    socket.city = user.city;
    socket.avatar = user.avatar;
    console.log(user.username + ' ' + user.city + ' ' + user.avatar);

    // add the client's username to the global list
    if(typeof users[socket.city] == 'undefined'){
      users[socket.city] = [];
    }
    users[socket.city][socket.id] = user;

    // join the room of your city
    socket.join(socket.city);
    console.log(socket.username + ' join ' + socket.city);

    if(typeof numUsers[socket.city] == 'undefined'){
        numUsers[socket.city] = 0;
    }
    numUsers[socket.city] = numUsers[socket.city]+1;
    addedUser = true;

    // LOGIN
    socket.emit('LOGIN', {
       numUsers: numUsers[socket.city]
    });

    // echo globally (all clients) that a person has connected
    socket.broadcast.in(socket.city).emit('NEW_USER', {
      id : socket.id,
      username: socket.username,
      city : socket.city,
      avatar : socket.avatar,
      numUsers: numUsers[socket.city]
    });
  });

  // USER IS TYPING
  socket.on('TYPING', function () {
    socket.broadcast.in(socket.city).emit('TYPING', {
      username: socket.username
    });
  });

  // USER STOP TYPING
  socket.on('STOP_TYPING', function () {
    socket.broadcast.in(socket.city).emit('STOP_TYPING', {
      username: socket.username
    });
  });

  // USER LEFT
  socket.on('disconnect', function () {
    // remove the username from global usernames list
    if (addedUser) {
      delete users[socket.city][socket.id];
      numUsers[socket.city] = numUsers[socket.city]-1;

      // echo globally that this client has left
      socket.broadcast.in(socket.city).emit('USER_LEFT', {
        username: socket.username,
        city : socket.city,
        avatar : socket.avatar,
        numUsers: numUsers[socket.city]
      });
    }
  });
});