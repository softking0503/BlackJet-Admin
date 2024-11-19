require('dotenv').config();
const cron = require('node-cron');
const createError = require('http-errors');
const express = require('express');
const https = require("https");
const http = require("http");
const basicAuth = require('basic-auth-connect');
const path = require('path');
const swaggerUi = require("swagger-ui-express");
const swaggerOptions = require("./swagger.json"); // Adjust the path based on your file structure
const secretManagerAws = require('./helpers/secretManagerAws');//get secret 
let SWAGGER_USERNAME;
let SWAGGER_PASSWORD;

//const logger = require('morgan');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
const cors = require('cors');
app.use(cors());
//app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
//app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
// secretManagerAws.getSecretKeys('Swagger-Live').then(secret => {
//     // Use the retrieved secret as needed
//     SWAGGER_USERNAME = secret.SWAGGER_USERNAME;
//     SWAGGER_PASSWORD = secret.SWAGGER_PASSWORD;
// }).catch(err => {
//     // Handle errors
//     console.error('Error:', err);
// });

app.use(function (req, res, next) {
    // Website you wish to allow to connect
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT,DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, Authorization, Timezone");
    // Pass to next layer of middleware
    next();
});
//creating ssl without ssl certificates
let server = http.createServer(app);

// Function to update secrets
async function updateSecrets() {
    try {
        const secret = await secretManagerAws.getSecretKeys('Swagger-Live');
        SWAGGER_USERNAME = secret.SWAGGER_USERNAME;
        SWAGGER_PASSWORD = secret.SWAGGER_PASSWORD;
    
    } catch (err) {
        console.error('Failed to update secrets:', err);
    }
}
app.use("/api-docs", dynamicAuth, swaggerUi.serve, swaggerUi.setup(swaggerOptions));
async function dynamicAuth(req, res, next) {
    await updateSecrets()
    if (!SWAGGER_USERNAME || !SWAGGER_PASSWORD) {
        return res.status(503).send('Service temporarily unavailable. Please try again later.');
    }
    return basicAuth(SWAGGER_USERNAME, SWAGGER_PASSWORD)(req, res, next);
}


// setup port for server
server.listen(process.env.SWAGGER_PORT, () => {
    console.log(`Blackjet Swagger listening on port ${process.env.SWAGGER_PORT}`);
})

module.exports = app;