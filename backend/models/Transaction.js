const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref:"User",
            required:true,
        },

        type: {
            type: String,
            enum:['income', 'expense'],
            required: true
        }, 


        amount :{
            type: Number,
            required: true,
            min: 0.01
        },
        category: {
            type: String,
            enum: [
                "Food & Drinks",
                "Transport",
                "Accommodation",
                "Education",
                "Entertainment",
                "Others",
                "Salary"
            ],
            default: "Others"
        },
        description:{
            type: String,
            default: "",
            trim: true,
        },
      
        score: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
          date: {
            type: Date,
            default: Date.now
        },
    },
    {
        timestamps: true,
    }
);
module.exports = mongoose.model("Transaction", transactionSchema)