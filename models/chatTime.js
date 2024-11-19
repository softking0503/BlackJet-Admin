const { boolean } = require('joi');
const { mongoose, conn } = require('../config/connection');

var chatTimeSchema = new mongoose.Schema({
    from: {
        type: String,
        required: "", // Adjust as needed
    },
    to: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    timezone: {
        type: String,
        default: ''
    }
}, { versionKey: false, timestamps: true });

module.exports = conn.model('chatTime', chatTimeSchema);
