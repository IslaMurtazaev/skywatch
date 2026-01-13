/**
 * Precipitation Layer - Image overlay visualization for precipitation data
 */
class PrecipLayer {
    constructor(map) {
        this.map = map;
        this.imageOverlay = null;
        this.data = null;
        this.visible = true;
    }

    /**
     * Render precipitation as image overlay
     * @param {Array} data - Array of {lat, lon, value} objects
     */
    render(data) {
        if (!this.visible || !data || data.length === 0) {
            this.clear();
            return;
        }

        // Filter out light precipitation (< 2 mm)
        const significantData = data.filter(point => point.value >= 2);

        if (significantData.length === 0) {
            this.clear();
            return;
        }

        this.data = significantData;

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
     * Create image overlay from precipitation data
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
            opacity: 0.8,
            interactive: false,
            className: 'precip-overlay'
        });
        this.imageOverlay.addTo(this.map);

        // Apply blur filter for smooth edges
        const overlayElement = this.imageOverlay.getElement();
        if (overlayElement) {
            overlayElement.style.filter = 'blur(8px)';
        }

        console.log('Precipitation image overlay added');
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
     * Create a Mercator-compensated image from precipitation grid
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

        // Fill image with precipitation colors using bilinear interpolation
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
     * Get RGBA color for a precipitation value
     */
    getColorForValue(value) {
        // Normalize value
        const normalized = this.normalizeValue(value);

        // Green gradient (light green -> dark green)
        const colorStops = [
            { pos: 0.0, color: { r: 130, g: 220, b: 130, a: 220 } },   // Moderate (2-5 mm) - Light green, 86%
            { pos: 0.4, color: { r: 70, g: 200, b: 70, a: 235 } },     // Heavy (5-10 mm) - Lime green, 92%
            { pos: 0.7, color: { r: 40, g: 160, b: 40, a: 245 } },     // Very Heavy (10-20 mm) - Forest green, 96%
            { pos: 1.0, color: { r: 0, g: 120, b: 0, a: 255 } }        // Extreme (20+ mm) - Dark green, 100%
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
     * Normalize precipitation value to 0-1 scale
     */
    normalizeValue(value) {
        // 2 mm (min shown) to 40+ mm (extreme)
        const minValue = 2;
        const maxValue = 40;

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
