const { mongoose, conn } = require('../config/connection');


let transactionSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    card_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'card',
        required: false
    },
    membership_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'membership',
        required: false
    },
    boutique_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'boutique',
        required: false
    },
    booking_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'booking',
        required: false
    },
    pet_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user_pet_mapping',
        required: false
    },
    details: {
        type: {},
        default: {}
    },
    type: {
        type: String,
        default: ""
    },
    name: {
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
    renewal_date: {
        type: Date
    },
    image: {
        type: String,
        default: ""
    },
    refunded: {
        type: Boolean,
        default: false
    },
    refundAmount: {
        type: String,
        default: ""
    },
    is_failed: {
        type: Boolean,
        default: false
    },
    timeOutId: {
        type: Number
    },
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active"
    },
    items_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'item',
        required: false
    },
    reset_voucher: {
        type: Number,
        default: 0
    }

}, { versionKey: false, timestamps: true });
transactionSchema.index({ user_id: 1 });
transactionSchema.index({ membership_id: 1 });
transactionSchema.index({ boutique_id: 1 });
transactionSchema.index({ booking_id: 1 });
transactionSchema.index({ pet_id: 1 });
transactionSchema.index({ status: 1 });
module.exports = User = conn.model('transaction', transactionSchema);
