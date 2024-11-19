const { mongoose, conn } = require('../config/connection');

var careerSchema = new mongoose.Schema({
    job_name: {
        type: String,
        default: ""
    },
    job_type: {
        type: mongoose.Schema.Types.ObjectId,  // Reference to JobType model
        ref: 'JobType',
        required: true
    },
    job_location: {
        type: mongoose.Schema.Types.ObjectId,  // Reference to JobLocation model
        ref: 'JobLocation',
        required: true
    },
    job_category: {
        type: mongoose.Schema.Types.ObjectId,  // Reference to JobCategory model
        ref: 'JobCategory',
        required: true
    },
    requirements: [{
        title: {
            type: String,
            default: ''
        },
        description: {
            type: String,
            default: ''
        }
        // order: {
        //     type: Number,
        //     default: 0
        // }
    }],
    // responsibilities: {
    //     type: String,
    //     default: ""
    // },
    // skills_qualifications: {
    //     type: String,
    //     default: ""
    // },
    // minimum_qualifications: {
    //     type: String,
    //     default: ""
    // },
    // desirable_qualifications: {
    //     type: String,
    //     default: ""
    // },
    // starting_salary: {
    //     type: Number,
    //     default: 0
    // },
    // max_salary: {
    //     type: Number,
    //     default: 0
    // },
    // JD_pdf: {//job description pdf
    //     type: String,
    //     default: ""
    // },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    job_post_date: {
        type: Date,
        default: new Date()
    }
}, { versionKey: false, timestamps: true });


module.exports = Career = conn.model('career', careerSchema);