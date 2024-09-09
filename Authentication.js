const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { User } = require('./models'); // Adjust the path as necessary
const { checkRole } = require('./auth');
const jwt = require('jsonwebtoken');
const routerAuth = express.Router();

// Middleware to handle errors
const handleError = (res, error) => res.status(500).json({ error: error.message });

// Signup Controller
routerAuth.post('/auth/signup', async (req, res) => {
    try {
        // Check if an Admin already exists
        const existingAdmin = await User.findOne({ role: 'Admin' });
        if (existingAdmin) {
            return res.status(400).json({ message: 'An Admin already exists.' });
        }

        // Create the Admin user
        const { username, email, password } = req.body;

        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        const newAdmin = new User({
            username,
            email,
            password: hashedPassword,
            role: 'Admin',
        });

        await newAdmin.save();

        res.status(201).json({ message: 'Admin user created successfully.' });
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


routerAuth.post('/auth/register', checkRole(["Admin"]), async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        // Validate the role if necessary
        if (!['Manager', 'Employee'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        // Check if the username or email is already taken
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }

        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            role,
        });

        await newUser.save();

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


routerAuth.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find the user by username
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Compare provided password with the hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            "test",
            { expiresIn: '1h' } // Set token expiration time
        );

        // Set the token as a cookie
        res.cookie('auth', token, {
            httpOnly: true, // Prevent client-side JavaScript access
            secure: true, // Use secure cookies in production
            maxAge: 3600000 // 1 hour
        });

        res.status(200).json({ message: 'Login successful' });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
module.exports = routerAuth;
