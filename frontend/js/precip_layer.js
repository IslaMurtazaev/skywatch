/**
 * Precipitation Layer - Heatmap visualization for precipitation data
 */
class PrecipLayer {
    constructor(map) {
        this.map = map;
        this.heatLayer = null;
        this.visible = true;
    }

    /**
     * Render precipitation heatmap for a given timestep
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

        // Filter out light precipitation (< 2 mm) - only show moderate or heavier
        const significantData = data.filter(point => point.value >= 2);

        if (significantData.length === 0) {
            return; // No significant precipitation to display
        }

        // Prepare heatmap data: [lat, lon, intensity]
        const heatData = significantData.map(point => {
            const intensity = this.normalizeValue(point.value);
            return [point.lat, point.lon, intensity];
        });

        // Adjust radius and blur based on zoom level
        const zoom = this.map.getZoom();
        const radius = zoom <= 3 ? 20 : zoom <= 4 ? 25 : zoom <= 5 ? 30 : 35;
        const blur = zoom <= 3 ? 15 : zoom <= 4 ? 20 : zoom <= 5 ? 25 : 30;

        // Create heatmap with green gradient (light to dark green)
        this.heatLayer = L.heatLayer(heatData, {
            radius: radius,
            blur: blur,
            maxZoom: 10,
            max: 1.0,
            gradient: {
                0.0: 'rgba(144, 238, 144, 0.8)',    // Moderate (2-5 mm) - Light green
                0.4: 'rgba(50, 205, 50, 0.85)',     // Heavy (5-10 mm) - Lime green
                0.7: 'rgba(34, 139, 34, 0.9)',      // Very Heavy (10-20 mm) - Forest green
                1.0: 'rgba(0, 100, 0, 1.0)'         // Extreme (20+ mm) - Dark green
            }
        }).addTo(this.map);
    }

    /**
     * Normalize precipitation value to 0-1 scale
     * @param {number} value - Precipitation in mm (6-hourly)
     * @returns {number} Normalized value (0-1)
     */
    normalizeValue(value) {
        // Precipitation ranges (6-hourly amounts in mm)
        // < 2: Light (filtered out)
        // 2-5: Moderate → 0.0 - 0.4
        // 5-10: Heavy → 0.4 - 0.7
        // 10-20: Very Heavy → 0.7 - 1.0
        // > 20: Extreme → 1.0

        if (value < 2) {
            return 0.0;  // Filtered out anyway
        } else if (value <= 5) {
            return ((value - 2) / (5 - 2)) * 0.4;  // 0.0 - 0.4
        } else if (value <= 10) {
            return 0.4 + ((value - 5) / (10 - 5)) * 0.3;  // 0.4 - 0.7
        } else if (value <= 20) {
            return 0.7 + ((value - 10) / (20 - 10)) * 0.3;  // 0.7 - 1.0
        } else {
            return 1.0;  // Extreme (20+ mm)
        }
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
     * Clear the layer
     */
    clear() {
        if (this.heatLayer) {
            this.map.removeLayer(this.heatLayer);
            this.heatLayer = null;
        }
    }
}
