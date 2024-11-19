const { mongoose, conn } = require('../config/connection');

var rolesSchema = new mongoose.Schema({
    name: {
        type: String,
        required: 'Name can\'t be empty'
    },
    type: {
        type: String,
        required: 'type can\'t be empty',
        unique: true
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
rolesSchema.index({ name: 1 }, { unique: true });

rolesSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

module.exports = Roles = conn.model('roles', rolesSchema);