//allow dot environment variable
const dotenv = require('dotenv')
//this will load in all the values in out .env file
dotenv.config()
//open connection to a mongodb database
const {MongoClient} = require('mongodb')

//PULL ENV VARIABLE
const client = new MongoClient(process.env.CONNECTIONSTRING)

//we dont know how long it will take so make it aynchronous
async function start(){
    //once it finally finsihes
    await client.connect()
    //save it to something but not a regular variable
    //   require this file from another file
    module.exports = client

    //entry point to application
    const app = require('./app')
    app.listen(process.env.PORT)
}
start()

