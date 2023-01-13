require('dotenv').config()
require('./config/connection')
const fs = require('fs')
var cors = require('cors')
const express = require('express')
const path = require('path')
const upload = require('express-fileupload')
const bodyParser = require('body-parser')

const UserRouter = require('./routes/user')
const UploadRouter = require('./routes/upload')
const app = express()
  
app.use(express.json())
app.use(UserRouter)
app.use(UploadRouter)

app.use(upload())
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.listen(process.env.PORT, () => {
    console.log(`server running at https:127.0.0.1:${process.env.PORT}`)
})