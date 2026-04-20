const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// Middleware: any supervisor (super + sub + teacher)
const anyAdmin = (req, res, next) => {
    if (req.user && ['admin', 'subadmin', 'teacher'].includes(req.user.role)) return next();
    res.status(403).json({ message: 'Admin/Teacher access required' });
};

// Middleware: super admin only
const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') return next();
    res.status(403).json({ message: 'Super admin access required' });
};

// GET /api/admin/stats
router.get('/stats', protect, anyAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalTasks = await Task.countDocuments();
        const highTasks = await Task.countDocuments({ priorityScore: { $gte: 6 } });
        const mediumTasks = await Task.countDocuments({ priorityScore: { $gte: 3, $lt: 6 } });
        const lowTasks = await Task.countDocuments({ priorityScore: { $lt: 3 } });
        const completedTasks = await Task.countDocuments({ status: 'completed' });
        const pendingTasks = await Task.countDocuments({ status: 'pending' });
        const inProgressTasks = await Task.countDocuments({ status: 'in-progress' });
        res.json({ totalUsers, totalTasks, highTasks, mediumTasks, lowTasks, completedTasks, pendingTasks, inProgressTasks });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/admin/users
router.get('/users', protect, anyAdmin, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/admin/tasks
router.get('/tasks', protect, anyAdmin, async (req, res) => {
    try {
        const tasks = await Task.find()
            .populate('assignedTo', 'username role')
            .sort({ priorityScore: -1 });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', protect, adminOnly, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        await Task.deleteMany({ assignedTo: req.params.id });
        res.json({ message: 'User and their tasks deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/admin/tasks  (any admin assigns task)
router.post('/tasks', protect, anyAdmin, async (req, res) => {
    try {
        const { title, description, deadline, businessImpact, effortFactor, assignedTo } = req.body;
        if (!assignedTo) return res.status(400).json({ message: 'assignedTo is required' });

        let priorityScore = 0;
        let priorityLabel = 'Medium';
        try {
            const axios = require('axios');
            const aiRes = await axios.post(`${process.env.AI_SERVICE_URL}/calculate-priority`, {
                deadline, businessImpact, effortFactor,
                title: title || '', description: description || ''
            });
            priorityScore = aiRes.data.priorityScore;
            priorityLabel = aiRes.data.priorityLabel || 'Medium';
        } catch {
            const days = Math.max(1, (new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
            priorityScore = (0.5 * Math.min(10, 10 / days)) + (0.3 * (businessImpact || 6)) + (0.2 * (effortFactor || 6));
            priorityLabel = priorityScore >= 6 ? 'High' : priorityScore >= 3 ? 'Medium' : 'Low';
        }

        const task = await Task.create({
            title, description, deadline,
            businessImpact: businessImpact || 6,
            effortFactor: effortFactor || 6,
            priorityScore: Math.round(priorityScore * 100) / 100,
            priorityLabel,
            assignedTo,
            status: 'pending'
        });
        const populated = await task.populate('assignedTo', 'username');
        res.status(201).json(populated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT /api/admin/users/:id/role
router.put('/users/:id/role', protect, adminOnly, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        user.role = req.body.role || user.role;
        await user.save();
        res.json({ message: 'Role updated', role: user.role });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT /api/admin/tasks/:id  (any admin can update task status)
router.put('/tasks/:id', protect, anyAdmin, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });
        task.status = req.body.status || task.status;
        const updated = await task.save();
        const populated = await updated.populate('assignedTo', 'username teamName');
        res.json(populated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE /api/admin/tasks/:id  (any admin can delete tasks)
router.delete('/tasks/:id', protect, anyAdmin, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });
        await task.deleteOne();
        res.json({ message: 'Task deleted by admin' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/admin/team-monitor
router.get('/team-monitor', protect, anyAdmin, async (req, res) => {
    try {
        const users = await User.find({ role: 'user' }).select('-password');
        const allTasks = await Task.find().populate('assignedTo', 'username teamName role');

        // Group by team
        const teams = {};
        for (const user of users) {
            const team = user.teamName || 'No Team';
            if (!teams[team]) teams[team] = { name: team, members: [], tasks: [] };
            teams[team].members.push(user.username);
        }
        for (const task of allTasks) {
            if (!task.assignedTo) continue;
            const team = task.assignedTo.teamName || 'No Team';
            if (!teams[team]) teams[team] = { name: team, members: [], tasks: [] };
            teams[team].tasks.push(task);
        }

        const result = Object.values(teams).map(t => {
            const tasks = t.tasks.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
            const total = tasks.length;
            const completed = tasks.filter(t => t.status === 'completed').length;
            const high = tasks.filter(t => (t.priorityLabel || '') === 'High').length;
            const medium = tasks.filter(t => (t.priorityLabel || '') === 'Medium').length;
            const low = tasks.filter(t => (t.priorityLabel || '') === 'Low').length;
            const overdue = tasks.filter(t => new Date(t.deadline) < new Date() && t.status !== 'completed').length;
            return {
                name: t.name,
                members: t.members,
                memberCount: t.members.length,
                total, completed, high, medium, low, overdue,
                completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
                tasks
            };
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Middleware: teacher access (teacher OR admin can view teacher module)
const teacherAccess = (req, res, next) => {
    if (req.user && ['admin', 'subadmin', 'teacher'].includes(req.user.role)) return next();
    res.status(403).json({ message: 'Teacher access required' });
};

// GET /api/admin/teacher-stats — full org analysis for teacher module
router.get('/teacher-stats', protect, teacherAccess, async (req, res) => {
    try {
        const now = new Date();
        const users = await User.find({ role: 'user' }).select('-password');
        const allTasks = await Task.find().populate('assignedTo', 'username teamName role');

        // ── Org-level stats ──────────────────────────────────────────────────
        const total      = allTasks.length;
        const completed  = allTasks.filter(t => t.status === 'completed').length;
        const pending    = allTasks.filter(t => t.status === 'pending').length;
        const inProgress = allTasks.filter(t => t.status === 'in-progress').length;
        const highPri    = allTasks.filter(t => (t.priorityLabel || '') === 'High').length;
        const overdue    = allTasks.filter(t => new Date(t.deadline) < now && t.status !== 'completed').length;
        const highPendingOverdue = allTasks.filter(t =>
            (t.priorityLabel || '') === 'High' && t.status !== 'completed' && new Date(t.deadline) < now
        ).length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        // ── Per-user productivity ────────────────────────────────────────────
        const userStats = users.map(u => {
            const uTasks = allTasks.filter(t => t.assignedTo?._id?.toString() === u._id.toString());
            const uTotal     = uTasks.length;
            const uCompleted = uTasks.filter(t => t.status === 'completed').length;
            const uPending   = uTasks.filter(t => t.status === 'pending').length;
            const uInProg    = uTasks.filter(t => t.status === 'in-progress').length;
            const uOverdue   = uTasks.filter(t => new Date(t.deadline) < now && t.status !== 'completed').length;
            const uHighPend  = uTasks.filter(t => (t.priorityLabel || '') === 'High' && t.status !== 'completed').length;
            const uRate      = uTotal > 0 ? Math.round((uCompleted / uTotal) * 100) : 0;

            // Performance score (0-100): weighted completion rate minus penalties
            const penalty    = (uOverdue * 10) + (uHighPend * 5);
            const perfScore  = Math.max(0, Math.min(100, uRate - penalty));

            // Inefficiency flags
            const flags = [];
            if (uOverdue > 0)    flags.push({ type: 'overdue',      label: `${uOverdue} overdue task${uOverdue > 1 ? 's' : ''}`,          severity: uOverdue >= 3 ? 'critical' : 'warning' });
            if (uHighPend > 0)   flags.push({ type: 'high-pending', label: `${uHighPend} high priority not completed`,                     severity: 'critical' });
            if (uPending > uTotal * 0.6 && uTotal > 2) flags.push({ type: 'excessive-pending', label: `${Math.round((uPending/uTotal)*100)}% tasks pending`, severity: 'warning' });
            if (uTotal === 0)    flags.push({ type: 'no-tasks',     label: 'No tasks assigned',                                             severity: 'info' });

            return {
                _id: u._id,
                username: u.username,
                teamName: u.teamName || 'No Team',
                total: uTotal, completed: uCompleted, pending: uPending,
                inProgress: uInProg, overdue: uOverdue, highPending: uHighPend,
                completionRate: uRate, performanceScore: perfScore,
                flags, tasks: uTasks
            };
        }).sort((a, b) => b.performanceScore - a.performanceScore);

        // ── Productivity Trend (Last 7 Days) ──────────────────────────────────
        const trend = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayStart = new Date(d.setHours(0,0,0,0));
            const dayEnd = new Date(d.setHours(23,59,59,999));
            
            const completedOnDay = allTasks.filter(t => 
                t.status === 'completed' && 
                t.updatedAt >= dayStart && 
                t.updatedAt <= dayEnd
            ).length;
            
            trend.push({ date: dateStr, completed: completedOnDay });
        }

        // ── Inefficiency Breakdown ───────────────────────────────────────────
        const inefficiencies = {
            criticalUsers: userStats.filter(u => u.flags.some(f => f.severity === 'critical')),
            overdueUsers: userStats.filter(u => u.overdue > 0),
            topPerformers: userStats.filter(u => u.performanceScore >= 80),
            underPerformers: userStats.filter(u => u.performanceScore < 40)
        };

        // ── Auto-generated Summary ──────────────────────────────────────────
        const topPerformer = userStats[0]?.username || 'N/A';
        const summary = `The organization currently has a task completion rate of ${completionRate}%. ` +
            `${inefficiencies.criticalUsers.length > 0 ? `Attention is required for ${inefficiencies.criticalUsers.length} users exhibiting critical inefficiencies. ` : 'No critical user inefficiencies detected. '} ` +
            `The top performing user is ${topPerformer} with a performance score of ${userStats[0]?.performanceScore || 0}. ` +
            `There are ${overdue} overdue tasks across the system that need immediate prioritization.`;

        res.json({
            org: { total, completed, pending, inProgress, highPri, overdue, highPendingOverdue, completionRate },
            userStats,
            inefficiencies,
            trend,
            summary
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
