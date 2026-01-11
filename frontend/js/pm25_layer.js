/**
 * PM2.5 Layer - Heatmap visualization for PM2.5 data
 */
class PM25Layer {
    constructor(map) {
        this.map = map;
        this.heatLayer = null;
        this.visible = true;
    }

    /**
     * Render PM2.5 heatmap for a given timestep
     * @param {Array} data - Array of {lat, lon, value} objects
     */
    render(data) {
        // Remove existing layer
        if (this.heatLayer) {
            this.map.removeLayer(this.heatLayer);
        }

        if (!this.visible || !data || data.length === 0) {
            return;
        }

        // Filter out "Good" and "Moderate" air quality (< 35.4 μg/m³) - only show unhealthy levels
        const filteredData = data.filter(point => point.value > 35.4);

        if (filteredData.length === 0) {
            return; // No significant pollution to display
        }

        // Prepare heatmap data: [lat, lon, intensity]
        const heatData = filteredData.map(point => {
            const intensity = this.normalizeValue(point.value);
            return [point.lat, point.lon, intensity];
        });

        // Adjust radius and blur based on zoom level for better appearance
        const zoom = this.map.getZoom();
        const radius = zoom <= 3 ? 20 : zoom <= 4 ? 25 : zoom <= 5 ? 30 : 35;
        const blur = zoom <= 3 ? 15 : zoom <= 4 ? 20 : zoom <= 5 ? 25 : 30;

        // Create heatmap with grayscale gradient (darker = worse pollution)
        this.heatLayer = L.heatLayer(heatData, {
            radius: radius,
            blur: blur,
            maxZoom: 10,
            max: 1.0,
            gradient: {
                0.0: 'rgba(120, 120, 120, 0.6)',   // Unhealthy for Sensitive (35.5-55.4) - Medium gray
                0.333: 'rgba(80, 80, 80, 0.75)',   // Unhealthy (55.5-125.4) - Dark gray
                0.666: 'rgba(50, 50, 50, 0.9)',    // Very Unhealthy (125.5-255.4) - Very dark gray
                1.0: 'rgba(20, 20, 20, 1.0)'       // Hazardous (255.5+) - Nearly black, full opacity
            }
        }).addTo(this.map);
    }

    /**
     * Normalize PM2.5 value to 0-1 scale using correct EPA AQI breakpoints
     * Only maps unhealthy pollution levels (> 35.4 μg/m³) to grayscale gradient
     * @param {number} value - PM2.5 value in μg/m³
     * @returns {number} Normalized value (0-1)
     */
    normalizeValue(value) {
        // EPA AQI breakpoints (grayscale mapping for unhealthy levels only)
        // 0-9.0: Good → Hidden (filtered out)
        // 9.1-35.4: Moderate → Hidden (filtered out)
        // 35.5-55.4: Unhealthy for Sensitive → 0.0 - 0.333 (Medium gray)
        // 55.5-125.4: Unhealthy → 0.333 - 0.666 (Dark gray)
        // 125.5-255.4: Very Unhealthy → 0.666 - 1.0 (Very dark gray)
        // ≥255.5: Hazardous → 1.0 (Nearly black)

        if (value <= 35.4) {
            return 0.0;  // Filtered out anyway
        } else if (value <= 55.4) {
            return ((value - 35.4) / (55.4 - 35.4)) * 0.333;  // 0.0 - 0.333
        } else if (value <= 125.4) {
            return 0.333 + ((value - 55.4) / (125.4 - 55.4)) * 0.333;  // 0.333 - 0.666
        } else if (value <= 255.4) {
            return 0.666 + ((value - 125.4) / (255.4 - 125.4)) * 0.334;  // 0.666 - 1.0
        } else {
            return 1.0;  // Hazardous (255.5+)
        }
    }

    /**
     * Toggle layer visibility
     * @param {boolean} visible - Whether the layer should be visible
     */
    setVisibility(visible) {
        this.visible = visible;
        if (!visible && this.heatLayer) {
            this.map.removeLayer(this.heatLayer);
        }
    }

    /**
     * Clear the layer
     */
    clear() {
        if (this.heatLayer) {
            this.map.removeLayer(this.heatLayer);
            this.heatLayer = null;
        }
    }
}
