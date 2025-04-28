const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const requestIp = require('request-ip');
const User = require('./models/user');
const Forum = require('./models/forum');
const Post = require('./models/post');
const Comment = require('./models/comment');

const app = express();

// MongoDB Bağlantısı
mongoose.connect('mongodb://localhost:27017/worsebox')
  .then(() => console.log('MongoDB Bağlandı'))
  .catch(err => {
    console.log('MongoDB Bağlantı Hatası:', err);
    process.exit(1); // Bağlantı hatası durumunda uygulamayı sonlandır
  });

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static('uploads'));
app.use(express.static('public'));
app.use(session({
  secret: 'süpergizlisifre',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/worsebox' })
}));
app.set('view engine', 'ejs');

// Multer (Dosya Yükleme Ayarları)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Kullanıcı Bilgilerini Her Sayfaya Yolla
app.use(async (req, res, next) => {
  res.locals.currentUser = null;
  res.locals.isAdmin = false;
  if (req.session.userId) {
    const user = await User.findById(req.session.userId);
    res.locals.currentUser = user;
    if (user && user.isAdmin) res.locals.isAdmin = true;
  }
  next();
});

// Admin Hesabını Oluştur
async function createAdmin() {
  const adminExists = await User.findOne({ email: 'adminbabapuroomer31@gmail.com' });

  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('babapiro31', 10);
    const admin = new User({
      username: 'Admin',
      email: 'adminbabapuroomer31@gmail.com',
      password: hashedPassword,
      isAdmin: true,
    });

    await admin.save();
    console.log('Admin kullanıcı başarıyla oluşturuldu!');
  } else {
    console.log('Admin kullanıcı zaten mevcut.');
  }
}

createAdmin();

// Rotalar
app.get('/', async (req, res) => {
  const forums = await Forum.find({});
  res.render('home', { forums });
});

// Kullanıcı Kayıt ve Giriş İşlemleri
app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', upload.single('pfp'), async (req, res) => {
  const { username, email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const pfp = req.file ? '/' + req.file.filename : '/default.png';
  const user = new User({ username, email, password: hash, pfp });
  await user.save();
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.redirect('/login');
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.redirect('/login');
  req.session.userId = user._id;
  res.redirect('/');
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// Forum ve Postlar
app.get('/forum/:id', async (req, res) => {
  const forum = await Forum.findById(req.params.id);
  const posts = await Post.find({ forum: forum._id }).populate('author');
  res.render('forum', { forum, posts });
});

app.post('/forum/:id', upload.single('image'), async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  const forum = await Forum.findById(req.params.id);
  const post = new Post({
    forum: forum._id,
    content: req.body.content,
    author: req.session.userId,
    image: req.file ? '/' + req.file.filename : null
  });
  await post.save();
  res.redirect('/forum/' + forum._id);
});

// Post Silme
app.post('/admin/post/:id/delete', async (req, res) => {
  if (!res.locals.isAdmin) return res.redirect('/');
  await Post.findByIdAndDelete(req.params.id);
  res.redirect('/admin');
});

// Yorum Ekleme
app.post('/post/:id/comment', async (req, res) => {
  const post = await Post.findById(req.params.id);
  const comment = new Comment({
    content: req.body.comment,
    author: req.session.userId,
    post: post._id
  });
  await comment.save();
  res.redirect('/forum/' + post.forum);
});

// Yorum Silme
app.post('/admin/comment/:id/delete', async (req, res) => {
  if (!res.locals.isAdmin) return res.redirect('/');
  await Comment.findByIdAndDelete(req.params.id);
  res.redirect('/admin');
});

// Admin Paneli
app.get('/admin', async (req, res) => {
  if (!res.locals.isAdmin) return res.redirect('/');
  const forums = await Forum.find({});
  res.render('admin', { forums });
});

// Forum Ekleme ve Silme
app.post('/admin/forum', async (req, res) => {
  if (!res.locals.isAdmin) return res.redirect('/');
  const forum = new Forum({ title: req.body.title });
  await forum.save();
  res.redirect('/admin');
});

app.post('/admin/forum/:id/delete', async (req, res) => {
  if (!res.locals.isAdmin) return res.redirect('/');
  await Forum.findByIdAndDelete(req.params.id);
  await Post.deleteMany({ forum: req.params.id });
  res.redirect('/admin');
});

app.listen(3000, () => {
  console.log('Worsebox 3000 portunda çalışıyor');
});