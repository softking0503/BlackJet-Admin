const { mongoose, conn } = require('../config/connection');


let refundHistorySchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
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
    pet_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user_pet_mapping',
        required: false
    },
    transaction_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'transaction',
        required: false
    },
    items_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'item',
        required: false
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
    effectiveCancelDate: {
        type: Date,
        default: null, // Default to null to allow it to be empty
    },
    refunded: {
        type: Boolean,
        default: false
    },
    refundedType: {
        type: String,
        default: ""
    },
    refundAmount: {
        type: String,
        default: ""
    },
    refund: {
        type: String,
        enum: ['Partial Refunded', "Refunded"],
        default: "Refunded"
    },
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active"
    }

}, { versionKey: false, timestamps: true });
refundHistorySchema.index({ user_id: 1 });
refundHistorySchema.index({ membership_id: 1 });
refundHistorySchema.index({ boutique_id: 1 });
refundHistorySchema.index({ booking_id: 1 });
refundHistorySchema.index({ pet_id: 1 });
module.exports = User = conn.model('RefundHistory', refundHistorySchema);
