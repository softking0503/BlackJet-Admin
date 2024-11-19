const { mongoose, conn } = require('../config/connection');

const internalMessagesSchema = new mongoose.Schema({
    sender: {
        type: String, // Store sender ID as string
        required: true,
    },
    receiver: {
        type: String, // Store receiver ID as string
        required: true,
    },
    message: {
        type: String,
        default: ''
    },
    message_type: {
        type: String,
        enum: ['text', 'media', 'normal_message'],
        required: true
    },
    media: [{
        thumbnail: {
            type: String,
            default: ''
        },
        mediaUrl: {
            type: String,
            default: ''
        },
        type: {
            type: String,
            default: ''
        },
    }],
    sender_type: {
        type: String,
        enum: ['subadmin', 'admin'],
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'unsent'],
        default: 'active'
    },
    type: {
        type: String,
        enum: ['normal', 'group'],
        default: 'normal'
    },
    group_id: {
        type: String,
        default: ''
    },
    read_by: [{
        id: {
            type: String, // Assuming 'id' should be of ObjectId type
            default: ''
        }
    }],
    readStatus: {
        type: String,
        enum: ['read', 'unread'],
        default: 'unread'
    },
}, { versionKey: false, timestamps: true });
internalMessagesSchema.index({ sender: 1 });


module.exports = conn.model('internalMessage', internalMessagesSchema);
