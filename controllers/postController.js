const Post = require('../models/Post')

exports.viewCreateScreen = function(req,res){
    res.render('create-post')
}

exports.create = function(req,res){
    //store whatever value user typed, and store this in a data base
    //remember data management should be done in model
    //leverage post blueprint
    let post = new Post(req.body, req.session.user._id)
    post.create().then(function(newId){
        //redirect user to new url with this post
        //flash success message
        // res.send("New post created.")
        req.flash("success", "New post successfully created.")
        //the id wont exist til the db operation completes
        req.session.save(()=> res.redirect(`/post/${newId}`))
    }).catch(function(errors){
        //validation errors errors = array of validation errors
        errors.forEach(error => req.flash("errors", error))
        req.session.save(() => res.redirect("/create-post"))
    })
}

exports.apiCreate = function(req,res){
    let post = new Post(req.body, req.apiUser._id)
    post.create().then(function(newId){
        //if post successfully created
        res.send("congrats!")
    }).catch(function(errors){
        res.json(errors)
    })
}

exports.viewSingle = async function(req,res){
    try{
        let post = await Post.findSingleById(req.params.id, req.visitorId)
        res.render('single-post-screen',{post:post, title:post.title})
    }catch {
        res.render('404')
    }
}

exports.viewEditScreen = async function(req, res) {
    try {
      let post = await Post.findSingleById(req.params.id, req.visitorId)
      if (post.isVisitorOwner) {
        res.render("edit-post", {post: post})
      } else {
        req.flash("errors", "You do not have permission to perform that action.")
        req.session.save(() => res.redirect("/"))
      }
    } catch {
      res.render("404")
    }
  }

exports.edit = function(req,res){
    let post = new Post(req.body, req.visitorId, req.params.id)
    //set this up to return a promise
    post.update().then((status)=>{
        //post was successfully updated into the database
        //validation error possible (eg: missing title)
        if(status =="success"){
            //post was updated in db. return to edit page and show gree flash message
            req.flash("success", "Post successfully updated.")
            req.session.save(function(){
                res.redirect(`/post/${req.params.id}/edit`)
            })
        }else{
            //fail. try again! with red flash message
            post.errors.forEach(function(error){
                req.flash("errors", error)
            })
            req.session.save(function(){
                res.redirect(`/post/${req.params.id}/edit`)
            })
        }
    }).catch(()=>{
        //if a post with requested id does not exist
        //or if the current visitor is not the owner of the requested post
        req.flash("errors", "You do not have permission to perform that action.")
        req.session.save(function(){
            res.redirect("/")
        })
    })
}

exports.delete = function(req,res){
    //lets look inside our model so upercase post
    //call a method names delete
    //this wil return a promise
    //what data do we want to pass into delete - 
    //1id of the post we want to delete -req.params.id
    //2 id of the current user that is trying to perform this action - req.visitorID
    Post.delete(req.params.id, req.visitorId).then(()=>{
        req.flash("success", "Post successfully deleted")
        //manually save our session w arrow function then redirect
        ///profile/currentusername
        req.session.save(()=>{res.redirect(`/profile/${req.session.user.username}`)})
    }).catch(()=>{
        //for rejection
        req.flash("errors", "You do not have permission to perform that action")
        req.session.save(()=> res.redirect("/"))
    })
}

exports.apiDelete = function(req,res){
    //apiUser from apiMustBeloggerIn metho
    //post.delete take care of validation,permission and bussiness logic
    Post.delete(req.params.id, req.apiUser._id).then(()=>{
        res.json('success')
    }).catch(()=>{
        res.json("You do not have permission to perform that action")
    })
}

exports.search = function(req,res){
    Post.search(req.body.searchTerm).then(posts=>{
        res.json(posts)
    }).catch(()=>{
        res.json([])
    })
}