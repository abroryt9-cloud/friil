// Состояние приложения
const state = {
    token: localStorage.getItem('token'),
    user: JSON.parse(localStorage.getItem('user')),
    videos: [],
    currentVideoIndex: 0,
    currentVideoId: null
};

// DOM элементы
const loadingScreen = document.getElementById('loading-screen');
const authScreen = document.getElementById('auth-screen');
const mainApp = document.getElementById('main-app');
const videoFeed = document.getElementById('video-feed');
const authError = document.getElementById('auth-error');

// API базовый URL
const API_URL = 'http://localhost:3000/api';

// ==================== АВТОРИЗАЦИЯ ====================

// Переключение между вкладками
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const tab = btn.dataset.tab;
        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
        document.getElementById(`${tab}-form`).classList.add('active');
    });
});

// Регистрация
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        // Сохраняем токен и пользователя
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        state.token = data.token;
        state.user = data.user;

        // Показываем основное приложение
        authScreen.classList.add('hidden');
        mainApp.classList.remove('hidden');
        loadVideos();

    } catch (error) {
        authError.textContent = error.message;
        authError.classList.remove('hidden');
        setTimeout(() => authError.classList.add('hidden'), 3000);
    }
});

// Вход
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        // Сохраняем токен и пользователя
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        state.token = data.token;
        state.user = data.user;

        // Показываем основное приложение
        authScreen.classList.add('hidden');
        mainApp.classList.remove('hidden');
        loadVideos();

    } catch (error) {
        authError.textContent = error.message;
        authError.classList.remove('hidden');
        setTimeout(() => authError.classList.add('hidden'), 3000);
    }
});

// Проверяем авторизацию при загрузке
if (state.token && state.user) {
    authScreen.classList.add('hidden');
    mainApp.classList.remove('hidden');
    loadVideos();
} else {
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
        authScreen.classList.remove('hidden');
    }, 1500);
}

// ==================== ВИДЕО ЛЕНТА ====================

// Загрузка видео
async function loadVideos() {
    try {
        const response = await fetch(`${API_URL}/videos`);
        state.videos = await response.json();
        renderVideos();
    } catch (error) {
        console.error('Ошибка загрузки видео:', error);
    }
}

// Отрисовка видео
function renderVideos() {
    if (state.videos.length === 0) {
        videoFeed.innerHTML = `
            <div style="height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #888; text-align: center; padding: 20px;">
                <i class="fas fa-video" style="font-size: 64px; margin-bottom: 20px;"></i>
                <h3>Здесь пока нет видео</h3>
                <p>Загрузите первое видео!</p>
            </div>
        `;
        return;
    }

    videoFeed.innerHTML = state.videos.map((video, index) => `
        <div class="video-container" data-video-id="${video.id}" data-index="${index}">
            <video class="video-player" loop playsinline preload="metadata" poster="">
                <source src="${video.videoUrl || 'https://assets.mixkit.co/videos/preview/mixkit-tree-with-yellow-flowers-1173-large.mp4'}" type="video/mp4">
            </video>
            <div class="video-info">
                <div class="video-user">
                    <img src="${video.userAvatar || 'https://via.placeholder.com/40'}" class="user-avatar" onerror="this.src='https://via.placeholder.com/40'">
                    <span class="user-name">@${video.username || 'user'}</span>
                </div>
                <div class="video-description">${video.description || ''}</div>
            </div>
            <div class="video-actions">
                <button class="action-btn like-btn ${video.likes?.includes(state.user?.id) ? 'liked' : ''}" onclick="handleLike('${video.id}')">
                    <i class="fas fa-heart"></i>
                    <span>${video.likes?.length || 0}</span>
                </button>
                <button class="action-btn" onclick="openComments('${video.id}')">
                    <i class="fas fa-comment"></i>
                    <span>${video.comments?.length || 0}</span>
                </button>
                <button class="action-btn" onclick="shareVideo('${video.id}')">
                    <i class="fas fa-share"></i>
                </button>
            </div>
        </div>
    `).join('');

    // Добавляем обработчики для видео
    document.querySelectorAll('.video-container').forEach((container, index) => {
        const video = container.querySelector('video');
        
        // Автовоспроизведение при прокрутке
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Останавливаем все другие видео
                    document.querySelectorAll('video').forEach(v => {
                        if (v !== video) v.pause();
                    });
                    video.play().catch(() => {});
                    state.currentVideoIndex = index;
                    state.currentVideoId = container.dataset.videoId;
                } else {
                    video.pause();
                }
            });
        }, { threshold: 0.7 });

        observer.observe(container);

        // Клик для паузы/воспроизведения
        container.addEventListener('click', (e) => {
            if (!e.target.closest('.video-actions')) {
                if (video.paused) {
                    video.play();
                } else {
                    video.pause();
                }
            }
        });
    });
}

// ==================== ЛАЙКИ ====================

async function handleLike(videoId) {
    if (!state.token) {
        alert('Войдите, чтобы ставить лайки');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/videos/${videoId}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${state.token}`
            }
        });

        const data = await response.json();
        
        // Обновляем UI
        const video = state.videos.find(v => v.id === videoId);
        if (video) {
            video.likes = video.likes || [];
            if (data.liked) {
                video.likes.push(state.user.id);
            } else {
                video.likes = video.likes.filter(id => id !== state.user.id);
            }
        }
        
        // Обновляем кнопку
        const likeBtn = document.querySelector(`[onclick="handleLike('${videoId}')"]`);
        if (likeBtn) {
            likeBtn.classList.toggle('liked', data.liked);
            likeBtn.querySelector('span').textContent = data.likes;
        }

    } catch (error) {
        console.error('Ошибка лайка:', error);
    }
}

// ==================== КОММЕНТАРИИ ====================

let currentCommentVideoId = null;

async function openComments(videoId) {
    currentCommentVideoId = videoId;
    const modal = document.getElementById('comments-modal');
    const commentsList = document.getElementById('comments-list');
    
    const video = state.videos.find(v => v.id === videoId);
    if (!video) return;

    commentsList.innerHTML = video.comments?.map(comment => `
        <div class="comment-item">
            <img src="${comment.userAvatar || 'https://via.placeholder.com/30'}" class="user-avatar small" onerror="this.src='https://via.placeholder.com/30'">
            <div style="flex: 1">
                <div>
                    <span class="comment-user">@${comment.username}</span>
                    <span class="comment-text">${comment.text}</span>
                </div>
                <div class="comment-time">${new Date(comment.createdAt).toLocaleString()}</div>
            </div>
        </div>
    `).join('') || '<p style="text-align: center; color: #888; padding: 20px;">Пока нет комментариев</p>';

    modal.classList.remove('hidden');
}

// Отправка комментария
document.getElementById('send-comment').addEventListener('click', async () => {
    const input = document.getElementById('comment-text');
    const text = input.value.trim();

    if (!text || !currentCommentVideoId || !state.token) return;

    try {
        const response = await fetch(`${API_URL}/videos/${currentCommentVideoId}/comment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({ text })
        });

        const comment = await response.json();
        
        // Добавляем комментарий в список
        const video = state.videos.find(v => v.id === currentCommentVideoId);
        if (video) {
            video.comments = video.comments || [];
            video.comments.push(comment);
        }

        // Обновляем UI
        const commentsList = document.getElementById('comments-list');
        const commentElement = document.createElement('div');
        commentElement.className = 'comment-item';
        commentElement.innerHTML = `
            <img src="${comment.userAvatar || 'https://via.placeholder.com/30'}" class="user-avatar small">
            <div style="flex: 1">
                <div>
                    <span class="comment-user">@${comment.username}</span>
                    <span class="comment-text">${comment.text}</span>
                </div>
                <div class="comment-time">только что</div>
            </div>
        `;
        commentsList.insertBefore(commentElement, commentsList.firstChild);
        
        input.value = '';

        // Обновляем счетчик комментариев
        const commentBtn = document.querySelector(`[onclick="openComments('${currentCommentVideoId}')"] span`);
        if (commentBtn) {
            commentBtn.textContent = video.comments.length;
        }

    } catch (error) {
        console.error('Ошибка отправки комментария:', error);
    }
});

// ==================== ЗАГРУЗКА ВИДЕО ====================

const uploadModal = document.getElementById('upload-modal');
const uploadForm = document.getElementById('upload-form');
const videoFile = document.getElementById('video-file');
const dropArea = document.getElementById('drop-area');
const uploadBtn = uploadForm.querySelector('button[type="submit"]');

// Открытие модалки загрузки
document.querySelector('[data-view="upload"]').addEventListener('click', () => {
    if (!state.token) {
        alert('Войдите, чтобы загружать видео');
        return;
    }
    uploadModal.classList.remove('hidden');
});

// Закрытие модалок
document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
        uploadModal.classList.add('hidden');
        document.getElementById('comments-modal').classList.add('hidden');
    });
});

// Drag and drop
dropArea.addEventListener('click', () => videoFile.click());

dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.style.borderColor = '#ff0050';
});

dropArea.addEventListener('dragleave', () => {
    dropArea.style.borderColor = '#444';
});

dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.style.borderColor = '#444';
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
        handleVideoFile(file);
    }
});

videoFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleVideoFile(file);
    }
});

function handleVideoFile(file) {
    if (file.size > 50 * 1024 * 1024) {
        alert('Файл слишком большой. Максимум 50MB');
        return;
    }
    
    dropArea.innerHTML = `
        <i class="fas fa-check-circle" style="color: #00ff00"></i>
        <p>Файл выбран: ${file.name}</p>
        <p class="file-info">${(file.size / 1024 / 1024).toFixed(2)} MB</p>
    `;
    uploadBtn.disabled = false;
}

// Отправка видео
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const file = videoFile.files[0];
    if (!file) {
        alert('Выберите видео');
        return;
    }

    const formData = new FormData();
    formData.append('video', file);
    formData.append('description', document.getElementById('video-description').value);

    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Загрузка...';

    try {
        const response = await fetch(`${API_URL}/upload-video`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${state.token}`
            },
            body: formData
        });

        const video = await response.json();

        if (!response.ok) {
            throw new Error(video.error);
        }

        // Добавляем видео в начало списка
        state.videos.unshift(video);
        
        // Закрываем модалку и сбрасываем форму
        uploadModal.classList.add('hidden');
        uploadForm.reset();
        dropArea.innerHTML = `
            <i class="fas fa-cloud-upload-alt"></i>
            <p>Нажмите для выбора видео или перетащите файл</p>
            <p class="file-info">Максимум 50MB</p>
        `;
        
        // Перезагружаем ленту
        renderVideos();

    } catch (error) {
        alert('Ошибка загрузки: ' + error.message);
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Загрузить';
    }
});

// ==================== ПРОФИЛЬ ====================

async function loadProfile(userId) {
    if (!state.token) return;

    try {
        const response = await fetch(`${API_URL}/user/${userId || state.user.id}`, {
            headers: {
                'Authorization': `Bearer ${state.token}`
            }
        });

        const profile = await response.json();

        videoFeed.innerHTML = `
            <div style="min-height: 100vh; background: #000;">
                <div class="profile-header">
                    <div class="profile-info">
                        <img src="${profile.avatar || 'https://via.placeholder.com/80'}" class="profile-avatar" onerror="this.src='https://via.placeholder.com/80'">
                        <div style="flex: 1">
                            <h2>@${profile.username}</h2>
                            <div class="profile-stats">
                                <div class="stat-item">
                                    <span class="stat-value">${profile.stats?.videos || 0}</span>
                                    <span class="stat-label">видео</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-value">${profile.stats?.likes || 0}</span>
                                    <span class="stat-label">лайков</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="profile-bio">${profile.bio || 'Привет! Я в Фрииле 🎥'}</div>
                    ${profile.id === state.user.id ? '<button class="edit-profile-btn" onclick="editProfile()">Редактировать профиль</button>' : ''}
                </div>
                <div class="profile-videos">
                    ${profile.videos?.map(video => `
                        <div class="profile-video-item" onclick="playVideo('${video.id}')">
                            <video src="${video.videoUrl}" preload="metadata"></video>
                            <div class="video-stats">
                                <i class="fas fa-heart"></i> ${video.likes?.length || 0}
                            </div>
                        </div>
                    `).join('') || '<p style="text-align: center; padding: 20px;">Нет видео</p>'}
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
    }
}

// Редактирование профиля
function editProfile() {
    const newBio = prompt('Введите новую информацию о себе:', state.user.bio || '');
    if (newBio !== null) {
        // Здесь будет API запрос на обновление
        state.user.bio = newBio;
        localStorage.setItem('user', JSON.stringify(state.user));
        loadProfile(state.user.id);
    }
}

// Переключение между вкладками
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const view = btn.dataset.view;
        if (view === 'feed') {
            renderVideos();
        } else if (view === 'profile') {
            loadProfile(state.user?.id);
        }
    });
});

// ==================== УТИЛИТЫ ====================

function shareVideo(videoId) {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert('Ссылка скопирована!');
}

function playVideo(videoId) {
    // Находим видео в ленте и скроллим к нему
    const videoContainer = document.querySelector(`[data-video-id="${videoId}"]`);
    if (videoContainer) {
        videoContainer.scrollIntoView({ behavior: 'smooth' });
        document.querySelector('[data-view="feed"]').click();
    }
}

// Выход
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    state.token = null;
    state.user = null;
    mainApp.classList.add('hidden');
    authScreen.classList.remove('hidden');
}

// Добавляем кнопку выхода в профиль
window.logout = logout;
window.handleLike = handleLike;
window.openComments = openComments;
window.shareVideo = shareVideo;
window.playVideo = playVideo;
