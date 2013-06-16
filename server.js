var async   = require('async');
var express = require('express');
var request = require('request');

// create an express webserver

var app = express.createServer(
  express.logger(),
  express.static(__dirname + '/public'),
  express.bodyParser(),
  express.cookieParser()
);

// listen to the PORT given to us in the environment
var port = process.env.PORT || 3000;

app.listen(port, function() {
  console.log("New web server Listening on " + port);
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

//routing
app.get('/', show_page);
app.get('/culturequery', display_keyword_form);
app.post('/culturequery', display_keyword_form);
app.get('/facebooklogin', facebook_login);