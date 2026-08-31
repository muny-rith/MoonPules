const service = require('./auth.service');

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const result = await service.login(email, password);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

module.exports = { login };