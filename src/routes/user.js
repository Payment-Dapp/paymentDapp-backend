const User = require('../models/user')
const Wallet = require('../models/wallet')
const bcrypt = require('bcrypt')
const router = require('express').Router()
const auth = require('../config/auth')
const Otp = require('../models/otp')
const nodemailer = require('nodemailer')

//register a user
router.post('/user/register', async (req, res) => {
   try {
        const user = new User(req.body)
        await user.save()

        const token = await user.generateAuthToken()
        res.send({
            name: user.firstName + " " + user.lastName,
            username: user.username,
            email: user.email,
            phone: user.phone,
            token
        })
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
        
        const isCrrectPassword = await bcrypt.compare(req.body.password, user.password)
        if(!isCrrectPassword)
            throw new  Error("invalid password")

            const token = await user.generateAuthToken()
            res.send({
                name: user.firstName + " " + user.lastName,
                username: user.username,
                email: user.email,
                phone: user.phone,
                token
            })
    } catch (err) {
        res.status(404).send({err: err.message})
    }
})

//adding wallet
router.post('/user/add-wallet', auth, async (req, res) => {
    try {
        const wallet = new Wallet(req.body)
        wallet.owner = req.user._id
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
                refreshToken: process.env.REFRESH_TOKEN,
                accessToken: process.env.ACCESS_TOKEN
            }
        })

        const mailOptions = {
            from: process.env.USER_EMAIL,
            to: 'rupali.h@esrotlab.com',
            subject: 'reset your paymentDapp password',
            text: `Your code is ${otp.code}, expiring in 5 minutes`
        } 

        transporter.sendMail(mailOptions, (err, info) => {
            if(err) console.log("error, couldn't send email: ", err)
            else console.log("success, email sent: ", info)
        })

        res.send({msg: `code has successfully sent to your email id`})
    } catch (err) {
        res.status(404).send({err: err.message})
    }
})
 
//updating password
router.post('/user/forget-password/update', async (req, res) => {
    try {
        const {email, code, newPassword} = req.body
        const user = await User.findOne({email})
        if(!user) throw new Error("User not found, please check your email address")

        const getOtp = await Otp.find({email, code})
        if(!getOtp) throw new Error("couldn't send OTP, please try again")

        if((new Date().getTime() - getOtp[0].expiresIn) > 0) throw new Error("This OTP has exceeded the time limit")

        if(code != getOtp[0].code) throw new Error("OTP does not match, please try again")

        user.password = newPassword
        await user.save()
        console.log(user.password, newPassword)

        res.send({msg: "Password updated successfully!"})
    } catch (err) {
        res.status(400).send({err: err.message})
    }
})

module.exports = router


