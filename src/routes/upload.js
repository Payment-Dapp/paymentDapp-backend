const fs = require("fs");
const express = require("express");
const path = require("path");
const ipfsClient = require("ipfs-http-client");
const Upload = require('../models/upload')
const auth = require('../config/auth')

// const { createIpfsHash } = require("../pinataService.js");
const { getMaxListeners } = require("process");
const User = require("../models/user");
const { default: mongoose } = require("mongoose");
const router = express.Router();

const jsonPath = path.resolve(`./uploads/nft-data.json`);
const filePath = path.resolve(`./uploads/image.png`);

// router.post("/upload-image", async (req, res) => {
//   try {
//     try {
//       if (req.files) {
//         const files = req.files;

//         for (let file in files) {
//           console.log("files", files);
//           files[file].mv(`${filePath}`, (err) => {
//             if (err) {
//               return res.status(500).json({
//                 ok: false,
//                 err,
//               });
//             } else {
//               console.log("file", file);
//             }
//           });
//         }
//         console.log("working fine in server");
//         console.log("lets go");
//         const imageHash = await createIpfsHash("image");
//         console.log("imageHash", imageHash.IpfsHash);

//         res.json({ data: imageHash.IpfsHash });
//       } else {
//         res.sendStatus(404);
//       }
//     } catch (error) {
//       console.log("error", error);
//     }
//   } catch (err) {
//     res.send({ err: err.message });
//   }
// });


//upload json
router.post("/upload-json", async (req, res) => {
  try {
    const projectId = "2FTxK8ufxIOSqlj707YFqcZ5w2s";
    const projectSecretKey = "75b6027b9e2dab7c98b17203fe180c30";
    const authorization = "Basic " + btoa(projectId + ":" + projectSecretKey);
    const ipfs = ipfsClient.create({
      url: "https://ipfs.infura.io:5001/api/v0",
      headers: {
        authorization,
      },
    });
    const data = JSON.stringify(req.body);
    
    const added = await ipfs.add(data);
    const wallet_address = req.query.wallet_address
    const url = `https://skywalker.infura-ipfs.io/ipfs/${added.path}`;

    const uploadUrl = await Upload({url, wallet_address})
    await uploadUrl.save()
    /* after file is uploaded to IPFS, return the URL to use it in the transaction */
    console.log(url);
    res.send({ uploadUrl });
  } catch (error) {
    console.log("Error uploading file: ", error);
  }
});

//get all urls
router.get('/get-all-urls', async (req, res) => {
  try {
    const urls = await Upload.find()
    res.send({urls})
  } catch (err) {
    res.send({err: err.message})
  }
})

//get url for specific wallet address
router.get('/get-url', async (req, res) => {
  try {
    const uploads = await Upload.find({wallet_address: req.query.wallet_address})
    res.send({uploads})
  } catch (err) {
    res.send({err: err.message})
  }
})

module.exports = router;
