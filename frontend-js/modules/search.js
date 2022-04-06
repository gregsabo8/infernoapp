import axios from 'axios'
import DOMPurify from 'dompurify'

export default class Search {
    //1 select DOM elements, and keep track of any useful data
    constructor() {
        this._csrf = document.querySelector('[name="_csrf"]').value
        this.injectHTML()
        // alert("search js is success")
        this.headerSearchIcon = document.querySelector(".header-search-icon")
        this.overlay = document.querySelector(".search-overlay")
        //once open press x to close
        this.closeIcon = document.querySelector(".close-live-search")
        //once search is open immediately make the cursor ready to type
        this.inputField = document.querySelector("#live-search-field")
        //not hardcoded results when clicking the magnifine glass
        this.resultsArea = document.querySelector(".live-search-results")
        //spiining loader in middle of screen
        this.loaderIcon = document.querySelector(".circle-loader")
        //handle the spinning loader
        this.typingWaitTimer //now it exist and we can work with it later
        this.previousValue = "" 
        //call events method
        this.events()
    }
    //2 events
    events(){
        this.inputField.addEventListener("keyup", () => this.keyPressHandler())
        this.closeIcon.addEventListener("click", () => this.closeOverlay())
        this.headerSearchIcon.addEventListener("click", (e)=>{
            e.preventDefault()
            this.openOverlay()
        })
    }

    //3 methods
    keyPressHandler() {
        //show spinng logo icon
        let value = this.inputField.value
        if(value==""){
            clearTimeout(this.typingWaitTimer)
            this.hideLoaderIcon()
            this.hideResultsArea()
        }

        //if value is not empty and its different than the previous value
        if(value != "" && value != this.previousValue){
            clearTimeout(this.typingWaitTimer)
            this.showLoaderIcon()
            this.hideResultsArea()
            //timer
            this.typingWaitTimer = setTimeout(() => this.sendRequest(),750)
        }
        this.previousValue = value

    }

    sendRequest(){
        // alert("Send request method just ran")
        //now lets send asynchrous request
        //we are using webpack, axios, webpack bundles up are frontend js 
        // axios post method w 2 arguments 1 url to send request 2 object w data to send
        axios.post("/search", {_csrf: this._csrf, searchTerm: this.inputField.value}).then(response=>{
            //after 3 second typing
            //consoles out a raw json file
            console.log(response.data)
            //send it to another method with response.data passed in
            this.renderResultsHTML(response.data)
        }).catch(()=>{
            alert("request failed")
        })
    }

    renderResultsHTML(posts){
        //post.length shows if array has any items
        //result for both: manipulate THE HTML  for result area div
        if(posts.length){
            this.resultsArea.innerHTML = DOMPurify.sanitize(`
            <div class="list-group shadow-sm">
            <div class="list-group-item active"><strong>Search Results</strong> (${posts.length > 1 ? `${posts.length} items found` : '1 item found'})</div>
                ${posts.map(post=>{
                    let postDate = new Date(post.createdDate)
                    return `<a href="/post/${post._id}" class="list-group-item list-group-item-action">
                    <img class="avatar-tiny" src="${post.author.avatar}"> <strong>${post.title}</strong>
                    <span class="text-muted small">by ${post.author.username} on ${postDate.getMonth()+1}/${postDate.getDate()}/${postDate.getFullYear()}</span>
                    </a>`
                }).join('')}           
            </div>`)
        }else{
            this.resultsArea.innerHTML = `<p class="alert alert-danger text-center shadow-sm">Sorry, we could not find any results for that search.</p>`
        }
        //hide spinner now
        this.hideLoaderIcon()
        //reveal results area.. now this its populated from the if else above
        this.showResultsArea()
    }
    hideLoaderIcon(){
        this.loaderIcon.classList.remove("circle-loader--visible")
    }

    //hide and show 
    showResultsArea(){
        this.resultsArea.classList.add("live-search-results--visible")
    }
    hideResultsArea(){
        this.resultsArea.classList.remove("live-search-results--visible")
    }
    showLoaderIcon(){
        this.loaderIcon.classList.add("circle-loader--visible")
    }

    openOverlay(){
        // alert("openOverlay ran")
        this.overlay.classList.add("search-overlay--visible")
        setTimeout(() => this.inputField.focus(), 50)
    }
    closeOverlay(){
        // alert("openOverlay ran")
        this.overlay.classList.remove("search-overlay--visible")
    }
    injectHTML(){
        document.body.insertAdjacentHTML('beforeend',`
                    
            <div class="search-overlay">
                <div class="search-overlay-top shadow-sm">
                    <div class="container container--narrow">
                        <label for="live-search-field" class="search-overlay-icon"><i class="fas fa-search"></i></label>
                        <input type="text" id="live-search-field" class="live-search-field" placeholder="What are you interested in?">
                        <span class="close-live-search"><i class="fas fa-times-circle"></i></span>
                    </div>
                </div>

                <div class="search-overlay-bottom">
                    <div class="container container--narrow py-3">
                        <div class="circle-loader"></div>
                        <div class="live-search-results"></div>
                    </div>
                </div>
            </div>
  `)
    }
}