//import require our user model
//move up one folder out of the controllers folder
const User = require('../models/User')
//export multiple funtions that could be accessed from another js file
//modeule.exprot = whatever you want, that will return when require in another file
const Post = require('../models/Post')
const Follow = require('../models/Follow')
const jwt = require('jsonwebtoken')

exports.apiGetPostsByUsername = async function(req,res){
    try{
        let authorDoc = await User.findByUsername(req.params.username)
        let posts = await Post.findByAuthorId(authorDoc._id)
        res.json(posts)
    }catch{
        res.json("Sorry, invalid user requested.")
    }
}

exports.doesEmailExist = async function(req,res){
    //leverage user model.. make a findbyemail method? noooo just creat does email exist and return t/f
    let emailBool = await User.doesEmailExist(req.body.email)
    res.json(emailBool)
}

exports.doesUsernameExist = function(req, res){
    User.findByUsername(req.body.username).then(function(){
        res.json(true)
    }).catch(function(){
        res.json(false)
    })
}

exports.sharedProfileData = async function(req,res,next){
    //hide your own profiles
    let isVisitorsProfile = false
    //user visits profile.. we should know if current user is following
    let isFollowing = false
    //if current visitor is logged in
    if(req.session.user){
        isVisitorsProfile = req.profileUser._id.equals(req.session.user._id)
        //1 id of cureent prfile req.profileUser._id
        //2 current visitor id req.visitorId
        isFollowing = await Follow.isVisitorFollowing(req.profileUser._id,req.visitorId)
    }

    req.isVisitorsProfile = isVisitorsProfile
    //storing the answer from the if branch in the request
    req.isFollowing = isFollowing

    //retrieve post,follower,following counts
    //how many post surrent user has created
    let postCountPromise = Post.countPostsByAuthor(req.profileUser._id)
    let followerCountPromise = Follow.countFollowersById(req.profileUser._id)
    let followingCountPromise = Follow.countFollowingById(req.profileUser._id)
    let [postCount,followerCount,followingCount] = await Promise.all([postCountPromise, followerCountPromise, followingCountPromise])
    req.postCount = postCount
    req.followerCount = followerCount
    req.followingCount = followingCount

    next()
}

exports.login = function(req,res){
    //use our user model to create a new user object
                       //data user just submitted
    let user = new User(req.body)
    //look inside user object to call a method login
    //remember the model (not the controller) should handle our bussiness logic and managing all our data
    //model will look up username and password
    //.login will return a promise .then succes .catch for failure
    user.login().then(function(result){
        //if correct password log them in "SESSIONS"
        //each req now has a unique session variable
        req.session.user = {avatar: user.avatar, username: user.data.username, _id:user.data._id}
        //****^^^our server will remember session data
        //we cannot just redirect
        //b/c when dealing with a db we dont know how long this take
        //so first we do this, w callback in save
        req.session.save(function(){
            res.redirect('/')
        })

    }).catch(function(e){
        //leverage flash package
        req.flash('errors', e)
            //^^outputs: req.session.flash.errors = [e] invalid username+pass
        //res.redirect('/'), instead...
        req.session.save(function(){
            res.redirect('/')
        })

    })
}

exports.apiLogin = function(req,res){
    let user = new User(req.body)
    user.login().then(function(result){
        //if success
        //1 any data we want to store in this.. we just need user id
        //2secret string of characterss
        //object of options 30m 30h 30d
        res.json(jwt.sign({_id: user.data._id}, process.env.JWTSECRET, {expiresIn: '30m'}))
    }).catch(function(e){
        res.json("incorrect username + pass")
    })
}

exports.logout = function(req,res){
    req.session.destroy(function(){
        res.redirect('/')
    })
    
}
exports.register = function(req,res){
    //we CANNOT trust users to enter valid data.. eg blank fields, password length, valid email, no strange
    //characters in username, username and email should be unique
    //^^^this is called business logic and data modeling
    //test console.log(req.body)
    //user.homePlanet
    //equal to a new instance of User
    let user = new User(req.body)
    user.register().then(()=>{
        req.session.user = {username: user.data.username, avatar: user.avater, _id:user.data._id}
        //because we are db accessing.. we want to save first
        req.session.save(function(){
            res.redirect('/')
        })
    }).catch((regErrors)=>{
        regErrors.forEach(function(error){
            req.flash('regErrors', error)
        })
        //because we are db accessing.. we want to save first
        req.session.save(function(){
            res.redirect('/')
        })
        
    })
   

}
exports.mustBeLoggedIn = function(req,res,next){
    if(req.session.user){
        next()
    }else{
        req.flash("errors", "You must be logged in to perform that action")
        req.session.save(function(){
            res.redirect('/')
        })
    }
}

exports.apiMustBeLoggedIn = function(req,res,next){
    try{
        //if its valid
        //check token authenticity and jwt seret phrase
        req.apiUser = jwt.verify(req.body.token, process.env.JWTSECRET)
        //in the next function for this route.. we can access req.apiUser
        //look in router next is postController.apiCreate
        next()
    }catch{
        //fake token
        res.json("Sorry, you must provide a valid token")
    }
}

exports.home = async function(req,res){
    if(req.session.user){
        //fetch feed of post for current user. (current logged in user id)
        let posts = await Post.getFeed(req.session.user._id)

        //now the real application with user logged in
        res.render('home-dashboard', {posts: posts})
        //{username: req.session.user.username, avatar: req.session.user.avatar}
        //res.send("welcome to the main app")
    }
    else{
        res.render('home-guest', {regErrors: req.flash('regErrors')})
    }
}

exports.ifUserExists = function(req, res, next) {
    User.findByUsername(req.params.username).then(function(userDocument) {
      req.profileUser = userDocument
      next()
    }).catch(function() {
      res.render("404")
    })
  }

  
  exports.profilePostsScreen = function(req, res) {
    // ask our post model for posts by a certain author id
    Post.findByAuthorId(req.profileUser._id).then(function(posts) {
      res.render('profile', {
        title: `Profile for ${req.profileUser.username}`,
        currentPage: "posts",
        posts: posts,
        profileUsername: req.profileUser.username,
        profileAvatar: req.profileUser.avatar,
        isFollowing: req.isFollowing,
        isVisitorsProfile: req.isVisitorsProfile,
        counts: {postCount: req.postCount, followerCount: req.followerCount, followingCount: req.followingCount}
      })
    }).catch(function() {
      res.render("404")
    })
}

exports.profileFollowersScreen = async function(req,res){
    try{
        //array of users following the current user
        let followers = await Follow.getFollowersById(req.profileUser._id)
        res.render('profile-followers', {
        currentPage: "followers",
        followers: followers,
        profileUsername: req.profileUser.username,
        profileAvatar: req.profileUser.avatar,
        isFollowing: req.isFollowing,
        isVisitorsProfile: req.isVisitorsProfile,
        counts: {postCount: req.postCount, followerCount: req.followerCount, followingCount: req.followingCount}
    })
    }catch{
        res.render('404')
    }
}

exports.profileFollowingScreen = async function(req,res){
    try{
        //array of users following the current user
        let following = await Follow.getFollowingById(req.profileUser._id)
            res.render('profile-following', {
            currentPage: "following",
            following: following,
            profileUsername: req.profileUser.username,
            profileAvatar: req.profileUser.avatar,
            isFollowing: req.isFollowing,
            isVisitorsProfile: req.isVisitorsProfile,
            counts: {postCount: req.postCount, followerCount: req.followerCount, followingCount: req.followingCount}
    })
    }catch{
        res.render('404')
    }
}