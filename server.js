var async   = require('async');
var express = require('express');


// create an express webserver

var app = express.createServer(
  express.logger(),
  express.static(__dirname + '/public'),
  express.bodyParser(),
  express.cookieParser()//,
  // set this to a secret value to encrypt session cookies
  // express.session({ secret: process.env.SESSION_SECRET || 'secret123' }),
  // require('faceplate').middleware({
  //   app_id: process.env.FACEBOOK_APP_ID,
  //   secret: process.env.FACEBOOK_SECRET,
  //   scope:  'user_likes,user_photos,user_photo_video_tags'
  // })
);

// listen to the PORT given to us in the environment
var port = process.env.PORT || 3000;

app.listen(port, function() {
  console.log("New web server Listening on " + port);
});

function show_page(req, res){
  res.render('default.ejs', {
    layout:    false,
    req:       req
  });
}

// app.get('/', handle_facebook_request);
// app.post('/', handle_facebook_request);

app.get('/', show_page);