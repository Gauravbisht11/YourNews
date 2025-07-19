// server.js with image upload + full article support
const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const app = express();

// Config
const PORT = 3000;
const ADMIN_USER = 'admin';
const ADMIN_PASS_HASH = bcrypt.hashSync('password123', 10);

// Storage config for Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads'),
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Middleware
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'secretKey',
  resave: false,
  saveUninitialized: true
}));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Load and Save news
function loadNews() {
  try {
    return JSON.parse(fs.readFileSync('news.json'));
  } catch (err) {
    return [];
  }
}

function saveNews(news) {
  fs.writeFileSync('news.json', JSON.stringify(news, null, 2));
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'all-news.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && bcrypt.compareSync(password, ADMIN_PASS_HASH)) {
    req.session.isAdmin = true;
    return res.redirect('/post-news');
  }
  res.render('login', { error: 'Invalid credentials' });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.get('/admin', (req, res) => {
  if (req.session.isAdmin) {
    res.render('post-news');
  } else {
    res.redirect('/login');
  }
});

app.get('/post-news', (req, res) => {
  if (!req.session.isAdmin) return res.redirect('/login');
  res.render('post-news');
});

app.get('/api/news', (req, res) => {
  res.json(loadNews());
});

app.get('/news/:id', (req, res) => {
  const news = loadNews();
  const article = news.find(n => n.id === req.params.id);
  if (!article) return res.status(404).send('News not found');
  res.render('full-news', { article });
});

   
app.post('/post-news', upload.single('image'), (req, res) => {
  if (!req.session.isAdmin) return res.redirect('/login');

  const { title, content } = req.body;
  const imagePath = req.file ? '/uploads/' + req.file.filename : '';

  const news = loadNews();
  const newArticle = {
    id: uuidv4(),
    title,
    content,
    image: imagePath,
    timestamp: new Date().toISOString()
  };

  news.push(newArticle);
  saveNews(news);

  res.redirect('/');
});

 
app.post('/delete-news', (req, res) => {
  if (!req.session.isAdmin) return res.redirect('/login');
  
  // Overwrite the news file with an empty array
  saveNews([]);
  
  res.redirect('/');
});
// Start
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
