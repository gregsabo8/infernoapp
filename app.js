const express = require('express')
//require sessions
const session = require('express-session')
const MongoStore = require('connect-mongo')
const flash = require('connect-flash')
const csrf = require('csurf')
const app = express()
const markdown = require('marked')
const sanitizeHTML = require('sanitize-html')

//boilerplate for adding user submitted data onto our request object
app.use(express.urlencoded({extended:false}))
app.use(express.json())

//add all api routes here... dont want any sessio, csrf, templates
app.use('/api', require('./router-api'))

//session
//now add mongodb connect
let sessionOptions = session({
    //a few properties/options
    secret: "JavaScript is soooooo coooool",
    store: MongoStore.create({client: require('./db')}),
    resave: false,
    saveUninitialized: false,
    cookie: {MaxAge: 1000*60*60*24, httpOnly:true}
})

//tell express to use this^^
app.use(sessionOptions)
app.use(flash())

app.use(function(req,res,next){
    //make our markdown function available in ejs templates
    res.locals.filterUserHTML = function(content){
        return sanitizeHTML(markdown.parse(content), {allowedTags: ['p','br','ul','ol','li','strong','bold','i', 'em', 'h1','h2','h3','h4'], allowedAttributes: {}})
    }

    //make all error and success flash messages available
    res.locals.errors = req.flash("errors")
    res.locals.success = req.flash("success")
    
    //make current user id available on the req object
    if(req.session.user){req.visitorId = req.session.user._id}else {req.visitorId =0}

    //make user session data available within view templates
    res.locals.user = req.session.user
    next()
})

const router = require('./router')

app.use(express.static('public'))
app.set('views', 'views')
app.set('view engine', 'ejs')

//csurf
app.use(csrf())

//make csrf avaiable to our token
app.use(function(req,res,next){
    res.locals.csrfToken = req.csrfToken()
    next()
})

app.use('/',router)

app.use(function(err,req,res,next){
    if(err){
        if(err.code =="EBADCSRFTOKEN"){
            req.flash('errors', "Cross site request forgery detected")
            req.session.save(()=>res.redirect('/'))
        }else{
            res.render("404")
        }
    }
})

//chat sockets
//now we want the server to power socket connections
const server = require('http').createServer(app)

//add socket functionality
const io = require('socket.io')(server)

//boilerplate express session package integrate it with io package
io.use(function(socket, next){
    sessionOptions(socket.request, socket.request.res, next)
})

io.on('connection', function(socket){
    if(socket.request.session.user){
        //create a variable that will save us some typing
        let user = socket.request.session.user
        socket.emit('welcome',{username: user.username, avatar: user.avatar})


        // console.log("A new user connected")
    //1event type ...when server detects an event of this type
    //2 run 2
    socket.on('chatMessageFromBrowser', function(data){
        //^receiving \/sending out to all
        socket.broadcast.emit('chatMessageFromServer', {message: sanitizeHTML(data.message, {allowedTags: [], allowedAttributes: {}}), username: user.username, avatar: user.avatar})
    })
    }
})

module.exports = server