const User = require('../models/user')
const Wallet = require('../models/wallet')
const bcrypt = require('bcrypt')
const router = require('express').Router()
const auth = require('../config/auth')
const Otp = require('../models/otp')
const sgMail = require('@sendgrid/mail')

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

//----forget password
//sending mail
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

        //setting the sendgrid api key  
        sgMail.setApiKey(process.env.SENDGRID_API_KEY)

        //sending mail
        sgMail.send({
            to: req.body.email, 
            from: 'rupali.h@esrotlab.com',
            subject: 'Reset your password for PaymentDapp',
            text: 'We have got a request to reset your password for PaymentDapp',
            html: `<p>Your code to reset the password is <b>${otp.code}</b></br>Expiring in 5 mintues</p>`
        }).then(response => {
            console.log("success ",response[0].statusCode)
        }).catch(err => {
            console.log("err", err.response.body)
        })

        res.send({msg: `code has successfully sent to your email id`, code: otp.code})
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

        if((new Date().getTime() - getOtp[0].expiresIn) > 0) throw new Error("Token was expired")

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


