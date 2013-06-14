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

function display_keyword_form(req, res) {

  var keyword = "sample"; //default value
  keyword = req.body['keyword'];

  var url = 'http://www.culturegrid.org.uk/index/select/?q=' + keyword + '&wt=json&fq=pndsterms.thumbnail:[* TO *]'

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
       }
    };

    // if(imageUrl === ""){
    //   sorryMsg = "No items with image thumbnail found. Please try another search term";
    // }
    renderPageAgain(itemTitle, imageUrl);
  }
})


  function renderPageAgain(title, image){
    //console.log("outside", title, image)
    req.formvalue = req.body['keyword'];
    req.itemTitle = title;
    req.returnedImgUrl = image;
    render_form_page(req, res);
  }
  //renderPageAgain("this", "this", "this")
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

app.get('/', show_page);
app.get('/culturequery', display_keyword_form);
app.post('/culturequery', display_keyword_form);