const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const repository = require('./auth.repository');

const login = async (email, password) => {
    if (!email || !password) {
        const err = new Error('Email and password are required');
        err.status = 400;
        throw err;
    }

    const user = await repository.findUserByEmail(email);
    if (!user || !user.is_active) {
        const err = new Error('Invalid email or password');
        err.status = 401;
        throw err;
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
        const err = new Error('Invalid email or password');
        err.status = 401;
        throw err;
    }

    const token = jwt.sign(
        { id: user.id, name: user.name, email: user.email },
        env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    return { token, user: { id: user.id, name: user.name, email: user.email } };
};

module.exports = { login };