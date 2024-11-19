const dotenv = require('dotenv');
const moment = require('moment');
const userModal = require("../models/users.model");
const hellozaiModal = require('../models/hellozaiLog');
const axios = require('axios');
const { seed } = require('../config/seed');
const cardModal = require('../models/card');
const airwallexLogModal = require('../models/airwallexLog');
const { v4: uuid } = require('uuid');
const secretManagerAws = require('./secretManagerAws');
const path = require('path');
// Load variables from .env
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Load variables from .envs
dotenv.config({ path: path.resolve(__dirname, '../config', '.envs') });

const apiKey = process.env.HELLOZAI_CLIENT_SECRET_KEY;
const clientId = process.env.HELLOZAI_CLIENT_ID;
const grantType = process.env.HELLOZAI_CLIENT_GRANT_CRED;
const scope = process.env.HELLOZAI_SCOPE;

let cachedToken = null; // Cache the token globally

// Step 1: Function to get the token using the seed.hellozai variables
const getToken = async () => {
    if (cachedToken) {
        // Return cached token if it exists
        return cachedToken;
    }

    try {
        // Prepare the data for the token request
        const data = {
            grant_type: grantType,
            client_id: clientId,
            client_secret: apiKey,
            scope: scope
        };

        // Call the token API endpoint
        const response = await axios.post(`${seed.hellozai.clientTokenApi}/tokens`, data, {
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json'
            }
        });

        // Cache the token
        cachedToken = response.data.access_token;

        // Cache token for 20 minutes
        setTimeout(() => { cachedToken = null; }, 20 * 60 * 1000);

        return cachedToken; // Return the token
    } catch (error) {
        console.error('Error fetching token:', error.response ? error.response.data : error.message);
        throw error; // Rethrow the error to handle it upstream if needed
    }
};

// Step 2: Function to create a user using the obtained token
// Step 2: Function to create a user using the obtained token and req.body data
const createUser = async (user_id, hellozaiCusObj) => {
    try {
        if (process.env.PAYMENT_ENABLE == "true") {
            return { success: false, message: 'Payment functionality is disabled' };
        }
        // Step 2.1: Get the token first
        const token = await getToken();
        const userData = {
            id: uuid(),
            first_name: hellozaiCusObj.first_name,
            last_name: hellozaiCusObj.last_name,
            email: hellozaiCusObj.email,
            country: 'AU'
        };
        const response = await axios.post(`${seed.hellozai.clientApiHost}/users`, userData, {
            headers: {
                'Authorization': `Bearer ${token}`, // Use the token from getToken
                'Content-Type': 'application/json'
            }
        });
        console.log('User Creation Response:', response.data);

        // Check for success response
        if (response.status === 201) {
            // Extract the hellozaiCusId from the response
            const hellozaiCusId = response.data.users.id;  // Access the ID within the users object

            // Step 2.4: Update the user in your database with the new hellozaiCusId
            await userModal.findByIdAndUpdate(
                { _id: user_id },
                { hellozaiCusId },  // Update the hellozaiCusId field
                { new: true }
            );

            // Return success response
            return { success: true, data: response.data };
        } else {
            return { success: false, message: 'Unexpected response status' };
        }
    } catch (error) {
        console.error('Error creating user:', error.response ? error.response.data : error.message);
        return { success: false, message: 'Error creating user' };
    }
};

// Step 3: Function to create a card account using the obtained token and req.body data
const createCardAccount = async (userName, data, cusId, user_id) => {
    try {
        console.log(cusId, 'cusId')
        if (process.env.PAYMENT_ENABLE == "true") {
            return { success: false, message: 'Payment functionality is disabled' };
        }
        // Step 3.1: Get the token first
        const token = await getToken();

        const cardData = {
            full_name: userName,
            number: data.cardNumber.replace(/\s+/g, ''),
            expiry_month: data.expiry.split('/')[0],
            expiry_year: '20' + data.expiry.split('/')[1],
            cvv: data.cvv,
            user_id: cusId,
            currency: 'AUD'
        };

        const response = await axios.post(`${seed.hellozai.clientApiHost}/card_accounts`, cardData, {
            headers: {
                'Authorization': `Bearer ${token}`, // Use the token from getToken
                'Content-Type': 'application/json'
            }
        });

        console.log('Card Account Creation Response:', response.data.card_accounts.id);
        if (response.status === 201) {
            await userModal.findByIdAndUpdate(
                { _id: user_id },
                { hellozaiPaySrcId: response.data.card_accounts.id },
                { new: true }
            );
            return { success: true, data: response.data };
        } else {
            return { success: false, message: 'Unexpected response status' };
        }
    } catch (error) {
        console.error('Error creating card account:', error.response ? error.response.data : error.message);
        return { success: false, message: 'Error creating card account' };
    }
};


// Step 4: Function to create a charge using the obtained token and req.body data
const createCharge = async (amount, cusId, hellozaiAccountId, userId, cardId) => {
    let response; // Define response outside try block
    try {
        if (process.env.PAYMENT_ENABLE == "true") {
            return { success: false, message: 'Payment functionality is disabled' };
        }
        // Step 4.1: Get the token first
        const token = await getToken();
        const chargeData = {
            account_id: hellozaiAccountId,
            user_id: cusId,
            amount: amount * 100 // Adjust amount by multiplying by 100
        };

        response = await axios.post(`${seed.hellozai.clientApiHost}/charges`, chargeData, {
            headers: {
                'Authorization': `Bearer ${token}`, // Use the token from getToken
                'Content-Type': 'application/json'
            }
        });
        // Return success if the payment intent confirmation was successful
        if (response?.status === 200 && response?.data?.charges?.state === 'completed') {
            paymentData = response?.data?.charges;
            return { success: true, data: paymentData };
        }
        // Return failure message if the payment intent confirmation failed
        return { success: false, message: 'Payment Failed' };
    } catch (error) {
        console.error('Error creating charge:', error.response ? error.response.data : error.message);
        return { success: false, message: 'Error creating charge' };
    } finally {
        // Save hellozai payment log
        const hellozaiLog = new hellozaiModal({
            cardId,
            userId,
            price: amount,
            transactionId: response?.data?.charges?.id,
            paymentStatus: response?.data?.charges?.state ? response?.data?.charges?.state : 'FAILED',
            hellozaiData: JSON.stringify(response?.data?.charges),
            paymentType: 'hellozai' // You need to define the type
        });
        await hellozaiLog.save();
        // }
    }
};
// Step 5: Function to refund an item using the obtained token and req.body data
const refundItem = async (itemIds, value) => {
    console.log(itemIds, 'itemIds')
    let response; // Define response outside try block
    try {
        // Check if payment functionality is enabled
        // if (process.env.PAYMENT_ENABLE !== "true") {
        //     return { success: false, message: 'Payment functionality is disabled' };
        // }

        // Step 4.1: Get the token first
        const token = await getToken();

        // Ensure itemIds is always treated as an array
        if (!Array.isArray(itemIds)) {
            itemIds = [itemIds];
        }

        const refundResults = await Promise.all(itemIds.map(async (itemId) => {
            // Prepare refund data
            const refundData = {
                ...(value && { refund_amount: value }) // Include refund_amount only if value is defined
            };
            console.log(refundData, 'requestData'); // Log the request data

            try {
                // Make the PATCH request to the API
                response = await axios.patch(`https://test.api.promisepay.com/items/${itemId}/refund`, refundData, {
                    headers: {
                        'Authorization': `Bearer ${token}`, // Use the token from getToken
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });
                if (response.status === 200) {
                    return { success: true, data: response.data };
                } else {
                    return { success: false, message: 'Unexpected response status' };
                }
            } catch (error) {
                if (error.response && error.response.status === 400) {
                    console.error('Error in Refunding Payment:', error.response.data);
                    return { success: false, message: error.response.data };
                } else {
                    console.error('Error saving Hellozai customer:', error.response ? error.response.data : error.message);
                    return { success: false, message: 'An unexpected error occurred' };
                }
            }
        }));

        const allSuccessful = refundResults.every(result => result.success);
        console.log("v", allSuccessful, "allSuccessful")
        const aggregatedMessage = refundResults.map(result => result.message).join(', ');

        if (allSuccessful) {
            return { success: true, data: refundResults.map(result => result.data) };
        } else {
            return { success: false, message: aggregatedMessage };
        }

    } catch (error) {
        console.error('Error refunding item:', error.response ? error.response.data : error.message);
        return { success: false, message: 'Error refunding item' };
    } finally {
        // Log refund attempt (optional)
        // You can create a refund log similar to the payment log if needed
        // const refundLog = new RefundLogModel({
        //     itemId,
        //     refundAmount: price, // Use price as the refund amount
        //     refundMessage,
        //     accountId,
        //     status: response?.data?.status || 'FAILED'
        // });
        // await refundLog.save();
    }
};
/**
 * Function to delete a card account
 * @param {string} cardAccountId - The ID of the card account to delete.
 * @returns {Promise<Object>} - The response from the API.
 */
const deleteCardAccount = async (cardAccountId) => {
    try {
        if (process.env.PAYMENT_ENABLE == "true") {
            return { success: false, message: 'Payment functionality is disabled' };
        }
        // Step 1: Get the token first
        const token = await getToken();
        console.log(cardAccountId, 'cardAccountId')
        // Step 2: Send DELETE request to the API to delete the card account
        const response = await axios.delete(`${seed.hellozai.clientApiHost}/card_accounts/${cardAccountId}`, {
            headers: {
                'Authorization': `Bearer ${token}`, // Use the token from getToken
                'Content-Type': 'application/json'
            }
        });

        console.log('Card Account Deletion Response:', response.data);

        // Step 3: Check for successful response
        if (response.status === 200) {
            return { success: true, message: 'Card account deleted successfully' };
        } else {
            return { success: false, message: 'Unexpected response status' };
        }
    } catch (error) {
        // Step 4: Log the error and return a failure message
        console.error('Error deleting card account:', error.response ? error.response.data : error.message);
        return { success: false, message: 'Error deleting card account' };
    }
};

module.exports = {
    createUser,
    createCardAccount,
    createCharge,
    refundItem,
    deleteCardAccount
};