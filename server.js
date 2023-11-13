const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const util = require("util");
const ejs=require('ejs');
const unlinkFile = util.promisify(fs.unlink);
require("dotenv").config();

const app = express();

const port = process.env.PROT || 3000;

app.use(bodyParser.json());


app.use(
  express.urlencoded({
    extended:false,
  })
);

// set the view engine to ejs
app.set('view engine', 'ejs');

app.use(express.static("public"));



const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1000000 },
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
}).any();

function checkFileType(file, cb) {
  const filetypes = /jpeg|png|jpg|gif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb("Please upload images only");
  }
}

const dbConnect = require("./config/database");
dbConnect();

const User = require("./model/user");


//Signup Handler

app.post("/sign_up", async (req, res) => {

  const name = req.body.name;
  const email = req.body.email;
  const password = req.body.password;

  // Hash the password before storing it
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = new User({
    name: name,
    email: email,
    password: hashedPassword,
  });

  try {
    await user.save();
    console.log("Record Inserted Successfully");
    let images = [];
    fs.readdir("./public/uploads/", (err, files) => {
      if (!err) {
        files.forEach((file) => {
          images.push(file);
        });
        res.render("index", { images: images });
      } else {
        console.log(err);
      }
    });

    
  } catch (err) {
    console.error("Error inserting user:", err);
    return res.status(500).send("Internal Server Error");
  }
});


//Login Handler
const bcrypt = require("bcryptjs");

app.post("/login", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  try {
    // Find the user in the database by email
    const user = await User.findOne({ email: email });

    if (!user) {
      // User not found
      console.log("User not found");
      return res.status(401).send("Invalid email or password");
    }

    // Compare the provided password with the hashed password in the database
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (passwordMatch) {
      // Passwords match - login successful
      console.log("Login successful");

      let images = [];
      fs.readdir("./public/uploads/", (err, files) => {
        if (!err) {
          files.forEach((file) => {
            images.push(file);
          });
          res.render("index", { images: images });
        } else {
          console.log(err);
        }
      });
    } else {
      // Incorrect password
      console.log("Incorrect password");
      return res.status(401).send("Invalid email or password");
    }
  } catch (error) {
    console.error("Error during login:", error);
    return res.status(500).send("Internal Server Error");
  }
});




app.post("/upload", (req, res) => {
  upload(req, res, (err) => {
    if (!err && req.files != "") {
      res.status(200).send();
    } else if (!err && req.files == "") {
      res.statusMessage = "Please select an image to upload";
      res.status(400).end();
    } else {
      res.statusMessage =
        err === "Please upload images only"
          ? err
          : "Photo exceeds limit of 1MB";
      res.status(400).end();
    }
  });
});


app.put("/delete", (req, res) => {
  const deleteImages = req.body.deleteImages;

  if (deleteImages == "") {
    res.statusMessage = "Please select an image to delete";
    res.status(400).end();
  } else {
    deleteImages.forEach((image) => {
      unlinkFile("./public/uploads/" + image);
    });
    res.statusMessage = "Succesfully deleted";
    res.status(200).end();
  }
});


// app.get("/", (req, res) => {
//   let images = [];
//   fs.readdir("./public/uploads/", (err, files) => {
//     if (!err) {
//       files.forEach((file) => {
//         images.push(file);
//       });
//       res.render("index", { images: images });
//     } else {
//       console.log(err);
//     }
//   });
// });






app.get("/", (req, res) => {
  res.set({
    "Allow-access-Allow-Origin": "*",
  });
  return res.redirect("signup.html");
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
