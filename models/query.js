const { mongoose, conn } = require('../config/connection');

const querySchema = new mongoose.Schema({
    sender_id: {
        type: String,
        default: ''
    },
    group_id: {
        type: String,
        default: ''
    },
    query: {
        type: String,
        default: ''
    },
    request_count: {
        type: Number,
        default: ''
    },
    is_deleted_query: {
        type: Boolean,
        default: false // Set the default value for is_deleted to false
    },
    query_status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    query_request: {
        type: String,
        enum: ['pending', 'resolve', 'reject'],
        default: 'pending'
    },
}, { versionKey: false, timestamps: true });
querySchema.index({ sender_id: 1 });
querySchema.index({ group_id: 1 });
querySchema.index({ query_status: 1 });

module.exports = conn.model('query', querySchema);
