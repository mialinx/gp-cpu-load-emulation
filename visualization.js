// CPU Load Simulator - Visualization
// Handles rendering of sessions and segments

class Visualizer {
    constructor() {
        this.serviceSessionsList = document.getElementById('serviceSessionsList');
        this.etlSessionsList = document.getElementById('etlSessionsList');
        this.adhocSessionsList = document.getElementById('adhocSessionsList');
        this.segmentsList = document.getElementById('segmentsList');
        this.currentTimeElement = document.getElementById('currentTime');
        this.activeSessionsElement = document.getElementById('activeSessions');
        this.overloadedSegmentsElement = document.getElementById('overloadedSegments');
        this.totalWorkElement = document.getElementById('totalWork');
    }

    updateStats(gp, startTime = null) {
        const now = Date.now();
        const activeSessions = gp.activeSessions.length;
        const overloadedSegments = gp.segments.filter(s => s.overloadFactor > 0).length;
        const totalWork = gp.segments.reduce((sum, segment) => sum + segment.totalJobleft, 0);

        // Update time display: 0-based simulation time (elapsed time since simulation started)
        if (startTime) {
            const elapsedTime = Math.floor((now - startTime) / 1000);
            this.currentTimeElement.textContent = elapsedTime;
        } else {
            this.currentTimeElement.textContent = '0';
        }

        // Update statistics
        this.activeSessionsElement.textContent = activeSessions;
        this.overloadedSegmentsElement.textContent = overloadedSegments;
        this.totalWorkElement.textContent = totalWork.toLocaleString();
    }

    renderSessions(gp) {
        // Clear all session lists
        this.serviceSessionsList.innerHTML = '';
        this.etlSessionsList.innerHTML = '';
        this.adhocSessionsList.innerHTML = '';

        // Group sessions by type and render in appropriate columns
        for (const session of gp.sessions) {
            const sessionElement = this.createSessionElement(session);

            if (session.name.startsWith('service-')) {
                this.serviceSessionsList.appendChild(sessionElement);
            } else if (session.name.startsWith('etl-')) {
                this.etlSessionsList.appendChild(sessionElement);
            } else if (session.name.startsWith('adhoc-')) {
                this.adhocSessionsList.appendChild(sessionElement);
            }
        }
    }

    createSessionElement(session) {
        const div = document.createElement('div');
        div.className = `session-item ${session.active ? 'active' : 'idle'}`;

        const nameDiv = document.createElement('div');
        nameDiv.className = 'session-name';
        nameDiv.textContent = session.name;

        const statusSpan = document.createElement('span');
        statusSpan.className = `session-status ${session.active ? 'active' : 'idle'}`;
        statusSpan.textContent = session.active ? 'ACTIVE' : 'IDLE';

        const infoDiv = document.createElement('div');
        infoDiv.className = 'session-info';

        if (session.active && session.query) {
            infoDiv.innerHTML = `
                <div>Query: ${session.query.jobsize.toLocaleString()} units</div>
                <div>Total Queries: ${session.queryCount}</div>
            `;
        } else {
            const nextQueryIn = Math.max(0, Math.floor((session.nextQueryTime - Date.now()) / 1000));
            infoDiv.innerHTML = `
                <div>Next query in: ${nextQueryIn}s</div>
                <div>Total Queries: ${session.queryCount}</div>
            `;
        }

        div.appendChild(nameDiv);
        div.appendChild(statusSpan);
        div.appendChild(infoDiv);

        return div;
    }

    renderSegments(gp) {
        this.segmentsList.innerHTML = '';

        for (let i = 0; i < gp.segments.length; i++) {
            const segment = gp.segments[i];
            const segmentElement = this.createSegmentElement(segment, i + 1);
            this.segmentsList.appendChild(segmentElement);
        }
    }

    getSegmentColor(overloadFactor) {
        // Returns a harmonious color palette where:
        // Level 0: Grey (idle segment)
        // Levels 1-10: Harmonious color progression ending in burgundy
        // All colors are carefully chosen to work well together
        const factor = Math.min(Math.max(overloadFactor, 0), 10);

        // Level 0: Light grey color for idle segments
        if (factor <= 0) {
            return 'rgb(233, 236, 239)';
        }

        // Level 10: Burgundy (Critical)
        if (factor >= 10) {
            return 'rgb(128, 0, 32)';
        }

        // Carefully crafted harmonious color palette
        // Colors progress smoothly with similar saturation/chroma levels for visual harmony
        const colorPalette = [
            { r: 150, g: 200, b: 180 },   // 1: Soft mint-green
            { r: 160, g: 190, b: 150 },   // 2: Soft sage-green
            { r: 180, g: 190, b: 130 },   // 3: Soft yellow-green
            { r: 200, g: 180, b: 120 },   // 4: Soft gold
            { r: 210, g: 160, b: 110 },   // 5: Soft amber
            { r: 200, g: 140, b: 100 },   // 6: Soft orange
            { r: 190, g: 120, b: 90 },    // 7: Soft coral
            { r: 170, g: 90, b: 80 },     // 8: Soft terracotta
            { r: 150, g: 50, b: 60 },     // 9: Deep rose
            { r: 128, g: 0, b: 32 }       // 10: Burgundy (Critical)
        ];

        // Get color for current factor (factor is between 1 and 9.999...)
        // Map factor 1-10 to array indices 0-9
        const arrayIndex = factor - 1; // This gives 0-9 range
        const index = Math.max(0, Math.min(Math.floor(arrayIndex), 8)); // Clamp to valid indices 0-8
        const nextIndex = Math.min(index + 1, 9);
        const t = arrayIndex - index;

        const color1 = colorPalette[index];
        const color2 = colorPalette[nextIndex];

        // Ensure both colors exist before interpolating
        if (!color1 || !color2) {
            // Fallback to a safe color
            return color1 ? `rgb(${color1.r}, ${color1.g}, ${color1.b})` : 'rgb(128, 0, 32)';
        }

        // Smooth interpolation between colors
        const r = Math.round(color1.r + t * (color2.r - color1.r));
        const g = Math.round(color1.g + t * (color2.g - color1.g));
        const b = Math.round(color1.b + t * (color2.b - color1.b));

        return `rgb(${r}, ${g}, ${b})`;
    }

    getSegmentStatusText(overloadFactor) {
        if (overloadFactor === 0) {
            return 'FREE';
        } else if (overloadFactor < 3) {
            return 'LIGHT';
        } else if (overloadFactor < 6) {
            return 'MODERATE';
        } else if (overloadFactor < 8) {
            return 'HEAVY';
        } else {
            return 'CRITICAL';
        }
    }

    createSegmentElement(segment, segmentNumber) {
        const div = document.createElement('div');
        const overloadFactor = segment.overloadFactor;
        const backgroundColor = this.getSegmentColor(overloadFactor);
        // Use white text for darker backgrounds (high overload), dark text for lighter backgrounds
        // Adjust threshold based on the new harmonious palette
        const isDark = overloadFactor > 7;

        // Apply dynamic background color
        div.style.background = `linear-gradient(135deg, ${backgroundColor}, ${this.darkenColor(backgroundColor, 0.1)})`;
        div.style.color = isDark ? '#ffffff' : '#2c3e50';
        div.style.borderLeft = `4px solid ${backgroundColor}`;
        div.className = 'segment-item';

        const nameDiv = document.createElement('div');
        nameDiv.className = 'segment-name';
        nameDiv.textContent = `Segment ${segmentNumber}`;

        const statusSpan = document.createElement('span');
        statusSpan.className = 'segment-status';
        statusSpan.textContent = this.getSegmentStatusText(overloadFactor);
        statusSpan.style.backgroundColor = backgroundColor;
        statusSpan.style.color = isDark ? '#ffffff' : '#2c3e50';

        const infoDiv = document.createElement('div');
        infoDiv.className = 'segment-info';
        infoDiv.style.color = isDark ? 'rgba(255, 255, 255, 0.9)' : '#666';

        const totalWork = segment.totalJobleft;
        const runningSlices = segment.runningSlices.length;
        const overloadFactorValue = overloadFactor.toFixed(2);

        infoDiv.innerHTML = `
            <div>Total Work: ${totalWork.toLocaleString()} units</div>
            <div>Running Slices: ${runningSlices}</div>
            <div>LA: ${segment.loadAverage}</div>
            <div>Overload Factor: ${overloadFactorValue}/10</div>
            <div>Performance: ${segment.currentTickCapacity.toFixed(2)}/${segment.maxTickCapacity.toFixed(2)}</div>

        `;

        div.appendChild(nameDiv);
        div.appendChild(statusSpan);
        div.appendChild(infoDiv);

        return div;
    }

    render(gp, startTime = null) {
        this.updateStats(gp, startTime);
        this.renderSessions(gp);
        this.renderSegments(gp);
    }

    // Animation helpers
    highlightSession(sessionName) {
        const allSessionLists = [this.serviceSessionsList, this.etlSessionsList, this.adhocSessionsList];
        for (const sessionList of allSessionLists) {
            const sessionElements = sessionList.querySelectorAll('.session-item');
            for (const element of sessionElements) {
                if (element.querySelector('.session-name').textContent === sessionName) {
                    element.style.transform = 'scale(1.05)';
                    element.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.2)';
                    setTimeout(() => {
                        element.style.transform = '';
                        element.style.boxShadow = '';
                    }, 500);
                    return;
                }
            }
        }
    }

    highlightSegment(segmentNumber) {
        const segmentElements = this.segmentsList.querySelectorAll('.segment-item');
        if (segmentElements[segmentNumber - 1]) {
            const element = segmentElements[segmentNumber - 1];
            element.style.transform = 'scale(1.05)';
            element.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.2)';
            setTimeout(() => {
                element.style.transform = '';
                element.style.boxShadow = '';
            }, 500);
        }
    }

    // Utility method to darken a color
    darkenColor(color, amount) {
        // Extract RGB values from rgb() string
        const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (!match) return color;

        const r = Math.floor(parseInt(match[1]) * (1 - amount));
        const g = Math.floor(parseInt(match[2]) * (1 - amount));
        const b = Math.floor(parseInt(match[3]) * (1 - amount));

        return `rgb(${r}, ${g}, ${b})`;
    }

    // Utility method to format numbers
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    // Method to show loading state
    showLoading() {
        this.serviceSessionsList.innerHTML = '<div class="loading">Loading...</div>';
        this.etlSessionsList.innerHTML = '<div class="loading">Loading...</div>';
        this.adhocSessionsList.innerHTML = '<div class="loading">Loading...</div>';
        this.segmentsList.innerHTML = '<div class="loading">Loading...</div>';
    }

    // Method to clear all content
    clear() {
        this.serviceSessionsList.innerHTML = '';
        this.etlSessionsList.innerHTML = '';
        this.adhocSessionsList.innerHTML = '';
        this.segmentsList.innerHTML = '';
        this.currentTimeElement.textContent = '0';
        this.activeSessionsElement.textContent = '0';
        this.overloadedSegmentsElement.textContent = '0';
        this.totalWorkElement.textContent = '0';
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Visualizer;
}
