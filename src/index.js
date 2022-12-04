require('dotenv').config()
require('./config/connection')
const express = require('express')
const Router = require('./routes/user')
const app = express()

app.use(express.json())
app.use(Router)


app.listen(process.env.PORT, () => {
    console.log(`server running at https:127.0.0.1:${process.env.PORT}`)
})