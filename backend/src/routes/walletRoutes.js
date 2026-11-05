const express = require('express');
const requireAuth = require('../middlewares/auth');
const { getWallet, topup, transfer, getTransactions } = require('../controllers/walletController');

const router = express.Router();

// Semua endpoint wallet wajib login -> requireAuth (satpam) dijalankan dulu
router.get('/wallet', requireAuth, getWallet);
router.post('/topup', requireAuth, topup);
router.post('/transfer', requireAuth, transfer);
router.get('/transactions', requireAuth, getTransactions);

module.exports = router;
