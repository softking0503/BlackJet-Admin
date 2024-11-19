const { Schema, model } = require('mongoose');
const { mongoose, conn } = require('../config/connection');


let userAnnouncement = new mongoose.Schema({
    announcement_id: {
        type: Schema.Types.ObjectId,
        ref: 'announcement',
        required: false
    },
    user_ids: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
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
userAnnouncement.index({ user_ids: 1 });
userAnnouncement.index({ admin_id: 1 });
userAnnouncement.index({ status: 1 });
module.exports = conn.model('userAnnouncement', userAnnouncement);
