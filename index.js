const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;

// middleware
const app = express();
const cors = require("cors");
const { ObjectID } = require("bson");
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.t2yvp.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// verifyToken
function verifyJWT(req, res, next) {}

async function run() {
  try {
    const toolCollection = client.db("drill_manufacturer").collection("tools");
    const orderCollection = client
      .db("drill_manufacturer")
      .collection("orders");

    const userCollection = client.db("drill_manufacturer").collection("users");

    console.log("connected");

    //   tools
    app.get("/tools", async (req, res) => {
      const tools = await toolCollection.find().toArray();
      res.send(tools);
    });
    app.get("/tool/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectID(id) };
      const tool = await toolCollection.findOne(query);
      res.send(tool);
      console.log("hi");
    });

    // orders
    app.post("/order", async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.send(result);
    });

    // user
    app.get("/user", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    // make admin api
    app.put("/user/admin/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updatedDoc = {
        $set: { role: "admin" },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET);
      res.send({ result, token });
    });
  } finally {
  }
}

app.get("/", async (req, res) => {
  res.send("drill server started");
});

app.listen(port, () => {
  console.log("drill server listening port is ", port);
});
run().catch(console.dir);
