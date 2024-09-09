const express = require('express');
const { checkRole } = require('./auth'); // Middleware to check roles
const { Project, User } = require('./models');
const routerManagement = express.Router();

// Get Users route, accessible by Admin and Manager
routerManagement.get('/users', checkRole(['Admin', 'Manager']), async (req, res) => {
    try {
        // Fetch all users from the database
        const users = await User.find({}, '-password'); // Exclude the password field for security

        // Send the list of users as the response
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

routerManagement.get('/users/:id', checkRole(['Admin', 'Manager']), async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password'); // Exclude password from the result
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


routerManagement.put('/users/:id', checkRole(['Admin']), async (req, res) => {
    const { id } = req.params;
    const { username, email, role } = req.body;

    try {
        // Find the user by ID
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update only valid fields if provided
        if (username) user.username = username;
        if (email) user.email = email;
        if (role) {
            if (!['Admin', 'Manager', 'Employee'].includes(role)) {
                return res.status(400).json({ message: 'Invalid role' });
            }
            user.role = role;
        }

        // Save the updated user
        await user.save();

        res.status(200).json({
            message: 'User updated successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


routerManagement.put('/users/:id', checkRole(['Admin']), async (req, res) => {
    const userId = req.params.id;

    try {
        // Find user by ID
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update user fields
        const allowedUpdates = ['username', 'email', 'role']; // Define allowed fields
        const updates = req.body;
        Object.keys(updates).forEach((key) => {
            if (allowedUpdates.includes(key)) {
                user[key] = updates[key];
            }
        });

        // Save the updated user
        await user.save();

        res.status(200).json({ message: 'User updated successfully', user });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


routerManagement.delete('/users/:id', checkRole(['Admin']), async (req, res) => {
    try {
        const { id } = req.params;

        // Check if user exists
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Delete the user
        await User.findByIdAndDelete(id);

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


routerManagement.post('/users/:id/assign-role', checkRole(['Admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        // Validate the role
        if (!['Manager', 'Employee'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        // Find the user by ID
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update the user's role
        user.role = role;
        await user.save();

        res.status(200).json({ message: 'User role updated successfully' });
    } catch (error) {
        console.error('Error assigning role:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


routerManagement.post('/project', checkRole(['Admin']), async (req, res) => {
    try {
        const { name, description, assignedTo } = req.body;

        if (!name || !description) {
            return res.status(400).json({ message: 'Name and description are required' });
        }

        // Validate assigned users
        if (assignedTo && !Array.isArray(assignedTo)) {
            return res.status(400).json({ message: 'Assigned users should be an array of user IDs' });
        }

        // Check if all assigned users exist
        if (assignedTo) {
            const users = await User.find({ _id: { $in: assignedTo } });
            if (users.length !== assignedTo.length) {
                return res.status(400).json({ message: 'Some user IDs are invalid' });
            }
        }

        // Create the project
        const newProject = new Project({
            name,
            description,
            createdBy: req.user._id,
            assignedTo: assignedTo || [],
        });

        await newProject.save();

        res.status(201).json({ message: 'Project created successfully', project: newProject });
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


routerManagement.get('/project', checkRole(['Admin',"Manager","Employee"]),async (req, res) => {
    try {
        // Get the user from the request (set by authentication middleware)
        const user = req.user;
        // console.log(user)
        // Define a filter based on user role
        let filter = {};
        if (user.role === 'Admin') {
            // Admins can see all projects
            filter = {};
        } else {
            // Regular users can see only projects assigned to them
            filter = { assignedTo: user._id };
        }

        // Fetch projects based on the filter
        const projects = await Project.find(filter).populate('createdBy', 'username').populate('assignedTo', 'username');

        res.status(200).json({ projects });
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


routerManagement.get('/project/:id',checkRole(['Admin',"Manager","Employee"]), async (req, res) => {
    try {
        // Get the user from the request (set by authentication middleware)
        const user = req.user;
        const projectId = req.params.id;

        // Fetch the project by ID
        const project = await Project.findById(projectId).populate('createdBy', 'username').populate('assignedTo', 'username');

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Check if user is allowed to access the project
        if (user.role !== 'Admin' && !project.assignedTo.includes(user._id.toString())) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Respond with the project details
        res.status(200).json({ project });
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


routerManagement.put('/project/:id', checkRole(['Admin']), async (req, res) => {
    try {
        const projectId = req.params.id;
        const { name, description, assignedTo } = req.body;

        // Validate input data
        if (!name && !description && !assignedTo) {
            return res.status(400).json({ message: 'No data provided to update' });
        }

        // Validate assigned users if provided
        if (assignedTo && !Array.isArray(assignedTo)) {
            return res.status(400).json({ message: 'Assigned users should be an array of user IDs' });
        }

        // Check if all assigned users exist if provided
        if (assignedTo) {
            const users = await User.find({ _id: { $in: assignedTo } });
            if (users.length !== assignedTo.length) {
                return res.status(400).json({ message: 'Some user IDs are invalid' });
            }
        }

        // Update the project
        const updatedProject = await Project.findByIdAndUpdate(
            projectId,
            { $set: { name, description, assignedTo } },
            { new: true } // Return the updated document
        ).populate('createdBy', 'username').populate('assignedTo', 'username');

        if (!updatedProject) {
            return res.status(404).json({ message: 'Project not found' });
        }

        res.status(200).json({ message: 'Project updated successfully', project: updatedProject });
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});



routerManagement.delete('/project/:id', checkRole(['Admin']), async (req, res) => {
    try {
        const projectId = req.params.id;

        // Delete the project by ID
        const result = await Project.findByIdAndDelete(projectId);

        if (!result) {
            return res.status(404).json({ message: 'Project not found' });
        }

        res.status(200).json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
module.exports = routerManagement;
