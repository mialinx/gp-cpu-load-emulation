// CPU Load Simulator - Models
// Ported from Python to JavaScript

const QUANTUM = 10;

class Actor {
    tick(now) {
        // Base class for all actors
    }
}

class GP extends Actor {
    constructor(segments = 32, cores = 10, coreCapacity = 100, concurrencyOverhead = 0.1, sliceDev = 0.05, sliceDelay = 10) {
        super();
        this.sessions = [];
        this.segments = [];
        this.cores = cores;
        this.coreCapacity = coreCapacity;
        this.concurrencyOverhead = concurrencyOverhead;
        this.sliceDev = sliceDev;
        this.sliceDelay = sliceDelay;
        this.degradationFunction = linearDegradation;
        // Initialize segments
        for (let i = 0; i < segments; i++) {
            this.segments.push(new Segment(this));
        }
    }

    addSession(name, jobsizeAvg, jobsizeDev, intervalAvg, intervalDev) {
        this.sessions.push(new Session(this, name, jobsizeAvg, jobsizeDev, intervalAvg, intervalDev));
    }

    get activeSessions() {
        return this.sessions.filter(s => s.active);
    }

    tick(now) {
        // Update all segments
        for (const segment of this.segments) {
            segment.tick(now);
        }

        // Update all sessions
        for (const session of this.sessions) {
            session.tick(now);
        }
    }
}

class Session extends Actor {
    constructor(gp, name, jobsizeAvg, jobsizeDev, intervalAvg, intervalDev) {
        super();
        this.name = name;
        this.gp = gp;
        this.jobsizeAvg = jobsizeAvg;
        this.jobsizeDev = jobsizeDev;
        this.intervalAvg = intervalAvg;
        this.intervalDev = intervalDev;
        this.query = null;
        this.queryCount = 0; // Track number of queries executed
        let offset = this.uniformRandom(0, this.intervalDev);
        if (offset < 0) {
            offset += this.intervalAvg;
        }
        this.nextQueryTime = Date.now() + Math.max(1, Math.floor(offset));
    }

    tick(now) {
        // Check if current query is done
        if (this.query !== null) {
            if (this.query.done) {
                this.query = null;
            } else {
                return;
            }
        }

        // Check if it's time for a new query
        if (now >= this.nextQueryTime) {
            // Generate random jobsize
            const jobsize = Math.max(1, Math.floor(this.uniformRandom(this.jobsizeAvg, this.jobsizeDev)));

            // Create new query
            this.query = new Query(this.gp, jobsize, now);
            this.queryCount++; // Increment query counter

            // Schedule next query with random interval
            const interval = Math.max(1, Math.floor(this.uniformRandom(this.intervalAvg, this.intervalDev)));
            this.nextQueryTime = now + interval;
        }
    }

    get active() {
        return this.query !== null;
    }

    // Uniform random number generator in interval [mean - stdDev, mean + stdDev]
    uniformRandom(mean, stdDev) {
        return mean - stdDev + (2 * stdDev) * Math.random();
    }
}


class Segment extends Actor {
    constructor(gp) {
        super();
        this.gp = gp;
        this.futureSlices = [];
        this.runningSlices = [];
        this.maxTickCapacity = this.gp.cores * this.gp.coreCapacity;
    }

    tick(now) {
        // Move ready slices from waiting to running
        const readySlices = this.futureSlices.filter(s => s.startTime <= now);
        for (const slice of readySlices) {
            this.futureSlices.splice(this.futureSlices.indexOf(slice), 1);
            this.runningSlices.push(slice);
        }

        let capacity = this.currentTickCapacity;
        while (capacity > 0 && this.runningSlices.length > 0) {
            for (let i = this.runningSlices.length - 1; i >= 0; i--) {
                const slice = this.runningSlices[i];
                const q = Math.min(QUANTUM, slice.jobleft, capacity);
                slice.jobleft -= q;
                capacity -= q;

                if (slice.jobleft <= 0) {
                    this.runningSlices.splice(i, 1);
                }
            }
        }
    }

    get loadAverage() {
        return Math.max(0, this.runningSlices.length - this.gp.cores)
    }

    get overloadFactor() {
        return Math.max(0, this.loadAverage / this.gp.cores);
    }

    get currentTickCapacity() {
        let degradation = Math.min(1, Math.max(0, this.gp.degradationFunction(this.overloadFactor)));
        return this.gp.cores * this.gp.coreCapacity * (1 - degradation);
    }

    get totalJobleft() {
        return this.runningSlices.reduce((sum, slice) => sum + slice.jobleft, 0);
    }
}

class Query {
    static nextId = 1;

    constructor(gp, jobsize, startTime) {
        this.id = Query.nextId++;
        this.gp = gp;
        this.startTime = startTime;
        this.jobsize = jobsize;
        this.slices = [];

        // Create slices for each segment
        for (const segment of this.gp.segments) {
            const sliceJobsize = Math.max(1, Math.floor(this.uniformRandom(jobsize, this.gp.sliceDev * jobsize)));
            const sliceStartTime = startTime + Math.max(0, Math.floor(Math.random() * this.gp.sliceDelay));
            this.slices.push(new Slice(this, segment, sliceJobsize, sliceStartTime));
        }
    }

    get done() {
        return this.slices.every(slice => slice.done);
    }

    // Uniform random number generator in interval [mean - stdDev, mean + stdDev]
    uniformRandom(mean, stdDev) {
        return mean - stdDev + (2 * stdDev) * Math.random();
    }
}

class Slice {
    constructor(query, segment, jobsize, startTime) {
        this.query = query;
        this.segment = segment;
        this.jobsize = jobsize;
        this.jobleft = jobsize;
        this.startTime = startTime;
        this.segment.futureSlices.push(this);
    }

    get done() {
        return this.jobleft <= 0;
    }

    toString() {
        return `S-${this.query.id} ${this.jobleft}/${this.jobsize}`;
    }
}

// Export classes and functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GP, Session, Segment, Query, Slice };
}
