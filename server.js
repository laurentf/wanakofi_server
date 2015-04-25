///////////////////////////// BASIC SETUP /////////////////////
var express = require('express');
var app = express();
var server = require('http').Server(app);
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var io = require('socket.io')(server);
var port = process.env.PORT || 80;
var morgan = require('morgan');
var moment = require('moment');
var serverHost = 'http://powerful-ridge-1197.herokuapp.com'; // SERVER HOSTNAME (this script will be launched on this server)
var clientHost = 'http://vast-headland-2092.herokuapp.com'; // THE AUTHORIZED CLIENT (the AngularJS or whatever front end app to connect to this API)
//var mongoose = require('mongoose');
///////////////////////////////////////////////////////////////


///////////////////////////// APP CONF ////////////////////////
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('express-session')({
    secret: 'MYSECRET',
    resave: false,
    saveUninitialized: false
}));
app.use(morgan('dev'));
///////////////////////////////////////////////////////////////


///////////////////////////// PASSPORT INIT ///////////////////
var passport = require('passport')
  , FacebookStrategy = require('passport-facebook').Strategy
  , GoogleStrategy = require('passport-google-oauth2').Strategy
  , TwitterStrategy = require('passport-twitter').Strategy;
///////////////////////////////////////////////////////////////


///////////////////////////// FB STRATEGY ///////////////////// 
passport.use(new FacebookStrategy({
    clientID: '420707984735968',
    clientSecret: '9aa123361b1172be15d736c712004466',
    callbackURL: serverHost + '/auth/facebook/callback'
  },
  function(accessToken, refreshToken, profile, done) {
   process.nextTick(function () {
     return done(null, profile);
   });
  }
));
///////////////////////////////////////////////////////////////


///////////////////////////// TW STRATEGY ///////////////////// 
passport.use(new TwitterStrategy({
    consumerKey: 'm5XmOVRuywipkNAL3I0OzD3nY',
    consumerSecret: 'zmfRAKE4QCWFB5SEfx7jd3o8glZ6EiegoaKFuAyoeqQeYJj3MW',
    callbackURL: serverHost + '/auth/twitter/callback'
  },
  function(token, tokenSecret, profile, done) {
    process.nextTick(function () {
     return done(null, profile);
    });
  }
));
///////////////////////////////////////////////////////////////

///////////////////////////// GP STRATEGY ///////////////////// 
passport.use(new GoogleStrategy({
    clientID:     '165456648509-3sqoq8n2icglhb7nhdhvt0di00ilh266.apps.googleusercontent.com',
    clientSecret: 'yiAJ-sAhnYL5eD5eEn_1N0y9',
    callbackURL: serverHost + '/auth/google/callback',
    passReqToCallback   : true
  },
  function(request, accessToken, refreshToken, profile, done) {
    process.nextTick(function () {
     return done(null, profile);
    });
  }
));
///////////////////////////////////////////////////////////////

///////////////////////////// PASSPORT CONF ///////////////////
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
///////////////////////////////////////////////////////////////



///////////////////////////// AUTH MIDDLEWARE /////////////////
var auth = function(req, res, next){ 
  if (!req.isAuthenticated()) res.send(401); else next();
};
///////////////////////////////////////////////////////////////


///////////////////////////// ROUTES //////////////////////////
// facebook login
app.get('/auth/facebook',
  passport.authenticate('facebook', { scope: ['public_profile', 'email', 'user_friends'] }));

// facebook callback
app.get('/auth/facebook/callback', 
  passport.authenticate('facebook', { successRedirect: clientHost + '/#lobby',
                                      failureRedirect: clientHost + '/#login' }));

// twitter login
app.get('/auth/twitter', passport.authenticate('twitter'));

// twitter callback
app.get('/auth/twitter/callback', 
  passport.authenticate('twitter', { successRedirect: clientHost + '/#lobby',
                                      failureRedirect: clientHost + '/#login' }));

// google login
app.get('/auth/google', 
  passport.authenticate('google', { scope: [ 'https://www.googleapis.com/auth/plus.login' ] }));

// google callback
app.get('/auth/google/callback', 
  passport.authenticate('google', { successRedirect: clientHost + '/#lobby',
                                    failureRedirect: clientHost + '/#login' }));
            
// route to check if the user is logged 
app.get('/loggedin', function(req, res) { 
  // Allow cross domain http request (only GET)
  res.set({
    'Access-Control-Allow-Origin': clientHost,
    'Access-Control-Allow-Credentials': true,
    'Access-Control-Allow-Methods': 'GET'
  });
  res.send(req.isAuthenticated() ? req.user : '0'); 
});
  
// route to log out 
app.get('/logout', function(req, res){ 
  // Allow cross domain http request (only GET)
  res.set({
      'Access-Control-Allow-Origin': clientHost,
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Allow-Methods': 'GET'
  });
  req.logOut(); 
  res.send(200); 
}); 
///////////////////////////////////////////////////////////////   
  
///////////////////////////// SOCKETS /////////////////////////
var users = []; // users which are currently connected to the chat grouped by room
var ids = {}; // store provider-id combinations in order to know if a new socket is already connected (if yes we don't want to create a new socket)
var numUsers = []; // nb users grouped by room

io.on('connection', function (socket) {
  var addedUser = false;
  console.log('new connection');
  
  // NEW MESSAGE FROM USER
  socket.on('NEW_MESSAGE', function (data) {
  console.log('will send message ' + data.message + ' from ' + socket.username + ' in ' + socket.rooom);

    io.sockets.in(socket.rooom).emit('NEW_MESSAGE', {
    id: socket.userId,
    provider : socket.provider,
      username: socket.username,
      avatar : socket.avatar,
      message: data.message,
      moment: data.moment
    });
  
  });

  // NEW USER
  socket.on('NEW_USER', function (user) {
    // we store the username and room in the socket session for this client
    socket.username = user.username;
    socket.rooom = user.room;
    socket.avatar = user.avatar;
    socket.provider = user.provider;
    socket.userId = user.id;
  
  // associate the real socket id in order to retrieve it if needed
  ids[user.provider + user.id] = socket.id; 
  
    console.log(user.username + ' ' + user.room + ' ' + user.avatar);

    // add the client's username to the global list
    if(typeof users[socket.rooom] == 'undefined'){
      users[socket.rooom] = [];
    }
    users[socket.rooom][socket.id] = user;

    // join the room 
    socket.join(socket.rooom);
    console.log(socket.username + ' join ' + socket.rooom);

    if(typeof numUsers[socket.rooom] == 'undefined'){
        numUsers[socket.rooom] = 0;
    }
    numUsers[socket.rooom] = numUsers[socket.rooom]+1;
    addedUser = true;

    // LOGIN
    socket.emit('LOGIN', {
       numUsers: numUsers[socket.rooom]
    });

    // echo globally (all clients) that a person has connected
    socket.broadcast.in(socket.rooom).emit('NEW_USER', {
    id : socket.userId,
    provider: socket.provider,
    username: socket.username,
    room : socket.rooom,
    avatar : socket.avatar,
    numUsers: numUsers[socket.rooom]
    });
  });

  // USER IS TYPING
  socket.on('TYPING', function () {
    socket.broadcast.in(socket.rooom).emit('TYPING', {
      username: socket.username
    });
  });

  // USER STOP TYPING
  socket.on('STOP_TYPING', function () {
    socket.broadcast.in(socket.rooom).emit('STOP_TYPING', {
      username: socket.username
    });
  });

  // USER LEFT
  socket.on('disconnect', function () {
    // remove the username from global users list
    if (addedUser) {
  
      delete users[socket.rooom][socket.id];
    delete ids[socket.provider + socket.userId];
    
      numUsers[socket.rooom] = numUsers[socket.rooom]-1;

      // echo globally that this client has left
      socket.broadcast.in(socket.rooom).emit('USER_LEFT', {
        username: socket.username,
        room : socket.rooom,
        avatar : socket.avatar,
        numUsers: numUsers[socket.rooom]
      });
    }
  });
  
});

/////////////////////////////////////////////////////////////// 