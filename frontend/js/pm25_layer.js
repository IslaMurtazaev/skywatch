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

        // Prepare heatmap data: [lat, lon, intensity]
        const heatData = data.map(point => {
            const intensity = this.normalizeValue(point.value);
            return [point.lat, point.lon, intensity];
        });

        // Create heatmap with EPA AQI color gradient
        this.heatLayer = L.heatLayer(heatData, {
            radius: 25,
            blur: 20,
            maxZoom: 10,
            max: 1.0,
            gradient: {
                0.0: '#00E400',  // Good (0-12)
                0.2: '#FFFF00',  // Moderate (12-35)
                0.4: '#FF7E00',  // Unhealthy for Sensitive (35-55)
                0.6: '#FF0000',  // Unhealthy (55-150)
                0.8: '#8F3F97',  // Very Unhealthy (150-250)
                1.0: '#7E0023'   // Hazardous (250+)
            }
        }).addTo(this.map);
    }

    /**
     * Normalize PM2.5 value to 0-1 scale for heatmap
     * @param {number} value - PM2.5 value in μg/m³
     * @returns {number} Normalized value (0-1)
     */
    normalizeValue(value) {
        // EPA AQI breakpoints for PM2.5
        if (value <= 12) return 0.0 + (value / 12) * 0.2;        // Good
        if (value <= 35) return 0.2 + ((value - 12) / 23) * 0.2; // Moderate
        if (value <= 55) return 0.4 + ((value - 35) / 20) * 0.2; // Unhealthy (Sensitive)
        if (value <= 150) return 0.6 + ((value - 55) / 95) * 0.2; // Unhealthy
        if (value <= 250) return 0.8 + ((value - 150) / 100) * 0.2; // Very Unhealthy
        return 1.0; // Hazardous
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
