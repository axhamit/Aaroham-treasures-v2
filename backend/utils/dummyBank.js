// Dummy Bank Verification System
// This is a mock implementation for testing purposes
// In production, this would integrate with actual bank APIs

class DummyBank {
  constructor() {
    // Simulate bank accounts
    this.accounts = new Map();
    this.transactions = new Map();
    this.initializeDummyAccounts();
  }

  initializeDummyAccounts() {
    // Add some dummy bank accounts for testing
    this.accounts.set('HDFC123456', {
      accountNumber: 'HDFC123456',
      accountHolder: 'Test User',
      balance: 100000,
      bankName: 'HDFC Bank',
    });

    this.accounts.set('ICICI789012', {
      accountNumber: 'ICICI789012',
      accountHolder: 'Another User',
      balance: 50000,
      bankName: 'ICICI Bank',
    });
  }

  // Verify a transaction
  async verifyTransaction(transactionId, amount) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // For demo purposes, accept any transaction ID that starts with 'TXN'
    if (transactionId && transactionId.startsWith('TXN')) {
      return {
        success: true,
        transactionId,
        amount,
        status: 'completed',
        timestamp: new Date().toISOString(),
        bankName: 'Demo Bank',
      };
    }

    // If no transaction ID provided, assume cash payment
    if (!transactionId) {
      return {
        success: true,
        transactionId: 'CASH-' + Date.now(),
        amount,
        status: 'completed',
        timestamp: new Date().toISOString(),
        bankName: 'Cash Payment',
      };
    }

    // Invalid transaction ID
    return {
      success: false,
      error: 'Invalid transaction ID',
    };
  }

  // Verify UPI payment
  async verifyUPIPayment(upiId, amount) {
    await new Promise(resolve => setTimeout(resolve, 500));

    // For demo, accept any UPI ID
    if (upiId && upiId.includes('@')) {
      return {
        success: true,
        transactionId: 'UPI-' + Date.now(),
        amount,
        status: 'completed',
        timestamp: new Date().toISOString(),
        upiId,
      };
    }

    return {
      success: false,
      error: 'Invalid UPI ID',
    };
  }

  // Get account balance (for dashboard)
  async getAccountBalance(accountNumber) {
    await new Promise(resolve => setTimeout(resolve, 300));

    const account = this.accounts.get(accountNumber);
    if (account) {
      return {
        success: true,
        balance: account.balance,
        accountHolder: account.accountHolder,
        bankName: account.bankName,
      };
    }

    return {
      success: false,
      error: 'Account not found',
    };
  }

  // Add a transaction record
  addTransaction(transaction) {
    this.transactions.set(transaction.transactionId, {
      ...transaction,
      createdAt: new Date(),
    });
  }

  // Get transaction history
  getTransactionHistory(accountNumber) {
    const history = [];
    for (const [id, txn] of this.transactions.entries()) {
      if (txn.accountNumber === accountNumber) {
        history.push(txn);
      }
    }
    return history.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

// Export singleton instance
const dummyBank = new DummyBank();

module.exports = dummyBank;
