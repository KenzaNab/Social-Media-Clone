import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';

const AuthCtx = createContext();
const useAuth = () => useContext(AuthCtx);

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('sm_user')); } catch { return null; } });
  useEffect(() => { const t = localStorage.getItem('sm_token'); if (t) axios.defaults.headers.common['Authorization'] = `Bearer ${t}`; }, []);
  const set = (token, u) => { localStorage.setItem('sm_token', token); localStorage.setItem('sm_user', JSON.stringify(u)); axios.defaults.headers.common['Authorization'] = `Bearer ${token}`; setUser(u); };
  const login = async (e, p) => { const { data } = await axios.post('/api/auth/login', { email: e, password: p }); set(data.token, data.user); };
  const register = async (n, un, e, p) => { const { data } = await axios.post('/api/auth/register', { name: n, username: un, email: e, password: p }); set(data.token, data.user); };
  const logout = () => { localStorage.clear(); delete axios.defaults.headers.common['Authorization']; setUser(null); };
  return <AuthCtx.Provider value={{ user, login, register, logout }}>{children}</AuthCtx.Provider>;
}

const s = {
  app: { background: '#f0f2f5', minHeight: '100vh', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', color: '#1c1e21' },
  nav: { background: '#fff', borderBottom: '1px solid #e4e6ea', padding: '0 1.5rem', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 },
  logo: { color: '#1877f2', fontWeight: 700, fontSize: 22, textDecoration: 'none' },
  navRight: { display: 'flex', gap: 12, alignItems: 'center' },
  navLink: { color: '#606770', textDecoration: 'none', fontSize: 14, fontWeight: 500 },
  logoutBtn: { background: '#e4e6ea', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  feed: { maxWidth: 600, margin: '0 auto', padding: '1.5rem 1rem' },
  card: { background: '#fff', borderRadius: 12, border: '1px solid #e4e6ea', marginBottom: 16 },
  cardPad: { padding: '1rem 1.25rem' },
  avatar: (color='#1877f2') => ({ width: 40, height: 40, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0 }),
  authorRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  authorName: { fontWeight: 600, fontSize: 15 },
  timestamp: { fontSize: 12, color: '#8a8d91' },
  content: { fontSize: 15, lineHeight: 1.6, marginBottom: 12, whiteSpace: 'pre-wrap' },
  actions: { display: 'flex', gap: 4, borderTop: '1px solid #e4e6ea', padding: '4px 8px' },
  actionBtn: (active) => ({ flex: 1, padding: '8px', border: 'none', background: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: active ? '#1877f2' : '#606770', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }),
  compose: { background: '#fff', borderRadius: 12, border: '1px solid #e4e6ea', padding: '1rem', marginBottom: 16 },
  textarea: { width: '100%', border: 'none', outline: 'none', resize: 'none', fontSize: 16, fontFamily: 'inherit', background: 'none', color: '#1c1e21', boxSizing: 'border-box' },
  postBtn: { background: '#1877f2', color: '#fff', border: 'none', borderRadius: 20, padding: '8px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 700, float: 'right' },
  inp: { width: '100%', padding: '10px 14px', border: '1px solid #e4e6ea', borderRadius: 8, fontSize: 14, marginBottom: 12, boxSizing: 'border-box', outline: 'none' },
  btn: (bg='#1877f2') => ({ width: '100%', padding: 12, background: bg, color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer' }),
  comments: { borderTop: '1px solid #e4e6ea', padding: '8px 1.25rem' },
  commentBubble: { background: '#f0f2f5', borderRadius: 18, padding: '8px 14px', marginBottom: 6, display: 'inline-block', maxWidth: '85%' },
};

const AVATAR_COLORS = ['#1877f2','#e94560','#7c3aed','#059669','#d97706','#db2777'];
const getColor = (name='') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
const initials = (name='') => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

function Post({ post, onUpdate }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [liked, setLiked] = useState(post.liked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const { user } = useAuth();

  const toggleLike = async () => {
    const { data } = await axios.post(`/api/posts/${post.id}/like`);
    setLiked(data.liked);
    setLikesCount(prev => data.liked ? prev + 1 : prev - 1);
  };

  const loadComments = async () => {
    const { data } = await axios.get(`/api/posts/${post.id}/comments`);
    setComments(data);
  };

  const toggleComments = () => {
    if (!showComments) loadComments();
    setShowComments(!showComments);
  };

  const addComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const { data } = await axios.post(`/api/posts/${post.id}/comments`, { content: commentText });
    setComments([...comments, data]);
    setCommentText('');
  };

  const del = async () => {
    if (window.confirm('Delete post?')) {
      await axios.delete(`/api/posts/${post.id}`);
      onUpdate();
    }
  };

  return (
    <div style={s.card}>
      <div style={s.cardPad}>
        <div style={s.authorRow}>
          <div style={s.avatar(getColor(post.name))}>{initials(post.name)}</div>
          <div style={{ flex: 1 }}>
            <p style={s.authorName}>{post.name} <span style={{ color: '#8a8d91', fontWeight: 400 }}>@{post.username}</span></p>
            <p style={s.timestamp}>{new Date(post.created_at).toLocaleString()}</p>
          </div>
          {user?.id === post.user_id && <button onClick={del} style={{ background: 'none', border: 'none', color: '#8a8d91', cursor: 'pointer', fontSize: 18 }}>×</button>}
        </div>
        <p style={s.content}>{post.content}</p>
        <p style={{ fontSize: 13, color: '#8a8d91' }}>{likesCount} likes · {post.comments_count} comments</p>
      </div>
      <div style={s.actions}>
        <button style={s.actionBtn(liked)} onClick={toggleLike}>👍 Like</button>
        <button style={s.actionBtn(showComments)} onClick={toggleComments}>💬 Comment</button>
      </div>
      {showComments && (
        <div style={s.comments}>
          {comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <div style={{ ...s.avatar(getColor(c.name)), width: 32, height: 32, fontSize: 12 }}>{initials(c.name)}</div>
              <div style={s.commentBubble}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{c.name} </span>
                <span style={{ fontSize: 14 }}>{c.content}</span>
              </div>
            </div>
          ))}
          <form onSubmit={addComment} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input style={{ ...s.inp, marginBottom: 0, flex: 1, borderRadius: 20, padding: '6px 14px' }} placeholder="Write a comment..." value={commentText} onChange={e => setCommentText(e.target.value)} />
            <button type="submit" style={{ background: '#1877f2', color: '#fff', border: 'none', borderRadius: 20, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Post</button>
          </form>
        </div>
      )}
    </div>
  );
}

function FeedPage() {
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const { user } = useAuth();

  const load = async () => { const { data } = await axios.get('/api/posts'); setPosts(data); };
  useEffect(() => {
    load();
    const socket = io('http://localhost:5001');
    socket.on('new_post', (post) => { if (post.user_id !== user?.id) setPosts(prev => [post, ...prev]); });
    return () => socket.disconnect();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    const { data } = await axios.post('/api/posts', { content });
    setPosts([data, ...posts]);
    setContent('');
  };

  return (
    <div style={{ background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={s.feed}>
        <div style={s.compose}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={s.avatar(getColor(user?.name))}>{initials(user?.name)}</div>
            <textarea style={s.textarea} placeholder={`What's on your mind, ${user?.name?.split(' ')[0]}?`} value={content} onChange={e => setContent(e.target.value)} rows={2} />
          </div>
          <div style={{ borderTop: '1px solid #e4e6ea', marginTop: 10, paddingTop: 10, textAlign: 'right' }}>
            <button style={s.postBtn} onClick={submit} disabled={!content.trim()}>Post</button>
          </div>
        </div>
        {posts.map(p => <Post key={p.id} post={p} onUpdate={load} />)}
        {posts.length === 0 && <div style={{ textAlign: 'center', color: '#8a8d91', padding: '3rem' }}>No posts yet. Be the first! 👋</div>}
      </div>
    </div>
  );
}

function AuthPage({ mode }) {
  const [f, setF] = useState({ name: '', username: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const handle = async (e) => {
    e.preventDefault(); setErr('');
    try { mode === 'login' ? await login(f.email, f.password) : await register(f.name, f.username, f.email, f.password); navigate('/'); }
    catch (err) { setErr(err.response?.data?.error || 'Error'); }
  };
  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '2.5rem', width: 400, border: '1px solid #e4e6ea' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1877f2', marginBottom: 24, textAlign: 'center' }}>SocialApp</h1>
        {err && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{err}</p>}
        <form onSubmit={handle}>
          {mode === 'register' && <>
            <input style={s.inp} placeholder="Full name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} required />
            <input style={s.inp} placeholder="Username" value={f.username} onChange={e => setF({ ...f, username: e.target.value })} required />
          </>}
          <input style={s.inp} type="email" placeholder="Email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} required />
          <input style={s.inp} type="password" placeholder="Password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} required />
          <button style={s.btn()} type="submit">{mode === 'login' ? 'Log in' : 'Sign up'}</button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#8a8d91' }}>
          {mode === 'login' ? 'No account? ' : 'Have account? '}
          <Link to={mode === 'login' ? '/register' : '/login'} style={{ color: '#1877f2', fontWeight: 600 }}>{mode === 'login' ? 'Sign up' : 'Log in'}</Link>
        </p>
      </div>
    </div>
  );
}

function AppInner() {
  const { user, logout } = useAuth();
  return (
    <>
      <nav style={s.nav}>
        <Link to="/" style={s.logo}>SocialApp</Link>
        <div style={s.navRight}>
          {user ? <>
            <span style={{ fontSize: 14, fontWeight: 500 }}>@{user.username}</span>
            <button style={s.logoutBtn} onClick={logout}>Logout</button>
          </> : <>
            <Link to="/login" style={s.navLink}>Log in</Link>
            <Link to="/register"><button style={{ background: '#1877f2', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Sign up</button></Link>
          </>}
        </div>
      </nav>
      <Routes>
        <Route path="/" element={user ? <FeedPage /> : <Navigate to="/login" />} />
        <Route path="/login" element={user ? <Navigate to="/" /> : <AuthPage mode="login" />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <AuthPage mode="register" />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </BrowserRouter>
  );
}
