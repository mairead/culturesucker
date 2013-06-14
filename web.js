var async   = require('async');
var express = require('express');
var util    = require('util');
var http    = require('http');
var httpreq = require('httpreq');

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
  console.log("Listening on " + port);
});

app.dynamicHelpers({
  'host': function(req, res) {
    return req.headers['host'];
  },
  'scheme': function(req, res) {
    return req.headers['x-forwarded-proto'] || 'http';
  },
  'url': function(req, res) {
    return function(path) {
      return app.dynamicViewHelpers.scheme(req, res) + app.dynamicViewHelpers.url_no_scheme(req, res)(path);
    }
  },
  'url_no_scheme': function(req, res) {
    return function(path) {
      return '://' + app.dynamicViewHelpers.host(req, res) + (path || '');
    }
  },
});

function render_page(req, res) {
  req.facebook.app(function(err, app) {
    req.facebook.me(function(user) {
      res.render('index.ejs', {
        layout:    false,
        req:       req,
        app:       app,
        user:      user
      });
    });
  });
}

function render_form_page(req, res) {
  res.render('keyword_form.ejs', {
    layout:    false,
    req:       req
  });
}

function handle_facebook_request(req, res) {

  // if the user is logged in
  if (req.facebook.token) {

    async.parallel([
      function(cb) {
        // query 4 friends and send them to the socket for this socket id
        req.facebook.get('/me/friends', { limit: 4 }, function(friends) {
          req.friends = friends;
          cb();
        });
      },
      function(cb) {
        // query 16 photos and send them to the socket for this socket id
        req.facebook.get('/me/photos', { limit: 16 }, function(photos) {
          req.photos = photos;
          cb();
        });
      },
      function(cb) {
        // query 4 likes and send them to the socket for this socket id
        req.facebook.get('/me/likes', { limit: 4 }, function(likes) {
          req.likes = likes;
          cb();
        });
      },
      function(cb) {
        // use fql to get a list of my friends that are using this app
        req.facebook.fql('SELECT uid, name, is_app_user, pic_square FROM user WHERE uid in (SELECT uid2 FROM friend WHERE uid1 = me()) AND is_app_user = 1', function(result) {
          req.friends_using_app = result;
          cb();
        });
      }
    ], function() {
      render_page(req, res);
    });

  } else {
    render_page(req, res);
  }
}


function display_keyword_form(req, res) {

  var keyword = "sample"; //default value

  console.log("req", req.body['keyword']);

  keyword = req.body['keyword'];

  httpreq.get('http://www.culturegrid.org.uk/index/select', {
    parameters: {
        q: keyword,
        wt:'json',
        have_thumbnail:'true',
        record_type:'item',
        maximumRecords: '100'
    },
    headers:{
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.7; rv:18.0) Gecko/20100101 Firefox/18.0'
    }
  }, function (err, res){
    var imageUrl = "";
    var sorryMsg = "";
    var itemTitle = "";
    if (err){
        console.log(err);
    }else{
  //       //create randomisation from no. of docs returned for integer of array
  //       //console.log(JSON.parse(res.body).response.docs);
  //       //walk through docs, if thumbnail exists then add as URL

        var docs = JSON.parse(res.body).response.docs;
        var docsLength = docs.length;

  //       //for each item in array test for pndsterms.thumbnail
        for (var i = docsLength - 1; i >= 0; i--) {
           if(docs[i]['pndsterms.thumbnail']){
            imageUrl = docs[i]['pndsterms.thumbnail'];
            itemTitle = docs[i]['dc.title'][0];
            console.log("image when being set", imageUrl);
            break;
           }
        };
        console.log("image after break", imageUrl)
        if(imageUrl === ""){
          sorryMsg = "No items with image thumbnail found. Please try another search term";
        }
  //       //if one found, break loop, retrieve name and image URL and pass back to main
        
  //       //if none return message to page saying no images

        console.log("inside", imageUrl, itemTitle);

  //       //how to create something exposed outside of this callback?
        renderPageAgain(itemTitle, imageUrl, sorryMsg);
      }
    }
  );



  function renderPageAgain(title, image, sorryMsg){
    console.log("outside", title, image, sorryMsg)
    req.formvalue = req.body['keyword'];
    req.itemTitle = title;
    req.returnedImgUrl = image;
    req.sorryMsg = sorryMsg;
    render_form_page(req, res);//this isn't forwarding back to page, wrong res and req
  }

//renderPageAgain("this", "img", "sorry")  

  //make get request to JSON API at culture grid
  //construct DOM elem from JSON result in success handler
  //render form page with item in result

}

// app.get('/', handle_facebook_request);
// app.post('/', handle_facebook_request);

app.get('/culturequery', display_keyword_form);

app.post('/culturequery', display_keyword_form);