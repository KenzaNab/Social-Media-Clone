const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const { getDB } = require('../services/dbService');
const router = express.Router();

router.post('/register', async (req, res) => {
  const { name, username, email, password } = req.body;
  if (!name || !username || !email || !password) return res.status(400).json({ error: 'All fields required.' });
  const db = getDB();
  if (db.prepare('SELECT id FROM users WHERE email=? OR username=?').get(email, username)) return res.status(409).json({ error: 'Email or username taken.' });
  const id = uuid();
  db.prepare('INSERT INTO users (id,name,username,email,password) VALUES (?,?,?,?,?)').run(id, name, username, email, await bcrypt.hash(password, 10));
  const token = jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: { id, name, username, email } });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = getDB().prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Invalid credentials.' });
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const { password: _, ...u } = user;
  res.json({ token, user: u });
});

module.exports = router;
