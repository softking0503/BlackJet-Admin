const { bool } = require('joi');
const { mongoose, conn } = require('../config/connection');

let specialNeedsAndConditionsSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: false
    },
    blind: {
        type: Boolean,
        default: false
    },
    deaf: {
        type: Boolean,
        default: false
    },
    development_intellectual_disability: {
        type: Boolean,
        default: false
    },
    lap_held_infant_under_2_years: {
        type: Boolean,
        default: false
    },
    pregnant_30_weeks_or_less: {
        type: Boolean,
        default: false
    },
    pregnant_30_weeks_or_more: {
        type: Boolean,
        default: false
    },
    reduced_mobility: {
        type: Boolean,
        default: false
    },
    medical_condition: {
        type: Boolean,
        default: false
    },
    others: {
        type: Boolean,
        default: false
    },
    medical_conditions_details: {
        type: String,
        default: ""
    },
    others_details: {
        type: String,
        default: ""
    },
    name_of_infant: {
        type: String,
        default: ""
    },
    birthday_of_infant: {
        type: Date,
        default: new Date()
    },
    proof_of_age: {
        type: String,
        default: ""
    },
    photo_of_infant: {
        type: String,
        default: ""
    },
    capable_of_brief_walks: {
        type: Boolean,
        default: false
    },
    reduced_mobility_details: {
        type: String,
        default: ""
    }
}, { versionKey: false, timestamps: true });
specialNeedsAndConditionsSchema.index({ user_id: 1 });

// specialNeedsAndConditionsSchema.pre('save', function (next) {
//     this.updated_at = new Date();
//     next();
// });
module.exports = User = conn.model('specialNeedsAndCondition', specialNeedsAndConditionsSchema);
