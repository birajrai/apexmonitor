/* ============================================
   ApexMonitor - Modern UI JavaScript
   ============================================ */

/**
 * Initialize all interactive components when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function() {
  initNavbarToggle();
  initUserDropdown();
  initSettingsTabs();
  initMonitorConfig();
  initDiscordTest();
  initDeleteConfirmations();
  initUrlHashTabs();
});

/**
 * Mobile Navbar Toggle
 */
function initNavbarToggle() {
  const toggle = document.getElementById('navbarToggle');
  const nav = document.querySelector('.navbar-nav');
  
  if (toggle && nav) {
    toggle.addEventListener('click', function() {
      nav.classList.toggle('open');
    });
    
    // Close navbar when clicking outside
    document.addEventListener('click', function(e) {
      if (!toggle.contains(e.target) && !nav.contains(e.target)) {
        nav.classList.remove('open');
      }
    });
  }
}

/**
 * User Dropdown Toggle
 */
function initUserDropdown() {
  const dropdown = document.querySelector('.user-dropdown');
  const toggle = document.getElementById('userDropdownToggle');
  
  if (dropdown && toggle) {
    toggle.addEventListener('click', function(e) {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
      }
    });
  }
}

/**
 * Settings Page Tab Navigation
 */
function initSettingsTabs() {
  const navItems = document.querySelectorAll('.settings-nav-item');
  const tabContents = document.querySelectorAll('.tab-content');
  
  navItems.forEach(item => {
    item.addEventListener('click', function() {
      const tabId = this.dataset.tab;
      
      // Remove active class from all nav items and contents
      navItems.forEach(n => n.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked item and corresponding content
      this.classList.add('active');
      const tabContent = document.getElementById(tabId);
      if (tabContent) {
        tabContent.classList.add('active');
      }
      
      // Update URL hash without scrolling
      history.replaceState(null, null, '#' + tabId);
    });
  });
  
  // Also support legacy tab buttons
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const tabId = this.dataset.tab;
      
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      this.classList.add('active');
      const tabContent = document.getElementById(tabId);
      if (tabContent) {
        tabContent.classList.add('active');
      }
      
      history.replaceState(null, null, '#' + tabId);
    });
  });
}

/**
 * Handle URL hash for direct tab access
 */
function initUrlHashTabs() {
  if (window.location.hash) {
    const tabId = window.location.hash.substring(1);
    
    // Try settings nav first
    const settingsNav = document.querySelector('.settings-nav-item[data-tab="' + tabId + '"]');
    if (settingsNav) {
      settingsNav.click();
      return;
    }
    
    // Try legacy tab buttons
    const tabBtn = document.querySelector('.tab-btn[data-tab="' + tabId + '"]');
    if (tabBtn) {
      tabBtn.click();
    }
  }
}

/**
 * Monitor Type Configuration Toggle
 * Shows/hides the appropriate configuration section based on selected monitor type
 */
function initMonitorConfig() {
  const monitorTypeSelect = document.getElementById('monitorType');
  
  if (monitorTypeSelect) {
    // Initial state
    showMonitorConfig();
    
    // Listen for changes
    monitorTypeSelect.addEventListener('change', showMonitorConfig);
  }
}

/**
 * Show the appropriate monitor configuration section
 */
function showMonitorConfig() {
  const monitorTypeSelect = document.getElementById('monitorType');
  if (!monitorTypeSelect) return;
  
  // Hide all config sections
  document.querySelectorAll('.monitor-config').forEach(el => {
    el.classList.remove('active');
  });
  
  // Show selected config section
  const type = monitorTypeSelect.value;
  if (type) {
    const configEl = document.getElementById(type + '-config');
    if (configEl) {
      configEl.classList.add('active');
    }
  }
}

/**
 * Discord Test Notification
 * Sends a test notification to verify Discord webhook configuration
 */
function initDiscordTest() {
  const testBtn = document.getElementById('testDiscord');
  
  if (testBtn) {
    testBtn.addEventListener('click', async function() {
      const webhookInput = document.getElementById('discordWebhookUrl');
      const webhookUrl = webhookInput ? webhookInput.value : '';
      
      if (!webhookUrl) {
        showNotification('Please enter a Discord webhook URL first', 'error');
        return;
      }
      
      // Disable button and show loading state
      const originalHtml = this.innerHTML;
      this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Sending...</span>';
      this.disabled = true;
      
      try {
        const response = await fetch('/admin/settings/notifications/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ webhookUrl })
        });
        
        const result = await response.json();
        
        if (result.success) {
          showNotification('Test notification sent successfully!', 'success');
        } else {
          showNotification('Failed to send test notification: ' + (result.error || 'Unknown error'), 'error');
        }
      } catch (err) {
        showNotification('Failed to send test notification. Please check your connection.', 'error');
      } finally {
        // Restore button state
        this.innerHTML = originalHtml;
        this.disabled = false;
      }
    });
  }
}

/**
 * Delete Confirmation Dialogs
 * Adds confirmation prompts to delete actions
 */
function initDeleteConfirmations() {
  const deleteForms = document.querySelectorAll('form[data-confirm]');
  
  deleteForms.forEach(form => {
    form.addEventListener('submit', function(e) {
      const message = this.dataset.confirm || 'Are you sure you want to delete this item?';
      if (!confirm(message)) {
        e.preventDefault();
      }
    });
  });
}

/**
 * Show a temporary notification message
 * @param {string} message - The message to display
 * @param {string} type - The type of notification: 'success', 'error', 'warning'
 */
function showNotification(message, type = 'info') {
  // Remove any existing notifications
  const existing = document.querySelector('.notification-toast');
  if (existing) {
    existing.remove();
  }
  
  // Get icon based on type
  const icons = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'notification-toast notification-' + type;
  notification.innerHTML = `
    <i class="fas ${icons[type] || icons.info}"></i>
    <span class="notification-message">${escapeHtml(message)}</span>
    <button class="notification-close" onclick="this.parentElement.remove()">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  // Add styles if not already present
  if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      .notification-toast {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 400px;
        font-size: 14px;
        font-weight: 500;
      }
      .notification-success {
        background-color: #dcfce7;
        border: 1px solid #22c55e;
        color: #16a34a;
      }
      .notification-error {
        background-color: #fee2e2;
        border: 1px solid #ef4444;
        color: #dc2626;
      }
      .notification-warning {
        background-color: #fef3c7;
        border: 1px solid #f59e0b;
        color: #d97706;
      }
      .notification-info {
        background-color: #dbeafe;
        border: 1px solid #3b82f6;
        color: #2563eb;
      }
      .notification-toast i:first-child {
        font-size: 18px;
      }
      .notification-message {
        flex: 1;
      }
      .notification-close {
        background: none;
        border: none;
        font-size: 14px;
        cursor: pointer;
        opacity: 0.6;
        color: inherit;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .notification-close:hover {
        opacity: 1;
      }
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Add to DOM
  document.body.appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => notification.remove(), 300);
    }
  }, 5000);
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Format duration from milliseconds to human readable string
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration string
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return days + 'd ' + (hours % 24) + 'h';
  } else if (hours > 0) {
    return hours + 'h ' + (minutes % 60) + 'm';
  } else if (minutes > 0) {
    return minutes + 'm ' + (seconds % 60) + 's';
  } else {
    return seconds + 's';
  }
}

/**
 * Format date to locale string
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return date.toLocaleString();
}

// Export functions for global use
window.showMonitorConfig = showMonitorConfig;
window.showNotification = showNotification;
window.formatDuration = formatDuration;
window.formatDate = formatDate;
