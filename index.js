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

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.t2yvp.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// verifyToken
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden acess" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const toolCollection = client.db("drill_manufacturer").collection("tools");
    const orderCollection = client
      .db("drill_manufacturer")
      .collection("orders");

    const userCollection = client.db("drill_manufacturer").collection("users");
    const reviewCollection = client
      .db("drill_manufacturer")
      .collection("reviews");
    const userDataCollection = client
      .db("drill_manufacturer")
      .collection("userData");

    //verify admin
    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "forbidden" });
      }
    };

    //   tools
    app.get("/tools", async (req, res) => {
      const query = {};
      const tools = await toolCollection.find(query).toArray();
      res.send(tools);
    });

    app.get("/tool/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectID(id) };
      const tool = await toolCollection.findOne(query);
      res.send(tool);
    });

    // orders
    app.post("/order", async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.send(result);
    });
    app.get("/order", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email === decodedEmail) {
        const query = { email: email };
        const result = await orderCollection.find(query).toArray();
        return res.send(result);
      } else {
        return res.status(403).send({ message: "forbidden access" });
      }
    });
    app.get("/singleorder/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectID(id) };
      const result = await orderCollection.findOne(query);
      res.send(result);
      console.log("ki");
    });
    app.delete("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectID(id) };
      const result = await orderCollection.deleteOne(filter);
      res.send(result);
    });
    app.patch("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectID(id) };
      const payment = req.body;
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };

      const result = await orderCollection.updateOne(filter, updatedDoc);

      res.send(result);
    });

    // get admin data
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });

    // admin
    app.put("/user/admin/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updatedDoc = {
        $set: { role: "admin" },
      };

      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // user
    app.get("/user", verifyJWT, async (req, res) => {
      const result = await userCollection.find().toArray();
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
    app.post("/create_payment_intent", async (req, res) => {
      const product = req.body;
      const price = product.totalPrice;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    //   review
    app.post("/review", async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });
    app.get("/reviews", async (req, res) => {
      const query = {};
      const result = await reviewCollection.find(query).toArray();
      res.send(result);
    });

    // myprofile
    app.get("/myprofile/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const result = await userDataCollection.findOne(filter);
      res.send(result);
    });

    app.put("/user/profile/:email", async (req, res) => {
      const email = req.params.email;
      console.log("Email :", email);

      const profile = req.body;
      // console.log(profile);
      console.log(profile);
      const filter = { email: email };
      const options = { upsert: true };
      const updatedDoc = {
        $set: profile,
      };
      const result = await userDataCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(updatedDoc);
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
