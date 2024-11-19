const { mongoose, conn } = require('../config/connection');

let userGiftCardsSchema = new mongoose.Schema({
    giftedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: false
    },
    boutiqueId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'boutique',
        required: false
    },
    transactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'transaction',
        required: false
    },
    recipient_name: {
        type: String,
        required: false,
    },
    recipient_number: {
        type: String,
        required: false,
    },
    recipient_phone_code: {
        type: String,
        required: false,
    },
    recipient_country_code: {
        type: String,
        required: false,
    },
    recipient_message: {
        type: String,
        required: false,
    },
    delivery_date: {
        type: String,
        required: false,
    },
    delivery_time: {
        type: String,
        required: false,
    },
    price: {
        type: String,
        required: false,
    },
    code: {
        type: String,
        required: false,
    },
    isRedeem: {
        type: Boolean,
        default: false,
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }

}, { versionKey: false, timestamps: true });

module.exports = userGiftCard = conn.model('userGiftCards', userGiftCardsSchema);
