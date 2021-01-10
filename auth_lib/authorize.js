const mongodb = require("mongodb")
const mongoClient = mongodb.MongoClient;
const object_id = mongodb.ObjectID;
const mongodb_url = process.env.mongo_url;
const jwt = require('jsonwebtoken');

async function Authorize(req, res, next){
    try{
        let valid = await jwt.verify(req.headers.authorization, process.env.CODE);
        if(valid){
            req.body["user_id"] = object_id(valid["user_id"]);
            req.body["email"] = valid["email"];
            next();
        }
        else{
            return res.status(403).json({"detail": "User Not Authorised, Please Login"})
        }
    }
    catch(err){
        console.log(err.message)
        return res.status(403).json({"detail": "User Not Authorised, Please Login"})
    }
}

async function Edit_check(req, res, next){
    try{
        let valid = await jwt.verify(req.headers.authorization, process.env.CODE);
        if(valid){
            let client  = await mongoClient.connect(mongodb_url);
            let collection = client.db("guvi_DailyTask(DT)_12-05-2020").collection('replies');
            let result = await collection.find({"_id": object_id(req.body["id"])}).toArray();
            client.close();
            if(result.length == 0 || String(result[0]["user_id"]) != valid["user_id"]){
                return res.status(403).json({"detail": "You doesn't enough Pemissions, You can only edit your replies"})
            }
            req.body["user_id"] = object_id(valid["user_id"]);
            next();
        }
        else{
            return res.status(403).json({"detail": "You doesn't enough Pemissions"})
        }
    }
    catch(err){
        return res.status(403).json({"detail": "You doesn't enough Pemissions"})
    }
}

async function Delete_check(req, res, next){
    try{
        let valid = await jwt.verify(req.headers.authorization, process.env.CODE);
        if(valid){
            let client  = await mongoClient.connect(mongodb_url);
            let collection = client.db("guvi_DailyTask(DT)_12-05-2020").collection('replies');
            let result = await collection.find({"_id": object_id(req.body["id"])}).toArray();
            client.close();
            if(result.length == 0 || String(result[0]["user_id"]) != valid["user_id"] || valid["role"] != "ADMIN"){
                return res.status(403).json({"detail": "You have to be admin user, Not enough permissions"})
            }
            req.body["user_id"] = object_id(valid["user_id"]);
            next();
        }
        else{
            return res.status(403).json({"detail": "You have to be admin user, Not enough permissions"})
        }
    }
    catch(err){
        return res.status(403).json({"detail": "You have to be admin user, Not enough permissions"})
    }
}

module.exports = {Authorize, Edit_check, Delete_check}