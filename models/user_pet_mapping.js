const { bool } = require('joi');
const { mongoose, conn } = require('../config/connection');

let user_pet_mapping_Schema = new mongoose.Schema({
    gender: {
        type: String,
        default: ""
    },
    age: {
        type: String,
        default: ""
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    pet_image: {
        type: String,
        default: ""
    },
    type_of_pet: {
        type: String,
        enum: ['Dog', 'Cat', ''],
        default: ''
    },
    pet_name: {
        type: String,
        default: ""
    },
    pet_breed: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'pet'
        }
    ],
    pet_weight: {
        type: String,
        default: ""
    },
    pet_liability_signature: {
        type: String,
        default: ""
    },
    assistance_animal_proof: {
        type: String,
        default: ""
    },
    Bio: {
        type: String,
        default: ""
    },
    pet_profile_completed: {
        type: Boolean,
        default: false
    },
    vets_name: {
        type: String,
        default: ""
    },
    state: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'state',
        required: false
    },
    admin_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: false
    },
    vets_license_no: {
        type: String,
        default: ""
    },
    vets_license_date: {
        type: Date
    },
    rabbies_vaccine_date: {
        type: Date
    },
    rabbies_vaccine_valid_to_date: {
        type: Date
    },
    distemper_vaccine_date: {
        type: Date
    },
    distemper_vaccine_valid_to_date: {
        type: Date
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },

}, { versionKey: false, timestamps: true });
user_pet_mapping_Schema.index({ user_id: 1 });
user_pet_mapping_Schema.index({ type_of_pet: 1 });
user_pet_mapping_Schema.index({ status: 1 });
// user_pet_mapping_Schema.pre('save', function (next) {
//     this.updated_at = new Date();
//     next();
// });
module.exports = User = conn.model('user_pet_mapping', user_pet_mapping_Schema);