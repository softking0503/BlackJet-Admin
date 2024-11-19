const { mongoose, conn } = require('../config/connection');

var enquirySchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            default: '',
        },
        lastName: {
            type: String,
        },
        subject: {
            type: String,
            default: '',
        },
        email: {
            type: String,
            default: '',
        },
        enQuiry: {
            type: String,
            default: '',
        },
        phone: {
            type: Number,
            default: 0,
        },
        ipv4: {
            type: String,
            default: '',
        },
        ipv6: {
            type: String,
            default: '',
        },
        device: {
            type: String,
            default: '',
        },
        browserWindow: {
            type: String,
            default: '',
        },
        computerScreen: {
            type: String,
            default: '',
        },
        readBy: {
            type: String,
            default: ''
        },
        acctType: {
            type: String,
            enum: ['public_user', 'full_member', 'free_preview'],
            default: '',
        },
        relatedEnquiry: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'contactuscategories',
            required: true
        },
        isRead: {
            type: String,
            enum: ['true', 'false'],
            default: 'false',
        },
        type: {
            type: String,
            //enum: ['contact_us', 'about_us', 'legal', 'media_press', 'sales', 'support', 'partnerships', 'something_else', 'general', 'investors', 'faq', 'careers', 'member'],
            default: '',
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
        wildduck_mail_id:[
            {
                id: {
                    type: Number,
                    default: 0
                }
            }
        ],
        wildduck_mailbox_id:[
            {
                mailbox: {
                    type: String,
                    default: ''
                }
            }
        ]
    },
    { versionKey: false, timestamps: true }
);
enquirySchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

// Adding compound index for faster querying
enquirySchema.index({ firstName: 1, lastName: 1 });

module.exports = enquiry = conn.model('enquiry', enquirySchema);
