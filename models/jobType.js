const mongoose = require('mongoose');
const { conn } = require('../config/connection');  // Assuming conn is set up for database connection

//Job Type Schema
const jobTypeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true // Ensuring unique category names
    }
}, { timestamps: true, versionKey: false });

module.exports = JobType = conn.model('JobType', jobTypeSchema);