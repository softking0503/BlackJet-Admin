const { expressjwt: jwt } = require("express-jwt");
//const secretManagerAws = require('../helpers/secretManagerAws');

// let JWT_SECRET;

// const loadJWTSecret = async () => {
//     if (process.env.NODE_ENV === 'production') {
//         const secret = await secretManagerAws.getSecretKeys('PROD_JWT');
//         JWT_SECRET = secret.JWT_SECRET;
//     } else {
//         const secret = await secretManagerAws.getSecretKeys('TEST_JWT');
//         JWT_SECRET = secret.JWT_SECRET;
//     }
// };

// // Call the loadJWTSecret function to fetch the JWT secret
// loadJWTSecret().catch(error => {
//     console.error('Error loading JWT secret:', error);
// });

// const getTokenFromHeaders = (req) => {
//     const { headers: { authorization } } = req;
//     if (authorization && authorization.split(" ")[0] === "Bearer") {
//         return authorization.split(" ")[1];
//     }
//     return null;
// };

const auth = {
    required: (req, res, next) => {
        // console.log('JWT_SECRET-auth==',JWT_SECRET)
        // if (!JWT_SECRET) {
        //     return res.status(500).json({ message: 'JWT secret not loaded' });
        // }
        // jwt({
        //     secret: JWT_SECRET,
        //     algorithms: ['HS256'], // Specify the algorithm
        //     getToken: getTokenFromHeaders,
        // })(req, res, next);
        
        const { headers: { authorization } } = req;
        if (authorization == undefined) {
            return res.status(401).json({
                "status_code": 401,
                "success": false,
                "message": "No authorization token was found",
                "data": []
            })
        }
        
        
        next()
    },
    optional: (req, res, next) => {
        // console.log('JWT_SECRET-auth==',JWT_SECRET)
        // if (!JWT_SECRET) {
        //     return res.status(500).json({ message: 'JWT secret not loaded' });
        // }
        // jwt({
        //     secret: JWT_SECRET,
        //     algorithms: ['HS256'], // Specify the algorithm
        //     getToken: getTokenFromHeaders,
        //     credentialsRequired: false,
        // })(req, res, next);
        next();
    },
};

module.exports = auth;
