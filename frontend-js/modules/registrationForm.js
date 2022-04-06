import axios from 'axios'

export default class RegistrationForm {
    constructor(){
        this._csrf = document.querySelector('[name="_csrf"]').value
        this.form = document.querySelector("#registration-form")
        //return array of elements
        this.allFields = document.querySelectorAll("#registration-form .form-control")
        this.insertValidationElements()
        //username
        this.username = document.querySelector("#username-register")
        this.username.previousValue = ""
        this.email = document.querySelector("#email-register")
        this.email.previousValue = ""
        this.password = document.querySelector("#password-register")
        this.password.previousValue = ""
        this.username.isUnique = false
        this.email.idUnique = false
        this.events()
    }

    //events
    events(){
        //listen for overall form being submitted
        this.form.addEventListener("submit", (e)=>{
            e.preventDefault()
            this.formSubmitHandler()
        })

        //use a general function for username email and pass fields
        this.username.addEventListener("keyup", ()=>{
            this.isDifferent(this.username, this.usernameHandler)
        })
        // alert("test regis") we know its working now
        //listen for email
        this.email.addEventListener("keyup", ()=>{
            this.isDifferent(this.email, this.emailHandler)
        })

        this.password.addEventListener("keyup", ()=>{
            this.isDifferent(this.password, this.passwordHandler)
        })

        
        this.username.addEventListener("blur", ()=>{
            this.isDifferent(this.username, this.usernameHandler)
        })
        this.email.addEventListener("blur", ()=>{
            this.isDifferent(this.email, this.emailHandler)
        })
        this.password.addEventListener("blur", ()=>{
            this.isDifferent(this.password, this.passwordHandler)
        })
    }

    //methods
    formSubmitHandler(){
        //what do we want to happen when a guest visits
        this.usernameImmediately()
        this.usernameAfterDelay()
        this.emailAfterDelay()
        this.passwordImmediately()
        this.passwordAfterDelay()

        if(
            this.username.isUnique && 
            !this.username.errors && 
            this.email.isUnique &&
            !this.email.errors &&
            !this.password.errors
            ){
            this.form.submit()
        }
    }

    isDifferent(el, handler){
        //see if the field value has changed after key press
        if(el.previousValue != el.value){
            //value has changed sooo
            handler.call(this)
        }
        el.previousValue = el.value
    }

    usernameHandler(){
        this.username.errors = false
        // alert("username handler")
        //set up skeleton to run some imediately and some in delay
        this.usernameImmediately()
        clearTimeout(this.username.timer)
        this.username.timer = setTimeout(()=> this.usernameAfterDelay(), 800)
    } 
    
    passwordHandler(){
        this.password.errors = false
        // alert("username handler")
        //set up skeleton to run some imediately and some in delay
        this.passwordImmediately()
        clearTimeout(this.password.timer)
        this.password.timer = setTimeout(()=> this.passwordAfterDelay(), 800)
    }
    
    passwordImmediately(){
        if(this.password.value.length >50){
            this.showValidationError(this.password, "Password cannot exceed 50 characters.")
        }
        if(!this.password.errors){
            this.hideValidationError(this.password)
        }
    }

    passwordAfterDelay(){
        if(this.password.value.length <6){
            this.showValidationError(this.password, "Password must be at least 6 characters")
        }
    }

    emailHandler(){
        this.email.errors = false
        clearTimeout(this.email.timer)
        this.email.timer = setTimeout(()=> this.emailAfterDelay(), 800)
    } 

    
   

    emailAfterDelay(){
        if(!/^\S+@\S+$/.test(this.email.value)){
            this.showValidationError(this.email, "You must provide a valid email address")
        }
        //see if email is taken already
        if(!this.email.errors){
            axios.post('/doesEmailExist', {_csrf: this._csrf, email: this.email.value}).then((response)=>{
                if(response.data){
                    //problem email already exist
                    this.email.isUnique = false
                    this.showValidationError(this.email, "That email is already being used")
                }else{
                    this.email.isUnique = true
                    this.hideValidationError(this.email)
                }
            }).catch(()=>{
                console.log("please try again later")
            })
        }
    }


    usernameImmediately(){
        // console.log("this is immediate")
        //anything other that a-z A-Z use regular expression
        if(this.username.value != "" && !/^([a-zA-Z0-9]+)$/.test(this.username.value)){
            this.showValidationError(this.username, "Username can only contain letters and numbers")
        }

        //test for length
        if(this.username.value.length > 20){
            this.showValidationError(this.username, "Username cannot exceed 20 characters")
        }
        
        if(!this.username.errors){
            this.hideValidationError(this.username)
        }

    
    }
    hideValidationError(el){
        el.nextElementSibling.classList.remove("liveValidateMessage--visible")
    }

    showValidationError(el, message){
        //look for next html element right after it
        el.nextElementSibling.innerHTML = message
        el.nextElementSibling.classList.add("liveValidateMessage--visible")
        el.errors = true
    }

    usernameAfterDelay(){
        // alert("this is after")
        //check username is at least 3 character
        if(this.username.value.length < 3){
            this.showValidationError(this.username, "Username must be at least 3 characters")
        }
        //check if username is unique
        if(!this.username.errors){
          //only send a request if there are no other problems
          //post - 1 url that we want to send a request to
          //    2-object... any data we want to send along to the server
          //responds with true or false
            axios.post('/doesUsernameExist', {_csrf: this._csrf, username: this.username.value}).then((response)=>{
                if(response.data){
                    this.showValidationError(this.username, "That username is already taken")
                    this.username.isUnique = false
                }else{
                    //usrname is available
                    this.username.isUnique = true
                }
            }).catch(()=>{
                //unexpected technical difficulty
                console.log("Please try again later")

            })
        }
    }

    insertValidationElements(){
        this.allFields.forEach(function(el){
            //do something to each field
            el.insertAdjacentHTML('afterend', '<div class="alert alert-danger small liveValidateMessage"></div>')
        })
    }
}