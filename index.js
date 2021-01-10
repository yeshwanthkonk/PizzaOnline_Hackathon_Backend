const express = require("express")
const mongodb = require("mongodb")
const bcrypt = require("bcrypt")
const jwt = require('jsonwebtoken')
const cors = require("cors")
const randomstring = require("randomstring")
require('dotenv').config()
// const { Razorpay } = require("razorpay")
// console.log(Razorpay)

const app = express();
const port = process.env.PORT || 3000;
const mongoClient = mongodb.MongoClient;
const object_id = mongodb.ObjectID;
const mongodb_url = "mongodb://127.0.0.1:27017/"; //process.env.mongo_url;
const db = "pizza_order_hackathon";
const { Authorize, Edit_check, Delete_check } = require("./auth_lib/authorize")

var {transporter, reset_mail_detail, reset_email_template, activate_mail_detail, activate_email_template} = require("./mail_module/send_reset_mail")

app.use(express.json());
app.use(cors());

// let payment = new Razorpay({
//     key_id:process.env.key_id,
//     key_secret:process.env.key_secret,
// })

app.post("/new_user", async (req, res)=>{
    let data = req.body;
    let salt = await bcrypt.genSalt(10);
    let hash = await bcrypt.hash(data["password"], salt);
    data["password"] = hash;
    data["is_active"] = true;
    data["verified"] = false;
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
        if(!result[0]["verified"]){
            return res.status(403).json({"detail": "User Not Verified, Please Check your mail for link"});
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

app.post("/reset_link", async (req, res)=>{
    let data = req.body;
    if(Object.keys(data).length == 0)
        return res.status(400).json({"detail": "Invalid Body Request"})
    try{
        let client  = await mongoClient.connect(mongodb_url);
        let collection = client.db(db).collection('users');
        let result = await collection.find({"email": data["email"]}).toArray();
        if(result.length == 0){
            return res.status(400).json({"detail": "Email Not Register with us"})
        }
        collection = client.db(db).collection('email_links');
        let random_string = randomstring.generate(64);
        let response = await collection.findOneAndUpdate({"email": data["email"]},{$set:{"link_id": random_string}});
        reset_mail_detail['to'] = data["email"]
        reset_mail_detail['html'] = reset_email_template(random_string)
        if(!response['lastErrorObject']['updatedExisting']){
            data['link_id'] = random_string
            response = await collection.insertOne(data);
            if(response['insertedCount'] == 1){
                await transporter.sendMail(reset_mail_detail);
                client.close();
                return res.status(200).json({"detail":"New Email link Sent"})
            }
            throw "Server Error";
        }
        client.close();
        await transporter.sendMail(reset_mail_detail);
        return res.status(200).json({"detail":"Updated Email link Sent"})
    }
    catch(error){
        console.log(error);
        return res.status(500).json({"detail": "Some Error Occured"})
    }
})

app.get("/reset_link/:id", async (req, res)=>{
    let data = {"link_id": req.params["id"]};
    let client  = await mongoClient.connect(mongodb_url);
    let collection = client.db(db).collection('email_links');
    let result = await collection.find(data).toArray();
    client.close();
    if(result.length == 0){
        return res.redirect(process.env.frontend_host+"forgot_password?q='Invalid Link'")
    }
    else{
        return res.redirect(process.env.frontend_host+`reset_password?id=${data["link_id"]}`)
    }
})

app.post("/activate_link", async (req, res)=>{
    let data = req.body;
    if(Object.keys(data).length == 0)
        return res.status(400).json({"detail": "Invalid Body Request"})
    try{
        let client  = await mongoClient.connect(mongodb_url);
        let collection = client.db(db).collection('users');
        let result = await collection.find({"email": data["email"]}).toArray();
        if(result.length == 0){
            return res.status(400).json({"detail": "Email Not Register with us"})
        }
        collection = client.db(db).collection('email_links');
        let random_string = randomstring.generate(64);
        let response = await collection.findOneAndUpdate({"email": data["email"]},{$set:{"link_id": random_string}});
        activate_mail_detail['to'] = data["email"]
        activate_mail_detail['html'] = activate_email_template(random_string)
        if(!response['lastErrorObject']['updatedExisting']){
            data['link_id'] = random_string
            response = await collection.insertOne(data);
            if(response['insertedCount'] == 1){
                await transporter.sendMail(activate_mail_detail);
                client.close();
                return res.status(200).json({"detail":"New Email link Sent"})
            }
            throw "Server Error";
        }
        client.close();
        await transporter.sendMail(activate_mail_detail);
        return res.status(200).json({"detail":"Updated Email link Sent"})
    }
    catch(error){
        console.log(error);
        return res.status(500).json({"detail": "Some Error Occured"})
    }
})

app.get("/activate_link/:id", async (req, res)=>{
    let data = {"link_id": req.params["id"]};
    let client  = await mongoClient.connect(mongodb_url);
    let collection = client.db(db).collection('email_links');
    let result = await collection.find(data).toArray();
    if(result.length == 0){
        client.close();
        return res.redirect(process.env.frontend_host+"forgot_password?q='Invalid Link'")
    }
    else{
        await collection.deleteOne(data);
        collection = client.db(db).collection('users');
        await collection.findOneAndUpdate({"email": result[0]["email"]},{$set:{"verified": true}});
        client.close();
        return res.redirect(process.env.frontend_host+`home?id=${data["link_id"]}`)
    }
})

app.post("/update_password", async (req, res)=>{
    let data = req.body["data"];
    let id = {"link_id": req.body["id"]};
    try{
        let client  = await mongoClient.connect(mongodb_url);
        let collection = client.db(db).collection('email_links');
        let result = await collection.find(id).toArray();
        if(result.length == 0){
            client.close();
            return res.status(400).json({"detail": "Invalid Link request new link"})
        }
        data['email'] = result[0]['email'];
        let salt = await bcrypt.genSalt(10);
        let hash = await bcrypt.hash(data["password"], salt);
        data["password"] = hash;
        await collection.deleteOne(id);
        collection = client.db(db).collection('users');
        let response = await collection.findOneAndUpdate({"email": data["email"]},{$set:{"password": data["password"], "verified": true}});
        if(!response['lastErrorObject']['updatedExisting']){
            return res.status(500).json({"detail": "Something Went Wrong"})
        }
        return res.status(200).json({"detail": "Success"})
    }
    catch(error){
        console.log(error);
        return res.status(500).json({"detail": "Something Went Wrong"})
    }
})

app.get("/pizza_list", async (req, res)=>{
    let client  = await mongoClient.connect(mongodb_url);
    let collection = client.db(db).collection('pizzas');
    let result = await collection.find().toArray();
    return res.status(200).json(result);
})

app.post("/payment", async (req, res)=>{
    payment.orders.create()
})

app.listen(port, ()=>console.log(`Server Started on Port-${port}`))