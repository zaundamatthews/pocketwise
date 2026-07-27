const express = require('express');
const mongoose = require('mongoose');

const Transaction = require('../models/Transaction');

async function getTransactions(req, res) {
    try {
        const transactions = await Transaction.find({
            user: req.user._id,
        }).sort({ date: -1 })
        return res.status(200).json({
            success: true,
            message: "Successfully retreieved all transactions",
            transactions,
        });
    } catch(error) {
        console.error('Get transactions error:', error);
        
        return res.status(500).json({
            success: false,
            message: "Unable to retrieve transactions",
            error: error.message
        })
    }
}
async function addTransactions(req,  res) {
    try {
        const {
            type,
            amount,
            category,
            description,
            date
        } = req.body;

        if(!type || amount === undefined) {
            return res.status(400).json({
                success: false,
                message: "Transaction and amount are required"
            });
        }
        const transaction = await Transaction.create({
            user: req.user._id,
            type,
            amount,
            category,
            description,
            date
        });
        return res.status(201).json({
            success: true,
            message: "Transaction created successfully",
            transaction
        })
    } catch(error) {
        return res.status(400).json({
            success: false,
            message: "Unable to create transactions",
            error: error.message
        })
    }
}
async function deleteTransaction(req, res) {
    try {
        const { id } = req.params;
        if(!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid transaction ID",
            });
        }
        const transaction = await Transaction.findOneAndDelete({
            _id: id,
            user: req.user._id
        });
        if(!transaction) {
            return res.status(404).json({
                success: false,
                message: "Transaction not found",
            });
        }
        return res.status(200).json({
            success: true,
            message:"Transaction deleted successfully"
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Unable to delete transaction"
        })
    }
}
async function updateTransaction(req, res) {
    try {
        const { id }  = req.params;

        if(!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid transaction ID",
            });
        }

        const allowedUpdates = [
            "type",
            "amount",
            "category",
            "description",
            "date"
        ];
        const updates = {};

        for(const field of allowedUpdates) {
            if(req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        if(Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please provide at least one field to update",
            });
        }
       
        const transaction = await Transaction.findOneAndUpdate(
            {
                _id: id,
                user: req.user._id,
            },
            updates,
            {
                new: true,
                runValidators: true,
            }
        );

        if(!transaction) {
            return res.status(404).json({
                success: false,
                message: "Transaction not found",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Transaction updated successfully",
            transaction,
        })
    } catch (error) {
        console.error("Update transaction error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update transaction",
        })
    }
}
module.exports = {getTransactions,
                 addTransactions,
                 deleteTransaction,
                 updateTransaction
                  }