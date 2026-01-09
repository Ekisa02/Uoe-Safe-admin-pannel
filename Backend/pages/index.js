
        // ============================================
        // UOE SAFE APP - ADMIN PANEL AUTHENTICATION
        // ============================================
        // Version: 2.1.0 | Integrated with HTML UI
        // ============================================
        
        class UOEAuthManager {
            constructor() {
                this.initLogging();
                this.logger.info('🔄 UOE Safe App Admin Panel Initializing');
                
                // State management
                this.isAuthenticating = false;
                this.retryAttempts = 0;
                this.maxRetries = 3;
                this.alertTimeout = null;
                
                // Initialize on DOM ready
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => this.initialize());
                } else {
                    this.initialize();
                }
            }

            initLogging() {
                // Professional logging system
                this.logger = {
                    info: (msg, data) => console.log(`ℹ️ ${new Date().toLocaleTimeString()} ${msg}`, data || ''),
                    warn: (msg, data) => console.warn(`⚠️ ${new Date().toLocaleTimeString()} ${msg}`, data || ''),
                    error: (msg, data) => console.error(`❌ ${new Date().toLocaleTimeString()} ${msg}`, data || ''),
                    debug: (msg, data) => console.debug(`🐛 ${new Date().toLocaleTimeString()} ${msg}`, data || '')
                };
            }

            async initialize() {
                try {
                    this.logger.info('🚀 Starting UOE Safe App initialization');
                    
                    // Show loading overlay
                    this.showLoadingOverlay(true);
                    
                    // Step 1: Setup UI components
                    this.setupUI();
                    
                    // Step 2: Initialize network monitoring
                    this.initNetworkMonitoring();
                    
                    // Step 3: Check Firebase configuration
                    await this.validateFirebaseConfig();
                    
                    // Step 4: Initialize Firebase
                    await this.initializeFirebase();
                    
                    // Step 5: Setup event listeners
                    this.setupEventListeners();
                    
                    // Step 6: Check for existing session
                    await this.checkExistingSession();
                    
                    // Update system status
                    this.updateSystemStatus('All systems operational', 'online');
                    this.updateFirebaseStatus('Connected');
                    
                    this.logger.info('✅ UOE Safe App initialization complete');
                    
                    // Hide loading overlay with delay for smooth UX
                    setTimeout(() => {
                        this.showLoadingOverlay(false);
                    }, 500);
                    
                } catch (error) {
                    this.handleCriticalError('Application initialization failed', error);
                }
            }

            setupUI() {
                this.logger.info('🎨 Setting up UI components');
                
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
                    
                    // Status elements
                    this.networkStatus = document.getElementById('networkStatus');
                    this.networkStatusText = document.getElementById('networkStatusText');
                    this.systemStatusIndicator = document.getElementById('systemStatusIndicator');
                    this.systemStatusText = document.getElementById('systemStatusText');
                    this.authStatus = document.getElementById('authStatus');
                    this.firebaseStatus = document.getElementById('firebaseStatus');
                    this.connectionStatus = document.getElementById('connectionStatus');
                    this.loadingOverlay = document.getElementById('loadingOverlay');
                    
                    // Validate all required elements
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
                    
                    this.logger.info(`✅ UI components found: ${this.departmentBtns.length} department buttons`);
                    
                } catch (error) {
                    this.logger.error('UI setup failed', error);
                    throw error;
                }
            }

            initNetworkMonitoring() {
                this.logger.info('🌐 Initializing network monitoring');
                
                // Initial network status
                this.updateNetworkStatus();
                
                // Listen for network changes
                window.addEventListener('online', () => {
                    this.logger.info('🌐 Network connection restored');
                    this.updateNetworkStatus();
                    this.showNetworkAlert('Network connection restored', 'online');
                    this.handleNetworkRestored();
                });
                
                window.addEventListener('offline', () => {
                    this.logger.warn('🌐 Network connection lost');
                    this.updateNetworkStatus();
                    this.showNetworkAlert('Network connection lost', 'offline');
                    this.handleNetworkLost();
                });
                
                // Update connection status in UI
                setInterval(() => this.updateNetworkStatus(), 30000);
            }

            updateNetworkStatus() {
                const isOnline = navigator.onLine;
                
                if (this.networkStatus) {
                    if (isOnline) {
                        this.networkStatus.className = 'network-status online visible';
                        this.networkStatusText.textContent = 'Online';
                        this.connectionStatus.textContent = 'Online';
                        this.connectionStatus.style.color = '#2ec27e';
                    } else {
                        this.networkStatus.className = 'network-status offline visible';
                        this.networkStatusText.textContent = 'Offline';
                        this.connectionStatus.textContent = 'Offline';
                        this.connectionStatus.style.color = '#e01b24';
                    }
                }
            }

            showNetworkAlert(message, type) {
                // Create temporary network alert
                const alertDiv = document.createElement('div');
                alertDiv.className = `alert ${type} visible`;
                alertDiv.textContent = message;
                alertDiv.style.position = 'fixed';
                alertDiv.style.top = '60px';
                alertDiv.style.right = '20px';
                alertDiv.style.zIndex = '1001';
                alertDiv.style.maxWidth = '300px';
                alertDiv.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.1)';
                
                document.body.appendChild(alertDiv);
                
                // Remove after 3 seconds
                setTimeout(() => {
                    alertDiv.style.opacity = '0';
                    alertDiv.style.transform = 'translateY(-10px)';
                    setTimeout(() => {
                        if (alertDiv.parentNode) {
                            alertDiv.parentNode.removeChild(alertDiv);
                        }
                    }, 300);
                }, 3000);
            }

            showLoadingOverlay(show) {
                if (this.loadingOverlay) {
                    if (show) {
                        this.loadingOverlay.classList.add('visible');
                    } else {
                        this.loadingOverlay.classList.remove('visible');
                    }
                }
            }

            updateSystemStatus(message, status) {
                if (this.systemStatusText && this.systemStatusIndicator) {
                    this.systemStatusText.textContent = message;
                    
                    if (status === 'online') {
                        this.systemStatusIndicator.className = 'status-indicator online';
                        this.authStatus.textContent = 'Ready';
                        this.authStatus.style.color = '#2ec27e';
                    } else {
                        this.systemStatusIndicator.className = 'status-indicator offline';
                        this.authStatus.textContent = 'Offline';
                        this.authStatus.style.color = '#e01b24';
                    }
                }
            }

            updateFirebaseStatus(status) {
                if (this.firebaseStatus) {
                    this.firebaseStatus.textContent = status;
                    if (status === 'Connected') {
                        this.firebaseStatus.style.color = '#2ec27e';
                    } else {
                        this.firebaseStatus.style.color = '#e01b24';
                    }
                }
            }

            // ============================================
            // FIREBASE INITIALIZATION
            // ============================================
            
            async validateFirebaseConfig() {
                this.logger.info('🔍 Validating Firebase configuration');
                
                if (typeof firebaseConfig === 'undefined') {
                    const error = new Error('Firebase configuration not found');
                    this.logger.error('Missing firebaseConfig object', {
                        expected: './Backend/Firebase/firebaseConfig.js',
                        currentTime: new Date().toISOString()
                    });
                    
                    this.updateSystemStatus('Firebase configuration missing', 'offline');
                    this.updateFirebaseStatus('Configuration Error');
                    
                    throw error;
                }
                
                // Validate required Firebase config properties
                const requiredProps = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
                const missingProps = requiredProps.filter(prop => !firebaseConfig[prop]);
                
                if (missingProps.length > 0) {
                    const error = new Error(`Incomplete Firebase configuration. Missing: ${missingProps.join(', ')}`);
                    this.logger.error('Invalid Firebase configuration', { missingProps });
                    
                    this.updateSystemStatus('Firebase configuration incomplete', 'offline');
                    this.updateFirebaseStatus('Configuration Error');
                    
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
                        this.updateFirebaseStatus('Initialized');
                    } else {
                        this.logger.info('✅ Firebase app already initialized');
                        this.updateFirebaseStatus('Already Initialized');
                    }
                    
                    // Initialize services
                    this.auth = firebase.auth();
                    this.db = firebase.firestore();
                    
                    // Configure Firestore settings
                    this.db.settings({
                        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
                    });
                    
                    this.logger.info('✅ Firebase services initialized');
                    this.updateFirebaseStatus('Connected');
                    
                } catch (error) {
                    this.logger.error('Firebase initialization failed', error);
                    this.updateSystemStatus('Firebase initialization failed', 'offline');
                    this.updateFirebaseStatus('Connection Failed');
                    throw new Error(`Firebase initialization failed: ${error.message}`);
                }
            }

            // ============================================
            // EVENT HANDLERS
            // ============================================
            
            setupEventListeners() {
                this.logger.info('🔗 Setting up event listeners');
                
                try {
                    // Department selection
                    this.departmentBtns.forEach((btn) => {
                        btn.addEventListener('click', (e) => this.handleDepartmentSelection(e));
                    });
                    
                    // Form submission
                    this.loginForm.addEventListener('submit', (e) => this.handleLoginSubmit(e));
                    
                    // Input validation
                    this.emailInput.addEventListener('blur', () => this.validateEmailField());
                    this.emailInput.addEventListener('input', () => this.clearFieldError(this.emailInput));
                    
                    this.passwordInput.addEventListener('blur', () => this.validatePasswordField());
                    this.passwordInput.addEventListener('input', () => this.clearFieldError(this.passwordInput));
                    
                    // Real-time input validation with debouncing
                    let emailTimeout, passwordTimeout;
                    this.emailInput.addEventListener('input', () => {
                        clearTimeout(emailTimeout);
                        emailTimeout = setTimeout(() => {
                            if (this.emailInput.value.trim().length > 3) {
                                this.validateEmailField();
                            }
                        }, 500);
                    });
                    
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
                        color: "#e01b24"
                    },
                    outreach: {
                        name: "Outreach Department", 
                        hint: "outreach@uoe.edu.ke",
                        dashboard: "Dashboard-outreach.html",
                        icon: "fa-hands-helping",
                        color: "#2ec27e"
                    },
                    deans: {
                        name: "Deans Office",
                        hint: "deansoffice@uoe.edu.ke",
                        dashboard: "Dashboard-deans.html",
                        icon: "fa-user-graduate",
                        color: "#1a5fb4"
                    },
                    estate: {
                        name: "Estate Department",
                        hint: "estate@uoe.edu.ke",
                        dashboard: "Dashboard-estate.html",
                        icon: "fa-building",
                        color: "#ff7800"
                    },
                    security: {
                        name: "Security Department",
                        hint: "security@uoe.edu.ke",
                        dashboard: "Dashboard-security.html",
                        icon: "fa-shield-alt",
                        color: "#9141ac"
                    }
                };
            }

            handleDepartmentSelection(event) {
                const selectedBtn = event.currentTarget;
                const department = selectedBtn.getAttribute('data-department');
                
                this.logger.info('🎯 Department selected', { department });
                
                // Update UI
                this.departmentBtns.forEach(b => b.classList.remove('active'));
                selectedBtn.classList.add('active');
                
                // Update form hints and button text
                this.emailInput.placeholder = `e.g. ${this.departmentInfo[department].hint}`;
                this.btnText.textContent = `Login to ${this.departmentInfo[department].name} Dashboard`;
                
                // Show department info
                this.showAlert(`Selected: ${this.departmentInfo[department].name}`, 'info', 2000);
            }

            getActiveDepartment() {
                const activeBtn = document.querySelector('.department-btn.active');
                return activeBtn ? activeBtn.getAttribute('data-department') : 'health';
            }

            // ============================================
            // FORM VALIDATION
            // ============================================
            
            validateEmailField() {
                const email = this.emailInput.value.trim();
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                
                // Clear previous errors
                this.clearFieldError(this.emailInput);
                
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
                
                this.emailInput.classList.add('valid');
                return true;
            }

            validatePasswordField() {
                const password = this.passwordInput.value;
                
                // Clear previous errors
                this.clearFieldError(this.passwordInput);
                
                if (!password) {
                    this.showFieldError(this.passwordInput, 'Password is required');
                    return false;
                }
                
                if (password.length < 6) {
                    this.showFieldError(this.passwordInput, 'Password must be at least 6 characters');
                    return false;
                }
                
                this.passwordInput.classList.add('valid');
                return true;
            }

            showFieldError(inputElement, message) {
                inputElement.classList.add('invalid');
                inputElement.classList.remove('warning', 'valid');
                
                // Show tooltip or inline error
                if (!inputElement.nextElementSibling?.classList.contains('field-error')) {
                    const errorEl = document.createElement('div');
                    errorEl.className = 'field-error';
                    errorEl.textContent = message;
                    inputElement.parentNode.appendChild(errorEl);
                }
            }

            showFieldWarning(inputElement, message) {
                inputElement.classList.add('warning');
                inputElement.classList.remove('invalid', 'valid');
                
                if (!inputElement.nextElementSibling?.classList.contains('field-warning')) {
                    const warningEl = document.createElement('div');
                    warningEl.className = 'field-warning';
                    warningEl.textContent = message;
                    inputElement.parentNode.appendChild(warningEl);
                }
            }

            clearFieldError(inputElement) {
                inputElement.classList.remove('invalid', 'warning', 'valid');
                
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
                
                // Check network connection
                if (!navigator.onLine) {
                    this.showAlert('No network connection. Please check your internet connection.', 'error');
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
                    this.updateSystemStatus('Authenticating...', 'online');
                    
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
                    this.updateSystemStatus('All systems operational', 'online');
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
                        // Show retry message
                        this.showAlert(`Login attempt ${attempt} failed. Retrying...`, 'warning', 1000);
                        
                        // Exponential backoff
                        await this.delay(1000 * attempt);
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
                
                this.showAlert('Authentication successful! Checking permissions...', 'success', 2000);
                
                // Check department access with timeout
                const hasAccess = await this.checkDepartmentAccessWithTimeout(user.uid, department);
                
                if (hasAccess) {
                    this.logger.info(`🔐 Access granted to ${this.departmentInfo[department].name}`);
                    
                    // Store session data
                    this.storeSessionData(user, department);
                    
                    // Show success message
                    this.showAlert(`Access granted! Redirecting to ${this.departmentInfo[department].name}...`, 'success');
                    
                    // Update UI before redirect
                    this.setLoadingState(true);
                    this.btnText.textContent = 'Redirecting...';
                    
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
                    this.clearFieldError(this.emailInput);
                    this.clearFieldError(this.passwordInput);
                }
            }

            async checkDepartmentAccessWithTimeout(userId, department, timeoutMs = 5000) {
                return new Promise(async (resolve, reject) => {
                    const timeoutId = setTimeout(() => {
                        this.logger.warn('Department access check timeout');
                        this.showAlert('Permission check taking longer than expected. Please try again.', 'warning');
                        resolve(false); // Fail closed for security
                    }, timeoutMs);
                    
                    try {
                        const hasAccess = await this.checkDepartmentAccess(userId, department);
                        clearTimeout(timeoutId);
                        resolve(hasAccess);
                    } catch (error) {
                        clearTimeout(timeoutId);
                        this.logger.error('Department access check failed', error);
                        this.showAlert('Unable to verify permissions. Please contact administrator.', 'error');
                        resolve(false); // Fail closed for security
                    }
                });
            }

            async checkDepartmentAccess(userId, department) {
                try {
                    this.logger.debug('🔍 Checking department access', { userId, department });
                    
                    const userDoc = await this.db.collection('adminUsers')
                        .doc(userId)
                        .get({ source: 'default' });
                    
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
                        this.emailInput.classList.add('invalid');
                        break;
                        
                    case 'auth/user-disabled':
                        this.showAlert('This account has been disabled. Contact system administrator.', 'error');
                        break;
                        
                    case 'auth/user-not-found':
                        this.showAlert('No account found with this email address.', 'error');
                        this.emailInput.focus();
                        this.emailInput.classList.add('invalid');
                        break;
                        
                    case 'auth/wrong-password':
                        this.showAlert('Incorrect password. Please try again.', 'error');
                        this.passwordInput.focus();
                        this.passwordInput.select();
                        this.passwordInput.classList.add('invalid');
                        break;
                        
                    case 'auth/too-many-requests':
                        this.showAlert('Too many failed attempts. Please try again in 15 minutes.', 'error');
                        this.loginBtn.disabled = true;
                        this.btnText.textContent = 'Temporarily Locked';
                        setTimeout(() => {
                            this.loginBtn.disabled = false;
                            this.btnText.textContent = 'Login';
                        }, 900000); // 15 minutes
                        break;
                        
                    case 'auth/network-request-failed':
                        this.handleNetworkError();
                        break;
                        
                    default:
                        this.showAlert(`Authentication error: ${error.message || 'Please try again'}`, 'error');
                }
                
                // Clear password field for security
                this.passwordInput.value = '';
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
                this.clearFieldError(this.emailInput);
                this.clearFieldError(this.passwordInput);
                this.retryAttempts = 0;
            }

            handleNetworkRestored() {
                this.logger.info('🌐 Network connection restored');
                this.showAlert('Network connection restored', 'success', 3000);
                
                // Re-enable login button if it was disabled
                this.loginBtn.disabled = false;
                this.btnText.textContent = 'Login';
                
                // Update system status
                this.updateSystemStatus('Network restored. All systems operational.', 'online');
            }

            handleNetworkLost() {
                this.logger.warn('🌐 Network connection lost');
                this.showAlert('Network connection lost. Some features may be unavailable.', 'warning');
                
                // Update system status
                this.updateSystemStatus('Network connection lost', 'offline');
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
                    this.btnText.textContent = 'Network Error';
                    
                    // Re-enable after 1 minute
                    setTimeout(() => {
                        this.loginBtn.disabled = false;
                        this.btnText.textContent = 'Login';
                        this.retryAttempts = 0;
                    }, 60000);
                }
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
                                    
                                    // Show redirect message
                                    this.showAlert(`Welcome back! Redirecting to ${this.departmentInfo[targetDepartment].name}...`, 'success');
                                    this.setLoadingState(true);
                                    this.btnText.textContent = 'Auto-redirecting...';
                                    
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
                    // Try cache first for speed
                    const cachedDoc = await this.db.collection('adminUsers')
                        .doc(userId)
                        .get({ source: 'cache' });
                    
                    if (cachedDoc.exists) {
                        return cachedDoc.data().departments || [];
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
            // UI UTILITIES
            // ============================================
            
            setLoadingState(isLoading) {
                if (isLoading) {
                    this.loginBtn.disabled = true;
                    this.loginBtn.classList.add('loading');
                    this.btnText.textContent = 'Authenticating...';
                    this.spinner.classList.remove('hidden');
                } else {
                    this.loginBtn.disabled = false;
                    this.loginBtn.classList.remove('loading');
                    this.btnText.textContent = `Login to ${this.departmentInfo[this.getActiveDepartment()].name} Dashboard`;
                    this.spinner.classList.add('hidden');
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
                this.alertMessage.classList.add('visible');
                
                // Auto-hide after duration if specified
                if (duration > 0) {
                    this.alertTimeout = setTimeout(() => {
                        this.hideAlert();
                    }, duration);
                }
            }

            hideAlert() {
                this.alertMessage.classList.remove('visible');
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
                    <div style="padding: 40px 20px; text-align: center; max-width: 600px; margin: 0 auto;">
                        <h1 style="color: var(--primary-blue); margin-bottom: 20px;">
                            <i class="fas fa-exclamation-triangle"></i> System Error
                        </h1>
                        <div style="background: white; padding: 30px; border-radius: var(--radius); box-shadow: var(--shadow);">
                            <h3 style="color: #e01b24; margin-bottom: 15px;">${context}</h3>
                            <p style="color: var(--text-light); margin-bottom: 25px;">
                                We encountered an error while initializing the UOE Safe App. Please try the following:
                            </p>
                            <ol style="text-align: left; max-width: 400px; margin: 20px auto 30px; color: var(--text-color); line-height: 1.8;">
                                <li>Refresh the page</li>
                                <li>Clear browser cache and cookies</li>
                                <li>Check your internet connection</li>
                                <li>Contact technical support if the problem persists</li>
                            </ol>
                            <div style="display: flex; gap: 15px; justify-content: center;">
                                <button onclick="window.location.reload()" 
                                        style="padding: 12px 24px; background: var(--primary-blue); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                                    <i class="fas fa-redo"></i> Refresh Page
                                </button>
                                <button onclick="window.location.href='mailto:techsupport@uoe.edu.ke'" 
                                        style="padding: 12px 24px; background: var(--secondary-green); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                                    <i class="fas fa-envelope"></i> Contact Support
                                </button>
                            </div>
                        </div>
                        <p style="margin-top: 25px; color: var(--text-light); font-size: 0.9rem;">
                            University of Eldoret &copy; 2026 | Safe App Admin Panel
                        </p>
                    </div>
                `;
                
                // Replace main content with error message
                document.querySelector('.container').innerHTML = errorMessage;
                
                // Hide loading overlay
                this.showLoadingOverlay(false);
            }

            // ============================================
            // UTILITY FUNCTIONS
            // ============================================
            
            delay(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
            }
        }

        // ============================================
        // APPLICATION BOOTSTRAP
        // ============================================

        // Initialize the application
        try {
            const uoeAuthManager = new UOEAuthManager();
            
            // Make available globally for debugging (optional)
            window.uoeAuthManager = uoeAuthManager;
            
            console.log('🚀 UOE Safe App Admin Panel v2.1 loaded successfully');
            
        } catch (error) {
            console.error('💥 Failed to initialize application:', error);
            
            // Fallback error display
            document.body.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; height: 100vh; padding: 20px; text-align: center; background: linear-gradient(135deg, #f5f7fa 0%, #e4edf5 100%);">
                    <div style="max-width: 500px;">
                        <h1 style="color: #e01b24; margin-bottom: 20px;">
                            <i class="fas fa-exclamation-triangle"></i> Application Error
                        </h1>
                        <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);">
                            <p style="color: #333; margin-bottom: 20px;">Failed to load the UOE Safe App Admin Panel.</p>
                            <p style="color: #6c757d; margin-bottom: 30px;">Please refresh the page or contact technical support.</p>
                            <button onclick="window.location.reload()" 
                                    style="padding: 12px 24px; background: #1a5fb4; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                                <i class="fas fa-redo"></i> Retry Loading
                            </button>
                        </div>
                        <p style="margin-top: 25px; color: #6c757d; font-size: 0.9rem;">
                            University of Eldoret &copy; 2026 | Safe App Admin Panel
                        </p>
                    </div>
                </div>
            `;
        }
    