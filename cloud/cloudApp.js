var Recipe = Parse.Object.extend("Recipe");

// These two lines are required to initialize Express.
var _ = require('underscore');
var express = require('express');
var cloudApp = express();

// Global cloudApp configuration section
cloudApp.set('views', 'cloud/views');  // Specify the folder to find templates
cloudApp.set('view engine', 'ejs');    // Set the template engine
cloudApp.use(express.bodyParser());    // Middleware for reading request body

// This is an example of hooking up a request handler with a specific request
// path and HTTP verb using the Express routing API.

function decodeFragment(escaped_fragment) {
	var match,
        pl     = /\+/g,  // Regex for replacing addition symbol with a space
        search = /([^&=]+)=?([^&]*)/g,
        decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
        query  = escaped_fragment;

    urlParams = {};
    while (match = search.exec(query))
       urlParams[decode(match[1])] = decode(match[2]);	

   return urlParams;
}

cloudApp.get('/recipe', function(req, res) {

	if (req.param("_escaped_fragment_")) {
		params = decodeFragment(req.param("_escaped_fragment_"));
		recipeId = params.id;
	}
	else {
		recipeId = req.param("id");
		res.sendfile('public/index.html')
		return;
	}

	// console.log(req);
	var rQuery = new Parse.Query(Recipe);
	// rQuery.equalTo('objectId',req.param("id"));
	// include
	rQuery.include('labels');
	rQuery.include('user');
	rQuery.include('originalWriter');
	rQuery.get(recipeId).then(function(recipe){
		res.render('recipe', { 
			id       : recipeId,
			keywords : recipe.get('searchMask').join(','),
			user     : recipe.get('user').toJSON(),
			recipe   : recipe.toJSON()
	  	});
	})

});

// This line is required to make Express respond to http requests.
cloudApp.listen();