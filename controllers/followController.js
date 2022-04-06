const Follow = require('../models/Follow')
 
 exports.addFollow = function(req,res){
     //username trying to follow, rew.params.username
     //current visitor: req.visitorId
    let follow = new Follow(req.params.username, req.visitorId)
    //new db thing that says x follows y
    follow.create().then(()=>{
        req.flash("success", `Successfully followed ${req.params.username}`)
        //redirect back to that users profile after saving
        req.session.save(() => res.redirect(`/profile/${req.params.username}`))
    }).catch(()=>{
        errors.forEach(error =>{
            req.flash("errors", error)
       })
       req.session.save(()=> res.redirect('/'))
    })
 }

 exports.removeFollow = function(req, res) {
    let follow = new Follow(req.params.username, req.visitorId)
    follow.delete().then(() => {
      req.flash("success", `Successfully stopped following ${req.params.username}`)
      req.session.save(() => res.redirect(`/profile/${req.params.username}`))
    }).catch((errors) => {
      errors.forEach(error => {
        req.flash("errors", error)
      })
      req.session.save(() => res.redirect('/'))
    })
  }