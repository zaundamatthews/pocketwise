const mongoose = require('mongoose');

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONG_URI_FALL_BACK);
        console.log('MongooDB connected successfully!');
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        process.exit(1);
    }
}

module.exports = connectDB;

