const { mongoose, conn } = require('../config/connection');

var contactUsSchema = new mongoose.Schema({
    category: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
    },
    user_id: {
        type: String,
        default: "",
    },
    display_name: {
        type: String,
        default: "",
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
    main: {
        type: Boolean,
        default: false
    },
    address_id: {
        type: String,
        default: ""
    },
    inbox: {
        type: String,
        default: ""
    },
    drafts: {
        type: String,
        default: ""
    },
    initial_contact_sent: {
        type: String,
        default: ""
    },
    junk: {
        type: String,
        default: ""
    },
    sent_mail: {
        type: String,
        default: ""
    },
    trash: {
        type: String,
        default: ""
    }

}, { versionKey: false });
contactUsSchema.index({ email: 1, category: 1 });

contactUsSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

module.exports = conn.model('contactuscategories', contactUsSchema);
