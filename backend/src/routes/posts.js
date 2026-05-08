const express = require('express');
const { v4: uuid } = require('uuid');
const { getDB } = require('../services/dbService');
const jwt = require('jsonwebtoken');
const router = express.Router();

const auth = (req, res, next) => {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token.' });
  try { req.userId = jwt.verify(h.split(' ')[1], process.env.JWT_SECRET).id; next(); }
  catch { res.status(401).json({ error: 'Invalid token.' }); }
};

router.get('/', auth, (req, res) => {
  const posts = getDB().prepare(`
    SELECT p.*, u.name, u.username, u.avatar,
      EXISTS(SELECT 1 FROM likes l WHERE l.post_id=p.id AND l.user_id=?) as liked
    FROM posts p JOIN users u ON p.user_id=u.id
    ORDER BY p.created_at DESC LIMIT 50
  `).all(req.userId);
  res.json(posts.map(p => ({ ...p, liked: !!p.liked })));
});

router.post('/', auth, (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content required.' });
  const id = uuid();
  getDB().prepare('INSERT INTO posts (id,user_id,content) VALUES (?,?,?)').run(id, req.userId, content);
  const post = getDB().prepare('SELECT p.*, u.name, u.username FROM posts p JOIN users u ON p.user_id=u.id WHERE p.id=?').get(id);
  req.app.get('io')?.emit('new_post', post);
  res.status(201).json(post);
});

router.post('/:id/like', auth, (req, res) => {
  const db = getDB();
  const existing = db.prepare('SELECT id FROM likes WHERE user_id=? AND post_id=?').get(req.userId, req.params.id);
  if (existing) {
    db.prepare('DELETE FROM likes WHERE id=?').run(existing.id);
    db.prepare('UPDATE posts SET likes_count=likes_count-1 WHERE id=?').run(req.params.id);
    res.json({ liked: false });
  } else {
    db.prepare('INSERT INTO likes (id,user_id,post_id) VALUES (?,?,?)').run(uuid(), req.userId, req.params.id);
    db.prepare('UPDATE posts SET likes_count=likes_count+1 WHERE id=?').run(req.params.id);
    res.json({ liked: true });
  }
});

router.get('/:id/comments', auth, (req, res) => {
  const comments = getDB().prepare('SELECT c.*, u.name, u.username FROM comments c JOIN users u ON c.user_id=u.id WHERE c.post_id=? ORDER BY c.created_at').all(req.params.id);
  res.json(comments);
});

router.post('/:id/comments', auth, (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content required.' });
  const db = getDB();
  const id = uuid();
  db.prepare('INSERT INTO comments (id,user_id,post_id,content) VALUES (?,?,?,?)').run(id, req.userId, req.params.id, content);
  db.prepare('UPDATE posts SET comments_count=comments_count+1 WHERE id=?').run(req.params.id);
  const comment = db.prepare('SELECT c.*, u.name, u.username FROM comments c JOIN users u ON c.user_id=u.id WHERE c.id=?').get(id);
  res.status(201).json(comment);
});

router.delete('/:id', auth, (req, res) => {
  const post = getDB().prepare('SELECT id FROM posts WHERE id=? AND user_id=?').get(req.params.id, req.userId);
  if (!post) return res.status(403).json({ error: 'Not authorized.' });
  getDB().prepare('DELETE FROM posts WHERE id=?').run(req.params.id);
  res.status(204).send();
});

module.exports = router;
