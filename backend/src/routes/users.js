const express = require('express');
const { getDB } = require('../services/dbService');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const router = express.Router();

const auth = (req, res, next) => {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token.' });
  try { req.userId = jwt.verify(h.split(' ')[1], process.env.JWT_SECRET).id; next(); }
  catch { res.status(401).json({ error: 'Invalid token.' }); }
};

router.get('/me', auth, (req, res) => {
  const user = getDB().prepare('SELECT id,name,username,email,bio,avatar,created_at FROM users WHERE id=?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'Not found.' });
  const posts = getDB().prepare('SELECT COUNT(*) as n FROM posts WHERE user_id=?').get(req.userId);
  const followers = getDB().prepare('SELECT COUNT(*) as n FROM follows WHERE following_id=?').get(req.userId);
  const following = getDB().prepare('SELECT COUNT(*) as n FROM follows WHERE follower_id=?').get(req.userId);
  res.json({ ...user, postsCount: posts.n, followersCount: followers.n, followingCount: following.n });
});

router.get('/:username', auth, (req, res) => {
  const user = getDB().prepare('SELECT id,name,username,bio,avatar,created_at FROM users WHERE username=?').get(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const isFollowing = getDB().prepare('SELECT 1 FROM follows WHERE follower_id=? AND following_id=?').get(req.userId, user.id);
  const posts = getDB().prepare('SELECT COUNT(*) as n FROM posts WHERE user_id=?').get(user.id);
  res.json({ ...user, isFollowing: !!isFollowing, postsCount: posts.n });
});

router.post('/:id/follow', auth, (req, res) => {
  if (req.params.id === req.userId) return res.status(400).json({ error: 'Cannot follow yourself.' });
  const db = getDB();
  const existing = db.prepare('SELECT 1 FROM follows WHERE follower_id=? AND following_id=?').get(req.userId, req.params.id);
  if (existing) {
    db.prepare('DELETE FROM follows WHERE follower_id=? AND following_id=?').run(req.userId, req.params.id);
    res.json({ following: false });
  } else {
    db.prepare('INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?,?)').run(req.userId, req.params.id);
    res.json({ following: true });
  }
});

module.exports = router;
