import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }
        req.user = decoded;
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (!req.user?.is_admin) {
        return res.status(403).json({ error: '需要管理员权限' });
    }
    next();
};

export { authMiddleware, isAdmin };
