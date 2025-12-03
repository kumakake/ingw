// Common JavaScript utilities for Instagram OAuth Service

const API_BASE_URL = '';

// Token management
const TokenManager = {
  get() {
    return localStorage.getItem('auth_token');
  },
  
  set(token) {
    localStorage.setItem('auth_token', token);
  },
  
  remove() {
    localStorage.removeItem('auth_token');
  },
  
  getUser() {
    const userStr = localStorage.getItem('user_info');
    return userStr ? JSON.parse(userStr) : null;
  },
  
  setUser(user) {
    localStorage.setItem('user_info', JSON.stringify(user));
  },
  
  removeUser() {
    localStorage.removeItem('user_info');
  },
  
  isLoggedIn() {
    return !!this.get();
  },
  
  logout() {
    this.remove();
    this.removeUser();
    window.location.href = '/';
  }
};

// API helper
const api = {
  async request(endpoint, options = {}) {
    const token = TokenManager.get();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });
    
    const data = await response.json();
    
    // Handle token expiration
    if (response.status === 401 && data.tokenExpired) {
      TokenManager.logout();
      return;
    }
    
    return { response, data };
  },
  
  async get(endpoint) {
    return this.request(endpoint);
  },
  
  async post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },
  
  async put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }
};

// Header component
const Header = {
  render() {
    const user = TokenManager.getUser();
    const isLoggedIn = TokenManager.isLoggedIn();
    
    return `
      <header class="site-header">
        <div class="header-container">
          <a href="/" class="logo">
            <span class="logo-icon">📸</span>
            Instagram OAuth Service
          </a>
          <nav class="header-nav">
            ${isLoggedIn ? `
              <div class="user-menu">
                <button class="user-menu-button" onclick="Header.toggleMenu()">
                  <span class="user-icon">👤</span>
                  <span class="user-name">${user?.loginAccount || 'ユーザー'}</span>
                  <span class="dropdown-arrow">▼</span>
                </button>
                <div class="user-dropdown" id="userDropdown">
                  <a href="/user/dashboard" class="dropdown-item">
                    <span>📊</span> サービス管理
                  </a>
                  <button class="dropdown-item" onclick="Header.openProfileModal()">
                    <span>⚙️</span> プロファイル編集
                  </button>
                  <hr class="dropdown-divider">
                  <button class="dropdown-item logout" onclick="TokenManager.logout()">
                    <span>🚪</span> ログアウト
                  </button>
                </div>
              </div>
            ` : `
              <a href="/user/login" class="btn btn-primary btn-sm">利用者ログイン</a>
            `}
          </nav>
        </div>
      </header>
    `;
  },
  
  toggleMenu() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('show');
  },
  
  openProfileModal() {
    this.toggleMenu();
    ProfileModal.open();
  },
  
  init() {
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.user-menu')) {
        const dropdown = document.getElementById('userDropdown');
        if (dropdown) dropdown.classList.remove('show');
      }
    });
  }
};

// Profile Modal
const ProfileModal = {
  async open() {
    // Fetch current profile
    const { data } = await api.get('/api/user/profile');
    if (!data.success) {
      alert('プロファイル取得に失敗しました');
      return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'profileModal';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2>プロファイル編集</h2>
          <button class="modal-close" onclick="ProfileModal.close()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="tabs">
            <button class="tab active" onclick="ProfileModal.switchTab('email')">メールアドレス</button>
            <button class="tab" onclick="ProfileModal.switchTab('password')">パスワード</button>
          </div>
          
          <div id="emailTab" class="tab-content active">
            <form id="emailForm" onsubmit="ProfileModal.updateEmail(event)">
              <div class="form-group">
                <label>現在のメールアドレス</label>
                <input type="email" value="${data.user.email}" disabled class="form-input">
              </div>
              <div class="form-group">
                <label>新しいメールアドレス</label>
                <input type="email" id="newEmail" required class="form-input" placeholder="新しいメールアドレスを入力">
              </div>
              <div class="form-group">
                <label>パスワード（確認用）</label>
                <input type="password" id="emailConfirmPassword" required class="form-input" placeholder="現在のパスワードを入力">
              </div>
              <button type="submit" class="btn btn-primary">メールアドレスを変更</button>
            </form>
          </div>
          
          <div id="passwordTab" class="tab-content">
            <form id="passwordForm" onsubmit="ProfileModal.updatePassword(event)">
              <div class="form-group">
                <label>現在のパスワード</label>
                <input type="password" id="currentPassword" required class="form-input" placeholder="現在のパスワードを入力">
              </div>
              <div class="form-group">
                <label>新しいパスワード</label>
                <input type="password" id="newPassword" required class="form-input" placeholder="12文字以上、英大小文字+数字">
                <small class="form-hint">12文字以上、英大文字・小文字・数字を含む</small>
              </div>
              <div class="form-group">
                <label>新しいパスワード（確認）</label>
                <input type="password" id="confirmNewPassword" required class="form-input" placeholder="新しいパスワードを再入力">
              </div>
              <button type="submit" class="btn btn-primary">パスワードを変更</button>
            </form>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
  },
  
  close() {
    const modal = document.getElementById('profileModal');
    if (modal) {
      modal.remove();
      document.body.style.overflow = '';
    }
  },
  
  switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    document.querySelector(`.tab[onclick*="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}Tab`).classList.add('active');
  },
  
  async updateEmail(e) {
    e.preventDefault();
    
    const newEmail = document.getElementById('newEmail').value;
    const password = document.getElementById('emailConfirmPassword').value;
    
    const { data } = await api.put('/api/user/email', { newEmail, password });
    
    if (data.success) {
      alert('メールアドレスを更新しました');
      this.close();
    } else {
      alert(data.error || 'メールアドレスの更新に失敗しました');
    }
  },
  
  async updatePassword(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    
    if (newPassword !== confirmNewPassword) {
      alert('新しいパスワードが一致しません');
      return;
    }
    
    const { data } = await api.put('/api/user/password', { currentPassword, newPassword });
    
    if (data.success) {
      alert('パスワードを更新しました');
      this.close();
    } else {
      alert(data.error || 'パスワードの更新に失敗しました');
    }
  }
};

// Utility functions
function showMessage(message, type = 'info') {
  const container = document.getElementById('messageContainer') || document.body;
  const div = document.createElement('div');
  div.className = `message message-${type}`;
  div.textContent = message;
  container.prepend(div);
  
  setTimeout(() => div.remove(), 5000);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Initialize header on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const headerContainer = document.getElementById('header');
  if (headerContainer) {
    headerContainer.innerHTML = Header.render();
    Header.init();
  }
});
