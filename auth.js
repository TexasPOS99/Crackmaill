// OAuth 2.0 Authentication Handler
class AuthManager {
    constructor() {
        this.clientId = '1081164679307-tv2pllpf3sdb0b4tqit4jf46bcm89su6.apps.googleusercontent.com';
        this.redirectUri = window.location.origin + window.location.pathname;
        this.scope = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send';
        this.mainAccountKey = 'crackmaill_main_account';
        this.accountsKey = 'crackmaill_accounts';
    }

    // Generate OAuth URL
    getAuthUrl(isMainAccount = false) {
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            response_type: 'token',
            scope: this.scope,
            access_type: 'online',
            state: isMainAccount ? 'main' : 'additional'
        });

        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }

    // Extract token from URL hash
    extractTokenFromUrl() {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        
        const accessToken = params.get('access_token');
        const expiresIn = params.get('expires_in');
        const state = params.get('state');
        
        if (accessToken) {
            const expiresAt = Date.now() + (parseInt(expiresIn) * 1000);
            return {
                access_token: accessToken,
                expires_at: expiresAt,
                state: state
            };
        }
        
        return null;
    }

    // Get user info from Google API
    async getUserInfo(token) {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error getting user info:', error);
        }
        return null;
    }

    // Save token to localStorage
    saveToken(email, token, expiresAt, isMain = false) {
        const tokenData = {
            email: email,
            access_token: token,
            expires_at: expiresAt,
            created_at: Date.now()
        };

        if (isMain) {
            localStorage.setItem(this.mainAccountKey, JSON.stringify(tokenData));
        }

        // Add to accounts list
        const accounts = this.getAccounts();
        const existingIndex = accounts.findIndex(acc => acc.email === email);
        
        if (existingIndex >= 0) {
            accounts[existingIndex] = tokenData;
        } else {
            accounts.push(tokenData);
        }
        
        localStorage.setItem(this.accountsKey, JSON.stringify(accounts));
    }

    // Get main account token
    getMainAccount() {
        const stored = localStorage.getItem(this.mainAccountKey);
        if (stored) {
            const tokenData = JSON.parse(stored);
            if (this.isTokenValid(tokenData)) {
                return tokenData;
            } else {
                localStorage.removeItem(this.mainAccountKey);
            }
        }
        return null;
    }

    // Get all accounts
    getAccounts() {
        const stored = localStorage.getItem(this.accountsKey);
        if (stored) {
            const accounts = JSON.parse(stored);
            return accounts.filter(account => this.isTokenValid(account));
        }
        return [];
    }

    // Check if token is valid
    isTokenValid(tokenData) {
        return tokenData && tokenData.expires_at > Date.now();
    }

    // Remove account
    removeAccount(email) {
        const accounts = this.getAccounts();
        const filtered = accounts.filter(acc => acc.email !== email);
        localStorage.setItem(this.accountsKey, JSON.stringify(filtered));

        // If it's main account, remove it too
        const mainAccount = this.getMainAccount();
        if (mainAccount && mainAccount.email === email) {
            localStorage.removeItem(this.mainAccountKey);
        }
    }

    // Clear all tokens
    clearAllTokens() {
        localStorage.removeItem(this.mainAccountKey);
        localStorage.removeItem(this.accountsKey);
    }

    // Initiate login
    login(isMainAccount = false) {
        window.location.href = this.getAuthUrl(isMainAccount);
    }

    // Handle OAuth callback
    async handleCallback() {
        const tokenInfo = this.extractTokenFromUrl();
        
        if (tokenInfo) {
            const userInfo = await this.getUserInfo(tokenInfo.access_token);
            
            if (userInfo) {
                const isMain = tokenInfo.state === 'main';
                this.saveToken(
                    userInfo.email,
                    tokenInfo.access_token,
                    tokenInfo.expires_at,
                    isMain
                );

                // Clear URL hash
                window.history.replaceState(null, null, window.location.pathname);

                return {
                    success: true,
                    email: userInfo.email,
                    isMain: isMain
                };
            }
        }

        return { success: false };
    }

    // Check authentication status
    isAuthenticated() {
        return this.getMainAccount() !== null;
    }
}

// Global auth manager instance
const authManager = new AuthManager();