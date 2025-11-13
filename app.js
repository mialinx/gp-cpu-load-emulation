// CPU Load Simulator - Main Application
// Handles the simulation loop and user interactions

class CPULoadSimulator {
    constructor() {
        this.gp = null;
        this.visualizer = new Visualizer();
        this.isRunning = false;
        this.animationId = null;
        this.startTime = null;

        this.initializeElements();
        this.loadParametersFromStorage();
        this.bindEvents();
        this.initializeGP();
        this.drawDegradationGraph();
    }

    initializeElements() {
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.exportBtn = document.getElementById('exportBtn');
        this.importInput = document.getElementById('importInput');
        this.configPanel = document.getElementById('configPanel');
        this.configPanelContent = document.getElementById('configPanelContent');
        this.numSegmentsInput = document.getElementById('numSegments');
        this.numCoresInput = document.getElementById('numCores');
        this.coreCapacityInput = document.getElementById('coreCapacity');
        this.sliceDevInput = document.getElementById('sliceDev');
        this.sliceDelayInput = document.getElementById('sliceDelay');
        this.degradationFunctionInput = document.getElementById('degradationFunction');
        this.degradationGraph = document.getElementById('degradationGraph');

        // Session configuration inputs
        this.serviceCountInput = document.getElementById('serviceCount');
        this.serviceJobSizeAvgInput = document.getElementById('serviceJobSizeAvg');
        this.serviceJobSizeDevInput = document.getElementById('serviceJobSizeDev');
        this.serviceIntervalAvgInput = document.getElementById('serviceIntervalAvg');
        this.serviceIntervalDevInput = document.getElementById('serviceIntervalDev');

        this.etlCountInput = document.getElementById('etlCount');
        this.etlJobSizeAvgInput = document.getElementById('etlJobSizeAvg');
        this.etlJobSizeDevInput = document.getElementById('etlJobSizeDev');
        this.etlIntervalAvgInput = document.getElementById('etlIntervalAvg');
        this.etlIntervalDevInput = document.getElementById('etlIntervalDev');

        this.adhocCountInput = document.getElementById('adhocCount');
        this.adhocJobSizeAvgInput = document.getElementById('adhocJobSizeAvg');
        this.adhocJobSizeDevInput = document.getElementById('adhocJobSizeDev');
        this.adhocIntervalAvgInput = document.getElementById('adhocIntervalAvg');
        this.adhocIntervalDevInput = document.getElementById('adhocIntervalDev');
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startSimulation());
        this.stopBtn.addEventListener('click', () => this.stopSimulation());
        this.exportBtn.addEventListener('click', () => this.exportSettings());
        this.importInput.addEventListener('change', (e) => this.importSettings(e));

        // Auto-save parameters when inputs change
        const allInputs = [
            this.numSegmentsInput,
            this.numCoresInput,
            this.coreCapacityInput,
            this.sliceDevInput,
            this.sliceDelayInput,
            this.degradationFunctionInput,
            this.serviceCountInput,
            this.serviceJobSizeAvgInput,
            this.serviceJobSizeDevInput,
            this.serviceIntervalAvgInput,
            this.serviceIntervalDevInput,
            this.etlCountInput,
            this.etlJobSizeAvgInput,
            this.etlJobSizeDevInput,
            this.etlIntervalAvgInput,
            this.etlIntervalDevInput,
            this.adhocCountInput,
            this.adhocJobSizeAvgInput,
            this.adhocJobSizeDevInput,
            this.adhocIntervalAvgInput,
            this.adhocIntervalDevInput
        ];

        allInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.saveParametersToStorage();
                if (input === this.degradationFunctionInput) {
                    this.drawDegradationGraph();
                }
            });
            input.addEventListener('input', () => this.saveParametersToStorage());
        });

        // Draw initial degradation graph
        this.drawDegradationGraph();

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.isRunning) {
                    this.stopSimulation();
                } else {
                    this.startSimulation();
                }
            }
        });
    }

    initializeGP() {
        // Get parameters from inputs
        const segments = parseInt(this.numSegmentsInput.value) || 16;
        const cores = parseInt(this.numCoresInput.value) || 16;
        const coreCapacity = parseInt(this.coreCapacityInput.value) || 100;
        const degradationFunctionType = this.degradationFunctionInput.value || 'linear';

        // Map degradation function type to actual function
        const degradationFunctions = {
            'linear': linearDegradation,
            'zero': zeroDegradation,
            'exponential': exponentialDegradation,
            'hardExponential': hardExponentialDegradation,
            'veryHardExponential': veryHardExponentialDegradation
        };
        const selectedDegradationFunction = degradationFunctions[degradationFunctionType] || linearDegradation;

        // Get sliceDev and sliceDelay from inputs
        const sliceDevValue = parseFloat(this.sliceDevInput.value);
        const sliceDev = isNaN(sliceDevValue) ? 0.05 : sliceDevValue;
        const sliceDelayValue = parseInt(this.sliceDelayInput.value);
        const sliceDelay = isNaN(sliceDelayValue) ? 1000 : sliceDelayValue * 1000;

        // Create GP instance with parameters from inputs
        this.gp = new GP(
            segments,
            cores,
            coreCapacity,
            0.1, // concurrencyOverhead (kept for compatibility, not used)
            sliceDev,
            sliceDelay
        );

        // Set the selected degradation function
        this.gp.degradationFunction = selectedDegradationFunction;

        // Add service sessions
        const serviceCountVal = parseInt(this.serviceCountInput.value);
        const serviceCount = isNaN(serviceCountVal) ? 10 : serviceCountVal;
        const serviceJobSizeAvg = parseInt(this.serviceJobSizeAvgInput.value) || coreCapacity;
        const serviceJobSizeDev = parseInt(this.serviceJobSizeDevInput.value) || Math.floor(serviceJobSizeAvg / 2);
        const serviceIntervalAvg = (parseInt(this.serviceIntervalAvgInput.value) || 40) * 1000;
        const serviceIntervalDev = (parseInt(this.serviceIntervalDevInput.value) || 8) * 1000;

        for (let i = 0; i < serviceCount; i++) {
            this.gp.addSession(`service-${i}`, serviceJobSizeAvg, serviceJobSizeDev, serviceIntervalAvg, serviceIntervalDev);
        }

        // Add ETL sessions
        const etlCountVal = parseInt(this.etlCountInput.value);
        const etlCount = isNaN(etlCountVal) ? 10 : etlCountVal;
        const etlJobSizeAvg = parseInt(this.etlJobSizeAvgInput.value) || 3 * coreCapacity;
        const etlJobSizeDev = parseInt(this.etlJobSizeDevInput.value) || Math.floor(etlJobSizeAvg / 2);
        const etlIntervalAvg = (parseInt(this.etlIntervalAvgInput.value) || 650) * 1000;
        const etlIntervalDev = (parseInt(this.etlIntervalDevInput.value) || 100) * 1000;

        for (let i = 0; i < etlCount; i++) {
            this.gp.addSession(`etl-${i}`, etlJobSizeAvg, etlJobSizeDev, etlIntervalAvg, etlIntervalDev);
        }

        // Add ad-hoc sessions
        const adhocCountVal = parseInt(this.adhocCountInput.value);
        const adhocCount = isNaN(adhocCountVal) ? 5 : adhocCountVal;
        const adhocJobSizeAvg = parseInt(this.adhocJobSizeAvgInput.value) || 5 * coreCapacity;
        const adhocJobSizeDev = parseInt(this.adhocJobSizeDevInput.value) || Math.floor(adhocJobSizeAvg / 2);
        const adhocIntervalAvg = (parseInt(this.adhocIntervalAvgInput.value) || 450) * 1000;
        const adhocIntervalDev = (parseInt(this.adhocIntervalDevInput.value) || 450) * 1000;

        for (let i = 0; i < adhocCount; i++) {
            this.gp.addSession(`adhoc-${i}`, adhocJobSizeAvg, adhocJobSizeDev, adhocIntervalAvg, adhocIntervalDev);
        }

        // Initial render
        this.visualizer.render(this.gp);
    }

    startSimulation() {
        if (this.isRunning) return;

        // Clear visualization and reinitialize GP with new configuration parameters
        this.visualizer.clear();
        this.initializeGP();

        this.isRunning = true;
        this.startTime = Date.now();

        this.startBtn.disabled = true;
        this.stopBtn.disabled = false;

        // Disable parameter inputs during simulation
        this.numSegmentsInput.disabled = true;
        this.numCoresInput.disabled = true;
        this.coreCapacityInput.disabled = true;
        this.sliceDevInput.disabled = true;
        this.sliceDelayInput.disabled = true;
        this.degradationFunctionInput.disabled = true;

        // Disable session configuration inputs during simulation
        this.serviceCountInput.disabled = true;
        this.serviceJobSizeAvgInput.disabled = true;
        this.serviceJobSizeDevInput.disabled = true;
        this.serviceIntervalAvgInput.disabled = true;
        this.serviceIntervalDevInput.disabled = true;

        this.etlCountInput.disabled = true;
        this.etlJobSizeAvgInput.disabled = true;
        this.etlJobSizeDevInput.disabled = true;
        this.etlIntervalAvgInput.disabled = true;
        this.etlIntervalDevInput.disabled = true;

        this.adhocCountInput.disabled = true;
        this.adhocJobSizeAvgInput.disabled = true;
        this.adhocJobSizeDevInput.disabled = true;
        this.adhocIntervalAvgInput.disabled = true;
        this.adhocIntervalDevInput.disabled = true;

        // Collapse configuration panel
        this.collapseConfigPanel();

        // Start real-time simulation loop (once per second)
        this.animationId = setInterval(() => this.simulationLoop(), 1000);

        // Initial render
        this.simulationLoop();

        // Show notification
        this.showNotification('Simulation started with new configuration', 'success');
    }

    stopSimulation() {
        if (!this.isRunning) return;

        this.isRunning = false;

        if (this.animationId) {
            clearInterval(this.animationId);
            this.animationId = null;
        }

        // Clear visualization and reset state to default
        this.visualizer.clear();
        this.initializeGP();

        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;

        // Re-enable parameter inputs when simulation stops
        this.numSegmentsInput.disabled = false;
        this.numCoresInput.disabled = false;
        this.coreCapacityInput.disabled = false;
        this.sliceDevInput.disabled = false;
        this.sliceDelayInput.disabled = false;
        this.degradationFunctionInput.disabled = false;

        // Re-enable session configuration inputs when simulation stops
        this.serviceCountInput.disabled = false;
        this.serviceJobSizeAvgInput.disabled = false;
        this.serviceJobSizeDevInput.disabled = false;
        this.serviceIntervalAvgInput.disabled = false;
        this.serviceIntervalDevInput.disabled = false;

        this.etlCountInput.disabled = false;
        this.etlJobSizeAvgInput.disabled = false;
        this.etlJobSizeDevInput.disabled = false;
        this.etlIntervalAvgInput.disabled = false;
        this.etlIntervalDevInput.disabled = false;

        this.adhocCountInput.disabled = false;
        this.adhocJobSizeAvgInput.disabled = false;
        this.adhocJobSizeDevInput.disabled = false;
        this.adhocIntervalAvgInput.disabled = false;
        this.adhocIntervalDevInput.disabled = false;

        // Expand configuration panel
        this.expandConfigPanel();

        // Show notification
        this.showNotification('Simulation stopped and reset', 'info');
    }

    simulationLoop() {
        if (!this.isRunning) return;

        const now = Date.now();

        // Update the simulation
        this.gp.tick(now);

        // Render the current state with start time for 0-based time display
        this.visualizer.render(this.gp, this.startTime);
    }

    collapseConfigPanel() {
        if (this.configPanel) {
            this.configPanel.classList.add('collapsed');
        }
    }

    expandConfigPanel() {
        if (this.configPanel) {
            this.configPanel.classList.remove('collapsed');
        }
    }

    drawDegradationGraph() {
        if (!this.degradationGraph) return;

        const svg = this.degradationGraph;
        svg.innerHTML = ''; // Clear previous graph

        // Use viewBox dimensions for consistent scaling
        const viewBox = svg.getAttribute('viewBox');
        const width = viewBox ? parseInt(viewBox.split(' ')[2]) : 400;
        const height = viewBox ? parseInt(viewBox.split(' ')[3]) : 400;
        const padding = { top: 10, right: 20, bottom: 25, left: 40 };
        const graphWidth = width - padding.left - padding.right;
        const graphHeight = height - padding.top - padding.bottom;

        // Get selected degradation function
        const degradationFunctionType = this.degradationFunctionInput.value || 'linear';
        const degradationFunctions = {
            'linear': linearDegradation,
            'zero': zeroDegradation,
            'exponential': exponentialDegradation,
            'hardExponential': hardExponentialDegradation,
            'veryHardExponential': veryHardExponentialDegradation,
        };
        const degradationFunction = degradationFunctions[degradationFunctionType] || linearDegradation;

        // Calculate points
        const points = [];
        const samples = 100;
        let maxValue = 0;
        let minValue = 0;

        for (let i = 0; i <= samples; i++) {
            const overloadFactor = (i / samples) * 10; // 0 to 10
            const value = degradationFunction(overloadFactor);
            points.push({ x: overloadFactor, y: value });
            maxValue = Math.max(maxValue, value);
            minValue = Math.min(minValue, value);
        }

        // Add some padding to Y-axis range
        const yRange = maxValue - minValue;
        const yPadding = yRange * 0.1 || 0.1;
        const yMin = Math.max(0, minValue - yPadding);
        const yMax = maxValue + yPadding;

        // Create SVG elements
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('transform', `translate(${padding.left}, ${padding.top})`);

        // Draw grid and axes
        const axisColor = '#ccc';
        const gridColor = '#f0f0f0';

        // Horizontal grid lines and Y-axis labels
        const ySteps = 5;
        for (let i = 0; i <= ySteps; i++) {
            const y = (i / ySteps) * graphHeight;
            const value = yMax - (i / ySteps) * (yMax - yMin);

            // Grid line
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', '0');
            line.setAttribute('y1', y);
            line.setAttribute('x2', graphWidth);
            line.setAttribute('y2', y);
            line.setAttribute('stroke', gridColor);
            line.setAttribute('stroke-width', '1');
            g.appendChild(line);

            // Y-axis label
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', '-5');
            text.setAttribute('y', y);
            text.setAttribute('text-anchor', 'end');
            text.setAttribute('dominant-baseline', 'middle');
            text.setAttribute('font-size', '10');
            text.setAttribute('fill', '#666');
            text.textContent = value.toFixed(2);
            g.appendChild(text);
        }

        // Vertical grid lines and X-axis labels
        const xSteps = 10;
        for (let i = 0; i <= xSteps; i++) {
            const x = (i / xSteps) * graphWidth;
            const value = (i / xSteps) * 10;

            // Grid line
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x);
            line.setAttribute('y1', '0');
            line.setAttribute('x2', x);
            line.setAttribute('y2', graphHeight);
            line.setAttribute('stroke', gridColor);
            line.setAttribute('stroke-width', '1');
            g.appendChild(line);

            // X-axis label
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', x);
            text.setAttribute('y', graphHeight + 15);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', '10');
            text.setAttribute('fill', '#666');
            text.textContent = value;
            g.appendChild(text);
        }

        // Draw axes
        const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        xAxis.setAttribute('x1', '0');
        xAxis.setAttribute('y1', graphHeight);
        xAxis.setAttribute('x2', graphWidth);
        xAxis.setAttribute('y2', graphHeight);
        xAxis.setAttribute('stroke', axisColor);
        xAxis.setAttribute('stroke-width', '2');
        g.appendChild(xAxis);

        const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        yAxis.setAttribute('x1', '0');
        yAxis.setAttribute('y1', '0');
        yAxis.setAttribute('x2', '0');
        yAxis.setAttribute('y2', graphHeight);
        yAxis.setAttribute('stroke', axisColor);
        yAxis.setAttribute('stroke-width', '2');
        g.appendChild(yAxis);

        // Draw graph line
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        let pathData = '';
        for (let i = 0; i < points.length; i++) {
            const point = points[i];
            const x = (point.x / 10) * graphWidth;
            const y = graphHeight - ((point.y - yMin) / (yMax - yMin)) * graphHeight;

            if (i === 0) {
                pathData += `M ${x} ${y}`;
            } else {
                pathData += ` L ${x} ${y}`;
            }
        }
        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#9b59b6');
        path.setAttribute('stroke-width', '2');
        g.appendChild(path);

        // Add axis labels
        const xLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        xLabel.setAttribute('x', graphWidth / 2);
        xLabel.setAttribute('y', height - 5);
        xLabel.setAttribute('text-anchor', 'middle');
        xLabel.setAttribute('font-size', '11');
        xLabel.setAttribute('font-weight', '600');
        xLabel.setAttribute('fill', '#2c3e50');
        xLabel.textContent = 'Overload Factor';
        svg.appendChild(xLabel);

        const yLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        yLabel.setAttribute('x', 15);
        yLabel.setAttribute('y', height / 2);
        yLabel.setAttribute('text-anchor', 'middle');
        yLabel.setAttribute('font-size', '11');
        yLabel.setAttribute('font-weight', '600');
        yLabel.setAttribute('fill', '#2c3e50');
        yLabel.setAttribute('transform', `rotate(-90, 15, ${height / 2})`);
        yLabel.textContent = 'Degradation';
        svg.appendChild(yLabel);

        svg.appendChild(g);
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '600',
            zIndex: '1000',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
        });

        // Set background color based on type
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        // Add to document
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    saveParametersToStorage() {
        const parameters = {
            // Simulation parameters
            numSegments: this.numSegmentsInput.value,
            numCores: this.numCoresInput.value,
            coreCapacity: this.coreCapacityInput.value,
            sliceDev: this.sliceDevInput.value,
            sliceDelay: this.sliceDelayInput.value,
            degradationFunction: this.degradationFunctionInput.value,

            // Service session parameters
            serviceCount: this.serviceCountInput.value,
            serviceJobSizeAvg: this.serviceJobSizeAvgInput.value,
            serviceJobSizeDev: this.serviceJobSizeDevInput.value,
            serviceIntervalAvg: this.serviceIntervalAvgInput.value,
            serviceIntervalDev: this.serviceIntervalDevInput.value,

            // ETL session parameters
            etlCount: this.etlCountInput.value,
            etlJobSizeAvg: this.etlJobSizeAvgInput.value,
            etlJobSizeDev: this.etlJobSizeDevInput.value,
            etlIntervalAvg: this.etlIntervalAvgInput.value,
            etlIntervalDev: this.etlIntervalDevInput.value,

            // Ad-hoc session parameters
            adhocCount: this.adhocCountInput.value,
            adhocJobSizeAvg: this.adhocJobSizeAvgInput.value,
            adhocJobSizeDev: this.adhocJobSizeDevInput.value,
            adhocIntervalAvg: this.adhocIntervalAvgInput.value,
            adhocIntervalDev: this.adhocIntervalDevInput.value
        };

        try {
            localStorage.setItem('cpuLoadSimulatorParams', JSON.stringify(parameters));
        } catch (e) {
            console.warn('Failed to save parameters to local storage:', e);
        }
    }

    loadParametersFromStorage() {
        try {
            const saved = localStorage.getItem('cpuLoadSimulatorParams');
            if (saved) {
                const parameters = JSON.parse(saved);
                this.applyParameters(parameters);
            }
        } catch (e) {
            console.warn('Failed to load parameters from local storage:', e);
        }
    }

    applyParameters(parameters) {
        // Load simulation parameters
        if (parameters.numSegments !== undefined) this.numSegmentsInput.value = parameters.numSegments;
        if (parameters.numCores !== undefined) this.numCoresInput.value = parameters.numCores;
        if (parameters.coreCapacity !== undefined) this.coreCapacityInput.value = parameters.coreCapacity;
        if (parameters.sliceDev !== undefined) this.sliceDevInput.value = parameters.sliceDev;
        if (parameters.sliceDelay !== undefined) this.sliceDelayInput.value = parameters.sliceDelay;
        if (parameters.degradationFunction !== undefined) this.degradationFunctionInput.value = parameters.degradationFunction;
        // Legacy support for concurrencyOverhead - convert to degradation function if needed
        if (parameters.concurrencyOverhead !== undefined && parameters.degradationFunction === undefined) {
            this.degradationFunctionInput.value = 'linear'; // Default to linear for old saves
        }

        // Redraw graph after loading parameters
        this.drawDegradationGraph();

        // Load service session parameters
        if (parameters.serviceCount !== undefined) this.serviceCountInput.value = parameters.serviceCount;
        if (parameters.serviceJobSizeAvg !== undefined) this.serviceJobSizeAvgInput.value = parameters.serviceJobSizeAvg;
        if (parameters.serviceJobSizeDev !== undefined) this.serviceJobSizeDevInput.value = parameters.serviceJobSizeDev;
        if (parameters.serviceIntervalAvg !== undefined) this.serviceIntervalAvgInput.value = parameters.serviceIntervalAvg;
        if (parameters.serviceIntervalDev !== undefined) this.serviceIntervalDevInput.value = parameters.serviceIntervalDev;

        // Load ETL session parameters
        if (parameters.etlCount !== undefined) this.etlCountInput.value = parameters.etlCount;
        if (parameters.etlJobSizeAvg !== undefined) this.etlJobSizeAvgInput.value = parameters.etlJobSizeAvg;
        if (parameters.etlJobSizeDev !== undefined) this.etlJobSizeDevInput.value = parameters.etlJobSizeDev;
        if (parameters.etlIntervalAvg !== undefined) this.etlIntervalAvgInput.value = parameters.etlIntervalAvg;
        if (parameters.etlIntervalDev !== undefined) this.etlIntervalDevInput.value = parameters.etlIntervalDev;

        // Load ad-hoc session parameters
        if (parameters.adhocCount !== undefined) this.adhocCountInput.value = parameters.adhocCount;
        if (parameters.adhocJobSizeAvg !== undefined) this.adhocJobSizeAvgInput.value = parameters.adhocJobSizeAvg;
        if (parameters.adhocJobSizeDev !== undefined) this.adhocJobSizeDevInput.value = parameters.adhocJobSizeDev;
        if (parameters.adhocIntervalAvg !== undefined) this.adhocIntervalAvgInput.value = parameters.adhocIntervalAvg;
        if (parameters.adhocIntervalDev !== undefined) this.adhocIntervalDevInput.value = parameters.adhocIntervalDev;
    }

    exportSettings() {
        try {
            const parameters = {
                // Simulation parameters
                numSegments: this.numSegmentsInput.value,
                numCores: this.numCoresInput.value,
                coreCapacity: this.coreCapacityInput.value,
                sliceDev: this.sliceDevInput.value,
                sliceDelay: this.sliceDelayInput.value,
                degradationFunction: this.degradationFunctionInput.value,

                // Service session parameters
                serviceCount: this.serviceCountInput.value,
                serviceJobSizeAvg: this.serviceJobSizeAvgInput.value,
                serviceJobSizeDev: this.serviceJobSizeDevInput.value,
                serviceIntervalAvg: this.serviceIntervalAvgInput.value,
                serviceIntervalDev: this.serviceIntervalDevInput.value,

                // ETL session parameters
                etlCount: this.etlCountInput.value,
                etlJobSizeAvg: this.etlJobSizeAvgInput.value,
                etlJobSizeDev: this.etlJobSizeDevInput.value,
                etlIntervalAvg: this.etlIntervalAvgInput.value,
                etlIntervalDev: this.etlIntervalDevInput.value,

                // Ad-hoc session parameters
                adhocCount: this.adhocCountInput.value,
                adhocJobSizeAvg: this.adhocJobSizeAvgInput.value,
                adhocJobSizeDev: this.adhocJobSizeDevInput.value,
                adhocIntervalAvg: this.adhocIntervalAvgInput.value,
                adhocIntervalDev: this.adhocIntervalDevInput.value
            };

            const jsonString = JSON.stringify(parameters, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `cpu-load-simulator-settings-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            this.showNotification('Settings exported successfully', 'success');
        } catch (e) {
            console.error('Failed to export settings:', e);
            this.showNotification('Failed to export settings', 'error');
        }
    }

    importSettings(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parameters = JSON.parse(e.target.result);
                this.applyParameters(parameters);
                this.saveParametersToStorage(); // Also save to localStorage
                this.showNotification('Settings imported successfully', 'success');
            } catch (error) {
                console.error('Failed to import settings:', error);
                this.showNotification('Failed to import settings: Invalid JSON file', 'error');
            }
        };
        reader.onerror = () => {
            this.showNotification('Failed to read settings file', 'error');
        };
        reader.readAsText(file);

        // Reset the input so the same file can be imported again
        event.target.value = '';
    }

    // Utility methods
    getSimulationStats() {
        if (!this.gp) return null;

        return {
            activeSessions: this.gp.activeSessions.length,
            totalSessions: this.gp.sessions.length,
            overloadedSegments: this.gp.segments.filter(s => s.overloadFactor > 0).length,
            totalSegments: this.gp.segments.length,
            totalWork: this.gp.segments.reduce((sum, segment) => sum + segment.totalJobleft, 0),
            runningTime: this.startTime ? Date.now() - this.startTime : 0
        };
    }

    // Method to export simulation data
    exportData() {
        const stats = this.getSimulationStats();
        const data = {
            timestamp: new Date().toISOString(),
            stats: stats,
            sessions: this.gp.sessions.map(s => ({
                name: s.name,
                active: s.active,
                querySize: s.query ? s.query.jobsize : null
            })),
            segments: this.gp.segments.map((s, i) => ({
                number: i + 1,
                overloadFactor: s.overloadFactor,
                totalWork: s.totalJobleft,
                runningSlices: s.runningSlices.length,
                futureSlices: s.futureSlices.length
            }))
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cpu-load-simulation-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Data exported successfully', 'success');
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const simulator = new CPULoadSimulator();

    // Add keyboard shortcut hints
    const helpText = document.createElement('div');
    helpText.innerHTML = `
        <div style="position: fixed; bottom: 20px; left: 20px; background: rgba(0,0,0,0.8); color: white; padding: 10px; border-radius: 5px; font-size: 12px; z-index: 1000;">
            <strong>Keyboard Shortcuts:</strong><br>
            Space: Start/Stop simulation
        </div>
    `;
    document.body.appendChild(helpText);

    // Make simulator globally available for debugging
    window.simulator = simulator;
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CPULoadSimulator;
}
