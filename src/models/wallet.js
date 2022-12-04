const mongoose = require('mongoose')

const walletSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    owner: {
        type: mongoose.Schema.ObjectId,
        required: true
    }
})

module.exports = mongoose.model('Wallet', walletSchema)