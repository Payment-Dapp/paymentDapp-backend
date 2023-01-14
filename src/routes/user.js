const User = require('../models/user')
const Wallet = require('../models/wallet')
const bcrypt = require('bcrypt')
const router = require('express').Router()
const auth = require('../config/auth')
const Otp = require('../models/otp')
const nodemailer = require('nodemailer')
const mongoose = require('mongoose')

//register a user
router.post('/user/register', async (req, res) => {
   try {
        const user = new User(req.body)
        await user.save()

        const token = await user.generateAuthToken()
        res.send({user})
   } catch (err) {
        res.status(400).send({err: err.message})
   }
})

//loging in existing user
router.post('/user/login', async (req, res) => {
    try {
        const user = await User.findOne({username: req.body.username})
        if(!req.body.username || !req.body.password) 
            throw new Error("username or password can not be empty")

        if(!user) 
            throw new Error("user not found")
        
        const isCorrectPassword = await bcrypt.compare(req.body.password, user.password)
        if(!isCorrectPassword)
            throw new  Error("invalid password")

            const token = await user.generateAuthToken()
            res.send({user})
    } catch (err) {
        res.status(404).send({err: err.message})
    }
})

//editing user profile 
router.post('/user/update', async (req, res) => {
    try {
        const id = mongoose.Types.ObjectId(req.query.id.trim())
        const user = await User.findById(id)
        if(!user) throw new Error('user not found') 

        const fieldsToBeUpdated = ['username', 'email', 'phone']
        const fields = Object.keys(req.body)

        fieldsToBeUpdated.map((f,i) => { 
            if(fields.includes(fieldsToBeUpdated[i])) {
                user[f] = req.body[f]
            }
        })
        await user.save()
        res.send({msg: "user updated", 
        user: {
            username: user.username,
            email: user.email,
            phone: user.phone
        }
    })
    } catch (err) { 
        res.status(400).send({err: err.message})
    }
})

//adding wallet
router.post('/user/add-wallet', auth, async (req, res) => {
    try {
        const user = await User.findOne(mongoose.Types.ObjectId(req.query.id.trim())) 
        if(!user) throw new Error("user not found")

        const isAlreadyExist = await Wallet.findOne({name: req.body.name})
        if(isAlreadyExist) throw new Error("this name already in use")
        
        const wallet = new Wallet(req.body)
        wallet.owner = user._id
        await wallet.save()
        res.send(wallet)
    } catch (err) {
        res.status(400).send({err: err.message})
    }
})

//sending email for forgot password
router.post('/user/forget-password/send', async (req, res) => {
    try {
        const user = await User.findOne({email: req.body.email})
        if(!user) throw new Error("User not found, please check your email address")
        
        //generating otp
        const otpCode = Math.floor((Math.random()*10000)+1)
        const otp = new Otp({
            email: req.body.email,
            code: otpCode,
            expiresIn: new Date().getTime() + 300*1000
        })
        await otp.save()

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: process.env.USER_EMAIL,
                pass: process.env.USER_PASS,
                clientId: process.env.CLIENT_ID,
                clientSecret: process.env.CLIENT_SECRET,
                refreshToken: process.env.REFRESH_TOKEN
            }
        })

        const mailOptions = {
            from: process.env.USER_EMAIL,
            to: req.body.email,
            subject: 'Reset your paymentDapp password',
            text: `Your code is ${otp.code}, expiring in 5 minutes`
        } 

        transporter.sendMail(mailOptions, (err, info) => {
            if(err) throw new Error(err)
            else res.send({msg: `code has successfully sent to your email id`})
        })

        res.send({msg: `code has successfully sent to your email id`})
    } catch (err) {
        res.status(404).send({err: err.message})
    }
})
 
//verify otp
router.post('/user/forget-password/verify-otp', async (req, res) => {
    try {
        const code = req.body.code
        const email = req.query.email

        const getOtp = await Otp.find({email, code})
        if(!getOtp) throw new Error("couldn't send OTP, please try again")

        if((new Date().getTime() - getOtp[0].expiresIn) > 0) throw new Error("This OTP has exceeded the time limit")

        if(code != getOtp[0].code) throw new Error("OTP does not match, please try again")

        res.send({msg: "OTP matched, please take next step"})
    } catch (err) {
        res.status(400).send({err: err.message})
    }
})

//update password
router.post('/user/forget-password/update-password', async (req, res) => {
    try {
        const user = await User.findOne({email: req.query.email})
        user.password = req.body.password
        await user.save()
        res.send({msg: "password was updated"}) 
        // it should redirect to login page
    } catch (err) {
        res.send({err: err.message})
    }
})

//change password
router.post('/user/change-password', auth, async (req, res) => {
    try {
        const user = await User.findOne(mongoose.Types.ObjectId(req.query.id.trim())) 
        if(!user) throw new Error("user not found")

        const {currentPassword, newPassword, confirmPassword} = req.body
        
        if(newPassword !== confirmPassword) 
            throw new Error("confirm password does not match to the entered password")
        
        const isCorrectPassword = bcrypt.compare(currentPassword, user.password)
        if(!isCorrectPassword)
            throw new  Error("current password is invalid")
        
        user.password = newPassword
        await user.save()
        res.send({msg: "password updated"})
    } catch (err) {
        res.send({err: err.message})
    }
})

//get contacts
router.get('/contacts', auth, async (req, res) => {
    try {
        const id = mongoose.Types.ObjectId(req.query.id.trim())
        const contacts = await Wallet.find({owner: id})

        if(!contacts) throw new Error("no contact found")
        res.send({contacts})
    } catch(err) {
        res.status(400).send({err: err.message})
    }
})

module.exports = router


