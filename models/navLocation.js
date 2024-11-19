const { mongoose, conn } = require('../config/connection');

var locationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: 'Name can\'t be empty',
    },
    type: {
        type: String,
        required: 'type can\'t be empty'
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, { versionKey: false, timestamps: true });

module.exports = location = conn.model('nav_location', locationSchema);