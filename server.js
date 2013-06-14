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

function display_keyword_form(req, res) {

  var keyword = "sample"; //default value
  keyword = req.body['keyword'];


  function renderPageAgain(title, image, sorryMsg){
    console.log("outside", title, image, sorryMsg)
    req.formvalue = req.body['keyword'];
    req.itemTitle = title;
    req.returnedImgUrl = image;
    req.sorryMsg = sorryMsg;
    render_form_page(req, res);//this isn't forwarding back to page, wrong res and req
  }

  renderPageAgain("this", "img", "sorry")  


}

function render_form_page(req, res) {
  res.render('keyword_form.ejs', {
    layout:    false,
    req:       req
  });
}

function show_page(req, res){
  res.render('default.ejs', {
    layout:    false,
    req:       req
  });
}

// app.get('/', handle_facebook_request);
// app.post('/', handle_facebook_request);

app.get('/', show_page);
app.get('/culturequery', display_keyword_form);