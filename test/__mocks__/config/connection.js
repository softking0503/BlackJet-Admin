const mongoose = require('mongoose');

let conn;
let masterConn;

const connectionOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    connectTimeoutMS: 60000,
    socketTimeoutMS: 60000
};

const connectionOptions1 = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    connectTimeoutMS: 60000,
    socketTimeoutMS: 60000
};

// Mocking mongoose.createConnection
mongoose.createConnection = jest.fn((url, options) => {
    const connection = {
        on: jest.fn(),
        once: jest.fn(),
        close: jest.fn(),
    };

    conn = connection;
    masterConn = connection;

    // Simulate connection events
    process.nextTick(() => {
        connection.on.mock.calls.forEach(([event, callback]) => {
            if (event === 'error') {
                callback('Mocked MongoDB connection error');
            } else if (event === 'open') {
                callback();
            }
        });
    });

    return connection;
});

// Export mocked mongoose and connections
module.exports = {
    mongoose,
    conn,
    masterConn
};