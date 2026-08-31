const bcrypt = require('bcryptjs');
const db = require('../config/db');

// Edit this list with your real team members, then run once.
const users = [
    { name: 'Rith Muny', email: 'rith@moonpulse.local', password: 'Panda@20030711' },
    { name: 'Chhoby Chann', email: 'chhoby@moonpulse.local', password: 'Rith@20021811' },
];

const run = async () => {
    for (const u of users) {
        const hash = await bcrypt.hash(u.password, 10);
        await db.query(
            `INSERT INTO tb_user (name, email, password_hash) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING`,
            [u.name, u.email, hash]
        );
        console.log(`Seeded: ${u.email}`);
    }
    process.exit(0);
};

run().catch((err) => {
    console.error(err);
    process.exit(1);
});