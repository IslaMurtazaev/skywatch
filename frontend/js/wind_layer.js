/**
 * Wind Layer - Arrow visualization for wind data
 */
class WindLayer {
    constructor(map) {
        this.map = map;
        this.arrows = [];
        this.visible = true;
        this.maxArrows = 500; // Limit number of arrows for performance
    }

    /**
     * Render wind arrows for a given timestep
     * @param {Array} data - Array of {lat, lon, speed, direction} objects
     */
    render(data) {
        // Clear existing arrows
        this.clear();

        if (!this.visible || !data || data.length === 0) {
            return;
        }

        // Sample data if too many points (for performance)
        let sampledData = data;
        if (data.length > this.maxArrows) {
            const step = Math.ceil(data.length / this.maxArrows);
            sampledData = data.filter((_, index) => index % step === 0);
        }

        // Create arrow markers
        sampledData.forEach(point => {
            const arrow = this.createArrow(point);
            if (arrow) {
                arrow.addTo(this.map);
                this.arrows.push(arrow);
            }
        });
    }

    /**
     * Create a wind arrow marker
     * @param {Object} point - Wind data point with lat, lon, speed, direction
     * @returns {L.Marker} Leaflet marker with custom arrow icon
     */
    createArrow(point) {
        const { lat, lon, speed, direction } = point;

        // Skip if invalid data
        if (isNaN(speed) || isNaN(direction)) {
            return null;
        }

        // Get color based on wind speed
        const color = this.getSpeedColor(speed);

        // Create custom arrow icon using SVG
        const arrowIcon = L.divIcon({
            html: this.createArrowSVG(direction, color, speed),
            className: 'wind-arrow-icon',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        // Create marker
        const marker = L.marker([lat, lon], { icon: arrowIcon });

        // Add tooltip with wind information
        const cardinalDir = this.getCardinalDirection(direction);
        marker.bindTooltip(
            `<strong>Wind</strong><br>${speed.toFixed(1)} m/s<br>${cardinalDir} (${Math.round(direction)}°)`,
            { permanent: false, direction: 'top' }
        );

        return marker;
    }

    /**
     * Create SVG arrow pointing in the given direction
     * @param {number} direction - Wind direction in degrees
     * @param {string} color - Arrow color
     * @param {number} speed - Wind speed for sizing
     * @returns {string} SVG string
     */
    createArrowSVG(direction, color, speed) {
        // Scale arrow size based on speed (but cap it)
        const scale = Math.min(1.5, 0.5 + speed / 10);

        return `
            <svg width="30" height="30" viewBox="0 0 30 30"
                 style="transform: rotate(${direction}deg);">
                <g transform="translate(15, 15) scale(${scale})">
                    <path d="M 0,-10 L 3,-3 L 0,-5 L -3,-3 Z"
                          fill="${color}"
                          stroke="#333"
                          stroke-width="0.5"/>
                </g>
            </svg>
        `;
    }

    /**
     * Get color based on wind speed (Beaufort scale)
     * @param {number} speed - Wind speed in m/s
     * @returns {string} Color hex code
     */
    getSpeedColor(speed) {
        if (speed < 2) return '#4DAF4A';      // Light air (green)
        if (speed < 6) return '#377EB8';      // Moderate breeze (blue)
        if (speed < 11) return '#FF7F00';     // Fresh breeze (orange)
        if (speed < 17) return '#E41A1C';     // Strong wind (red)
        return '#984EA3';                      // Storm (purple)
    }

    /**
     * Convert degrees to cardinal direction
     * @param {number} degrees - Direction in degrees
     * @returns {string} Cardinal direction (e.g., 'N', 'NE', 'E')
     */
    getCardinalDirection(degrees) {
        const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                          'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        const index = Math.round(degrees / 22.5) % 16;
        return directions[index];
    }

    /**
     * Toggle layer visibility
     * @param {boolean} visible - Whether the layer should be visible
     */
    setVisibility(visible) {
        this.visible = visible;
        if (!visible) {
            this.clear();
        }
    }

    /**
     * Clear all arrows
     */
    clear() {
        this.arrows.forEach(arrow => this.map.removeLayer(arrow));
        this.arrows = [];
    }
}
