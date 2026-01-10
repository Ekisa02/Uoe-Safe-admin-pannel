
        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const db = firebase.firestore();

        let reportsData = [];
        let currentReportId = null;
        let reportsListener = null;

        // Simulate loading progress
        function simulateLoading() {
            const progressFill = document.getElementById('loadingProgress');
            const loadingScreen = document.getElementById('loadingScreen');
            let progress = 0;
            
            const interval = setInterval(() => {
                progress += Math.random() * 15;
                if (progress > 95) {
                    progress = 95;
                }
                progressFill.style.width = progress + '%';
            }, 200);

            // Complete loading when Firebase is ready
            setTimeout(() => {
                clearInterval(interval);
                progressFill.style.width = '100%';
                setTimeout(() => {
                    loadingScreen.classList.add('hidden');
                }, 500);
            }, 1500);
        }

        // Start loading simulation
        window.addEventListener('load', simulateLoading);

        // Authentication check
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                window.location.href = '../../../index.html';
                return;
            }
            
            // Verify this is an outreach department user
            const userDoc = await db.collection('adminUsers').doc(user.uid).get();
            if (!userDoc.exists || !userDoc.data().departments.includes('outreach')) {
                showToast('Access denied. Outreach department access required.', 'error');
                setTimeout(() => {
                    auth.signOut();
                    window.location.href = '../../../index.html';
                }, 2000);
                return;
            }
            
            // User is authenticated and has access
            document.getElementById('sidebar-user-name').textContent = user.email.split('@')[0];
            console.log('Outreach department user logged in:', user.email);
            
            // Load dashboard data
            setupRealTimeListener();
        });

        function logout() {
            showToast('Logging out...', 'success');
            setTimeout(() => {
                auth.signOut().then(() => {
                    window.location.href = '../../../index.html';
                });
            }, 1000);
        }

        function setupRealTimeListener() {
            // Remove existing listener if any
            if (reportsListener) {
                reportsListener();
            }

            // Set up real-time listener for reports
            reportsListener = db.collection('reports')
                .orderBy('timestamp', 'desc')
                .onSnapshot((querySnapshot) => {
                    reportsData = [];
                    querySnapshot.forEach((doc) => {
                        reportsData.push({
                            id: doc.id,
                            ...doc.data()
                        });
                    });

                    console.log(`Loaded ${reportsData.length} reports in real-time`);
                    updateDashboardStats();
                    initializeReportsCharts();
                    loadRecentReports();
                    loadPriorityBreakdown();
                    populateReportsTable();
                }, (error) => {
                    console.error('Error in real-time listener:', error);
                    showToast('Error loading reports: ' + error.message, 'error');
                });
        }

        function updateDashboardStats() {
            const totalReports = reportsData.length;
            const pendingReports = reportsData.filter(report => 
                report.status === 'submitted' || !report.status
            ).length;
            const resolvedReports = reportsData.filter(report => 
                report.status === 'resolved'
            ).length;
            const highPriority = reportsData.filter(report => 
                report.priority === 'high' || report.priority === 'urgent'
            ).length;

            // Animate numbers counting up
            animateCounter('total-reports', totalReports);
            animateCounter('pending-reports', pendingReports);
            animateCounter('resolved-reports', resolvedReports);
            animateCounter('high-priority', highPriority);
            
            document.getElementById('notification-count').textContent = pendingReports;
        }

        function animateCounter(elementId, finalValue) {
            const element = document.getElementById(elementId);
            const currentValue = parseInt(element.textContent) || 0;
            const duration = 1000;
            const startTime = Date.now();
            const increment = (finalValue - currentValue) / duration;

            function updateCounter() {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Easing function for smooth animation
                const easeOutQuart = 1 - Math.pow(1 - progress, 4);
                const value = currentValue + (finalValue - currentValue) * easeOutQuart;
                
                element.textContent = Math.round(value).toLocaleString();
                
                if (progress < 1) {
                    requestAnimationFrame(updateCounter);
                } else {
                    element.textContent = finalValue.toLocaleString();
                }
            }

            updateCounter();
        }

        function initializeReportsCharts() {
            // Reports by Category Chart
            const categoryCtx = document.getElementById('categoryChart').getContext('2d');
            const categoryCounts = {};
            
            reportsData.forEach(report => {
                const category = report.category || 'Uncategorized';
                categoryCounts[category] = (categoryCounts[category] || 0) + 1;
            });

            // Destroy existing chart if it exists
            if (window.categoryChartInstance) {
                window.categoryChartInstance.destroy();
            }

            window.categoryChartInstance = new Chart(categoryCtx, {
                type: 'bar',
                data: {
                    labels: Object.keys(categoryCounts),
                    datasets: [{
                        label: 'Number of Reports',
                        data: Object.values(categoryCounts),
                        backgroundColor: '#8B4513',
                        borderRadius: 10,
                        borderSkipped: false,
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            padding: 12,
                            cornerRadius: 8,
                            titleFont: {
                                family: 'Poppins',
                                size: 14
                            },
                            bodyFont: {
                                family: 'Poppins',
                                size: 14
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            },
                            ticks: {
                                font: {
                                    family: 'Poppins'
                                }
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                font: {
                                    family: 'Poppins'
                                }
                            }
                        }
                    }
                }
            });

            // Status Distribution Chart
            const statusCtx = document.getElementById('statusChart').getContext('2d');
            const statusCounts = {
                'Submitted': reportsData.filter(r => r.status === 'submitted' || !r.status).length,
                'Investigation': reportsData.filter(r => r.status === 'under investigation').length,
                'Assigned': reportsData.filter(r => r.status === 'assigned').length,
                'In Progress': reportsData.filter(r => r.status === 'in progress').length,
                'Resolved': reportsData.filter(r => r.status === 'resolved').length
            };

            // Destroy existing chart if it exists
            if (window.statusChartInstance) {
                window.statusChartInstance.destroy();
            }

            window.statusChartInstance = new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(statusCounts),
                    datasets: [{
                        data: Object.values(statusCounts),
                        backgroundColor: [
                            '#2196F3',
                            '#FFC107',
                            '#9C27B0',
                            '#FF9800',
                            '#4CAF50'
                        ],
                        borderWidth: 0,
                        borderRadius: 8,
                        spacing: 2
                    }]
                },
                options: {
                    responsive: true,
                    cutout: '70%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                font: {
                                    family: 'Poppins',
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            padding: 12,
                            cornerRadius: 8
                        }
                    }
                }
            });
        }

        function loadRecentReports() {
            const recentReports = reportsData.slice(0, 5);
            const reportsList = document.getElementById('recent-reports-list');
            
            reportsList.innerHTML = recentReports.length === 0 ? 
                '<div class="activity-item"><p>No recent reports.</p></div>' : 
                recentReports.map((report, index) => `
                    <div class="activity-item" style="animation-delay: ${index * 0.1}s">
                        <div class="activity-icon report">
                            <i class="fas fa-flag"></i>
                        </div>
                        <div class="activity-content">
                            <p class="activity-desc">${report.title || 'No title'}</p>
                            <span class="activity-time">${formatTimestamp(report.timestamp)} • 
                                <span class="priority-label ${report.priority}">${report.priority}</span>
                            </span>
                        </div>
                    </div>
                `).join('');
        }

        function loadPriorityBreakdown() {
            const priorities = [
                { name: 'High', count: reportsData.filter(r => r.priority === 'high').length, class: 'high' },
                { name: 'Urgent', count: reportsData.filter(r => r.priority === 'urgent').length, class: 'urgent' },
                { name: 'Medium', count: reportsData.filter(r => r.priority === 'medium').length, class: 'medium' },
                { name: 'Low', count: reportsData.filter(r => r.priority === 'low').length, class: 'low' }
            ];

            const priorityList = document.getElementById('priority-breakdown-list');
            priorityList.innerHTML = priorities.map((priority, index) => `
                <div class="priority-item" style="animation-delay: ${index * 0.1}s">
                    <span class="priority-label ${priority.class}">${priority.name}</span>
                    <span class="priority-count">${priority.count}</span>
                </div>
            `).join('');
        }

        function populateReportsTable() {
            const tableBody = document.getElementById('reports-table-body');
            const statusFilter = document.getElementById('status-filter').value;
            const priorityFilter = document.getElementById('priority-filter').value;
            const categoryFilter = document.getElementById('category-filter').value;
            const searchQuery = document.getElementById('reports-search').value.toLowerCase();
            
            let filteredReports = reportsData;

            // Apply filters
            if (statusFilter) {
                filteredReports = filteredReports.filter(report => 
                    report.status === statusFilter || (!report.status && statusFilter === 'submitted')
                );
            }
            if (priorityFilter) {
                filteredReports = filteredReports.filter(report => report.priority === priorityFilter);
            }
            if (categoryFilter) {
                filteredReports = filteredReports.filter(report => report.category && report.category.includes(categoryFilter));
            }
            if (searchQuery) {
                filteredReports = filteredReports.filter(report => 
                    (report.title && report.title.toLowerCase().includes(searchQuery)) ||
                    (report.description && report.description.toLowerCase().includes(searchQuery)) ||
                    (report.location && report.location.toLowerCase().includes(searchQuery))
                );
            }
            
            tableBody.innerHTML = filteredReports.length === 0 ? 
                '<tr><td colspan="8" style="text-align: center; padding: 40px; color: var(--text-secondary); font-style: italic;">No reports match the current filters.</td></tr>' : 
                filteredReports.map((report, index) => {
                    const status = report.status || 'submitted';
                    const priority = report.priority || 'medium';
                    return `
                    <tr style="animation-delay: ${index * 0.05}s">
                        <td><code>${report.id.substring(0, 8)}</code></td>
                        <td><strong>${report.title || 'No title'}</strong></td>
                        <td>${(report.category || 'Uncategorized').split(' - ')[0]}</td>
                        <td>
                            <span class="priority-badge ${priority}">
                                ${priority}
                            </span>
                        </td>
                        <td>
                            <span class="status-badge ${status.replace(' ', '-')}">
                                ${status}
                            </span>
                        </td>
                        <td>${report.location || 'N/A'}</td>
                        <td>${formatTimestamp(report.timestamp)}</td>
                        <td>
                            <button class="btn btn-sm btn-primary" onclick="viewReportDetails('${report.id}')">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button class="btn btn-sm btn-warning" onclick="openStatusUpdate('${report.id}')">
                                <i class="fas fa-edit"></i> Status
                            </button>
                        </td>
                    </tr>
                `}).join('');
        }

        function viewReportDetails(reportId) {
            const report = reportsData.find(r => r.id === reportId);
            if (report) {
                currentReportId = reportId;
                
                // Check for media
                const mediaInfo = report.mediaBase64 && report.mediaBase64.length > 0 ? 
                    `${report.mediaBase64.length} image attachment(s)` : 'No image attachments';
                
                // Check for audio
                const audioInfo = (report.audioUrls && report.audioUrls.length > 0) ? 
                    `${report.audioUrls.length} legacy audio recording(s)` : 
                    (report.audioBase64 && report.audioBase64.length > 0) ?
                    `${report.audioBase64.length} audio recording(s)` : 'No audio recordings';

                const details = `
                    <div class="report-details">
                        <div class="detail-row">
                            <label>Report ID:</label>
                            <span><code>${report.id}</code></span>
                        </div>
                        <div class="detail-row">
                            <label>Title:</label>
                            <span><strong>${report.title || 'N/A'}</strong></span>
                        </div>
                        <div class="detail-row">
                            <label>Description:</label>
                            <span style="white-space: pre-wrap; background: rgba(0,0,0,0.02); padding: 15px; border-radius: 10px;">${report.description || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <label>Category:</label>
                            <span>${report.category || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <label>Priority:</label>
                            <span><span class="priority-badge ${report.priority}">${report.priority || 'medium'}</span></span>
                        </div>
                        <div class="detail-row">
                            <label>Status:</label>
                            <span><span class="status-badge ${report.status}">${report.status || 'submitted'}</span></span>
                        </div>
                        <div class="detail-row">
                            <label>Location:</label>
                            <span>${report.location || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <label>ADM Number:</label>
                            <span>${report.admNo || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <label>Gender:</label>
                            <span>${report.gender || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <label>Anonymous:</label>
                            <span>${report.anonymous ? 'Yes' : 'No'}</span>
                        </div>
                        <div class="detail-row">
                            <label>Media:</label>
                            <span>${mediaInfo}</span>
                        </div>
                        <div class="detail-row">
                            <label>Audio:</label>
                            <span>${audioInfo}</span>
                        </div>
                        <div class="detail-row">
                            <label>Submitted Date:</label>
                            <span>${report.submittedDate || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <label>Student ID:</label>
                            <span>${report.studentId || 'N/A'}</span>
                        </div>
                        
                        ${report.assignedDate ? `
                        <div class="detail-row">
                            <label>Assigned Date:</label>
                            <span>${formatTimestamp(report.assignedDate)}</span>
                        </div>
                        ` : ''}
                        ${report.investigationDate ? `
                        <div class="detail-row">
                            <label>Investigation Date:</label>
                            <span>${formatTimestamp(report.investigationDate)}</span>
                        </div>
                        ` : ''}
                        ${report.resolvedDate ? `
                        <div class="detail-row">
                            <label>Resolved Date:</label>
                            <span>${formatTimestamp(report.resolvedDate)}</span>
                        </div>
                        ` : ''}
                        ${report.adminNotes ? `
                        <div class="detail-row">
                            <label>Admin Notes:</label>
                            <span style="white-space: pre-wrap; background: rgba(139, 69, 19, 0.05); padding: 15px; border-radius: 10px; font-style: italic;">${report.adminNotes}</span>
                        </div>
                        ` : ''}
                    </div>
                `;
                
                document.getElementById('modal-title').textContent = 'Report Details';
                document.getElementById('modal-body').innerHTML = details;
                document.getElementById('reportModal').style.display = 'block';
            }
        }

        function openStatusUpdate(reportId) {
            currentReportId = reportId;
            const report = reportsData.find(r => r.id === reportId);
            
            if (report) {
                document.getElementById('status-select').value = report.status || 'submitted';
                document.getElementById('admin-notes').value = '';
                document.getElementById('statusModal').style.display = 'block';
            }
        }

        async function saveStatusUpdate() {
            if (!currentReportId) return;

            const newStatus = document.getElementById('status-select').value;
            const adminNotes = document.getElementById('admin-notes').value;
            const notifyUser = document.getElementById('notify-user').checked;
            const report = reportsData.find(r => r.id === currentReportId);

            if (!report) return;
            
            const btn = document.querySelector('#statusModal .btn-primary');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            try {
                const updateData = {
                    status: newStatus,
                    lastUpdated: new Date()
                };

                // Add timestamps based on status
                if (newStatus === 'under investigation' && !report.investigationDate) {
                    updateData.investigationDate = new Date();
                } else if (newStatus === 'assigned' && !report.assignedDate) {
                    updateData.assignedDate = new Date();
                } else if (newStatus === 'resolved' && !report.resolvedDate) {
                    updateData.resolvedDate = new Date();
                }

                // Add admin notes if provided
                if (adminNotes) {
                    updateData.adminNotes = adminNotes;
                    updateData.lastAdminUpdate = new Date();
                }

                await db.collection('reports').doc(currentReportId).update(updateData);

                // Notify user if requested
                if (notifyUser && report.studentId) {
                    await createUserNotification(report.studentId, currentReportId, newStatus, adminNotes);
                }

                // Also notify admins about the status update
                await createAdminNotification(currentReportId, newStatus, report.title);

                closeStatusModal();
                showToast('Status updated successfully!', 'success');

            } catch (error) {
                console.error('Error updating status:', error);
                showToast('Failed to update status: ' + error.message, 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
            }
        }

        async function createUserNotification(userId, reportId, newStatus, notes) {
            try {
                const statusMessages = {
                    'under investigation': 'is now under investigation',
                    'assigned': 'has been assigned to our team',
                    'in progress': 'is currently being worked on',
                    'resolved': 'has been resolved'
                };

                const message = `Your report "${getReportTitle(reportId)}" ${statusMessages[newStatus] || 'has been updated'}.${notes ? ` Notes: ${notes}` : ''}`;

                const notification = {
                    title: '📢 Report Status Update',
                    message: message,
                    userId: userId,
                    reportId: reportId,
                    read: false,
                    type: 'status_update',
                    timestamp: new Date()
                };

                await db.collection('notifications').add(notification);
                console.log('User notification created successfully');

            } catch (error) {
                console.error('Error creating user notification:', error);
            }
        }

        async function createAdminNotification(reportId, newStatus, reportTitle) {
            try {
                // Get all admin users
                const adminSnapshot = await db.collection('adminUsers').get();
                
                const notification = {
                    title: '🔄 Report Status Changed',
                    message: `Report "${reportTitle || 'Untitled'}" status changed to ${newStatus}`,
                    reportId: reportId,
                    read: false,
                    type: 'admin_status_update',
                    timestamp: new Date()
                };

                // Create notification for each admin
                const promises = adminSnapshot.docs.map(adminDoc => {
                    const adminNotification = {
                        ...notification,
                        userId: adminDoc.id
                    };
                    return db.collection('notifications').add(adminNotification);
                });

                await Promise.all(promises);
                console.log('Admin notifications created successfully');

            } catch (error) {
                console.error('Error creating admin notifications:', error);
            }
        }

        function getReportTitle(reportId) {
            const report = reportsData.find(r => r.id === reportId);
            return report ? report.title : 'Unknown Report';
        }

        function updateReportStatus() {
            closeModal();
            openStatusUpdate(currentReportId);
        }

        function closeModal() {
            document.getElementById('reportModal').style.display = 'none';
            currentReportId = null;
        }

        function closeStatusModal() {
            document.getElementById('statusModal').style.display = 'none';
            currentReportId = null;
        }

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
            
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            
            if (diffMins < 60) {
                return `${diffMins}m ago`;
            } else if (diffHours < 24) {
                return `${diffHours}h ago`;
            } else if (diffDays < 7) {
                return `${diffDays}d ago`;
            } else {
                return date.toLocaleDateString();
            }
        }

        function showToast(message, type = 'info') {
            // Remove existing toasts
            const existingToasts = document.querySelectorAll('.toast');
            existingToasts.forEach(toast => {
                toast.style.transform = 'translateX(120%)';
                setTimeout(() => toast.remove(), 500);
            });

            // Create toast element
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.textContent = message;
            
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
                }, 500);
            }, 4000);
        }

        function exportReportsData() {
            const headers = ['ID', 'Title', 'Category', 'Priority', 'Status', 'Location', 'ADM No', 'Gender', 'Anonymous', 'Submitted Date', 'Student ID'];
            const csvData = reportsData.map(report => [
                report.id,
                report.title || '',
                report.category || '',
                report.priority || '',
                report.status || '',
                report.location || '',
                report.admNo || '',
                report.gender || '',
                report.anonymous ? 'Yes' : 'No',
                report.submittedDate || '',
                report.studentId || ''
            ]);
            
            const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `reports-export-${new Date().toISOString().split('T')[0]}.csv`;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            showToast('Data exported successfully!', 'success');
        }

        function showSection(sectionId) {
            const menuItems = document.querySelectorAll('.menu-item');
            const contentSections = document.querySelectorAll('.content-section');
            
            menuItems.forEach(item => {
                item.classList.remove('active');
                if (item.getAttribute('data-target') === sectionId) {
                    item.classList.add('active');
                }
            });
            
            contentSections.forEach(section => {
                section.classList.remove('active');
                if (section.id === sectionId) {
                    // Trigger animation
                    section.style.opacity = '0';
                    section.style.transform = 'translateY(20px)';
                    
                    setTimeout(() => {
                        section.classList.add('active');
                    }, 50);
                    
                    // Update page title
                    let title = document.querySelector(`[data-target="${sectionId}"] span`).textContent;
                    document.getElementById('page-title').textContent = title;
                    document.getElementById('page-subtitle').textContent = `University of Eldoret Outreach Department | ${title}`;
                }
            });
        }

        // Setup event listeners
        document.addEventListener('DOMContentLoaded', function() {
            const menuItems = document.querySelectorAll('.menu-item');
            
            menuItems.forEach(item => {
                item.addEventListener('click', function() {
                    const target = this.getAttribute('data-target');
                    showSection(target);
                });
            });

            // Add filter change listeners
            document.getElementById('status-filter').addEventListener('change', populateReportsTable);
            document.getElementById('priority-filter').addEventListener('change', populateReportsTable);
            document.getElementById('category-filter').addEventListener('change', populateReportsTable);
            document.getElementById('reports-search').addEventListener('input', populateReportsTable);
            
            // Add config switch listeners
            document.getElementById('notifications-toggle').addEventListener('change', function() {
                showToast(`Notifications ${this.checked ? 'enabled' : 'disabled'}`, 'success');
            });
            
            document.getElementById('auto-backup-toggle').addEventListener('change', function() {
                showToast(`Auto backup ${this.checked ? 'enabled' : 'disabled'}`, 'success');
            });
            
            document.getElementById('maintenance-toggle').addEventListener('change', function() {
                showToast(`Maintenance mode ${this.checked ? 'enabled' : 'disabled'}`, this.checked ? 'warning' : 'success');
            });
        });

        // Close modals when clicking outside
        window.onclick = function(event) {
            const reportModal = document.getElementById('reportModal');
            const statusModal = document.getElementById('statusModal');
            
            if (event.target === reportModal) {
                closeModal();
            }
            if (event.target === statusModal) {
                closeStatusModal();
            }
        }

        // Add keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            // Ctrl/Cmd + F to focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                document.getElementById('reports-search').focus();
            }
            
            // Escape to close modals
            if (e.key === 'Escape') {
                closeModal();
                closeStatusModal();
            }
            
            // Number keys for navigation (1-4)
            if (e.key >= '1' && e.key <= '4' && !e.ctrlKey && !e.metaKey) {
                const sections = ['dashboard', 'reports', 'analytics', 'system'];
                const index = parseInt(e.key) - 1;
                if (sections[index]) {
                    showSection(sections[index]);
                }
            }
        });