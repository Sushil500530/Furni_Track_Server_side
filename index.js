const express = require('express');
const cors = require('cors');
require('dotenv').config();
const cookieParser = require('cookie-parser')
var jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();
const port = process.env.PORT || 5000;

// middleware 
app.use(cors({
  origin: [
    "https://furniture-shop.surge.sh",
    "furniture-shop.surge.sh",
    "http://localhost:5173",
    "http://localhost:5174",
  ],
  credentials: true,
  optionsSuccessStatus: 200,
}));
app.use(express.json());
app.use(cookieParser());


const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.PASS_DB}@cluster0.ruakr2a.mongodb.net/?retryWrites=true&w=majority`;

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
    const userCollection = client.db('bookreaderDB').collection('users')
    const managersCollection = client.db('bookreaderDB').collection('managers')
    const categoriesCollection = client.db('bookreaderDB').collection('categories')
    const furnituresCollection = client.db('bookreaderDB').collection('furnitures')
    const salesCollection = client.db('bookreaderDB').collection('sales')
    const favoritesCollection = client.db('bookreaderDB').collection('favorites')
    const paymentsCollection = client.db('bookreaderDB').collection('favorites')

    // authentication token related api 
    app.post('/jwt', (req, res) => {
      try {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, { expiresIn: '150d' });
        // console.log('token is ------>', token);
        res.cookie('token', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'none'
        }).send({ success: true, token })
      }
      catch (error) {
        console.log(error);
      }
    })
    // verify token 
    const verifyToken = async (req, res, next) => {
      try {
        const token = req.cookies?.token;
        // console.log('token is found?-------->', token);
        if (!token) {
          return res.status(401).send({ message: 'not authorized access' })
        }
        jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, (error, decode) => {
          if (error) {
            return res.status(401).send({ message: 'unAuthorized access why' })
          }
          req.user = decode;
          next();
        })
      }
      catch (error) {
        res.status(401).send({ success: false, message: error.message })
      }
    }

    // post method start 
    app.post('/logout', async (req, res) => {
      try {
        const user = req.body;
        // console.log('log out user is in---->', user);
        res.clearCookie('token', { maxAge: 0, sameSite: 'none', secure: true }).send({ success: true })
      }
      catch (error) {
        console.log(error);
      }
    })

    // user related api 
    app.get('/users', async (req, res) => {
      try {
        const result = await userCollection.find().toArray();
        res.send(result)
      }
      catch (error) {
        console.log(error);
      }
    })
    app.get('/users/:email', verifyToken, async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: email }
        const result = await userCollection.findOne(query);
        res.send(result)
      }
      catch (error) {
        console.log(error);
      }
    })
    app.put('/user/:id', async (req, res) => {
      try {
        const changes = req.body;
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) }
        const options = { upsert: true };
        const updateDoc = {
          $set: {
            ...changes
          },
        };
        // console.log('what element is the changes ====>', updateDoc);
        const result = await userCollection.updateOne(filter, updateDoc, options);
        res.send(result)
      }
      catch (error) {
        console.log(error);
      }
    })
    // post method 
    app.post('/users', async (req, res) => {
      try {
        const userData = req.body;
        const query = { email: userData?.email };
        const existedUser = await userCollection.findOne(query);
        if (existedUser) {
          return res.send({ message: "user already existed in", insertedId: null })
        }
        const result = await userCollection.insertOne(userData);
        res.send(result)
      }
      catch (error) {
        console.log(error);
      }
    })
    // user role change 
    app.patch('/change-role/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const rolechangeData = req.body;
        const query = { _id: new ObjectId(id) }
        const options = { $upsert: true };
        const updataDoc = {
          $set: {
            ...rolechangeData
          }
        }
        const result = await userCollection.updateOne(query, updataDoc, options);
        res.send(result);
      }
      catch (error) {
        console.log(error);
      }
    });
    //  manager delete 
    app.delete('/user-delete/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) }
        const result = await userCollection.deleteOne(filter);
        res.send(result);
      }
      catch (error) {
        console.log(error);
      }
    });

    // manager related api 
    app.get('/managers', verifyToken, async (req, res) => {
      try {
        const result = await managersCollection.find().toArray();
        res.send(result)
      }
      catch (error) {
        console.log(error);
      }
    })
    // manager related api 
    app.get('/manager', verifyToken, async (req, res) => {
      try {
        const email = req.query.email;
        const filter = { email: email };
        const result = await managersCollection.find(filter).toArray();
        res.send(result)
      }
      catch (error) {
        console.log(error);
      }
    })
    //  manager delete 
    app.delete('/manager-delete/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        const result = await managersCollection.deleteOne(query);
        res.send(result);
      }
      catch (error) {
        console.log(error);
      }
    });
    // patch method here 
    app.patch('/managers', verifyToken, async (req, res) => {
      try {
        const manager = req.body;
        // console.log(manager);
        const email = req.user?.email;
        const find = { email: email };
        const filter = { role: manager?.role }
        const updateDoc = {
          $set: {
            ...filter
          }
        }
        const existedUser = await userCollection.findOne(find);
        const setUser = await userCollection.updateOne(existedUser, updateDoc);
        const result = await managersCollection.insertOne(manager);
        res.send(result);
      }
      catch (error) {
        console.log(error);
      }
    })
    // managers post data from ui layout
    app.post('/furniture', async (req, res) => {
      try {
        const product = req.body;
        const result = await furnituresCollection.insertOne(product);
        res.send(result)

      }
      catch (error) {
        console.log(error);
      }
    })
    // update furniture product 
    app.patch('/updated/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const updateData = req.body;
        const query = { _id: new ObjectId(id) }
        const options = { $upsert: true };
        const updataDoc = {
          $set: {
            ...updateData
          }
        }
        const result = await furnituresCollection.updateOne(query, updataDoc, options);
        res.send(result);
      }
      catch (error) {
        console.log(error);
      }
    });

    //  furniture delete 
    app.delete('/furniture-delete/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        const result = await furnituresCollection.deleteOne(query);
        res.send(result);
      }
      catch (error) {
        console.log(error);
      }
    });
    app.get('/categories', async (req, res) => {
      try {
        const result = await categoriesCollection.find().toArray();
        res.send(result)
      }
      catch (error) {
        console.log(error);
      }
    })
    // get furniture data 
    app.get('/furnitures', async (req, res) => {
      try {
        const result = await furnituresCollection.find().toArray();
        res.send(result)
      }
      catch (error) {
        console.log(error);
      }
    })
    app.get('/furniture/:category', async (req, res) => {
      try {
        const category = req.params.category;
        const query = { category: category }
        const result = await furnituresCollection.find(query).toArray();
        res.send(result)
      }
      catch (error) {
        console.log(error);
      }
    })
    app.get('/furnitures/:id', async (req, res) => {
      try {
        const id = req.params?.id;
        const query = { _id: new ObjectId(id) }
        const result = await furnituresCollection.findOne(query);
        res.send(result)
      }
      catch (error) {
        console.log(error);
      }
    })
    // favorites data collection is here 
    // get method is here 
    app.get('/favorites', async (req, res) => {
      try {
        const result = await favoritesCollection.find().toArray();
        res.send(result);
      }
      catch (error) {
        console.log(error);
      }

    })
    app.get('/favorites', async (req, res) => {
      try {
        const email = req.query.email;
        const query = { email: email }
        // console.log('query email is here ====>',query);
        const result = await favoritesCollection.find(query).toArray();
        res.send(result);
      }
      catch (error) {
        console.log(error);
      }
    });
    app.post('/favorites', async (req, res) => {
      try {
        const favoriteData = req.body;
        const result = await favoritesCollection.insertOne(favoriteData);
        res.send(result)
      }
      catch (error) {
        console.log(error);
      }
    })
    app.delete('/favorite/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        // console.log('query email is here ====>',query);
        const result = await favoritesCollection.deleteOne(query);
        res.send(result);
      }
      catch (error) {
        console.log(error);
      }
    });
    // sales collection data is here 
    // get data 
    app.get('/sales', async (req, res) => {
      try {
        const result = await salesCollection.find().toArray();
        res.send(result);
      }
      catch (error) {
        console.log(error);
      }

    })
    app.get('/sale', async (req, res) => {
      try {
        const email = req.query.email;
        const query = { email: email }
        // console.log('query email is here ====>',query);
        const result = await salesCollection.find(query).toArray();
        res.send(result);
      }
      catch (error) {
        console.log(error);
      }
    })

    app.post('/sales', async (req, res) => {
      try {
        const saleData = req.body;
        const result = await salesCollection.insertOne(saleData);
        res.send(result)
      }
      catch (error) {
        console.log(error);
      }
    })
    app.delete('/sale/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await salesCollection.deleteOne(query);
        res.send(result)
      }
      catch (error) {
        console.log(error);
      }
    })
    app.delete('/all-sale/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await salesCollection.deleteOne(query);
        res.send(result)
      }
      catch (error) {
        console.log(error);
      }
    })

    // payment related api here

    app.post('/create-payment', async (req, res) => {
      try {
        const { price } = req.body;
        const convertedPrice = parseInt(price * 100);
        // console.log('your price is=======>',convertedPrice);
        const paymentNow = await stripe?.paymentIntents?.create({
          amount: convertedPrice,
          currency: 'usd',
          payment_method_types: ['card']
        });
        res.send({ clientSecret: paymentNow?.client_secret })
      }
      catch (error) {
        console.log(error);
      }
    })


    // get method for payments 

    app.get('/payments', async (req, res) => {
      try {
        const result = await paymentsCollection.find().toArray();
        res.send(result)
      }
      catch (error) {
        console.log(error);
      }
    })
    // query from email 
    app.get('/payment', async (req, res) => {
      try {
        const email = req.query.email;
        const query = { email: email }
        // console.log('my payment email  is =====>', query);
        const result = await paymentsCollection.find(query).toArray();
        res.send(result)
      }
      catch (error) {
        console.log(error);
      }
    })
    app.delete('/payment/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        const result = await paymentsCollection.deleteOne(query);
        res.send(result)
      }
      catch (error) {
        console.log(error);
      }
    })
    app.post('/payments', async (req, res) => {
      try {
        const paymentInfo = req.body;
        const paymentResult = await paymentsCollection.insertOne(paymentInfo);
        const query = {
          _id: {
            $in: paymentInfo?.saleIds?.map(id => new ObjectId(id))
          }
        }
        const deleteResult = await salesCollection.deleteMany(query);
        res.send({ paymentResult, deleteResult })
      }
      catch (error) {
        console.log(error);
      }
    })
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);










app.get('/', (req, res) => {
  res.send("Server is Running Now.....")
})
app.listen(port, () => {
  console.log(`Server Running on port: ${port}`);
})