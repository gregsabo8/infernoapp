//hash password
const bcrypt = require("bcryptjs")
//call in module.exports
const usersCollection = require('../db').db().collection("users")
const { ConnectionClosedEvent } = require('mongodb');
const validator = require("validator")
const md5 = require('md5')

//constructor...reusable blueprint that is used to create a user object
let User = function(data, getAvatar){
    //home planet = earth
    //this - keyword that points towards whatever is calling OR EXECUTING the current function
    // this.homePlanter = 'earth'

//create property to store that form data(store on the left property)
    this.data = data;
    //empty, but will have items pushed onto it
    this.errors = []

    if(getAvatar == undefined){getAvatar = false}
    if(getAvatar){this.getAvatar()}
}

//for step 1 below
User.prototype.validate = function(){
    return new Promise(async (resolve,reject) =>{
        //list of several if statement for validation
        if(this.data.username == ''){this.errors.push("you must provide a username!!")}
        if(this.data.username != "" && !validator.isAlphanumeric(this.data.username)){this.errors.push("username must be characters or numbers ONLY")}
        if(!validator.isEmail(this.data.email)){this.errors.push("you must provide a valid email!!")}
        if(this.data.password == ''){this.errors.push("you must provide a password!!")}
        if(this.data.password.length >0 && this.data.password.length <6){this.errors.push("password must be at least 6 character")}
        if(this.data.password.length >50){this.errors.push("password must be less than 50 characters")}
        if(this.data.username.length >0 && this.data.username.length <3){this.errors.push("username must be at least 3 character")}
        if(this.data.username.length >20){this.errors.push("username must be less than 20")}
    
        //only if username is valid then check if its already taken
        if(this.data.username.length > 2 && this.data.username.length <21 && validator.isAlphanumeric(this.data.username)){
            let usernameExists = await usersCollection.findOne({username: this.data.username})
            if(usernameExists){this.errors.push("That username is already taken")}
        }
        //email
        if(validator.isEmail(this.data.email)){
            let emailExists = await usersCollection.findOne({email: this.data.email})
            if(emailExists){this.errors.push("That email is already taken")}
        }
        resolve()
    })
}
User.prototype.cleanUp = function(){
    if(typeof(this.data.username)!= "string"){this.data.username=""}
    if(typeof(this.data.email)!= "string"){this.data.email=""}
    if(typeof(this.data.password)!= "string"){this.data.password=""}

    //get rid of any bogus properties
    this.data = {
        username: this.data.username.trim().toLowerCase(),
        email: this.data.email.trim().toLowerCase(),
        password: this.data.password
    }
}

//declare a function for all instances but more effcient putting it here than in the function above
//User.prototype.jump = function(){}
User.prototype.register = function(){
    return new Promise( async (resolve,reject) =>{
        //step 1: validate email, password, username
        this.cleanUp();
        await this.validate();
        //step 2:only if there are no validation errors, then save user data into database
        //validation error. if it doesnt exist proceed
        if(!this.errors.length){
            //hash password using bcrypt
            let salt =bcrypt.genSaltSync(10)
                                        //what to hash, salt value
            this.data.password = bcrypt.hashSync(this.data.password,salt)
    
            //add a doc into the db collection. b/c we did validation we knows its safe now
            //to put it into db
            await usersCollection.insertOne(this.data)
            this.getAvatar()
            resolve()
        }else{
            reject(this.errors)
        }
    }
    )
}
User.prototype.login = function(){
    return new Promise((resolve,reject) =>{
        //ensure values are stings of text
        this.cleanUp()
        //now, look in our database for matching username
        usersCollection.findOne({username:this.data.username}).then((attemptedUser)=>{
            if(attemptedUser && bcrypt.compareSync(this.data.password, attemptedUser.password)){
                this.data = attemptedUser
                this.getAvatar()
                resolve("congrats")
            }else{
                reject("Invalid Username and Password")
            }
        }).catch(function(){
            reject("Please try again later")
        })
    })

}
User.prototype.getAvatar = function(){
    this.avatar = `https://gravatar.com/avatar/${md5(this.data.email)}?s=128`
}

User.findByUsername = function(username) {
    return new Promise(function(resolve, reject) {
      if (typeof(username) != "string") {
        reject()
        return
      }
      usersCollection.findOne({username: username}).then(function(userDoc) {
        if (userDoc) {
          userDoc = new User(userDoc, true)
          userDoc = {
            _id: userDoc.data._id,
            username: userDoc.data.username,
            avatar: userDoc.avatar
          }
          resolve(userDoc)
        } else {
          reject()
        }
      }).catch(function() {
        reject()
      })
    })
  }


User.doesEmailExist = function(email){
    return new Promise(async function(resolve,reject){
        if(typeof(email) != "string"){
            resolve(false)
            return
        }

        //check within db if email exist
        let user = await usersCollection.findOne({email: email})

        if(user){
            //true found user
            resolve(true)
        }else{
            resolve(false)

        }
    })
}
module.exports = User