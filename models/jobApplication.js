const { mongoose, conn } = require('../config/connection');

var careerSchema = new mongoose.Schema({
    career_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'career',
        required: true
    },
    first_name: {
        type: String,
        default: ""
    },
    last_name: {
        type: String,
        default: ""
    },
    phone: {
        type: String,
        default: ""
    },
    phone_code: {
        type: String,
        default: ""
    },
    email: {
        type: String,
        default: ""
    },
    salary: {
        type: String,
        default: ""
    },
    desired_salary: {
        type: String,
        default: ""
    },
    cv: {
        type: String,
        default: ""
    },
    is_visa_sponsorship: {
        type: Boolean
    },
    information: {
        type: String,
        default: ""
    },
    cover_letter: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    wildduck_mail_id: [
        {
            id: {
                type: Number,
                default: 0
            }
        }
    ],
    wildduck_mailbox_id: [
        {
            mailbox: {
                type: String,
                default: ''
            }
        }
    ],
    application_date: {
        type: Date,
        default: new Date()
    }
}, { versionKey: false, timestamps: true });
careerSchema.index({ career_id: 1 });
careerSchema.index({ application_date: -1 });

module.exports = Career = conn.model('jobApplication', careerSchema);