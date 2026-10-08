/**
 * routes/tasks.js
 * Municipal Officer Task Assignment & Tracking API
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const TASKS_FILE = path.join(__dirname, '..', 'data', 'tasks.json');

// Initial demo tasks if empty
const DEFAULT_TASKS = [
  {
    id: "task-001",
    assignee_name: "Rajesh Kumar (Road Maintenance Crew A)",
    problem_type: "Pothole Cavity Repair",
    assignment_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    days_to_complete: 3,
    status: "In Progress",
    hazard_id: "8615f804-25ad-4f94-8e7f-537a514d1f75",
    location_desc: "FC Road near Goodluck Chowk, Pune",
    priority: "High",
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: "task-002",
    assignee_name: "Anita Deshmukh (Waste Management Squad)",
    problem_type: "Garbage Pile Clearance",
    assignment_date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    days_to_complete: 2,
    status: "Assigned",
    hazard_id: "",
    location_desc: "Kothrud Ward 2 Depot Lane",
    priority: "Medium",
    created_at: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: "task-003",
    assignee_name: "Vikram Patil (Marking & Signage Team)",
    problem_type: "Faded Road Line Marking",
    assignment_date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
    days_to_complete: 5,
    status: "Assigned",
    hazard_id: "",
    location_desc: "Shivajinagar Bus Stand Junction",
    priority: "Low",
    created_at: new Date(Date.now() - 3 * 86400000).toISOString()
  }
];

if (!fs.existsSync(TASKS_FILE)) {
  fs.writeFileSync(TASKS_FILE, JSON.stringify(DEFAULT_TASKS, null, 2), 'utf8');
}

function loadTasks() {
  try {
    const raw = fs.readFileSync(TASKS_FILE, 'utf8');
    const tasks = JSON.parse(raw);
    return Array.isArray(tasks) ? tasks : DEFAULT_TASKS;
  } catch (e) {
    return DEFAULT_TASKS;
  }
}

function saveTasks(tasks) {
  try {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf8');
  } catch (e) {
    console.error('[Tasks Route] Error saving tasks:', e);
  }
}

// GET /api/tasks — List all assigned tasks
router.get('/', (req, res) => {
  const tasks = loadTasks();
  res.json({
    success: true,
    count: tasks.length,
    tasks
  });
});

// POST /api/tasks — Create a new assigned task
router.post('/', (req, res) => {
  const {
    assignee_name,
    problem_type,
    assignment_date,
    days_to_complete,
    hazard_id,
    location_desc,
    priority,
    notes
  } = req.body;

  // Validation according to requirements
  if (!assignee_name || !assignee_name.trim()) {
    return res.status(400).json({ success: false, message: 'Assignee name is required' });
  }
  if (!problem_type || !problem_type.trim()) {
    return res.status(400).json({ success: false, message: 'Type of problem being assigned is required' });
  }
  if (!assignment_date) {
    return res.status(400).json({ success: false, message: 'Date of assignment is required' });
  }
  const days = parseInt(days_to_complete, 10);
  if (isNaN(days) || days <= 0) {
    return res.status(400).json({ success: false, message: 'Days to complete the task must be a positive number' });
  }

  const tasks = loadTasks();
  const newTask = {
    id: `task-${uuidv4().slice(0, 8)}`,
    assignee_name: assignee_name.trim(),
    problem_type: problem_type.trim(),
    assignment_date,
    days_to_complete: days,
    hazard_id: hazard_id || null,
    location_desc: location_desc || 'Assigned Zone',
    priority: priority || 'High',
    notes: notes || '',
    status: 'Assigned',
    created_at: new Date().toISOString()
  };

  tasks.unshift(newTask);
  saveTasks(tasks);

  res.status(201).json({
    success: true,
    message: 'Task assigned successfully to municipal unit',
    task: newTask
  });
});

// PUT /api/tasks/:id/status — Update task status
router.put('/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  const tasks = loadTasks();

  const taskIndex = tasks.findIndex(t => t.id === id);
  if (taskIndex === -1) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }

  if (status) tasks[taskIndex].status = status;
  if (notes) tasks[taskIndex].notes = notes;
  tasks[taskIndex].updated_at = new Date().toISOString();

  saveTasks(tasks);

  res.json({
    success: true,
    message: 'Task updated successfully',
    task: tasks[taskIndex]
  });
});

module.exports = router;
