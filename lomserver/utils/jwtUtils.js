import jwt from 'jsonwebtoken';

const generateToken = (user) => {
    const payload = {
        id: user.id,
        username: user.username,
        is_admin: user.is_admin
    };

    const expiresIn = parseInt(process.env.JWT_EXPIRATION, 10);
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

export { generateToken };
