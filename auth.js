const jwt = require('jsonwebtoken');
const { User } = require('./models'); // Adjust the path as needed

// Middleware to check user role
const checkRole = (roles) => {
  return async (req, res, next) => {
    const token = req.cookies.auth ;
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    try {
      // Verify and decode the token
      const decoded = jwt.verify(token, "test");
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Check if the user's role is in the allowed roles
      if (roles.includes(user.role)) {
        req.user = user; // Add user to request for further use if needed
        next();
      } else {
        res.status(403).json({ message: 'Access denied' });
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      res.status(401).json({ message: 'Invalid token' });
    }
  };
};

module.exports = { checkRole };
