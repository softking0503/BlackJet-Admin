const { mongoose, conn } = require('../config/connection');


let failedCardSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: false
    },
    cardId: {
        type: String,
        required: false
    },
    paymentMethod: {
        type: String,
        required: false
    },
    cardholderName: {
        type: String,
        required: false
    },
    cardNumber: {
        type: String,
        required: false
    },
    cardType: {
        type: String,
        required: false
    },
    cardIssue: {
        type: String,
        required: false
    },
    expiry: {
        type: String,
        required: false
    },
    isActive: {
        type: Boolean,
        default: false
    },
    statusCode: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },

}, { versionKey: false, timestamps: true });
module.exports = conn.model('failedCard', failedCardSchema);
