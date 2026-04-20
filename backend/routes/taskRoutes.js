const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { protect } = require('../middleware/authMiddleware');
const axios = require('axios');

// Get all tasks for logged in user
router.get('/', protect, async (req, res) => {
    try {
        const tasks = await Task.find({ assignedTo: req.user._id }).sort({ priorityScore: -1 });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create task
router.post('/', protect, async (req, res) => {
    try {
        const { title, description, deadline, businessImpact, effortFactor } = req.body;
        
        let priorityScore = 0;
        let priorityLabel = 'Low';
        try {
            const aiRes = await axios.post(`${process.env.AI_SERVICE_URL}/calculate-priority`, {
                deadline,
                businessImpact,
                effortFactor,
                title: title || '',
                description: description || ''
            });
            priorityScore = aiRes.data.priorityScore;
            priorityLabel = aiRes.data.priorityLabel || 'Low';
        } catch (aiErr) {
            console.error('AI Service Error:', aiErr.message);
            // Fallback calculation if AI service is down
            const daysToDeadline = Math.max(1, (new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
            const deadlineUrgency = Math.min(10, 10 / daysToDeadline);
            priorityScore = (0.5 * deadlineUrgency) + (0.3 * businessImpact) + (0.2 * effortFactor);
            priorityLabel = priorityScore >= 6 ? 'High' : priorityScore >= 3 ? 'Medium' : 'Low';
        }

        const task = await Task.create({
            title,
            description,
            deadline,
            businessImpact,
            effortFactor,
            priorityScore,
            priorityLabel,
            assignedTo: req.user._id
        });
        res.status(201).json(task);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update task (status or all details)
router.put('/:id', protect, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task || task.assignedTo.toString() !== req.user._id.toString()) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const { title, description, deadline, businessImpact, effortFactor, status } = req.body;

        // If core fields change, re-calculate priority
        if (deadline || businessImpact !== undefined || effortFactor !== undefined) {
            const d = deadline || task.deadline;
            const b = businessImpact !== undefined ? businessImpact : task.businessImpact;
            const e = effortFactor !== undefined ? effortFactor : task.effortFactor;

            try {
                const aiRes = await axios.post(`${process.env.AI_SERVICE_URL}/calculate-priority`, {
                    deadline: d,
                    businessImpact: b,
                    effortFactor: e,
                    title: title || task.title,
                    description: description || task.description
                });
                task.priorityScore = aiRes.data.priorityScore;
                task.priorityLabel = aiRes.data.priorityLabel || 'Low';
            } catch (aiErr) {
                const daysToDeadline = Math.max(1, (new Date(d) - new Date()) / (1000 * 60 * 60 * 24));
                const deadlineUrgency = Math.min(10, 10 / daysToDeadline);
                task.priorityScore = (0.5 * deadlineUrgency) + (0.3 * b) + (0.2 * e);
                task.priorityLabel = task.priorityScore >= 6 ? 'High' : task.priorityScore >= 3 ? 'Medium' : 'Low';
            }
        }

        task.title = title || task.title;
        task.description = description || task.description;
        task.deadline = deadline || task.deadline;
        task.businessImpact = businessImpact !== undefined ? businessImpact : task.businessImpact;
        task.effortFactor = effortFactor !== undefined ? effortFactor : task.effortFactor;
        task.status = status || task.status;

        const updatedTask = await task.save();
        res.json(updatedTask);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete task
router.delete('/:id', protect, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task || task.assignedTo.toString() !== req.user._id.toString()) {
            return res.status(404).json({ message: 'Task not found' });
        }
        await task.deleteOne();
        res.json({ message: 'Task removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
