/**
 * PM2.5 Layer - Image overlay visualization for PM2.5 data
 */
class PM25Layer {
    constructor(map) {
        this.map = map;
        this.imageOverlay = null;
        this.data = null;
        this.visible = true;
    }

    /**
     * Render PM2.5 as image overlay
     * @param {Array} data - Array of {lat, lon, value} objects
     */
    render(data) {
        if (!this.visible || !data || data.length === 0) {
            this.clear();
            return;
        }

        // Filter out "Good" air quality (≤ 9.0 μg/m³)
        const filteredData = data.filter(point => point.value > 9.0);

        if (filteredData.length === 0) {
            this.clear();
            return;
        }

        this.data = filteredData;

        // Create image overlay
        this.createImageOverlay();
    }

    /**
     * Convert latitude to Web Mercator y-coordinate
     */
    latToMercatorY(lat) {
        lat = Math.max(-85, Math.min(85, lat));
        const latRad = (lat * Math.PI) / 180;
        return Math.log(Math.tan(Math.PI / 4 + latRad / 2));
    }

    /**
     * Create image overlay from PM2.5 data
     */
    createImageOverlay() {
        // Organize data into a grid
        const grid = this.organizeDataIntoGrid(this.data);

        // Create Mercator-compensated image from grid
        const imageUrl = this.createMercatorImage(grid);

        // Remove old overlay
        if (this.imageOverlay) {
            this.map.removeLayer(this.imageOverlay);
        }

        // Calculate bounds
        const { lats, lons } = grid;
        const northLat = lats[0];
        const southLat = lats[lats.length - 1];
        const westLon = lons[0];
        const eastLon = lons[lons.length - 1];

        const latSpacing = lats.length > 1 ? Math.abs(lats[0] - lats[1]) : 1.2;
        const lonSpacing = lons.length > 1 ? Math.abs(lons[1] - lons[0]) : 1.2;

        const bounds = [
            [southLat - latSpacing / 2, westLon - lonSpacing / 2],
            [northLat + latSpacing / 2, eastLon + lonSpacing / 2]
        ];

        this.imageOverlay = L.imageOverlay(imageUrl, bounds, {
            opacity: 0.7,
            interactive: false,
            className: 'pm25-overlay'
        });
        this.imageOverlay.addTo(this.map);

        // Apply blur filter for smooth edges
        const overlayElement = this.imageOverlay.getElement();
        if (overlayElement) {
            overlayElement.style.filter = 'blur(8px)';
        }

        console.log('PM2.5 image overlay added');
    }

    /**
     * Organize scattered data points into a 2D grid
     */
    organizeDataIntoGrid(data) {
        const lats = [...new Set(data.map(p => p.lat))].sort((a, b) => b - a);
        const lons = [...new Set(data.map(p => p.lon))].sort((a, b) => a - b);

        const height = lats.length;
        const width = lons.length;

        const dataMap = new Map();
        data.forEach(point => {
            const key = `${point.lat.toFixed(2)},${point.lon.toFixed(2)}`;
            dataMap.set(key, point.value);
        });

        const grid = [];
        for (let i = 0; i < height; i++) {
            const row = [];
            for (let j = 0; j < width; j++) {
                const key = `${lats[i].toFixed(2)},${lons[j].toFixed(2)}`;
                const value = dataMap.get(key);
                row.push(value !== undefined ? value : null);
            }
            grid.push(row);
        }

        return { width, height, data: grid, lats, lons };
    }

    /**
     * Create a Mercator-compensated image from PM2.5 grid
     */
    createMercatorImage(grid) {
        const { width, data, lats } = grid;

        // Calculate Mercator y-coordinates
        const mercatorYs = lats.map(lat => this.latToMercatorY(lat));

        const mercatorSpans = [];
        for (let i = 0; i < mercatorYs.length - 1; i++) {
            mercatorSpans.push(Math.abs(mercatorYs[i] - mercatorYs[i + 1]));
        }
        mercatorSpans.push(mercatorSpans[mercatorSpans.length - 1]);

        const totalMercatorHeight = mercatorSpans.reduce((sum, span) => sum + span, 0);
        const targetHeight = 800;

        const pixelsPerLatBand = mercatorSpans.map(span =>
            Math.max(1, Math.round((span / totalMercatorHeight) * targetHeight))
        );

        const imageHeight = pixelsPerLatBand.reduce((sum, px) => sum + px, 0);

        // Scale width for horizontal interpolation (more pixels = smoother)
        const pixelsPerLonBand = 3;
        const imageWidth = width * pixelsPerLonBand;

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = imageWidth;
        canvas.height = imageHeight;
        const ctx = canvas.getContext('2d');

        const imageData = ctx.createImageData(imageWidth, imageHeight);

        // Fill image with PM2.5 colors using bilinear interpolation
        let currentPixelRow = 0;
        for (let latIdx = 0; latIdx < lats.length; latIdx++) {
            const numPixelRows = pixelsPerLatBand[latIdx];
            const hasNextLat = latIdx < lats.length - 1;

            for (let pixelRow = 0; pixelRow < numPixelRows; pixelRow++) {
                const vertInterpFactor = hasNextLat ? pixelRow / numPixelRows : 0;

                for (let lonIdx = 0; lonIdx < width; lonIdx++) {
                    const hasNextLon = lonIdx < width - 1;

                    // Get four corner values for bilinear interpolation
                    const topLeft = data[latIdx][lonIdx];
                    const topRight = hasNextLon ? data[latIdx][lonIdx + 1] : topLeft;
                    const bottomLeft = hasNextLat ? data[latIdx + 1][lonIdx] : topLeft;
                    const bottomRight = (hasNextLat && hasNextLon) ? data[latIdx + 1][lonIdx + 1] : topLeft;

                    // Generate multiple pixels per lon band for horizontal smoothing
                    for (let subPixel = 0; subPixel < pixelsPerLonBand; subPixel++) {
                        const horizInterpFactor = subPixel / pixelsPerLonBand;
                        const pixelCol = lonIdx * pixelsPerLonBand + subPixel;
                        const pixelIndex = (currentPixelRow * imageWidth + pixelCol) * 4;

                        // Bilinear interpolation
                        if (topLeft !== null || topRight !== null || bottomLeft !== null || bottomRight !== null) {
                            // Handle null values gracefully
                            const tl = topLeft !== null ? topLeft : (topRight || bottomLeft || bottomRight || 0);
                            const tr = topRight !== null ? topRight : (topLeft || bottomRight || bottomLeft || 0);
                            const bl = bottomLeft !== null ? bottomLeft : (topLeft || bottomRight || topRight || 0);
                            const br = bottomRight !== null ? bottomRight : (topRight || bottomLeft || topLeft || 0);

                            // Interpolate top edge
                            const topValue = tl * (1 - horizInterpFactor) + tr * horizInterpFactor;
                            // Interpolate bottom edge
                            const bottomValue = bl * (1 - horizInterpFactor) + br * horizInterpFactor;
                            // Interpolate vertically
                            const interpolatedValue = topValue * (1 - vertInterpFactor) + bottomValue * vertInterpFactor;

                            const color = this.getColorForValue(interpolatedValue);
                            imageData.data[pixelIndex] = color.r;
                            imageData.data[pixelIndex + 1] = color.g;
                            imageData.data[pixelIndex + 2] = color.b;
                            imageData.data[pixelIndex + 3] = color.a;
                        } else {
                            imageData.data[pixelIndex + 3] = 0; // Transparent
                        }
                    }
                }
                currentPixelRow++;
            }
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas.toDataURL('image/png');
    }

    /**
     * Get RGBA color for a PM2.5 value
     */
    getColorForValue(value) {
        // Normalize value
        const normalized = this.normalizeValue(value);

        // Grayscale gradient (light gray -> nearly black)
        const colorStops = [
            { pos: 0.0, color: { r: 180, g: 180, b: 180, a: 200 } },   // Moderate - Light gray, 78% opacity
            { pos: 0.25, color: { r: 130, g: 130, b: 130, a: 220 } },  // Unhealthy Sensitive - Medium gray, 86%
            { pos: 0.5, color: { r: 90, g: 90, b: 90, a: 235 } },      // Unhealthy - Dark gray, 92%
            { pos: 0.75, color: { r: 60, g: 60, b: 60, a: 245 } },     // Very Unhealthy - Very dark, 96%
            { pos: 1.0, color: { r: 30, g: 30, b: 30, a: 255 } }       // Hazardous - Nearly black, 100%
        ];

        // Find color stops to interpolate between
        let lowerStop = colorStops[0];
        let upperStop = colorStops[colorStops.length - 1];

        for (let i = 0; i < colorStops.length - 1; i++) {
            if (normalized >= colorStops[i].pos && normalized <= colorStops[i + 1].pos) {
                lowerStop = colorStops[i];
                upperStop = colorStops[i + 1];
                break;
            }
        }

        // Interpolate
        const range = upperStop.pos - lowerStop.pos;
        const factor = range === 0 ? 0 : (normalized - lowerStop.pos) / range;

        return {
            r: Math.round(lowerStop.color.r + (upperStop.color.r - lowerStop.color.r) * factor),
            g: Math.round(lowerStop.color.g + (upperStop.color.g - lowerStop.color.g) * factor),
            b: Math.round(lowerStop.color.b + (upperStop.color.b - lowerStop.color.b) * factor),
            a: Math.round(lowerStop.color.a + (upperStop.color.a - lowerStop.color.a) * factor)
        };
    }

    /**
     * Normalize PM2.5 value to 0-1 scale
     */
    normalizeValue(value) {
        // 9.1 (min shown) to 255.5+ (hazardous)
        const minValue = 9.0;
        const maxValue = 255.5;

        if (value <= minValue) return 0.0;
        if (value >= maxValue) return 1.0;

        return (value - minValue) / (maxValue - minValue);
    }

    /**
     * Toggle layer visibility
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
