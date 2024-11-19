const { Schema, model } = require('mongoose');
const { mongoose, conn } = require('../config/connection');


let announcement = new mongoose.Schema({
    user_ids: [{
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    }],
    admin_id: {
        type: Schema.Types.ObjectId,
        ref: 'admin',
        required: true
    },
    title: {
        type: String,
        default: ""
    },
    message: {
        type: String,
        default: ""
    },
    image: {
        type: String,
        default: ''
    },
    type: {
        type: String,
        enum: ['announcement', 'short-message'],
        default: 'announcement'
    },
    snooze_till: {
        type: Date,
        default: ''
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }

}, { versionKey: false, timestamps: true });
announcement.index({ admin_id: 1 });
announcement.index({ type: 1 });
module.exports = User = conn.model('announcement', announcement);
