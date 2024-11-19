const dotenv = require('dotenv');
const moment = require('moment');
const adminModal = require("../models/admin");
const userModal = require("../models/users.model");
const userMembershipModal = require('../models/userMembership');
const rolesModel = require("../models/roles");
const jwt = require('jsonwebtoken');
// const { createPayment } = require('../controllers/payment'); // Update with correct path
const axios = require('axios');
const { seed } = require('../config/seed');
const cardModal = require('../models/card');
const airwallexLogModal = require('../models/airwallexLog');
const { v4: uuid } = require('uuid');
const secretManagerAws = require('../helpers/secretManagerAws');
const path = require('path');
// Load variables from .env
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Load variables from .envs
dotenv.config({ path: path.resolve(__dirname, '../config', '.envs') });

const apiKey = process.env.AIRWALLEX_API_KEY;
const clientId = process.env.AIRWALLEX_CLIENT_ID;
const clientApiHost = process.env.AIRWALLEX_API;
const clientPciApiHost = process.env.AIRWALLEX_PCI_API;
// Cache token to avoid multiple login requests within a short period
let cachedToken = '';

/**
 * Retrieves an authentication token from the Airwallex API.
 * Caches the token for 20 minutes to reduce the number of login requests.
 *
 * @returns {Promise<string>} The authentication token
 * @throws Will throw an error if unable to obtain the token
 */
const getToken = async () => {
    if (cachedToken) {
        // Return cached token if it exists
        return cachedToken;
    }
    const loginUrl = `${clientApiHost}/api/v1/authentication/login`;
    const loginHeader = {
        'x-client-id': clientId,
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
    };


    try {
        // Request a new token from Airwallex API
        const loginRes = await axios.post(loginUrl, {}, { headers: loginHeader });
        const { token } = loginRes.data;
        cachedToken = token;

        // Cache token for 20 minutes
        setTimeout(() => { cachedToken = ''; }, 20 * 60 * 1000);

        return token;
    } catch (error) {
        // Log error and rethrow
        console.error('Error obtaining token:', error.response ? error.response.data : error.message);
        throw error;
    }
};

/**
 * Saves a customer to the Airwallex API.
 *
 * @param {Object} customerData - The customer data to be saved
 * @param {Object} customerData.address - Customer's address information
 * @param {string} customerData.email - Customer's email address
 * @param {string} customerData.first_name - Customer's first name
 * @param {string} customerData.last_name - Customer's last name
 * @param {string} customerData.merchant_customer_id - Merchant's customer ID
 * @param {string} customerData.phone_number - Customer's phone number
 * @param {string} customerData.request_id - Unique request ID
 * @returns {Promise<Object>} The response from the Airwallex API
 * @throws Will throw an error if unable to save the customer
 */
const saveAirwallexCustomer = async (user_id, customerData) => {
    const url = `${clientApiHost}/api/v1/pa/customers/create`;
    try {
        if (process.env.PAYMENT_ENABLE == "true") {
            return { success: false, message: 'Payment functionality is disabled' };
        }
        // Get authentication token
        const authToken = await getToken();
        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
        };

        // Send request to save customer data
        const response = await axios.post(url, customerData, { headers });

        if (response.status === 201) {
            await userModal.findByIdAndUpdate(
                { _id: user_id },
                { airwallexCustomerId: response.data.id },
                { new: true }
            );
            return { success: true, data: response.data };
        } else {
            return { success: false, message: 'Unexpected response status' };
        }
    } catch (error) {
        if (error.response && error.response.status === 400) {
            console.error('Error saving Airwallex customer:', error.response.data);
            return { success: false, message: 'Bad Request: Invalid customer data' };
        } else {
            console.error('Error saving Airwallex customer:', error.response ? error.response.data : error.message);
            return { success: false, message: 'An unexpected error occurred' };
        }
    }
};


/**
 * Creates a payment consent using the Airwallex API.
 *
 * @param {Object} requestData - The request data for creating payment consent
 * @param {string} requestData.customer_id - ID of the customer for whom consent is being created
 * @param {string} requestData.next_triggered_by - Triggering source for the next payment (e.g., 'merchant')
 * @param {string} requestData.request_id - Unique ID for the request
 * @param {string} authToken - Authorization token for API access
 * @returns {Promise<Object>} The response from the Airwallex API
 * @throws Will throw an error if unable to create the payment consent
 */
const createPaymentConsent = async (userId) => {
    const url = `${clientApiHost}/api/v1/pa/payment_consents/create`;
    try {
        if (process.env.PAYMENT_ENABLE == "true") {
            return { success: false, message: 'Payment functionality is disabled' };
        }
        let userData = await userModal.findOne({ _id: userId, status: "active" })

        const requestData = {
            customer_id: userData.airwallexCustomerId,
            next_triggered_by: 'merchant',
            request_id: uuid(),
        };

        // Get authentication token
        const authToken = await getToken();
        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
        };
        const response = await axios.post(url, requestData, { headers });
        if (response.status === 201) {
            return { success: true, data: response.data };
        } else {
            return { success: false, message: 'Unexpected response status' };
        }
    } catch (error) {
        if (error.response && error.response.status === 400) {
            console.error('Error saving Airwallex customer:', error.response.data);
            return { success: false, message: 'Bad Request: Invalid customer data' };
        } else {
            console.error('Error saving Airwallex customer:', error.response ? error.response.data : error.message);
            return { success: false, message: 'An unexpected error occurred' };
        }
    }
};

/**
 * Verifies a payment consent using the Airwallex API.
 *
 * @param {string} consentId - The ID of the payment consent to verify
 * @param {Object} paymentMethod - The payment method details
 * @param {string} paymentMethod.type - The type of payment method (e.g., 'card')
 * @param {Object} paymentMethod.card - The card details
 * @param {string} paymentMethod.card.number - The card number
 * @param {string} paymentMethod.card.expiry_month - The card's expiry month
 * @param {string} paymentMethod.card.expiry_year - The card's expiry year
 * @param {string} paymentMethod.card.cvc - The card's CVC code
 * @param {string} paymentMethod.card.name - The cardholder's name
 * @param {Object} paymentMethod.card.three_ds - The 3D Secure details
 * @param {string} paymentMethod.card.three_ds.return_url - The URL to return to after 3D Secure verification
 * @param {string} requestId - A unique ID for the request
 * @param {string} returnUrl - The URL to return to after verification
 * @param {Object} verificationOptions - The verification options
 * @param {Object} verificationOptions.card - The card verification details
 * @param {number} verificationOptions.card.amount - The verification amount
 * @param {string} verificationOptions.card.currency - The currency of the verification amount
 * @param {string} authToken - Authorization token for API access
 * @returns {Promise<Object>} The response from the Airwallex API
 * @throws Will throw an error if unable to verify the payment consent
 */
const verifyPaymentConsent = async (user_id, cardData, consentId) => {
    const url = `${clientApiHost}/api/v1/pa/payment_consents/${consentId}/verify`;
    try {
        if (process.env.PAYMENT_ENABLE == "true") {
            return { success: false, message: 'Payment functionality is disabled' };
        }
        const verificationOptions = {
            card: {
                amount: 10,
                currency: 'AUD',
                risk_control: {
                    skip_risk_processing: false,
                    three_domain_secure_action: null,
                    three_ds_action: "SKIP_3DS"
                }
            },
        };

        const paymentMethod = {
            type: 'card',
            card: {
                number: cardData.cardNumber.replace(/\s+/g, ''),
                expiry_month: cardData.expiry.split('/')[0],
                expiry_year: '20' + cardData.expiry.split('/')[1],
                cvc: cardData.cvv,
                name: cardData.cardholderName
            },
        };
        const returnUrl = 'https://run.mocky.io/v3/f2a02d7d-d3cd-4a37-bec1-de0839d9c573';

        const data = {
            payment_method: paymentMethod,
            request_id: uuid(),
            return_url: returnUrl,
            verification_options: verificationOptions,
        };

        // Get authentication token
        const authToken = await getToken();
        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
        };
        const response = await axios.post(url, data, { headers });
        if (response.status === 200 && response?.data?.status == 'VERIFIED') {
            return { success: true, data: response.data };
        } else {
            return { success: false, message: 'Unexpected response status' };
        }
    } catch (error) {
        if (error.response && error.response.status === 400 && error.response.data.code === 'validation_error') {
            console.error('Error saving Airwallex customer:', error.response.data);
            return { success: false, message: error.response ? error.response.data : error.message };
        } else if (error.response && error.response.status === 400) {
            console.error('Error saving Airwallex customer:', error.response.data);
            return { success: false, message: 'Bad Request: Invalid customer data' };
        } else {
            console.error('Error saving Airwallex customer:', error.response ? error.response.data : error.message);
            return { success: false, message: 'An unexpected error occurred' };
        }
    }
};

/**
 * Creates a payment intent with Airwallex.
 *
 * @param {string} cusId - The customer ID.
 * @param {number} amount - The payment amount.
 * @param {string} airwallexConsentId - The Airwallex payment consent ID.
 * @returns {Promise<Object>} - The response object with success status and data or error message.
 */
const createPaymentIntent = async (cusId, amount, airwallexConsentId, userId, cardId) => {
    const paymentIntentUrl = `${clientApiHost}/api/v1/pa/payment_intents/create`;
    let confirmIntentRes;
    let paymentData;
    try {
        if (process.env.PAYMENT_ENABLE == "true") {
            return { success: false, message: 'Payment functionality is disabled' };
        }
        // Get authentication token
        const authToken = await getToken();

        // Headers for the API request
        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
        };

        // Payload for creating payment intent
        const payIntObj = {
            amount,
            customer_id: cusId,
            currency: 'AUD',
            merchant_order_id: uuid(),
            request_id: uuid(),
        };

        // Create payment intent
        const response = await axios.post(paymentIntentUrl, payIntObj, { headers });

        // Check if the payment intent creation was successful
        if (response.status === 201) {
            const confirmIntentUrl = `${clientPciApiHost}/api/v1/pa/payment_intents/${response.data.id}/confirm`;

            // Confirm the payment intent
            confirmIntentRes = await axios.post(
                confirmIntentUrl,
                {
                    request_id: uuid(),
                    customer_id: cusId,
                    payment_consent_reference: {
                        id: airwallexConsentId,
                    },
                },
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            // Return success if the payment intent confirmation was successful
            if (confirmIntentRes?.status === 200 && confirmIntentRes?.data?.status === 'SUCCEEDED') {
                paymentData = confirmIntentRes?.data;
                return { success: true, data: confirmIntentRes };
            }
            // Return failure message if the payment intent confirmation failed
            return { success: false, message: 'Payment Failed' };
        }
        // Return failure message if the payment intent creation failed
        return { success: false, message: 'Fail To Create Payment Intent' };
    } catch (error) {
        confirmIntentRes = error;
        // Handle errors and return appropriate messages
        if (error?.response && error?.response?.status === 400 && error?.response?.data?.provider_original_response_code == '51') {
            console?.error('Error creating Airwallex payment intent:', error?.response?.data);
            return { success: false, message: error?.response?.data };
        } else if (error?.response && error?.response?.status === 400 && error?.response?.data?.provider_original_response_code == '100') {
            console?.error('Error creating Airwallex payment intent:', error?.response?.data);
            return { success: false, message: error?.response?.data };
        } else if (error?.response && error?.response?.status === 400) {
            console?.error('Error creating Airwallex payment intent:', error?.response?.data);
            return { success: false, message: 'Bad Request: Invalid customer data' };
        }
        console.error('Error creating Airwallex payment intent:', error?.response ? error?.response?.data : error?.message);
        return { success: false, messages: 'An unexpected error occurred' };
    } finally {
        paymentData = confirmIntentRes?.response?.data ? confirmIntentRes?.response?.data : confirmIntentRes?.data;
        if (confirmIntentRes?.data) {
            delete paymentData?.latest_payment_attempt?.payment_method;
        }
        // Save Airwallex payment log
        const airwallexLog = new airwallexLogModal({
            cardId,
            userId,
            price: amount,
            transactionId: confirmIntentRes?.data ? paymentData?.id : paymentData?.trace_id,
            paymentStatus: confirmIntentRes?.data ? paymentData?.status : 'FAILED',
            airwallexData: JSON.stringify(paymentData),
            paymentType: 'Airwallex' // You need to define the type
        });
        await airwallexLog.save();
        // }
    }
};


const refundPayment = async (payIntentIds, value) => {
    const url = `${clientApiHost}/api/v1/pa/refunds/create`;
    try {
        // if (process.env.PAYMENT_ENABLE == "false") {
        //     return { success: false, message: 'Payment functionality is disabled' };
        // }

        // Ensure payIntentIds is always treated as an array
        if (!Array.isArray(payIntentIds)) {
            payIntentIds = [payIntentIds];
        }
        console.log(payIntentIds, 'payIntentIds')
        const authToken = await getToken();
        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
        };

        const refundResults = await Promise.all(payIntentIds.map(async (payIntentId) => {
            const requestData = {
                payment_intent_id: payIntentId,
                reason: "Return good",
                request_id: uuid(),
                ...(value && { amount: value }) // Include refund_amount only if value is defined

            };
            console.log(requestData, 'requestData');

            try {
                const response = await axios.post(url, requestData, { headers });
                if (response.status === 201) {
                    return { success: true, data: response.data };
                } else {
                    return { success: false, message: 'Unexpected response status' };
                }
            } catch (error) {
                if (error.response && error.response.status === 400) {
                    console.error('Error in Refunding Payment:', error.response.data);
                    return { success: false, message: error.response.data };
                } else {
                    console.error('Error saving Airwallex customer:', error.response ? error.response.data : error.message);
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
        console.error('Unexpected error:', error);
        return { success: false, message: 'An unexpected error occurred' };
    }
};


// Export the saveAirwallexCustomer function
module.exports = { saveAirwallexCustomer, createPaymentConsent, verifyPaymentConsent, createPaymentIntent, refundPayment };

