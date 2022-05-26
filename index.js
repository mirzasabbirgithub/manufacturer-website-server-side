const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.n949o.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
          try {
                    await client.connect();
                    const itemCollection = client.db('screwdriver').collection('items');
                    const reviewCollection = client.db('screwdriver').collection('review');
                    const purchasedCollection = client.db('screwdriver').collection('purchased');
                    const userCollection = client.db('screwdriver').collection('users');
                    const profileCollection = client.db('screwdriver').collection('profile');
                    const paymentCollection = client.db('screwdriver').collection('payments');

                    app.get('/item', async (req, res) => {
                              const query = {};
                              const cursor = itemCollection.find(query);
                              const items = await cursor.toArray();
                              res.send(items);
                    })

                    //Add Item API
                    app.post('/item', async (req, res) => {
                              const newItem = req.body;
                              const result = await itemCollection.insertOne(newItem);
                              res.send(result);
                    });


                    //Review APIs
                    app.post('/review', async (req, res) => {
                              const newComment = req.body;
                              const result = await reviewCollection.insertOne(newComment);
                              res.send(result);
                    });

                    app.get('/review', async (req, res) => {
                              const query = {};
                              const cursor = reviewCollection.find(query);
                              const reviews = await cursor.toArray();
                              res.send(reviews);
                    })

                    //purchased item
                    app.get('/item/:id', async (req, res) => {
                              const id = req.params.id;
                              const query = { _id: ObjectId(id) };
                              const item = await itemCollection.findOne(query);
                              res.send(item);
                    });

                    //get purchased item
                    app.get('/purchased', async (req, res) => {
                              const email = req.query.userEmail;
                              const query = { email: email };
                              const result = await purchasedCollection.find(query).toArray();
                              res.send(result);

                    })

                    //add purchased item
                    app.post('/purchased', async (req, res) => {
                              const purchased = req.body;
                              const result = await purchasedCollection.insertOne(purchased);
                              res.send(result);
                    })

                    //user get API
                    app.get('/user', async (req, res) => {
                              const users = await userCollection.find().toArray();
                              res.send(users);
                    });


                    //users API
                    app.put('/user/:email', async (req, res) => {
                              const email = req.params.email;
                              const user = req.body;
                              const filter = { email: email };
                              const options = { upsert: true };
                              const updateDoc = {
                                        $set: user,
                              };
                              const result = await userCollection.updateOne(filter, updateDoc, options);
                              res.send({ result, token });
                    });

                    //use Admin API
                    app.get('/admin/:email', async (req, res) => {
                              const email = req.params.email;
                              const user = await userCollection.findOne({ email: email });
                              const isAdmin = user.role === 'admin';
                              res.send({ admin: isAdmin })
                    })

                    //Admin API
                    app.put('/user/admin/:email', async (req, res) => {
                              const email = req.params.email;
                              const filter = { email: email };
                              const updateDoc = {
                                        $set: { role: 'admin' },
                              };
                              const result = await userCollection.updateOne(filter, updateDoc);
                              res.send(result);
                    })



                    //Delete API for item
                    app.delete('/item/:id', async (req, res) => {
                              const id = req.params.id;
                              const query = { _id: ObjectId(id) };
                              const result = await itemCollection.deleteOne(query);
                              res.send(result);
                    });


                    //Delete API for user
                    app.delete('/user/:id', async (req, res) => {
                              const id = req.params.id;
                              const query = { _id: ObjectId(id) };
                              const result = await userCollection.deleteOne(query);
                              res.send(result);
                    });

                    //Delete API for purchased item
                    app.delete('/purchased/:id', async (req, res) => {
                              const id = req.params.id;
                              const query = { _id: ObjectId(id) };
                              const result = await purchasedCollection.deleteOne(query);
                              res.send(result);
                    });


                    app.get('/updateprofile', async (req, res) => {
                              const id = req.id;
                              const query = {};
                              const result = await profileCollection.findOne(query);
                              res.send(result);
                    });

                    // add purchased item
                    app.put('/updateprofile/:id', async (req, res) => {
                              const id = req.params.id;
                              const updated = req.body;
                              const filter = { _id: ObjectId(id) };
                              const options = { upsert: true };
                              const updateDoc = {
                                        $set: updated,
                              };
                              const result = await profileCollection.insertOne(filter, updateDoc, options);
                              res.send(result);
                    })


                    // app.post('/updateprofile', async (req, res) => {
                    //           const profile = req.body;
                    //           const result = await profileCollection.insertOne(profile);
                    //           res.send(result);
                    // })


                    app.get('/purchased/:id', async (req, res) => {
                              const id = req.params.id;
                              const query = { _id: ObjectId(id) };
                              const booking = await purchasedCollection.findOne(query);
                              res.send(booking);
                    })



                    //create payment Intent
                    app.post('/create-payment-intent', async (req, res) => {
                              const service = req.body;
                              const price = service.price;
                              const amount = price * 100;
                              const paymentIntent = await stripe.paymentIntents.create({
                                        amount: amount,
                                        currency: 'usd',
                                        payment_method_types: ['card']
                              });
                              res.send({ clientSecret: paymentIntent.client_secret })
                    });

                    //paid API
                    app.patch('/purchased/:id', async (req, res) => {
                              const id = req.params.id;
                              const payment = req.body;
                              const filter = { _id: ObjectId(id) };
                              const updatedDoc = {
                                        $set: {
                                                  paid: true,
                                                  transactionId: payment.transactionId
                                        }
                              }

                              const result = await paymentCollection.insertOne(payment);
                              const updatedPurchased = await purchasedCollection.updateOne(filter, updatedDoc);
                              res.send(updatedPurchased);
                    })

          }
          finally {

          }
}

run().catch(console.dir);



app.get('/', (req, res) => {
          res.send('Hello From ScrewDrivers')
})

app.listen(port, () => {
          console.log(`Listening on port ${port}`)
})