const express = require('express');
require ("dotenv").config();
const jwt =require("jsonwebtoken");
const port=process.env.PORT || 5000;

// middleware
const app=express();
const cors= require("cors");
app.use(cors());
app.use(express.json());



app.get("/", (req,res)=>{
    res.send("drill machine server has started")
})

app.listen(port,()=>{
    console.log('drill server listening port is ', port);
})