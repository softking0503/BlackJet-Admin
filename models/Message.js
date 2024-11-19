const { mongoose, conn } = require('../config/connection');

const MessagesSchema = new mongoose.Schema({
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
        enum: ['text', 'media', 'normal_message', 'disconnect'],
        required: true
    },
    // image: {
    //     type: String,
    //     default: ''
    // },
    // thumbnail: {
    //     type: String,
    //     default: ''
    // },
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
        enum: ['user', 'subadmin', 'admin', 'guest'],
        required: true
    },
    read_by: [{
        id: {
            type: String, // Assuming 'id' should be of ObjectId type
            default: ''
        }
    }],
    is_deleted_by: [{
        id: {
            type: String, // Assuming 'id' should be of ObjectId type
            default: ''
        }
    }],
    status: {
        type: String,
        enum: ['active', 'inactive', 'unsent'],
        default: 'active'
    },
    type: {
        type: Boolean,
        default: false
    },
    readStatus: {
        type: String,
        enum: ['read', 'unread'],
        default: 'unread'
    },
}, { versionKey: false, timestamps: true });
MessagesSchema.index({ sender: 1 });


module.exports = conn.model('Message', MessagesSchema);
