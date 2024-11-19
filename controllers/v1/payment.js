const dotenv = require('dotenv');
const passport = require('passport');
const { errorResponse, successResponse,
    emptyResponse,
    successResponseWithoutData,
    successResponseWithPagination,
    trimParams,
    requiredIdResponse,
    customResponse,
    internalServerError,
    randomResponse,
    failMessage,
    notFoundResponse,
    tokenError
} = require("../../helpers/response");
const common = require('../../helpers/v1/common');
const moment = require('moment');
// const stripe = require('stripe')(process.env.YOUR_STRIPE_SECRET_KEY);
const express = require('express');
const { v4: uuid } = require('uuid');
const bodyParser = require('body-parser');
const intentRouter = express.Router();
const { default: mongoose } = require('mongoose');
const { date, required } = require('joi');
// const Airwallex = require('airwallex');
// const airwallex = require('airwallex-payment-elements');
const paymentGatewayModal = require('../../models/payment_gateway');
const { seed } = require('../../config/seed');
const axios = require('axios'); // Make sure to install axios using: npm install axios
const permission = require('../../models/roles');
const { identitytoolkit_v2 } = require('googleapis');
const membership = require('../../models/membership');
const cardModal = require('../../models/card');
const paymentModal = require('../../models/payment');
const userMembershipModal = require('../../models/userMembership');
const airwallexLogModal = require('../../models/airwallexLog');
// const powerboardLogModal = require('../../models/powerBoardLog');
const blackListCardModel = require('../../models/blackListCards');
const failedCardModel = require('../../models/failedCards');
const { savePowerboardCustomer, createPowerboardCharge } = require('../../helpers/v1/powerBoardPayment'); // Adjust the path to your utility file
const { createPaymentIntent } = require('../../helpers/airwallexPayment'); // Adjust the path to your utility file
const usersModel = require('../../models/users.model');
const secretManagerAws = require('../../helpers/secretManagerAws');
const path = require('path');
// Load variables from .env
dotenv.config({ path: path.resolve(__dirname, '../../', '.env') });

// Load variables from .envs
dotenv.config({ path: path.resolve(__dirname, '../../config', '.envs') });

const apiKey = process.env.AIRWALLEX_API_KEY;
const clientId = process.env.AIRWALLEX_CLIENT_ID;
const clientApiHost = process.env.AIRWALLEX_API;
const clientPciApiHost = process.env.AIRWALLEX_PCI_API;
//Funtion For Create Payment
exports.createPayment = async ({
    userId,
    type,
    name,
    id,
    price,
    priceWithInitiation,
    currency,
    normalPrice,
    normalInitiationFees,
    initiationFees,
    reset_voucher,
    details,
    boutiqueId
}) => {
    try {
        // Initialize response object
        let res = {};
        let logoImage = process.env.MEMBERSHIPLOGO;
        if(type && type == 'Pet Passes'){
            logoImage = process.env.PETPASSLOGO;
        }else if(type && type == 'Reset Voucher'){
            logoImage = process.env.RESET_VOUCHER;
        }
        // Fetch user details
        const findUser = await usersModel.findOne({ _id: userId });
        const { powerboardCustomerId: customerId, airwallexCustomerId } = findUser;
        const currentDate = new Date();
        const renewal_date = new Date(currentDate.setMonth(currentDate.getMonth() + 1));

        /**
         * Process payment with a given card
         * @param {Object} card - Card details
         * @returns {Object} - Payment result
         */
        const processPaymentWithCard = async (card) => {
            try {
                const payConsentId = card.airwallexPaySrcId;
                const randomPercentage = (Math.random() * 100).toFixed(1);
                // Determine the region based on the card's country
                const regionKey = card.billingAddress.country === 'Australia' ? 'australiaRegion' : 'nonAustraliaRegion';

                // Aggregate enabled payment gateways matching the card type
                const paymentGateway = await paymentGatewayModal.aggregate([
                    { $unwind: `$${regionKey}.gatewayPercentages` },
                    {
                        $match: {
                            [`${regionKey}.gatewayPercentages.paymentType`]: card.cardType,
                            // [`${regionKey}.gatewayPercentages.enabled`]: true,
                        },
                    },
                    {
                        $group: {
                            _id: '$_id',
                            paymentArray: { $push: `$${regionKey}.gatewayPercentages` },
                        },
                    },
                ]);
                //If paymentGateway length is less than a zero
                // if (!paymentGateway || !paymentGateway.length) {
                //     return { success: false, message: 'Card type is not allowed' };
                // }
                //Assign paymentGateway to gateways
                const gateways = paymentGateway[0].paymentArray;
                let cumulativePercentage = 0;

                for (const gateway of gateways) {
                    const { percentages } = gateway;
                    const gatewayNames = Object.keys(percentages);
                    for (const gatewayName of gatewayNames) {
                        cumulativePercentage += percentages[gatewayName] || 0;
                        if (randomPercentage <= cumulativePercentage) {
                            if (gatewayName === 'airwallexPercentage') {
                                // Airwallex processing
                                const airwallexResponse = await createPaymentIntent(
                                    airwallexCustomerId,
                                    priceWithInitiation ?? price,
                                    payConsentId,
                                    findUser._id,
                                    card._id,
                                    card.expiry
                                );

                                if (airwallexResponse?.data?.status === 200 && airwallexResponse?.data?.data?.status === 'SUCCEEDED') {
                                    // Save payment record
                                    const payment = new paymentModal({
                                        cardId: card._id,
                                        userId,
                                        price,
                                        normalPrice,
                                        normalInitiationFees,
                                        initiationFees,
                                        type,
                                        name,
                                        image: logoImage,
                                        purchaseTransactionId: id,
                                        transactionId: airwallexResponse?.data?.data?.id,
                                        paymentStatus: airwallexResponse?.data?.data?.status,
                                        renewal_date,
                                        reset_voucher,
                                        transactionType: 'airwallex',
                                        details,
                                        boutique_id: boutiqueId
                                    });
                                    await payment.save();
                                    // Log the successful card if it is not active
                                    if (!card.isActive) {
                                        await failedCardModel.create({
                                            userId: card.userId || '',
                                            cardId: card._id || '',
                                            statusCode: 200,
                                            paymentMethod: card.paymentMethod || '',
                                            cardholderName: card.cardholderName || '',
                                            cardNumber: card.cardNumber || '',
                                            cardType: card.cardType || '',
                                            expiry: card.expiry || '',
                                            isActive: card.isActive,
                                            cardIssue: "Successful Card"
                                        })
                                    }
                                    return { success: true, data: payment };
                                } else {
                                    return { success: false, message: airwallexResponse?.message };
                                }
                            } else if (gatewayName === 'powerboardPercentage') {
                                // PowerBoard processing
                                const paymentSourceId = card.powerBoardPaySrcId;
                                const powerBoardResponse = await createPowerboardCharge(
                                    priceWithInitiation ?? price,
                                    currency,
                                    customerId,
                                    paymentSourceId
                                );
                                const transactionId = powerBoardResponse?.data?.resource?.data?.transactions[0]._id;

                                if (powerBoardResponse.success) {
                                    delete powerBoardResponse?.data?.resource?.data?.customer?.payment_source;

                                    // // Save PowerBoard payment log
                                    // const powerBoardLog = new powerboardLogModal({
                                    //     cardId: card._id,
                                    //     userId,
                                    //     price,
                                    //     transactionId,
                                    //     paymentStatus: powerBoardResponse?.data?.resource?.data?.status,
                                    //     powerboardData: JSON.stringify(powerBoardResponse?.data),
                                    //     paymentType: type,
                                    // });
                                    // await powerBoardLog.save();

                                    if (powerBoardResponse?.data?.resource?.data?.status === 'complete') {
                                        // Save payment record
                                        const payment = new paymentModal({
                                            cardId: card._id,
                                            userId,
                                            price,
                                            normalPrice,
                                            normalInitiationFees,
                                            initiationFees,
                                            type,
                                            name,
                                            image: logoImage,
                                            purchaseTransactionId: id,
                                            transactionId,
                                            paymentStatus: powerBoardResponse?.data?.resource?.data?.status,
                                            renewal_date,
                                            reset_voucher,
                                            transactionType: 'powerboard',
                                            details,
                                        });
                                        await payment.save();
                                        return { success: true, data: payment };
                                    } else {
                                        return { success: false, message: 'PowerBoard Payment Failed' };
                                    }
                                } else {
                                    return { success: false, message: powerBoardResponse.message };
                                }
                            } else if (gatewayName === 'stripePercentage') {
                                // Implement Stripe payment processing here
                                return { success: false, message: 'Stripe Payment proceed' };
                            }
                        }
                    }
                }

                return { success: false, message: 'No suitable payment gateway found' };
            } catch (error) {
                console.error(error);
                return { success: false, message: 'Payment Failed' };
            }
        };

        /**
         * Filter out invalid or blacklisted cards
         * @param {Array} cards - Array of card objects
         * @param {Array} blacklistedCards - Array of blacklisted card objects
         * @returns {Array} - Array of valid cards
         */
        const filterValidCards = async (cards, blacklistedCards) => {
            const currentDate = new Date();
            const failedCardPromises = [];

            const validCards = cards.filter((card) => {
                // Check if the card is blacklisted
                const isBlacklisted = blacklistedCards.some((blacklistedCard) => blacklistedCard.cardNumber === card.cardNumber);
                if (isBlacklisted) {
                    // Log the blacklisted card if it is active
                    if (card.isActive) {
                        failedCardPromises.push(
                            failedCardModel.create({
                                userId: card.userId || '',
                                cardId: card._id || '',
                                statusCode: 215,
                                paymentMethod: card.paymentMethod || '',
                                cardholderName: card.cardholderName || '',
                                cardNumber: card.cardNumber || '',
                                cardType: card.cardType || '',
                                expiry: card.expiry || '',
                                isActive: card.isActive,
                                cardIssue: "Card is Blacklisted"
                            })
                        );
                    }
                    return false; // Exclude blacklisted cards
                }

                // Check if the card is expired
                const expiryDate = card.expiry || '';
                const [expiryMonth, expiryYear] = expiryDate ? expiryDate.split('/').map((str) => parseInt(str.trim(), 10)) : [];
                if (expiryMonth && expiryYear) {
                    const expirys = new Date(`20${expiryYear}`, expiryMonth - 1);
                    if (expirys < currentDate) {
                        // Log the expired card if it is active
                        if (card.isActive) {
                            failedCardPromises.push(
                                failedCardModel.create({
                                    userId: card.userId || '',
                                    cardId: card._id || '',
                                    statusCode: 54,
                                    paymentMethod: card.paymentMethod || '',
                                    cardholderName: card.cardholderName || '',
                                    cardNumber: card.cardNumber || '',
                                    cardType: card.cardType || '',
                                    expiry: card.expiry || '',
                                    isActive: card.isActive,
                                    cardIssue: "Card is Expired"
                                })
                            );
                        }
                        return false; // Exclude expired cards
                    }
                }
                return true; // Include valid cards
            });

            // Wait for all failed card entries to be created
            await Promise.all(failedCardPromises);

            return validCards;
        };

        // Find active cards
        let findCard = await cardModal.find({ userId, status: 'active', isActive: true }).lean();
        // Find all backup cards
        let backupCards = await cardModal.find({ userId, status: 'active', isActive: false }).lean();

        if (findCard.length === 0 && backupCards.length === 0) {
            return { success: false, message: 'You do not have any active or backup cards' };
        }

        // Find all blacklisted cards
        const blacklistedCards = await blackListCardModel.find({ status: 'active' }).select('cardNumber');
        // Call filterValidCards function to filter out invalid cards
        findCard = await filterValidCards(findCard, blacklistedCards);

        if (!findCard.length) {
            // If no valid active cards, filter backup cards
            backupCards = await filterValidCards(backupCards, blacklistedCards);
        }

        // Attempt payment with each valid active card
        for (const card of findCard) {
            const result = await processPaymentWithCard(card);
            if (result.success) {
                return result; // Return on successful payment
            } else {
                // If payment with active card fails (e.g., insufficient funds), check all backup cards
                for (const backupCard of backupCards) {
                    const backupResult = await processPaymentWithCard(backupCard);
                    if (backupResult.success) {
                        return backupResult; // Return on successful payment with backup card
                    }
                }
                if (card.isActive) {
                    // Log insufficient funds for the active card
                    await failedCardModel.create({
                        userId: card.userId || '',
                        cardId: card._id || '',
                        statusCode: 51,
                        paymentMethod: card.paymentMethod || '',
                        cardholderName: card.cardholderName || '',
                        cardNumber: card.cardNumber || '',
                        cardType: card.cardType || '',
                        expiry: card.expiry || '',
                        isActive: card.isActive,
                        cardIssue: "Insufficient funds"
                    });
                }
            }
        }

        // Attempt payment with each backup card if all active card payments fail
        for (const card of backupCards) {
            const result = await processPaymentWithCard(card);
            if (result.success) {
                return result; // Return on successful payment with backup card
            }
        }

        // Log payment failure after all attempts
        await failedCardModel.create({
            userId: userId || '',
            cardId: '',
            statusCode: 400,
            paymentMethod: '',
            cardholderName: '',
            cardNumber: '',
            cardType: '',
            expiry: '',
            isActive: false,
            cardIssue: "Payment Failed",
        });
        return { success: false, message: 'Payment Failed with all cards' };
    } catch (err) {
        console.error(err);
        return { success: false, message: 'Payment Failed' };
    }
};

// Retrieve a PaymentIntent.
exports.getpaymentIntent = async (req, res) => {
    const { id } = req.params;
    const createIntentUrl = `${clientApiHost}/api/v1/pa/payment_intents/${id}`;
    try {
        // STEP #1: Before retrieving an intent, should get authorized token first.
        const token = await getToken();

        // STEP #2: Retrieve a paymentIntent by the intentId
        const intentRes = await axios.get(createIntentUrl, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        res.status(200).json(intentRes.data);
    } catch (err) {
        // Handle API error here
        console.log(err, "errrrrrrrrr");
        return internalServerError('Internal Server Error', res);

    }
};

exports.paymentIntentConfirmContinue = async (req, res) => {
    const { id } = req.body;
    try {
        const token = await getToken();
        const confirmContinueUrl = `${clientApiHost}/api/v1/pa/payment_intents/${id}/confirm_continue`;

        const confirmContinueRes = await axios.post(
            confirmContinueUrl,
            {
                // Unique request ID specified by the merchant.
                request_id: uuid(),
                type: '3ds_continue',
                three_ds: {
                    return_url: 'https://8dc2-2409-40d0-1010-d2f7-c64b-e3b-ca4d-74a5.ngrok-free.app/api/v1/admin/getUser?id=65af1e268444b0185f3579a2'
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        if (confirmContinueRes?.data?.status === 'SUCCEEDED') {
            return successResponse(confirmContinueRes.data, "Success", res);

            // return res.redirect(`${origin}/3dsSuccess`);
        }
        // else if (confirmContinueRes?.data?.next_action?.stage === 'WAITING_USER_INFO_INPUT') {
        //     // if it still needs challenge, send an event to the parent window to trigger 3dsChallenge flow.
        //     const eventData = {
        //         type: '3dsChallenge',
        //         data: confirmContinueRes?.data
        //     }
        //     // eslint-disable-next-line no-useless-escape
        //     return res.send(`<html><body><script type=\"text/javascript\">window.parent.postMessage(${eventData}, '*');</script></body></html>`)
        // } 
        else {
            return errorResponse('Payment Failed', res);
        }
    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};

// Handle 3ds return URL callback
exports.paymentIntentConfirm = async (req, res) => {
    const { id } = req.params;
    const confirmIntentUrl = `${clientPciApiHost}/api/v1/pa/payment_intents/${id}/confirm`;
    try {
        const { card, origin } = req.body || {}
        const token = await getToken();
        // The payment price and currency, as well as the merchant order ID must be provided.
        const intentRes = await axios.post(
            confirmIntentUrl,
            {
                // Unique request ID specified by the merchant.
                request_id: uuid(),
                payment_method: {
                    type: "card",
                    card,
                },
                payment_method_options: {
                    card: {
                        three_ds: {
                            return_url: `http://localhost:3002/api/v1/intent/elements/3ds/${id}?origin=${origin}`
                        }
                    }
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        return res.status(200).json(intentRes.data);
    } catch (err) {
        console.log(err);
        // Handle API error here
        return res.status(500).json({ error: err.message });
    }
};

// Use your own apiKey and clientId to get the Airwallex authorized token.
// Use your test keys for development and live keys for real charges in production.
// If you want to change your environment keys, please go to .env file.
let cachedToken = '';
const getToken = async () => {
    if (cachedToken) {
        return cachedToken;
    }
    
    const loginUrl = `${clientApiHost}/api/v1/authentication/login`;
    const loginHeader = {
        'x-client-id': clientId,
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
    };
    const loginRes = await axios.post(
        loginUrl,
        {},
        {
            headers: loginHeader,
        },
    );
    const token = loginRes.data.token;
    cachedToken = token;
    // Cache token for a while
    setTimeout(() => (cachedToken = ''), 20 * 60 * 1000);
    return token;
};