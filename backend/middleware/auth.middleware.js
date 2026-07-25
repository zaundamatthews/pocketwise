const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function protectRoutes(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        // A check
        if(!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: "Bearer token is missing or invalid"
            })
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        if(!user) {
            return res.status(401).json({
                success: false,
                message: "User linked to this token no longer exists"
            });
        }
        req.user = user;


        next();
    } catch(error) {
        console.error('JWT verification error:', error.message);
        return res.status(401).json({
            success: false,
            message: error.message || "Unauthorized access"
        })

    }
}
module.exports =  {
    protectRoutes
}