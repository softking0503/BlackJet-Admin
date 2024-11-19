const { mongoose, conn } = require('../config/connection');

var homePageSchema = new mongoose.Schema({
    frame1Logo: {
        type: String,
        default: ""
    },
    frame1Video: {
        type: String,
        default: ""
    },
    frame2Text: {
        type: String,
        default: ""
    },
    frame2Video: {
        type: String,
        default: ""
    },
    frame2Card: [{
        title: {
            type: String,
            default: ""
        },
        description: {
            type: String,
            default: ""
        },
    }],
    frame3Logo: {
        type: String,
        default: ""
    },
    frame3Video: {
        type: String,
        default: ""
    },
    frame4Text: {
        type: String,
        default: ""
    },
    frame4Card: [{
        title: {
            type: String,
            default: ""
        },
        description: {
            type: String,
            default: ""
        },
    }],
    frame5Video: {
        type: String,
        default: ""
    },
    frame6Card: [{
        title: {
            type: String,
            default: ""
        },
        description: {
            type: String,
            default: ""
        },
    }],
    frame7Video: {
        type: String,
        default: ""
    },
    frame7Text: {
        type: String,
        default: ""
    },
    frame8Text: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, { versionKey: false, timestamps: true });
homePageSchema.index({ frame2Text: 1 });
homePageSchema.index({ frame3Text: 1 });

module.exports = conn.model('homePage', homePageSchema);