const { boolean } = require('joi');
const { mongoose, conn } = require('../config/connection');

var membershipPriceHistorySchema = new mongoose.Schema({
    user_membership_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userMembership',
        required: true
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    membership_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'membership',
        required: true
    },
    price: {
        type: String,
        default: '',
    },
    changed_price: {
        type: String,
        default: '',
    },
    change_date: {
        type: Date,
        default: ''
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }

}, { versionKey: false, timestamps: true });
membershipPriceHistorySchema.index({ user_membership_id: 1 });

module.exports = conn.model('membership_price_history', membershipPriceHistorySchema);
