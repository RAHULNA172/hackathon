const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    deadline: { type: Date, required: true },
    businessImpact: { type: Number, required: true, min: 1, max: 10 },
    effortFactor: { type: Number, required: true, min: 1, max: 10 },
    priorityScore: { type: Number, default: 0 },
    priorityLabel: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Low' },
    status: { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
