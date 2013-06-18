var async   = require('async');
var express = require('express');
var request = require('request');
var request = require('qs');
var https = require('https');

// create an express webserver
var app = express.createServer(
  express.logger(),
  express.static(__dirname + '/public'),
  express.bodyParser(),
  express.cookieParser(),
  // set this to a secret value to encrypt session cookies
  //this sets a dummy one to begin with and then creates new
  // when a user session is begun I think
  express.session({ secret: process.env.SESSION_SECRET || 'secret123' }),
  require('./faceplate').middleware({
    app_id: '531423360247136',
    secret: '931b2ad5ec86fadc83b8ca9594643ae6',
    scope:  'user_likes,user_photos,user_photo_video_tags,publish_stream'
  })

);

// listen to the PORT given to us in the environment
var port = process.env.PORT || 3000;

app.listen(port, function() {
  console.log("New web server Listening on " + port);
});

//dynamic helpers from Heroku's default faceplate app
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

//view template rendering
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

function show_login(req, res){
  res.render('login.ejs', {
    layout:    false,
    req:       req
  });
}

function render_culture_page(req, res){
  req.facebook.app(function(err, app) {
    req.facebook.me(function(user, test){


      req.username = "";
      req.like = "";

      if(test !== null){
      req.username = test.name;
        //console.log("likes: ", test.likes)
      }




      res.render('culture.ejs', {
        layout:    false,
        req:       req,
        app:       app,
        user:      user
      });
    });
  });
}

//heroku default app, view template code
function render_page(req, res) {
  req.facebook.app(function(err, app) {
    console.log("calling me when inside render func")
    //changing function sig breaks token? not sure why these things are connected
    req.facebook.me(function(user, test) {
      //why isn't the user function callback params sig err, user? me is using get
      console.log("USER: ", user, "'"+err+"'", test);
      // if(test !== null){
      //   user = test;
      // }
      req.username = "";
      if(test !== null){
      var value = test;
      console.log("VARIABLE WITH VAL:", value); 
      req.username = value.name
      } 
      //why is my user null? I have the token and the token is valid?
      res.render('index.ejs', {
        layout:    false,
        req:       req,
        app:       app,
        user:      user
      });
    });
  });
}

//controller actions
function display_keyword_form(req, res) {
  async.parallel([
    function(cb) {
      var keyword = req.body['keyword'];
      if(typeof keyword === 'undefined'){
        keyword = "sample"; //default value
      };
      console.log("KEYWORD....", keyword);
      var filter = "pndsterms.thumbnail:[* TO *]";
      var url = encodeURI('http://www.culturegrid.org.uk/index/select/?q=' + keyword + '&wt=json&fq='+filter);
      console.log("URL....", url);
      request(url, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          var imageUrl = "";
          var sorryMsg = "";
          var itemTitle = "";
          var docs = JSON.parse(body).response.docs;
          var docsLength = docs.length;

          //for each item in array test for pndsterms.thumbnail
          for (var i = docsLength - 1; i >= 0; i--) {
            if(docs[i]['pndsterms.thumbnail']){
              imageUrl = docs[i]['pndsterms.thumbnail'];
              itemTitle = docs[i]['dc.title'][0];
              break;
            };
          };
        };
        //pack return values into an object
        var returnObj = {
          'title':itemTitle,
          'imageUrl': imageUrl
        }
        cb(keyword, returnObj);
      });//end async request call to GET
    }
  ], function(keyword, returnObj){
    var params = returnObj[0]//async returns params back inside an array object
    req.formvalue = keyword
    req.itemTitle = params.title;
    req.returnedImgUrl = params.imageUrl;
    render_form_page(req, res);
  });    
};

//create FB authentication and retrieve user's likes to page
function facebook_login(req, res){


  show_login(req, res);
}

//heroku default app, controller code
//prompt user to log in, 
function handle_facebook_request(req, res) {

  // if the user is logged in
  if (req.facebook.token) {
    console.log("TOKEN: ", req.facebook.token);
    //this user token is defnitely valid
    async.parallel([
      function(cb) {
        console.log("*ASYNC GET FUNC - making calls to graph, calling facebook me")
        // query 4 friends and send them to the socket for this socket id
        req.facebook.get('/me/friends', { limit: 4 }, function(friends) {
          //this is null and user is null, suspect me is null although token recognises me
          console.log("*INSIDE ASYNC CALLBACK - currently null \n", "friends: ", friends);
          req.friends = friends;
          cb();
        });
      }
      ,
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
      console.log("ASYNC RETURNED")
      render_page(req, res);
    });

  } else {
    //the page renders to begin with, calls the first handshake and then fails.
    console.log("RENDER FIRST TIME"); 
    render_page(req, res);
  }
}

//controller to present culturegrid item from likes
function show_me_culture(req, res){
  //console.log("token>?", req.facebook.token)
  if (req.facebook.token) {
    async.parallel([
      function(cb) {
   
        
        // query 4 likes and send them to the socket for this socket id
        req.facebook.get('/me/likes', { limit: 20 }, function(likes, newLikes) {
          req.likes = likes;
          //console.log("likes cb returned in async", likes, newLikes)
          cb(newLikes);
    
        })
      }
    ], function(likes) {
      //console.log("likes cb returned", likes.data)
      req.likes = likes;
      req.firstLike = likes.data[0].name;
      
      var likesObj = likes.data
      //console.log("LIKES ", likesObj, likesObj.length)
      var keywords = [];
      var words = [];
      //loop through every name item in likes returned
      for (var i = likesObj.length - 1; i >= 0; i--) {
        //split search terms into single word
        words = likesObj[i].name.split(/\W+/);
        //console.log("WORDS: ", words);
          for (var j = words.length - 1; j >= 0; j--) {
            if(words[j] !== " " && words[j] !== "s" && words[j] !== "a" && words[j] !== "the" && words[j] !== "and" && words[j] !== "The"){
              keywords.push(words[j]);
            }
            
          };
        words = "";  
      };
      
      //console.log(keywords, keywords.length)
      var randomIndex = Math.round(Math.random()*keywords.length)   
            //add randomisation in here

      var randomPhrase = keywords[randomIndex-1];

      //console.log("RANDOM LIKE", randomPhrase, randomIndex);
      req.randomLike = randomPhrase;

      async.parallel([
        function(cb) {
          var keyword = randomPhrase;
          if(typeof keyword === 'undefined'){
            keyword = "sample"; //default value
          };
          console.log("KEYWORD....", keyword);
          var filter = "pndsterms.thumbnail:[* TO *]";
          var url = encodeURI('http://www.culturegrid.org.uk/index/select/?q=' + keyword + '&wt=json&fq='+filter);
          //console.log("URL....", url);
          request(url, function (error, response, body) {
            if (!error && response.statusCode == 200) {
              var imageUrl = "";
              var sorryMsg = "";
              var itemTitle = "";
              var docs = JSON.parse(body).response.docs;
              var docsLength = docs.length;

              //for each item in array test for pndsterms.thumbnail
              for (var i = docsLength - 1; i >= 0; i--) {
                if(docs[i]['pndsterms.thumbnail']){
                  imageUrl = docs[i]['pndsterms.thumbnail'];
                  itemTitle = docs[i]['dc.title'][0];
                  break;
                };
              };
            };
            console.log('culturegrid returned successfully', itemTitle)
            if(docsLength === 0){
              console.log("nothing returned")
            }


                      //basic post 

                    var data = qs.stringify({
                    access_token: req.facebook.token,
                    message: "hello dolly!"
                    });

                        var options = {
                            host: 'graph.facebook.com',
                            port: 443,
                        path: '/me/feed',
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Content-Length': data.length
                        }
                    };


                    console.log(data, options)
                    var postreq = https.request(options, function(res) {
                        res.setEncoding('utf8');
                        res.on('data', function (chunk) {
                            console.log("body: " + chunk);
                        });
                        res.on('end', function(){ // see http nodejs documentation to see end
                            console.log("\nfinished posting message");
                            conObj.approval = 'published';
                            conObj.save();
                        });
                    });
                    postreq.on('error', function(e) {
                        console.error(e);
                    });
                    postreq.write(data);
                    postreq.end();














//async post not working
            // //post a wall item?
            // async.parallel([
            //   function(cb) {


            //     var data = {
            //       message: "this is a test post"
            //     }

            //     //var messageStr = qs.stringify(data)
            //     var messageStr = "this is a test post";
            //    //doesn't seem to do anything??
            //     var options = {

            //       url:'http://graph.facebook.com/me/feed?access_token='+req.facebook.token+'&body='+messageStr, 
            //       method: 'POST', 
            //       headers: {
            //           'Content-Type': 'application/x-www-form-urlencoded',
            //           'Content-Length': data.length
            //       }
            //     }
            //     request.post(options, function(){
            //       console.log("posted to wall?")
            //     } )
                   

            //   }
            // ],function(){
            //   //call back function which fires
            //    console.log("async wall post completed action?")
            // })

            //pack return values into an object
            var returnObj = {
              'title':itemTitle,
              'imageUrl': imageUrl
            }
            cb(keyword, returnObj);
          });//end async request call to GET
        }
      ], function(keyword, returnObj){
        var params = returnObj[0]//async returns params back inside an array object
        req.formvalue = keyword
        req.itemTitle = params.title;
        req.returnedImgUrl = params.imageUrl;
        render_culture_page(req, res);
      });
    });
  } else {
    //the page renders to begin with, calls the first handshake and then fails. 
    render_culture_page(req, res);
  }
}

//routing
app.get('/', show_page);
app.get('/culturequery', display_keyword_form);
app.post('/culturequery', display_keyword_form);
app.get('/facebooklogin', facebook_login);
app.get('/herokuauth', handle_facebook_request);
app.get('/cultureme', show_me_culture);