const User = require("../models/user");
const Wallet = require("../models/wallet");
const bcrypt = require("bcrypt");
const router = require("express").Router();
const auth = require("../config/auth");
const Otp = require("../models/otp");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const multer = require("multer")
const sharp = require("sharp")
const base64 = require('base64-arraybuffer')

/*uploading images*/
const upload = multer({
	limits: {
		fileSize: 1000000
	},
	fileFilter(req, file, cb){
		if(!file.originalname.match(/\.(jpg|jpeg|png)$/)){
			return cb(new Error("please upload a valid img"))
		}
		cb(undefined, true)
	}
})

/*encoding image*/
const decodeAvatar = (buffer) =>  {
  if(buffer) {
   return base64.encode(buffer)
  } else {
    return ''
  }
}

router.get('/user/details', auth, (req, res) => {
  const avatar = decodeAvatar(req.user.avatar)
  res.send(avatar)
})

const createTransporter = async () => {
  try {
    const oauth2Client = new OAuth2(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,
        "https://developers.google.com/oauthplayground"
      );
    
      oauth2Client.setCredentials({
        refresh_token: process.env.REFRESH_TOKEN,
      });
    
      const accessToken = await new Promise((resolve, reject) => {
        oauth2Client.getAccessToken((err, token) => {
          if (err) {
            console.log("*ERR: ", err)
            reject();
          }
          resolve(token); 
        });
      });
    
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          type: "OAuth2",
          user: process.env.USER_EMAIL,
          accessToken,
          clientId: process.env.CLIENT_ID,
          clientSecret: process.env.CLIENT_SECRET,
          refreshToken: process.env.REFRESH_TOKEN,
        },
      });

    
      return transporter;
  } catch (err) {
    return err
  }
};

//register a user
router.post("/user/register", upload.single('avatar'), async (req, res) => {
  try {
    console.log(req.file)
    const user = new User(req.body);
    if(req.file){
			const buffer = await sharp(req.file.buffer).resize({width: 250, height: 250}).png().toBuffer()
			user.avatar = buffer
		} 
    await user.save();

    const token = await user.generateAuthToken();
    const { _id, firstname, lastname, username, email, phone, avatar } = user;
    const avatarBuffer = decodeAvatar(avatar)

    res.send({ _id, firstname, lastname, username, email, phone, token, avatar: avatarBuffer });
  } catch (err) {
    res.status(400).send({ err: err.message });
  }
});



//loging in existing user
router.post("/user/login", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username });
    if (!req.body.username || !req.body.password)
      throw new Error("username or password can not be empty");

    if (!user) throw new Error("user not found");

    const isCorrectPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!isCorrectPassword) throw new Error("invalid password");

    const token = await user.generateAuthToken();
    const { _id, firstname, lastname, username, email, phone, avatar } = user;
    const avatarBuffer = decodeAvatar(avatar)

    res.send({ _id, firstname, lastname, username, email, phone, avatar: avatarBuffer   , token });
  } catch (err) {
    res.status(404).send({ err: err.message });
  }
});

//editing user profile
router.post("/user/update", upload.single('avatar'), async (req, res) => {
  try {
    const id = mongoose.Types.ObjectId(req.query.id.trim());
    const user = await User.findById(id);
    if (!user) throw new Error("user not found");

    const fieldsToBeUpdated = ["username", "email", "phone"];
    const fields = Object.keys(req.body);

    fieldsToBeUpdated.map((f, i) => {
      if (fields.includes(fieldsToBeUpdated[i])) {
        user[f] = req.body[f];
      }
    });

    if(req.file){
			const buffer = await sharp(req.file.buffer).resize({width: 250, height: 250}).png().toBuffer()
			user.avatar = buffer
    }
    await user.save();

    const avatarBuffer = decodeAvatar(user.avatar)
    res.send({
      msg: "user updated",
      user: {
        username: user.username,
        email: user.email,
        phone: user.phone,
        avatar: avatarBuffer
      },
    });
  } catch (err) {
    res.status(400).send({ err: err.message });
  }
});

//adding wallet
router.post("/user/add-wallet", auth, async (req, res) => {
  try {
    const user = await User.findOne(
      mongoose.Types.ObjectId(req.query.id.trim())
    );
    if (!user) throw new Error("user not found");

    const isAlreadyExist = await Wallet.findOne({ name: req.body.name });
    if (isAlreadyExist) throw new Error("this name already in use");

    const wallet = new Wallet(req.body);
    wallet.owner = user._id;
    await wallet.save();
    res.send(wallet);
  } catch (err) {
    res.status(400).send({ err: err.message });
  }
});

//sending email for forgot password
router.post("/user/forget-password/send", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user)
      throw new Error("User not found, please check your email address");

    //generating otp
    const otpCode = Math.floor(Math.random() * 10000 + 1);
    const otp = new Otp({
      email: req.body.email,
      code: otpCode,
      expiresIn: new Date().getTime() + 300 * 1000,
    });
    await otp.save();

    const sendMail = async (mailOptions) => {
      try {
        let emailTransporter = await createTransporter();
        await emailTransporter.sendMail(mailOptions);
      } catch (err) {
        console.log("ERROR: ", err)
      }
    }; 

    sendMail({
      from: process.env.USER_EMAIL,
      to: req.body.email,
      subject: "Reset your paymentDApp password",
      text: `Your code is ${otp.code}, expiring in 5 minutes`,
    });
    res.send({ msg: `code has successfully sent to your email id` });
  } catch (err) {
    res.status(404).send({ err: err.message });
  }
});

//verify otp
router.post("/user/forget-password/verify-otp", async (req, res) => {
  try {
    const code = req.body.code;
    const email = req.query.email;

    const getOtp = await Otp.find({ email, code });
    if (!getOtp) throw new Error("couldn't send OTP, please try again");

    if (new Date().getTime() - getOtp[0].expiresIn > 0)
      throw new Error("This OTP has exceeded the time limit");

    if (code != getOtp[0].code)
      throw new Error("OTP does not match, please try again");

    res.send({ msg: "OTP matched, please take next step" });
  } catch (err) {
    res.status(400).send({ err: err.message });
  }
});

//update password
router.post("/user/forget-password/update-password", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.query.email });
    user.password = req.body.password;
    await user.save();
    res.send({ msg: "password was updated" });
    // it should redirect to login page
  } catch (err) {
    res.send({ err: err.message });
  }
});

//change password
router.post("/user/change-password", auth, async (req, res) => {
  try {
    const user = await User.findOne(
      mongoose.Types.ObjectId(req.query.id.trim())
    );
    if (!user) throw new Error("user not found");

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword)
      throw new Error(
        "confirm password does not match to the entered password"
      );

    const isCorrectPassword = bcrypt.compare(currentPassword, user.password);
    if (!isCorrectPassword) throw new Error("current password is invalid");

    user.password = newPassword;
    await user.save();
    res.send({ msg: "password updated" });
  } catch (err) {
    res.send({ err: err.message });
  }
});

//get contacts
router.get("/contacts", auth, async (req, res) => {
  try {
    const id = mongoose.Types.ObjectId(req.query.id.trim());
    const contacts = await Wallet.find({ owner: id });

    if (!contacts) throw new Error("no contact found");
    res.send({ contacts });
  } catch (err) {
    res.status(400).send({ err: err.message });
  }
});

//send email notifications
router.post('/user/send-email-notification', auth, async (req, res) => {
  try {
    const id = mongoose.Types.ObjectId(req.query.id.trim());
    const user = await User.findById(id);
    if (!user) throw new Error("user not found");

    const sendMail = async (mailOptions) => {
      try {
        let emailTransporter = await createTransporter();
        await emailTransporter.sendMail(mailOptions);
      } catch (err) {
        console.log("ERROR: ", err)
      }
    }; 

    sendMail({
      from: process.env.USER_EMAIL,
      to: user.email,
      subject: "PaymentDapp details",
      html: `
      <p>Hi, the following details are from your paymentDapp account</p>
      <p>Name: ${req.body.name}</p>
      <p>Price: ${req.body.price}</p>
      <p>Transaction Hash: ${req.body.txhash}</p>`,
    });

    res.send({msg: "email sent successfully"})
  } catch (err) {
    res.status(400).send({ err: err.message });
  }
}) 

module.exports = router;
