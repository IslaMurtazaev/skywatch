/**
 * Precipitation Layer - Visualization for precipitation data
 */
class PrecipLayer {
    constructor(map) {
        this.map = map;
        this.circles = [];
        this.visible = true;
    }

    /**
     * Render precipitation for a given timestep
     * @param {Array} data - Array of {lat, lon, value} objects
     */
    render(data) {
        // Clear existing circles
        this.clear();

        if (!this.visible || !data || data.length === 0) {
            return;
        }

        // Filter out zero or very small precipitation
        const significantData = data.filter(point => point.value > 0.1);

        // Create circle markers
        significantData.forEach(point => {
            const circle = this.createCircle(point);
            if (circle) {
                circle.addTo(this.map);
                this.circles.push(circle);
            }
        });
    }

    /**
     * Create a precipitation circle marker
     * @param {Object} point - Precipitation data point with lat, lon, value
     * @returns {L.CircleMarker} Leaflet circle marker
     */
    createCircle(point) {
        const { lat, lon, value } = point;

        // Skip if invalid data
        if (isNaN(value) || value <= 0) {
            return null;
        }

        // Get color and radius based on precipitation amount
        const color = this.getPrecipColor(value);
        const radius = this.getPrecipRadius(value);

        // Create circle marker
        const circle = L.circleMarker([lat, lon], {
            radius: radius,
            fillColor: color,
            color: color,
            weight: 1,
            opacity: 0.6,
            fillOpacity: 0.4
        });

        // Add tooltip with precipitation information
        const category = this.getPrecipCategory(value);
        circle.bindTooltip(
            `<strong>Precipitation</strong><br>${value.toFixed(1)} mm<br>${category}`,
            { permanent: false, direction: 'top' }
        );

        return circle;
    }

    /**
     * Get color based on precipitation amount
     * @param {number} value - Precipitation in mm
     * @returns {string} Color hex code
     */
    getPrecipColor(value) {
        if (value < 0.5) return '#E0F3DB';     // Light
        if (value < 2) return '#A8DDB5';       // Moderate
        if (value < 5) return '#43A2CA';       // Heavy
        if (value < 10) return '#0868AC';      // Very Heavy
        return '#084081';                       // Extreme
    }

    /**
     * Get circle radius based on precipitation amount
     * @param {number} value - Precipitation in mm
     * @returns {number} Radius in pixels
     */
    getPrecipRadius(value) {
        // Scale radius based on amount, but cap it
        const baseRadius = 8;
        const scaleFactor = Math.log(value + 1) * 3;
        return Math.min(20, baseRadius + scaleFactor);
    }

    /**
     * Get precipitation category
     * @param {number} value - Precipitation in mm
     * @returns {string} Category name
     */
    getPrecipCategory(value) {
        if (value < 0.5) return 'Light';
        if (value < 2) return 'Moderate';
        if (value < 5) return 'Heavy';
        if (value < 10) return 'Very Heavy';
        return 'Extreme';
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
     * Clear all circles
     */
    clear() {
        this.circles.forEach(circle => this.map.removeLayer(circle));
        this.circles = [];
    }
}
