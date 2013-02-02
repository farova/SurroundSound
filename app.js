
/**
 * Module dependencies.
 */
var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , mongoose = require('mongoose');

mongoose.connect(process.env.MONGOHQ_URL);

var database = require('./models/DatabaseConfig');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  console.log("We've opened the floor gates to DATA");
});

var app = express();

passport.use(new LocalStrategy(
  function(username, password, done) {
    mongoose.model('User').findOne({ name: username, pass: password}, function (err, user) {
      if (err) { return done(err); }
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      if (!user.validPassword(password)) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      return done(null, user);
    });
  }
));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  mongoose.model('User').findById(id, function(err, user) {
    done(err, user);
  });
});

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.session({ secret: 'keyboard cat' }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

var ensureAuthenticated = function(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}

app.get('/users', user.list);
app.get('/login', routes.login);
app.get('/dj', function(req, res) {
  var req = req;
  var res = res;
  mongoose.model('User').findOne({name: req.user.name}, function(err, user) {
    mongoose.model('Lounge').findOne({user: user}, function(err, lounge) {
      if (lounge) {
        routes.dj;
      }
      else {
        routes.createLounge;
      }
    })
  })
});
app.get('/register', routes.register);
app.get('/', ensureAuthenticated, routes.index );
app.post('/login', passport.authenticate('local', {successRedirect: '/dj', failureRedirect: '/login'}));
app.post('/postArtists', routes.postArtists);
app.post('/register', routes.createUser);
app.post('/queryLounges', routes.queryLounges)

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
