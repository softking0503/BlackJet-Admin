const { boolean } = require('joi');
const { mongoose, conn } = require('../config/connection');

var testimonialSchema = new mongoose.Schema({
    image: {
        type: String,
        default: ""
    },
    comment: {
        type: String,
        default: ""
    },
    name: {
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
}, { versionKey: false });
testimonialSchema.index({ status: 1 });

testimonialSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

module.exports = conn.model('testimonial', testimonialSchema);
