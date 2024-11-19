const { mongoose, conn } = require('../config/connection');

var investorsSchema = new mongoose.Schema({
    frame1_image: {
        type: String,
        default: ""
    },
    frame2_image: {
        type: String,
        default: ""
    },
    frame3_image: {
        type: String,
        default: ""
    },
    frame4_content: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, { versionKey: false, timestamps: true });
investorsSchema.index({ status: 1 });


module.exports = conn.model('investors', investorsSchema);