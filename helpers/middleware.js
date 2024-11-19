const { trimParams } = require('./response');

const middleware = (schema, property) => {
    return (req, res, next) => {
        const params = trimParams(req.body);
        const { error } = schema.validate(params);
        const valid = error == null;

        if (valid) {
            next();
        } else {
            const { details } = error;
            const message = details.map(i => i.message).join(',');

            res.status(422).json({ message })
        }
    }
}
module.exports = middleware;