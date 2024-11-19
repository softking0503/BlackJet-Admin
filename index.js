const dotenv = require('dotenv');
//const connectToDatabase = require('./config/connection');
const createError = require('http-errors'); // HTTP error utility
const express = require('express'); // Express framework
const https = require("https"); // HTTPS server
const http = require("http"); // HTTP server
const basicAuth = require('basic-auth-connect'); // Basic authentication middleware
const path = require('path'); // Utilities for working with file and directory paths
const socketIo = require('socket.io'); // Socket.io for real-time communication
const cookieParser = require('cookie-parser'); // Cookie parsing middleware
const logger = require('morgan'); // HTTP request logger middleware
const fs = require('fs'); // File system module
const cors = require('cors'); // Cross-Origin Resource Sharing middleware
const swaggerUi = require("swagger-ui-express"); // Swagger UI middleware for API documentation
const swaggerOptions = require("./swagger.json"); // Swagger configuration
const secretManagerAws = require('./helpers/secretManagerAws');//get secret 

const { petOnboardjob, tempUserTruncate, inviteLinkExpire, terminateAccountAfterThirtyOneDays } = require('./cronjob/petOnBoard'); // Cron jobs for pet onboarding and user truncation
const {
    errorResponse, successResponse, customResponse, internalServerError, randomResponse, Forbidden, notFoundResponse,
    tokenError
} = require("./helpers/response"); // Response helper functions
const seed = require('./config/seed'); // Seed data configuration
const { errorServer } = require('./helpers/response'); // Error response helper
const adminRouter = require('./routes/admin'); // Admin routes
const userRouter = require('./routes/v1/user'); // User routes V1
const userRouterTwo = require('./routes/v2/user'); // User routes V2
const paymentRouter = require('./routes/v1/payment'); // Payment routes V1
const paymentRouterTwo = require('./routes/v2/payment'); // Payment routes V2
const publicRouter = require('./routes/v1/public'); // Public routes V1
const publicRouterTwo = require('./routes/v2/public'); // Public routes V2
const moment = require('moment'); // Date manipulation library
const mailHelper = require('./helpers/mailer'); // Mail helper functions
const auth = require('./middleware/auth'); // Authentication middleware
const adminModal = require("./models/admin"); // Admin model
const groupModal = require("./models/group");
const chatModel = require('./helpers/chatModule'); // Chat module
const internalChatModel = require('./helpers/internalChatModule'); // Chat module
const veriffModel = require('./helpers/veriffModule'); // Chat module
const { toObjectId } = require('./helpers/v2/common');
const AWS = require('aws-sdk');
// Load variables from .env
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Load variables from .envs
dotenv.config({ path: path.resolve(__dirname, '/config', '.envs') });


const port = process.env.PORT || '5632'; // Port for API
const chat_port = process.env.CHAT_PORT || '8759'; // Port for chat

const app = express();
app.use(express.json()); // Middleware to parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Middleware to parse URL-encoded bodies

// Set view engine to Pug and views directory
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(cors()); // Enable CORS
app.use(logger('dev')); // Use morgan to log requests
app.use(cookieParser()); // Parse cookies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files


// Middleware to set headers for CORS
app.use(function (req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT,DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, Authorization, Timezone");
    res.setHeader('Strict-Transport-Security', 'max-age=126144000; includeSubDomains; preload'); // Set HSTS max-age to 4 years
    next();
});

// Define route to access images
app.get('/api/v1/images', async (req, res) => {
    try {
        // const credentials = new AWS.SharedIniFileCredentials({ profile: "s3" });
        // console.log('credentials==',credentials)
        // AWS.config.credentials = credentials;
        // // const S3_REGION = process.env.S3_REGION;
        // AWS.config.update({
        //     region: S3_REGION // s3 region
        // }); 
        const s3 = new AWS.S3();
        const params = {
            Bucket: process.env.PUBLIC_MEDIA_BUCKET,
            Prefix: 'sprites/', // Folder path (must end with '/')
        };
        const data = await s3.listObjectsV2(params).promise();

        // Check if any files are returned
        if (data.Contents.length === 0) {
            return notFoundResponse('No file found.', res);
        }

        console.log('Files in folder:', 'sprites/');
        let imageUrls = [];
        data.Contents.forEach(file => {
            console.log(file.Key);
            imageUrls.push(file.Key)
        });
        return successResponse(imageUrls, 'Data Retrieved Successfully.', res);
    } catch (error) {
        console.error('Error fetching files:', error);
    }
});

// Define route to access images
app.get('/api/v2/images', async (req, res) => {
    try {
        // const credentials = new AWS.SharedIniFileCredentials({ profile: "s3" });
        // AWS.config.credentials = credentials;
        // const S3_REGION = process.env.S3_REGION;
        // AWS.config.update({
        //     region: S3_REGION // s3 region
        // });
        const s3 = new AWS.S3();
        const params = {
            Bucket: process.env.PUBLIC_MEDIA_BUCKET,
            Prefix: 'sprites/', // Folder path (must end with '/')
        };
        const data = await s3.listObjectsV2(params).promise();

        // Check if any files are returned
        if (data.Contents.length === 0) {
            return notFoundResponse('No file found.', res);
        }

        let imageUrls = [];
        data.Contents.forEach(file => {
            //console.log(file.Key);
            imageUrls.push(file.Key)
        });
        return successResponse(imageUrls, 'Data Retrieved Successfully.', res);
    } catch (error) {
        console.error('Error fetching files:', error);
    }
});

// Setup routers for different endpoints
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/user', userRouter);
app.use('/api/v1', paymentRouter);
app.use('/api/v1', publicRouter);
app.use('/api/v2/user', userRouterTwo);
app.use('/api/v2', paymentRouterTwo);
app.use('/api/v2', publicRouterTwo);

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// General error handler
app.use(function (err, req, res, next) {
    if (err.name === 'UnauthorizedError') {
        errorServer(err, res, 401);
    } else {
        res.locals.message = err.message;
        res.locals.error = req.app.get('env') === 'development' ? err : {};
        errorServer(err, res, err.status || 500);
    }
});

app.use(clientErrorHandler);
app.use(errorHandler);

// Client error handler for XHR requests
function clientErrorHandler(err, req, res, next) {
    if (req.xhr) {
        res.status(500).send({ error: 'Something failed!' });
    } else {
        next(err);
    }
}

// General error handler for rendering error pages
function errorHandler(err, req, res, next) {
    res.status(500);
    res.render('error', { error: err });
}

// Set the port and chat port
app.set('port', port);
app.set('chat_port', chat_port);
let server = http.createServer(app);

// Setup server based on environment
if (process.env.NODE_ENV === 'staging') {
    let privateKey = fs.readFileSync(process.env.SSL_PRIVATEKEY, "utf8");
    let certificate = fs.readFileSync(process.env.SSL_CERTIFICATE, "utf8");
    https.createServer({ key: privateKey, cert: certificate, requestCert: false }, app).listen(port, () => {
        console.log(`Blackjet Server listening on port : ${port}`);
    });
    var server1 = https.createServer({ key: privateKey, cert: certificate, requestCert: false }, app).listen(chat_port, () => {
        console.log(`Blackjet Socket listening on port : ${chat_port}`);
    });
    var io = socketIo(server1, {
        allowEIO3: true, // Allow engine.io v3
        cors: {
            origin: "*"
        },
        pingTimeout: 60000, // Increase ping timeout to 60 seconds
        pingInterval: 25000 // Set ping interval to 60 seconds
    });
} else {
    var io = socketIo(server, {
        allowEIO3: true, // Allow engine.io v3
        cors: {
            origin: "*"
        },
        pingTimeout: 60000, // Increase ping timeout to 60 seconds
        pingInterval: 25000 // Set ping interval to 60 seconds
    });
    io.listen(chat_port, () => {
        console.log(`Blackjet Socket Server listening on port ${chat_port}`);
    });
    server.listen(port, () => {
        console.log(`Blackjet Server listening on port ${port}`);
    });
}

// Setup socket.io connection
io.on('connection', function (socket) {
    console.log(socket.id + ' a user connected');

    // Handle 'initChat' event
    socket.on('initChat', async function (data) {
        try {
            let socketIds = [];

            // Use promisified version of chatModel.updateSocket or wrap in a Promise
            chatModel.updateSocket(data, socket.id, async (err, groupData) => {
                console.log('111111111111111111111111111111111111111groupData')

                if (err) {
                    console.error("Error in updateSocket:", err);
                    return;
                }

                // Set socket properties
                socket.userType = data.sender_type;
                socket.senderId = data.sender;
                console.log(groupData, 'groupData')
                // Emit the initChat event with the groupData
                io.sockets.to(socket.id).emit('initChat', groupData);

                try {
                    // Find the group where the sender is in the users array
                    let group = await groupModal.findOne({
                        'users._id': data.sender,
                        status: 'active'
                    }).exec();

                    // Handle case where no group is found
                    if (!group) {
                        console.warn("No active group found for sender:", data.sender);
                        return;
                    }

                    // Fetch chat list based on the sender, receiver, etc.
                    const receiveChatList = await chatModel.receiveChatList(
                        data.sender,
                        group._id,
                        data.sender_type,
                        data.sender, // Assuming this is the correct usage for sender again
                        'text'
                    );

                    // Check if a new group was created
                    if (groupData.result && groupData.result.check === true) {
                        // Query the database for active subadmins excluding the sender
                        let activeSubadmins = await adminModal.find({
                            status: 'active',
                        });

                        for (let subadmin of activeSubadmins) {
                            if (subadmin.socket_id) {
                                console.log(subadmin.socket_id, 'subadmin.111111111111111111111111111111111111111')
                                io.sockets.to(subadmin.socket_id).emit('receiveChatList', { "result": receiveChatList });
                            }
                        }
                    }
                } catch (innerError) {
                    console.error("Error in processing group or subadmins:", innerError);
                }
            });
        } catch (error) {
            console.error("Error in initChat event:", error);
        }
    });



    // Handle 'getChatList' event
    socket.on('getChatList', function (data) {
        chatModel.getChatList(data, (err, chatList) => {
            if (err) io.sockets.to(socket.id).emit('error_callback', { "message": "error occur." });
            io.sockets.to(socket.id).emit('getChatList', { "result": chatList });
        });
    });

    // Handle 'getConversationList' event
    socket.on('getConversationList', async function (data) {
        chatModel.getConversationList(data, (err, getConversationList) => {
            if (err) {
                console.log(err, "err");
                io.sockets.to(socket.id).emit('error_callback', { "message": "error occur." });
            } else {
                io.sockets.to(socket.id).emit('getConversationList', { "result": getConversationList });
            }
        });
    });

    // Handle 'sendMessage' event
    socket.on('sendMessage', async function (data) {
        try {
            // Call the sendChatMessage function
            chatModel.sendChatMessage(data, async (err, res) => {
                if (err) {
                    io.sockets.to(socket.id).emit('error_callback', { "message": "Error occurred during message send." });
                    return;
                }
                // Emit the sent message to the sender
                io.sockets.to(socket.id).emit('sendMessage', { "result": res });
                if (data.isSubadminAvailable === false) {
                    // Fetch the receiver's chat list
                    const receiveChatList = await chatModel.receiveChatList(
                        data.sender,
                        data.receiver,
                        data.sender_type,
                        data.sender,
                        data.message_type
                    );
                    // Query the database for active subadmins excluding the sender
                    let activeSubadmins = await adminModal.find({
                        status: 'active',
                    });

                    for (let subadmin of activeSubadmins) {
                        if (subadmin.socket_id) {
                            console.log(subadmin.socket_id, 'subadmin.socket_id')
                            io.sockets.to(subadmin.socket_id).emit('receiveChatList', { "result": receiveChatList });
                        }
                    }
                }
                // Check if a subadmin is available
                if (data.isSubadminAvailable === true) {
                    // Fetch the updated chat list for the sender
                    chatModel.getReceiverSocketData(data, async (err1, r_data) => {
                        if (err1) {
                            io.sockets.to(socket.id).emit('error_callback', { "message": "Error occurred during fetching receiver data." });
                            return;
                        }

                        if (!r_data || r_data.length === 0) {
                            io.sockets.to(socket.id).emit('error_callback', { "message": "No receiver data found." });
                            return;
                        }

                        let id = r_data[0]?._id; // Check for _id to prevent crashes

                        let isCheck = r_data[0].check;

                        // if (id) {
                        // Get unread count for the first receiver
                        const unread = await chatModel.unreadCount(id);

                        for (let i = 0; i < r_data.length; i++) {
                            let r_socketData = r_data[i];

                            // Fetch the receiver's chat list
                            const receiveChatList = await chatModel.receiveChatList(
                                data.sender,
                                data.receiver,
                                data.sender_type,
                                r_socketData._id,
                                data.message_type
                            );

                            // Emit message and unread count to receiver if socket_id and chat_with match
                            if (r_socketData.socket_id && r_socketData.chat_with === data.receiver) {
                                io.sockets.to(r_socketData.socket_id).emit('receiveMessage', { "result": res });
                                io.sockets.to(r_socketData.socket_id).emit('unreadCount', unread);
                            }

                            // Emit chat list to both sender and receiver
                            if (r_socketData.socket_id) {
                                io.sockets.to(socket.id).emit('receiveChatList', { "result": receiveChatList });
                                io.sockets.to(r_socketData.socket_id).emit('receiveChatList', { "result": receiveChatList });
                            }
                        }
                        // Ensure sender_type is subadmin and notify other active subadmins
                        if (data.sender_type === 'subadmin' && isCheck == true) {
                            // Find online subadmins and determine the one with the minimum request count
                            const subadminWithMinRequestCount = await chatModel.findOnlineSubadmins(data.sender);
                            // If a subadmin is available, emit the response
                            io.sockets.to(socket.id).emit('subadminAvailabilityResponse', { "result": subadminWithMinRequestCount });
                            // Query the database for active subadmins excluding the sender
                            let activeSubadmins = await adminModal.find({
                                status: 'active',
                                _id: { $ne: data.sender }
                            });

                            for (let subadmin of activeSubadmins) {
                                if (subadmin.socket_id) {
                                    console.log(subadmin.socket_id, 'subadmin.socket_id')
                                    console.log(subadmin._id, 'subadmin._id')

                                    io.sockets.to(subadmin.socket_id).emit('removeGroup', { "result": data.receiver });
                                }
                            }
                        }
                        // }
                    });
                }
                // Emit received message to the sender
                io.sockets.to(socket.id).emit('receiveMessage', { "result": res });
            });
        } catch (error) {
            console.error(error);
            io.sockets.to(socket.id).emit('error_callback', { "message": "Error occurred during processing." });
        }
    });



    // Handle 'typingMessage' event
    socket.on('typingMessage', function (data) {
        chatModel.getReceiverSocketData(data, async (err1, r_socketData) => {
            if (err1) io.sockets.to(socket.id).emit('error_callback', { "message": "error occur." });
            if (data.message !== null && data.message !== '') {
                io.sockets.to(r_socketData[0].socket_id).emit('typingMessage', { "result": data });
            } else {
                io.sockets.to(r_socketData[0].socket_id).emit('typingMessage', { "result": '' });
            }
        });
    });

    // Update read status
    socket.on('readAllMessages', async (data) => {
        try {
            // Call the readAllMessages function and wait for it to complete
            console.log(data, 'read all messages');
            const dbData = await chatModel.readAllMessages(data.sender, data.receiver);
            if (data.isSubadminAvailable === true) {
                console.log("inside this isSubadminAvailable")
                // Check if dbData and dbData.response are defined
                if (dbData && dbData.response) {
                    const { socketData } = dbData.response;

                    if (socketData && socketData.length > 0) {
                        for (let { socketId } of socketData) {
                            if (socketId) {
                                // Emit the updated read status back to the client
                                io.sockets.to(socketId).emit('readAllMessages', { result: dbData.message });
                            } else {
                                console.warn(`No socketId found for subadmin.`);
                            }
                        }
                    } else {
                        console.warn('No valid socket data found.');
                    }
                }
                // Emit to the current socket as well
                io.sockets.to(socket.id).emit('readAllMessages', { result: dbData.message });
                console.log('Success: All messages marked as read.');
            } else {
                console.warn('No data found.');
                io.sockets.to(socket.id).emit('error_callback', { message: dbData.message || 'No data found' });
            }
        } catch (err) {
            console.error('Error updating read status:', err.message);
            io.sockets.to(socket.id).emit('error_callback', { message: err.message });
        }
    });

    // Handle subadmin status change event
    socket.on('readMessage', async (data) => {
        const { sender, messageId, receiver, sender_type, isSubadminAvailable } = data;
        try {
            console.log(data, 'read message')

            // Update subadmin status using the function from chatmodule.js
            const readMessage = await chatModel.updateReadBy(sender, messageId, receiver, sender_type);
            if (isSubadminAvailable === true) {
                // Check if socketIds array is present in the response
                io.sockets.to(readMessage.socketId).emit('readMessage', readMessage);
            }
            // io.to(socketId).emit('readMessage', readMessage);
            // io.sockets.to(socketId).emit('readMessage', readMessage);
            io.sockets.to(socket.id).emit('readMessage', readMessage);
        } catch (error) {
            console.error('Error in read message:', error);
            // Handle error as needed
            io.sockets.to(socket.id).emit('error_callback', { "message": "Error in read message" });
        }
    });

    const userTimeouts = new Map();

    const setUserTimeout = (userId, callback, delay) => {
        // Clear any existing timeout for this user
        if (userTimeouts.has(userId)) {
            clearTimeout(userTimeouts.get(userId));
        }

        // Set a new timeout and store its ID
        const timeoutId = setTimeout(async () => {
            try {
                await callback();
            } catch (error) {
                console.error('Error in timeout callback:', error);
            } finally {
                // Remove the timeout entry after completion
                userTimeouts.delete(userId);
            }
        }, delay);

        // Store the timeout ID in the map
        userTimeouts.set(userId, timeoutId);
    };
    // Handle status change event
    socket.on('statusChange', async (data) => {
        const { sender, type, sender_type } = data;

        try {
            const currentTime = new Date();

            const updatedStatus = await chatModel.updateSubadminStatus(sender, type, sender_type);
            console.log(updatedStatus, 'updatedStatus')
            // Create a Set to store processed socket IDs (to avoid duplicates)
            const processedSocketIds = new Set();

            // Check if updatedStatuses is an array and process each object
            if (Array.isArray(updatedStatus)) {
                for (let status of updatedStatus) {
                    // Loop through socket IDs for each status object
                    if (status.socketIds && status.socketIds.length > 0) {
                        for (let socketId of status.socketIds) {
                            // Check if this socketId has already been processed
                            if (!processedSocketIds.has(socketId)) {
                                console.log(socketId, 'socketId')
                                // Emit the statusChange event to this socketId
                                io.sockets.to(socketId).emit('statusChange', { "result": updatedStatus });
                                // Add the socketId to the Set to mark it as processed
                                processedSocketIds.add(socketId);
                            }
                        }
                    }
                }
            }

            if (type === 'offline') {
                let groupUpdateField;
                if (sender_type === 'guest' || sender_type === 'user') {
                    groupUpdateField = { "users.$[elem].statusOfflineAt": currentTime };
                }

                setUserTimeout(sender, async () => {
                    try {
                        let group = await groupModal.findOne({
                            "users._id": toObjectId(sender),
                            status: "active",
                            isActive: true
                        });
                        if (group) {
                            const groupId = group._id;
                            const activeSubadmins = group.users.filter(user => user.type === 'subadmin');
                            const timeDifference = (currentTime - new Date(group.updatedAt)) / 1000;
                            console.log(currentTime, 'currentTime')
                            console.log(group.updatedAt, 'group.updatedAt')
                            console.log(timeDifference, 'timeDifference')
                            if (timeDifference > 1) {
                                console.log(group, 'groupdata1111111111111111111111111111')

                                console.log("Setting subadmin active status to false after 5 minutes");

                                const activeSubadminIds = activeSubadmins.map(user => toObjectId(user._id));

                                await groupModal.updateOne(
                                    { _id: groupId, "users._id": { $in: activeSubadminIds }, 'users.type': 'subadmin', 'users.active': true },
                                    { $set: { "users.$[elem].active": false } },
                                    { arrayFilters: [{ "elem._id": { $in: activeSubadminIds } }], new: true }
                                );

                                await adminModal.updateMany(
                                    { _id: { $in: activeSubadminIds }, request_count: { $gt: 0 } },
                                    { $inc: { request_count: -1 } }
                                );
                            }
                        }

                        const receiveChatList = await chatModel.disconnectReceiveChatList(sender, group._id, sender_type);
                        console.log(receiveChatList, 'receiveChatList1111111111111111111111111111')
                        // Create a Set to store processed socket IDs (to avoid duplicates)
                        const processedSocketIds = new Set();

                        // Check if updatedStatuses is an array and process each object
                        if (Array.isArray(updatedStatus)) {
                            for (let status of updatedStatus) {
                                // Loop through socket IDs for each status object
                                if (status.socketIds && status.socketIds.length > 0) {
                                    for (let socketId of status.socketIds) {
                                        // Check if this socketId has already been processed
                                        if (!processedSocketIds.has(socketId)) {
                                            console.log(socketId, 'socketId')
                                            // Emit the statusChange event to this socketId
                                            io.sockets.to(socketId).emit('receiveChatList', { "result": receiveChatList });
                                            // io.sockets.to(socketId).emit('statusChange', { "result": updatedStatus });
                                            // Add the socketId to the Set to mark it as processed
                                            processedSocketIds.add(socketId);
                                        }
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        console.error('Error fetching chat list:', error);
                        io.to(socket.id).emit('error_callback', { "message": "Error fetching chat list" });
                    }
                }, 60000); // 5 minutes
            }
        } catch (error) {
            console.error('Error updating status:', error);
            io.to(socket.id).emit('error_callback', { "message": "Error updating status" });
        }
    });

    // Get Users Chat List
    socket.on('getUser', function (data) {
        //console.log(data);
        chatModel.getUser(data, (err, userList) => {
            if (err)
                io.sockets.to(socket.id).emit('error_callback', { "message": "error occur." });

            io.sockets.to(socket.id).emit('getUserList', { "result": userList });
        });
    });

    // // Handle subadmin status change event
    // socket.on('statusChange', async (data) => {
    //     const { sender, type, sender_type } = data;

    //     try {
    //         // Update subadmin status using the function from chatmodule.js
    //         const updatedSubadmin = await chatModel.updateSubadminStatus(sender, type, sender_type);
    //         if (updatedSubadmin.socketIds && updatedSubadmin.socketIds.length > 0) {
    //             for (let socketId of updatedSubadmin.socketIds) {
    //                 // Fetch the updated chat list for the subadmin
    //                 // const receiveChatList = await chatModel.receiveChatList(sender, type, sender_type);

    //                 // Emit the updated subadmin status and chat list to the relevant sockets
    //                 io.sockets.to(socketId).emit('statusChange', updatedSubadmin);
    //                 // io.sockets.to(socketId).emit('receiveChatList', receiveChatList);
    //             }
    //         }

    //         // Emit the updated subadmin data to the requesting client
    //         // io.to(socket.id).emit('statusChange', { "result": updatedSubadmin });

    //     } catch (error) {
    //         console.error('Error updating subadmin status:', error);
    //         // Handle error and notify the client
    //         io.to(socket.id).emit('error_callback', { "message": "Error updating subadmin status" });
    //     }
    // });

    // Handle Un Read Count  event
    socket.on('unreadCount', async (data) => {
        const { sender } = data;

        try {
            // Update Un Read Count using the function from chatmodule.js
            const getUnReadCount = await chatModel.unreadCount(sender);
            // Emit Un Read Count data to the client-side
            io.sockets.to(socket.id).emit('unreadCount', { "result": getUnReadCount });
        } catch (error) {
            console.error('Error UnRead Count:', error);
            // Handle error as needed
            io.sockets.to(socket.id).emit('error_callback', { "message": "Error UnRead Count" });
        }
    });

    // Handle Un Read Count  event
    socket.on('updateSocket', async (data) => {
        socket.userType = data.sender_type;
        socket.senderId = data.sender;
        const { sender, sender_type } = data;
        try {
            // Update Un Read Count using the function from chatmodule.js
            const updateSocket = await chatModel.updateSubadminSocket(sender, socket.id, sender_type);
            // Emit Un Read Count data to the client-side
            io.sockets.to(socket.id).emit('updateSocket', updateSocket);
        } catch (error) {
            console.error('Error UnRead Count:', error);
            // Handle error as needed
            io.sockets.to(socket.id).emit('error_callback', { "message": "Error UnRead Count" });
        }
    });

    // Handle subadmin availability change event
    socket.on('subadminAvailability', async (data) => {
        const { sender } = data;
        try {
            // Find online subadmins and determine the one with the minimum request count
            const subadminWithMinRequestCount = await chatModel.findOnlineSubadmins(sender);
            // If a subadmin is available, emit the response
            io.sockets.to(socket.id).emit('subadminAvailabilityResponse', { "result": subadminWithMinRequestCount });


        } catch (error) {
            console.error('Error finding available subadmin:', error);
            // Handle error as needed
            io.sockets.to(socket.id).emit('error_callback', { "message": "Error finding available subadmin" });
        }
    });

    // edit guest name
    socket.on('editGuestName', async (data) => {
        const { group_id, name } = data;
        try {
            // Update guest name the function from chatmodule.js
            const updatedGuestName = await chatModel.editGuestName(group_id, name);
            // Emit updated guest data to the client-side
            io.sockets.to(socket.id).emit('editGuestName', { "result": updatedGuestName });
        } catch (error) {
            console.error('Error updating guest name:', error);
            // Handle error as needed
            io.sockets.to(socket.id).emit('error_callback', { "message": "Error updating guest name" });
        }
    });

    /**
     * Function to search messages
     * @param {string} groupId - The group ID.
     * @param {string} search - The search term.
     * @param {number} skip - The number of documents to skip.
     * @param {number} limit - The number of documents to return.
     */
    socket.on('searchMessages', async (data) => {
        const { group_id, search, skip, limit, sender } = data;
        try {
            // Search messages using the searchMessages function
            const response = await chatModel.searchMessages(data);
            // Emit the search response back to the client
            io.sockets.to(socket.id).emit('searchMessages', { "result": response });
        } catch (error) {
            console.error('Error in search:', error);
            // Handle error and emit error message back to the client
            io.sockets.to(socket.id).emit('error_callback', { message: 'Error in searching' });
        }
    });

    /**
    * Event listener for editing a message.
    * @param {Object} data - The data containing messageId and newContent.
    */
    socket.on('editMessage', async function ({ sender, group_id, messageId, newContent, sender_type, isSubadminAvailable }) {
        try {
            // Call the editMessage function and get the result
            const { message, socketIds, type } = await chatModel.editMessage(sender, group_id, messageId, newContent);
            if (isSubadminAvailable == true) {

                const receiveChatList = await chatModel.receiveChatList(sender, group_id, sender_type, sender, 'text');

                // Emit the edited message to all socket IDs associated with the group
                socketIds.forEach(socketId => {
                    //console.log(socketIds, 'socketIds')
                    io.sockets.to(socketId).emit('editMessage', { "result": message });
                    if (type) {
                        //console.log(type, 'type')
                        io.sockets.to(socketId).emit('receiveChatList', { "result": receiveChatList });
                    }
                });
            }
            io.sockets.to(socket.id).emit('editMessage', { "result": message });

        } catch (error) {
            console.error('Error editing message:', error);
            io.sockets.to(socket.id).emit('error_callback', { "message": "Failed to edit message" });
        }
    });

    socket.on('endChat', async function (data) {
        try {
            chatModel.sendChatMessage(data, async (err, res) => {
                io.sockets.to(socket.id).emit('sendMessage', { "result": res }); // Emit sent message to sender
                chatModel.getReceiverSocketData(data, async (err1, r_data) => {
                    if (err || err1) {
                        io.sockets.to(socket.id).emit('error_callback', { "message": "error occur." });
                    }
                    if (r_data.length > 0) {
                        for (let i = 0; i < r_data.length; i++) {
                            let r_socketData = r_data[i];
                            if (r_socketData.chat_with == data.receiver) {
                                io.sockets.to(r_socketData.socket_id).emit('receiveMessage', { "result": res }); // Emit received message to receiver
                            } else if (r_socketData.chat_with == data.sender) {
                                io.sockets.to(r_socketData.socket_id).emit('receiveMessage', { "result": res }); // Emit received message to receiver
                            } else if (!r_socketData.socket_id || r_socketData.socket_id == null) {
                                io.sockets.to(r_socketData.socket_id).emit('receiveMessage', { "result": res });
                            } else if (r_socketData.socket_id && r_socketData.chat_with != 0) {
                                io.sockets.to(r_socketData.socket_id).emit('receiveMessage', { "result": res });
                            } else if (r_socketData.socket_id && r_socketData.chat_with == 0) {
                                io.sockets.to(r_socketData.socket_id).emit('receiveMessage', { "result": res });
                            }
                        }
                    }
                    io.sockets.to(socket.id).emit('receiveMessage', { "result": res });
                });
            });
        } catch (error) {
            console.error(error);
            io.sockets.to(socket.id).emit('error_callback', { "message": "error occur." });
        }
    });
    /**
       * Event listener for unsending a message.
       * @param {Object} data - The data containing messageId.
       */
    socket.on('unsendMessage', async function ({ sender, group_id, messageId, sender_type, isSubadminAvailable }) {
        try {
            const { message, socketIds, type } = await chatModel.unsendMessage(sender, group_id, messageId);

            if (isSubadminAvailable == true) {

                const receiveChatList = await chatModel.receiveChatList(sender, group_id, sender_type, sender, 'text');

                // Emit the edited message to all socket IDs associated with the group
                socketIds.forEach(socketId => {
                    //console.log(socketIds, 'socketIds')
                    io.sockets.to(socketId).emit('unsendMessage', { "result": message });
                    if (type) {
                        //console.log(type, 'type')
                        io.sockets.to(socketId).emit('receiveChatList', { "result": receiveChatList });
                    }
                });
            }
            io.sockets.to(socket.id).emit('unsendMessage', { "result": message });
        } catch (error) {
            console.error('Error unsending message:', error);
            io.sockets.to(socket.id).emit('error_callback', { "message": "Failed to unsend message" });
        }
    });

    // edit guest name
    socket.on('addSubadminToGroup', async (data) => {
        const { subadmin_id, group_id } = data;
        try {
            // Update guest name the function from chatmodule.js
            const result = await chatModel.addSubadminToGroup(subadmin_id, group_id, socket.id);
            // const receiveChatList = await chatModel.receiveChatList(subadmin_id);
            // Emit updated guest data to the client-side
            io.sockets.to(socket.id).emit('addSubadminToGroup', { "result": result });
            // io.sockets.to(socket.id).emit('receiveChatList', { "result": receiveChatList });
        } catch (error) {
            console.error('Error adding subadmin:', error);
            // Handle error as needed
            io.sockets.to(socket.id).emit('error_callback', { "message": "Error in adding subadmin" });
        }
    });

    // Disconnect Chat
    socket.on('disconnected', async function (data) {
        console.log("socket.id", socket.id);
        try {

            let findGroup = await groupModal.findOne({
                "users._id": { $all: [data.sender] },
                status: "active"
            });

            const res = await chatModel.disconnectUser(data, socket.id);

            console.log(res, 'findGroupfindGroup');
            console.log(findGroup, 'findGroupfindGroup');

            const receiveChatList = await chatModel.disconnectReceiveChatList(data.sender, findGroup._id, data.sender_type);
            // If there are socket IDs to notify, loop through them
            if (res.socketIds && res.socketIds.length > 0) {
                res.socketIds.forEach(id => {
                    io.sockets.to(id).emit('disconnected', { "result": res.res });
                    io.sockets.to(id).emit('receiveChatList', { "result": receiveChatList });

                });
            }
            io.sockets.to(socket.id).emit('disconnected', { "result": res.res });

            console.log('User disconnected');
        } catch (err) {
            console.error(err);
        }
    });

    // Handle disconnect event
    // socket.on('disconnect', function () {
    //     console.log("socketid", socket.id);
    //     console.log('default user disconnected');
    //     // the reason of the disconnection, for example "transport error"
    //     //console.log('disconnect reason==',reason);

    //     // // the low-level reason of the disconnection, for example "xhr post error"
    //     // console.log('disconnect detail message==',details.message);

    //     // // some additional description, for example the status code of the HTTP response
    //     // console.log('disconnect detail description==',details.description);

    //     // // some additional context, for example the XMLHttpRequest object
    //     // console.log('disconnect detail context==',details.context);
    // });


    // Listen for the disconnection event
    // Handle disconnect event
    // socket.on("disconnect", async (reason) => {
    //     try {
    //         if (reason === 'ping timeout' && socket.id && socket.userType && socket.senderId) {
    //             const sender = socket.senderId;
    //             const sender_type = socket.userType;
    //             const type = 'offline';

    //             const updatedSubadmin = await chatModel.updateSubadminStatus(sender, type, sender_type);

    //             if (updatedSubadmin.socketIds && updatedSubadmin.socketIds.length > 0) {
    //                 for (let socketId of updatedSubadmin.socketIds) {
    //                     io.sockets.to(socketId).emit('statusChange', updatedSubadmin);
    //                 }
    //             }

    //             setUserTimeout(sender, async () => {
    //                 try {
    //                     const currentTime = new Date();
    //                     let group = await groupModal.findOne({
    //                         "users._id": toObjectId(sender),
    //                         status: "active",
    //                         isActive: true
    //                     });

    //                     if (group) {
    //                         const groupId = group._id;
    //                         const activeSubadmins = group.users.filter(user => user.type === 'subadmin');
    //                         const timeDifference = (currentTime - new Date(group.updatedAt)) / 1000 / 60;

    //                         if (timeDifference > 5) {
    //                             console.log("Setting subadmin active status to false after 5 minutes");

    //                             const activeSubadminIds = activeSubadmins.map(user => toObjectId(user._id));

    //                             await groupModal.updateOne(
    //                                 { _id: groupId, "users._id": { $in: activeSubadminIds }, 'users.type': 'subadmin', 'users.active': true },
    //                                 { $set: { "users.$[elem].active": false } },
    //                                 { arrayFilters: [{ "elem._id": { $in: activeSubadminIds } }], new: true }
    //                             );

    //                             await adminModal.updateMany(
    //                                 { _id: { $in: activeSubadminIds }, request_count: { $gt: 0 } },
    //                                 { $inc: { request_count: -1 } }
    //                             );
    //                         }
    //                     }

    //                     const receiveChatList = await chatModel.receiveChatList(sender, group._id, sender_type, sender, 'disconnect');

    //                     if (updatedSubadmin.socketIds && updatedSubadmin.socketIds.length > 0) {
    //                         for (let socketId of updatedSubadmin.socketIds) {
    //                             io.sockets.to(socketId).emit('receiveChatList', { "result": receiveChatList });
    //                         }
    //                     }
    //                 } catch (error) {
    //                     console.error('Error in disconnect', error);
    //                     io.to(socket.id).emit('error_callback', { "message": "Error in disconnect" });
    //                 }
    //             }, 300000); // 5 minutes
    //         }
    //     } catch (error) {
    //         console.error('Error in disconnect handler:', error);
    //         io.to(socket.id).emit('error_callback', { "message": "Error in disconnect handler" });
    //     }
    // });

    //=======================internal chat============================//
    // Handle 'initChat' event
    socket.on('internalInitChat', async function (data) {
        internalChatModel.internalUpdateSocket(data, socket.id, (err, groupData) => {
            if (err) console.log(err);
            io.sockets.to(socket.id).emit('internalInitChat', { "result": groupData });
        });
    });

    // Handle 'getChatList' event
    socket.on('internalGetChatList', function (data) {
        internalChatModel.internalGetChatList(data, (err, chatList) => {
            if (err) io.sockets.to(socket.id).emit('error_callback', { "message": "error occur." });
            io.sockets.to(socket.id).emit('internalGetChatList', { "result": chatList });
        });
    });

    // Handle 'getConversationList' event
    socket.on('internalGetConversationList', async function (data) {
        internalChatModel.internalGetConversationList(data, (err, getConversationList) => {
            if (err) {
                console.log(err, "err");
                io.sockets.to(socket.id).emit('error_callback', { "message": "error occur." });
            } else {
                io.sockets.to(socket.id).emit('internalGetConversationList', { "result": getConversationList });
            }
        });
    });

    // Handle 'sendMessage' event
    socket.on('internalSendMessage', async function (data) {
        try {
            internalChatModel.internalSendChatMessage(data, async (err, res) => {
                io.sockets.to(socket.id).emit('internalSendMessage', { "result": res }); // Emit sent message to sender
                internalChatModel.internalGetReceiverSocketData(data, async (err1, r_data) => {
                    if (err || err1) {
                        io.sockets.to(socket.id).emit('error_callback', { "message": "error occur." });
                    }
                    const response = await internalChatModel.internalReceiveGetChatList(data.sender, data.receiver, data.sender_type, data.sender);

                    // Track processed subadmin IDs to avoid duplicate calls
                    const processedSubadminIds = new Set();
                    for (let i = 0; i < r_data.length; i++) {
                        let r_socketData = r_data[i];

                        // Check if the subadmin ID has already been processed
                        if (processedSubadminIds.has(r_socketData._id.toString())) {
                            continue; // Skip if already processed
                        }
                        const receiveChatList = await internalChatModel.internalReceiveGetChatList(data.sender, data.receiver, data.sender_type, r_socketData._id);
                        // Mark this subadmin ID as processed
                        processedSubadminIds.add(r_socketData._id.toString());

                        // console.log(r_socketData, 'r_socketData');
                        if (r_socketData.internal_chat_with == data.receiver) {
                            io.sockets.to(r_socketData.internal_socket_id).emit('internalReceiveMessage', { "result": res }); // Emit received message to receiver
                        }
                        if (r_socketData.internal_socket_id) {
                            // console.log(receiveChatList, 'inside else if receiveChatList');
                            io.sockets.to(r_socketData.internal_socket_id).emit('internalReceiveGetChatList', { "result": receiveChatList });
                        }
                    }
                    io.sockets.to(socket.id).emit('internalReceiveGetChatList', response);
                    io.sockets.to(socket.id).emit('internalReceiveMessage', { "result": res });
                });
            });
        } catch (error) {
            console.error(error);
            io.sockets.to(socket.id).emit('error_callback', { "message": "error occur." });
        }
    });

    // Update read status
    socket.on('internalUpdateReadStatus', function (data) {
        internalChatModel.internalUpdateReadStatus(data, async (err, dbData) => {
            if (err) io.sockets.to(socket.id).emit('error_callback', { "message": "error occur." });
            io.sockets.to(socket.id).emit('internalUpdateReadStatus', { "result": dbData });
            console.log('success');
        });
    })

    /**
     * Function to search messages
     * @param {string} groupId - The group ID.
     * @param {string} search - The search term.
     * @param {number} skip - The number of documents to skip.
     * @param {number} limit - The number of documents to return.
     */
    socket.on('internalSearchMessages', async (data) => {
        const { sender, group_id, search, skip, limit, type } = data;
        try {
            // Search messages using the internalSearchMessages function
            const response = await internalChatModel.internalSearchMessages(data);
            // Emit the search response back to the client
            io.sockets.to(socket.id).emit('internalSearchMessages', { "result": response });
        } catch (error) {
            console.error('Error in search:', error);
            // Handle error and emit error message back to the client
            io.sockets.to(socket.id).emit('error_callback', { message: 'Error in searching' });
        }
    });

    /**
    * Event listener for editing a message.
    * @param {Object} data - The data containing messageId and newContent.
    */
    socket.on('internalEditMessage', async function ({ sender, group_id, messageId, newContent }) {
        try {
            // Call the editMessage function and get the result
            const { message, socketIds, type } = await internalChatModel.internalEditMessage(sender, group_id, messageId, newContent);
            const receiveChatList = await internalChatModel.internalReceiveGetChatList(sender, group_id, messageId, sender);
            // Emit the edited message to all socket IDs associated with the group
            socketIds.forEach(socketId => {
                console.log(socketIds, 'socketIds')
                io.sockets.to(socketId).emit('internalEditMessage', { "result": message });
                if (type) {
                    console.log(type, 'type')
                    io.sockets.to(socketId).emit('internalReceiveGetChatList', { "result": receiveChatList });
                }
            });
            io.sockets.to(socket.id).emit('internalEditMessage', { "result": message });
        } catch (error) {
            console.error('Error editing message:', error);
            io.sockets.to(socket.id).emit('error_callback', { "message": "Failed to edit message" });
        }
    });

    /**
       * Event listener for unsending a message.
       * @param {Object} data - The data containing messageId.
       */
    socket.on('internalUnsendMessage', async function ({ sender, group_id, messageId }) {
        try {
            const { message, socketIds, type } = await internalChatModel.internalUnsendMessage(sender, group_id, messageId);
            const receiveChatList = await internalChatModel.internalReceiveGetChatList(sender, group_id, messageId, sender);
            // Emit the edited message to all socket IDs associated with the group
            socketIds.forEach(socketId => {
                console.log(socketIds, 'socketIds')
                io.sockets.to(socketId).emit('internalUnsendMessage', { "result": message });
                if (type) {
                    console.log(type, 'type')
                    io.sockets.to(socketId).emit('internalReceiveGetChatList', { "result": receiveChatList });
                }
            });
            // io.sockets.to(socket.id).emit('internalUnsendMessage', { "result": message });
        } catch (error) {
            console.error('Error unsending message:', error);
            io.sockets.to(socket.id).emit('error_callback', { "message": "Failed to unsend message" });
        }
    });

    // edit guest name
    socket.on('internalAddSubadminToGroup', async (data) => {
        const { group_id, subadmin_id } = data;
        try {
            // Update guest name the function from chatmodule.js
            const result = await internalChatModel.internalAddSubadminToGroup(group_id, subadmin_id, socket.id);
            // Emit updated guest data to the client-side
            io.sockets.to(socket.id).emit('internalAddSubadminToGroup', { "result": result });
        } catch (error) {
            console.error('Error adding subadmin:', error);
            // Handle error as needed
            io.sockets.to(socket.id).emit('error_callback', { "message": "Error in adding subadmin" });
        }
    });

    // Update read status
    socket.on('internalReadAllMessages', async (data) => {
        try {
            // Call the internalReadAllMessages function and wait for it to complete
            const dbData = await internalChatModel.internalReadAllMessages(data.sender, data.receiver);

            const { socketIds, type } = dbData.response;

            // Emit the event only if type is true
            if (type) {
                for (let socketId of socketIds) {
                    console.log(socketId, 'socketIds');

                    // Emit the updated read status to each relevant socket
                    io.sockets.to(socketId).emit('internalReadAllMessages', { result: dbData.message });
                }

                // Emit to the current socket as well
                // io.sockets.to(socket.id).emit('internalReadAllMessages', { result: dbData.message });

                console.log('Success: All messages marked as read.');
            } else {
                console.log('Not all subadmins have read the messages, no emit.');
            }

        } catch (err) {
            console.error('Error updating read status:', err);
            io.sockets.to(socket.id).emit('error_callback', { message: 'An error occurred.' });
        }
    });


    // Handle subadmin status change event
    socket.on('internalReadMessage', async (data) => {
        const { sender, messageId, receiver } = data;

        try {
            // Update subadmin status using the function from chatmodule.js
            const readMessage = await internalChatModel.internalUpdateReadBy(sender, messageId, receiver);
            // Check if the message.readStatus is 'read'
            if (readMessage.readStatus === 'read') {
                io.sockets.to(socket.id).emit('internalReadMessage', { "result": readMessage });
            }
        } catch (error) {
            console.error('Error in internal read message:', error);
            // Handle error as needed
            io.sockets.to(socket.id).emit('error_callback', { "message": "Error in internal read message" });
        }
    });

    socket.on('createGroup', async (data) => {
        const { sender, receiver } = data;
        try {
            // Update guest name the function from chatmodule.js
            const result = await internalChatModel.createGroup(sender, receiver, socket.id);
            // Emit updated guest data to the client-side
            io.sockets.to(socket.id).emit('createGroup', result);
        } catch (error) {
            console.error('Error creating group:', error);
            // Handle error as needed
            io.sockets.to(socket.id).emit('error_callback', { "message": "Error in creating group" });
        }
    });


    // Disconnect Chat
    socket.on('internalDisconnected', async function (data) {
        console.log("socket.id", socket.id);
        try {
            const res = await internalChatModel.disconnectUser(data, socket.id);
            io.sockets.to(socket.id).emit('internalDisconnected', { "result": res });
            console.log('User internalDisconnected');
        } catch (err) {
            console.error(err);
        }
    });

    //get veriff data
    socket.on('updateUserSocket', async function (data) {
        try {
            console.log(data, ' ', socket.id)
            const res = await veriffModel.updateUserSocket(data, socket.id);
            io.sockets.to(socket.id).emit('updateUserSocket', { "result": res });
            console.log('update user socket');
        } catch (err) {
            console.error(err);
        }
    });
    //get veriff data
    socket.on('getVeriffResponse', async function (data) {
        try {
            console.log(data, ' ', socket.id)
            const res = await veriffModel.getVeriffResponse(data);
            console.log('veriffResponse==', res)
            io.sockets.to(data.socket_id).emit('getVeriffResponse', { "result": res });
            console.log('User veriff status');
        } catch (err) {
            console.error(err);
        }
    });
    //get veriff data
    socket.on('getSubadminStatus', async function (data) {
        try {
            let res = {
                id: data.adminId, chat_status: data.newStatus, group_id: data.group_id, socketIds: data.socket_id
            }
            console.log(res, "res")
            io.sockets.to(data.socket_id).emit('statusChange', res);
        } catch (err) {
            console.error(err);
        }
    });
});
