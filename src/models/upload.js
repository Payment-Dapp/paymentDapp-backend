const mongoose = require('mongoose')

const uploadShema = mongoose.Schema({
  url: String,
  wallet_address: String
})

module.exports = mongoose.model('Upload', uploadShema)