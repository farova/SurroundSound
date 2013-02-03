
/*
 * GET home page.
 */

var databaseConfig = require("../models/DatabaseConfig.js");
var database = require("../models/DatabaseFunctions.js");
var mongoose = require('mongoose');
var Lounge = mongoose.model("Lounge");
var User = mongoose.model("User");
var gcmHelpers = require("../gcmHelpers.js");
var randomstring = require("randomstring");
var cheerio = require('cheerio');
var async = require('async');
var request = require('request');

exports.index = function(req, res){
  res.render('dj', { title: 'DJ Stuff' });
};

exports.login = function(req, res) {
  res.render('login', { title: 'Login' });
};

exports.register = function(req, res) {
  res.render('register', { title: 'Register' });
};

exports.createUser = function(req, res) {
	if (req.body.password == req.body.confirmpassword) {
		var user = database.newUser({username: req.body.username, password: req.body.password, email: req.body.email});
		database.newLounge(user);
		req.login(user, function(err) {
			if (err) return next(err); 
			return res.redirect('/createLounge');
		});
	} else {
		res.send(400);
	}
	
};


exports.dj = function(req,res) {
	var User = mongoose.model("User");
	var user = User.update({name: req.user.name}, {active: true});
	Lounge.update({user: user.id}, {active: true});
	res.render('dj', { title: 'DJ' });
};

exports.postArtists = function(req, res){
	database.importData(req.body.artists, req.body.id, req.body.genId);
	res.send("success");
};

exports.newLounge = function(req, res){
  res.render('new_lounge', { title: 'Create your Sound Lounge'});
};

exports.createLounge = function(req, res){
	User.find({name: req.user.name}, function(err, user) {
		database.newLounge({user: req.user.id, name: req.body.name, geolocation: req.body.geolocation, loungePassword: req.body.password});
		res.redirect("/dj");
	});
};
exports.updateLounge = function(req, res) {
	Lounge.update({user: req.user.id}, req.body);
}
exports.getLounge = function(req, res){	
	 Lounge.findById(req.body.id, function(err, lounge) {
	 	res.send(lounge);
	 });
};

exports.queryLounges = function(req, res) {
	database.queryLounges(req.body.geo, res);
	//res.send(lounges);\ \\
}

exports.requestSong = function(req, res) {
	Lounge.findById(req.body.id, function(err, lounge) {
		lounge.requested.push([req.body.song, req.body.artist]);
		res.send("success");
	})
}
exports.vote = function(req, res) {
	if (req.body.vote == "up")
		database.likeArtist(req.id, req.artist)
	else if (req.body.vote == "down")
		database.dislikeArtist(req.id, req.artist)
}

exports.registerGCM = function(req, res) {
	var deviceModel = mongoose.model('Device');
	console.log("received", req.genId, " ", req.regId);
	if (req.body['genId'] != "") {
		deviceModel.update({devId: req.body['genId']}, {regId: req.body['regId']});
		gcmHelpers.sendId(req.body['genId'], [req.body['regId']]);
		//res.send(req.body['devId'])
	} else {
		var newId = randomstring.generate();
		var newDevice = new deviceModel({genId: newId, regId: req.body['regId']});
		newDevice.save();
		gcmHelpers.sendId(newId, [req.body['regId']]);
		//res.send(newId);
	}
	//if (typeof res.body != 'undefined' && res.body){
	//}
		
	res.send('sup');
}

function getYouTubeUrl(song, callback){ 
  var query = song.artist + " " + song.song;
  request("http://www.youtube.com/results?search_query=" + encodeURIComponent(query), function(err, req, body){
    if(!err) {
      var $ = cheerio.load(body)
        , link = $('#search-results a[href^="/watch"]');

      if(link.length > 0) {
        song.url = "http://youtube.com" + link.attr('href');
        callback(false, song);
      } else {
        callback("no link found", song);
      }
    } else {
      console.log("Error getting youtube search result for " + song.song + ":" + err);
      callback(err, song);
    }
  })
}

exports.nextSong = function(req, res) {
	var songs = Lounge.find({user: req.user.id}, function(err, lounge) {
		database.nextSong(req.user.id, res);
	})

  async.forEach(songs, getYouTubeUrl, function(err){
    if(err)
      console.log("For each error: " + err);

    res.send(songs);
  });
};
