const { mongoose, conn } = require('../config/connection');

var groupSchema = new mongoose.Schema({
    is_deleted: {
        type: Boolean,
        default: false // Set the default value for is_deleted to false
    },
    group_name: {
        type: String,
        default: ''
    },
    chat_type: {
        type: String,
        enum: ['user', 'guest', 'sub_to_sub']
    },
    query_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'query',
        default: null
    },
    isActive: {
        type: Boolean,
        default: false
    },
    users: [{
        _id: {
            type: String,
            default: ''
        },
        socket_id: {
            type: String,
            default: ''
        },
        guest_name: {
            type: String,
            default: ''
        },
        user_name: {
            type: String,
            default: ''
        },
        type: {
            type: String,
            enum: ['user', 'subadmin', 'admin', 'guest'],
        },
        active: {
            type: String,
            enum: ['true', 'false'],
            default: 'true'
        }
    }],
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    device_type: {
        type: String,
        default: ''
    }
}, { versionKey: false, timestamps: true });
groupSchema.index({ is_deleted: 1 });
groupSchema.index({ group_name: 1 });
groupSchema.index({ chat_type: 1 });
groupSchema.index({ 'users._id': 1 });
groupSchema.index({ status: 1 });
module.exports = conn.model('group', groupSchema);
