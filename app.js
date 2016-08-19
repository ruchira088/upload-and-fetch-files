const {MongoClient, Binary} = require("mongodb")
const express = require("express")
const multer = require("multer")
const http = require("http")
const fs = require("fs")
const path = require("path")

const MONGO_DB_CONNECTION_URL = "mongodb://localhost:27017/images"
const MONGO_DB_COLLECTION = "profileImages"
const PORT = 8001

const app = express()

const createRandomString = () => Math.random().toString(36).substring(2)

MongoClient.connect(MONGO_DB_CONNECTION_URL)
    .then(db =>
    {
        console.log("Successfully connected to the database.")

        app.route("/images/:imageId?/:imageName?")
            .post(multer().any(), ({files}, response) =>
            {
                if (files.length === 0)
                {
                    response.status(400).json({error: "Image not found."})
                } else
                {
                    Promise.all(files.map(file =>
                    {
                        const id = createRandomString()
                        const {originalname, mimetype, buffer} = file

                        const fileDocument = {
                            id,
                            fileName: originalname,
                            mimeType: mimetype,
                            data: new Binary(buffer)
                        }

                        return db.collection(MONGO_DB_COLLECTION)
                                .insertOne(fileDocument)
                                .then(() => ({fileName: originalname, id}))
                    }))
                        .then(files =>
                        {
                            response.status(200).json({savedFiles: files})
                        })
                        .catch(error => response.status(500).json({error}))
                }

            })
            .get(({params: {imageId, imageName}}, response) =>
            {
                db.collection(MONGO_DB_COLLECTION)
                    .find({id: imageId, fileName: imageName})
                    .limit(1).toArray().then(([image]) => {
                        if(image)
                        {
                            console.log(image)
                            response.set({"Content-Type": image.mimeType})
                            response.send(image.data.buffer)
                        } else
                        {
                            response.status(404).send()
                        }
                })
            })

        app.route("/*")
            .all((request, response) => response.status(404).send("Not found."))

        http.createServer(app).listen(PORT, () => console.log(`Server is listening on port ${PORT}`))

    })
    .catch(err => console.log(err))


