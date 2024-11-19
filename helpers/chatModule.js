const dotenv = require('dotenv');
const Messages = require('../models/Message'); // Import your Messages model
const userModal = require("../models/users.model");
const userMembershipModal = require("../models/userMembership");
const adminModal = require("../models/admin");
const queryModal = require("../models/query");
const groupModal = require("../models/group");
const { ObjectId } = require('mongoose').Types;
const { default: mongoose } = require('mongoose');
const randomize = require("randomatic");
const commonservices = require("../helpers/v2/common");
const moment = require('moment');
const secretManagerAws = require('../helpers/secretManagerAws');
const cron = require('node-cron');
const { toObjectId } = require('../helpers/v2/common');
const path = require('path');
const { successResponse,
    requiredIdResponse,
    internalServerError,
    failMessage,
    successResponseWithoutData,
    successResponseWithPagination,
    emptyResponse,
    notFoundResponse,
    errorResponse,
    customResponse,
    NotAcceptable,
    Forbidden
} = require("../helpers/response");
var aws = require('aws-sdk');
var multerS3 = require('multer-s3');
var multer = require('multer');

// Load variables from .env
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Load variables from .envs
dotenv.config({ path: path.resolve(__dirname, '../config', '.envs') });


const updateSocket = async (postData, socket_id, callback) => {
    let updateData = {};
    let res;
    let newGroup;
    let check = false
    try {
        // if (!postData.receiver) {
        //     return callback(null, 'Please provide the subamdin id');
        // }
        // Function to generate a custom group name
        // const generateGroupName = (baseString, length) => {
        //     const characters = '0123456789';
        //     let result = baseString;

        //     for (let i = 0; i < length; i++) {
        //         const randomIndex = Math.floor(Math.random() * characters.length);
        //         result += characters[randomIndex];
        //     }

        //     return result;
        // };
        if (postData.sender_type === "guest") {

            const senderGroup = await groupModal.findOne({
                "users._id": { $all: [postData.sender] },
                chat_type: "guest",
                status: "active"
            });
            // if (postData.type === "guest" && postData.sender_type === "guest") {
            if (!senderGroup) {
                let guestName = 'Public User ' + randomize('0', 3);
                // If either sender or receiver does not exist in any active group, create a new group
                newGroup = new groupModal({
                    users: [
                        { _id: postData.sender, type: postData.sender_type, guest_name: guestName, socket_id: socket_id },
                        { _id: postData.receiver, type: "subadmin" }
                    ],
                    chat_type: "guest",
                    group_name: 'group_' + randomize('0', 6), // Generate a custom group name
                    //group_name: generateGroupName('group_', 6), // Generate a custom group name
                    status: 'active',
                    device_type: postData.device_type ? postData.device_type : ''
                });
                await newGroup.save();

                //   Increment request_count if sender_type is subadmin
                await adminModal.updateOne(
                    { _id: postData.receiver },
                    { $inc: { request_count: 1 } });
                // Find all inactive groups related to the sender
                const inactiveGroups = await groupModal.findOne({
                    "users": { $elemMatch: { _id: postData.sender } },
                    chat_type: "guest",
                    status: "inactive"
                }).sort({ createdAt: -1 });

                // Loop through the inactive groups
                if (inactiveGroups) {
                    // Find all messages related to this inactive group
                    const messages = await Messages.find({ receiver: inactiveGroups._id });
                    // Insert the messages into the new group and update their status
                    for (let message of messages) {
                        // Clone the message to insert it into the new group
                        let newMessage = new Messages({
                            ...message.toObject(),  // Clone all fields of the message
                            _id: new mongoose.Types.ObjectId(),  // Generate a new unique _id for the cloned message
                            receiver: newGroup._id,  // Assign the new group ID
                            status: 'active',  // Set the status to active
                        });

                        // Push the receiver into the is_deleted_by array
                        newMessage.is_deleted_by.push({ id: postData.receiver });

                        await newMessage.save();
                        // Update the original message status to 'inactive'
                        // await Messages.updateOne(
                        //     { _id: message._id },
                        //     { $set: { status: 'inactive' } }
                        // );
                    }
                }
                // let query = new queryModal({
                //     sender_id: postData.sender,
                //     // query: postData.message,
                //     group_id: newGroup._id,
                // });

                // await query.save();
                // Update the socket_id on the zeroth index of the users array where type is guest
                updateData = {
                    'users.$.socket_id': socket_id,
                };

                // Update the groupModal instead of userModal
                await groupModal.findOneAndUpdate(
                    { _id: newGroup._id, 'users._id': postData.sender, 'users.type': 'guest' },
                    { $set: updateData },
                    { new: true }
                );
                // newGroup.query_id = query._id;
                res = await newGroup.save();
            }
            // }
            // Update socket_id outside of the if condition
            newGroup = await groupModal.findOne({
                "users._id": { $all: [postData.sender] },
                chat_type: "guest",
                status: "active"
            });
            let subadmin;
            let inactiveSubadminIds = [];
            const group = await groupModal.findOne({ _id: newGroup._id });
            if (group) {
                let findSubadmin = newGroup.users.filter(user => user.type === 'subadmin' && user.active === 'true');
                if (findSubadmin.length > 0) {
                    // Update the socket_id on the zeroth index of the users array where type is guest
                    updateData = {
                        'users.$.socket_id': socket_id,
                    };

                    // Update the groupModal instead of userModal
                    await groupModal.findOneAndUpdate(
                        { _id: newGroup._id, 'users._id': postData.sender, 'users.type': 'guest' },
                        { $set: updateData },
                        { new: true }
                    );
                    // If there's at least one active subadmin, return the group immediately
                    // return callback(null, newGroup);
                    return callback(null, {
                        "result": {
                            is_deleted: newGroup.is_deleted,
                            group_name: newGroup.group_name,
                            chat_type: newGroup.chat_type,
                            query_id: newGroup.query_id,
                            isActive: newGroup.isActive,
                            users: newGroup.users.map(user => ({
                                _id: user._id,
                                socket_id: user.socket_id || '',
                                guest_name: user.guest_name || '',
                                user_name: user.user_name || '',
                                type: user.type,
                                active: user.active || "true"
                            })),
                            status: newGroup.status,
                            device_type: newGroup.device_type,
                            check, // check is true here
                            _id: newGroup._id,
                            createdAt: newGroup.createdAt,
                            updatedAt: newGroup.updatedAt
                        }
                    });
                }

                // subadmin = group.users.find(user => user.type === 'subadmin' && user.active === 'false');
                subadmin = group.users.filter(user => user.type === 'subadmin' && user.active === 'false');
                // Map to get only the IDs of the inactive subadmins
                inactiveSubadminIds = subadmin.map(user => user._id);

            }
            if (subadmin) {
                // Find the last message with type "disconnected"
                const lastDisconnectedMessage = await Messages.findOne({
                    receiver: newGroup._id,
                    message_type: "disconnect"
                }).sort({ createdAt: -1 });

                if (lastDisconnectedMessage) {
                    // Find all messages from the last "disconnected" message to the first message (in reverse order)
                    const messages = await Messages.find({
                        receiver: newGroup._id,
                        createdAt: { $lte: lastDisconnectedMessage.createdAt }
                    }).sort({ createdAt: -1 }); // Fetch in reverse order

                    // Update the messages to push the receiver into the is_deleted_by array
                    for (let message of messages) {
                        await Messages.updateOne(
                            { _id: message._id },
                            { $push: { is_deleted_by: { id: postData.receiver } } }
                        );
                    }
                }
                if (inactiveSubadminIds.includes(postData.receiver)) {
                    await groupModal.findOneAndUpdate(
                        { _id: newGroup._id, 'users._id': postData.receiver },
                        { $set: { 'users.$.active': 'true' } },
                        { new: true }
                    );
                    // Find the last message with type "disconnect"
                    const lastDisconnectedMessage = await Messages.findOne({
                        receiver: newGroup._id,
                        message_type: "disconnect"
                    }).sort({ createdAt: -1 });  // Get the latest 'disconnect' message

                    if (lastDisconnectedMessage) {
                        // Update messages created after the last "disconnect" message
                        await Messages.updateMany(
                            {
                                receiver: newGroup._id,
                                createdAt: { $gt: lastDisconnectedMessage.createdAt }, // Only messages created after 'disconnect'
                                // $or: [
                                //     { sender: postData.sender },
                                //     { sender: postData.receiver }
                                // ]
                            },
                            { $pull: { is_deleted_by: { id: postData.receiver } } }  // Pull the receiver's id from 'is_deleted_by'
                        );
                    } else {
                        // Update messages created after the last "disconnect" message
                        await Messages.updateMany(
                            {
                                receiver: newGroup._id,
                                // $or: [
                                //     { sender: postData.sender },
                                //     { sender: postData.receiver }
                                // ]
                            },
                            { $pull: { is_deleted_by: { id: postData.receiver } } }  // Pull the receiver's id from 'is_deleted_by'
                        );
                    }
                } else {
                    check = true;
                    const newUser = { _id: postData.receiver, type: 'subadmin', active: 'true' };

                    // Update the group by adding the new user to the users array
                    await groupModal.updateOne(
                        { _id: newGroup._id }, // Ensure the user is not already in the array
                        { $push: { users: newUser } }
                    );
                    // Find the last message with type "disconnected"
                    const disconnectMessage = await Messages.findOne({
                        receiver: newGroup._id,
                        message_type: "disconnect"
                    }).sort({ createdAt: -1 });

                    if (disconnectMessage) {
                        // Find all messages from the last "disconnected" message to the first message (in reverse order)
                        const messages = await Messages.find({
                            receiver: newGroup._id,
                            createdAt: { $lte: disconnectMessage.createdAt }
                        }).sort({ createdAt: -1 }); // Fetch in reverse order

                        // Update the messages to push the receiver into the is_deleted_by array
                        for (let message of messages) {
                            await Messages.updateOne(
                                { _id: message._id },
                                { $push: { is_deleted_by: { id: postData.receiver } } }
                            );
                        }
                    }
                }
                // // Define the update data
                // let updateData = {
                //     $set: {
                //         chat_with: newGroup._id,
                //         socket_id: socket_id
                //     },
                //     $inc: {
                //         request_count: 1
                //     }
                // };
                // await adminModal.findOneAndUpdate(
                //     { type: 'subadmin', _id: postData.receiver },
                //     updateData,
                //     {  new: true }
                // );
            }

            if (newGroup && socket_id) {
                newGroup.users[0].socket_id = socket_id;
                res = await newGroup.save();
            }
            // Update the socket_id on the zeroth index of the users array where type is guest
            updateData = {
                'users.$.socket_id': socket_id,
            };

            // Update the groupModal instead of userModal
            await groupModal.findOneAndUpdate(
                { _id: newGroup._id, 'users._id': postData.sender, 'users.type': 'guest' },
                { $set: updateData },
                { new: true }
            );
            res = await groupModal.findOne({
                "users._id": { $all: [postData.sender] },
                chat_type: "guest",
                status: "active"
            });

        }
        // Check if the sender and receiver exist in an active group
        if (postData.sender_type === "user") {
            const senderGroup = await groupModal.findOne({
                "users._id": { $all: [postData.sender] },
                chat_type: "user",
                status: "active"
            });
            if (!senderGroup) {
                // If either sender or receiver does not exist in any active group, create a new group
                let name = '';
                let find = await userModal.findOne({ _id: postData.sender })
                if (find) name = find.fullName
                newGroup = new groupModal({
                    users: [
                        { _id: postData.sender, type: postData.sender_type, user_name: name },
                        { _id: postData.receiver, type: "subadmin" }
                    ],
                    chat_type: "user",
                    group_name: 'group_' + randomize('0', 10), // Generate a custom group name
                    //group_name: generateGroupName('group_', 10), // Generate a custom group name
                    status: 'active',
                    device_type: postData.device_type ? postData.device_type : ''
                });
                await newGroup.save();

                if (postData.receiver) {
                    //   Increment request_count if sender_type is subadmin
                    await adminModal.findOneAndUpdate(
                        { _id: postData.receiver },
                        { $inc: { request_count: 1 } },
                        { new: true }
                    );
                }


                // Find all inactive groups related to the sender
                const inactiveGroups = await groupModal.findOne({
                    "users": { $elemMatch: { _id: postData.sender } },
                    chat_type: "user",
                    status: "inactive"
                }).sort({ createdAt: -1 });
                // Loop through the inactive groups
                if (inactiveGroups) {
                    // Find all messages related to this inactive group
                    const messages = await Messages.find({ receiver: inactiveGroups._id });
                    // Insert the messages into the new group and update their status
                    for (let message of messages) {
                        // Clone the message to insert it into the new group
                        let newMessage = new Messages({
                            ...message.toObject(),  // Clone all fields of the message
                            _id: new mongoose.Types.ObjectId(),  // Generate a new unique _id for the cloned message
                            receiver: newGroup._id,  // Assign the new group ID
                            status: 'active',  // Set the status to active
                        });
                        // Push the receiver into the is_deleted_by array
                        newMessage.is_deleted_by.push({ id: postData.receiver });

                        await newMessage.save();
                        // // Update the original message status to 'inactive'
                        // await Messages.updateOne(
                        //     { _id: message._id },
                        //     { $set: { status: 'inactive' } }
                        // );
                    }
                }
                // let query = new queryModal({
                //     sender_id: postData.sender,
                //     // query: postData.message,
                //     group_id: newGroup._id,
                // });

                // await query.save();
                updateData = {
                    chat_with: newGroup._id, //user_id
                    socket_id: socket_id,
                };

                res = await userModal.findOneAndUpdate(
                    { _id: postData.sender },
                    updateData,
                    { new: true }
                );
                // newGroup.query_id = query._id;
                res = await newGroup.save();
                // return callback(null, newGroup);
                return callback(null, {
                    "result": {
                        is_deleted: newGroup.is_deleted,
                        group_name: newGroup.group_name,
                        chat_type: newGroup.chat_type,
                        query_id: newGroup.query_id,
                        isActive: newGroup.isActive,
                        users: newGroup.users.map(user => ({
                            _id: user._id,
                            socket_id: user.socket_id || '',
                            guest_name: user.guest_name || '',
                            user_name: user.user_name || '',
                            type: user.type,
                            active: user.active || "true"
                        })),
                        status: newGroup.status,
                        device_type: newGroup.device_type,
                        check, // check is true here
                        _id: newGroup._id,
                        createdAt: newGroup.createdAt,
                        updatedAt: newGroup.updatedAt
                    }
                });
            }
            // if (postData.group_id) {
            newGroup = await groupModal.findOne({
                "users._id": { $all: [postData.sender] },
                chat_type: "user",
                status: "active"
            });
            let subadmin;
            let inactiveSubadminIds = [];
            const group = await groupModal.findOne({ _id: newGroup._id });
            if (group) {
                let findSubadmin = newGroup.users.filter(user => user.type === 'subadmin' && user.active === 'true');
                updateData = {
                    receiver_type: postData.receiver_type,
                    chat_with: newGroup._id, //user_id
                    socket_id: socket_id,
                };
                if (findSubadmin.length > 0) {
                    res = await userModal.findOneAndUpdate(
                        { _id: postData.sender },
                        updateData,
                        { new: true }
                    );
                    // If there's at least one active subadmin, return the group immediately
                    // return callback(null, newGroup);
                    return callback(null, {
                        "result": {
                            is_deleted: newGroup.is_deleted,
                            group_name: newGroup.group_name,
                            chat_type: newGroup.chat_type,
                            query_id: newGroup.query_id,
                            isActive: newGroup.isActive,
                            users: newGroup.users.map(user => ({
                                _id: user._id,
                                socket_id: user.socket_id || '',
                                guest_name: user.guest_name || '',
                                user_name: user.user_name || '',
                                type: user.type,
                                active: user.active || "true"
                            })),
                            status: newGroup.status,
                            device_type: newGroup.device_type,
                            check, // check is true here
                            _id: newGroup._id,
                            createdAt: newGroup.createdAt,
                            updatedAt: newGroup.updatedAt
                        }
                    });
                } else {
                    res = await userModal.findOneAndUpdate(
                        { _id: postData.sender },
                        updateData,
                        { new: true }
                    );
                }

                // subadmin = group.users.find(user => user.type === 'subadmin' && user.active === 'false');
                subadmin = group.users.filter(user => user.type === 'subadmin' && user.active === 'false');
                // Map to get only the IDs of the inactive subadmins
                inactiveSubadminIds = subadmin.map(user => user._id);

            }
            if (subadmin) {
                // Find the last message with type "disconnected"
                const lastDisconnectedMessage = await Messages.findOne({
                    receiver: newGroup._id,
                    message_type: "disconnect"
                }).sort({ createdAt: -1 });

                if (lastDisconnectedMessage) {
                    // Find all messages from the last "disconnected" message to the first message (in reverse order)
                    const messages = await Messages.find({
                        receiver: newGroup._id,
                        createdAt: { $lte: lastDisconnectedMessage.createdAt }
                    }).sort({ createdAt: -1 }); // Fetch in reverse order

                    // Update the messages to push the receiver into the is_deleted_by array
                    for (let message of messages) {
                        await Messages.updateOne(
                            { _id: message._id },
                            { $push: { is_deleted_by: { id: postData.receiver } } }
                        );
                    }
                }
                if (inactiveSubadminIds.includes(postData.receiver)) {
                    await groupModal.findOneAndUpdate(
                        { _id: newGroup._id, 'users._id': postData.receiver },
                        { $set: { 'users.$.active': 'true' } },
                        { new: true }
                    );
                    // Find the last message with type "disconnect"
                    const lastDisconnectedMessage = await Messages.findOne({
                        receiver: newGroup._id,
                        message_type: "disconnect"
                    }).sort({ createdAt: -1 });  // Get the latest 'disconnect' message

                    if (lastDisconnectedMessage) {
                        // Update messages created after the last "disconnect" message
                        await Messages.updateMany(
                            {
                                receiver: newGroup._id,
                                createdAt: { $gt: lastDisconnectedMessage.createdAt }, // Only messages created after 'disconnect'
                                // $or: [
                                //     { sender: postData.sender },
                                //     { sender: postData.receiver }
                                // ]
                            },
                            { $pull: { is_deleted_by: { id: postData.receiver } } }  // Pull the receiver's id from 'is_deleted_by'
                        );
                    } else {
                        // Update messages created after the last "disconnect" message
                        await Messages.updateMany(
                            {
                                receiver: newGroup._id,
                                // $or: [
                                //     { sender: postData.sender },
                                //     { sender: postData.receiver }
                                // ]
                            },
                            { $pull: { is_deleted_by: { id: postData.receiver } } }  // Pull the receiver's id from 'is_deleted_by'
                        );
                    }
                } else {
                    check = true;
                    const newUser = { _id: postData.receiver, type: 'subadmin', active: 'true' };

                    // Update the group by adding the new user to the users array
                    await groupModal.updateOne(
                        { _id: newGroup._id }, // Ensure the user is not already in the array
                        { $push: { users: newUser } }
                    );
                    // Find the last message with type "disconnected"
                    const disconnectMessage = await Messages.findOne({
                        receiver: newGroup._id,
                        message_type: "disconnect"
                    }).sort({ createdAt: -1 });

                    if (disconnectMessage) {
                        // Find all messages from the last "disconnected" message to the first message (in reverse order)
                        const messages = await Messages.find({
                            receiver: newGroup._id,
                            createdAt: { $lte: disconnectMessage.createdAt }
                        }).sort({ createdAt: -1 }); // Fetch in reverse order

                        // Update the messages to push the receiver into the is_deleted_by array
                        for (let message of messages) {
                            await Messages.updateOne(
                                { _id: message._id },
                                { $push: { is_deleted_by: { id: postData.receiver } } }
                            );
                        }
                    }
                }
                // Define the update data
                // let updateData = {
                //     $set: {
                //         chat_with: newGroup._id,
                //         socket_id: socket_id
                //     },
                //     $inc: {
                //         request_count: 1
                //     }
                // };
                // await adminModal.findOneAndUpdate(
                //     { type: 'subadmin', _id: postData.receiver },
                //     updateData,
                //     {  new: true }
                // );


            }

            updateData = {
                receiver_type: postData.receiver_type,
                chat_with: newGroup._id, //user_id
                socket_id: socket_id,
            };
            res = await userModal.findOneAndUpdate(
                { _id: postData.sender },
                updateData,
                { new: true }
            );
            res = await groupModal.findOne({
                "users._id": { $all: [postData.sender] },
                chat_type: "user",
                status: "active"
            });
        }
        if (postData.sender_type === "subadmin") {

            updateData = {
                chat_with: postData.receiver,
                socket_id: socket_id,
            };
            res = await adminModal.findOneAndUpdate(
                { type: 'subadmin', _id: postData.sender },
                updateData,
                { new: true }
            );

            newGroup = await groupModal.findOne({
                _id: postData.receiver,
                status: 'active'
            });
            // Find the group based on the receiver and active subadmin
            const group = await groupModal.findOne(
                { _id: postData.receiver, 'users': { $elemMatch: { type: 'subadmin', active: 'true' } } },
                { 'users.$': 1 } // Projection to return only the first matched user
            );
            if (!group) {
                // // If no such group found, create a new user object in the users array
                // const newUser = { _id: postData.sender, type: 'subadmin', active: 'true' };

                // // Update the group by adding the new user to the users array
                // await groupModal.updateOne(
                //     { _id: postData.receiver },
                //     { $push: { users: newUser } },
                //     { } // Add this option to create a new document if it doesn't exist
                // );


                // Update is_deleted_by field in the message model
                // let newSub = {
                //     id: postData.sender
                // }
                // await Messages.updateMany(
                //     { receiver: postData.receiver },
                //     { $push: { is_deleted_by: newSub } },
                //     { } // Add this option to create a new document if it doesn't exist
                // );
            }
        }
        if (postData.sender_type === "admin") {

            newGroup = await groupModal.findOne({
                _id: postData.receiver,
                status: 'active'
            });
            updateData = {
                receiver_type: postData.receiver_type,
                chat_with: postData.receiver,
                socket_id: socket_id,
            };

            res = await adminModal.findOneAndUpdate(
                { type: 'admin', _id: postData.sender },
                updateData,
                { new: true }
            );
        }
        // callback(null, res); // Return newGroup if it exists, otherwise return res
        return callback(null, {
            "result": {
                is_deleted: res.is_deleted,
                group_name: res.group_name,
                chat_type: res.chat_type,
                query_id: res.query_id,
                isActive: res.isActive,
                users: res.users.map(user => ({
                    _id: user._id,
                    socket_id: user.socket_id || '',
                    guest_name: user.guest_name || '',
                    user_name: user.user_name || '',
                    type: user.type,
                    active: user.active || "true"
                })),
                status: res.status,
                device_type: res.device_type,
                check, // check is true here
                _id: res._id,
                createdAt: res.createdAt,
                updatedAt: res.updatedAt
            }
        });
    } catch (error) {
        console.error("Error updating socket:", error);
        callback(error, null);
    }
};

// Initialize the base query
const getChatList = async (postData, callback) => {
    try {
        const page = parseInt(postData.page, 10) || 1;
        const limit = parseInt(postData.limit, 10) || 10;
        const skip = (page - 1) * limit;
        const searchKey = postData.searchKey || '';

        let query = {};
        // Construct the query object
        if (postData.sender_type == 'subadmin') {
            query = {
                $and: [
                    { isActive: true }, // Ensure the group is active
                    {
                        $or: [
                            { "users._id": { $in: [String(postData.sender)] } }, // Match provided sender ID
                            // { "users._id": { $exists: false } },  // Match cases where users._id is missing
                            // { "users._id": { $eq: null } }, // Handle explicitly null values in users._id
                            { "users._id": { $eq: "" } } // Handle empty string in users._id
                        ]
                    },
                    { "users.type": 'subadmin' }, // Ensure users are subadmins
                    { "users.active": 'true' } // Ensure users are active
                ]
            };
        } else {
            query = {
                isActive: true,
                status: "active"
            };
        }

        const pipeline = [
            { $match: query },  // Apply the query to the pipeline
            ...(searchKey ? [{
                $match: {
                    $or: [
                        { 'users.guest_name': { $regex: searchKey, $options: 'i' } },
                        { 'users.user_name': { $regex: searchKey, $options: 'i' } }
                    ]
                }
            }] : []),
            {
                $lookup: {
                    from: 'messages',
                    let: { groupId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: [{ $toString: '$receiver' }, { $toString: '$$groupId' }] } } },
                        { $sort: { createdAt: -1 } },
                        { $limit: 1 }
                    ],
                    as: 'latestMessage'
                }
            },
            { $addFields: { latestMessage: { $arrayElemAt: ['$latestMessage', 0] } } },
            { $addFields: { unreadMessages: { $ifNull: [{ $arrayElemAt: ['$unreadMessages.unread', 0] }, 0] } } },
            {
                $addFields: {
                    isChat: {
                        $cond: [
                            { $eq: ['$status', 'inactive'] },  // Check if group status is 'inactive'
                            false,  // Directly set isChat to false for inactive groups
                            {
                                $gt: [
                                    {
                                        $size: {
                                            $filter: {
                                                input: '$users',
                                                as: 'user',
                                                cond: {
                                                    $and: [
                                                        { $eq: ['$$user.type', 'subadmin'] },
                                                        { $eq: ['$$user.active', 'true'] }
                                                    ]
                                                }
                                            }
                                        }
                                    },
                                    0
                                ]
                            }
                        ]
                    }
                }
            },
            { $sort: { 'latestMessage.createdAt': -1 } },
            { $skip: skip },
            { $limit: limit }
        ];
        const chats = await groupModal.aggregate(pipeline);

        const result = await Promise.all(chats.map(async group => {
            let sender_name = 'Unknown';
            let chat_status = '';
            let memberType = '';
            let receiver = '';
            let unreadCount = 0;

            // Cast group._id to ObjectId for the query
            const groupId = toObjectId(group._id);

            // Fetch the unread count correctly considering the read_by array
            unreadCount = await Messages.countDocuments({
                receiver: groupId,
                'read_by.id': { $ne: toObjectId(postData.sender) }, // Ensure sender ID is not in the read_by array
                message_type: { $ne: 'disconnect' }  // Exclude messages with message_type 'disconnect'
            });

            // Initialize arrays for subadmin status and isChat
            let subadminChatStatus = [];

            // Check for subadmins and their active status
            group.users.forEach(user => {
                if (user.type === 'subadmin') {
                    subadminChatStatus.push({
                        subadmin_id: user._id,
                        isChat: user.active === 'true' ? true : false
                    });

                    // Update isChat to true if an active subadmin is found
                    // if (user.active === 'true') {
                    //     isChat = true;
                    // }
                }
            });

            if (group.users.length > 0) {
                const firstUser = group.users[0];
                if (firstUser.type === 'user') {
                    const user = await userModal.findOne({ _id: firstUser._id }).exec();
                    memberType = 'Free Prev';
                    if (user) {
                        chat_status = user.chat_status;
                        sender_name = user.fullName;
                        const user_membership = await userMembershipModal.findOne({ user_id: user._id, status: "active" });
                        if (user_membership) {
                            memberType = 'Member since ' + moment(user.createdAt).format('YYYY');
                        }
                        receiver = user._id;
                    }
                } else if (firstUser.type === 'guest') {
                    memberType = 'Pellentesque venantis';
                    sender_name = firstUser.guest_name || 'Unknown';
                    receiver = firstUser._id;
                }
            }

            return {
                _id: group._id,
                chat_type: group.chat_type,
                group_name: group.group_name,
                device_type: group.device_type || '',
                status: group.status,
                unreadCount: unreadCount,
                latest_message: group.latestMessage ? group.latestMessage.message : '',
                sender_name: sender_name,
                chat_status: chat_status,
                memberType: memberType,
                receiver: receiver,
                createdAt: group.createdAt,
                updatedAt: group.updatedAt,
                isChat: group.isChat, // Add isChat key
                subadminChatStatus: subadminChatStatus // Array containing subadmin chat status
            };
        }));

        callback(null, result);
    } catch (error) {
        console.error('Error in getChatList:', error);
        callback(error, null);
    }
};
let getConversationList = async (postData, callback) => {
    try {
        // Pagination parameters
        const page = parseInt(postData.page, 10) || 1; // Default to page 1 if not provided
        const limit = parseInt(postData.limit, 10) || 20; // Default to 20 items per page if not provided
        const skip = (page - 1) * limit; // Calculate the number of items to skip

        // Fetch messages with different sorting based on sender_type
        let messages;
        if (postData.sender_type === 'guest' || postData.sender_type === 'user') {
            // Fetch messages for guest users with reverse order
            messages = await Messages.find({
                $or: [
                    { receiver: postData.receiver, status: 'active' }
                ],
                // 'is_deleted_by.id': { $ne: postData.sender }
            }).sort({ createdAt: -1 }).skip(skip).limit(limit);
        } else {
            // Fetch messages for other types of users with ascending order
            messages = await Messages.find({
                $or: [
                    { receiver: postData.receiver, status: 'active' }
                ],
                // message_type: { $ne: "disconnect" } // Exclude messages with message_type "disconnect"
                'is_deleted_by.id': { $ne: postData.sender }
            }).sort({ createdAt: -1 }).skip(skip).limit(limit); // Changed to ascending order
        }
        // Prepare the result array
        const arr = [];

        for (const chat of messages) {
            let info;
            let name;
            let profile_pic = ''; // Initialize profile_pic variable

            // Check if sender is already in read_by array and update if necessary
            const isSenderInReadBy = chat.read_by.some((readEntry) => readEntry.id.toString() === postData.sender.toString());

            if (!isSenderInReadBy) {
                // Add the sender to the read_by array if not already present
                chat.read_by.push({ id: postData.sender });
                // Update the readStatus for this message to "read"
                chat.readStatus = 'read';
                await chat.save(); // Save the updated message document
            }
            if (chat.sender_type === 'user') {
                info = await userModal.findOne({ _id: chat.sender });
                name = info ? info.fullName : ''; // Check if info is not null before accessing properties
                profile_pic = info ? info.profile_pic : ''; // Assign profile_pic only if info is not null
            } else if (chat.sender_type === 'admin' || chat.sender_type === 'subadmin') {
                // Combine admin and subadmin cases into one, as they have similar logic
                const type = chat.sender_type === 'admin' ? 'admin' : 'subadmin';
                info = await adminModal.findOne({ _id: chat.sender, type });
                name = info ? `${info.first_name} ${info.last_name}` : ''; // Check if info is not null before accessing properties
            } else if (chat.sender_type === 'guest') {
                info = await groupModal.findOne({ _id: postData.receiver, 'users.id': chat.sender });
                name = info && info.users && info.users[0] ? info.users[0].guest_name : 'guest';
            }

            // Handle media files (images, videos, etc.) if the media key exists and has items
            let mediaData = [];
            if (Array.isArray(chat.media) && chat.media.length > 0) {
                mediaData = await Promise.all(chat.media.map(async (item) => {
                    const isMediaUrl = await commonservices.isValidUrl(item.mediaUrl);
                    const isThumbnailUrl = await commonservices.isValidUrl(item.thumbnail);
                    let mediaUrl = '';
                    let thumbnail = '';

                    if (isThumbnailUrl && item.thumbnail) {
                        const bucketName = await commonservices.checkBucketName(item.thumbnail);
                        thumbnail = bucketName === process.env.CHAT_MEDIA_BUCKET
                            ? await commonservices.fetchS3file(item.thumbnail, process.env.CHAT_MEDIA_BUCKET)
                            : item.thumbnail;
                    }

                    if (isMediaUrl && item.mediaUrl) {
                        const bucketName = await commonservices.checkBucketName(item.mediaUrl);
                        mediaUrl = bucketName === process.env.CHAT_MEDIA_BUCKET
                            ? await commonservices.fetchS3file(item.mediaUrl, process.env.CHAT_MEDIA_BUCKET)
                            : item.mediaUrl;
                    }

                    if (!mediaUrl) {
                        mediaUrl = ''; // Set to empty string if mediaUrl is invalid
                    }

                    return {
                        type: item.type || '',
                        mediaFullUrl: mediaUrl,
                        thumbnailFullUrl: thumbnail
                    };
                }));
            }


            arr.push({
                _id: chat._id,
                sender_type: chat.sender_type,
                sender: chat.sender,
                receiver: chat.receiver,
                message: chat.message,
                media: mediaData, // Push the mediaData array separately
                message_type: chat.message_type || '',
                user_name: name,
                profile_pic: profile_pic, // Assign the calculated profile_pic
                createdAt: chat.createdAt,
                type: chat.type,
                count_un: chat.unread_cn,
                readStatus: chat.readStatus
            });
        }
        callback(null, arr);
    } catch (error) {
        console.error(error); // Log any errors that occur during the process
        callback(error);
    }
};
const sendChatMessage = async (postData, callback) => {
    try {
        let name;
        let profile_pic;
        let group = await groupModal.findOne({ _id: postData.receiver, isActive: true });
        let subadminIds = [];
        let data = []; // Declare data outside of the media handling scope

        if (group) {
            // Collect socket IDs and subadmin IDs of active subadmins
            subadminIds = group.users
                .filter(user => user.type === 'subadmin' && user.active === 'false')
                .map(user => user._id); // Collect only subadmin IDs
        }
        // Create a new message document
        let newMessage = new Messages({
            sender_type: postData.sender_type,
            sender: postData.sender,
            receiver: postData.receiver,
            message: postData.message,
            message_type: postData.message_type,
            // receiver_type: postData.receiver_type,
            readStatus: 'unread',
            is_deleted_by: subadminIds.map(subadminId => ({ id: subadminId })), // Map subadminIds to the correct format
            read_by: [{ id: postData.sender }] // Insert sender into the read_by array here
        });

        // Handle media files (images, videos, etc.)
        if (postData.media && postData.media.length > 0) {
            newMessage.media = postData.media.map(item => ({
                thumbnail: item.thumbnail || '',
                mediaUrl: item.mediaUrl || '',
                type: item.type || ''
            }));
        }

        let savedMessage = await newMessage.save();
        await groupModal.findOneAndUpdate(
            { _id: postData.receiver },
            { isActive: true },
            { new: true }
        );
        let chat_data = await Messages.findOne({ _id: savedMessage._id });
        if (chat_data !== null) {
            let image = "";
            if (chat_data.image && chat_data.image !== "") {
                image = process.env.BASE_URL + chat_data.image;
            }
        }

        // Check if a document with the given user_id and query_status: 'active' exists
        // const existingQuery = await queryModal.findOne({ group_id: postData.receiver, query_status: 'active', query_request: 'pending' });
        // if (!existingQuery) {
        //     let query = new queryModal({
        //         sender_id: postData.sender,
        //         query: postData.message,
        //         group_id: postData.receiver,
        //     });

        //     let savedQuery = await query.save();
        // }

        // Handle media files (images, videos, etc.)
        if (postData.media && postData.media.length > 0) {
            data = await Promise.all(postData.media.map(async (item) => {
                const isMediaUrl = await commonservices.isValidUrl(item.mediaUrl);
                const isThumbnailUrl = await commonservices.isValidUrl(item.thumbnail);
                let mediaUrl;
                let thumbnail;
                // Handle the thumbnail
                if (isThumbnailUrl) {
                    const bucketName = await commonservices.checkBucketName(item.thumbnail);
                    thumbnail = bucketName === process.env.CHAT_MEDIA_BUCKET
                        ? await commonservices.fetchS3file(item.thumbnail, process.env.CHAT_MEDIA_BUCKET)
                        : item.thumbnail;
                } else {
                    // If thumbnail is null, assign an empty string instead of trying to fetch it
                    thumbnail = item.thumbnail ?
                        await commonservices.fetchS3fileByKey(item.thumbnail, process.env.CHAT_MEDIA_BUCKET)
                        : ''; console.log(thumbnail, 'thumbnail')
                }

                // Handle media URL
                if (isMediaUrl) {
                    const bucketName = await commonservices.checkBucketName(item.mediaUrl);
                    mediaUrl = bucketName === process.env.CHAT_MEDIA_BUCKET
                        ? await commonservices.fetchS3file(item.mediaUrl, process.env.CHAT_MEDIA_BUCKET)
                        : item.mediaUrl;
                } else {
                    // If mediaUrl is null, assign an empty string instead of trying to fetch it
                    mediaUrl = item.mediaUrl ?
                        await commonservices.fetchS3fileByKey(item.mediaUrl, process.env.CHAT_MEDIA_BUCKET)
                        : '';
                }

                return {
                    type: item.type || '',
                    mediaFullUrl: mediaUrl,
                    thumbnailFullUrl: thumbnail
                };
            }));
        }
        if (postData.sender_type === 'user') {
            info = await userModal.findOne({ _id: postData.sender });
            name = info ? info.fullName : ''; // Check if info is not null before accessing properties
            profile_pic = info ? info.profile_pic : ''; // Assign profile_pic only if info is not null
        } else if (postData.sender_type === 'admin' || postData.sender_type === 'subadmin') {
            // Combine admin and subadmin cases into one, as they have similar logic
            const type = postData.sender_type === 'admin' ? 'admin' : 'subadmin';
            info = await adminModal.findOne({ _id: postData.sender, type });
            name = info ? `${info.first_name} ${info.last_name}` : ''; // Check if info is not null before accessing properties
        } else if (postData.sender_type === 'guest') {
            info = await groupModal.findOne({ _id: postData.receiver, 'users.id': postData.sender });
            name = info ? info.users[0].guest_name : 'guest'; // Check if info is not null before accessing properties
        }
        if (savedMessage) {
            const response = {
                _id: savedMessage._id, // Assuming _id is used as chat_id
                sender_type: savedMessage.sender_type,
                sender: savedMessage.sender,
                receiver: savedMessage.receiver,
                message_type: savedMessage.message_type,
                // receiver_type: savedMessage.receiver_type,
                message: savedMessage.message,
                media: data.map(mediaItem => ({
                    thumbnail: mediaItem.thumbnailFullUrl,
                    mediaUrl: mediaItem.mediaFullUrl,
                    type: mediaItem.type
                })), profile_pic: profile_pic,
                sender_name: name,
                readStatus: savedMessage.readStatus,
                createdAt: savedMessage.createdAt,
            };
            callback(null, response);
            return;
        }
    } catch (error) {
        console.error(error, "error response in chat");
        callback(error);
    }
};

const getReceiverSocketData = async (postData, callback) => {
    try {
        let receiverData = [];
        let check = false;
        let query;
        query = await groupModal.findOne({
            _id: postData.receiver,
            status: 'active',
            // users: {
            //     $elemMatch: {
            //         type: 'subadmin',
            //         active: "true"
            //     }
            // }
        });
        if (query) {
            for (let i = 0; i < query.users.length; i++) {
                let currentUser = query.users[i];

                // Handle case when the sender is a subadmin and _id is missing for subadmin
                if (postData.sender_type === 'subadmin' && currentUser.type === 'subadmin' && currentUser.active === 'true' && !currentUser._id) {
                    check = true;
                    console.log(postData, 'postData')
                    // Update the empty _id for subadmin in the users array
                    await groupModal.updateOne(
                        {
                            _id: toObjectId(postData.receiver),
                            "users.type": 'subadmin',     // Match subadmins in the users array
                            "users._id": ''               // Match where the user ID is empty
                        },
                        {
                            $set: { "users.$[elem]._id": postData.sender } // Update the matched elements' _id to the sender ID
                        },
                        {
                            arrayFilters: [
                                { "elem._id": "", "elem.type": "subadmin" } // Array filter to specify conditions on elements
                            ]
                        }
                    );

                    // Also update the chat_with field in adminModal for the sender
                    await adminModal.updateOne(
                        { _id: toObjectId(postData.sender) },
                        { $set: { chat_with: postData.receiver } }
                    );

                    // Since the document was updated, fetch the updated query
                    query = await groupModal.findOne({
                        _id: postData.receiver,
                        status: 'active',
                    });
                    console.log(query, 'queryquery')
                    // // Since the update is done, break out of the loop to continue processing
                    break;
                }
            }
        }
        if (query) {
            for (let i = 0; i < query.users.length; i++) {
                if (query.users[i].type === 'user' && query.users[i].type != postData.sender_type) {
                    let userData = await userModal.findOne({ _id: query.users[i]._id, status: 'active' });
                    if (userData) {
                        userData.type = 'user'; // Add type field
                        userData.check = check; // Add check field
                        receiverData.push(userData);
                    }
                } else if (query.users[i].type === 'guest' && query.users[i].type != postData.sender_type) {
                    let userdata = {
                        _id: query.users[i]._id,
                        type: query.users[i].type,
                        check: query.users[i].check,
                        socket_id: query.users[i].socket_id,
                        chat_with: postData.receiver
                    }
                    receiverData.push(userdata)
                }
                else if (query.users[i].type === 'subadmin' && query.users[i].active === 'true' && query.users[i]._id != postData.sender) {
                    // else if (query.users[i].type === 'subadmin' && query.users[i].type != postData.sender_type) {

                    let adminData = await adminModal.findOne({ _id: query.users[i]._id, status: 'active', type: query.users[i].type });
                    adminData.check = check; // Add check field
                    receiverData.push(adminData);
                }
            }
        }
        // let receiverData;
        // if (postData.receiver_type === 'user') {
        //     receiverData = await userModal.findOne({ _id: postData.receiver, status: 'active' });
        // } else if (postData.receiver_type === 'subadmin') {
        //     receiverData = await adminModal.findOne({ _id: postData.receiver, status: 'active', user_type: 'subadmin' });
        // } else if (postData.receiver_type === 'admin') {
        //     receiverData = await adminModal.findOne({ _id: postData.receiver, status: 'active', user_type: 'admin' });
        // }
        if (receiverData) {
            callback(null, receiverData);
        } else {
            callback(null, null);
        }
    } catch (error) {
        console.error(error, "error name");
        callback(error, null);
    }
};

const updateReadStatus = async (postData, callback) => {
    try {
        const updateData = {
            readStatus: 'read'
        };

        // const filter = {
        //     $or: [
        //         {
        //             sender: postData.sender,
        //             receiver: postData.receiver,
        //             // sender_type: postData.sender_type,
        //             // receiver_type: postData.receiver_type
        //         },
        //         {
        //             sender: postData.guest,
        //             receiver: postData.receiver,
        //             // sender_type: postData.receiver_type,
        //             // receiver_type: postData.sender_type
        //         }
        //     ]
        // };

        // Define the filter to match all messages in the group for the given receiver,
        // but exclude messages sent by the specific sender whose _id is provided
        const filter = {
            receiver: postData.receiver,
            sender: { $ne: postData.sender } // Exclude messages from the specified sender
        };

        const result = await Messages.updateMany(filter, updateData);

        callback(null, result);
    } catch (error) {
        console.error(error);
        callback(error);
    }
};

// Function to update subadmin status in the database and get updated data
const updateSubadminStatus = async (subadminId, type, sender_type) => {
    try {
        if (!subadminId) {
            return { message: 'Please provide the sender id' };
        }
        let response = null;
        let socketIds = [];
        let groupId = ''
        console.log(subadminId, "subadminId")
        console.log(type, "type")
        console.log(sender_type, "sender_type")

        if (sender_type === 'user') {
            // Update user status in userModal
            await userModal.updateOne(
                { _id: toObjectId(subadminId) },
                { $set: { chat_status: type } }
            );

            // Find the group containing the subadmin
            let group = await groupModal.findOne({
                "users._id": toObjectId(subadminId),
                status: "active",
                // isActive: true
            });
            if (!group) {
                return { message: 'Group not Found' };
            }

            if (group) {
                groupId = group._id;

                // Filter active subadmins in the group
                const activeSubadmins = group.users.filter(user => user.type === 'subadmin');

                // Collect socket IDs of active subadmins
                if (activeSubadmins.length > 0) {
                    const subadmins = await adminModal.find(
                        { _id: { $in: activeSubadmins.map(admin => admin._id) } },
                        'socket_id'
                    );
                    socketIds = subadmins.map(admin => admin.socket_id).filter(Boolean);
                }

                // Calculate the time difference
                // const currentTime = new Date();
                // const groupUpdateTime = new Date(group.updatedAt);
                // const timeDifference = (currentTime - groupUpdateTime) / 1000 / 60; // Difference in minutes

                // console.log(`Time difference is: ${timeDifference} minutes`);

                // // If time difference > 5 minutes and the status is 'offline', update active status
                // if (timeDifference > 5 && type === 'offline') {
                //     console.log("Setting subadmin active status to false after 5 minutes");

                //     const activeSubadminIds = activeSubadmins.map(user => toObjectId(user._id));

                //     // Update the active status of subadmins in groupModal
                //     // Use MongoDB's $set operator to update the `active` status directly
                //     await groupModal.updateOne(
                //         {
                //             _id: groupId,
                //             "users._id": { $in: activeSubadminIds }, // Match any of the active subadmins
                //             'users.type': 'subadmin',
                //             'users.active': 'true' // Ensure this matches the current value in the database
                //         },
                //         {
                //             $set: { "users.$[elem].active": "false" }, // Set the active status to false
                //         },
                //         {
                //             arrayFilters: [{ "elem._id": { $in: activeSubadminIds } }], // Filter to update specific subadmins
                //             new: true // Return the updated document
                //         }
                //     );
                //     console.log(`Updated active status to false for group ${group._id}`);

                //     // Decrement request count in adminModal
                //     await adminModal.updateMany(
                //         { _id: { $in: activeSubadminIds }, request_count: { $gt: 0 } },
                //         { $inc: { request_count: -1 } }
                //     );
                // }
            }
            let userData = await userModal.findById(subadminId);
            // Find all active groups for the user and map the response
            const activeGroups = await groupModal.find({
                'users._id': toObjectId(subadminId),
                isActive: true,
            }).exec();

            response = activeGroups.map(groupData => ({
                id: userData._id,
                group_id: groupData._id,
                chat_status: userData.chat_status,
                socketIds
            }));
            return response;
        } else if (sender_type == 'subadmin') {
            // Update admin status
            await adminModal.updateOne({ _id: subadminId }, { $set: { chat_status: type } });
            response = await adminModal.findById(subadminId);

            const groups = await groupModal.find({
                "users._id": subadminId,
                // chat_type: "user",
                status: "active"
            });
            for (let group of groups) {
                if (type == "offline") {
                    await groupModal.updateOne(
                        {
                            _id: toObjectId(group._id), // Group ID
                            'users._id': subadminId, // Match the subadmin by their ID
                            'users.type': 'subadmin', // Match the type as 'subadmin'
                            'users.active': 'true' // Ensure the active status is true
                        },
                        {
                            $set: { 'users.$[elem].active': 'false' } // Set the active status to 'false'
                        },
                        {
                            arrayFilters: [{ 'elem._id': subadminId, 'elem.type': 'subadmin' }], // Use arrayFilters to target matching elements
                            new: true // Return the updated document
                        }
                    );
                    await adminModal.findOneAndUpdate(
                        { _id: subadminId, request_count: { $gt: 0 } },
                        { $inc: { request_count: -1 } },
                        { new: true }
                    );
                }
                const user = group.users.find(user => user.type === 'user' && user.active == 'true');
                if (user) {
                    const userData = await userModal.findById(user._id, 'socket_id');
                    if (userData?.socket_id) {
                        socketIds.push(userData.socket_id);
                    }
                }
            }
        }
        else if (sender_type === 'guest') {
            // Find the group containing the guest
            const group = await groupModal.findOne({
                "users._id": toObjectId(subadminId), // Find the guest's group
                status: "active",
                // isActive: true
            });

            if (!group) {
                return { message: 'Group not Found' };
            }
            // Update guest status
            await userModal.findOneAndUpdate(
                { _id: toObjectId(subadminId) }, // Convert subadminId to ObjectId
                { $set: { chat_status: type } }, // Update guest's chat status
                { new: true }
            );

            if (group) {
                groupId = group._id;

                // Collect active subadmins from the group
                const activeSubadmins = group.users.filter(user => user.type === 'subadmin');

                if (activeSubadmins.length > 0) {
                    const subadminIds = activeSubadmins.map(admin => toObjectId(admin._id));
                    const subadmins = await adminModal.find(
                        { _id: { $in: subadminIds } }, // Convert IDs to ObjectId
                        'socket_id' // Only get the socket_id field
                    );
                    socketIds = subadmins.map(admin => admin.socket_id).filter(Boolean); // Ensure socket IDs are valid

                    // const currentTime = new Date();
                    // const groupUpdateTime = new Date(group.updatedAt);
                    // const timeDifference = (currentTime - groupUpdateTime) / 1000 / 60; // Difference in minutes

                    // console.log(`Time difference for guest is: ${timeDifference} minutes`);

                    // // If time difference > 5 minutes and the status is 'offline', update active status
                    // if (timeDifference > 5 && type === 'offline') {
                    //     console.log("Setting subadmin active status to false after 5 minutes for guest");

                    //     await groupModal.updateOne(
                    //         {
                    //             _id: groupId,
                    //             "users._id": { $in: subadminIds }, // Match any of the active subadmins
                    //             'users.type': 'subadmin',
                    //             'users.active': 'true' // Ensure this matches the current value in the database
                    //         },
                    //         {
                    //             $set: { "users.$[elem].active": "false" }, // Set the active status to false
                    //         },
                    //         {
                    //             arrayFilters: [{ "elem._id": { $in: subadminIds } }], // Filter to update specific subadmins
                    //             new: true // Return the updated document
                    //         }
                    //     );
                    //     console.log(`Updated active status to false for group ${group._id} with guest`);

                    //     // Decrement request count in adminModal
                    //     await adminModal.updateMany(
                    //         { _id: { $in: subadminIds }, request_count: { $gt: 0 } },
                    //         { $inc: { request_count: -1 } }
                    //     );
                    // }
                }
            }
            response = await await groupModal.findOne({
                "users._id": toObjectId(subadminId), // Find the guest's group
                status: "active",
                // isActive: true
            });

        }

        // Return the final response
        response = [{
            id: response._id,
            chat_status: response.chat_status,
            sender_type: sender_type,
            group_id: groupId,
            socketIds
        }]
        return response

    } catch (error) {
        console.error('Error updating subadmin status:', error);
        return error;
    }
};


// Function to find online subadmins and determine the one with the minimum request count
const findOnlineSubadmins = async (sender) => {
    try {
        // Fetch and sort subadmins by chat_status and request_count, limit to 1
        const subadmin = await adminModal.findOne({
            $or: [
                { chat_status: 'idle', type: 'subadmin', status: 'active' },
                { chat_status: 'online', type: 'subadmin', status: 'active' }
            ]
        }).sort({
            chat_status: 1,  // 'idle' will come before 'online'
            request_count: 1 // Sort by request_count in ascending order
        }).exec();

        // Check if any subadmin is found
        if (!subadmin) {
            return { message: 'No active subadmins available.' };
        }

        // Find the group with the given sender and an active subadmin
        const findSender = await groupModal.findOne({
            "users._id": sender,
            status: "active",
            "users": {
                $elemMatch: {
                    type: "subadmin",
                    active: "true" // Ensure the subadmin is active
                }
            }
        });
        console.log(findSender, 'findSender')

        // If a matching subadmin is found in the group, fetch the subadmin's details from adminModal
        if (
            findSender &&
            findSender.users.length > 0 &&
            !findSender.users.some(user => user._id === '' && user.type === 'subadmin' && user.active === "true")
        ) {
            const activeSubadmin = findSender.users.find(user => user.type === 'subadmin' && user.active == "true");
            if (activeSubadmin) {
                console.log(activeSubadmin, 'activeSubadmin')
                const subadminDetails = await adminModal.findById(activeSubadmin._id, 'first_name last_name');
                return {
                    subadmin_id: subadminDetails._id,
                    first_name: subadminDetails.first_name,
                    last_name: subadminDetails.last_name,
                };
            }
        }

        // If no active subadmin is found in the group, return the default subadmin's details
        return {
            subadmin_id: subadmin._id,
            first_name: subadmin.first_name,
            last_name: subadmin.last_name,
        };

    } catch (error) {
        console.error('Error finding optimal subadmin:', error);
        return { error: 'Error finding optimal subadmin.' };
    }
};
const disconnectUser = async (postData, socket_id) => {
    try {
        // Update data to set chat_with to 0 and socket_id to ""
        let res = {};
        let response = {};
        let updateData = {
            chat_with: "",
            socket_id: ""
        };

        let socketIds = [];

        // Find the user document based on the socket_id
        // const user = await userModal.findOne({ socket_id: socket_id });

        // if (!user) {
        //     throw new Error("User not found");
        // }

        // Update the user document
        if (postData.sender_type == "user") {
            res = await userModal.updateOne({ _id: postData.sender }, updateData);
            // let subadmin;
            if (postData.messageId) {
                let subadmin;
                res = await groupModal.findOne({
                    "users._id": { $all: [postData.sender] },
                    chat_type: "user",
                    status: "active"
                });
                if (res) {
                    subadmin = res.users.find(user => user.type === 'subadmin' && user.active === 'true');
                    // Collect socket IDs of active subadmins
                    const subadminIds = res.users
                        .filter(user => user.type === 'subadmin' && user.active == 'true')
                        .map(user => user._id);

                    if (subadminIds.length > 0) {
                        const subadmins = await adminModal.find({ _id: { $in: subadminIds } }, 'socket_id');
                        socketIds = subadmins.map(admin => admin.socket_id).filter(Boolean);
                    }
                }

                const subadminId = subadmin?._id;

                if (subadminId) {
                    await groupModal.findOneAndUpdate(
                        {
                            _id: res?._id, // Group ID
                            'users._id': subadminId, // Match the subadmin by their ID
                            'users.type': 'subadmin',
                            'users.active': 'true' // Ensure this matches the current value in the database
                        },
                        {
                            $set: { 'users.$.active': 'false' } // Set the active status to 'false'
                        },
                        {
                            new: true // Return the updated document
                        }
                    );
                    await adminModal.findOneAndUpdate(
                        { _id: subadminId, request_count: { $gt: 0 } },
                        { $inc: { request_count: -1 } },
                        { new: true }
                    );
                }
                // Update the isActive status of the group to false and status to 'inactive'
                await groupModal.findByIdAndUpdate(
                    res._id, // Group ID
                    {
                        $set: {
                            // isActive: false, // Set isActive to false
                            status: 'inactive' // Set status to 'inactive'
                        }
                    },
                    { new: true } // Return the updated document
                );

                // Update the message status to inactive
                // await Messages.updateMany(
                //     { receiver: res._id }, // Query to find messages
                //     { $set: { status: 'inactive' } } // Set the status to inactive
                // );
                await Messages.findOneAndUpdate(
                    { _id: postData.messageId },
                    { $set: { type: true } },
                    { new: true }
                );

            }
            response = {
                res, socketIds
            }

        } else if (postData.sender_type == "subadmin") {
            // updateData.chat_status = "offline"; //updating chat status offile on disconnect
            // updateData.request_count = 0; // request count 0 on disconnect
            res = await adminModal.updateOne({ _id: postData.sender }, updateData);
        } else if (postData.sender_type == "admin") {
            res = await adminModal.updateOne({ _id: postData.sender }, updateData);
        } else if (postData.sender_type == "guest") {
            updateData = {
                socket_id: ""
            }
            res = await groupModal.updateOne({ 'users._id': postData.sender, _id: res._id }, updateData);
            if (postData.messageId) {
                let subadmin;
                res = await groupModal.findOne({
                    "users._id": { $all: [postData.sender] },
                    chat_type: "guest",
                    status: "active"
                });
                // Check if res is null or undefined
                if (!res) {
                    return callback(new Error("Group not found"));
                }
                if (res) {
                    // Now compare active as a string
                    subadmin = res.users.find(user => user.type === 'subadmin' && user.active === 'true');

                    // Collect socket IDs of active subadmins
                    const subadminIds = res.users
                        .filter(user => user.type === 'subadmin' && user.active)
                        .map(user => user._id);

                    if (subadminIds.length > 0) {
                        const subadmins = await adminModal.find({ _id: { $in: subadminIds } }, 'socket_id');
                        socketIds = subadmins.map(admin => admin.socket_id).filter(Boolean);
                    }
                }

                // Update is_deleted_by field in the message model
                // Assuming subadminId is a valid ObjectId
                const subadminId = subadmin._id;

                if (subadminId) {
                    await groupModal.findOneAndUpdate(
                        {
                            _id: res?._id, // Group ID
                            'users._id': subadminId, // Match the subadmin by their ID
                            'users.type': 'subadmin',
                            'users.active': 'true' // Ensure this matches the current value in the database
                        },
                        {
                            $set: { 'users.$.active': 'false' } // Set the active status to 'false'
                        },
                        {
                            new: true // Return the updated document
                        }
                    );
                    await adminModal.findOneAndUpdate(
                        { _id: subadminId, request_count: { $gt: 0 } },
                        { $inc: { request_count: -1 } },
                        { new: true }
                    );
                }
                // Update the isActive status of the group to false and status to 'inactive'
                await groupModal.findByIdAndUpdate(
                    res._id, // Group ID
                    {
                        $set: {
                            // isActive: false, // Set isActive to false
                            status: 'inactive' // Set status to 'inactive'
                        }
                    },
                    { new: true } // Return the updated document
                );
                await Messages.findOneAndUpdate(
                    { _id: postData.messageId },
                    { $set: { type: true } },
                    { new: true }
                );
            }
            response = {
                res, socketIds
            }
            // await Messages.updateMany(
            //     { receiver: postData.sender },
            //     { $set: { status: 'inactive' } }
            // );
        }

        return response;
    } catch (err) {
        console.error(err);
        return err;
    }
};
//update guest name
const editGuestName = async (group_id, name) => {
    try {

        //update guest name in chat group
        let updateData = await groupModal.findOneAndUpdate(
            {
                _id: toObjectId(group_id),
                'users.type': 'guest'
            },
            {
                $set: {
                    'users.$.guest_name': name
                }
            },
            { new: true }
        );

        // If the update was successful, return the response in the desired format
        if (updateData) {
            return {
                id: group_id,
                name: name
            };
        }
    } catch (error) {
        console.error(error);
        return error;
    }
};

/**
 * Edits a message with the given message ID and new content.
 * @param {string} messageId - The ID of the message to edit.
 * @param {string} newContent - The new content for the message.
 * @returns {Object} - The updated message or an error.
 */
const editMessage = async (sender, groupId, messageId, newContent) => {
    try {
        // Find the message by ID and update its content
        const message = await Messages.findByIdAndUpdate(
            messageId,
            { message: newContent },
            { new: true }
        );

        let socketIds = [];

        // Find the group
        const findGroup = await groupModal.findOne({
            _id: groupId,
            isActive: true
        });

        // Find the latest message in the group
        const latestMessage = await Messages.findOne({ receiver: groupId })
            .sort({ createdAt: -1 }) // Sort by createdAt to get the latest message
            .exec();

        // Determine if the edited message is the latest one
        const type = latestMessage && latestMessage._id.equals(messageId);
        if (!findGroup) {
            return 'Group not found or inactive';
        }

        // Loop through the users in the group
        for (let i = 0; i < findGroup.users.length; i++) {
            const user = findGroup.users[i];

            if (user.type === 'user') {
                const userSocket = await userModal.findOne({ _id: user._id }, 'socket_id');
                if (userSocket && userSocket.socket_id) {
                    socketIds.push(userSocket.socket_id);
                }
            } else if (user.type === 'guest') {
                if (user.socket_id) {
                    socketIds.push(user.socket_id);
                }
            } else if (user.type === 'admin' || user.type === 'subadmin') {
                const adminSocket = await adminModal.findOne({ _id: user._id }, 'socket_id');
                if (adminSocket && adminSocket.socket_id) {
                    socketIds.push(adminSocket.socket_id);
                }
            }
        }

        // Return the edited message along with the socket IDs
        return {
            message,
            socketIds,
            type
        };
    } catch (error) {
        console.error('Error editing message:', error);
        return { error };
    }
};

/**
 * Unsends a message by updating its status to 'unsent'.
 * @param {string} messageId - The ID of the message to unsend.
 * @returns {Object} - The updated message or an error.
 */
const unsendMessage = async (sender, groupId, messageId) => {
    try {
        // Find the message by ID
        const message = await Messages.findById(messageId);
        if (message) {
            // Update the status to 'unsent'
            message.status = 'unsent';
            await message.save();
        }

        let socketIds = [];

        // Find the group
        const findGroup = await groupModal.findOne({
            _id: groupId,
            isActive: true
        });

        if (!findGroup) {
            throw new Error('Group not found or inactive');
        }
        // Find the latest message in the group
        const latestMessage = await Messages.findOne({ receiver: groupId })
            .sort({ createdAt: -1 }) // Sort by createdAt to get the latest message
            .exec();

        // Determine if the edited message is the latest one
        const type = latestMessage && latestMessage._id.equals(messageId);
        // Loop through the users in the group
        for (let i = 0; i < findGroup.users.length; i++) {
            const user = findGroup.users[i];

            if (user.type === 'user') {
                const userSocket = await userModal.findOne({ _id: user._id }, 'socket_id');
                if (userSocket && userSocket.socket_id) {
                    socketIds.push(userSocket.socket_id);
                }
            } else if (user.type === 'guest') {
                if (user.socket_id) {
                    socketIds.push(user.socket_id);
                }
            } else if (user.type === 'admin' || user.type === 'subadmin') {
                const adminSocket = await adminModal.findOne({ _id: user._id }, 'socket_id');
                if (adminSocket && adminSocket.socket_id) {
                    socketIds.push(adminSocket.socket_id);
                }
            }
        }

        // Return the edited message along with the socket IDs
        return {
            message,
            socketIds,
            type
        };
    } catch (error) {
        console.error('Error unsending message:', error);
        return error;
    }
};


/**
 * Searches messages in a group and returns results with sender information.
 * @param {Object} data - The search criteria.
 * @param {string} data.group_id - The ID of the group to search within.
 * @param {string} data.search - The search query for message content.
 * @param {number} data.skip - The number of messages to skip.
 * @param {number} data.limit - The number of messages to limit the results to.
 * @returns {Object} - List of messages with sender information and total count.
 */
const searchMessages = async (data) => {
    const { group_id, search, skip, limit, sender } = data;

    try {
        // Check if the group exists
        const groupExists = await groupModal.exists({ _id: group_id });
        if (!groupExists) {
            return { messages: [], totalCount: 0, pagecount: [] }; // Return empty results if group does not exist
        }

        // Retrieve total count of matching messages based on search criteria
        const totalCount = await Messages.countDocuments({
            receiver: group_id,
            status: "active",
            'is_deleted_by.id': { $ne: sender },
            message: { $regex: search, $options: 'i' }, // Case-insensitive search
        });

        // Retrieve messages based on search criteria with sorting
        const messages = await Messages.find({
            receiver: group_id,
            status: "active",
            'is_deleted_by.id': { $ne: sender },
            message: { $regex: search, $options: 'i' }, // Case-insensitive search
        })
            .sort({ createdAt: -1 }) // Sort by creation date in descending order
            .skip(parseInt(skip, 10))
            .limit(parseInt(limit, 10))
            .exec();

        // Retrieve all matching messages without search criteria with sorting
        const allMessages = await Messages.find({
            receiver: group_id,
            status: "active",
            'is_deleted_by.id': { $ne: sender },
        })
            .sort({ createdAt: -1 }) // Sort by creation date in descending order
            .exec();


        // Check if messages are found
        if (!messages || messages.length === 0) {
            return { messages: [], totalCount, pagecount: [] }; // Return empty results if no messages are found
        }

        // Update each message with sender's name and index in allMessages
        const updatedMessages = await Promise.all(messages.map(async (msg) => {
            let info;
            let name;

            // Find the index of the message in allMessages
            const messageIndex = allMessages.findIndex(msgItem => msgItem._id.equals(msg._id));

            // Calculate the page number (quotient) based on the message index and limit
            const pageNumber = Math.floor(messageIndex / parseInt(limit, 10)) + 1;

            switch (msg.sender_type) {
                case 'user':
                    info = await userModal.findOne({ _id: msg.sender });
                    name = info ? info.fullName : ''; // Check if info is not null before accessing properties
                    break;

                case 'admin':
                case 'subadmin': {
                    // Combine admin and subadmin cases into one, as they have similar logic
                    const type = msg.sender_type === 'admin' ? 'admin' : 'subadmin';
                    info = await adminModal.findOne({ _id: msg.sender, type });
                    name = info ? `${info.first_name} ${info.last_name}` : ''; // Check if info is not null before accessing properties
                    break;
                }

                case 'guest':
                    info = await groupModal.findOne({ _id: group_id, 'users._id': msg.sender });
                    if (info && info.users) {
                        const guestUser = info.users.find(user => user._id.toString() === msg.sender.toString());
                        name = guestUser ? guestUser.guest_name : 'guest';
                    } else {
                        name = 'guest';
                    }
                    break;

                default:
                    name = 'Unknown';
                    break;
            }

            // Return the message object with the added name field, index, and page number
            return {
                _id: msg._id,
                sender: msg.sender,
                receiver: msg.receiver,
                message: msg.message,
                createdAt: msg.createdAt,
                readStatus: msg.readStatus,
                name, // Add the name field to the message object
                index: messageIndex, // Add the index of the message in allMessages
                pageNumber // Add the page number based on the index and limit
            };
        }));

        return { messages: updatedMessages, totalCount };
    } catch (error) {
        console.error('Error searching messages:', error);
        throw error; // Rethrow the error for handling in the calling function
    }
};
const addSubadminToGroup = async (subadmin_ids, group_id, socket_id) => {
    try {
        // Split the subadmin_ids string into an array and filter out invalid ObjectId strings
        const subadminIdsArray = subadmin_ids.split(',')
            .map(id => id.trim())
            .filter(id => toObjectId(id)); // Validate ObjectId format

        // Check if the group exists and does not already contain the subadmins
        let existingGroup = await groupModal.findOne({
            _id: group_id,
            status: 'active',
            'users._id': { $in: subadminIdsArray } // Check if any of the subadmin IDs are already in the users array
        });

        let updateResults;
        if (!existingGroup) {
            // Update the group by adding the new subadmins to the users array
            updateResults = await groupModal.updateOne(
                { _id: group_id },
                { $push: { users: { $each: subadminIdsArray.map(subadminId => ({ _id: subadminId, type: 'subadmin', active: 'true' })) } } },
                {} // Ensure that it creates a new document if needed
            );
            // Fetch and return the updated group
            existingGroup = await groupModal.findOne({ _id: group_id });
        }
        // Fetch socket IDs for the subadmins
        const subadmins = await adminModal.find(
            { _id: { $in: subadminIdsArray } },
            { _id: 1, socket_id: 1 } // Fetch only _id and socket_id fields
        );
        // Create a response array that includes both subadmin ID and socket ID
        const subadminSocketMap = subadmins.map(subadmin => ({
            _id: subadmin._id,
            socket_id: subadmin.socket_id
        }));
        return { group: existingGroup, subadminSocketMap };
    } catch (error) {
        console.error('Error adding subadmin to group:', error);
        throw error; // Propagate the error
    }
};
// const receiveChatList = async (sender, receiver, sender_type, subadmin) => {
//     try {
//         // Initialize result
//         let result = {};
//         let receivers = '';

//         // Find the group where the sender is in the users array and the group is active and isActive is true
//         const group = await groupModal.findOne({
//             'users._id': sender,
//             _id: receiver,
//             status: 'active',
//             isActive: true
//         }).exec();

//         // if (!group) {
//         //     return { message: "No group found" };
//         // }
//         // Find the latest chat message for the group
//         const latestChat = await Messages.findOne({
//             receiver: group?._id,
//             status: 'active'
//         }).sort({ createdAt: -1 }).exec();

//         // // Count unread messages excluding those sent by the specified sender
//         // const unreadCount = await Messages.countDocuments({
//         //     // sender: { $ne: sender }, // Exclude messages from the specified sender
//         //     receiver: group._id,
//         //     status: 'active',
//         //     readStatus: 'unread'
//         // }).exec();
//         let unreadCount = 0;
//         // if (sender_type === 'guest') {
//         //     // Count unread messages excluding those sent by the specified sender
//         //     unreadCount = await Messages.countDocuments({
//         //         // sender: { $ne: sender }, // Exclude messages from the specified sender
//         //         receiver: group?._id,
//         //         sender_type: 'guest',
//         //         // 'read_by.id': { $ne: ObjectId(sender) },// Ensure sender ID is not in the read_by array
//         //         status: 'active',
//         //         readStatus: 'unread'
//         //     }).exec();
//         // } else if (sender_type === 'user') {
//         //     unreadCount = await Messages.countDocuments({
//         //         // sender: { $ne: sender }, // Exclude messages from the specified sender
//         //         receiver: group?._id,
//         //         // 'read_by.id': { $ne: ObjectId(sender) },// Ensure sender ID is not in the read_by array
//         //         sender_type: 'user',
//         //         status: 'active',
//         //         readStatus: 'unread'
//         //     }).exec();
//         // } else {
//         unreadCount = await Messages.countDocuments({
//             // sender: { $ne: sender }, // Exclude messages from the specified sender
//             receiver: group?._id,
//             'read_by.id': { $ne: toObjectId(subadmin) },// Ensure sender ID is not in the read_by array
//             'is_deleted_by.id': { $ne: toObjectId(subadmin) },// Ensure sender ID is not in the is_deleted_by array
//             // sender_type: 'subadmin',
//             status: 'active',
//             // readStatus: 'unread'
//         }).exec();
//         // }
//         let latest_message = '';
//         if (latestChat) {
//             latest_message = latestChat.message;
//         }

//         let sender_name = 'Unknown';
//         let chat_status = '';
//         let memberType = '';
//         let isChat = false;

//         if (group?.users.length > 0) {
//             const firstUser = group.users[0];
//             if (firstUser.type === 'user') {
//                 const user = await userModal.findOne({ _id: firstUser._id }).exec();
//                 memberType = firstUser.type;
//                 if (user) {
//                     chat_status = user.chat_status;
//                     memberType = 'Free Prev'; // Default value; modify as needed
//                     let user_membership = await userMembershipModal.findOne({ user_id: firstUser._id, status: "active" });
//                     if (user_membership) {
//                         memberType = 'Member since ' + moment(user.createdAt).format('YYYY');
//                     }
//                     sender_name = user.fullName;
//                 }
//                 receivers = firstUser ? firstUser._id : '';
//             } else if (firstUser.type === 'guest') {
//                 memberType = 'Pellentesque venantis'; // Adjust as needed
//                 sender_name = firstUser.guest_name;
//                 receivers = firstUser ? firstUser._id : '';
//             }
//         }
//         // Check if any active subadmin is online in the group
//         if (group) {
//             const activeSubadmins = group.users.filter(user => user.type === 'subadmin' && user.active === 'true');
//             if (activeSubadmins.length > 0) {
//                 isChat = true;
//             }
//         }
//         result = {
//             _id: group._id ? group._id : '',
//             chat_type: group.chat_type ? group.chat_type : '',
//             group_name: group.group_name ? group.group_name : '',
//             device_type: group.device_type || '',
//             status: group.status ? group.status : '',
//             unreadCount: unreadCount, // Use unreadCount as the unread count
//             latest_message: latest_message ? latest_message : '', // Include latest message
//             sender_name: sender_name, // Include sender name
//             chat_status: chat_status ? chat_status : '', // Include chat status only if type is user
//             memberType: memberType,
//             receiver: receivers ? receivers : '',
//             createdAt: group.createdAt ? group.createdAt : '',
//             updatedAt: group.updatedAt ? group.updatedAt : '',
//             isChat: isChat // Add isChat key
//         };

//         return result;

//     } catch (error) {
//         console.error('Error retrieving chat list:', error);
//         throw error; // Re-throw error to handle it in the caller
//     }
// };

const receiveChatList = async (sender, receiver, sender_type, subadmin, message_type) => {
    try {
        // Initialize an array to store results
        let result = [];
        // Array to store subadmin chat status
        let subadminChatStatus = [];
        let receivers = '';

        // Find all groups where the sender is in the users array and the group is active and isActive is true
        let groups = await groupModal.find({
            'users._id': sender,
            _id: receiver,
            isActive: true,
            status: 'active'
        }).exec();

        if (sender_type == 'user' || sender_type == 'guest') {
            if (message_type == 'disconnect') {
                groups = await groupModal.find({
                    'users._id': sender,
                    isActive: true,
                }).exec();
            }
        }
        if (!groups || groups.length === 0) {
            return { message: "No group found" };
        }
        // Loop through each group found
        for (let group of groups) {
            // Find the latest chat message for the group
            const latestChat = await Messages.findOne({
                receiver: group._id,
                status: 'active'
            }).sort({ createdAt: -1 }).exec();

            // Count unread messages excluding those sent by the specified sender
            const unreadCount = await Messages.countDocuments({
                receiver: group._id,
                'read_by.id': { $ne: toObjectId(subadmin) }, // Ensure sender ID is not in the read_by array
                'is_deleted_by.id': { $ne: toObjectId(subadmin) }, // Ensure sender ID is not in the is_deleted_by array
                status: 'active',
                message_type: { $ne: 'disconnect' }  // Exclude messages with message_type 'disconnect'
            }).exec();

            let latest_message = '';
            if (latestChat) {
                latest_message = latestChat.message;
            }

            let sender_name = 'Unknown';
            let chat_status = '';
            let memberType = '';
            let isChat = false

            if (group.users.length > 0) {
                const firstUser = group.users[0];
                if (firstUser.type === 'user') {
                    const user = await userModal.findOne({ _id: firstUser._id }).exec();
                    memberType = firstUser.type;
                    if (user) {
                        chat_status = user.chat_status;
                        memberType = 'Free Prev'; // Default value; modify as needed
                        let user_membership = await userMembershipModal.findOne({ user_id: firstUser._id, status: "active" });
                        if (user_membership) {
                            memberType = 'Member since ' + moment(user.createdAt).format('YYYY');
                        }
                        sender_name = user.fullName;
                    }
                    receivers = firstUser ? firstUser._id : '';
                } else if (firstUser.type === 'guest') {
                    memberType = 'Pellentesque venantis'; // Adjust as needed
                    sender_name = firstUser.guest_name;
                    receivers = firstUser ? firstUser._id : '';
                }
            }

            // Check for subadmins and their active status
            group.users.forEach(user => {
                if (user.type === 'subadmin') {
                    // Create an object for each subadmin with their id and isChat status
                    subadminChatStatus.push({
                        subadmin_id: user._id,
                        isChat: user.active === 'true' ? true : false
                    });

                    // If any subadmin is active, set isChat to true
                    // if (user.active === 'true') {
                    //     isChat = true;
                    // }
                }
            });
            // If the group status is inactive, set isChat to false
            if (group.status === 'inactive') {
                isChat = false;
            }

            // Push each group's result into the result array
            result.push({
                _id: group._id || '',
                chat_type: group.chat_type || '',
                group_name: group.group_name || '',
                device_type: group.device_type || '',
                status: group.status || '',
                unreadCount: unreadCount || 0,
                latest_message: latest_message || '',
                sender_name: sender_name || 'Unknown',
                chat_status: chat_status || '', // Include chat status only if type is user
                memberType: memberType || '',
                receiver: receivers || '',
                createdAt: group.createdAt || '',
                updatedAt: group.updatedAt || '',
                isChat: isChat, // Add isChat key
                subadminChatStatus: subadminChatStatus // Array containing subadmin chat status
            });
        }
        return result;

    } catch (error) {
        console.error('Error retrieving chat list:', error);
        throw error; // Re-throw error to handle it in the caller
    }
};

const unreadCount = async (sender) => {
    try {
        // Find the group where the sender is in the users array and the group is active and isActive is true
        const group = await groupModal.findOne({
            'users._id': sender,
            status: 'active',
            isActive: true
        });

        if (!group) {
            return { message: "No group found" };
        }

        // Count unread messages excluding those sent by the specified sender
        const count = await Messages.countDocuments({
            // sender: { $ne: sender }, // Exclude messages from the specified sender
            sender_type: 'subadmin',
            receiver: group._id,
            status: 'active',
            // readStatus: 'unread'
            'read_by.id': { $ne: toObjectId(sender) },// Ensure sender ID is not in the read_by array
        }).exec();
        console.log(count, "count")
        // Return the result, unreadCount will be zero if no unread messages are found
        return {
            unreadCount: count
        };

    } catch (error) {
        console.error('Error retrieving unread count:', error);
        throw error; // Re-throw error to handle it in the caller
    }
};


const updateReadBy = async (sender, messageId, groupId, sender_type) => {
    try {
        // Find the message by messageId
        let message = await Messages.findById(messageId);

        if (!message) {
            return 'Message not found';
        }
        // Check if the sender is already in the read_by array
        const isSenderInReadBy = message.read_by.some((readEntry) => readEntry.id.toString() === sender.toString());

        if (sender_type == 'user' || sender_type == 'guest') {

            // Update the readStatus for this message to "read"
            message.readStatus = 'read';
        }
        // If sender is not in read_by, add the sender to the array
        // if (!isSenderInReadBy) {
        message.read_by.push({ id: sender });

        // Save the updated message document
        await message.save();
        // }

        // // Find the group and filter subadmins
        // let findGroup = await groupModal.findOne({
        //     _id: groupId,
        //     'users.type': 'subadmin',
        //     'users.active': 'true'
        // });

        // if (!findGroup) {
        //     return { message: message, groupStatus: 'No matching group found' };
        // }

        // // Array to store socket IDs of active subadmins
        // let socketIds = [];

        // // Loop through the users array and collect socket IDs of subadmins
        // for (let user of findGroup.users) {
        //     if (user.type === 'subadmin' && user.active === 'true') {
        //         let findSocketId = await adminModal.findById(user._id);
        //         // Assuming each user has a socketId field
        //         let socketId = findSocketId?.socket_id;
        //         if (socketId) {
        //             socketIds.push(socketId);
        //         }
        //     }
        // }
        // Find the socket ID of the message sender in the adminModal
        let socketId = '';
        let findSocketId = await adminModal.findById(message.sender);

        if (findSocketId) {
            socketId = findSocketId.socket_id;
        }
        // Return the response with the updated message and socket ID
        return { result: message, socketId: socketId };

    } catch (error) {
        console.error('Error in updateReadBy:', error);
        return { success: false, message: 'An error occurred', error };
    }
};

const readAllMessages = async (sender, receiver) => {
    try {
        // Find all messages for the specified receiver
        let messages = await Messages.find({ receiver: receiver });
        if (!messages || messages.length === 0) {
            return { success: false, message: 'No messages found for this receiver' };
        }

        let socketData = [];
        let group = await groupModal.findOne({ _id: receiver, isActive: true });

        if (group) {
            // Collect socket IDs and subadmin IDs of active subadmins
            const subadminIds = group.users
                .filter(user => user.type === 'subadmin')
                .map(user => user._id);

            if (subadminIds.length > 0) {
                const subadmins = await adminModal.find({ _id: { $in: subadminIds } }, 'socket_id _id');
                socketData = subadmins
                    .filter(admin => admin.socket_id)  // Ensure only valid socket IDs are included
                    .map(admin => ({ socketId: admin.socket_id, subadminId: admin._id }));
            }
        }

        // Loop through each message and check if the sender is in the read_by array
        for (let message of messages) {
            const isSenderInReadBy = message.read_by.some((readEntry) => readEntry.id.toString() === sender.toString());

            // If the sender is not in the read_by array, add them
            if (!isSenderInReadBy) {
                message.read_by.push({ id: sender });

                // Update the readStatus for this message to "read"
                message.readStatus = 'read';

                // Save the updated message document
                await message.save();
            }
        }

        // Ensure socketData is properly defined
        if (socketData.length === 0) {
            return { success: false, message: 'No active subadmins found or no socket IDs available' };
        }

        // Returning the socket IDs, subadmin IDs, and receiver
        return { response: { socketData, receiver }, message: 'All messages marked as read' };

    } catch (error) {
        console.error('Error in readAllMessages:', error);
        return { success: false, message: 'An error occurred', error };
    }
};

const updateSubadminSocket = async (sender, socketId, sender_type) => {
    try {
        // Find all messages for the specified receiver
        let updateData = {
            socket_id: socketId,
            internal_socket_id: socketId,
        };
        let res;
        if (sender_type == 'user') {
            updateData = {
                socket_id: socketId,
            };
            res = await userModal.findOneAndUpdate(
                { _id: sender },
                updateData,
                { new: true }
            );
        } else if (sender_type == 'subadmin') {
            res = await adminModal.findOneAndUpdate(
                { type: 'subadmin', _id: sender },
                updateData,
                { new: true }
            );
        } else if (sender_type == 'guest') {
            // Update the socket_id on the zeroth index of the users array where type is guest
            updateData = {
                'users.$.socket_id': socketId,
            };
            // Update the groupModal instead of userModal
            res = await groupModal.findOneAndUpdate(
                { 'users._id': sender, 'users.type': 'guest' },
                { $set: updateData },
                { new: true }
            );
        }
        // Returning the socket IDs and receiver
        return { res };

    } catch (error) {
        console.error('Error in update subadmin socket:', error);
        return { success: false, message: 'An error occurred', error };
    }
};

cron.schedule('0 0 * * *', async () => {
    try {
        const now = moment().tz('Australia/Sydney');
        console.log(`Cron job executed at: ${now.format('YYYY-MM-DD HH:mm:ss')}`);

        // Find active groups with inactive: true
        const activeGroups = await groupModal.find({
            status: 'active',
            chat_type: 'guest',
            isActive: true
        }).sort({ createdAt: -1 });

        if (activeGroups.length === 0) {
            console.log('No active groups found with inactive: true');
            return;
        }

        // Process each group
        for (const group of activeGroups) {
            // Find the latest message for the group
            const latestMessage = await Messages.findOne({
                receiver: group._id,
                status: 'active'
            }).sort({ _id: -1 }).exec();

            if (latestMessage) {
                const messageTime = moment(latestMessage.createdAt).tz('Australia/Sydney');
                const daysDifference = now.diff(messageTime, 'days');
                console.log(messageTime, 'messageTime');
                console.log(daysDifference, 'daysDifference');

                // If the difference is greater than 7 days, update group status
                if (daysDifference > 7) {
                    await groupModal.updateOne(
                        { _id: group._id, chat_type: 'guest' },
                        { $set: { isActive: false } }
                    );
                    console.log(`Group ${group._id} status updated to inactive.`);
                }
            } else {
                console.log(`No messages found for group ${group._id}`);
            }
        }

        // Additional logic for checking every 30 seconds
        setTimeout(async () => {
            console.log('Additional check after 30 seconds');
            // Add additional checks or tasks here
        }, 30000); // 30 seconds

    } catch (error) {
        console.error('Error executing cron job:', error);
    }
}, {
    scheduled: true,
    timezone: "Australia/Sydney"
});

const disconnectReceiveChatList = async (sender, receiver, sender_type) => {
    try {
        // Initialize an array to store results
        let result = [];
        let receivers = '';

        // Find all groups where the sender is in the users array and the group is active and isActive is true
        let groups = await groupModal.find({
            'users._id': sender,
            _id: receiver
        }).exec();

        if (!groups || groups.length === 0) {
            return { message: "No group found" };
        }
        // Loop through each group found
        for (let group of groups) {
            // Find the latest chat message for the group
            const latestChat = await Messages.findOne({
                receiver: group._id,
                status: 'active'
            }).sort({ createdAt: -1 }).exec();

            // Count unread messages excluding those sent by the specified sender
            const unreadCount = await Messages.countDocuments({
                receiver: group._id,
                'read_by.id': { $ne: toObjectId(sender) }, // Ensure sender ID is not in the read_by array
                'is_deleted_by.id': { $ne: toObjectId(sender) }, // Ensure sender ID is not in the is_deleted_by array
                status: 'active',
            }).exec();

            let latest_message = '';
            if (latestChat) {
                latest_message = latestChat.message;
            }

            let sender_name = 'Unknown';
            let chat_status = '';
            let memberType = '';
            let isChat = false

            if (group.users.length > 0) {
                const firstUser = group.users[0];
                if (firstUser.type === 'user') {
                    const user = await userModal.findOne({ _id: firstUser._id }).exec();
                    memberType = firstUser.type;
                    if (user) {
                        chat_status = user.chat_status;
                        memberType = 'Free Prev'; // Default value; modify as needed
                        let user_membership = await userMembershipModal.findOne({ user_id: firstUser._id, status: "active" });
                        if (user_membership) {
                            memberType = 'Member since ' + moment(user.createdAt).format('YYYY');
                        }
                        sender_name = user.fullName;
                    }
                    receivers = firstUser ? firstUser._id : '';
                } else if (firstUser.type === 'guest') {
                    memberType = 'Pellentesque venantis'; // Adjust as needed
                    sender_name = firstUser.guest_name;
                    receivers = firstUser ? firstUser._id : '';
                }
            }

            // Check if any active subadmin is online in the group
            const activeSubadmins = group.users.filter(user => user.type === 'subadmin' && user.active === 'true');
            if (activeSubadmins.length > 0) {
                isChat = true;
            }
            if (group.status === 'inactive') {
                isChat = false
            }

            // Push each group's result into the result array
            result.push({
                _id: group._id || '',
                chat_type: group.chat_type || '',
                group_name: group.group_name || '',
                device_type: group.device_type || '',
                status: group.status || '',
                unreadCount: unreadCount || 0,
                latest_message: latest_message || '',
                sender_name: sender_name || 'Unknown',
                chat_status: chat_status || '', // Include chat status only if type is user
                memberType: memberType || '',
                receiver: receivers || '',
                createdAt: group.createdAt || '',
                updatedAt: group.updatedAt || '',
                isChat: isChat // Add isChat key
            });
        }
        return result;

    } catch (error) {
        console.error('Error retrieving chat list:', error);
        throw error; // Re-throw error to handle it in the caller
    }
};

module.exports = {
    updateSocket,
    getChatList,
    updateReadStatus,
    sendChatMessage,
    getReceiverSocketData,
    getConversationList,
    // getUser,
    findOnlineSubadmins,
    updateSubadminStatus,
    disconnectUser,
    editMessage,
    unsendMessage,
    editGuestName,
    searchMessages,
    addSubadminToGroup,
    receiveChatList,
    unreadCount,
    updateReadBy,
    readAllMessages,
    updateSubadminSocket,
    disconnectReceiveChatList
};
