const express = require("express")
const mongodb = require("mongodb")
const bcrypt = require("bcrypt")
const jwt = require('jsonwebtoken')
const cors = require("cors")
require('dotenv').config()

const app = express();
const port = process.env.PORT || 3000;
const mongoClient = mongodb.MongoClient;
const object_id = mongodb.ObjectID;
const mongodb_url = "mongodb://127.0.0.1:27017/"; //process.env.mongo_url;
const db = "pizza_order_hackathon";
const { Authorize, Edit_check, Delete_check } = require("./auth_lib/authorize")

app.use(express.json());
app.use(cors());

app.post("/new_user", async (req, res)=>{
    let data = req.body;
    let salt = await bcrypt.genSalt(10);
    let hash = await bcrypt.hash(data["password"], salt);
    data["password"] = hash;
    data["is_active"] = true;
    try {
        let client  = await mongoClient.connect(mongodb_url);
        let collection = client.db(db).collection('users');
        let result = await collection.find({"email": data["email"]}).toArray();
        if(result.length != 0){
            client.close();
            return res.status(400).json({"detail": "User Already Exist"})
        }
        let response = await collection.insertOne(data);
        client.close();
        if(response['insertedCount'] == 1)
            return res.status(200).json({"detail": "Succesfully Created"})
        else
            return res.status(500).json({"detail": "Some Error Occured"})
    } catch (error) {
        console.log(error);
        return res.status(500).json({"detail": "Some Exception Occured"})
    }
})

app.post("/login", async (req, res)=>{
    let data = req.body;
    try {
        let client  = await mongoClient.connect(mongodb_url);
        let collection = client.db(db).collection('users');
        let result = await collection.find({"email": data["email"]}).toArray();
        client.close();
        if(result.length == 0){
            return res.status(401).json({"detail": "User Not Register"});
        }
        let isValid = await bcrypt.compare(data["password"], result[0]["password"]);
        if(!isValid){
            return res.status(401).json({"detail": "Invalid Credentials"});
        }
        let token = await jwt.sign({"user_id": result[0]["_id"], "email": result[0]["email"]}, process.env.CODE, {expiresIn: "1h"})
        if(token)
            return res.status(200).json({"detail": "Success", "token": token})
        else
            return res.status(500).json({"detail": "Some Error Occured"})
    } catch (error) {
        console.log(error);
        return res.status(500).json({"detail": "Some Exception Occured"})
    }
})

app.get("/check_status", Authorize ,async (req, res)=>{
    try{
        let client  = await mongoClient.connect(mongodb_url);
        let collection = client.db(db).collection('users');
        let result = await collection.find({"_id": req.body["user_id"]}).toArray();
        client.close();
        if(result.length == 0){
            return res.status(401).json({"detail": "User Not Register"});
        }
        return res.status(200).json({"name": result[0]["name"]})
    }
    catch(error){
        return res.status(403).json({"detail": "Token Expired"})
    }
})

app.listen(port, ()=>console.log(`Server Started on Port-${port}`))