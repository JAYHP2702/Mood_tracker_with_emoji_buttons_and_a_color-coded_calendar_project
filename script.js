// Constants and Configuration
const CONFIG = {
    STORAGE_KEYS: {
        MOODS: 'moodscape_moods',
        THEME: 'moodscape_theme',
        SETTINGS: 'moodscape_settings'
    },
    MOOD_TYPES: {
        POSITIVE: ['energized', 'happy', 'calm'],
        NEUTRAL: ['meh'],
        NEGATIVE: ['stressed', 'sad']
    },
    ANIMATIONS: {
        BOUNCE: 'bounce 0.5s ease',
        FADE: 'fade 0.3s ease',
        PULSE: 'pulse 1s infinite',
        ROTATE: 'rotate 1s linear infinite',
        SHAKE: 'shake 0.5s ease',
        FLOAT: 'float 2s ease-in-out infinite',
        SPARKLE: 'sparkle 1s ease-in-out infinite'
    },
    MOOD_EMOJIS: {
        energized: '⚡',
        happy: '😊',
        meh: '😐',
        stressed: '🔥',
        calm: '🧘‍♀️',
        sad: '💔'
    },
    MOOD_ANIMATIONS: {
        energized: 'sparkle',
        happy: 'bounce',
        meh: 'fade',
        stressed: 'shake',
        calm: 'float',
        sad: 'pulse'
    }
};

// Utility Functions
const utils = {
    getCurrentTimestamp() {
        return new Date().toISOString();
    },
    
    getUserTimezone() {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch (error) {
            return 'UTC'; // Fallback to UTC if timezone detection fails
        }
    },
    
    formatDate(date) {
        try {
            return new Intl.DateTimeFormat('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short'
            }).format(date);
        } catch (error) {
            return date.toISOString(); // Fallback to ISO string if formatting fails
        }
    },
    
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

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #ff4444;
            color: white;
            padding: 1rem;
            border-radius: 4px;
            z-index: 1000;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    }
};

// Theme Management
class ThemeManager {
    constructor() {
        this.theme = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME) || 'light';
        this.applyTheme();
        this.initializeThemeToggle();
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, this.theme);
    }

    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        this.applyTheme();
    }

    initializeThemeToggle() {
        const toggleBtn = document.querySelector('.theme-toggle button');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleTheme());
        }
    }
}

// Mood Management Class
class MoodManager {
    constructor() {
        this.moods = this.loadMoods();
        this.updateStats();
    }
    
    loadMoods() {
        try {
            const storedMoods = localStorage.getItem(CONFIG.STORAGE_KEYS.MOODS);
            return storedMoods ? JSON.parse(storedMoods) : {};
        } catch (error) {
            console.error('Error loading moods:', error);
            utils.showError('Could not load your mood history. Starting fresh!');
            return {};
        }
    }

    updateStats() {
        try {
            // Calculate most common mood
            const moodCounts = {};
            Object.values(this.moods).forEach(({ mood }) => {
                moodCounts[mood] = (moodCounts[mood] || 0) + 1;
            });
            
            const mostCommonMood = Object.entries(moodCounts)
                .sort(([,a], [,b]) => b - a)[0]?.[0] || '-';
            
            // Calculate current streak
            let streak = 0;
            const today = new Date();
            today.setHours(12, 0, 0, 0);
            
            for (let i = 0; i < 365; i++) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const dateString = date.toISOString().split('T')[0];
                
                if (this.moods[dateString]) {
                    streak++;
                } else {
                    break;
                }
            }
            
            // Calculate monthly stats
            const thisMonth = new Date();
            thisMonth.setDate(1);
            thisMonth.setHours(0, 0, 0, 0);
            
            const monthlyMoods = Object.entries(this.moods)
                .filter(([timestamp]) => new Date(timestamp) >= thisMonth)
                .map(([, data]) => data.mood);
            
            const monthlyStats = monthlyMoods.length > 0 
                ? `${monthlyMoods.length} entries this month`
                : 'No entries this month';
            
            // Update DOM
            document.getElementById('most-common-mood').textContent = 
                mostCommonMood ? `${CONFIG.MOOD_EMOJIS[mostCommonMood]} ${mostCommonMood}` : '-';
            document.getElementById('mood-streak').textContent = 
                `${streak} day${streak !== 1 ? 's' : ''}`;
            document.getElementById('monthly-stats').textContent = monthlyStats;
            
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }
    
    saveMood(mood, timestamp = null) {
        try {
            if (!mood || !CONFIG.MOOD_TYPES.POSITIVE.concat(CONFIG.MOOD_TYPES.NEUTRAL, CONFIG.MOOD_TYPES.NEGATIVE).includes(mood)) {
                throw new Error('Invalid mood type');
            }

            let date;
            if (timestamp) {
                // For editing existing moods
                date = new Date(timestamp);
            } else {
                // For new moods
                date = new Date();
            }

            // Reset time to midnight in local timezone
            date.setHours(0, 0, 0, 0);
            
            // Create the date string in YYYY-MM-DD format
            const dateString = date.toISOString().split('T')[0];
            
            const moodData = {
                mood,
                timestamp: date.toISOString(),
                timezone: utils.getUserTimezone()
            };
            
            // Save the mood
            this.moods[dateString] = moodData;
            
            // Save to localStorage
            localStorage.setItem(CONFIG.STORAGE_KEYS.MOODS, JSON.stringify(this.moods));
            
            // Update stats immediately
            this.updateStats();
            
            // Trigger confetti for positive moods
            if (CONFIG.MOOD_TYPES.POSITIVE.includes(mood)) {
                AnimationManager.triggerConfetti();
            }
            
            return true;
        } catch (error) {
            console.error('Error saving mood:', error);
            utils.showError('Could not save your mood. Please try again!');
            return false;
        }
    }
    
    getMoodsByDateRange(startDate, endDate) {
        try {
            return Object.entries(this.moods)
                .filter(([timestamp]) => {
                    const date = new Date(timestamp);
                    return date >= startDate && date <= endDate;
                })
                .reduce((acc, [timestamp, data]) => {
                    acc[timestamp] = data;
                    return acc;
                }, {});
        } catch (error) {
            console.error('Error getting moods by date range:', error);
            return {};
        }
    }

    deleteMood(timestamp) {
        try {
            // Create a new date object and reset time to midnight in local timezone
            const date = new Date(timestamp);
            date.setHours(0, 0, 0, 0);
            
            // Create the date string in YYYY-MM-DD format
            const dateString = date.toISOString().split('T')[0];
            
            delete this.moods[dateString];
            localStorage.setItem(CONFIG.STORAGE_KEYS.MOODS, JSON.stringify(this.moods));
            this.updateStats();
            return true;
        } catch (error) {
            console.error('Error deleting mood:', error);
            utils.showError('Could not delete mood. Please try again!');
            return false;
        }
    }

    getMoodDataForDate(date) {
        try {
            // Create a new date object and reset time to midnight in local timezone
            const localDate = new Date(date);
            localDate.setHours(0, 0, 0, 0);
            
            // Create the date string in YYYY-MM-DD format
            const dateString = localDate.toISOString().split('T')[0];
            return this.moods[dateString];
        } catch (error) {
            console.error('Error getting mood data for date:', error);
            return null;
        }
    }

    clearAllMoods() {
        try {
            this.moods = {};
            localStorage.removeItem(CONFIG.STORAGE_KEYS.MOODS);
            this.updateStats(); // Update stats after clearing
            return true;
        } catch (error) {
            console.error('Error clearing moods:', error);
            utils.showError('Could not clear moods. Please try again!');
            return false;
        }
    }
}

// Calendar Management Class
class CalendarManager {
    constructor(moodManager) {
        this.moodManager = moodManager;
        this.currentDate = new Date();
        this.initializeCalendar();
    }
    
    initializeCalendar() {
        try {
            this.renderCalendar();
            this.initializeNavigation();
        } catch (error) {
            console.error('Error initializing calendar:', error);
            utils.showError('Could not initialize calendar. Please refresh the page!');
        }
    }
    
    renderCalendar() {
        const calendar = document.querySelector('.hexagonal-calendar');
        if (!calendar) {
            utils.showError('Calendar element not found!');
            return;
        }
        
        try {
            const { year, month } = this.getCurrentMonthData();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const firstDayOfMonth = new Date(year, month, 1).getDay();
            
            // Update month display
            const monthDisplay = document.querySelector('.current-month');
            if (monthDisplay) {
                monthDisplay.textContent = new Date(year, month).toLocaleString('default', { 
                    month: 'long', 
                    year: 'numeric' 
                });
            }
            
            calendar.innerHTML = '';
            
            // Add empty cells for days before the first day of the month
            for (let i = 0; i < firstDayOfMonth; i++) {
                const emptyCell = document.createElement('div');
                emptyCell.className = 'hexagon empty';
                calendar.appendChild(emptyCell);
            }
            
            // Add days of the month
            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                date.setHours(0, 0, 0, 0); // Reset time to midnight
                const moodData = this.moodManager.getMoodDataForDate(date);
                
                const hexagon = this.createHexagonElement(day, moodData, date);
                calendar.appendChild(hexagon);
            }
        } catch (error) {
            console.error('Error rendering calendar:', error);
            utils.showError('Could not render calendar. Please refresh the page!');
        }
    }
    
    createHexagonElement(day, moodData, date) {
        const hexagon = document.createElement('div');
        hexagon.className = 'hexagon';
        
        try {
            const hexagonContent = document.createElement('div');
            hexagonContent.className = 'hexagon-content';
            
            // Add day number
            const dayNumber = document.createElement('span');
            dayNumber.className = 'day-number';
            dayNumber.textContent = day;
            hexagonContent.appendChild(dayNumber);
            
            if (moodData) {
                const { mood, timestamp } = moodData;
                hexagon.style.background = `var(--mood-${mood})`;
                hexagon.title = `Mood: ${mood}\nTime: ${utils.formatDate(new Date(timestamp))}`;
                
                // Add mood emoji
                const moodEmoji = document.createElement('span');
                moodEmoji.className = 'mood-emoji';
                moodEmoji.textContent = CONFIG.MOOD_EMOJIS[mood];
                hexagonContent.appendChild(moodEmoji);
            }
            
            hexagon.appendChild(hexagonContent);
            
            // Add edit button for all dates
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-mood-btn';
            editBtn.innerHTML = '✏️';
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showMoodEditModal(date, moodData);
            });
            hexagon.appendChild(editBtn);
            
            // Add click handler for the entire hexagon
            hexagon.addEventListener('click', () => {
                this.showMoodEditModal(date, moodData);
            });
            
            return hexagon;
        } catch (error) {
            console.error('Error creating hexagon element:', error);
            hexagon.innerHTML = day;
            return hexagon;
        }
    }
    
    initializeNavigation() {
        try {
            const prevButton = document.querySelector('.prev-month');
            const nextButton = document.querySelector('.next-month');
            
            if (prevButton && nextButton) {
                prevButton.addEventListener('click', () => this.navigateMonth(-1));
                nextButton.addEventListener('click', () => this.navigateMonth(1));
            }
        } catch (error) {
            console.error('Error initializing navigation:', error);
        }
    }
    
    navigateMonth(delta) {
        try {
            this.currentDate.setMonth(this.currentDate.getMonth() + delta);
            this.renderCalendar();
        } catch (error) {
            console.error('Error navigating month:', error);
            utils.showError('Could not change month. Please try again!');
        }
    }
    
    showMoodEditModal(date, moodData) {
        const modal = document.createElement('div');
        modal.className = 'mood-edit-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Edit Mood for ${utils.formatDate(date)}</h3>
                <div class="mood-options">
                    ${Object.entries(CONFIG.MOOD_EMOJIS).map(([mood, emoji]) => `
                        <button class="mood-option" data-mood="${mood}">
                            <span class="emoji">${emoji}</span>
                            <span class="label">${mood}</span>
                        </button>
                    `).join('')}
                </div>
                <div class="modal-actions">
                    ${moodData ? '<button class="delete-btn">Delete</button>' : ''}
                    <button class="close-btn">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        modal.querySelectorAll('.mood-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const newMood = btn.dataset.mood;
                this.moodManager.saveMood(newMood, date.toISOString());
                this.renderCalendar();
                modal.remove();
            });
        });

        const deleteBtn = modal.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.moodManager.deleteMood(date.toISOString());
                this.renderCalendar();
                modal.remove();
            });
        }

        modal.querySelector('.close-btn').addEventListener('click', () => {
            modal.remove();
        });

        // Add animation
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
    }
    
    getCurrentMonthData() {
        return {
            year: this.currentDate.getFullYear(),
            month: this.currentDate.getMonth()
        };
    }
}

// Animation Manager
class AnimationManager {
    static async triggerConfetti() {
        if (typeof confetti === 'undefined') {
            console.warn('Confetti library not loaded');
            return;
        }
        
        try {
            await confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        } catch (error) {
            console.error('Error triggering confetti:', error);
        }
    }
    
    static addMoodAnimation(element, mood) {
        try {
            const animationType = CONFIG.MOOD_ANIMATIONS[mood] || 'fade';
            element.style.animation = CONFIG.ANIMATIONS[animationType.toUpperCase()];
            
            // Remove animation after it completes
            element.addEventListener('animationend', () => {
                element.style.animation = '';
            }, { once: true });
        } catch (error) {
            console.error('Error adding mood animation:', error);
        }
    }

    static addBounceAnimation(element) {
        try {
            element.style.animation = CONFIG.ANIMATIONS.BOUNCE;
            element.addEventListener('animationend', () => {
                element.style.animation = '';
            }, { once: true });
        } catch (error) {
            console.error('Error adding bounce animation:', error);
        }
    }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    try {
        const themeManager = new ThemeManager();
        const moodManager = new MoodManager();
        const calendarManager = new CalendarManager(moodManager);
        
        // Add clear button
        const clearButton = document.createElement('button');
        clearButton.textContent = 'Clear All Moods';
        clearButton.className = 'clear-btn';
        clearButton.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all moods? This cannot be undone.')) {
                if (moodManager.clearAllMoods()) {
                    calendarManager.renderCalendar();
                    utils.showError('All moods have been cleared!');
                }
            }
        });

        const calendarSection = document.querySelector('.calendar-section');
        if (calendarSection) {
            calendarSection.appendChild(clearButton);
        }

        // Initialize mood buttons
        const moodButtons = document.querySelectorAll('.mood-btn');
        if (moodButtons.length === 0) {
            throw new Error('Mood buttons not found');
        }

        // Add click handlers for mood buttons
        moodButtons.forEach(button => {
            button.addEventListener('click', () => {
                const mood = button.dataset.mood;
                if (!mood) {
                    console.error('No mood data found on button');
                    return;
                }

                console.log('Mood button clicked:', mood);

                // Add mood-specific animation
                AnimationManager.addMoodAnimation(button, mood);

                // Save the mood for today
                const success = moodManager.saveMood(mood);
                
                if (success) {
                    // Update the calendar to show the new mood
                    calendarManager.renderCalendar();
                    
                    // Show success feedback
                    button.classList.add('selected');
                    setTimeout(() => {
                        button.classList.remove('selected');
                    }, 1000);

                    // Add special effects based on mood type
                    if (CONFIG.MOOD_TYPES.POSITIVE.includes(mood)) {
                        AnimationManager.triggerConfetti();
                    }
                }
            });
        });

        // Add export button
        const exportButton = document.createElement('button');
        exportButton.textContent = 'Export Data';
        exportButton.className = 'export-btn';
        exportButton.addEventListener('click', () => {
            try {
                const data = {
                    moods: moodManager.moods,
                    exportDate: utils.getCurrentTimestamp(),
                    timezone: utils.getUserTimezone()
                };
                
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = `moodscape-export-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch (error) {
                console.error('Error exporting data:', error);
                utils.showError('Could not export your data. Please try again!');
            }
        });
        
        if (calendarSection) {
            calendarSection.appendChild(exportButton);
        }
        
    } catch (error) {
        console.error('Error initializing application:', error);
        utils.showError('Something went wrong. Please refresh the page!');
    }
}); 