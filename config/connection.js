const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.envs') });

let conn;
let masterConn;

const connectionOptions = {
    useNewUrlParser: true,
    tls: true,
    tlsAllowInvalidCertificates: true,
    useUnifiedTopology: true,
    connectTimeoutMS: 90000,
    socketTimeoutMS: 90000
};

conn = mongoose.createConnection(process.env.MONGODB_HOST, connectionOptions);
conn.on('connected', () => {
    console.log('Mongoose connected to mydatabase');
});
conn.on('error', (err) => {
    console.error('Mongoose connection error:', err);
});

masterConn = mongoose.createConnection(process.env.PMONGODB_HOST, connectionOptions);
masterConn.on('connected', () => {
    console.log('Mongo payment db connected');
});
masterConn.on('error', (err) => {
    console.error('Mongo payment db connection error:', err);
});

exports.mongoose = mongoose;
exports.conn = conn;
exports.masterConn = masterConn;
