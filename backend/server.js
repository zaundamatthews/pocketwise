require('dotenv').config();
// Forces Node.js to use Google & Cloudflare DNS
const dns = require('node:dns');
dns.setServers(['8.8.8.8', '1.1.1.1']); 
const express = require('express');
const connectDB = require('./config/database');
const cors = require('cors')
const authRoutes = require('./routes/auth.routes');
const transactionRoutes = require('./routes/transaction.routes');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.use(cors({
  origin: [
    "http://localhost:5500",
    "http://127.0.0.1:5500"
  ]
}))
// health check
app.get('/', (req, res)=> {
    res.json({
        success: true,
        message:'Pocketwise API is running successfully!'
    })
});
// auth routes
app.use('/api/auth', authRoutes);
// transaction routes
app.use('/api/transactions', transactionRoutes)

async function startServer() {
    await connectDB();

    
app.listen(PORT, () =>{
    console.log(`Server running on port ${PORT}`);
});
}
startServer();