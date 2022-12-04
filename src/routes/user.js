const User = require('../models/user')
const Wallet = require('../models/wallet')
const bcrypt = require('bcrypt')
const router = require('express').Router()
const auth = require('../config/auth')

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
router.post('/user/addWallet', auth, async (req, res) => {
    try {
        const wallet = new Wallet(req.body)
        wallet.owner = req.user._id
        await wallet.save()
        res.send(wallet)
    } catch (err) {
        res.status(400).send({err: err.message})
    }
})

module.exports = router


