# Wanakofi server
NodeJS/Express4/Socket.io server in order to login through social networks and communicate using WebSockets (users are grouped by room). The room name comes from the AngularJS front-end client (see the other repository).

This project intends to show the "power" of NodeJS/Socket.io as an API with a responsive and modern front-end UI. Note: the front and the back are not on the same servers, it shows the implementation of a very simple CORS (http://en.wikipedia.org/wiki/Cross-origin_resource_sharing).

## Features

* Express 4 server
* Socket.io server with on/emit/broadcast events (realtime)
* Authentication API using PassportJS (connection through social networks : Facebook, Twitter, Google+), easy to extend
* Some specific info (username, provider, avatar, tag...) are stored in the socket
* Socket communication in rooms (join/leave)
* Socket disconnect / reconnect
* Logout with socket disconnection

## Note
* There is a package.json file, so the dependencies are all configured in this file, you just have to launch the classical "npm install" command in the project directory. However, i wrote the "whole" server application in a single file (server.js) which is NOT a best pratice at all (but hey, i liked it this way with big comments). You'll prefer to separate config and routes in separated files.

## DEMO

http://vast-headland-2092.herokuapp.com
