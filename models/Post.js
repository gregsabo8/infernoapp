const postsCollection = require('../db').db().collection("posts")
const followsCollection = require('../db').db().collection("follows")
const ObjectID = require('mongodb').ObjectID
const User = require('./User')
const sanitizeHTML = require('sanitize-html')

let Post = function(data, userid, requestedPostId){
    this.data = data
    this.errors = []
    this.userid = userid
    this.requestedPostId = requestedPostId
}

Post.prototype.cleanUp = function() {
    //title + body are strings not array/objects
    if(typeof(this.data.title) != "string"){this.data.title = ""}
    if(typeof(this.data.body) != "string"){this.data.body = ""}

    //make sure no extra properties
    this.data = {
        //keep **bold *it ic #h1 ##h2 -list
        title: sanitizeHTML(this.data.title.trim(), {allowedTags: [], allowedAttributes: {}}),
        body: sanitizeHTML(this.data.body.trim(), {allowedTags: [], allowedAttributes: {}}),
        createdDate: new Date(),
        author: ObjectID(this.userid)
    }
}

Post.prototype.validate = function(){
    if(this.data.title == ""){this.errors.push("You must provide a title")}
    if(this.data.body == ""){this.errors.push("You must provide post content")}
}

Post.prototype.create = function(){
    return new Promise((resolve,reject)=>{
        this.cleanUp()
        this.validate()
        //check to see error array
        if(!this.errors.length){
            //if empty, store post into database
            postsCollection.insertOne(this.data).then((info) =>{
                resolve(info.insertedId)
            }).catch(()=>{
                this.errors.push("please try again later")
                reject(this.errors)
            })
        }else {
            reject(this.errors)
        }
    })
}

Post.prototype.update = function(){
  return new Promise(async(resolve, reject) => {
    try{
      //this post returns a promise
      let post = await Post.findSingleById(this.requestedPostId, this.userid)
      if(post.isVisitorOwner){
        //actually update db
        let status = await this.actuallyUpdate()
        resolve(status)
      }else{
        reject()
      }
    }catch{
      reject()
    }
  })
}

Post.prototype.actuallyUpdate = function(){
  return new Promise(async (resolve, reject) => {
    this.cleanUp
    this.validate()
    if(!this.errors.length){
      //no error update db
      await postsCollection.findOneAndUpdate({_id: new ObjectID(this.requestedPostId)},{$set: {title: this.data.title, body: this.data.body}})
      resolve("success")
    }else{
      resolve("failure")
    }
  })
}

Post.reusablePostQuery = function(uniqueOperations, visitorId, finalOperation =[]) {
  return new Promise(async function(resolve, reject) {
    let aggOperations = uniqueOperations.concat([
      {$lookup: {from: "users", localField: "author", foreignField: "_id", as: "authorDocument"}},
      {$project: {
        title: 1,
        body: 1,
        createdDate: 1,
        authorId: "$author",
        author: {$arrayElemAt: ["$authorDocument", 0]}
      }}
    ]).concat(finalOperation)

    let posts = await postsCollection.aggregate(aggOperations).toArray()

    // clean up author property in each post object
    //using mapp to loop through all post
    posts = posts.map(function(post) {
      //we need to pull in the author id... return true/false
      post.isVisitorOwner = post.authorId.equals(visitorId)
      //hide this attribute
      post.authorId = undefined

      post.author = {
        username: post.author.username,
        avatar: new User(post.author, true).avatar
      }

      return post
    })

    resolve(posts)
  })
}

Post.findSingleById = function(id,visitorId) {
  return new Promise(async function(resolve, reject) {
    if (typeof(id) != "string" || !ObjectID.isValid(id)) {
      reject()
      return
    }
    
    let posts = await Post.reusablePostQuery([
      {$match: {_id: new ObjectID(id)}}
    ], visitorId)

    if (posts.length) {
      // console.log(posts[0])
      resolve(posts[0])
    } else {
      reject()
    }
  })
}

Post.findByAuthorId = function(authorId) {
  return Post.reusablePostQuery([
    {$match: {author: authorId}},
    {$sort: {createdDate: -1}}
  ])
}

Post.delete = function(postIdToDelete, currentUserId){
  return new Promise(async (resolve,reject)=>{
    try{
      let post = await Post.findSingleById(postIdToDelete, currentUserId)
      if(post.isVisitorOwner){
        //actually delete by using our object that represent our mongodb post collection
        await postsCollection.deleteOne({_id: new ObjectID(postIdToDelete)})
        resolve()
      }else{
        //if malicious users are trying something (eg delete a post they don't own)
        reject()
      }
    }catch{
      //if post id is invalid or doesnt exist
      reject()
    }
  })
}

Post.search = function(searchTerm){
  return new Promise(async(resolve,reject)=>{
    //make sure this incoming search term is a string of text
    if(typeof(searchTerm) == "string"){
      //an array of aggregate operations
      let posts = await Post.reusablePostQuery([
        {$match: {$text: {$search: searchTerm}}}
      ], undefined, [{$sort: {$score: {$meta: "textScore"}}}])
      resolve(posts)
    }else{
      reject()
    }
  })
}

Post.countPostsByAuthor = function(id){
  return new Promise(async (resolve,reject)=>{
    //mongodb method that returns a promise
    let postCount = postsCollection.countDocuments({author: id})
    resolve(postCount)
  })
}

//receive incoming id
Post.getFeed = async function(id){
  //1.create array of the user ids that the current user follows
    //look directly in the follows collection from within this post model
      //if we were modifying it would be different
  //create variable equal to follows colllection and look inside it for mongodb method find. then convert to array
  //whats inside find... follow document where the author id will match whats passed in
  //id thats passed in is just a string of text.... convert to mongodb id object type
  let followedUsers = await followsCollection.find({authorId: new ObjectID(id)}).toArray()
  //map will create a new array... will let us specify the value for each item in that array
  followedUsers = followedUsers.map(function(followDoc){
    return followDoc.followedId
  })

  //2. look for post where the author is in the above array of followed users
  //take array from above
  //return a collection of post
  return Post.reusablePostQuery([
    //find any post doc where the author value is a value that is within our followed users array
    {$match: {author: {$in: followedUsers}}},
    //sort so new post at top
    {$sort: {createdDate: -1}}
  ])
}

module.exports = Post