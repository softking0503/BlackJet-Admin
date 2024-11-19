const { boolean } = require('joi');
const { mongoose, conn } = require('../config/connection');

var categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true, // Adjust as needed
    },
    image: {
        type: String,
        default: ""
    },
    created_at: {
        type: Date,
        default: new Date()
    },
    updated_at: {
        type: Date,
        default: new Date()
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    order: {
        type: Number,
        default: 0
    }
}, { versionKey: false });

categorySchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

module.exports = conn.model('category', categorySchema);
