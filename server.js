const express = require('express');
const multer = require('multer');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'friil-secret-key-2026';

// Создаем папки для загрузок
const uploadsDir = path.join(__dirname, 'uploads');
const videosDir = path.join(uploadsDir, 'videos');
const avatarsDir = path.join(uploadsDir, 'avatars');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir);
if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir);

// Настройка multer для загрузки видео
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'video') {
      cb(null, videosDir);
    } else if (file.fieldname === 'avatar') {
      cb(null, avatarsDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB максимум
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// База данных в памяти
let users = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@friil.ru',
    password: bcrypt.hashSync('admin123', 10),
    avatar: null,
    bio: 'Администратор Фриил',
    createdAt: new Date().toISOString()
  }
];

let videos = [
  {
    id: '1',
    userId: '1',
    username: 'admin',
    userAvatar: null,
    videoUrl: null,
    description: 'Добро пожаловать в Фриил! Загрузи своё первое видео 🎥',
    likes: ['admin'],
    comments: [],
    createdAt: new Date().toISOString()
  }
];

// Middleware для проверки токена
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Недействительный токен' });
    }
    req.user = user;
    next();
  });
};

// ==================== АВТОРИЗАЦИЯ ====================

// Регистрация
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Проверка на существующего пользователя
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    if (users.find(u => u.username === username)) {
      return res.status(400).json({ error: 'Имя пользователя уже занято' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: uuidv4(),
      username,
      email,
      password: hashedPassword,
      avatar: null,
      bio: '',
      createdAt: new Date().toISOString()
    };

    users.push(newUser);

    const token = jwt.sign(
      { id: newUser.id, username: newUser.username },
      SECRET_KEY,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        avatar: newUser.avatar,
        bio: newUser.bio
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Вход
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(400).json({ error: 'Пользователь не найден' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Неверный пароль' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      SECRET_KEY,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ==================== ВИДЕО ====================

// Загрузка видео
app.post('/api/upload-video', authenticateToken, upload.single('video'), (req, res) => {
  try {
    const { description } = req.body;
    const videoFile = req.file;

    if (!videoFile) {
      return res.status(400).json({ error: 'Файл видео обязателен' });
    }

    const videoUrl = `/uploads/videos/${videoFile.filename}`;
    const newVideo = {
      id: uuidv4(),
      userId: req.user.id,
      username: req.user.username,
      userAvatar: users.find(u => u.id === req.user.id)?.avatar || null,
      videoUrl,
      description: description || '',
      likes: [],
      comments: [],
      createdAt: new Date().toISOString()
    };

    videos.unshift(newVideo); // Добавляем в начало массива

    res.json(newVideo);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка загрузки видео' });
  }
});

// Получить все видео
app.get('/api/videos', (req, res) => {
  res.json(videos);
});

// Получить видео по ID
app.get('/api/videos/:id', (req, res) => {
  const video = videos.find(v => v.id === req.params.id);
  if (!video) {
    return res.status(404).json({ error: 'Видео не найдено' });
  }
  res.json(video);
});

// Лайк видео
app.post('/api/videos/:id/like', authenticateToken, (req, res) => {
  const video = videos.find(v => v.id === req.params.id);
  if (!video) {
    return res.status(404).json({ error: 'Видео не найдено' });
  }

  const likeIndex = video.likes.indexOf(req.user.id);
  if (likeIndex === -1) {
    video.likes.push(req.user.id);
  } else {
    video.likes.splice(likeIndex, 1);
  }

  res.json({ likes: video.likes.length, liked: likeIndex === -1 });
});

// Добавить комментарий
app.post('/api/videos/:id/comment', authenticateToken, (req, res) => {
  const { text } = req.body;
  const video = videos.find(v => v.id === req.params.id);

  if (!video) {
    return res.status(404).json({ error: 'Видео не найдено' });
  }

  const comment = {
    id: uuidv4(),
    userId: req.user.id,
    username: req.user.username,
    userAvatar: users.find(u => u.id === req.user.id)?.avatar || null,
    text,
    createdAt: new Date().toISOString()
  };

  video.comments.push(comment);
  res.json(comment);
});

// ==================== ПОЛЬЗОВАТЕЛИ ====================

// Обновить профиль
app.put('/api/profile', authenticateToken, upload.single('avatar'), (req, res) => {
  try {
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const { bio } = req.body;
    if (bio !== undefined) user.bio = bio;

    if (req.file) {
      user.avatar = `/uploads/avatars/${req.file.filename}`;
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка обновления профиля' });
  }
});

// Получить профиль пользователя
app.get('/api/user/:userId', (req, res) => {
  const user = users.find(u => u.id === req.params.userId);
  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  const userVideos = videos.filter(v => v.userId === user.id);

  res.json({
    id: user.id,
    username: user.username,
    avatar: user.avatar,
    bio: user.bio,
    createdAt: user.createdAt,
    videos: userVideos,
    stats: {
      videos: userVideos.length,
      likes: userVideos.reduce((sum, v) => sum + v.likes.length, 0)
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Фриил запущен на http://localhost:${PORT}`);
});
