const express = require('express');
const router = express.Router();

const {getTransactions, addTransactions, deleteTransaction,updateTransaction } = require('../controllers/transaction.controller');
const { protectRoutes } = require('../middleware/auth.middleware')

router.get('/', protectRoutes, getTransactions);
router.post('/', protectRoutes, addTransactions);
router.patch('/', protectRoutes, updateTransaction)
router.delete('/:id', protectRoutes, deleteTransaction)

module.exports = router;