// ============================================
// UOE SAFE APP - ADMIN PANEL AUTHENTICATION
// ============================================
// Version: 2.0.0 | Date: 2026
// Enhanced with professional error handling and 5-department support
// ============================================

class AuthManager {
    constructor() {
        this.initLogging();
        this.logger.info('🔄 Admin Panel Authentication System Initializing');
        
        // Authentication state
        this.isAuthenticating = false;
        this.retryAttempts = 0;
        this.maxRetries = 3;
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    initLogging() {
        // Professional logging system
        this.logger = {
            info: (msg, data) => console.log(`ℹ️ ${new Date().toISOString()} ${msg}`, data || ''),
            warn: (msg, data) => console.warn(`⚠️ ${new Date().toISOString()} ${msg}`, data || ''),
            error: (msg, data) => console.error(`❌ ${new Date().toISOString()} ${msg}`, data || ''),
            debug: (msg, data) => console.debug(`🐛 ${new Date().toISOString()} ${msg}`, data || '')
        };
    }

    async initialize() {
        try {
            this.logger.info('🚀 Starting application initialization');
            
            // Step 1: Check Firebase configuration
            await this.validateFirebaseConfig();
            
            // Step 2: Initialize Firebase
            await this.initializeFirebase();
            
            // Step 3: Set up DOM elements and event listeners
            this.setupDOM();
            this.setupEventListeners();
            
            // Step 4: Check for existing session
            await this.checkExistingSession();
            
            this.logger.info('✅ Application initialization complete');
            
        } catch (error) {
            this.handleCriticalError('Application initialization failed', error);
        }
    }

    async validateFirebaseConfig() {
        this.logger.info('🔍 Validating Firebase configuration');
        
        if (typeof firebaseConfig === 'undefined') {
            const error = new Error('Firebase configuration not found');
            this.logger.error('Missing firebaseConfig object', {
                expected: './Backend/Firebase/firebaseConfig.js',
                currentTime: new Date().toISOString()
            });
            throw error;
        }
        
        // Validate required Firebase config properties
        const requiredProps = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
        const missingProps = requiredProps.filter(prop => !firebaseConfig[prop]);
        
        if (missingProps.length > 0) {
            const error = new Error(`Incomplete Firebase configuration. Missing: ${missingProps.join(', ')}`);
            this.logger.error('Invalid Firebase configuration', { missingProps });
            throw error;
        }
        
        this.logger.info('✅ Firebase configuration validated');
    }

    async initializeFirebase() {
        this.logger.info('🔥 Initializing Firebase services');
        
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
                this.logger.info('✅ Firebase app initialized');
            } else {
                this.logger.info('✅ Firebase app already initialized');
            }
            
            // Initialize services
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            
            // Configure Firestore settings for better offline/online handling
            this.db.settings({
                cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
            });
            
            this.logger.info('✅ Firebase services initialized');
            
        } catch (error) {
            this.logger.error('Firebase initialization failed', error);
            throw new Error(`Firebase initialization failed: ${error.message}`);
        }
    }

    setupDOM() {
        this.logger.info('🎨 Setting up DOM elements');
        
        try {
            // Core elements
            this.departmentBtns = document.querySelectorAll('.department-btn');
            this.emailInput = document.getElementById('email');
            this.passwordInput = document.getElementById('password');
            this.loginForm = document.getElementById('loginForm');
            this.alertMessage = document.getElementById('alertMessage');
            this.loginBtn = document.getElementById('loginBtn');
            this.spinner = document.getElementById('spinner');
            this.btnText = document.querySelector('.btn-text');
            
            // Validate all required elements exist
            const requiredElements = [
                this.departmentBtns,
                this.emailInput,
                this.passwordInput,
                this.loginForm,
                this.alertMessage,
                this.loginBtn,
                this.spinner,
                this.btnText
            ];
            
            const missingElements = requiredElements.filter(el => !el || (Array.isArray(el) && el.length === 0));
            
            if (missingElements.length > 0) {
                throw new Error(`Missing required DOM elements: ${missingElements.length} elements not found`);
            }
            
            this.logger.info(`✅ DOM elements found: ${this.departmentBtns.length} department buttons`);
            
        } catch (error) {
            this.logger.error('DOM setup failed', error);
            throw error;
        }
    }

    setupEventListeners() {
        this.logger.info('🔗 Setting up event listeners');
        
        try {
            // Department selection
            this.departmentBtns.forEach((btn) => {
                btn.addEventListener('click', (e) => this.handleDepartmentSelection(e));
            });
            
            // Form submission
            this.loginForm.addEventListener('submit', (e) => this.handleLoginSubmit(e));
            
            // Input validation on blur
            this.emailInput.addEventListener('blur', () => this.validateEmailField());
            this.passwordInput.addEventListener('blur', () => this.validatePasswordField());
            
            // Network status monitoring
            window.addEventListener('online', () => this.handleNetworkRestored());
            window.addEventListener('offline', () => this.handleNetworkLost());
            
            this.logger.info('✅ Event listeners registered');
            
        } catch (error) {
            this.logger.error('Event listener setup failed', error);
            throw error;
        }
    }

    // ============================================
    // DEPARTMENT CONFIGURATION
    // ============================================
    
    get departmentInfo() {
        return {
            health: {
                name: "Health Department",
                hint: "health@uoe.edu.ke",
                dashboard: "Dashboard-health.html",
                icon: "fa-heartbeat",
                color: "#e01b24",
                requiredPermissions: ["health_access", "emergency_view"]
            },
            outreach: {
                name: "Outreach Department", 
                hint: "outreach@uoe.edu.ke",
                dashboard: "Dashboard-outreach.html",
                icon: "fa-hands-helping",
                color: "#2ec27e",
                requiredPermissions: ["outreach_access", "community_view"]
            },
            deans: {
                name: "Deans Office",
                hint: "deansoffice@uoe.edu.ke",
                dashboard: "Dashboard-deans.html",
                icon: "fa-user-graduate",
                color: "#1a5fb4",
                requiredPermissions: ["deans_access", "student_data_view"]
            },
            estate: {
                name: "Estate Department",
                hint: "estate@uoe.edu.ke",
                dashboard: "Dashboard-estate.html",
                icon: "fa-building",
                color: "#ff7800",
                requiredPermissions: ["estate_access", "facility_management"]
            },
            security: {
                name: "Security Department",
                hint: "security@uoe.edu.ke",
                dashboard: "Dashboard-security.html",
                icon: "fa-shield-alt",
                color: "#9141ac",
                requiredPermissions: ["security_access", "incident_management"]
            }
        };
    }

    getActiveDepartment() {
        const activeBtn = document.querySelector('.department-btn.active');
        return activeBtn ? activeBtn.getAttribute('data-department') : 'health';
    }

    handleDepartmentSelection(event) {
        const selectedBtn = event.currentTarget;
        const department = selectedBtn.getAttribute('data-department');
        
        this.logger.info('🎯 Department selected', { department });
        
        // Update UI
        this.departmentBtns.forEach(b => b.classList.remove('active'));
        selectedBtn.classList.add('active');
        
        // Update form hints
        this.emailInput.placeholder = `e.g. ${this.departmentInfo[department].hint}`;
        
        // Show department info
        this.showAlert(`Selected: ${this.departmentInfo[department].name}`, 'info', 2000);
    }

    // ============================================
    // FORM VALIDATION
    // ============================================
    
    validateEmailField() {
        const email = this.emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!email) {
            this.showFieldError(this.emailInput, 'Email is required');
            return false;
        }
        
        if (!emailRegex.test(email)) {
            this.showFieldError(this.emailInput, 'Please enter a valid email address');
            return false;
        }
        
        // Check for UOE domain (warning only)
        if (!email.toLowerCase().endsWith('@uoe.edu.ke')) {
            this.showFieldWarning(this.emailInput, 'Recommended: Use your UOE email address');
        }
        
        this.clearFieldError(this.emailInput);
        return true;
    }

    validatePasswordField() {
        const password = this.passwordInput.value;
        
        if (!password) {
            this.showFieldError(this.passwordInput, 'Password is required');
            return false;
        }
        
        if (password.length < 6) {
            this.showFieldError(this.passwordInput, 'Password must be at least 6 characters');
            return false;
        }
        
        this.clearFieldError(this.passwordInput);
        return true;
    }

    showFieldError(inputElement, message) {
        inputElement.style.borderColor = '#e01b24';
        inputElement.style.boxShadow = '0 0 0 3px rgba(224, 27, 36, 0.1)';
        
        // Show tooltip or inline error if needed
        if (!inputElement.nextElementSibling?.classList.contains('field-error')) {
            const errorEl = document.createElement('div');
            errorEl.className = 'field-error';
            errorEl.style.color = '#e01b24';
            errorEl.style.fontSize = '0.875rem';
            errorEl.style.marginTop = '5px';
            errorEl.textContent = message;
            inputElement.parentNode.appendChild(errorEl);
        }
    }

    showFieldWarning(inputElement, message) {
        inputElement.style.borderColor = '#f5c211';
        
        if (!inputElement.nextElementSibling?.classList.contains('field-warning')) {
            const warningEl = document.createElement('div');
            warningEl.className = 'field-warning';
            warningEl.style.color = '#f5c211';
            warningEl.style.fontSize = '0.875rem';
            warningEl.style.marginTop = '5px';
            warningEl.textContent = message;
            inputElement.parentNode.appendChild(warningEl);
        }
    }

    clearFieldError(inputElement) {
        inputElement.style.borderColor = '';
        inputElement.style.boxShadow = '';
        
        const errorEl = inputElement.nextElementSibling;
        if (errorEl && (errorEl.classList.contains('field-error') || errorEl.classList.contains('field-warning'))) {
            errorEl.remove();
        }
    }

    // ============================================
    // AUTHENTICATION HANDLING
    // ============================================
    
    async handleLoginSubmit(event) {
        event.preventDefault();
        
        // Prevent multiple simultaneous login attempts
        if (this.isAuthenticating) {
            this.logger.warn('Login attempt blocked - already authenticating');
            this.showAlert('Please wait for current login to complete', 'warning');
            return;
        }
        
        this.logger.info('📝 Login form submission initiated');
        
        // Validate form
        if (!this.validateEmailField() || !this.validatePasswordField()) {
            this.showAlert('Please fix the errors in the form', 'error');
            return;
        }
        
        const credentials = {
            email: this.emailInput.value.trim(),
            password: this.passwordInput.value,
            department: this.getActiveDepartment()
        };
        
        this.logger.debug('Login credentials prepared', { 
            email: credentials.email, 
            department: credentials.department 
        });
        
        try {
            this.isAuthenticating = true;
            this.setLoadingState(true);
            
            // Attempt login
            const result = await this.attemptLoginWithRetry(credentials);
            
            if (result.success) {
                await this.handleSuccessfulLogin(result.user, credentials.department);
            } else {
                this.handleLoginFailure(result.error, credentials.department);
            }
            
        } catch (error) {
            this.handleUnexpectedLoginError(error);
        } finally {
            this.isAuthenticating = false;
            this.setLoadingState(false);
        }
    }

    async attemptLoginWithRetry(credentials, attempt = 1) {
        try {
            this.logger.info(`🔄 Login attempt ${attempt}/${this.maxRetries}`);
            
            const userCredential = await this.auth.signInWithEmailAndPassword(
                credentials.email, 
                credentials.password
            );
            
            return {
                success: true,
                user: userCredential.user
            };
            
        } catch (error) {
            this.logger.warn(`Login attempt ${attempt} failed`, { 
                errorCode: error.code,
                attempt: attempt 
            });
            
            // Check if we should retry
            if (this.shouldRetryLogin(error) && attempt < this.maxRetries) {
                await this.delay(1000 * attempt); // Exponential backoff
                return this.attemptLoginWithRetry(credentials, attempt + 1);
            }
            
            return {
                success: false,
                error: error
            };
        }
    }

    shouldRetryLogin(error) {
        // Retry on network errors or rate limiting
        const retryCodes = [
            'auth/network-request-failed',
            'auth/too-many-requests',
            'auth/internal-error'
        ];
        
        return retryCodes.includes(error.code);
    }

    async handleSuccessfulLogin(user, department) {
        this.logger.info('✅ Authentication successful', { 
            userId: user.uid, 
            department: department 
        });
        
        // Check department access with timeout
        const hasAccess = await this.checkDepartmentAccessWithTimeout(user.uid, department);
        
        if (hasAccess) {
            this.logger.info(`🔐 Access granted to ${this.departmentInfo[department].name}`);
            
            // Store session data
            this.storeSessionData(user, department);
            
            // Show success message
            this.showAlert(`Access granted! Redirecting to ${this.departmentInfo[department].name}...`, 'success');
            
            // Redirect after delay
            setTimeout(() => {
                this.redirectToDashboard(department);
            }, 1500);
            
        } else {
            this.logger.warn('Access denied - insufficient permissions', { department });
            
            // Sign out since they don't have access
            await this.auth.signOut();
            
            this.showAlert(
                `Access denied. You don't have permission to access the ${this.departmentInfo[department].name}.`, 
                'error'
            );
            
            // Reset form
            this.loginForm.reset();
        }
    }

    async checkDepartmentAccessWithTimeout(userId, department, timeoutMs = 5000) {
        return new Promise(async (resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.logger.warn('Department access check timeout');
                resolve(false); // Fail open? Or false for security?
            }, timeoutMs);
            
            try {
                const hasAccess = await this.checkDepartmentAccess(userId, department);
                clearTimeout(timeoutId);
                resolve(hasAccess);
            } catch (error) {
                clearTimeout(timeoutId);
                this.logger.error('Department access check failed', error);
                resolve(false); // Fail closed for security
            }
        });
    }

    async checkDepartmentAccess(userId, department) {
        try {
            this.logger.debug('🔍 Checking department access', { userId, department });
            
            const userDoc = await this.db.collection('adminUsers')
                .doc(userId)
                .get({ source: 'default' }); // Try cache first, then server
            
            if (!userDoc.exists) {
                this.logger.warn('User document not found in Firestore');
                return false;
            }
            
            const userData = userDoc.data();
            const hasAccess = userData.departments && userData.departments.includes(department);
            
            this.logger.debug('Department access result', { 
                hasAccess, 
                userDepartments: userData.departments 
            });
            
            return hasAccess;
            
        } catch (error) {
            this.logger.error('Department access check failed', error);
            
            // Handle specific Firestore errors
            if (error.code === 'failed-precondition') {
                this.showAlert('Database error. Please try again.', 'error');
            } else if (error.code === 'unavailable') {
                this.showAlert('Network issue. Checking cached permissions...', 'warning');
                // Could check localStorage for cached permissions here
            }
            
            return false;
        }
    }

    handleLoginFailure(error, department) {
        this.logger.error('Login failed', { 
            errorCode: error.code, 
            department: department 
        });
        
        // Reset retry attempts on clear auth failures
        this.retryAttempts = 0;
        
        switch (error.code) {
            case 'auth/invalid-email':
                this.showAlert('Invalid email address format.', 'error');
                this.emailInput.focus();
                break;
                
            case 'auth/user-disabled':
                this.showAlert('This account has been disabled. Contact system administrator.', 'error');
                break;
                
            case 'auth/user-not-found':
                this.showAlert('No account found with this email address.', 'error');
                this.emailInput.focus();
                break;
                
            case 'auth/wrong-password':
                this.showAlert('Incorrect password. Please try again.', 'error');
                this.passwordInput.focus();
                this.passwordInput.select();
                break;
                
            case 'auth/too-many-requests':
                this.showAlert('Too many failed attempts. Please try again in 15 minutes.', 'error');
                this.loginBtn.disabled = true;
                setTimeout(() => {
                    this.loginBtn.disabled = false;
                }, 900000); // 15 minutes
                break;
                
            case 'auth/network-request-failed':
                this.handleNetworkError();
                break;
                
            default:
                this.showAlert(`Authentication error: ${error.message || 'Please try again'}`, 'error');
        }
    }

    handleUnexpectedLoginError(error) {
        this.logger.error('Unexpected login error', error);
        
        // Check if it's a network error
        if (!navigator.onLine) {
            this.showAlert('Network connection lost. Please check your internet connection.', 'error');
        } else {
            this.showAlert('An unexpected error occurred. Please try again.', 'error');
        }
        
        // Reset form for safety
        this.loginForm.reset();
        this.retryAttempts = 0;
    }

    // ============================================
    // SESSION MANAGEMENT
    // ============================================
    
    async checkExistingSession() {
        this.logger.info('🔍 Checking for existing user session');
        
        return new Promise((resolve) => {
            const unsubscribe = this.auth.onAuthStateChanged(async (user) => {
                unsubscribe(); // Stop listening after first change
                
                if (user) {
                    this.logger.info('👤 Existing user session found', { userId: user.uid });
                    
                    try {
                        // Get user's accessible departments
                        const departments = await this.getUserDepartments(user.uid);
                        
                        if (departments.length > 0) {
                            // Determine which department to redirect to
                            const targetDepartment = this.determineRedirectDepartment(departments);
                            
                            this.logger.info(`🔄 Auto-redirecting to ${targetDepartment}`, { 
                                availableDepartments: departments 
                            });
                            
                            // Store session and redirect
                            this.storeSessionData(user, targetDepartment);
                            
                            // Small delay to show loading state
                            this.showAlert(`Welcome back! Redirecting to ${this.departmentInfo[targetDepartment].name}...`, 'success');
                            
                            setTimeout(() => {
                                this.redirectToDashboard(targetDepartment);
                            }, 1000);
                            
                        } else {
                            this.logger.warn('User has no department access');
                            await this.auth.signOut();
                            this.showAlert('No department access assigned. Contact administrator.', 'error');
                        }
                        
                    } catch (error) {
                        this.logger.error('Session restoration failed', error);
                        await this.auth.signOut();
                        this.showAlert('Session error. Please login again.', 'error');
                    }
                } else {
                    this.logger.info('No active user session');
                }
                
                resolve();
            }, (error) => {
                this.logger.error('Auth state listener error', error);
                resolve();
            });
        });
    }

    async getUserDepartments(userId) {
        try {
            const userDoc = await this.db.collection('adminUsers')
                .doc(userId)
                .get({ source: 'cache' }); // Try cache first for speed
            
            if (userDoc.exists) {
                return userDoc.data().departments || [];
            }
            
            // If not in cache, try server
            const serverDoc = await this.db.collection('adminUsers')
                .doc(userId)
                .get({ source: 'server' });
                
            return serverDoc.exists ? (serverDoc.data().departments || []) : [];
            
        } catch (error) {
            this.logger.error('Failed to get user departments', error);
            return [];
        }
    }

    determineRedirectDepartment(availableDepartments) {
        // Priority order for auto-redirect
        const priorityOrder = ['health', 'security', 'estate', 'deans', 'outreach'];
        
        // Check if user has access to any priority department
        for (const dept of priorityOrder) {
            if (availableDepartments.includes(dept)) {
                return dept;
            }
        }
        
        // Fallback to first available department
        return availableDepartments[0];
    }

    storeSessionData(user, department) {
        try {
            // Store in sessionStorage (cleared when browser closes)
            sessionStorage.setItem('uoe_auth_session', JSON.stringify({
                userId: user.uid,
                userEmail: user.email,
                department: department,
                loginTime: new Date().toISOString(),
                tokenExpiry: Date.now() + (2 * 60 * 60 * 1000) // 2 hours
            }));
            
            // Also store in localStorage for session recovery (optional)
            localStorage.setItem('uoe_last_department', department);
            
            this.logger.debug('Session data stored', { department });
            
        } catch (error) {
            this.logger.warn('Failed to store session data', error);
            // Continue anyway - Firebase auth persists
        }
    }

    // ============================================
    // NETWORK HANDLING
    // ============================================
    
    handleNetworkRestored() {
        this.logger.info('🌐 Network connection restored');
        this.showAlert('Network connection restored', 'success', 3000);
        
        // Re-enable login button if it was disabled
        this.loginBtn.disabled = false;
    }

    handleNetworkLost() {
        this.logger.warn('🌐 Network connection lost');
        this.showAlert('Network connection lost. Some features may be unavailable.', 'warning');
        
        // Disable login button
        this.loginBtn.disabled = true;
        this.btnText.textContent = 'Offline - No Network';
    }

    handleNetworkError() {
        this.logger.error('🌐 Network request failed');
        
        if (!navigator.onLine) {
            this.showAlert('You are offline. Please check your internet connection.', 'error');
        } else {
            this.showAlert('Network error. Please check your connection and try again.', 'error');
        }
        
        // Increment retry attempts
        this.retryAttempts++;
        
        if (this.retryAttempts >= this.maxRetries) {
            this.showAlert('Maximum retry attempts reached. Please try again later.', 'error');
            this.loginBtn.disabled = true;
            
            // Re-enable after 1 minute
            setTimeout(() => {
                this.loginBtn.disabled = false;
                this.retryAttempts = 0;
            }, 60000);
        }
    }

    // ============================================
    // UI UTILITIES
    // ============================================
    
    setLoadingState(isLoading) {
        if (isLoading) {
            this.loginBtn.disabled = true;
            this.loginBtn.classList.add('loading');
            this.btnText.textContent = 'Authenticating...';
            this.spinner.classList.remove('hidden');
            this.spinner.style.opacity = '1';
        } else {
            this.loginBtn.disabled = false;
            this.loginBtn.classList.remove('loading');
            this.btnText.textContent = 'Login';
            this.spinner.classList.add('hidden');
            this.spinner.style.opacity = '0';
        }
    }

    showAlert(message, type = 'info', duration = 5000) {
        this.logger.info(`📢 Alert: ${message}`, { type });
        
        // Clear any existing timeout
        if (this.alertTimeout) {
            clearTimeout(this.alertTimeout);
        }
        
        // Set alert content and style
        this.alertMessage.textContent = message;
        this.alertMessage.className = 'alert';
        
        // Add type-specific class
        switch (type) {
            case 'success':
                this.alertMessage.classList.add('success');
                break;
            case 'error':
                this.alertMessage.classList.add('error');
                break;
            case 'warning':
                this.alertMessage.classList.add('warning');
                break;
            case 'info':
                this.alertMessage.classList.add('info');
                break;
        }
        
        // Show with animation
        this.alertMessage.style.display = 'block';
        this.alertMessage.style.opacity = '0';
        this.alertMessage.style.transform = 'translateY(-10px)';
        
        // Animate in
        setTimeout(() => {
            this.alertMessage.style.transition = 'all 0.3s ease';
            this.alertMessage.style.opacity = '1';
            this.alertMessage.style.transform = 'translateY(0)';
        }, 10);
        
        // Auto-hide after duration if specified
        if (duration > 0) {
            this.alertTimeout = setTimeout(() => {
                this.hideAlert();
            }, duration);
        }
    }

    hideAlert() {
        this.alertMessage.style.opacity = '0';
        this.alertMessage.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
            this.alertMessage.style.display = 'none';
        }, 300);
    }

    redirectToDashboard(department) {
        const dashboardPath = `./frontend/pages/${this.departmentInfo[department].dashboard}`;
        this.logger.info(`🔄 Redirecting to dashboard`, { 
            department: department, 
            path: dashboardPath 
        });
        
        // Add a small delay to ensure any pending operations complete
        setTimeout(() => {
            window.location.href = dashboardPath;
        }, 100);
    }

    handleCriticalError(context, error) {
        this.logger.error(`💥 Critical error: ${context}`, error);
        
        // Show user-friendly error message
        const errorMessage = `
            <div style="padding: 20px; text-align: center;">
                <h3 style="color: #e01b24;">System Error</h3>
                <p>${context}. Please try the following:</p>
                <ol style="text-align: left; max-width: 400px; margin: 20px auto;">
                    <li>Refresh the page</li>
                    <li>Clear browser cache</li>
                    <li>Check internet connection</li>
                    <li>Contact technical support if problem persists</li>
                </ol>
                <button onclick="window.location.reload()" 
                        style="padding: 10px 20px; background: #1a5fb4; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Refresh Page
                </button>
            </div>
        `;
        
        // Replace main content with error message
        document.querySelector('.container').innerHTML = errorMessage;
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    isOnline() {
        return navigator.onLine;
    }

    getNetworkStatus() {
        return {
            online: navigator.onLine,
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            } : null
        };
    }
}

// ============================================
// APPLICATION BOOTSTRAP
// ============================================

// Initialize the application
try {
    const authManager = new AuthManager();
    
    // Make available globally for debugging (optional)
    window.authManager = authManager;
    
    console.log('🚀 UOE Safe App Admin Panel loaded successfully');
    
} catch (error) {
    console.error('💥 Failed to initialize application:', error);
    
    // Fallback error display
    document.body.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; padding: 20px; text-align: center;">
            <div>
                <h1 style="color: #e01b24;">⚠️ Application Error</h1>
                <p>Failed to load the UOE Safe App Admin Panel.</p>
                <p>Please refresh the page or contact technical support.</p>
                <button onclick="window.location.reload()" 
                        style="margin-top: 20px; padding: 12px 24px; background: #1a5fb4; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    Retry
                </button>
            </div>
        </div>
    `;
}