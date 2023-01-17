const mongoose = require('mongoose')

const uploadShema = mongoose.Schema({
  url: String,
  owner: mongoose.Types.ObjectId
})

module.exports = mongoose.model('Upload', uploadShema)