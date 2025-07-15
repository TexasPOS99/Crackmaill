// UI Management Functions
class UIManager {
    constructor() {
        this.currentFilter = 'all';
        this.allEmails = [];
        this.lastMessageIds = new Set();
        this.refreshInterval = null;
    }

    // Show notification
    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notificationText');
        
        if (notification && notificationText) {
            notificationText.textContent = message;
            notification.className = `notification ${type}`;
            notification.style.display = 'block';
            
            // Auto hide after 5 seconds
            setTimeout(() => {
                notification.style.display = 'none';
            }, 5000);
        }
    }

    // Close notification
    closeNotification() {
        const notification = document.getElementById('notification');
        if (notification) {
            notification.style.display = 'none';
        }
    }

    // Update stats
    updateStats(totalEmails, newEmails) {
        const totalElement = document.getElementById('totalEmails');
        const newElement = document.getElementById('newEmails');
        const lastUpdateElement = document.getElementById('lastUpdate');
        
        if (totalElement) totalElement.textContent = totalEmails;
        if (newElement) newElement.textContent = newEmails;
        if (lastUpdateElement) {
            lastUpdateElement.textContent = new Date().toLocaleTimeString('th-TH');
        }
    }

    // Update account count
    updateAccountCount(count) {
        const accountCountElement = document.getElementById('accountCount');
        if (accountCountElement) {
            accountCountElement.textContent = `${count} บัญชี`;
        }
    }

    // Render email card
    renderEmailCard(email) {
        const isNew = !this.lastMessageIds.has(email.id);
        const sender = gmailAPI.extractSenderName(email.from);
        const icon = gmailAPI.getSenderIcon(email.from);
        const formattedDate = gmailAPI.formatDate(email.timestamp);

        return `
            <div class="email-card ${isNew ? 'new-email' : ''}" data-from="${email.from}" data-id="${email.id}">
                ${isNew ? '<span class="new-badge">ใหม่</span>' : ''}
                <div class="email-header">
                    <div class="email-subject">${this.escapeHtml(email.subject)}</div>
                    <div class="email-date">${formattedDate}</div>
                </div>
                <div class="email-from">
                    <span class="sender-icon">${icon}</span>
                    <span>${this.escapeHtml(sender.name)} &lt;${this.escapeHtml(sender.email)}&gt;</span>
                </div>
                <div class="email-snippet">${this.escapeHtml(email.snippet)}</div>
                <div class="email-account">📧 ${this.escapeHtml(email.account)}</div>
            </div>
        `;
    }

    // Escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Filter emails
    filterEmails(emails, filter) {
        if (filter === 'all') return emails;
        return emails.filter(email => email.from.toLowerCase().includes(filter.toLowerCase()));
    }

    // Render emails
    renderEmails(emails) {
        const container = document.getElementById('emailContainer');
        const noEmailsElement = document.getElementById('noEmails');
        
        if (!container) return;

        const filteredEmails = this.filterEmails(emails, this.currentFilter);
        
        if (filteredEmails.length === 0) {
            container.innerHTML = '';
            if (noEmailsElement) noEmailsElement.style.display = 'block';
        } else {
            if (noEmailsElement) noEmailsElement.style.display = 'none';
            
            // Sort by timestamp (newest first)
            filteredEmails.sort((a, b) => b.timestamp - a.timestamp);
            
            container.innerHTML = filteredEmails.map(email => this.renderEmailCard(email)).join('');
        }

        // Count new emails
        const newEmails = filteredEmails.filter(email => !this.lastMessageIds.has(email.id));
        this.updateStats(filteredEmails.length, newEmails.length);

        // Update last message IDs
        emails.forEach(email => this.lastMessageIds.add(email.id));

        // Show notification for new emails
        if (newEmails.length > 0) {
            this.showNotification(`พบเมลใหม่ ${newEmails.length} ฉบับ!`, 'success');
        }
    }

    // Set up filter handlers
    setupFilterHandlers() {
        const filterTags = document.querySelectorAll('.filter-tag');
        filterTags.forEach(tag => {
            tag.addEventListener('click', () => {
                // Update active state
                filterTags.forEach(t => t.classList.remove('active'));
                tag.classList.add('active');
                
                // Update filter
                this.currentFilter = tag.dataset.filter;
                this.renderEmails(this.allEmails);
            });
        });
    }

    // Show loading
    showLoading(show = true) {
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = show ? 'block' : 'none';
        }
    }

    // Show loading overlay
    showLoadingOverlay(show = true) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }

    // Load recipient list for compose
    loadRecipientList() {
        const recipientList = document.getElementById('recipientList');
        if (!recipientList) return;

        const accounts = authManager.getAccounts();
        
        if (accounts.length === 0) {
            recipientList.innerHTML = '<p>ไม่พบบัญชี Gmail ที่เชื่อมต่อ</p>';
            return;
        }

        recipientList.innerHTML = accounts.map(account => `
            <div class="recipient-item">
                <input type="checkbox" id="recipient_${account.email}" value="${account.email}">
                <label for="recipient_${account.email}">${account.email}</label>
            </div>
        `).join('');
    }

    // Check send limit
    checkSendLimit() {
        const lastSent = localStorage.getItem('crackmaill_last_sent');
        const lastSentInfo = document.getElementById('lastSentInfo');
        
        if (lastSent) {
            const lastSentDate = new Date(parseInt(lastSent));
            const today = new Date();
            const isToday = lastSentDate.toDateString() === today.toDateString();
            
            if (lastSentInfo) {
                if (isToday) {
                    lastSentInfo.textContent = `ส่งครั้งล่าสุด: ${lastSentDate.toLocaleTimeString('th-TH')} (วันนี้)`;
                    return false; // Cannot send
                } else {
                    lastSentInfo.textContent = `ส่งครั้งล่าสุด: ${lastSentDate.toLocaleDateString('th-TH')}`;
                }
            }
        }
        
        return true; // Can send
    }

    // Start auto refresh
    startAutoRefresh() {
        // Refresh every hour
        this.refreshInterval = setInterval(() => {
            this.refreshAllInboxes();
        }, 60 * 60 * 1000);
    }

    // Stop auto refresh
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    // Refresh all inboxes
    async refreshAllInboxes() {
        const accounts = authManager.getAccounts();
        if (accounts.length === 0) return;

        this.showLoading(true);
        
        try {
            const allEmails = [];
            
            for (const account of accounts) {
                const emails = await gmailAPI.fetchInbox(account.access_token, account.email);
                allEmails.push(...emails);
            }
            
            this.allEmails = allEmails;
            this.renderEmails(allEmails);
            this.updateAccountCount(accounts.length);
            
        } catch (error) {
            console.error('Error refreshing inboxes:', error);
            this.showNotification('เกิดข้อผิดพลาดในการรีเฟรชข้อมูล', 'error');
        } finally {
            this.showLoading(false);
        }
    }
}

// Global UI manager instance
const uiManager = new UIManager();

// Initialize inbox page
async function initializeInbox() {
    // Check authentication
    if (!authManager.isAuthenticated()) {
        window.location.href = 'index.html';
        return;
    }

    // Handle OAuth callback if present
    const callbackResult = await authManager.handleCallback();
    if (callbackResult.success && !callbackResult.isMain) {
        uiManager.showNotification(`เพิ่มบัญชี ${callbackResult.email} สำเร็จ!`, 'success');
    }

    // Set up event handlers
    setupInboxEventHandlers();
    
    // Set up filters
    uiManager.setupFilterHandlers();
    
    // Load initial data
    await uiManager.refreshAllInboxes();
    
    // Start auto refresh
    uiManager.startAutoRefresh();
    
    // Set up notification close handler
    const closeNotificationBtn = document.getElementById('closeNotification');
    if (closeNotificationBtn) {
        closeNotificationBtn.addEventListener('click', () => {
            uiManager.closeNotification();
        });
    }
}

// Set up inbox event handlers
function setupInboxEventHandlers() {
    // Add account button
    const addAccountBtn = document.getElementById('addAccountBtn');
    if (addAccountBtn) {
        addAccountBtn.addEventListener('click', () => {
            authManager.login(false);
        });
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            uiManager.refreshAllInboxes();
        });
    }

    // Compose button
    const composeBtn = document.getElementById('composeBtn');
    if (composeBtn) {
        composeBtn.addEventListener('click', () => {
            window.location.href = 'compose.html';
        });
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('คุณต้องการออกจากระบบหรือไม่?')) {
                authManager.clearAllTokens();
                uiManager.stopAutoRefresh();
                window.location.href = 'index.html';
            }
        });
    }
}

// Initialize compose page
function initializeCompose() {
    // Check authentication
    if (!authManager.isAuthenticated()) {
        window.location.href = 'index.html';
        return;
    }

    // Load recipient list
    uiManager.loadRecipientList();
    
    // Check send limit
    const canSend = uiManager.checkSendLimit();
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn && !canSend) {
        sendBtn.disabled = true;
        sendBtn.textContent = '🚫 ส่งได้เพียง 1 ครั้งต่อวัน';
    }

    // Set up event handlers
    setupComposeEventHandlers();
}

// Set up compose event handlers
function setupComposeEventHandlers() {
    // Back button
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'inbox.html';
        });
    }

    // Cancel button
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            if (confirm('คุณต้องการยกเลิกการเขียนข้อความหรือไม่?')) {
                window.location.href = 'inbox.html';
            }
        });
    }

    // Compose form
    const composeForm = document.getElementById('composeForm');
    if (composeForm) {
        composeForm.addEventListener('submit', handleComposeSubmit);
    }
}

// Handle compose form submission
async function handleComposeSubmit(event) {
    event.preventDefault();
    
    const subject = document.getElementById('subject').value;
    const body = document.getElementById('body').value;
    const selectedRecipients = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
        .map(cb => cb.value);

    if (selectedRecipients.length === 0) {
        uiManager.showNotification('กรุณาเลือกผู้รับอย่างน้อย 1 คน', 'error');
        return;
    }

    if (!uiManager.checkSendLimit()) {
        uiManager.showNotification('คุณสามารถส่งข้อความได้เพียง 1 ครั้งต่อวัน', 'error');
        return;
    }

    uiManager.showLoadingOverlay(true);

    try {
        const mainAccount = authManager.getMainAccount();
        if (!mainAccount) {
            throw new Error('ไม่พบบัญชีหลัก');
        }

        let successCount = 0;
        for (const recipient of selectedRecipients) {
            const success = await gmailAPI.sendEmail(
                mainAccount.access_token,
                recipient,
                subject,
                body
            );
            if (success) successCount++;
        }

        if (successCount > 0) {
            // Save send timestamp
            localStorage.setItem('crackmaill_last_sent', Date.now().toString());
            
            uiManager.showNotification(
                `ส่งข้อความสำเร็จ ${successCount}/${selectedRecipients.length} ฉบับ`,
                'success'
            );
            
            setTimeout(() => {
                window.location.href = 'inbox.html';
            }, 2000);
        } else {
            throw new Error('ไม่สามารถส่งข้อความได้');
        }

    } catch (error) {
        console.error('Error sending email:', error);
        uiManager.showNotification('เกิดข้อผิดพลาดในการส่งข้อความ', 'error');
    } finally {
        uiManager.showLoadingOverlay(false);
    }
}