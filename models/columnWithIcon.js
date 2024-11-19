const { boolean } = require('joi');
const { mongoose, conn } = require('../config/connection');

var columnWithIcon = new mongoose.Schema({
    image: {
        type: String,
        default: ""
    },
    image_link: {
        type: String,
        default: ""
    },
    icon_heading: {
        type: String,
        default: ""
    },
    heading: {
        type: String,
        default: ""
    },
    sub_text: {
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
    }
}, { versionKey: false });
columnWithIcon.index({ status: 1, created_at: 1, updated_at: 1 });

columnWithIcon.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

module.exports = conn.model('columnWithIcon', columnWithIcon);
