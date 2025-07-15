// Gmail API Handler
class GmailAPI {
    constructor() {
        this.baseUrl = 'https://gmail.googleapis.com/gmail/v1';
        this.importantSenders = [
            '@shopee.co.th',
            '@lazada.co.th', 
            '@google.com',
            'welovename123@gmail.com'
        ];
    }

    // Check if sender is important
    isImportantSender(from) {
        if (!from) return false;
        return this.importantSenders.some(sender => from.toLowerCase().includes(sender.toLowerCase()));
    }

    // Get user profile
    async getUserProfile(token) {
        try {
            const response = await fetch(`${this.baseUrl}/users/me/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error getting user profile:', error);
        }
        return null;
    }

    // List messages
    async listMessages(token, maxResults = 50) {
        try {
            const params = new URLSearchParams({
                maxResults: maxResults.toString(),
                q: 'in:inbox'
            });

            const response = await fetch(`${this.baseUrl}/users/me/messages?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.messages || [];
            }
        } catch (error) {
            console.error('Error listing messages:', error);
        }
        return [];
    }

    // Get message details
    async getMessage(token, messageId) {
        try {
            const response = await fetch(`${this.baseUrl}/users/me/messages/${messageId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error getting message:', error);
        }
        return null;
    }

    // Parse message headers
    parseHeaders(headers) {
        const result = {};
        headers.forEach(header => {
            result[header.name.toLowerCase()] = header.value;
        });
        return result;
    }

    // Get message snippet and details
    async getMessageDetails(token, messageId) {
        const message = await this.getMessage(token, messageId);
        if (!message) return null;

        const headers = this.parseHeaders(message.payload.headers);
        
        return {
            id: message.id,
            threadId: message.threadId,
            subject: headers.subject || '(ไม่มีหัวเรื่อง)',
            from: headers.from || '(ไม่ทราบผู้ส่ง)',
            date: headers.date || '',
            snippet: message.snippet || '',
            isUnread: message.labelIds && message.labelIds.includes('UNREAD'),
            timestamp: parseInt(message.internalDate)
        };
    }

    // Fetch inbox for account
    async fetchInbox(token, email) {
        try {
            const messages = await this.listMessages(token);
            const inbox = [];

            // Process messages in batches to avoid rate limiting
            const batchSize = 10;
            for (let i = 0; i < messages.length; i += batchSize) {
                const batch = messages.slice(i, i + batchSize);
                const promises = batch.map(msg => this.getMessageDetails(token, msg.id));
                const results = await Promise.all(promises);
                
                results.forEach(result => {
                    if (result && this.isImportantSender(result.from)) {
                        inbox.push({
                            ...result,
                            account: email
                        });
                    }
                });

                // Small delay between batches
                if (i + batchSize < messages.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            return inbox;
        } catch (error) {
            console.error(`Error fetching inbox for ${email}:`, error);
            return [];
        }
    }

    // Send email
    async sendEmail(token, to, subject, body) {
        try {
            // Create email message
            const email = [
                `To: ${to}`,
                `Subject: ${subject}`,
                'Content-Type: text/plain; charset=utf-8',
                '',
                body
            ].join('\n');

            // Encode message
            const encodedMessage = btoa(unescape(encodeURIComponent(email)))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            const response = await fetch(`${this.baseUrl}/users/me/messages/send`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    raw: encodedMessage
                })
            });

            return response.ok;
        } catch (error) {
            console.error('Error sending email:', error);
            return false;
        }
    }

    // Format date for display
    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffTime = now - date;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return date.toLocaleTimeString('th-TH', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } else if (diffDays === 1) {
            return 'เมื่อวาน';
        } else if (diffDays < 7) {
            return `${diffDays} วันที่แล้ว`;
        } else {
            return date.toLocaleDateString('th-TH');
        }
    }

    // Extract sender name from email
    extractSenderName(from) {
        const match = from.match(/^(.+?)\s*<(.+?)>$/);
        if (match) {
            return {
                name: match[1].replace(/"/g, '').trim(),
                email: match[2].trim()
            };
        }
        return {
            name: from,
            email: from
        };
    }

    // Get sender icon
    getSenderIcon(from) {
        const sender = this.extractSenderName(from);
        const email = sender.email.toLowerCase();
        
        if (email.includes('shopee')) return '🛒';
        if (email.includes('lazada')) return '🛍️';
        if (email.includes('google')) return '🔍';
        if (email.includes('welovename123')) return '💌';
        
        return sender.name.charAt(0).toUpperCase() || '📧';
    }
}

// Global Gmail API instance
const gmailAPI = new GmailAPI();