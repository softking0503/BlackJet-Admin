const { bool } = require('joi');
const { mongoose, conn } = require('../config/connection');

let blogSchema = new mongoose.Schema({
    blog_title: {
        type: String,
        default: ""
    },
    blog_category: {
        type: String,
        default: ""
    },
    blog_slug: {
        type: String,
        default: ""
    },
    blog_image: {
        type: String,
        default: ""
    },
    blog_section: {
        type: String,
        default: ""
    },
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
    blog_published_date: {
        type: Date, // Change data type to Date for storing date and time
        default: null, // Default to null to allow it to be empty
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'delete'],
        default: 'active'
    },
}, { versionKey: false, timestamps: true });
blogSchema.index({ blog_slug: 1 }, { unique: true });

module.exports = User = conn.model('blog', blogSchema);
