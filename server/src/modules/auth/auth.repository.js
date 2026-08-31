const db = require('../../config/db');

const findUserByEmail = async (email) => {
    const result = await db.query(
        'SELECT id, name, email, password_hash, is_active FROM tb_user WHERE email = $1',
        [email]
    );
    return result.rows[0] || null;
};

module.exports = { findUserByEmail };