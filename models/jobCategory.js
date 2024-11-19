const mongoose = require('mongoose');
const { conn } = require('../config/connection');  // Assuming conn is set up for database connection

// Job Category Schema
const jobCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true  // Ensuring unique category names
    }
}, { timestamps: true, versionKey: false });

module.exports = JobCategory = conn.model('JobCategory', jobCategorySchema);
