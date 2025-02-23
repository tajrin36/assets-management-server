const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express()
require('dotenv').config()
// const cookieParser = require('cookie-parser')
// const jwt = require('jsonwebtoken')
// const morgan = require('morgan')
const port = process.env.PORT ||5000;

// middleware
app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yg5xo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    const db = client.db('assets-management');
    const usersCollection = db.collection('users');

    // save or update a user in db
    app.post('/users/:email', async (req, res) => {
        const email = req.params.email;
        const query = { email };
        const user = req.body;
        // check if user exist in db
        const isExist = await usersCollection.findOne(query);
        if (isExist) {
          return res.send(isExist);
        }
        const result = await usersCollection.insertOne({
          ...user,
          timestamp: Date.now(),
        });
        res.send(result);
      });
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/',(req,res)=>{
    res.send('hello from assets server...')
})

app.listen(port,()=>{
    console.log(`server is running on port:${port}`)
})