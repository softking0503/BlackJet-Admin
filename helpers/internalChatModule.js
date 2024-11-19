const groupModal = require('../models/internalGroup');
const Messages = require('../models/internalMessage'); // Import your Messages model
const userModal = require("../models/users.model");
const adminModal = require("../models/admin");
const { ObjectId } = require('mongoose').Types;
const { default: mongoose } = require('mongoose');
const randomize = require("randomatic");
const { toObjectId } = require('../helpers/v2/common');

var aws = require('aws-sdk');
var multerS3 = require('multer-s3');
var multer = require('multer');


const internalUpdateSocket = async (postData, socket_id, callback) => {
    try {
        let updateData = {};
        let newGroup;

        if (postData.sender_type === "subadmin") {
            if (postData.group_id) {
                // Check if the group exists and the sender is a member
                const existingGroup = await groupModal.findOne({
                    _id: postData.group_id,
                    chat_type: "subadmin",
                    status: "active"
                });
                if (existingGroup) {
                    updateData = {
                        internal_chat_with: existingGroup._id,
                        internal_socket_id: socket_id,
                    };
                    await adminModal.findOneAndUpdate(
                        { type: 'subadmin', _id: postData.sender },
                        updateData,
                        { upsert: true, new: true }
                    );
                    // Return the existing group
                    return callback(null, existingGroup);
                }
            }
            newGroup = await groupModal.findOne({
                "users._id": { $all: [postData.sender, postData.receiver] },
                status: "active"
            });
            console.log(newGroup, 'newGroup');
            if (!newGroup) {
                console.log(newGroup, 'inisde new group')
                let senderName = '';
                let findSender = await adminModal.findOne({ _id: postData.sender })
                if (findSender) senderName = `${findSender.first_name} ${findSender.last_name}`

                let receiverName = '';
                let findReceiver = await adminModal.findOne({ _id: postData.receiver })
                if (findReceiver) receiverName = `${findReceiver.first_name} ${findReceiver.last_name}`
                newGroup = new groupModal({
                    users: [
                        { _id: postData.sender, type: postData.sender_type, name: senderName },
                        { _id: postData.receiver, type: postData.sender_type, name: receiverName },
                    ],
                    group_name: 'group_' + randomize('0', 10), // Generate a custom group name
                    status: 'active',
                    device_type: postData.device_type || ''
                });
                // Save the new group to the database
                await newGroup.save();
                // Update socket information for sender and receiver
                updateData = {
                    internal_chat_with: newGroup._id, // new group ID
                    internal_socket_id: socket_id,
                };
                await adminModal.findOneAndUpdate(
                    { _id: postData.sender },
                    updateData,
                    { upsert: true, new: true }
                );
                // Return the newly created group
                return callback(null, newGroup);
            }
        }

        // In case sender_type is not "subadmin", handle it accordingly
        callback(null, { message: "Invalid sender type or no group ID provided." });

    } catch (error) {
        // Log and return error
        console.error("Error updating socket:", error);
        callback(error, null);
    }
};

const internalGetChatList = async (postData, callback) => {
    try {
        const page = parseInt(postData.page, 10) || 1;
        const limit = parseInt(postData.limit, 10) || 10;
        const skip = (page - 1) * limit;

        const searchCriteria = {};
        if (postData.searchKey) {
            const searchRegex = new RegExp(postData.searchKey, 'i');
            searchCriteria.$or = [
                { group_name: searchRegex },
                { "users.name": searchRegex }
            ];
        }

        const groups = await groupModal.find({
            "users._id": postData.sender,
            status: "active",
            ...searchCriteria
        });

        if (groups.length === 0) {
            callback(null, []);
            return;
        }

        const response = await Promise.all(groups.map(async (group) => {
            const latestMessage = await Messages.findOne({ receiver: group._id })
                .sort({ createdAt: -1 }) // Sort by createdAt to get the latest message
                .exec();

            const unreadCount = await Messages.countDocuments({
                receiver: group._id,
                'read_by.id': { $ne: toObjectId(postData.sender) }// Ensure sender ID is not in the read_by array
            });
            console.log(group.users.length, 'group.users.length')
            // Determine the sender name based on users array length
            let sender_name = '';
            let chat_status = '';

            if (group.users.length < 2) {
                const userInfo = await adminModal.findOne({ _id: group.users[1]._id });
                if (userInfo) {
                    chat_status = userInfo.chat_status;
                }
                // If there is only one user, use their name
                sender_name = group.users[1].name || 'Unknown';
            } else {
                // Otherwise, use the group name
                sender_name = group.group_name;
            }


            return {
                _id: group._id,
                latest_message: latestMessage ? latestMessage.message : '',
                sender_name: sender_name,
                unreadCount: unreadCount,
                group_name: group.group_name,
                chat_type: latestMessage ? latestMessage.type : '',
                createdAt: latestMessage ? latestMessage.createdAt : '',
                updatedAt: latestMessage ? latestMessage.updatedAt : '',
                latestMessageDate: latestMessage ? latestMessage.createdAt : new Date(0)
            };
        }));

        const sortedResponse = response.sort((a, b) => {
            return new Date(b.latestMessageDate).getTime() - new Date(a.latestMessageDate).getTime();
        });

        const paginatedResponse = sortedResponse.slice(skip, skip + limit);

        callback(null, paginatedResponse);

    } catch (error) {
        console.error('Error in internalGetChatList:', error);
        callback(error, null);
    }
};

// const internalGetChatList = async (postData, callback) => {
//     try {
//         // Pagination parameters
//         const page = postData.page || 1;
//         const limit = postData.limit || 20;
//         const skip = (page - 1) * limit;

//         let response = [];

//         // Find groups where the sender is a subadmin
//         let findGroup = await groupModal.find({
//             users: {
//                 $elemMatch: {
//                     _id: postData.sender,
//                     type: 'subadmin',
//                     active: "true"
//                 }
//             }
//         }).skip(skip).limit(limit);

//         for (let i = 0; i < findGroup.length; i++) {
//             let groupName = findGroup[i].group_name;

//             // // Find the latest normal and group messages
//             // let latestNormalChat = await Messages.findOne({
//             //     receiver: findGroup[i]._id,
//             //     type: 'normal'
//             // }).sort({ createdAt: -1 });

//             let latestChat = await Messages.findOne({
//                 receiver: findGroup[i]._id,
//                 status: 'active',
//             }).sort({ createdAt: -1 });

//             // // Count unread messages
//             // let latestNormalCount = await Messages.countDocuments({
//             //     receiver: findGroup[i]._id,
//             //     type: 'normal',
//             //     sender: { $ne: postData.sender },
//             //     readStatus: 'unread'
//             // });

//             let latestCount = await Messages.countDocuments({
//                 receiver: findGroup[i]._id,
//                 type: 'group',
//                 sender: { $ne: postData.sender },
//                 readStatus: 'unread'
//             });

//             // Fetch user details and latest messages
//             let usersWithDetails = await Promise.all(findGroup[i].users.map(async user => {
//                 let userDetails = { user_name: '', latest_message: '', memberType: '' };

//                 if (user.type === 'admin' || user.type === 'subadmin') {
//                     try {
//                         const userInfo = await adminModal.findById(user._id);
//                         if (userInfo) {
//                             userDetails.user_name = `${userInfo.first_name} ${userInfo.last_name}`;
//                         } else {
//                             console.warn(`User with ID ${user._id} not found in adminModal.`);
//                         }
//                     } catch (err) {
//                         console.error(`Error fetching user details for ID ${user._id}:`, err);
//                     }
//                 }

//                 // Find the latest message for this user
//                 let latestMessage = await Messages.findOne({
//                     receiver: findGroup[i]._id,
//                     sender: user._id
//                 }).sort({ createdAt: -1 });

//                 userDetails.latest_message = latestMessage ? latestMessage.message : '';
//                 userDetails.memberType = user.type || '';

//                 return {
//                     _id: user._id,
//                     name: userDetails.user_name,
//                     latest_message: userDetails.latest_message,
//                     memberType: userDetails.memberType
//                 };
//             }));

//             // Add to response array
//             // if (latestNormalChat) {
//             //     let normalSenderName = 'Unknown';
//             //     try {
//             //         const normalSenderDetails = await adminModal.findById(latestNormalChat.sender);
//             //         if (normalSenderDetails) {
//             //             normalSenderName = `${normalSenderDetails.first_name} ${normalSenderDetails.last_name}`;
//             //         } else {
//             //             console.warn(`Normal chat sender with ID ${latestNormalChat.sender} not found.`);
//             //         }
//             //     } catch (err) {
//             //         console.error(`Error fetching normal chat sender details for ID ${latestNormalChat.sender}:`, err);
//             //     }

//             //     response.push({
//             //         _id: findGroup[i]._id,
//             //         latest_message: latestNormalChat.message,
//             //         sender_name: normalSenderName,
//             //         unreadCount: latestNormalCount,
//             //         users: usersWithDetails,
//             //         group_name: groupName,
//             //         chat_type: 'normal',
//             //         createdAt: latestNormalChat.createdAt,
//             //         updatedAt: latestNormalChat.updatedAt
//             //     });
//             // }

//             if (latestChat) {
//                 let groupSenderName = 'Unknown';
//                 try {
//                     const groupSenderDetails = await adminModal.findById(latestChat.sender);
//                     if (groupSenderDetails) {
//                         groupSenderName = `${groupSenderDetails.first_name} ${groupSenderDetails.last_name}`;
//                     } else {
//                         console.warn(`Group chat sender with ID ${latestGroupChat.sender} not found.`);
//                     }
//                 } catch (err) {
//                     console.error(`Error fetching group chat sender details for ID ${latestChat.sender}:`, err);
//                 }

//                 response.push({
//                     _id: findGroup[i]._id,
//                     latest_message: latestChat.message,
//                     sender_name: groupSenderName,
//                     unreadCount: latestCount,
//                     users: usersWithDetails,
//                     group_name: groupName,
//                     chat_type: latestChat.type,
//                     createdAt: latestChat.createdAt,
//                     updatedAt: latestChat.updatedAt
//                 });
//             }
//         }
//         if (response.length == 0) {
//             let findGroupResult = await Promise.all(findGroup.map(async group => {
//                 // Fetch user details for each user in the group
//                 let usersWithDetails = await Promise.all(group.users.map(async user => {
//                     let userDetails = { user_name: '', latest_message: '', memberType: '' };

//                     if (user.type === 'admin' || user.type === 'subadmin') {
//                         try {
//                             const userInfo = await adminModal.findById(user._id);
//                             console.log('User details for ID', user._id, ':', userInfo);
//                             if (userInfo) {
//                                 userDetails.user_name = `${userInfo.first_name} ${userInfo.last_name}`;
//                             } else {
//                                 console.warn(`User with ID ${user._id} not found in adminModal.`);
//                             }
//                         } catch (err) {
//                             console.error(`Error fetching user details for ID ${user._id}:`, err);
//                         }
//                     }

//                     userDetails.memberType = user.type || '';

//                     return {
//                         _id: user._id,
//                         name: userDetails.user_name,
//                         latest_message: userDetails.latest_message,
//                         memberType: userDetails.memberType
//                     };
//                 }));

//                 return {
//                     _id: group._id,
//                     latest_message: '',
//                     sender_name: '',
//                     chat_type: '',
//                     group_name: group.group_name,
//                     unreadCount: 0,
//                     users: usersWithDetails,
//                     createdAt: group.createdAt,
//                     updatedAt: group.updatedAt
//                 };
//             }));

//             callback(null, findGroupResult);
//         } else {
//             // Callback with the result
//             callback(null, response);
//         }

//     } catch (error) {
//         console.error(error);
//         callback(error, null);
//     }
// };

let internalGetConversationList = async (postData, callback) => {
    try {
        // Ensure the page and limit parameters are valid integers
        const page = parseInt(postData.page, 10) || 1;
        const limit = parseInt(postData.limit, 10) || 20;
        const skip = (page - 1) * limit;

        // Fetch messages with pagination
        const messages = await Messages.find({
            $or: [
                { receiver: postData.receiver, status: 'active' }
            ]
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const arr = [];

        for (const chat of messages) {
            let info = null;
            let name = '';
            let profile_pic = ''; // Initialize profile_pic variable
            // Check if sender is already in read_by array and update if necessary
            const isSenderInReadBy = chat.read_by.some((readEntry) => readEntry.id.toString() === postData.sender.toString());

            if (!isSenderInReadBy) {
                // Add the sender to the read_by array if not already present
                chat.read_by.push({ id: postData.sender });
                // Update the readStatus for this message to "read"
                // chat.readStatus = 'read';
                await chat.save(); // Save the updated message document
            }

            if (chat.sender_type === 'admin' || chat.sender_type === 'subadmin') {
                info = await adminModal.findOne({ _id: chat.sender });
                name = info ? `${info.first_name} ${info.last_name}` : '';
                profile_pic = info ? info.profile_pic : ''; // Assuming there's a profile_pic field
            }

            arr.push({
                _id: chat._id,
                sender_type: chat.sender_type,
                sender: chat.sender,
                receiver: chat.receiver,
                message: chat.message,
                media: chat.media || '',
                message_type: chat.message_type || '',
                user_name: name,
                type: chat.type,
                readStatus: chat.readStatus,
                profile_pic: profile_pic, // Assign the calculated profile_pic
                createdAt: chat.createdAt
            });
        }

        console.log(arr.length);
        callback(null, arr);
    } catch (error) {
        console.error(error);
        callback(error);
    }
};



const internalSendChatMessage = async (postData, callback) => {
    try {
        let name = '';
        let profile_pic = '';
        let chatType;
        const findGroup = await groupModal.findOne({ _id: postData.receiver });
        if (findGroup.users.length > 2) {
            chatType = 'group';
        } else {
            chatType = 'normal';
        }
        // Create a new message document
        let newMessage = new Messages({
            sender_type: postData.sender_type,
            sender: postData.sender,
            receiver: postData.receiver,
            message: postData.message,
            message_type: postData.message_type,
            readStatus: 'unread',
            type: chatType,
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
        // Save the new message
        let savedMessage = await newMessage.save();

        await groupModal.findOneAndUpdate(
            { _id: postData.receiver },
            { isActive: true },
            { new: true }
        );
        // Fetch sender's name if the sender is an admin or subadmin
        if (postData.sender_type === 'admin' || postData.sender_type === 'subadmin') {
            const type = postData.sender_type === 'admin' ? 'admin' : 'subadmin';
            const info = await adminModal.findOne({ _id: postData.sender, type });
            name = info ? `${info.first_name} ${info.last_name}` : '';
        }

        // Prepare the response
        const response = {
            _id: savedMessage._id,
            sender_type: savedMessage.sender_type,
            sender: savedMessage.sender,
            receiver: savedMessage.receiver || '',
            group_id: savedMessage.group_id,
            message_type: savedMessage.message_type,
            message: savedMessage.message,
            media: savedMessage.media,
            profile_pic: profile_pic,
            sender_name: name,
            type: savedMessage.type,
            readStatus: savedMessage.readStatus,
            createdAt: savedMessage.createdAt
        };

        // Callback with the response
        callback(null, response);
    } catch (error) {
        console.error(error, "Error response in chat");
        callback(error);
    }
};

const internalGetReceiverSocketData = async (postData, callback) => {
    try {
        let receiverData = [];

        // Find the group by ID
        let query = await groupModal.findOne({ _id: postData.receiver });
        // console.log(query, 'llllllllll')

        if (query) {
            for (let i = 0; i < query.users.length; i++) {
                if (query.users[i]._id != postData.sender) {
                    let adminData = await adminModal.findOne({ _id: query.users[i]._id, status: 'active', type: query.users[i].type });
                    if (adminData) {
                        receiverData.push({
                            _id: adminData._id,
                            name: `${adminData.first_name} ${adminData.last_name}`,
                            internal_socket_id: adminData.internal_socket_id, // Assuming this field exists
                            internal_chat_with: adminData.internal_chat_with
                        });
                    }
                    receiverData.push(adminData);
                }
            }
        }
        // console.log(receiverData)
        // Return the result through the callback
        callback(null, receiverData);

    } catch (error) {
        // Log and return error
        console.error("Error in internalGetReceiverSocketData:", error);
        callback(error, null);
    }
};



const internalUpdateReadStatus = async (postData, callback) => {
    try {
        const updateData = {
            readStatus: 'read'
        };

        const filter = {
            $or: [
                {
                    sender: postData.sender,
                    receiver: postData.receiver,
                    // sender_type: postData.sender_type,
                    // receiver_type: postData.receiver_type
                },
                {
                    sender: postData.guest,
                    receiver: postData.receiver,
                    // sender_type: postData.receiver_type,
                    // receiver_type: postData.sender_type
                }
            ]
        };

        const result = await Messages.updateMany(filter, updateData);
        callback(null, result);
    } catch (error) {
        console.error(error);
        callback(error);
    }
};

const internalDisconnectUser = async (postData, socket_id) => {
    try {
        // Update data to set internal_chat_with to 0 and socket_id to ""
        let res = {};
        let updateData = {
            internal_chat_with: "",
            internal_socket_id: ""
        };

        // Update the user document
        if (postData.sender_type == "admin" || postData.sender_type == "subadmin") {
            res = await adminModal.updateOne({ _id: postData.sender }, updateData);
        }

        return res;
    } catch (err) {
        console.error(err);
        throw err;
    }
};
/**
 * Edits a message with the given message ID and new content.
 * @param {string} messageId - The ID of the message to edit.
 * @param {string} newContent - The new content for the message.
 * @returns {Object} - The updated message or an error.
 */
const internalEditMessage = async (sender, groupId, messageId, newContent) => {
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

            if (user.type === 'admin' || user.type === 'subadmin') {
                const adminSocket = await adminModal.findOne({ _id: user._id }, 'internal_socket_id');
                if (adminSocket && adminSocket.internal_socket_id) {
                    socketIds.push(adminSocket.internal_socket_id);
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
        return error;
    }
};

/**
 * Unsends a message by updating its status to 'unsent'.
 * @param {string} messageId - The ID of the message to unsend.
 * @returns {Object} - The updated message or an error.
 */
const internalUnsendMessage = async (sender, groupId, messageId) => {
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

            if (user.type === 'admin' || user.type === 'subadmin') {
                const adminSocket = await adminModal.findOne({ _id: user._id }, 'internal_socket_id');
                if (adminSocket && adminSocket.internal_socket_id) {
                    socketIds.push(adminSocket.internal_socket_id);
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
const internalSearchMessages = async (data) => {
    const { sender, group_id, search, skip, limit, type } = data;

    try {
        // Log input data for debugging
        console.log('Search criteria:', data);

        // Retrieve total count of matching messages
        const totalCount = await Messages.countDocuments({
            receiver: group_id,
            sender: sender,
            status: "active",
            // type: type,
            message: { $regex: search, $options: 'i' }, // Case-insensitive search
        });

        // Retrieve messages based on search criteria
        const messages = await Messages.find({
            receiver: group_id,
            sender: sender,
            status: "active",
            // type: type,
            message: { $regex: search, $options: 'i' }, // Case-insensitive search
        })
            .sort({ createdAt: -1 }) // Sort by creation date in descending order
            .skip(parseInt(skip, 10))
            .limit(parseInt(limit, 10))
            .exec();
        // Retrieve all matching messages without search criteria
        const allMessages = await Messages.find({
            receiver: group_id,
            status: "active"
        })
            .sort({ createdAt: -1 }) // Sort by creation date in descending order
            .exec();

        // Check if messages are found
        if (!messages || messages.length === 0) {
            console.log('No messages found for the given criteria.');
            return { messages: [], totalCount }; // Return empty messages array if no messages are found
        }

        // Update each message with sender's name
        const updatedMessages = await Promise.all(messages.map(async (msg) => {
            let info;
            let name;

            // Find the index of the message in allMessages
            const messageIndex = allMessages.findIndex(msgItem => msgItem._id.equals(msg._id));

            // Calculate the page number (quotient) based on the message index and limit
            const pageNumber = Math.floor(messageIndex / parseInt(limit, 10)) + 1;

            switch (msg.sender_type) {

                case 'admin':
                case 'subadmin': {
                    // Combine admin and subadmin cases into one, as they have similar logic
                    const type = msg.sender_type === 'admin' ? 'admin' : 'subadmin';
                    info = await adminModal.findOne({ _id: msg.sender, type });
                    name = info ? `${info.first_name} ${info.last_name}` : ''; // Check if info is not null before accessing properties
                    break;
                }
                default:
                    name = 'Unknown';
                    break;
            }

            // Return the message object with the added name field
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

const createGroup = async (senderId, subadminIds, socketId) => {
    try {
        // Split and validate IDs
        const validSenderId = toObjectId(senderId);
        const validSubadminIds = subadminIds.split(',').map(id => toObjectId(id.trim()));

        // Fetch names of all subadmins (including sender)
        const allSubadminIds = [...validSubadminIds, validSenderId];
        const subadmins = await adminModal.find(
            { _id: { $in: allSubadminIds } },
            { first_name: 1, last_name: 1 }
        );

        const subadminNames = subadmins.map(subadmin => `${subadmin.first_name} ${subadmin.last_name}`);
        const groupName = subadminNames.join(', ');
        // Create a map of subadmin IDs to names
        const subadminIdToNameMap = subadmins.reduce((map, subadmin) => {
            map[subadmin._id] = `${subadmin.first_name} ${subadmin.last_name}`;
            return map;
        }, {});
        // Check if a group with the exact set of users already exists
        let existingGroup = await groupModal.findOne({
            $and: [
                { 'users._id': { $all: allSubadminIds } }, // All subadminIds must be in the group
                { 'users': { $size: allSubadminIds.length } }, // Group should have the exact number of users
                { status: 'active' }
            ]
        });

        if (!existingGroup) {
            // Determine if the groupType should be true (only one sender and one receiver)
            const isSinglePair = validSubadminIds.length !== 1;

            // Create a new group if no existing group is found with the exact users
            newGroupDoc = new groupModal({
                users: allSubadminIds.map(id => ({
                    _id: id,
                    type: 'subadmin',
                    active: 'true',
                    name: subadminIdToNameMap[id] // Map the subadmin ID to the corresponding name
                })),
                isActive: true,
                group_name: groupName, // Generate a custom group name
                status: 'active',
                groupType: isSinglePair // Add groupType as true if it's a single pair
            });
            await newGroupDoc.save();

            // Update the admin's socket_id in the adminModal
            const updateData = {
                internal_chat_with: newGroupDoc._id,
                internal_socket_id: socketId,
            };

            await adminModal.findOneAndUpdate(
                { _id: senderId },
                updateData,
                { upsert: true, new: true }
            );

            // Update socket_id for all other subadmins
            await Promise.all(validSubadminIds.map(async (subadminId) => {
                await adminModal.findOneAndUpdate(
                    { _id: subadminId },
                    { internal_chat_with: newGroupDoc._id, internal_socket_id: socketId },
                    { upsert: true, new: true }
                );
            }));

            // Return the newly created group
            return {
                _id: newGroupDoc._id,
                latest_message: '',
                sender_name: groupName,
                unreadCount: 0,
                group_name: groupName,
                chat_type: '',
                createdAt: newGroupDoc.createdAt,
                updatedAt: newGroupDoc.updatedAt,
                latestMessageDate: ''
            };
        } else {
            // If an exact group exists, just update the sender's socket_id
            const updateData = {
                internal_chat_with: existingGroup._id,
                internal_socket_id: socketId,
            };

            await adminModal.findOneAndUpdate(
                { _id: senderId },
                updateData,
                { upsert: true, new: true }
            );

            // Return the existing group
            return {
                _id: existingGroup._id,
                latest_message: '',
                sender_name: existingGroup.group_name,
                unreadCount: 0,
                group_name: existingGroup.group_name,
                chat_type: '',
                createdAt: existingGroup.createdAt,
                updatedAt: existingGroup.updatedAt,
                latestMessageDate: ''
            };
        }
    } catch (error) {
        // Log and return error
        console.error('Error creating group:', error);
        return error;
    }
};

const internalAddSubadminToGroup = async (group_id, subadmin_ids, socket_id) => {
    try {
        // Split the subadmin_ids string into an array and filter out invalid ObjectId strings
        const subadminIdsArray = subadmin_ids.split(',')
            .map(id => id.trim())
            .filter(id => toObjectId(id)); // Validate ObjectId format

        if (subadminIdsArray.length === 0) {
            return 'No valid subadmin IDs provided';
        }

        // Find the existing group and get its users
        const existingGroup = await groupModal.findById(group_id);

        if (!existingGroup) {
            return 'Existing group not found';
        }

        // Extract the subadmins from the existing group
        const subadmins = existingGroup.users.filter(user => user.type === 'subadmin');
        // Fetch names of all subadmins already in the group
        const subadminNames = await adminModal.find(
            { _id: { $in: subadmins.map(user => user._id) } },
            { first_name: 1, last_name: 1 }
        ).then(subadmins =>
            subadmins.map(subadmin => `${subadmin.first_name} ${subadmin.last_name}`)
        );

        // Fetch names of the new subadmins
        const newSubadmins = await adminModal.find(
            { _id: { $in: subadminIdsArray } },
            { first_name: 1, last_name: 1 }
        );
        newSubadmins.forEach(subadmin => {
            subadminNames.push(`${subadmin.first_name} ${subadmin.last_name}`);
        });

        const groupName = subadminNames.join(', ');
        // Update the group by adding the new subadmins to the users array
        const updateResults = await Promise.all(subadminIdsArray.map(subadminId =>
            groupModal.updateOne(
                { _id: group_id },
                { $push: { users: { _id: subadminId, type: 'subadmin', active: 'true' } } },
                { upsert: true } // Ensure that it creates a new document if needed
            )
        ));

        // Update the group name after adding the new subadmins
        await groupModal.updateOne(
            { _id: group_id },
            { $set: { group_name: groupName } }
        );

        // Update the subadmins' socket_id in the adminModal
        const updateData = {
            internal_chat_with: group_id,
            internal_socket_id: socket_id,
        };
        await adminModal.updateMany(
            { _id: { $in: subadminIdsArray } },
            updateData,
            { upsert: true }
        );

        return updateResults;
    } catch (error) {
        console.error('Error adding subadmins to group:', error);
        return error;
    }
};

const internalReceiveGetChatList = async (sender, receiver, sender_type, subadmin_id) => {
    try {
        // Fetch a single group based on the search criteria
        const group = await groupModal.findOne({
            "users._id": toObjectId(sender),
            _id: toObjectId(receiver),
            status: "active"
        });

        if (!group) {
            return null; // Return null if no group is found
        }

        // Fetch the latest message for the group
        const latestMessage = await Messages.findOne({ receiver: group._id, status: 'active' })
            .sort({ createdAt: -1 }) // Sort by createdAt to get the latest message
            .exec();

        // Fetch the unread message count for the group
        const unreadCount = await Messages.countDocuments({
            receiver: group._id,
            'read_by.id': { $ne: toObjectId(subadmin_id) } // Ensure sender ID is not in the read_by array
        });

        let sender_name = '';
        let chat_status = '';

        if (group.groupType) {
            sender_name = group.group_name; // Use the group name if groupType is true
        } else {
            // If groupType is false, find the name and chat status of the other user (not the sender)
            const otherUser = group.users.find(user => !toObjectId(user._id).equals(toObjectId(sender)));
            if (otherUser) {
                sender_name = otherUser.name; // Set the name of the other user as sender_name

                // Fetch chat status of the other user
                const userInfo = await adminModal.findOne({ _id: toObjectId(otherUser._id) });
                if (userInfo) {
                    chat_status = userInfo.chat_status; // Set the chat status of the other user
                }
            }
        }

        // Prepare the response object
        const response = {
            _id: group._id,
            latest_message: latestMessage ? latestMessage.message : '',
            sender_name: sender_name,
            unreadCount: unreadCount,
            group_name: group.group_name,
            chat_type: latestMessage ? latestMessage.type : '',
            createdAt: latestMessage ? latestMessage.createdAt : '',
            updatedAt: latestMessage ? latestMessage.updatedAt : '',
            latestMessageDate: latestMessage ? latestMessage.createdAt : new Date(0),
            chat_status: chat_status // Add chat_status to the response
        };

        // Return the response as a single object
        return response;

    } catch (error) {
        console.error('Error retrieving chat list:', error);
        throw error; // Re-throw error to handle it in the caller
    }
};


const internalReadAllMessages = async (sender, receiver) => {
    try {
        // Find all messages for the specified receiver
        let messages = await Messages.find({ receiver: receiver });
        if (!messages || messages.length === 0) {
            return { success: false, message: 'No messages found for this receiver' };
        }

        let socketIds = [];
        let group = await groupModal.findOne({ _id: receiver, isActive: true });

        if (group) {
            // Collect subadmin IDs
            const subadminIds = group.users
                .filter(user => user.type === 'subadmin' && user.active)
                .map(user => user._id);

            if (subadminIds.length > 0) {
                const subadmins = await adminModal.find({ _id: { $in: subadminIds } }, 'internal_socket_id');
                socketIds = subadmins.map(admin => admin.internal_socket_id).filter(Boolean);
            }

            // Loop through each message and process the read_by array
            for (let message of messages) {
                const isSenderInReadBy = message.read_by.some(readEntry => readEntry.id.toString() === sender.toString());

                // If the sender is not in the read_by array, add them
                if (!isSenderInReadBy) {
                    message.read_by.push({ id: sender });

                    // Check if all subadmins have read the message
                    const allSubadminsRead = subadminIds.every(subadminId =>
                        message.read_by.some(readEntry => readEntry.id.toString() === subadminId.toString())
                    );

                    // If all subadmins have read the message, set readStatus to 'read'
                    if (allSubadminsRead) {
                        message.readStatus = 'read';
                    }

                    // Save the updated message document
                    await message.save();
                }
            }

            // Determine if all messages are read by all subadmins
            const type = messages.every(message =>
                subadminIds.every(subadminId =>
                    message.read_by.some(readEntry => readEntry.id.toString() === subadminId.toString())
                )
            );

            // Returning the socket IDs, receiver, and type
            return { response: { socketIds, receiver, type }, message: 'Messages processed' };
        } else {
            return { success: false, message: 'Group not found or inactive' };
        }

    } catch (error) {
        console.error('Error in readAllMessages:', error);
        return { success: false, message: 'An error occurred', error };
    }
};


const internalUpdateReadBy = async (sender, messageId, groupId) => {
    try {
        // Find the message by messageId
        let message = await Messages.findById(messageId);

        if (!message) {
            return 'Message not found';
        }

        // Check if the sender is already in the read_by array
        const isSenderInReadBy = message.read_by.some((readEntry) => readEntry.id.toString() === sender.toString());

        // If sender is not in read_by, add the sender to the array
        if (!isSenderInReadBy) {
            message.read_by.push({ id: sender });
            await message.save(); // Save the updated message document
        }

        // Find the group and filter active subadmins
        let findGroup = await groupModal.findOne({
            _id: groupId
        });

        if (!findGroup) {
            return { message: message, groupStatus: 'No matching group found' };
        }

        // Array to store socket IDs of active subadmins
        let socketIds = [];

        // Check if all active subadmin users are in the read_by array
        let allUsersRead = true;
        for (let user of findGroup.users) {
            if (user.type === 'subadmin' && user.active === 'true') {
                // Check if the user is in the read_by array
                const isUserInReadBy = message.read_by.some((readEntry) => readEntry.id.toString() === user._id.toString());

                // If any user is not in the read_by array, set allUsersRead to false
                if (!isUserInReadBy) {
                    allUsersRead = false;
                }

                // // Collect socket IDs of subadmins
                // let findSocketId = await adminModal.findById(user._id);
                // let socketId = findSocketId?.internal_socket_id;
                // if (socketId) {
                //     socketIds.push(socketId);
                // }
            }
        }

        // Update the readStatus based on whether all users have read the message
        message.readStatus = allUsersRead ? 'read' : 'unread';
        await message.save(); // Save the updated message document

        // Return the response with the updated message and socket IDs
        return message;

    } catch (error) {
        console.error('Error in internalUpdateReadBy:', error);
        return { success: false, message: 'An error occurred', error };
    }
};


module.exports = {
    internalUpdateSocket,
    internalGetChatList,
    internalUpdateReadStatus,
    internalSendChatMessage,
    internalGetReceiverSocketData,
    internalGetConversationList,
    internalDisconnectUser,
    internalEditMessage,
    internalUnsendMessage,
    internalSearchMessages,
    createGroup,
    internalReceiveGetChatList,
    internalAddSubadminToGroup,
    internalUpdateReadBy,
    internalReadAllMessages
};
