const usersCollection = require('../db').db().collection("users")
const followsCollection = require('../db').db().collection("follows")
const ObjectID = require('mongodb').ObjectID
const User = require('./User')

//username trying to follow, followedUsername
 //current visitor: authorId
let Follow = function(followedUsername, authorId){
    //constructor
    this.followedUsername = followedUsername
    this.authorId = authorId
    this.errors = []
}

Follow.prototype.cleanUp = function(){
    if(typeof(this.followedUsername) != "string"){this.followedUsername = ""}
}

Follow.prototype.validate = async function(action){
    //followedUsername must exist in db
    //talk to our db
    let followedAccount = await usersCollection.findOne({username: this.followedUsername})
    if(followedAccount){
        this.followedId = followedAccount._id
    }else{
        this.errors.push("You cannot follow a user that does not exist")
    }
    //create/delete
    doesFollowAlreadyExist = await followsCollection.findOne({followedId: this.followedId, authorId: new ObjectID(this.authorId)})
    if(action == "create"){
        if(doesFollowAlreadyExist){this.errors.push("You are already following this user")}
    }
    if(action == "delete"){
        if(!doesFollowAlreadyExist){this.errors.push("You cannot stop following someone you don't already follow")}
    }

    //cant follow yourself
    // if (this.followedId.equals(this.authorId)) {this.errors.push("You cannot follow yourself.")}
}   

//saving a follow in the db
Follow.prototype.create = function(){
    return new Promise(async (resolve,reject)=>{
        this.cleanUp()
        await this.validate("create")
        if(!this.errors.length){
            //if no errors-store follow data in db
            await followsCollection.insertOne({followedId: this.followedId, authorId: new ObjectID(this.authorId)})
            //promise is ready to resolve
            resolve()
        }else{
            reject(this.errors)
        }
    })
}

//deleting a follow in the db
Follow.prototype.delete = function(){
    return new Promise(async (resolve,reject)=>{
        this.cleanUp()
        await this.validate("delete")
        if(!this.errors.length){
            //if no errors-store follow data in db
            await followsCollection.deleteOne({followedId: this.followedId, authorId: new ObjectID(this.authorId)})
            //promise is ready to resolve
            resolve()
        }else{
            reject(this.errors)
        }
    })
}

//since its talking to db async
Follow.isVisitorFollowing = async function(followedId, visitorId){
    //find an existing document where the followed id matches the current profile im viewing
    //and author id matches the one im currently logged into
    let followDoc = await followsCollection.findOne({followedId: followedId, authorId: new ObjectID(visitorId)})
    if(followDoc){
        //if findone is able to find w matching conditions
        return true
    }else{
        return false
    }
}

Follow.getFollowersById = function(id){
    return new Promise(async(resolve,reject)=>{
        try{
            let followers = await followsCollection.aggregate([
                //followid matches what ever was passed in id field
                {$match: {followedId: id}},
                //now use author id to look up related user document grab username + email
                {$lookup: {from: "users", localField: "authorId", foreignField:"_id", as: "userDoc"}},
                {$project: {
                    //what will be in the object when it returns
                    //dont need author id or follow id
                    //just return username and email from matching user account
                    username: {$arrayElemAt: ["$userDoc.username", 0]},
                    email: {$arrayElemAt: ["$userDoc.email", 0]}
                }}
            ]).toArray()
            //we need the email for avatar
            followers = followers.map(function(follower){
                //create a user
                let user = new User(follower, true)
                return {username: follower.username, avatar: user.avatar}
            })
            resolve(followers)
        }catch{
            reject()
        }    
    })
}

Follow.getFollowingById = function(id){
    return new Promise(async(resolve,reject)=>{
        try{
            let followers = await followsCollection.aggregate([
                //followid matches what ever was passed in id field
                {$match: {authorId: id}},
                //now use author id to look up related user document grab username + email
                {$lookup: {from: "users", localField: "followedId", foreignField:"_id", as: "userDoc"}},
                {$project: {
                    //what will be in the object when it returns
                    //dont need author id or follow id
                    //just return username and email from matching user account
                    username: {$arrayElemAt: ["$userDoc.username", 0]},
                    email: {$arrayElemAt: ["$userDoc.email", 0]}
                }}
            ]).toArray()
            //we need the email for avatar
            followers = followers.map(function(follower){
                //create a user
                let user = new User(follower, true)
                return {username: follower.username, avatar: user.avatar}
            })
            resolve(followers)
        }catch{
            reject()
        }    
    })
}

Follow.countFollowingById = function(id){
    return new Promise(async (resolve,reject)=>{
      //mongodb method that returns a promise
      let count = followsCollection.countDocuments({authorId: id})
      resolve(count)
    })
  }  

  Follow.countFollowersById = function(id){
    return new Promise(async (resolve,reject)=>{
      //mongodb method that returns a promise
      let followerCount = followsCollection.countDocuments({followedId: id})
      resolve(followerCount)
    })
  }   

module.exports = Follow