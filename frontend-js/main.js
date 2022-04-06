import Search from './modules/search'
import Chat from './modules/chat'
import RegistrationForm from './modules/registrationForm'

//only run if registration form exist
if(document.querySelector("#registration-form")){
    new RegistrationForm
}

//only leverage if statement from footer (if user is logged in)
if(document.querySelector("#chat-wrapper")){
    new Chat()
}

//create a new instance of search.. which triiger our constructor
if(document.querySelector(".header-search-icon")){
    new Search()
}
