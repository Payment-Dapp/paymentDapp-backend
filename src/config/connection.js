const mongoose = require('mongoose')

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true   
}).then(res => console.log('connected to database')).catch(err => console.log("couldn't connect to database", err.message))