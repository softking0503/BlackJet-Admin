const { bool } = require('joi');
const { mongoose, conn } = require('../config/connection');

let authorSchema = new mongoose.Schema({
    author_title: {
        type: String,
        default: ""
    },
    author_name: {
        type: String,
        default: ""
    },
    author_image: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
}, { versionKey: false, timestamps: true });

module.exports = User = conn.model('author', authorSchema);
