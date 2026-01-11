/**
 * Time Controls - Manages time slider and animation controls
 */
class TimeController {
    constructor(timesteps, onTimeChange) {
        this.timesteps = timesteps;
        this.currentIndex = 0;
        this.onTimeChange = onTimeChange;
        this.isPlaying = false;
        this.playInterval = null;
        this.playSpeed = 1000; // milliseconds between frames

        this.initializeControls();
    }

    /**
     * Initialize control elements and event listeners
     */
    initializeControls() {
        // Get control elements
        this.slider = document.getElementById('time-slider');
        this.timeDisplay = document.getElementById('time-display');
        this.playBtn = document.getElementById('play-btn');
        this.prevBtn = document.getElementById('prev-btn');
        this.nextBtn = document.getElementById('next-btn');

        // Setup slider
        this.slider.max = this.timesteps.length - 1;
        this.slider.value = 0;

        // Event listeners
        this.slider.addEventListener('input', (e) => {
            this.setTimestep(parseInt(e.target.value));
        });

        this.playBtn.addEventListener('click', () => this.togglePlay());
        this.prevBtn.addEventListener('click', () => this.previous());
        this.nextBtn.addEventListener('click', () => this.next());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                this.togglePlay();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.previous();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.next();
            }
        });

        // Create slider labels
        this.createSliderLabels();

        // Initial update
        this.updateDisplay();
    }

    /**
     * Create labels for the time slider
     */
    createSliderLabels() {
        const labelsContainer = document.getElementById('slider-labels');
        labelsContainer.innerHTML = '';

        // Show labels for first, middle, and last timesteps
        const indices = [
            0,
            Math.floor(this.timesteps.length / 2),
            this.timesteps.length - 1
        ];

        indices.forEach(index => {
            const timestep = this.timesteps[index];
            const label = document.createElement('span');
            label.textContent = this.formatTimestamp(timestep.valid_time, true);
            labelsContainer.appendChild(label);
        });
    }

    /**
     * Set current timestep
     * @param {number} index - Timestep index
     */
    setTimestep(index) {
        if (index < 0 || index >= this.timesteps.length) {
            return;
        }

        this.currentIndex = index;
        this.slider.value = index;
        this.updateDisplay();
        this.onTimeChange(index);
    }

    /**
     * Go to previous timestep
     */
    previous() {
        if (this.currentIndex > 0) {
            this.setTimestep(this.currentIndex - 1);
        }
    }

    /**
     * Go to next timestep
     */
    next() {
        if (this.currentIndex < this.timesteps.length - 1) {
            this.setTimestep(this.currentIndex + 1);
        }
    }

    /**
     * Toggle play/pause animation
     */
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    /**
     * Start animation
     */
    play() {
        this.isPlaying = true;
        this.playBtn.textContent = '⏸';
        this.playBtn.title = 'Pause';

        this.playInterval = setInterval(() => {
            if (this.currentIndex < this.timesteps.length - 1) {
                this.setTimestep(this.currentIndex + 1);
            } else {
                // Loop back to start
                this.setTimestep(0);
            }
        }, this.playSpeed);
    }

    /**
     * Pause animation
     */
    pause() {
        this.isPlaying = false;
        this.playBtn.textContent = '▶';
        this.playBtn.title = 'Play';

        if (this.playInterval) {
            clearInterval(this.playInterval);
            this.playInterval = null;
        }
    }

    /**
     * Update time display
     */
    updateDisplay() {
        const timestep = this.timesteps[this.currentIndex];
        const formattedTime = this.formatTimestamp(timestep.valid_time);
        const forecastHour = timestep.forecast_hour;

        this.timeDisplay.textContent = `${formattedTime} (+${forecastHour}h)`;
    }

    /**
     * Format ISO timestamp to readable format
     * @param {string} timestamp - ISO timestamp
     * @param {boolean} short - Use short format
     * @returns {string} Formatted timestamp
     */
    formatTimestamp(timestamp, short = false) {
        const date = new Date(timestamp);

        if (short) {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }

        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }
}
