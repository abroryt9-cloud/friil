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
                    <span>${video.likes?.length || 0}</
