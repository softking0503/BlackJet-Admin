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
const common = require('../../helpers/v2/common');
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
const hellozaiModal = require('../../models/hellozaiLog');
const blackListCardModel = require('../../models/blackListCards');
const failedCardModel = require('../../models/failedCards');
const { savePowerboardCustomer, createPowerboardCharge } = require('../../helpers/v2/powerBoardPayment'); // Adjust the path to your utility file
const { createPaymentIntent } = require('../../helpers/airwallexPayment'); // Adjust the path to your utility file
const { createCharge } = require('../../helpers/hellozaiPayment'); // Adjust the path to your utility file
const usersModel = require('../../models/users.model');
const secretManagerAws = require('../../helpers/secretManagerAws');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../../', '.env') });

// Load variables from .envs
dotenv.config({ path: path.resolve(__dirname, '../../config', '.envs') });

const apiKey = process.env.AIRWALLEX_API_KEY;
const clientId = process.env.AIRWALLEX_CLIENT_ID;
const clientApiHost = process.env.AIRWALLEX_API;
const clientPciApiHost = process.env.AIRWALLEX_PCI_API;

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
    boutiqueId,
    method,
    count,
    image
}) => {
    try {
        // Initialize response object
        let logoImage = process.env.MEMBERSHIPLOGO;
        if (image != undefined && image != '') {
            logoImage = image;
        }
        // if (type && type === 'Pet Passes') {
        //     logoImage = process.env.PETPASSLOGO;
        // } else if (type && type === 'Reset Voucher') {
        //     logoImage = process.env.RESET_VOUCHER;
        // } else if(type && type === 'Gift Card'){
        //     logoImage = process.env.GIFTCARDLOGO;
        // }

        const findUser = await usersModel.findOne({ _id: userId });
        const { hellozaiCusId, airwallexCustomerId } = findUser;
        console.log(hellozaiCusId, "hellozaiCusId hellozaiCusId")

        const currentDate = new Date();
        const renewal_date = new Date(currentDate.setMonth(currentDate.getMonth() + 1));

        /**
         * Process payment with a given card
         * @param {Object} card - Card details
         * @param {String} gatewayName - The name of the selected payment gateway
         * @returns {Object} - Payment result
         */
        const processPaymentWithCard = async (card, gatewayName) => {
            const payConsentId = card.airwallexPaySrcId;

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
                        boutique_id: boutiqueId,
                        method,
                        count: count ? count : 1
                    });
                    await payment.save();
                    return { success: true, data: payment };
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

                return { success: false, message: airwallexResponse?.message };
            }

            if (gatewayName === 'hellozaiPercentage') {

                const paymentSourceId = card.hellozaiPaySrcId;
                console.log(priceWithInitiation, 'priceWithInitiation')
                console.log(price, 'price')

                const hellozaiResponse = await createCharge(
                    priceWithInitiation ?? price,
                    hellozaiCusId,
                    paymentSourceId,
                    findUser._id,
                    card._id
                );
                const transactionId = hellozaiResponse?.data?.id;

                if (hellozaiResponse.success) {

                    if (hellozaiResponse?.data?.state === 'completed') {
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
                            paymentStatus: hellozaiResponse?.data?.state,
                            renewal_date,
                            reset_voucher,
                            transactionType: 'hellozai',
                            details,
                            boutique_id: boutiqueId,
                            method,
                            count: count ? count : 1
                        });
                        await payment.save();
                        return { success: true, data: payment };
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

                    return { success: false, message: 'Hellozai Payment Failed' };
                }
                return { success: false, message: 'Hellozai Payment Failed' };
            }

            if (gatewayName === 'stripePercentage') {
                // Placeholder for Stripe payment logic
                return { success: false, message: 'Stripe Payment proceed' };
            }
        };

        const filterValidCards = async (cards, blacklistedCards) => {
            const currentDate = new Date();
            const failedCardPromises = [];
            const validCards = cards.filter((card) => {
                const isBlacklisted = blacklistedCards.some((blacklistedCard) => blacklistedCard.cardNumber === card.cardNumber);
                if (isBlacklisted && card.isActive) {
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
                    return false;
                }

                const [expiryMonth, expiryYear] = card.expiry?.split('/')?.map(Number) || [];
                if (expiryMonth && expiryYear && new Date(`20${expiryYear}`, expiryMonth - 1) < currentDate) {
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
                    return false;
                }
                return true;
            });

            await Promise.all(failedCardPromises);
            return validCards;
        };

        let activeCards = await cardModal.find({ userId, status: 'active', isActive: true }).lean();
        let backupCards = await cardModal.find({ userId, status: 'active', isActive: false }).lean();

        if (activeCards.length === 0 && backupCards.length === 0) {
            failedCardModel.create({
                userId: userId,
                cardId: '',
                statusCode: 422,
                paymentMethod: '',
                cardholderName: '',
                cardNumber: '',
                cardType: '',
                expiry: '',
                isActive: false,
                cardIssue: "You do not have any active or backup cards"
            })
            return { success: false, message: 'You do not have any active or backup cards' };
        }

        const blacklistedCards = await blackListCardModel.find({ status: 'active' }).select('cardNumber');
        activeCards = await filterValidCards(activeCards, blacklistedCards);

        if (!activeCards.length) {
            backupCards = await filterValidCards(backupCards, blacklistedCards);
        }

        // Switch to backup cards if no valid active cards
        let selectedCard = activeCards.length ? activeCards[0] : backupCards[0];
        // Determine regionKey from selected card's billing address
        const regionKey = selectedCard?.billingAddress?.country === 'Australia'
            ? 'australiaRegion'
            : 'nonAustraliaRegion';

        // Aggregate payment gateways
        const paymentGateway = await paymentGatewayModal.aggregate([
            { $unwind: `$${regionKey}.gatewayPercentages` },
            { $match: { [`${regionKey}.gatewayPercentages.paymentType`]: selectedCard?.cardType } },
            {
                $group: {
                    _id: '$_id',
                    paymentArray: { $push: `$${regionKey}.gatewayPercentages` }
                }
            },
        ]);

        if (!paymentGateway?.length) {
            return { success: false, message: 'No suitable payment gateway found' };
        }

        const gateways = paymentGateway[0].paymentArray;
        const randomPercentage = (Math.random() * 100).toFixed(1);
        let cumulativePercentage = 0;

        for (const gateway of gateways) {
            const { percentages } = gateway;
            for (const gatewayName of Object.keys(percentages)) {
                cumulativePercentage += percentages[gatewayName] || 0;
                console.log(randomPercentage, 'randomPercentage')
                console.log(cumulativePercentage, 'cumulativePercentage')
                if (randomPercentage <= cumulativePercentage) {
                    for (const card of activeCards) {
                        const result = await processPaymentWithCard(card, gatewayName);
                        if (result.success) return result;
                    }

                    for (const backupCard of backupCards) {
                        const backupResult = await processPaymentWithCard(backupCard, gatewayName);
                        if (backupResult.success) return backupResult;
                    }
                }
            }
        }

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
    } catch (error) {
        console.error(error);
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