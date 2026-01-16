/**
 * Pollution Sources Layer - Combined visualization for fires and power plants
 */
class PollutionSourcesLayer {
    constructor(map) {
        this.map = map;
        this.markerClusterGroup = null;
        this.data = null;
        this.visible = true;
        this.viewMode = 'circles';
    }

    /**
     * Render pollution sources as clustered markers
     * @param {Array} sources - Array of source objects with 'type' field ('fire' or 'power_plant')
     */
    render(sources) {
        if (!this.visible || !sources || sources.length === 0) {
            this.clear();
            return;
        }

        this.data = sources;

        // Remove old cluster group
        if (this.markerClusterGroup) {
            this.map.removeLayer(this.markerClusterGroup);
        }

        // Create marker cluster group
        this.markerClusterGroup = L.markerClusterGroup({
            maxClusterRadius: 60,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true
        });

        // Add markers based on type and view mode
        sources.forEach(source => {
            let marker;
            if (source.type === 'fire') {
                marker = this.viewMode === 'icons'
                    ? this.createFireIconMarker(source)
                    : this.createFireMarker(source);
            } else if (source.type === 'power_plant') {
                marker = this.viewMode === 'icons'
                    ? this.createPowerPlantIconMarker(source)
                    : this.createPowerPlantMarker(source);
            }
            if (marker) {
                this.markerClusterGroup.addLayer(marker);
            }
        });

        this.map.addLayer(this.markerClusterGroup);

        const fireCount = sources.filter(s => s.type === 'fire').length;
        const plantCount = sources.filter(s => s.type === 'power_plant').length;
        console.log(`Rendered ${fireCount} fires and ${plantCount} power plants`);
    }

    /**
     * Create marker for fire
     */
    createFireMarker(fire) {
        const color = this.getFireColor(fire.confidence);
        const radius = this.getFireRadius(fire.frp);

        const marker = L.circleMarker([fire.lat, fire.lon], {
            radius: radius,
            fillColor: color,
            color: '#000',
            weight: 1,
            opacity: 0.8,
            fillOpacity: 0.6
        });

        marker.bindPopup(`
            <strong>Active Fire</strong><br>
            Confidence: ${fire.confidence.toFixed(1)}%<br>
            Brightness: ${fire.brightness.toFixed(1)} K<br>
            FRP: ${fire.frp.toFixed(1)} MW<br>
            Time: ${fire.datetime || 'N/A'}
        `);

        return marker;
    }

    /**
     * Create marker for power plant
     */
    createPowerPlantMarker(plant) {
        const color = this.getPowerPlantColor(plant.fuel_type);
        const radius = this.getPowerPlantRadius(plant.capacity_mw);

        const marker = L.circleMarker([plant.lat, plant.lon], {
            radius: radius,
            fillColor: color,
            color: '#000',
            weight: 1,
            opacity: 0.8,
            fillOpacity: 0.5
        });

        marker.bindPopup(`
            <strong>${plant.name}</strong><br>
            Capacity: ${plant.capacity_mw.toFixed(0)} MW<br>
            Fuel: ${plant.fuel_type}<br>
            Country: ${plant.country}
        `);

        return marker;
    }

    /**
     * Get color for fire based on confidence
     * Nominal (~70) = Orange, High (~95) = Red
     */
    getFireColor(confidence) {
        if (confidence >= 90) return '#FF0000';  // Red - High confidence
        return '#FF8C00';  // Orange - Nominal confidence
    }

    /**
     * Get radius for fire based on FRP
     */
    getFireRadius(frp) {
        if (frp < 10) return 5;
        if (frp < 50) return 7;
        if (frp < 100) return 9;
        return 11;
    }

    /**
     * Get color for power plant based on fuel type (fossil fuels only)
     */
    getPowerPlantColor(fuelType) {
        const fuelColors = {
            'Coal': '#1a1a1a',
            'Gas': '#4169E1',
            'Oil': '#8B4513',
            'Petcoke': '#2F4F4F',
            'Waste': '#A0522D',
            'Other': '#696969'
        };
        return fuelColors[fuelType] || '#696969';
    }

    /**
     * Get radius for power plant based on capacity
     */
    getPowerPlantRadius(capacityMW) {
        if (capacityMW < 200) return 4;
        if (capacityMW < 500) return 6;
        if (capacityMW < 1000) return 8;
        if (capacityMW < 2000) return 10;
        return 12;
    }

    /**
     * Get SVG markup for icon based on source type
     * @param {string} sourceType - Type of pollution source
     * @returns {string} SVG markup
     */
    getIconSVG(sourceType) {
        // Main power plant icon (clean factory with smokestack)
        const powerPlantMain = `
            <rect x="2" y="9" width="12" height="13" stroke="#555" stroke-width="1.5" fill="none"/>
            <rect x="4" y="12" width="3" height="3" stroke="#555" stroke-width="1" fill="none"/>
            <rect x="9" y="12" width="3" height="3" stroke="#555" stroke-width="1" fill="none"/>
            <rect x="11" y="2" width="4" height="10" stroke="#555" stroke-width="1.5" fill="none"/>
        `;

        // Simple fuel type icons for bottom-right corner
        const fuelOverlays = {
            // Coal: simple black rock
            'Coal': `
                <circle cx="19" cy="19" r="4" fill="white" stroke="white" stroke-width="1"/>
                <path d="M16 19c0-1.5 1.5-3 3-3s3 1.5 3 3-1.5 3-3 3-3-1.5-3-3z" fill="#555"/>
            `,
            // Gas: small flame
            'Gas': `
                <circle cx="19" cy="19" r="4" fill="white" stroke="white" stroke-width="1"/>
                <path d="M19 14c0 2-2 3-2 5a2 2 0 0 0 4 0c0-2-2-3-2-5z" fill="#555"/>
            `,
            // Oil: oil droplet
            'Oil': `
                <circle cx="19" cy="19" r="4" fill="white" stroke="white" stroke-width="1"/>
                <path d="M19 14c0 0-3 3-3 5.5a3 3 0 0 0 6 0c0-2.5-3-5.5-3-5.5z" fill="#555"/>
            `,
            // Petcoke: P letter
            'Petcoke': `
                <circle cx="19" cy="19" r="4" fill="white" stroke="#555" stroke-width="1"/>
                <text x="19" y="22" text-anchor="middle" font-size="8" font-weight="bold" fill="#555" stroke="none">P</text>
            `,
            // Waste: recycle symbol (three arrows)
            'Waste': `
                <circle cx="19" cy="19" r="4" fill="white" stroke="white" stroke-width="1"/>
                <path d="M17 17l2 4 2-4M19 21v-6" stroke="#555" stroke-width="1.5" fill="none"/>
            `,
            // Other: no overlay
            'Other': ``
        };

        const icons = {
            // Fire: Flame only
            'fire': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="1.5">
                <path d="M12 2c0 4-4 6-4 10a4 4 0 0 0 8 0c0-4-4-6-4-10z"/>
                <path d="M12 12c0 2-1.5 3-1.5 4.5a1.5 1.5 0 0 0 3 0c0-1.5-1.5-2.5-1.5-4.5z"/>
            </svg>`,
            // Power plants: main factory + fuel overlay
            'Coal': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                ${powerPlantMain}
                ${fuelOverlays['Coal']}
            </svg>`,
            'Gas': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                ${powerPlantMain}
                ${fuelOverlays['Gas']}
            </svg>`,
            'Oil': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                ${powerPlantMain}
                ${fuelOverlays['Oil']}
            </svg>`,
            'Petcoke': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                ${powerPlantMain}
                ${fuelOverlays['Petcoke']}
            </svg>`,
            'Waste': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                ${powerPlantMain}
                ${fuelOverlays['Waste']}
            </svg>`,
            'Other': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                ${powerPlantMain}
            </svg>`
        };
        return icons[sourceType] || icons['Other'];
    }

    /**
     * Create icon marker for fire
     */
    createFireIconMarker(fire) {
        const icon = L.divIcon({
            html: this.getIconSVG('fire'),
            className: 'pollution-source-icon',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        const marker = L.marker([fire.lat, fire.lon], { icon });

        marker.bindPopup(`
            <strong>Active Fire</strong><br>
            Confidence: ${fire.confidence.toFixed(1)}%<br>
            Brightness: ${fire.brightness.toFixed(1)} K<br>
            FRP: ${fire.frp.toFixed(1)} MW<br>
            Time: ${fire.datetime || 'N/A'}
        `);

        return marker;
    }

    /**
     * Create icon marker for power plant
     */
    createPowerPlantIconMarker(plant) {
        const icon = L.divIcon({
            html: this.getIconSVG(plant.fuel_type),
            className: 'pollution-source-icon',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        const marker = L.marker([plant.lat, plant.lon], { icon });

        marker.bindPopup(`
            <strong>${plant.name}</strong><br>
            Capacity: ${plant.capacity_mw.toFixed(0)} MW<br>
            Fuel: ${plant.fuel_type}<br>
            Country: ${plant.country}
        `);

        return marker;
    }

    /**
     * Set view mode and re-render
     * @param {string} mode - 'circles' or 'icons'
     */
    setViewMode(mode) {
        this.viewMode = mode;
        if (this.visible && this.data) {
            this.render(this.data);
        }
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
        if (this.markerClusterGroup) {
            this.map.removeLayer(this.markerClusterGroup);
            this.markerClusterGroup = null;
        }
    }
}
