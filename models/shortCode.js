const { boolean } = require('joi');
const { mongoose, conn } = require('../config/connection');
const price = require('./price');

var shortCodeSchema = new mongoose.Schema({
    shortCodeName: {
        type: String,
        required: true
    },
    details: [{
        keyName: {
            type: String,
            default: ''
        },
        tableName: {
            type: String,
            default: ''
        }
    }],
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, { versionKey: false, timestamps: true });
shortCodeSchema.index({ shortCodeName: 1 });

module.exports = conn.model('shortcode', shortCodeSchema);
