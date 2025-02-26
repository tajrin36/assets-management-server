const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
require('dotenv').config();
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const morgan = require('morgan');
const port = process.env.PORT || 5000;

// middleware
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
// app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err);
      return res.status(401).send({ message: 'unauthorized access' });
    }
    req.user = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yg5xo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const db = client.db('assets-management');
    const usersCollection = db.collection('users');
    const assetsCollection = db.collection('assets');

    // save or update a user in db

    // original
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
        role: 'employee',
        timestamp: Date.now(),
      });
      res.send(result);
    });

    // Add a new asset (Only for HR Manager)
    app.post('/assets', verifyToken, async (req, res) => {
      const assetsData = req.body;
      const result = await assetsCollection.insertOne(assetsData);
      console.log(result);
      res.send(result);
    });

    // Get All Assets with Search, Filter & Sorting
    app.get('/assets', async (req, res) => {
      try {
        const { search, stock, type, sort } = req.query;
        let query = {};

        // Search by Product Name
        if (search) {
          query.productName = { $regex: search, $options: 'i' };
        }

        // Filter by Stock Status
        if (stock === 'available') {
          query.productQuantity = { $gt: 0 };
        } else if (stock === 'out-of-stock') {
          query.productQuantity = 0;
        }

        // Filter by Product Type
        if (type) {
          query.productType = type;
        }

        // Sorting by Quantity
        let sortOptions = {};
        if (sort === 'asc') {
          sortOptions.productQuantity = 1;
        } else if (sort === 'desc') {
          sortOptions.productQuantity = -1;
        }

        const assets = await assetsCollection
          .find(query)
          .sort(sortOptions)
          .toArray();
        res.json(assets);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch assets' });
      }
    });

    // Generate jwt token
    app.post('/jwt', async (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '365d',
      });
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true });
    });

    // Logout
    app.get('/logout', async (req, res) => {
      try {
        res
          .clearCookie('token', {
            maxAge: 0,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          })
          .send({ success: true });
      } catch (err) {
        res.status(500).send(err);
      }
    });
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('hello from assets server...');
});

app.listen(port, () => {
  console.log(`server is running on port:${port}`);
});