const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const userSchema = mongoose.Schema ({
    firstname: {
        type: String,
        validate: (value) => {
            if(!validator.isAlpha(value)) throw new Error('Firstname is empty or inavlid')
        }
    }, 
    lastname: {
        type: String,
        validate: (value) => {
            if(!validator.isAlpha(value)) throw new Error('Lastname is empty or inavlid')
        }
    },
    username: {
        type: String, 
        unique: true,
        trim: true,
        lowercase: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        unique: true,
        validate: (value) => {
            if(!validator.isEmail(value)) throw new Error('Email is empty or inavlid')
        }
    },
    phone: {
        type: String,
        validate: (value) => {
            if(!validator.isMobilePhone(value)) throw new Error('Phone is empty or inavlid')
        }
    },
    password: {
        type: String,
        trime: true,
        validate: (value) => {
            if(!validator.isStrongPassword(value)) throw new Error("Password is empty or inavlid")
        }
    },
    tokens: [{
        token: {
            type: String,
        }
    }]
})

//generating auth token
userSchema.methods.generateAuthToken = async function () {
    const token  = jwt.sign({_id: this._id.toString()}, process.env.JWT_SECRET)
    this.tokens = this.tokens.concat({token}) //adding new token in user
    await this.save()
    return token
}

//hashing/encrypting the password before saving it
userSchema.pre('save', async function(next) {
    if(this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 9)
    }
    next()
})

module.exports = mongoose.model('User', userSchema)