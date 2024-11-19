const { Schema, model } = require('mongoose');
const { mongoose, conn } = require('../config/connection');

let deviceTokenSchema = new mongoose.Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    device_token: {
        type: String,
        required: true
    },
    device_type: {
        type: String,
        enum: ['ios', 'android'],
        default: 'ios'
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
        required: true
    },

}, { versionKey: false, timestamps: true });
deviceTokenSchema.index({ user_id: 1 });

module.exports = conn.model('deviceToken', deviceTokenSchema);