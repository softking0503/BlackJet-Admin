const { mongoose, conn } = require('../config/connection');

var internalGroupSchema = new mongoose.Schema({
    group_name: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: false
    },
    groupType: {
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
        name: {
            type: String,
            default: ''
        },
        type: {
            type: String,
            enum: ['subadmin', 'admin'],
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
internalGroupSchema.index({ name: 1 });
internalGroupSchema.index({ chat_type: 1 });
internalGroupSchema.index({ 'users._id': 1 });
module.exports = conn.model('internalGroup', internalGroupSchema);
