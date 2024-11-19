const { boolean } = require('joi');
const { mongoose, conn } = require('../config/connection');

var paymentSchema = new mongoose.Schema({
    cardId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    purchaseTransactionId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false
    },
    booking_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'booking',
        required: false
    },
    pet_id: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user_pet_mapping',
        required: false
    }],
    boutique_id: {
        type: String,
        default: ""
    },
    price: {
        type: String,
        default: ""
    },
    normalPrice: {
        type: String,
        default: ""
    },
    initiationFees: {
        type: String,
        default: ""
    },
    normalInitiationFees: {
        type: String,
        default: ""
    },
    transactionId: {
        type: String,
        default: ""
    },
    name: {
        type: String,
        default: ""
    },
    type: {
        type: String,
        default: ""
    },
    image: {
        type: String,
        default: ""
    },
    emailSubject: {
        type: String,
        default: ""
    },
    method: {
        type: String,
        default: ""
    },
    is_failed: {
        type: Boolean,
        default: false
    },
    complimentary: {
        type: Boolean,
        default: false
    },
    details: {
        type: {},
        default: {}
    },
    timeOutId: {
        type: Number
    },
    transactionType: {
        type: String,
        enum: ['airwallex', 'hellozai'],
        default: 'airwallex'
    },
    paymentStatus: {
        type: String,
        default: ""
    },
    reset_voucher: {
        type: Number,
        default: 0
    },
    refunded: {
        type: Boolean,
        default: false
    },
    refundAmount: {
        type: String,
        default: ""
    },
    invoiceNumber: {
        type: String,
        default: ""
    },
    invoiceUrl: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    refund: {
        type: String,
        enum: ['Partial Refunded', "Refunded"],
        default: "Refunded"
    },
    count: {
        type: Number,
        default: 0,
    }
}, { versionKey: false, timestamps: true });

module.exports = conn.model('payment', paymentSchema);
