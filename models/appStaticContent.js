const { bool } = require('joi');
const { mongoose, conn } = require('../config/connection');

let state_Schema = new mongoose.Schema({
    HTML: {
        type: String,
        default: ""
    },
    type: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },

}, { versionKey: false, timestamps: true });

module.exports = User = conn.model('app_static_content', state_Schema);