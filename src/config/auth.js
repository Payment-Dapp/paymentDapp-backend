const jwt = require('jsonwebtoken')
const User = require('../models/user')

const auth = async (req, res, next) => {
    try {
        //testing with postman
        const token = req.header('Authorization').replace('Bearer ', '')

        //verifying token
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        const user = await User.findOne({_id: decoded._id, "tokens.token": token})
        if(!user) throw new Error("invalid request")
        
        req.token = token
        req.user = user
        next()
    } catch (err) {
        res.status(400).send({err: err.message})
    }
}

module.exports = auth