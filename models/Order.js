
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    name: String,
    price: Number,
    quantity: Number
  }],

  // סכום המוצרים לפני משלוח
  subtotal: {
    type: Number,
    min: 0
  },

  // עלות המשלוח
  shippingFee: {
    type: Number,
    min: 0,
    default: 0
  },

  // סכום סופי כולל משלוח
  total: {
    type: Number,
    required: true,
    min: 0
  },

  customer: {
    fullName: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },

    city: { type: String, trim: true },
    street: { type: String, trim: true },
    houseNumber: { type: String, trim: true },
    apartment: { type: String, trim: true },
    notes: { type: String, trim: true }
  },

  paymentMethod: {
    type: String,
    enum: ['cash', 'card_demo'],
    default: 'cash'
  },

  paymentStatus: {
    type: String,
    enum: ['unpaid', 'demo'],
    default: 'unpaid'
  },

  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending'
  }

}, { timestamps: true });

module.exports = mongoose.model('Order', schema);
