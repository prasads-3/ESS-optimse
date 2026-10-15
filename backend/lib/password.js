import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;
// bcrypt hashes always start with $2a$/$2b$/$2y$ — anything else is a legacy
// plaintext row that predates hashing.
const BCRYPT_PREFIX = /^\$2[aby]\$/;

export const isHashed = (stored) => typeof stored === 'string' && BCRYPT_PREFIX.test(stored);

export const hashPassword = (plain) => bcrypt.hash(plain, SALT_ROUNDS);

// Verifies a plaintext candidate against the stored value.
// Supports legacy plaintext rows (pre-hashing) so existing users can still
// log in until scripts/hash-plaintext-passwords.js has run; the login route
// also re-hashes legacy rows on successful login (lazy migration).
export const verifyPassword = async (plain, stored) => {
    if (!plain || !stored) return false;
    if (isHashed(stored)) {
        return bcrypt.compare(plain, stored);
    }
    return plain === stored;
};
