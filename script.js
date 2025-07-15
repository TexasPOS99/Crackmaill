// Main Application Script
document.addEventListener('DOMContentLoaded', async function() {
    // Handle OAuth callback on any page
    const callbackResult = await authManager.handleCallback();
    
    // Check current page and handle accordingly
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    switch (currentPage) {
        case 'index.html':
        case '':
            await handleIndexPage(callbackResult);
            break;
        case 'inbox.html':
            // Inbox initialization is handled in inbox.html
            break;
        case 'compose.html':
            // Compose initialization is handled in compose.html
            break;
    }
});

// Handle index page logic
async function handleIndexPage(callbackResult) {
    // If callback was successful and it's main account, redirect to inbox
    if (callbackResult.success && callbackResult.isMain) {
        window.location.href = 'inbox.html';
        return;
    }
    
    // If already authenticated, redirect to inbox
    if (authManager.isAuthenticated()) {
        window.location.href = 'inbox.html';
        return;
    }
    
    // Set up login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', function() {
            authManager.login(true); // Main account login
        });
    }
    
    // Show any error messages
    if (callbackResult.success === false) {
        // Could add error handling here
        console.log('Authentication failed');
    }
}

// Global error handler
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
});

// Utility functions
const utils = {
    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Throttle function
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // Copy to clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                return true;
            } catch (err) {
                return false;
            } finally {
                document.body.removeChild(textArea);
            }
        }
    },
    
    // Generate random ID
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    },
    
    // Validate email
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    // Get time ago string
    getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        const minute = 60 * 1000;
        const hour = minute * 60;
        const day = hour * 24;
        const week = day * 7;
        const month = day * 30;
        const year = day * 365;
        
        if (diff < minute) return 'เมื่อสักครู่';
        if (diff < hour) return `${Math.floor(diff / minute)} นาทีที่แล้ว`;
        if (diff < day) return `${Math.floor(diff / hour)} ชั่วโมงที่แล้ว`;
        if (diff < week) return `${Math.floor(diff / day)} วันที่แล้ว`;
        if (diff < month) return `${Math.floor(diff / week)} สัปดาห์ที่แล้ว`;
        if (diff < year) return `${Math.floor(diff / month)} เดือนที่แล้ว`;
        return `${Math.floor(diff / year)} ปีที่แล้ว`;
    }
};

// Export utils to global scope
window.utils = utils;

// Service Worker registration (for future PWA features)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        // Uncomment when service worker is implemented
        // navigator.serviceWorker.register('/sw.js')
        //     .then(function(registration) {
        //         console.log('SW registered: ', registration);
        //     })
        //     .catch(function(registrationError) {
        //         console.log('SW registration failed: ', registrationError);
        //     });
    });
}

// Performance monitoring
if ('performance' in window) {
    window.addEventListener('load', function() {
        setTimeout(function() {
            const perfData = performance.getEntriesByType('navigation')[0];
            console.log('Page load time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
        }, 0);
    });
}

// Dark mode detection (for future theme switching)
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    // User prefers dark mode
    document.body.classList.add('dark-mode');
}

// Listen for theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (e.matches) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // Ctrl/Cmd + R for refresh (on inbox page)
    if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        if (window.location.pathname.includes('inbox.html')) {
            event.preventDefault();
            uiManager.refreshAllInboxes();
        }
    }
    
    // Escape key to close notifications
    if (event.key === 'Escape') {
        uiManager.closeNotification();
    }
    
    // Ctrl/Cmd + N for new message (on inbox page)
    if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        if (window.location.pathname.includes('inbox.html')) {
            event.preventDefault();
            window.location.href = 'compose.html';
        }
    }
});

// Online/offline detection
window.addEventListener('online', function() {
    uiManager.showNotification('เชื่อมต่ออินเทอร์เน็ตแล้ว', 'success');
});

window.addEventListener('offline', function() {
    uiManager.showNotification('ไม่มีการเชื่อมต่ออินเทอร์เน็ต', 'warning');
});

// Visibility change detection (for pausing/resuming auto-refresh)
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // Page is hidden, pause auto-refresh
        uiManager.stopAutoRefresh();
    } else {
        // Page is visible, resume auto-refresh
        if (window.location.pathname.includes('inbox.html')) {
            uiManager.startAutoRefresh();
        }
    }
});

console.log('🔓 Crackmaill initialized successfully!');