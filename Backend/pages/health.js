
        // ============================================
        // UOE SAFE - HEALTH DEPARTMENT DASHBOARD
        // ============================================
        // Version: 3.0.0 | Professional Health Management System
        // ============================================

        // Initialize Firebase
        if (typeof firebaseConfig !== 'undefined') {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
        } else {
            console.error('Firebase configuration not found');
            document.getElementById('loadingOverlay').innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <h3 style="color: var(--error); margin-bottom: 20px;">
                        <i class="fas fa-exclamation-triangle"></i> Configuration Error
                    </h3>
                    <p>Firebase configuration not found. Please check the configuration file.</p>
                    <button onclick="window.location.href = '../../../index.html'" 
                            style="margin-top: 20px; padding: 12px 24px; background: var(--primary-500); color: white; border: none; border-radius: var(--border-radius-md); cursor: pointer;">
                        Return to Login
                    </button>
                </div>
            `;
        }

        const auth = firebase.auth();
        const db = firebase.firestore();

        // Global variables
        let healthData = [];
        let healthReportsListener = null;
        let chartInstances = {};
        let currentUser = null;
        let notifications = [];

        // Hide loading overlay with animation
        function hideLoading() {
            const overlay = document.getElementById('loadingOverlay');
            overlay.style.opacity = '0';
            overlay.style.transform = 'scale(0.95)';
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 500);
        }

        // Show toast notification
        function showToast(message, type = 'success') {
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.innerHTML = `
                <i class="fas fa-${type === 'success' ? 'check-circle' : 
                                  type === 'error' ? 'exclamation-circle' : 
                                  type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
                <span>${message}</span>
            `;
            document.body.appendChild(toast);

            // Animate in
            setTimeout(() => {
                toast.style.transform = 'translateX(0)';
            }, 50);

            // Remove toast after 4 seconds
            setTimeout(() => {
                toast.style.transform = 'translateX(120%)';
                setTimeout(() => {
                    if (toast.parentNode) {
                        document.body.removeChild(toast);
                    }
                }, 400);
            }, 4000);
        }

        // Update user avatar with initials
        function updateUserAvatar(email) {
            const avatar = document.getElementById('userAvatar');
            const name = email.split('@')[0];
            const initials = name.substring(0, 2).toUpperCase();
            avatar.textContent = initials;
        }

        // Check user authentication and department access
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                showToast('Please login to access the dashboard', 'error');
                setTimeout(() => {
                    window.location.href = '../../../index.html';
                }, 2000);
                return;
            }
            
            try {
                currentUser = user;
                
                // Verify this is a health department user
                const userDoc = await db.collection('adminUsers').doc(user.uid).get();
                if (!userDoc.exists || !userDoc.data().departments.includes('health')) {
                    showToast('Access denied. Health department access required.', 'error');
                    setTimeout(() => {
                        auth.signOut();
                        window.location.href = '../../../index.html';
                    }, 3000);
                    return;
                }
                
                // User is authenticated and has access
                document.getElementById('sidebar-user-name').textContent = user.email;
                updateUserAvatar(user.email);
                
                // Set page title with user info
                const userName = user.email.split('@')[0];
                document.title = `UoE Safe | ${userName} - Health Department`;
                
                // Load initial data
                loadInitialData();
                
                // Hide loading overlay
                setTimeout(hideLoading, 1500);
                
                showToast(`Welcome ${userName} to Health Department Dashboard`, 'success');
                
                // Start real-time updates
                startRealTimeUpdates();
                
            } catch (error) {
                console.error('Auth error:', error);
                showToast('Authentication error. Please try again.', 'error');
                hideLoading();
            }
        });

        // Load initial data
        async function loadInitialData() {
            try {
                // Load health data
                const snapshot = await db.collection('health')
                    .orderBy('submissionTimestamp', 'desc')
                    .limit(100)
                    .get();
                
                healthData = [];
                snapshot.forEach(doc => {
                    healthData.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });

                // Update dashboard
                updateDashboardStats();
                initializeHealthCharts();
                loadRecentHealthSubmissions();
                loadHealthConcerns();
                populateHealthTable();
                updateSettingsCategories();
                
                // Load notifications
                loadNotifications();
                
            } catch (error) {
                console.error('Error loading initial data:', error);
                showToast('Error loading initial data', 'error');
            }
        }

        // Start real-time updates
        function startRealTimeUpdates() {
            if (healthReportsListener) {
                healthReportsListener();
            }
            
            healthReportsListener = db.collection('health')
                .orderBy('submissionTimestamp', 'desc')
                .onSnapshot((querySnapshot) => {
                    healthData = [];
                    querySnapshot.forEach((doc) => {
                        healthData.push({
                            id: doc.id,
                            ...doc.data()
                        });
                    });

                    // Update all dashboard components
                    updateDashboardStats();
                    if (chartInstances.healthChart) {
                        updateHealthCharts();
                    }
                    loadRecentHealthSubmissions();
                    loadHealthConcerns();
                    if (document.getElementById('health-table-body')) {
                        populateHealthTable();
                    }
                    updateSettingsCategories();
                    
                    // Check for new notifications
                    checkForNewNotifications();
                    
                }, (error) => {
                    console.error('Error in real-time listener:', error);
                    showToast('Connection error. Trying to reconnect...', 'warning');
                });
        }

        // Update dashboard statistics
        function updateDashboardStats() {
            const totalRecords = healthData.length;
            const mentalHealthCases = healthData.filter(record => 
                record.depression || record.stress || record.mentalStigma || record.academicPressure
            ).length;
            const womensHealth = healthData.filter(record => 
                record.gender === 'Female' && (
                    record.contraception || record.irregularPeriods || record.menstrualPain || 
                    record.pregnancyConcerns || record.sanitaryAccess || record.harassment || record.needSafeSpace
                )
            ).length;
            const mensHealth = healthData.filter(record => 
                record.gender === 'Male' && (record.sexualHealthMale || record.sportsInjury)
            ).length;

            // Animate counters
            animateCounter('total-health-records', totalRecords);
            animateCounter('mental-health-cases', mentalHealthCases);
            animateCounter('womens-health', womensHealth);
            animateCounter('mens-health', mensHealth);
        }

        // Animate number counter
        function animateCounter(elementId, finalValue, duration = 1500) {
            const element = document.getElementById(elementId);
            const startValue = parseInt(element.textContent) || 0;
            if (startValue === finalValue) return;

            const increment = finalValue > startValue ? 1 : -1;
            const stepTime = Math.abs(Math.floor(duration / (finalValue - startValue)));
            
            let current = startValue;
            const timer = setInterval(() => {
                current += increment;
                element.textContent = current;
                if (current === finalValue) {
                    clearInterval(timer);
                }
            }, Math.max(10, Math.min(100, stepTime)));
        }

        // Initialize health charts
        function initializeHealthCharts() {
            // Health Concerns Distribution Chart
            const healthCtx = document.getElementById('healthChart');
            if (!healthCtx) return;
            
            const healthConcerns = {
                'Mental Health': healthData.filter(r => r.depression || r.stress || r.mentalStigma).length,
                'Academic Pressure': healthData.filter(r => r.academicPressure).length,
                'Sleep Issues': healthData.filter(r => r.sleepIssues).length,
                'Physical Health': healthData.filter(r => r.flu || r.stomachIssues || r.sportsInjury).length,
                'Women\'s Health': healthData.filter(r => r.contraception || r.irregularPeriods || r.menstrualPain).length
            };
            
            chartInstances.healthChart = new Chart(healthCtx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: Object.keys(healthConcerns),
                    datasets: [{
                        data: Object.values(healthConcerns),
                        backgroundColor: [
                            'rgba(156, 39, 176, 0.8)',
                            'rgba(33, 150, 243, 0.8)',
                            'rgba(255, 193, 7, 0.8)',
                            'rgba(76, 175, 80, 0.8)',
                            'rgba(233, 30, 99, 0.8)'
                        ],
                        borderColor: [
                            'rgb(156, 39, 176)',
                            'rgb(33, 150, 243)',
                            'rgb(255, 193, 7)',
                            'rgb(76, 175, 80)',
                            'rgb(233, 30, 99)'
                        ],
                        borderWidth: 2,
                        hoverOffset: 20
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                padding: 25,
                                usePointStyle: true,
                                font: {
                                    size: 13,
                                    family: 'Inter'
                                }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.85)',
                            titleFont: {
                                size: 14,
                                family: 'Inter'
                            },
                            bodyFont: {
                                size: 13,
                                family: 'Inter'
                            },
                            padding: 16,
                            cornerRadius: 8
                        }
                    },
                    animation: {
                        animateScale: true,
                        animateRotate: true,
                        duration: 2000
                    }
                }
            });

            // Gender Distribution Chart
            const genderCtx = document.getElementById('genderChart');
            if (!genderCtx) return;
            
            const genderCounts = {
                'Male': healthData.filter(r => r.gender === 'Male').length,
                'Female': healthData.filter(r => r.gender === 'Female').length,
                'Other': healthData.filter(r => r.gender !== 'Male' && r.gender !== 'Female').length
            };
            
            chartInstances.genderChart = new Chart(genderCtx.getContext('2d'), {
                type: 'pie',
                data: {
                    labels: Object.keys(genderCounts),
                    datasets: [{
                        data: Object.values(genderCounts),
                        backgroundColor: [
                            'rgba(0, 137, 123, 0.9)',
                            'rgba(233, 30, 99, 0.9)',
                            'rgba(117, 117, 117, 0.9)'
                        ],
                        borderColor: [
                            'rgb(0, 137, 123)',
                            'rgb(233, 30, 99)',
                            'rgb(117, 117, 117)'
                        ],
                        borderWidth: 3,
                        hoverOffset: 15
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 25,
                                font: {
                                    size: 13,
                                    family: 'Inter'
                                }
                            }
                        }
                    }
                }
            });
        }

        // Update health charts
        function updateHealthCharts() {
            if (!chartInstances.healthChart || !chartInstances.genderChart) return;
            
            // Update health concerns chart
            const healthConcerns = {
                'Mental Health': healthData.filter(r => r.depression || r.stress || r.mentalStigma).length,
                'Academic Pressure': healthData.filter(r => r.academicPressure).length,
                'Sleep Issues': healthData.filter(r => r.sleepIssues).length,
                'Physical Health': healthData.filter(r => r.flu || r.stomachIssues || r.sportsInjury).length,
                'Women\'s Health': healthData.filter(r => r.contraception || r.irregularPeriods || r.menstrualPain).length
            };
            
            chartInstances.healthChart.data.datasets[0].data = Object.values(healthConcerns);
            chartInstances.healthChart.update();
            
            // Update gender chart
            const genderCounts = {
                'Male': healthData.filter(r => r.gender === 'Male').length,
                'Female': healthData.filter(r => r.gender === 'Female').length,
                'Other': healthData.filter(r => r.gender !== 'Male' && r.gender !== 'Female').length
            };
            
            chartInstances.genderChart.data.datasets[0].data = Object.values(genderCounts);
            chartInstances.genderChart.update();
        }

        // Load recent health submissions
        function loadRecentHealthSubmissions() {
            const recentSubmissions = healthData.slice(0, 6);
            const activityList = document.getElementById('recent-health-list');
            if (!activityList) return;
            
            if (recentSubmissions.length === 0) {
                activityList.innerHTML = `
                    <div class="empty-state" style="text-align: center; padding: 40px 20px; color: var(--gray-500);">
                        <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                        <p style="font-size: 1.1rem; margin-top: 8px;">No recent submissions</p>
                    </div>
                `;
                return;
            }
            
            activityList.innerHTML = recentSubmissions.map((record, index) => `
                <div class="activity-item" onclick="viewHealthDetails('${record.id}')" style="animation-delay: ${index * 0.1}s">
                    <div class="activity-icon health">
                        <i class="fas fa-user-md"></i>
                    </div>
                    <div class="activity-content">
                        <p class="activity-desc">
                            <strong>${record.registrationNumber || 'Unknown'}</strong> - 
                            ${record.mainComplaint ? record.mainComplaint.substring(0, 50) + (record.mainComplaint.length > 50 ? '...' : '') : 'Health concern'}
                        </p>
                        <span class="activity-time">
                            <i class="far fa-clock"></i>
                            ${formatTimestamp(record.submissionTimestamp)} • 
                            <i class="fas fa-map-marker-alt"></i>
                            ${record.location || 'Unknown location'}
                        </span>
                    </div>
                </div>
            `).join('');
        }

        // Load health concerns
        function loadHealthConcerns() {
            const concerns = [
                { name: 'Stress/Anxiety', count: healthData.filter(r => r.stress).length, icon: 'fas fa-brain', color: 'var(--mental-health)' },
                { name: 'Depression', count: healthData.filter(r => r.depression).length, icon: 'fas fa-sad-tear', color: 'var(--warning)' },
                { name: 'Sleep Issues', count: healthData.filter(r => r.sleepIssues).length, icon: 'fas fa-bed', color: 'var(--info)' },
                { name: 'Academic Pressure', count: healthData.filter(r => r.academicPressure).length, icon: 'fas fa-graduation-cap', color: 'var(--academic-health)' },
                { name: 'Sanitary Access', count: healthData.filter(r => r.sanitaryAccess).length, icon: 'fas fa-female', color: 'var(--womens-health)' },
                { name: 'Harassment', count: healthData.filter(r => r.harassment).length, icon: 'fas fa-exclamation-triangle', color: 'var(--error)' }
            ].filter(concern => concern.count > 0).sort((a,b) => b.count - a.count);

            const concernsList = document.getElementById('health-concerns-list');
            if (!concernsList) return;
            
            if (concerns.length === 0) {
                concernsList.innerHTML = `
                    <div class="empty-state" style="text-align: center; padding: 40px 20px; color: var(--gray-500);">
                        <i class="fas fa-check-circle" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                        <p style="font-size: 1.1rem; margin-top: 8px;">No major concerns reported</p>
                    </div>
                `;
                return;
            }
            
            concernsList.innerHTML = concerns.map(concern => `
                <div class="priority-item" onclick="filterByConcern('${concern.name.toLowerCase().replace('/', '-')}')">
                    <span class="priority-label" style="color: ${concern.color}">
                        <i class="${concern.icon}"></i>
                        ${concern.name}
                    </span>
                    <span class="priority-count" style="background: ${concern.color}20; color: ${concern.color}; border-color: ${concern.color}30">
                        ${concern.count}
                    </span>
                </div>
            `).join('');
        }

        // Filter by concern
        function filterByConcern(concern) {
            showSection('health-data');
            const searchInput = document.getElementById('health-search');
            searchInput.value = concern;
            searchInput.dispatchEvent(new Event('input'));
        }

        // ====== ENHANCED HEALTH DATA TABLE WITH HORIZONTAL SCROLLING ======

function populateHealthTable() {
    const tableBody = document.getElementById('health-table-body');
    if (!tableBody) return;
    
    const genderFilter = document.getElementById('gender-filter')?.value || '';
    const locationFilter = document.getElementById('location-filter')?.value || '';
    const concernFilter = document.getElementById('concern-filter')?.value || '';
    const searchTerm = document.getElementById('health-search')?.value.toLowerCase() || '';
    
    // Show loading state
    tableBody.innerHTML = `
        <tr>
            <td colspan="9" class="table-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading health records...</p>
            </td>
        </tr>
    `;
    
    // Add a small delay for better UX
    setTimeout(() => {
        let filteredData = healthData.filter(record => {
            const matchesGender = !genderFilter || record.gender === genderFilter;
            const matchesLocation = !locationFilter || record.location === locationFilter;
            const matchesConcern = !concernFilter || (
                (concernFilter === 'mental' && (record.depression || record.stress || record.mentalStigma)) ||
                (concernFilter === 'academic' && record.academicPressure) ||
                (concernFilter === 'womens' && (record.contraception || record.irregularPeriods || record.menstrualPain)) ||
                (concernFilter === 'general' && (record.flu || record.stomachIssues || record.sportsInjury))
            );
            const matchesSearch = !searchTerm || 
                (record.registrationNumber && record.registrationNumber.toLowerCase().includes(searchTerm)) ||
                (record.email && record.email.toLowerCase().includes(searchTerm)) ||
                (record.mainComplaint && record.mainComplaint.toLowerCase().includes(searchTerm));
            
            return matchesGender && matchesLocation && matchesConcern && matchesSearch;
        });
        
        if (filteredData.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="table-empty">
                        <i class="fas fa-search"></i>
                        <h4>No matching records found</h4>
                        <p>Try adjusting your search or filters</p>
                        <button class="btn btn-primary" onclick="clearFilters()">
                            <i class="fas fa-filter"></i> Clear Filters
                        </button>
                    </td>
                </tr>
            `;
            return;
        }
        
        tableBody.innerHTML = filteredData.map((record, index) => `
            <tr style="animation-delay: ${index * 0.05}s">
                <td>
                    <div style="font-weight: 700; color: var(--primary-700); font-size: 1.05rem;">${record.registrationNumber || 'N/A'}</div>
                    <small style="color: var(--gray-500); font-size: 0.85rem;">${record.email || ''}</small>
                </td>
                <td>
                    <span class="gender-badge ${record.gender === 'Male' ? 'male' : 'female'}" 
                          style="padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="fas fa-${record.gender === 'Male' ? 'mars' : 'venus'}"></i>
                        ${record.gender || 'N/A'}
                    </span>
                </td>
                <td>
                    <i class="fas fa-map-marker-alt" style="color: var(--primary-500); margin-right: 8px;"></i>
                    ${record.location || 'N/A'}
                </td>
                <td title="${record.mainComplaint || ''}">
                    <div style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${(record.mainComplaint || 'N/A').substring(0, 60)}${record.mainComplaint && record.mainComplaint.length > 60 ? '...' : ''}
                    </div>
                </td>
                <td>
                    ${(record.depression || record.stress || record.mentalStigma) ? 
                        '<span class="badge badge-warning">Yes</span>' : 
                        '<span class="badge badge-secondary">No</span>'}
                </td>
                <td>
                    ${(record.contraception || record.irregularPeriods || record.menstrualPain) ? 
                        '<span class="badge badge-accent">Yes</span>' : 
                        '<span class="badge badge-secondary">No</span>'}
                </td>
                <td>
                    <div style="font-size: 0.9rem; font-weight: 500;">${formatTimestamp(record.submissionTimestamp)}</div>
                    <small style="color: var(--gray-500); font-size: 0.8rem;">${formatRelativeTime(record.submissionTimestamp)}</small>
                </td>
                <td>
                    ${getPriorityBadge(record)}
                </td>
                <td>
                    <div class="table-actions" style="display: flex; gap: 8px; justify-content: flex-end;">
                        <button class="btn btn-sm btn-primary" onclick="viewHealthDetails('${record.id}')" 
                                style="padding: 8px 16px; font-size: 0.9rem;" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="exportSingleRecord('${record.id}')" 
                                style="padding: 8px 16px; font-size: 0.9rem;" title="Export Record">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
        // Initialize horizontal scrolling with better UX
        initializeTableScrolling();
        
    }, 300); // Small delay for loading effect
}

function clearFilters() {
    const filters = ['gender-filter', 'location-filter', 'concern-filter', 'health-search'];
    filters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            if (element.tagName === 'SELECT') {
                element.value = '';
            } else if (element.tagName === 'INPUT') {
                element.value = '';
            }
        }
    });
    
    populateHealthTable();
    showToast('Filters cleared', 'success');
}

function initializeTableScrolling() {
    const tableContainer = document.querySelector('#health-data .table-container');
    if (!tableContainer) return;
    
    // Add shadow indicators for horizontal scrolling
    const addScrollIndicators = () => {
        // Remove existing indicators
        const existingIndicators = tableContainer.querySelectorAll('.scroll-indicator');
        existingIndicators.forEach(indicator => indicator.remove());
        
        // Add left indicator
        const leftIndicator = document.createElement('div');
        leftIndicator.className = 'scroll-indicator left';
        leftIndicator.innerHTML = '<i class="fas fa-chevron-left"></i>';
        leftIndicator.style.cssText = `
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 40px;
            background: linear-gradient(90deg, rgba(255,255,255,0.9), transparent);
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
            opacity: ${tableContainer.scrollLeft > 10 ? 1 : 0};
            transition: opacity 0.3s ease;
            z-index: 20;
        `;
        
        // Add right indicator
        const rightIndicator = document.createElement('div');
        rightIndicator.className = 'scroll-indicator right';
        rightIndicator.innerHTML = '<i class="fas fa-chevron-right"></i>';
        rightIndicator.style.cssText = `
            position: absolute;
            right: 0;
            top: 0;
            bottom: 0;
            width: 40px;
            background: linear-gradient(270deg, rgba(255,255,255,0.9), transparent);
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
            opacity: ${tableContainer.scrollLeft + tableContainer.clientWidth < tableContainer.scrollWidth - 10 ? 1 : 0};
            transition: opacity 0.3s ease;
            z-index: 20;
        `;
        
        tableContainer.appendChild(leftIndicator);
        tableContainer.appendChild(rightIndicator);
    };
    
    // Add scroll event listener
    tableContainer.addEventListener('scroll', addScrollIndicators);
    
    // Initial call
    addScrollIndicators();
    
    // Add keyboard navigation
    tableContainer.setAttribute('tabindex', '0');
    tableContainer.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            tableContainer.scrollLeft -= 100;
            e.preventDefault();
        } else if (e.key === 'ArrowRight') {
            tableContainer.scrollLeft += 100;
            e.preventDefault();
        }
    });
    
    // Add touch/swipe support for mobile
    let touchStartX = 0;
    tableContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
    });
    
    tableContainer.addEventListener('touchmove', (e) => {
        e.preventDefault(); // Prevent vertical scroll
    });
    
    tableContainer.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > 50) { // Minimum swipe distance
            if (diff > 0) {
                // Swipe left
                tableContainer.scrollLeft += 300;
            } else {
                // Swipe right
                tableContainer.scrollLeft -= 300;
            }
        }
    });
}

// Add CSS for scroll indicators
const scrollIndicatorStyle = document.createElement('style');
scrollIndicatorStyle.textContent = `
    #health-data .scroll-indicator {
        transition: opacity 0.3s ease;
    }
    
    #health-data .scroll-indicator i {
        font-size: 20px;
        color: var(--primary-600);
        opacity: 0.8;
    }
    
    /* Mobile-specific styles */
    @media (max-width: 768px) {
        #health-data .table-container {
            scroll-snap-type: x mandatory;
        }
        
        #health-data .data-table tr {
            scroll-snap-align: start;
        }
        
        #health-data .scroll-indicator {
            display: none !important;
        }
    }
    
    /* Print styles */
    @media print {
        #health-data .table-container {
            overflow-x: visible !important;
            width: 100% !important;
        }
        
        #health-data .data-table {
            min-width: auto !important;
            width: 100% !important;
        }
        
        #health-data .scroll-indicator {
            display: none !important;
        }
    }
`;
document.head.appendChild(scrollIndicatorStyle);

       
// Function to get priority badge with improved styling
function getPriorityBadge(record) {
    const hasEmergency = record.harassment || record.needSafeSpace || record.pregnancyConcerns;
    const hasHighPriority = record.depression || record.stress || record.menstrualPain;
    
    if (hasEmergency) {
        return '<span class="badge" style="background: linear-gradient(135deg, #F44336 0%, #D32F2F 100%); color: white; border-color: #F44336; padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">' +
               '<i class="fas fa-exclamation-circle"></i> Emergency' +
               '</span>';
    } else if (hasHighPriority) {
        return '<span class="badge" style="background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%); color: white; border-color: #FF9800; padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">' +
               '<i class="fas fa-exclamation-triangle"></i> High' +
               '</span>';
    } else {
        return '<span class="badge" style="background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%); color: white; border-color: #4CAF50; padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">' +
               '<i class="fas fa-check-circle"></i> Normal' +
               '</span>';
    }
}

// Function to optimize table performance on resize
function optimizeTableOnResize() {
    const tableContainer = document.querySelector('#health-data .table-container');
    if (!tableContainer) return;
    
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Reinitialize scrolling on resize
            initializeTableScrolling();
            
            // Update column visibility based on screen size
            updateColumnVisibility();
        }, 250);
    });
}

// Function to show/hide columns based on screen width
function updateColumnVisibility() {
    const screenWidth = window.innerWidth;
    const table = document.querySelector('#health-data .data-table');
    if (!table) return;
    
    const columns = table.querySelectorAll('th, td');
    
    // Reset all columns to visible
    columns.forEach(col => {
        col.style.display = '';
    });
    
    // Hide columns progressively as screen gets smaller
    if (screenWidth < 768) {
        // Hide location and main complaint columns
        const hideIndices = [3, 4];
        hideIndices.forEach(index => {
            table.querySelectorAll(`th:nth-child(${index}), td:nth-child(${index})`).forEach(el => {
                el.style.display = 'none';
            });
        });
    }
    
    if (screenWidth < 576) {
        // Hide additional columns
        const hideIndices = [7, 8];
        hideIndices.forEach(index => {
            table.querySelectorAll(`th:nth-child(${index}), td:nth-child(${index})`).forEach(el => {
                el.style.display = 'none';
            });
        });
    }
}


        // Update settings categories
        function updateSettingsCategories() {
            const concerns = [
                { name: 'Mental Health', count: healthData.filter(r => r.depression || r.stress || r.mentalStigma).length, color: 'var(--mental-health)' },
                { name: 'Women\'s Health', count: healthData.filter(r => r.contraception || r.irregularPeriods || r.menstrualPain).length, color: 'var(--womens-health)' },
                { name: 'General Health', count: healthData.filter(r => r.flu || r.stomachIssues || r.sportsInjury).length, color: 'var(--general-health)' },
                { name: 'Academic Health', count: healthData.filter(r => r.academicPressure).length, color: 'var(--academic-health)' }
            ];
            
            const categoriesList = document.getElementById('health-categories-settings');
            if (!categoriesList) return;
            
            categoriesList.innerHTML = concerns.map(c => `
                <div class="priority-item">
                    <span class="priority-label">
                        <i class="fas fa-circle" style="color: ${c.color}"></i>
                        ${c.name}
                    </span>
                    <span class="priority-count" style="background: ${c.color}20; color: ${c.color}; border: 2px solid ${c.color}30">
                        ${c.count} cases
                    </span>
                </div>
            `).join('');
        }

        // Format timestamp
        function formatTimestamp(timestamp) {
            if (!timestamp) return 'N/A';
            
            let date;
            if (timestamp.toDate) {
                date = timestamp.toDate();
            } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
                date = new Date(timestamp);
            } else {
                return 'Invalid Date';
            }
            
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        // Format relative time
        function formatRelativeTime(timestamp) {
            if (!timestamp) return '';
            
            let date;
            if (timestamp.toDate) {
                date = timestamp.toDate();
            } else {
                date = new Date(timestamp);
            }
            
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);
            
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
            return `${Math.floor(diffDays / 7)}w ago`;
        }

        // View health details modal
        function viewHealthDetails(recordId) {
            const record = healthData.find(r => r.id === recordId);
            if (!record) return;

            const modal = document.getElementById('healthDetailModal');
            const modalBody = modal.querySelector('#modal-body');
            const modalTitle = modal.querySelector('#modal-title');
            
            modalTitle.innerHTML = `<i class="fas fa-file-medical-alt"></i> Health Record: ${record.registrationNumber || 'Unknown'}`;
            
            // Build detailed view
            let detailsHTML = '<div class="health-details-grid">';
            
            // Personal Information
            detailsHTML += `
                <div class="detail-item full-width">
                    <h4 style="color: var(--primary-700); margin-bottom: 16px; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-user-circle"></i> Personal Information
                    </h4>
                </div>
                <div class="detail-item">
                    <label><i class="fas fa-id-card"></i> Registration Number</label>
                    <span style="font-weight: 600; color: var(--primary-600);">${record.registrationNumber || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <label><i class="fas fa-envelope"></i> Email</label>
                    <span>${record.email || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <label><i class="fas fa-venus-mars"></i> Gender</label>
                    <span>
                        <i class="fas fa-${record.gender === 'Male' ? 'mars' : 'venus'}" 
                           style="color: ${record.gender === 'Male' ? 'var(--primary-600)' : 'var(--accent-600)'}; margin-right: 8px;"></i>
                        ${record.gender || 'N/A'}
                    </span>
                </div>
                <div class="detail-item">
                    <label><i class="fas fa-map-marker-alt"></i> Location</label>
                    <span>${record.location || 'N/A'}</span>
                </div>
            `;
            
            // Main Complaint
            detailsHTML += `
                <div class="detail-item full-width">
                    <label><i class="fas fa-comment-medical"></i> Main Complaint</label>
                    <div style="background: var(--gray-50); padding: 20px; border-radius: var(--border-radius-sm); margin-top: 12px; border-left: 4px solid var(--primary-500);">
                        <p style="color: var(--gray-800); line-height: 1.6; white-space: pre-wrap; font-size: 1.05rem;">${record.mainComplaint || 'No complaint specified'}</p>
                    </div>
                </div>
            `;
            
            // General Health Issues
            const generalIssues = [];
            if (record.stress) generalIssues.push({ name: 'Stress/Anxiety', color: 'var(--warning)' });
            if (record.depression) generalIssues.push({ name: 'Depression', color: 'var(--mental-health)' });
            if (record.sleepIssues) generalIssues.push({ name: 'Sleep Issues', color: 'var(--info)' });
            if (record.academicPressure) generalIssues.push({ name: 'Academic Pressure', color: 'var(--academic-health)' });
            if (record.flu) generalIssues.push({ name: 'Flu/Common Cold', color: 'var(--general-health)' });
            if (record.stomachIssues) generalIssues.push({ name: 'Stomach Issues', color: 'var(--general-health)' });
            
            if (generalIssues.length > 0) {
                detailsHTML += `
                    <div class="detail-item full-width">
                        <label><i class="fas fa-stethoscope"></i> General Health Issues</label>
                        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px;">
                            ${generalIssues.map(issue => `
                                <span style="background: ${issue.color}20; color: ${issue.color}; padding: 8px 16px; border-radius: var(--border-radius-sm); font-size: 0.95rem; font-weight: 600; border: 2px solid ${issue.color}30;">
                                    <i class="fas fa-check-circle" style="margin-right: 8px;"></i>${issue.name}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
            
            // Gender-specific issues
            if (record.gender === 'Female') {
                const womensIssues = [];
                if (record.menstrualPain) womensIssues.push({ name: 'Menstrual Pain', color: 'var(--womens-health)' });
                if (record.irregularPeriods) womensIssues.push({ name: 'Irregular Periods', color: 'var(--womens-health)' });
                if (record.sanitaryAccess) womensIssues.push({ name: 'Sanitary Access', color: 'var(--accent-600)' });
                if (record.contraception) womensIssues.push({ name: 'Contraception', color: 'var(--accent-600)' });
                if (record.stiConcerns) womensIssues.push({ name: 'STI Concerns', color: 'var(--error)' });
                if (record.pregnancyConcerns) womensIssues.push({ name: 'Pregnancy Concerns', color: 'var(--error)' });
                if (record.harassment) womensIssues.push({ name: 'Harassment', color: 'var(--emergency)' });
                if (record.needSafeSpace) womensIssues.push({ name: 'Needs Safe Space', color: 'var(--emergency)' });
                
                if (womensIssues.length > 0) {
                    detailsHTML += `
                        <div class="detail-item full-width">
                            <label><i class="fas fa-venus"></i> Women's Health Issues</label>
                            <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px;">
                                ${womensIssues.map(issue => `
                                    <span style="background: ${issue.color}20; color: ${issue.color}; padding: 8px 16px; border-radius: var(--border-radius-sm); font-size: 0.95rem; font-weight: 600; border: 2px solid ${issue.color}30;">
                                        <i class="fas fa-female" style="margin-right: 8px;"></i>${issue.name}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }
            }
            
            if (record.gender === 'Male') {
                const mensIssues = [];
                if (record.mentalStigma) mensIssues.push({ name: 'Mental Health Stigma', color: 'var(--mental-health)' });
                if (record.sportsInjury) mensIssues.push({ name: 'Sports Injury', color: 'var(--primary-600)' });
                if (record.sexualHealthMale) mensIssues.push({ name: 'Sexual Health', color: 'var(--primary-600)' });
                
                if (mensIssues.length > 0) {
                    detailsHTML += `
                        <div class="detail-item full-width">
                            <label><i class="fas fa-mars"></i> Men's Health Issues</label>
                            <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px;">
                                ${mensIssues.map(issue => `
                                    <span style="background: ${issue.color}20; color: ${issue.color}; padding: 8px 16px; border-radius: var(--border-radius-sm); font-size: 0.95rem; font-weight: 600; border: 2px solid ${issue.color}30;">
                                        <i class="fas fa-male" style="margin-right: 8px;"></i>${issue.name}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }
            }
            
            // Submission Information
            detailsHTML += `
                <div class="detail-item full-width">
                    <label><i class="fas fa-calendar-check"></i> Submission Details</label>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; margin-top: 12px;">
                        <div>
                            <small style="color: var(--gray-600); font-size: 0.9rem;">Submitted</small>
                            <div style="font-weight: 600; color: var(--gray-800); font-size: 1.1rem;">${formatTimestamp(record.submissionTimestamp)}</div>
                        </div>
                        <div>
                            <small style="color: var(--gray-600); font-size: 0.9rem;">Time Since</small>
                            <div style="font-weight: 600; color: var(--primary-600); font-size: 1.1rem;">${formatRelativeTime(record.submissionTimestamp)}</div>
                        </div>
                        <div>
                            <small style="color: var(--gray-600); font-size: 0.9rem;">Priority Level</small>
                            <div>${getPriorityBadge(record)}</div>
                        </div>
                    </div>
                </div>
            `;
            
            detailsHTML += '</div>';
            modalBody.innerHTML = detailsHTML;
            modal.style.display = 'flex';
        }

        // Close health modal
        function closeHealthModal() {
            const modal = document.getElementById('healthDetailModal');
            modal.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }

        // Show add record modal
        function showAddRecordModal() {
            const modal = document.getElementById('addRecordModal');
            modal.style.display = 'flex';
        }

        // Close add record modal
        function closeAddRecordModal() {
            const modal = document.getElementById('addRecordModal');
            modal.style.display = 'none';
            document.getElementById('addRecordForm').reset();
        }

        // Submit new record
        async function submitNewRecord(event) {
            event.preventDefault();
            
            const newRecord = {
                registrationNumber: document.getElementById('new-patient-id').value,
                fullName: document.getElementById('new-patient-name').value,
                gender: document.getElementById('new-patient-gender').value,
                age: parseInt(document.getElementById('new-patient-age').value),
                location: document.getElementById('new-patient-location').value,
                mainComplaint: document.getElementById('new-main-complaint').value,
                stress: document.getElementById('new-stress').checked,
                depression: document.getElementById('new-depression').checked,
                sleepIssues: document.getElementById('new-sleep-issues').checked,
                academicPressure: document.getElementById('new-academic-pressure').checked,
                flu: document.getElementById('new-flu').checked,
                stomachIssues: document.getElementById('new-stomach-issues').checked,
                additionalNotes: document.getElementById('new-additional-notes').value,
                contactNumber: document.getElementById('new-contact-number').value,
                email: document.getElementById('new-email').value,
                submissionTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
                addedBy: currentUser.email,
                status: 'pending'
            };
            
            try {
                await db.collection('health').add(newRecord);
                showToast('Health record added successfully', 'success');
                closeAddRecordModal();
            } catch (error) {
                console.error('Error adding record:', error);
                showToast('Error adding record', 'error');
            }
        }

        // Export health data
        function exportHealthData() {
            if (healthData.length === 0) {
                showToast('No data to export', 'error');
                return;
            }
            
            const headers = ['Patient ID', 'Full Name', 'Gender', 'Age', 'Location', 'Main Complaint', 'Stress', 'Depression', 'Sleep Issues', 'Academic Pressure', 'Flu', 'Stomach Issues', 'Contact', 'Email', 'Submitted'];
            const csvData = healthData.map(record => [
                record.registrationNumber || '',
                record.fullName || '',
                record.gender || '',
                record.age || '',
                record.location || '',
                (record.mainComplaint || '').replace(/,/g, ';'),
                record.stress ? 'Yes' : 'No',
                record.depression ? 'Yes' : 'No',
                record.sleepIssues ? 'Yes' : 'No',
                record.academicPressure ? 'Yes' : 'No',
                record.flu ? 'Yes' : 'No',
                record.stomachIssues ? 'Yes' : 'No',
                record.contactNumber || '',
                record.email || '',
                formatTimestamp(record.submissionTimestamp)
            ]);
            
            const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `health-data-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
            
            showToast(`Exported ${healthData.length} records successfully`, 'success');
        }

        // Export single record
        function exportSingleRecord(recordId) {
            const record = healthData.find(r => r.id === recordId);
            if (!record) return;
            
            const data = {
                'Patient ID': record.registrationNumber || 'N/A',
                'Full Name': record.fullName || 'N/A',
                'Gender': record.gender || 'N/A',
                'Age': record.age || 'N/A',
                'Location': record.location || 'N/A',
                'Main Complaint': record.mainComplaint || 'N/A',
                'Stress/Anxiety': record.stress ? 'Yes' : 'No',
                'Depression': record.depression ? 'Yes' : 'No',
                'Sleep Issues': record.sleepIssues ? 'Yes' : 'No',
                'Academic Pressure': record.academicPressure ? 'Yes' : 'No',
                'Flu': record.flu ? 'Yes' : 'No',
                'Stomach Issues': record.stomachIssues ? 'Yes' : 'No',
                'Contact Number': record.contactNumber || 'N/A',
                'Email': record.email || 'N/A',
                'Submitted': formatTimestamp(record.submissionTimestamp),
                'Added By': record.addedBy || 'N/A',
                'Status': record.status || 'pending'
            };
            
            const text = Object.entries(data).map(([key, value]) => `${key}: ${value}`).join('\n');
            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `health-record-${record.registrationNumber || 'unknown'}.txt`;
            a.click();
            window.URL.revokeObjectURL(url);
            
            showToast('Record exported successfully', 'success');
        }

        // Print record
        function printRecord() {
            window.print();
        }

        // Logout function
        function logout() {
            showToast('Logging out...', 'info');
            setTimeout(() => {
                auth.signOut().then(() => {
                    window.location.href = '../../../index.html';
                }).catch((error) => {
                    console.error('Logout error:', error);
                    showToast('Logout failed', 'error');
                });
            }, 1000);
        }

        // Navigation functionality
        document.addEventListener('DOMContentLoaded', function() {
            // Menu item click handlers
            const menuItems = document.querySelectorAll('.menu-item');
            menuItems.forEach(item => {
                item.addEventListener('click', function() {
                    const target = this.getAttribute('data-target');
                    showSection(target);
                });
            });

            // Filter and search listeners
            const filters = ['gender-filter', 'location-filter', 'concern-filter', 'health-search'];
            filters.forEach(filterId => {
                const element = document.getElementById(filterId);
                if (element) {
                    element.addEventListener('input', populateHealthTable);
                    element.addEventListener('change', populateHealthTable);
                }
            });

            // Initialize empty states
            populateHealthTable();
            loadNotifications();
        });

        // Show section
        function showSection(sectionId) {
            const menuItems = document.querySelectorAll('.menu-item');
            const contentSections = document.querySelectorAll('.content-section');
            
            // Update active menu item
            menuItems.forEach(item => {
                item.classList.remove('active');
                if (item.getAttribute('data-target') === sectionId) {
                    item.classList.add('active');
                }
            });
          //health section
            if (sectionId === 'health-data') {
        // Wait for table to render, then optimize
        setTimeout(() => {
            optimizeTableOnResize();
            updateColumnVisibility();
            initializeTableScrolling();
        }, 500);
    }
            
            // Show selected section
            contentSections.forEach(section => {
                section.classList.remove('active');
                if (section.id === sectionId) {
                    section.classList.add('active');
                    
                    // Update page title
                    const title = document.querySelector(`[data-target="${sectionId}"] span`).textContent;
                    document.getElementById('page-title').textContent = title;
                    document.getElementById('page-subtitle').textContent = 
                        `University of Eldoret Health Department | ${title}`;
                    
                    // Scroll to top
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        }

        // Load notifications
        async function loadNotifications() {
            try {
                // Simulate notifications for now
                notifications = [
                    { id: 1, type: 'warning', message: '3 new mental health cases require attention', time: '10 minutes ago' },
                    { id: 2, type: 'info', message: 'Weekly health report is ready for review', time: '2 hours ago' },
                    { id: 3, type: 'success', message: 'Health workshop scheduled for Friday', time: '1 day ago' }
                ];
                
                document.getElementById('notification-count').textContent = notifications.length;
                
            } catch (error) {
                console.error('Error loading notifications:', error);
            }
        }

        // Check for new notifications
        function checkForNewNotifications() {
            // This would check for new notifications in real-time
            // For now, we'll simulate checking
            const newNotifications = healthData.filter(record => {
                const recordTime = record.submissionTimestamp?.toDate?.() || new Date(record.submissionTimestamp);
                const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
                return recordTime > fiveMinutesAgo;
            }).length;
            
            if (newNotifications > 0) {
                document.getElementById('notification-count').textContent = newNotifications;
            }
        }

        // Close modals when clicking outside
        window.onclick = function(event) {
            const healthModal = document.getElementById('healthDetailModal');
            const addRecordModal = document.getElementById('addRecordModal');
            
            if (event.target === healthModal) {
                closeHealthModal();
            }
            if (event.target === addRecordModal) {
                closeAddRecordModal();
            }
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            // Ctrl/Cmd + K for search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('health-search').focus();
            }
            
            // Escape to close modals
            if (e.key === 'Escape') {
                closeHealthModal();
                closeAddRecordModal();
            }
            
            // Ctrl/Cmd + E to export
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                exportHealthData();
            }
            
            // Ctrl/Cmd + N to add new record
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                showAddRecordModal();
            }
        });

        // Add fadeOut animation
        if (!document.getElementById('animations-style')) {
            const style = document.createElement('style');
            style.id = 'animations-style';
            style.textContent = `
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
                
                .empty-state {
                    text-align: center;
                    padding: 40px 20px;
                    color: var(--gray-500);
                }
                
                .empty-state i {
                    font-size: 48px;
                    margin-bottom: 16px;
                    opacity: 0.5;
                }
                
                .empty-state p {
                    font-size: 1.1rem;
                    margin-top: 8px;
                }
            `;
            document.head.appendChild(style);
        }
        // ============================================
// PROFESSIONAL NOTIFICATION SYSTEM
// ============================================

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.notificationListener = null;
        this.isPanelOpen = false;
        this.currentUserId = null;
        
        this.init();
    }

    async init() {
        // Wait for user authentication
        this.waitForUser().then(() => {
            this.setupEventListeners();
            this.startRealTimeNotifications();
            this.loadInitialNotifications();
        });
    }

    async waitForUser() {
        return new Promise((resolve) => {
            const unsubscribe = auth.onAuthStateChanged((user) => {
                if (user) {
                    this.currentUserId = user.uid;
                    unsubscribe();
                    resolve();
                }
            });
        });
    }

    setupEventListeners() {
        // Notification bell click
        document.getElementById('notificationBell').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleNotificationPanel();
        });

        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('notificationPanel');
            const container = document.getElementById('notificationsContainer');
            
            if (panel && panel.classList.contains('active') && 
                !panel.contains(e.target) && 
                !container.contains(e.target)) {
                this.closeNotificationPanel();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isPanelOpen) {
                this.closeNotificationPanel();
            }
            
            // Ctrl/Cmd + Shift + N for notifications
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
                e.preventDefault();
                this.toggleNotificationPanel();
            }
        });
    }

    toggleNotificationPanel() {
        const panel = document.getElementById('notificationPanel');
        if (!panel) return;

        if (this.isPanelOpen) {
            this.closeNotificationPanel();
        } else {
            this.openNotificationPanel();
        }
    }

    openNotificationPanel() {
        const panel = document.getElementById('notificationPanel');
        if (!panel) return;

        panel.classList.add('active');
        this.isPanelOpen = true;
        
        // Add backdrop
        this.addBackdrop();
        
        // Mark notifications as read when panel opens
        this.markNotificationsAsRead();
        
        // Animate bell
        document.getElementById('notificationBell').style.transform = 'rotate(20deg)';
        setTimeout(() => {
            document.getElementById('notificationBell').style.transform = 'rotate(0deg)';
        }, 300);
    }

    closeNotificationPanel() {
        const panel = document.getElementById('notificationPanel');
        if (!panel) return;

        panel.classList.remove('active');
        this.isPanelOpen = false;
        
        // Remove backdrop
        this.removeBackdrop();
    }

    addBackdrop() {
        if (document.getElementById('notificationBackdrop')) return;
        
        const backdrop = document.createElement('div');
        backdrop.id = 'notificationBackdrop';
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.2);
            z-index: 999;
            animation: fadeIn 0.2s ease;
        `;
        backdrop.addEventListener('click', () => this.closeNotificationPanel());
        document.body.appendChild(backdrop);
    }

    removeBackdrop() {
        const backdrop = document.getElementById('notificationBackdrop');
        if (backdrop) {
            backdrop.style.animation = 'fadeOut 0.2s ease';
            setTimeout(() => {
                if (backdrop.parentNode) {
                    backdrop.parentNode.removeChild(backdrop);
                }
            }, 200);
        }
    }

    async loadInitialNotifications() {
        try {
            if (!this.currentUserId) return;
            
            const snapshot = await db.collection('notifications')
                .where('userId', '==', this.currentUserId)
                .orderBy('timestamp', 'desc')
                .limit(20)
                .get();
            
            this.notifications = [];
            snapshot.forEach(doc => {
                this.notifications.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            this.updateNotificationCount();
            this.renderNotifications();
            
        } catch (error) {
            console.error('Error loading notifications:', error);
            showToast('Failed to load notifications', 'error');
        }
    }

    startRealTimeNotifications() {
        if (!this.currentUserId) return;
        
        if (this.notificationListener) {
            this.notificationListener();
        }
        
        this.notificationListener = db.collection('notifications')
            .where('userId', '==', this.currentUserId)
            .orderBy('timestamp', 'desc')
            .onSnapshot((snapshot) => {
                const updates = [];
                
                snapshot.docChanges().forEach(change => {
                    const notification = {
                        id: change.doc.id,
                        ...change.doc.data()
                    };
                    
                    if (change.type === 'added') {
                        // New notification
                        updates.push({ type: 'added', notification });
                        this.showNewNotificationAlert(notification);
                    } else if (change.type === 'modified') {
                        // Updated notification
                        updates.push({ type: 'modified', notification });
                    } else if (change.type === 'removed') {
                        // Removed notification
                        updates.push({ type: 'removed', id: change.doc.id });
                    }
                });
                
                // Process all updates
                this.processNotificationUpdates(updates);
                
            }, (error) => {
                console.error('Notification listener error:', error);
                if (error.code === 'failed-precondition') {
                    // Handle missing index error
                    this.showIndexWarning();
                }
            });
    }

    processNotificationUpdates(updates) {
        updates.forEach(update => {
            if (update.type === 'added') {
                // Add to beginning of array (newest first)
                this.notifications.unshift(update.notification);
            } else if (update.type === 'modified') {
                // Update existing notification
                const index = this.notifications.findIndex(n => n.id === update.notification.id);
                if (index !== -1) {
                    this.notifications[index] = update.notification;
                }
            } else if (update.type === 'removed') {
                // Remove notification
                this.notifications = this.notifications.filter(n => n.id !== update.id);
            }
        });
        
        // Sort by timestamp (newest first)
        this.notifications.sort((a, b) => {
            const timeA = a.timestamp?.toDate?.() || new Date(a.timestamp);
            const timeB = b.timestamp?.toDate?.() || new Date(b.timestamp);
            return timeB - timeA;
        });
        
        this.updateNotificationCount();
        this.renderNotifications();
    }

    showNewNotificationAlert(notification) {
        // Skip if panel is open
        if (this.isPanelOpen) return;
        
        // Show desktop notification if permitted
        if (Notification.permission === 'granted') {
            new Notification(notification.title, {
                body: notification.message,
                icon: '/frontend/assets/uoe.jpg',
                tag: notification.id
            });
        }
        
        // Show toast notification
        if (notification.type === 'emergency' || notification.type === 'new_report') {
            showToast(`📣 ${notification.title}: ${notification.message}`, 'info', 5000);
        }
        
        // Animate badge
        this.animateBadge();
    }

    animateBadge() {
        const badge = document.getElementById('notificationCount');
        if (!badge) return;
        
        badge.style.animation = 'none';
        setTimeout(() => {
            badge.style.animation = 'pulse 0.5s ease 3';
        }, 10);
        
        // Animate bell
        const bell = document.getElementById('notificationBell');
        bell.style.transform = 'rotate(-20deg) scale(1.1)';
        setTimeout(() => {
            bell.style.transform = 'rotate(0deg) scale(1)';
        }, 300);
    }

    updateNotificationCount() {
        this.unreadCount = this.notifications.filter(n => !n.read).length;
        const badge = document.getElementById('notificationCount');
        
        if (badge) {
            badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
            
            if (this.unreadCount === 0) {
                badge.style.display = 'none';
            } else {
                badge.style.display = 'flex';
                
                // Add emergency badge style for urgent notifications
                const hasEmergency = this.notifications.some(n => 
                    !n.read && (n.type === 'emergency' || n.priority === 'high')
                );
                
                if (hasEmergency) {
                    badge.style.background = 'linear-gradient(135deg, var(--error) 0%, #D32F2F 100%)';
                    badge.style.animation = 'pulse 1s infinite';
                } else {
                    badge.style.background = 'linear-gradient(135deg, var(--accent-500) 0%, var(--accent-700) 100%)';
                    badge.style.animation = 'pulse 2s infinite cubic-bezier(0.4, 0, 0.6, 1)';
                }
            }
        }
    }

    renderNotifications() {
        const container = document.getElementById('notificationList');
        if (!container) return;
        
        if (this.notifications.length === 0) {
            container.innerHTML = `
                <div class="notification-empty-state">
                    <i class="fas fa-bell-slash"></i>
                    <p>No notifications yet</p>
                    <small>You're all caught up!</small>
                </div>
            `;
            return;
        }
        
        // Get only recent notifications (last 10 for panel)
        const recentNotifications = this.notifications.slice(0, 10);
        
        container.innerHTML = recentNotifications.map(notification => {
            const timestamp = notification.timestamp?.toDate?.() || new Date(notification.timestamp);
            const timeAgo = this.formatTimeAgo(timestamp);
            const isUnread = !notification.read;
            const isEmergency = notification.type === 'emergency' || notification.priority === 'high';
            
            return `
                <div class="notification-item ${isUnread ? 'unread' : ''} ${isEmergency ? 'emergency' : ''} type-${notification.type || 'system'}" 
                     data-id="${notification.id}"
                     onclick="notificationManager.handleNotificationClick('${notification.id}', '${notification.type}', '${notification.reportId || ''}')">
                    <div style="display: flex; align-items: flex-start; gap: 16px;">
                        <div class="notification-icon ${this.getNotificationIconClass(notification)}">
                            <i class="${this.getNotificationIcon(notification)}"></i>
                        </div>
                        <div class="notification-content">
                            <div class="notification-title">
                                <span>${notification.title || 'Notification'}</span>
                                ${isUnread ? '<span class="unread-dot" style="width: 8px; height: 8px; background: var(--primary-500); border-radius: 50%; display: inline-block;"></span>' : ''}
                            </div>
                            <div class="notification-message">
                                ${notification.message || 'No message'}
                            </div>
                            <div class="notification-meta">
                                <span class="notification-time">
                                    <i class="far fa-clock"></i>
                                    ${timeAgo}
                                </span>
                                <span class="notification-type">
                                    ${this.getNotificationTypeLabel(notification)}
                                </span>
                            </div>
                            ${this.getNotificationActions(notification)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getNotificationIconClass(notification) {
        switch (notification.type) {
            case 'new_report': return 'new-report';
            case 'emergency': return 'emergency';
            case 'update': return 'update';
            default: return 'system';
        }
    }

    getNotificationIcon(notification) {
        switch (notification.type) {
            case 'new_report': return 'fas fa-file-medical-alt';
            case 'emergency': return 'fas fa-exclamation-triangle';
            case 'update': return 'fas fa-sync-alt';
            default: return 'fas fa-cog';
        }
    }

    getNotificationTypeLabel(notification) {
        switch (notification.type) {
            case 'new_report': return '📋 New Report';
            case 'emergency': return '🚨 Emergency';
            case 'update': return '🔄 Update';
            default: return '⚙️ System';
        }
    }

    getNotificationActions(notification) {
        if (!notification.reportId) return '';
        
        return `
            <div class="notification-actions-container">
                <button class="notification-action-small view" 
                        onclick="event.stopPropagation(); notificationManager.viewReport('${notification.reportId}')">
                    <i class="fas fa-eye"></i> View Report
                </button>
                <button class="notification-action-small dismiss" 
                        onclick="event.stopPropagation(); notificationManager.dismissNotification('${notification.id}')">
                    <i class="fas fa-times"></i> Dismiss
                </button>
            </div>
        `;
    }

    formatTimeAgo(timestamp) {
        const now = new Date();
        const diffMs = now - timestamp;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return timestamp.toLocaleDateString();
    }

    async handleNotificationClick(notificationId, type, reportId) {
        // Mark as read
        await this.markAsRead(notificationId);
        
        // Handle action based on type
        switch (type) {
            case 'new_report':
            case 'emergency':
                if (reportId) {
                    this.viewReport(reportId);
                }
                break;
            default:
                // Just mark as read
                break;
        }
    }

    async markAsRead(notificationId) {
        try {
            await db.collection('notifications').doc(notificationId).update({
                read: true,
                readAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Update local state
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification) {
                notification.read = true;
                this.updateNotificationCount();
                this.renderNotifications();
            }
            
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    async markAllAsRead() {
        try {
            const unreadNotifications = this.notifications.filter(n => !n.read);
            
            const batch = db.batch();
            unreadNotifications.forEach(notification => {
                const ref = db.collection('notifications').doc(notification.id);
                batch.update(ref, {
                    read: true,
                    readAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
            
            await batch.commit();
            
            // Update local state
            this.notifications.forEach(n => n.read = true);
            this.updateNotificationCount();
            this.renderNotifications();
            
            showToast('All notifications marked as read', 'success');
            
        } catch (error) {
            console.error('Error marking all as read:', error);
            showToast('Failed to mark all as read', 'error');
        }
    }

    async dismissNotification(notificationId) {
        try {
            await db.collection('notifications').doc(notificationId).delete();
            
            // Update local state
            this.notifications = this.notifications.filter(n => n.id !== notificationId);
            this.updateNotificationCount();
            this.renderNotifications();
            
            showToast('Notification dismissed', 'success');
            
        } catch (error) {
            console.error('Error dismissing notification:', error);
            showToast('Failed to dismiss notification', 'error');
        }
    }

    async clearNotifications() {
        if (!confirm('Are you sure you want to clear all notifications?')) return;
        
        try {
            const notifications = this.notifications;
            
            const batch = db.batch();
            notifications.forEach(notification => {
                const ref = db.collection('notifications').doc(notification.id);
                batch.delete(ref);
            });
            
            await batch.commit();
            
            // Update local state
            this.notifications = [];
            this.updateNotificationCount();
            this.renderNotifications();
            
            showToast('All notifications cleared', 'success');
            
        } catch (error) {
            console.error('Error clearing notifications:', error);
            showToast('Failed to clear notifications', 'error');
        }
    }

    async viewReport(reportId) {
        try {
            // Close notification panel
            this.closeNotificationPanel();
            
            // Show loading
            showToast('Loading report details...', 'info');
            
            // Fetch report details
            const reportDoc = await db.collection('reports').doc(reportId).get();
            
            if (!reportDoc.exists) {
                showToast('Report not found', 'error');
                return;
            }
            
            const report = reportDoc.data();
            
            // Show report in modal or navigate
            this.showReportModal(report);
            
        } catch (error) {
            console.error('Error viewing report:', error);
            showToast('Failed to load report', 'error');
        }
    }

    showReportModal(report) {
        // Create and show a modal with report details
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3><i class="fas fa-file-medical-alt"></i> Report Details</h3>
                    <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="health-details-grid">
                        <div class="detail-item">
                            <label><i class="fas fa-tag"></i> Category</label>
                            <span>${report.category || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <label><i class="fas fa-user"></i> Submitted By</label>
                            <span>${report.anonymous ? 'Anonymous' : (report.admNo || 'N/A')}</span>
                        </div>
                        <div class="detail-item">
                            <label><i class="fas fa-calendar"></i> Date</label>
                            <span>${new Date(report.timestamp?.toDate?.() || report.timestamp).toLocaleString()}</span>
                        </div>
                        <div class="detail-item full-width">
                            <label><i class="fas fa-comment"></i> Description</label>
                            <div style="background: var(--gray-50); padding: 16px; border-radius: var(--border-radius-sm); margin-top: 8px;">
                                <p style="color: var(--gray-800); line-height: 1.6; white-space: pre-wrap;">${report.description || 'No description'}</p>
                            </div>
                        </div>
                        ${report.location ? `
                        <div class="detail-item">
                            <label><i class="fas fa-map-marker-alt"></i> Location</label>
                            <span>${report.location}</span>
                        </div>
                        ` : ''}
                        ${report.contact ? `
                        <div class="detail-item">
                            <label><i class="fas fa-phone-alt"></i> Contact</label>
                            <span>${report.contact}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">
                        <i class="fas fa-times"></i> Close
                    </button>
                    <button class="btn btn-primary" onclick="handleReportAction('${report.id}', 'assign')">
                        <i class="fas fa-user-md"></i> Assign to Department
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'flex';
    }

    async refreshNotifications() {
        showToast('Refreshing notifications...', 'info');
        await this.loadInitialNotifications();
        showToast('Notifications refreshed', 'success');
    }

    showAllNotifications() {
        // Navigate to dedicated notifications page or show expanded view
        this.closeNotificationPanel();
        
        // For now, show all in current panel
        const container = document.getElementById('notificationList');
        if (!container) return;
        
        container.innerHTML = this.notifications.map(notification => {
            const timestamp = notification.timestamp?.toDate?.() || new Date(notification.timestamp);
            const timeAgo = this.formatTimeAgo(timestamp);
            const isUnread = !notification.read;
            
            return `
                <div class="notification-item ${isUnread ? 'unread' : ''}" 
                     data-id="${notification.id}">
                    <div style="display: flex; align-items: flex-start; gap: 16px;">
                        <div class="notification-icon ${this.getNotificationIconClass(notification)}">
                            <i class="${this.getNotificationIcon(notification)}"></i>
                        </div>
                        <div class="notification-content">
                            <div class="notification-title">
                                <span>${notification.title || 'Notification'}</span>
                                <small>${new Date(timestamp).toLocaleString()}</small>
                            </div>
                            <div class="notification-message">
                                ${notification.message || 'No message'}
                            </div>
                            <div class="notification-meta">
                                <span>Type: ${notification.type || 'system'}</span>
                                <span>${isUnread ? 'Unread' : 'Read'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        showToast(`Showing all ${this.notifications.length} notifications`, 'info');
    }

    showIndexWarning() {
        console.warn('Firestore index missing for notifications query. Creating indexes...');
        showToast('Setting up notifications system...', 'warning');
        
        // You would typically create composite indexes in Firebase Console
        // For now, use a less efficient query or prompt user
        const warning = document.createElement('div');
        warning.className = 'toast toast-warning';
        warning.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>Notifications system needs optimization. Please create composite indexes in Firebase Console.</span>
        `;
        document.body.appendChild(warning);
        
        setTimeout(() => {
            if (warning.parentNode) {
                warning.parentNode.removeChild(warning);
            }
        }, 5000);
    }
}

// Initialize Notification Manager
let notificationManager;

// Initialize after Firebase is ready
auth.onAuthStateChanged((user) => {
    if (user) {
        notificationManager = new NotificationManager();
        
        // Make available globally
        window.notificationManager = notificationManager;
        
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
});

// Global functions for HTML onclick handlers
function markAllAsRead() {
    if (notificationManager) notificationManager.markAllAsRead();
}

function refreshNotifications() {
    if (notificationManager) notificationManager.refreshNotifications();
}

function clearNotifications() {
    if (notificationManager) notificationManager.clearNotifications();
}

function showAllNotifications() {
    if (notificationManager) notificationManager.showAllNotifications();
}

// Add fadeIn/fadeOut animations
if (!document.getElementById('notification-animations')) {
    const style = document.createElement('style');
    style.id = 'notification-animations';
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        
        .gender-badge.male {
            background: linear-gradient(135deg, var(--primary-50) 0%, var(--primary-100) 100%);
            color: var(--primary-700);
            border: 2px solid var(--primary-200);
        }
        
        .gender-badge.female {
            background: linear-gradient(135deg, var(--accent-50) 0%, var(--accent-100) 100%);
            color: var(--accent-700);
            border: 2px solid var(--accent-200);
        }
    `;
    document.head.appendChild(style);
}

    