const mongoose = require('mongoose')
const validator = require('validator')

const otpSchema = mongoose.Schema({
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        validate: (value) => {
            if(!validator.isEmail(value)) throw new Error('Email is empty or inavlid')
        }
    },
    code: {
        type: String, 
    },
    expiresIn: {
        type: Number, 
    }
}, {
    timestamps: true
})

module.exports = mongoose.model('otp', otpSchema, 'otp')