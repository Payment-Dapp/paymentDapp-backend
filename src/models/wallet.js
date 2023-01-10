const mongoose = require('mongoose')

const walletSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true
    }
})

module.exports = mongoose.model('Wallet', walletSchema)