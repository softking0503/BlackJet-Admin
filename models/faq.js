const { boolean } = require('joi');
const { mongoose, conn } = require('../config/connection');

var faqSchema = new mongoose.Schema({
    question: {
        type: String,
        default: ''
    },
    answer: {
        type: String,
        default: ''
    },
    section_description: {
        type: String,
        default: ''
    },
    section_heading: {
        type: String,
        default: ''
    },
    title: {
        type: String,
        default: ''
    },
    category: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'category',
        required: false
    }],
    created_at: {
        type: Date,
        default: new Date()
    },
    updated_at: {
        type: Date,
        default: new Date()
    },
    type: {
        type: String,
        enum: ['admin', 'subadmin'],
        default: 'admin'
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'delete'],
        default: 'active'
    },
    order: {
        type: Number,
        default: 0
    },
    delta_text: {
        type: String,
        default: ""
    }
}, { versionKey: false });
faqSchema.index({ category: 1 });
faqSchema.index({ type: 1 });
faqSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

module.exports = conn.model('faq', faqSchema);
