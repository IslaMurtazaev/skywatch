/**
 * Pollution Sources Layer - Combined visualization for fires and power plants
 */
class PollutionSourcesLayer {
    constructor(map) {
        this.map = map;
        this.markerClusterGroup = null;
        this.data = null;
        this.visible = true;
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

        // Add markers based on type
        sources.forEach(source => {
            let marker;
            if (source.type === 'fire') {
                marker = this.createFireMarker(source);
            } else if (source.type === 'power_plant') {
                marker = this.createPowerPlantMarker(source);
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
     */
    getFireColor(confidence) {
        const normalized = (confidence - 50) / 50;
        if (normalized < 0.33) return '#FFFF00';  // Yellow
        if (normalized < 0.66) return '#FF8C00';  // Orange
        return '#FF0000';  // Red
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
     * Get color for power plant based on fuel type
     */
    getPowerPlantColor(fuelType) {
        const fuelColors = {
            'Coal': '#1a1a1a',
            'Gas': '#4169E1',
            'Oil': '#8B4513',
            'Nuclear': '#9370DB',
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
