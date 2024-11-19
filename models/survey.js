const { mongoose, conn } = require('../config/connection');


let surveySchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    admin_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: true
    },
    question: {
        type: String,
        default: ""
    },
    options: {
        type: [],
        default: []
    },
    user_answer: {
        type: [],
        default: []
    },
    snooze_till: {
        type: Date,
        default: ''
    },
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active"
    }

}, { versionKey: false, timestamps: true });
surveySchema.index({ user_id: 1 });
surveySchema.index({ admin_id: 1 });
surveySchema.index({ status: 1 });
module.exports = User = conn.model('survey', surveySchema);
