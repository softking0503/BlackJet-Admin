const adminModal = require("../../models/admin");
const userModal = require("../../models/users.model");
const userMembershipModal = require('../../models/userMembership');
const rolesModel = require("../../models/roles");
const jwt = require('jsonwebtoken');
const { createPayment } = require('../../controllers/v1/payment'); // Update with correct path
const axios = require('axios');
const { seed } = require('../../config/seed');
const cardModal = require('../../models/card');
const { v4: uuid } = require('uuid');

async function savePowerboardCustomer(user_id, paymentDetails) {
    // Check if the user exists
    let user = await userModal.findById({ _id: user_id });

    // If user is not found, throw an error
    if (!user) {
        throw new Error('User not found');
    }

    let url;
    let data;

    // Prepare the payment source data
    const paymentSource = {
        gateway_id: `${seed.powerBoard.gatewayId}`,
        card_name: paymentDetails.cardholderName,
        card_number: paymentDetails.cardNumber.replace(/\s+/g, ''),
        expire_month: paymentDetails.expiry.split('/')[0],
        expire_year: paymentDetails.expiry.split('/')[1],
        card_ccv: paymentDetails.cvv
    };
    // Determine the API endpoint and data payload based on whether the user has an existing Powerboard customer ID
    if (user.powerboardCustomerId) {
        // If the user has an existing Powerboard customer ID, update the existing customer
        url = `${seed.powerBoard.clientApiHost}/v1/customers/${user.powerboardCustomerId}`;
        data = { first_name: user.preferredFirstName, payment_source: paymentSource };
    } else {
        // If the user does not have an existing Powerboard customer ID, create a new customer
        url = `${seed.powerBoard.clientApiHost}/v1/customers`;
        data = {
            first_name: user.preferredFirstName ? user.preferredFirstName : user.fullName,//if user preferred name exist else full name
            last_name: user.preferredFirstName ? user.preferredFirstName : user.fullName,//if user preferred last name exist else full name
            email: user.email,//user email
            // phone: user.phone,
            payment_source: paymentSource
        };
    }

    // Set up headers for the request
    const headers = {
        'accept': 'application/json',
        // 'content-type': '*/*',
        'x-user-secret-key': `${seed.powerBoard.secretKey}`
    };
    // Execute the API call
    try {
        const response = await axios.post(url, data, { headers });
        // Update the Customer Id in User if it is a new customer
        if (!user.powerboardCustomerId) {
            await userModal.findByIdAndUpdate(
                { _id: user_id },
                { powerboardCustomerId: response?.data?.resource?.data?._id },
                { new: true }
            );
        }

        // Return success response with the response data
        return { success: true, data: response.data };
    } catch (error) {
        // Log and return the error response
        console.error('Error executing API call:', error.response ? error.response.data : error.message);
        return { success: false, message: 'Failed to process payment', error: error.response ? error.response.data : error.message };
    }
}

async function getPowerboardCustomer(customerId) {
    // Define the URL for the get request
    const url = `${seed.powerBoard.clientApiHost}/v1/customers/${customerId}`;

    // Set up headers for the request
    const headers = {
        'accept': 'application/json',
        'content-type': '*/*',
        'x-user-secret-key': `${seed.powerBoard.secretKey}`
    };

    try {
        // Send the get request to fetch the customer details
        const response = await axios.get(url, { headers });

        // Return success response with the fetched data
        return { success: true, data: response.data };
    } catch (error) {
        // Log and return the error response
        console.error('Error fetching customer data:', error.response ? error.response.data : error.message);
        return { success: false, message: 'Failed to fetch customer data', error: error.response ? error.response.data : error.message };
    }
}
// async function archivePaymentSource(user_id, id) {
//     try {
//         // Retrieve user details from the user model
//         const user = await userModal.findById({ _id: user_id });

//         // Retrieve payment resource details from the card model
//         const paymentResource = await cardModal.findById({ _id: id });

//         // Extract payment source ID and customer ID from the retrieved records
//         const paymentSourceId = paymentResource?.powerBoardPaySrcId;
//         const customerId = user?.powerboardCustomerId;

//         // Check if both payment source ID and customer ID are available
//         if (!paymentSourceId || !customerId) {
//             return { success: false, message: 'Missing payment source ID or customer ID' };
//         }

//         // Define the URL for the delete request
//         const url = `${seed.powerBoard.clientApiHost}/v1/customers/${customerId}/payment_sources/${paymentSourceId}`;
//         console.log(url, "url")
//         // Set up headers for the request
//         const headers = {
//             'accept': 'application/json',
//             'content-type': '*/*',
//             'x-user-secret-key': `${seed.powerBoard.secretKey}`
//         };

//         // Send the delete request to archive the payment source
//         const response = await axios.delete(url, { headers });

//         // Return success response with the response data
//         return { success: true, data: response.data };
//     } catch (error) {
//         // Log and return the error response
//         console.error('Error archiving payment source:', error.response ? error.response.data : error.message);
//         return { success: false, message: 'Failed to archive payment source', error: error.response ? error.response.data : error.message };
//     }
// }

async function modifyPaymentSource(user_id, payment_id, paymentDetails) {
    try {
        // Retrieve user details from the user model
        const user = await userModal.findById({ _id: user_id });

        // Retrieve payment resource details from the card model
        const paymentResource = await cardModal.findById(payment_id);

        // Check if user exists
        if (!user) {
            return { success: false, message: 'User not found' };
        }

        // Check if payment resource exists
        if (!paymentResource) {
            return { success: false, message: 'Payment resource not found' };
        }

        // Extract payment source ID and customer ID
        const paymentSourceId = paymentResource.powerBoardPaySrcId;
        const customerId = user.powerboardCustomerId;

        // Check if both payment source ID and customer ID are available
        if (!paymentSourceId || !customerId) {
            return { success: false, message: 'Missing payment source ID or customer ID' };
        }
        // // Set up headers for the request
        const headers = {
            'accept': 'application/json',
            // 'content-type': '*/*',
            'x-user-secret-key': `${seed.powerBoard.secretKey}`
        };

        const modifyUrl = `${seed.powerBoard.clientApiHost}/v1/customers/${customerId}`;
        // Prepare data for the modification request
        const data = {
            first_name: user.preferredFirstName ? user.preferredFirstName : user.fullName,//if user preferred name exist else full name
            last_name: user.preferredFirstName ? user.preferredFirstName : user.fullName,//if user preferred last name exist else full name
            email: user.email,//user email
            payment_source: {
                gateway_id: `${seed.powerBoard.gatewayId}`,
                card_name: paymentDetails.cardholderName, // Use the card name from paymentDetails
                card_number: paymentDetails.cardNumber.replace(/\s+/g, ''), // Use the existing card number
                expire_month: paymentDetails.expiry.split('/')[0], // Extract month from expiry
                expire_year: paymentDetails.expiry.split('/')[1], // Extract year from expiry
                card_ccv: paymentDetails.cvv // Use the CVV from the existing payment source
            }
        };

        // Send the request to modify the payment source
        const modifyResponse = await axios.post(modifyUrl, data, { headers });
        // Return success response with the modified data
        return { success: true, data: modifyResponse.data };
    } catch (error) {
        // Log and return the error response
        console.error('Error modifying payment source:', error.response ? error.response.data : error.message);
        return { success: false, message: 'Failed to modify payment source', error: error.response ? error.response.data : error.message };
    }
}

async function createPowerboardCharge(amount, currency, customerId, paymentSourceId) {
    // Define the URL for the Powerboard charges endpoint
    const url = `${seed.powerBoard.clientApiHost}/v1/charges`;

    // Set up headers for the request
    const headers = {
        'accept': 'application/json',
        'x-user-secret-key': `${seed.powerBoard.secretKey}`,
        'Content-Type': 'application/json'
    };

    // Define the data payload for the charge
    const data = {
        amount: amount,
        currency: 'AUD',
        customer_id: customerId,
        payment_source_id: paymentSourceId
    };

    // Execute the API call
    try {
        const response = await axios.post(url, data, { headers });
        // Return success response with the response data
        return { success: true, data: response.data };
    } catch (error) {
        // Log and return the error response
        console.error('Error creating charge:', error.response ? error.response.data : error.message);
        return { success: false, message: 'Failed to create charge', error: error.response ? error.response.data : error.message };
    }
}

module.exports = {
    getPowerboardCustomer,
    savePowerboardCustomer,
    // archivePaymentSource,
    modifyPaymentSource,
    createPowerboardCharge
};
