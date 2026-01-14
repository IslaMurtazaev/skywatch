/**
 * Temperature Layer - Web Mercator-aware image overlay visualization for temperature data
 */
class TemperatureLayer {
    constructor(map) {
        this.map = map;
        this.imageOverlay = null;
        this.data = null;
        this.visible = true;
    }

    /**
     * Render temperature as Web Mercator-compensated image overlay
     * @param {Array} data - Array of {lat, lon, value} objects (value in Fahrenheit)
     */
    render(data) {
        if (!this.visible || !data || data.length === 0) {
            this.clear();
            return;
        }

        this.data = data;

        // Create Mercator-aware image overlay
        this.createMercatorImageOverlay();
    }

    /**
     * Convert latitude to Web Mercator y-coordinate
     * @param {number} lat - Latitude in degrees
     * @returns {number} Mercator y-coordinate (unitless, relative)
     */
    latToMercatorY(lat) {
        // Clip to avoid infinity at poles
        lat = Math.max(-85, Math.min(85, lat));
        const latRad = (lat * Math.PI) / 180;
        return Math.log(Math.tan(Math.PI / 4 + latRad / 2));
    }

    /**
     * Create Web Mercator-aware image overlay from temperature data
     */
    createMercatorImageOverlay() {
        // Organize data into a grid
        const grid = this.organizeDataIntoGrid(this.data);

        // Create Mercator-compensated image from grid
        const imageUrl = this.createMercatorImage(grid);

        // Remove old overlay
        if (this.imageOverlay) {
            this.map.removeLayer(this.imageOverlay);
        }

        // Calculate bounds using the sorted lat/lon arrays from the grid
        const { lats, lons } = grid;

        const northLat = lats[0];
        const southLat = lats[lats.length - 1];
        const westLon = lons[0];
        const eastLon = lons[lons.length - 1];

        console.log(`Temperature data range: lat [${southLat.toFixed(2)} to ${northLat.toFixed(2)}], lon [${westLon.toFixed(2)} to ${eastLon.toFixed(2)}]`);

        // Calculate grid spacing for padding
        const latSpacing = lats.length > 1 ? Math.abs(lats[0] - lats[1]) : 1.2;
        const lonSpacing = lons.length > 1 ? Math.abs(lons[1] - lons[0]) : 1.2;

        // Add half a grid cell padding
        const bounds = [
            [southLat - latSpacing / 2, westLon - lonSpacing / 2],  // Southwest
            [northLat + latSpacing / 2, eastLon + lonSpacing / 2]   // Northeast
        ];

        console.log(`Image bounds: SW [${bounds[0][0].toFixed(2)}, ${bounds[0][1].toFixed(2)}], NE [${bounds[1][0].toFixed(2)}, ${bounds[1][1].toFixed(2)}]`);

        this.imageOverlay = L.imageOverlay(imageUrl, bounds, {
            opacity: 0.6,
            interactive: false
        });
        this.imageOverlay.addTo(this.map);

        console.log('Mercator-compensated temperature image overlay added to map');
    }

    /**
     * Organize scattered data points into a 2D grid
     * @param {Array} data - Temperature data points
     * @returns {Object} Grid structure with width, height, data, lats, and lons
     */
    organizeDataIntoGrid(data) {
        // Find unique latitudes and longitudes (data should be on regular grid)
        const lats = [...new Set(data.map(p => p.lat))].sort((a, b) => b - a); // North to South
        const lons = [...new Set(data.map(p => p.lon))].sort((a, b) => a - b); // West to East

        const height = lats.length;
        const width = lons.length;

        // Create lookup map for fast access
        const dataMap = new Map();
        data.forEach(point => {
            const key = `${point.lat.toFixed(2)},${point.lon.toFixed(2)}`;
            dataMap.set(key, point.value);
        });

        // Build 2D array
        const grid = [];
        for (let i = 0; i < height; i++) {
            const row = [];
            for (let j = 0; j < width; j++) {
                const key = `${lats[i].toFixed(2)},${lons[j].toFixed(2)}`;
                const temp = dataMap.get(key);
                row.push(temp !== undefined ? temp : null);
            }
            grid.push(row);
        }

        console.log(`Organized grid: ${width}x${height} cells`);

        return { width, height, data: grid, lats, lons };
    }

    /**
     * Create a Mercator-compensated image from temperature grid
     * @param {Object} grid - Grid structure with width, height, data, lats, and lons
     * @returns {string} Data URL for the image
     */
    createMercatorImage(grid) {
        const { width, data, lats, lons } = grid;

        // Calculate Mercator y-coordinates for each latitude
        const mercatorYs = lats.map(lat => this.latToMercatorY(lat));

        // Calculate Mercator span for each latitude band (distance between consecutive latitudes in Mercator space)
        const mercatorSpans = [];
        for (let i = 0; i < mercatorYs.length - 1; i++) {
            mercatorSpans.push(Math.abs(mercatorYs[i] - mercatorYs[i + 1]));
        }
        mercatorSpans.push(mercatorSpans[mercatorSpans.length - 1]); // Duplicate last span

        // Total Mercator height
        const totalMercatorHeight = mercatorSpans.reduce((sum, span) => sum + span, 0);

        // Target image height (choose reasonable size)
        const targetHeight = 800;

        // Calculate how many pixels each latitude band should get
        const pixelsPerLatBand = mercatorSpans.map(span =>
            Math.max(1, Math.round((span / totalMercatorHeight) * targetHeight))
        );

        // Calculate actual image height
        const imageHeight = pixelsPerLatBand.reduce((sum, px) => sum + px, 0);

        console.log(`Creating Mercator image: ${width}x${imageHeight} pixels (${lats.length} latitude bands)`);

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = imageHeight;
        const ctx = canvas.getContext('2d');

        // Create image data
        const imageData = ctx.createImageData(width, imageHeight);

        // Fill image with temperature colors, distributing rows according to Mercator spacing
        // Use vertical interpolation to smooth between latitude bands
        let currentPixelRow = 0;
        for (let latIdx = 0; latIdx < lats.length; latIdx++) {
            const numPixelRows = pixelsPerLatBand[latIdx];

            // Get next latitude data for interpolation (if available)
            const hasNextLat = latIdx < lats.length - 1;

            // Fill this many pixel rows, interpolating between current and next latitude
            for (let pixelRow = 0; pixelRow < numPixelRows; pixelRow++) {
                // Calculate interpolation factor (0 at start of band, 1 at end)
                const interpFactor = hasNextLat ? pixelRow / numPixelRows : 0;

                for (let j = 0; j < width; j++) {
                    const temp1 = data[latIdx][j];
                    const temp2 = hasNextLat ? data[latIdx + 1][j] : temp1;

                    const pixelIndex = (currentPixelRow * width + j) * 4;

                    // Interpolate temperature between current and next latitude
                    if (temp1 !== null || temp2 !== null) {
                        let interpolatedTemp;
                        if (temp1 === null) {
                            interpolatedTemp = temp2;
                        } else if (temp2 === null) {
                            interpolatedTemp = temp1;
                        } else {
                            interpolatedTemp = temp1 * (1 - interpFactor) + temp2 * interpFactor;
                        }

                        const color = this.getTemperatureColorRGB(interpolatedTemp);
                        imageData.data[pixelIndex] = color.r;
                        imageData.data[pixelIndex + 1] = color.g;
                        imageData.data[pixelIndex + 2] = color.b;
                        imageData.data[pixelIndex + 3] = 255; // Alpha
                    } else {
                        // Transparent for missing data
                        imageData.data[pixelIndex + 3] = 0;
                    }
                }
                currentPixelRow++;
            }
        }

        // Put image data on canvas
        ctx.putImageData(imageData, 0, 0);

        // Convert to data URL
        return canvas.toDataURL('image/png');
    }

    /**
     * Get RGB color for a temperature value
     * @param {number} temp - Temperature in Fahrenheit
     * @returns {Object} RGB color object {r, g, b}
     */
    getTemperatureColorRGB(temp) {
        // Normalize temperature to 0-1
        const normalized = this.normalizeValue(temp);

        // Peach gradient: white (cold) → coral (hot) - distinct from other layers
        const colorStops = [
            { pos: 0.0, color: { r: 255, g: 255, b: 255 } },    // White (very cold)
            { pos: 0.3, color: { r: 255, g: 235, b: 220 } },    // Very light peach
            { pos: 0.5, color: { r: 255, g: 205, b: 180 } },    // Light peach
            { pos: 0.7, color: { r: 255, g: 170, b: 130 } },    // Medium peach
            { pos: 0.85, color: { r: 250, g: 128, b: 114 } },   // Salmon
            { pos: 1.0, color: { r: 230, g: 90, b: 80 } }       // Deep coral
        ];

        // Find the two color stops to interpolate between
        let lowerStop = colorStops[0];
        let upperStop = colorStops[colorStops.length - 1];

        for (let i = 0; i < colorStops.length - 1; i++) {
            if (normalized >= colorStops[i].pos && normalized <= colorStops[i + 1].pos) {
                lowerStop = colorStops[i];
                upperStop = colorStops[i + 1];
                break;
            }
        }

        // Interpolate between the two colors
        const range = upperStop.pos - lowerStop.pos;
        const factor = range === 0 ? 0 : (normalized - lowerStop.pos) / range;

        return {
            r: Math.round(lowerStop.color.r + (upperStop.color.r - lowerStop.color.r) * factor),
            g: Math.round(lowerStop.color.g + (upperStop.color.g - lowerStop.color.g) * factor),
            b: Math.round(lowerStop.color.b + (upperStop.color.b - lowerStop.color.b) * factor)
        };
    }

    /**
     * Normalize temperature to 0-1 scale
     * Temperature range: -40°F to +122°F → 0 to 1
     * @param {number} value - Temperature in Fahrenheit
     * @returns {number} Normalized value (0-1)
     */
    normalizeValue(value) {
        const minTemp = -40;   // -40°F (global minimum)
        const maxTemp = 122;   // 122°F (global maximum)

        if (value <= minTemp) return 0.0;
        if (value >= maxTemp) return 1.0;

        return (value - minTemp) / (maxTemp - minTemp);
    }

    /**
     * Toggle layer visibility
     * @param {boolean} visible - Whether the layer should be visible
     */
    setVisibility(visible) {
        this.visible = visible;
        if (!visible) {
            this.clear();
        } else if (this.data) {
            this.render(this.data);
        }
    }

    /**
     * Clear the layer
     */
    clear() {
        if (this.imageOverlay) {
            this.map.removeLayer(this.imageOverlay);
            this.imageOverlay = null;
        }
    }
}
