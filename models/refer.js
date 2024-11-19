const { string } = require('joi');
const { mongoose, conn } = require('../config/connection');

var referSchema = new mongoose.Schema({
    name: {
        type: String,
        default: ""
    },
    expiry: {
        type: Date
    },
    phone_no: {
        type: String,
        default: ""
    },
    phone_code: {
        type: String,
        default: "+61"
    },
    refer_url: {
        type: String,
        default: ""
    },
    send_to: {
        type: String,
        default: ""
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: false
    },
    refer_status: {
        type: String,
        enum: ['pending', 'redeem', 'expired', 'complete', 'canceled', 'redeemed'],
        default: 'pending'
    },
    send_to_refer: {
        type: String,
        enum: ['pending', 'redeem', 'expired', 'complete', 'canceled', 'redeemed'],
        default: 'pending'
    },
    send_by_refer: {
        type: String,
        enum: ['pending', 'redeem', 'expired', 'complete', 'canceled', 'redeemed'],
        default: 'pending'
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, { versionKey: false, timestamps: true });
referSchema.index({ user_id: 1 });
referSchema.index({ refer_status: 1 });
referSchema.index({ status: 1 });

module.exports = conn.model('refer', referSchema);