/**
 * Phase 1 — Performance, Node.js & MongoDB Deep Profiling Suite
 *
 * A. Repeat heavy-load test 3 times to measure:
 *    - p95 / p99 latency consistency
 *    - Throughput variation
 *    - Heap growth & memory leak detection
 *
 * B. MongoDB Profiling:
 *    - Query execution plans (COLLSCAN vs IXSCAN)
 *    - Index coverage evaluation
 *    - Execution stats (docsExamined vs docsReturned)
 *
 * C. Node.js Profiling:
 *    - Event loop lag (monitorEventLoopDelay p50, p95, p99, max)
 *    - CPU usage delta (user & system time)
 *    - Active handles & timers
 */

const mongoose = require('mongoose');
const { monitorEventLoopDelay, performance } = require('perf_hooks');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

process.env.SKIP_EMAIL = 'true';

const User = require('../models/User');
const Donation = require('../models/Donation');
const NgoProfile = require('../models/NgoProfile');
const VolunteerProfile = require('../models/VolunteerProfile');
const app = require('../app');

const PORT = 5012;
let server;
const baseUrl = `http://localhost:${PORT}`;

// Timed HTTP Request Helper
async function timedFetch(url, options = {}) {
  const start = performance.now();
  let status = 500;
  try {
    const res = await fetch(url, options);
    status = res.status;
    const data = await res.json().catch(() => ({}));
    const duration = performance.now() - start;
    return { status, data, duration };
  } catch (err) {
    const duration = performance.now() - start;
    return { status: 500, error: err.message, duration };
  }
}

async function runHeavyLoadIteration(iterNum, vuCount, tokens) {
  const { donorToken, ngoToken, volToken } = tokens;
  const latencies = [];
  const statusCounts = {};

  const startCpu = process.cpuUsage();
  const startMem = process.memoryUsage();

  const vuPromises = [];
  for (let vu = 0; vu < vuCount; vu++) {
    vuPromises.push(
      (async () => {
        // 1. Create donation
        const cRes = await timedFetch(`${baseUrl}/api/donations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${donorToken}` },
          body: JSON.stringify({
            foodType: `Profiling Batch ${iterNum}-${vu}`,
            quantity: '10 meals',
            pickupLocation: { street: `${vu} Test Blvd`, city: 'Metro' },
            pickupWindow: '2 hours'
          })
        });
        latencies.push(cRes.duration);
        statusCounts[cRes.status] = (statusCounts[cRes.status] || 0) + 1;

        if (cRes.status === 201 && cRes.data?._id) {
          const donId = cRes.data._id;
          // 2. NGO browse
          const bRes = await timedFetch(`${baseUrl}/api/ngos/donations?all=true`, {
            headers: { Authorization: `Bearer ${ngoToken}` }
          });
          latencies.push(bRes.duration);
          statusCounts[bRes.status] = (statusCounts[bRes.status] || 0) + 1;
        }
      })()
    );
  }

  const iterStart = performance.now();
  await Promise.all(vuPromises);
  const totalDurationSec = (performance.now() - iterStart) / 1000;

  const endCpu = process.cpuUsage(startCpu);
  const endMem = process.memoryUsage();

  latencies.sort((a, b) => a - b);
  const total = latencies.length;
  const sum = latencies.reduce((a, b) => a + b, 0);
  const avg = sum / total;
  const p50 = latencies[Math.floor(total * 0.5)];
  const p95 = latencies[Math.floor(total * 0.95)] || latencies[total - 1];
  const p99 = latencies[Math.floor(total * 0.99)] || latencies[total - 1];
  const rps = (total / totalDurationSec).toFixed(2);

  return {
    iteration: `Run #${iterNum}`,
    totalReq: total,
    throughputRps: rps,
    avgMs: avg.toFixed(2),
    p50Ms: p50.toFixed(2),
    p95Ms: p95.toFixed(2),
    p99Ms: p99.toFixed(2),
    cpuUserMs: (endCpu.user / 1000).toFixed(0),
    cpuSysMs: (endCpu.system / 1000).toFixed(0),
    heapUsedMB: (endMem.heapUsed / (1024 * 1024)).toFixed(2),
    heapDeltaMB: ((endMem.heapUsed - startMem.heapUsed) / (1024 * 1024)).toFixed(2),
    rssMB: (endMem.rss / (1024 * 1024)).toFixed(2)
  };
}

async function profileMongoQueries() {
  console.log('\n======================================================');
  console.log('   SECTION B: MONGODB QUERY EXECUTION & INDEX PROFILING ');
  console.log('======================================================');

  const queries = [
    {
      name: 'Nearby Pending Donations (Hot Path for NGOs)',
      explainFn: () =>
        Donation.find({
          status: 'pending',
          $or: [{ expiresAt: { $gt: new Date() } }, { expiresAt: null }]
        }).explain('executionStats')
    },
    {
      name: 'NGO Accepted Donations List',
      explainFn: () =>
        Donation.find({
          acceptedBy: new mongoose.Types.ObjectId()
        }).explain('executionStats')
    },
    {
      name: 'Available Tasks for Volunteers',
      explainFn: () =>
        Donation.find({
          volunteerRequested: true,
          status: 'accepted',
          assignedVolunteer: null
        }).explain('executionStats')
    },
    {
      name: 'Volunteer Profile Lookup by User ID',
      explainFn: () =>
        VolunteerProfile.findOne({
          user: new mongoose.Types.ObjectId()
        }).explain('executionStats')
    },
    {
      name: 'Pending NGO Profile Verification Queue',
      explainFn: () =>
        NgoProfile.find({
          verificationStatus: 'pending'
        }).explain('executionStats')
    }
  ];

  const results = [];
  for (const q of queries) {
    const plan = await q.explainFn();
    const stats = plan.executionStats;

    // Detect winning plan stage
    let stage = stats.executionStages?.stage;
    if (!stage && stats.executionStages?.inputStage) {
      stage = stats.executionStages.inputStage.stage;
    }

    const isOptimal = stage !== 'COLLSCAN';
    results.push({
      Query: q.name,
      Stage: stage || 'UNKNOWN',
      Indexed: isOptimal ? '✅ YES (IXSCAN)' : '⚠️ NO (COLLSCAN)',
      'Docs Examined': stats.totalDocsExamined,
      'Docs Returned': stats.nReturned,
      'Exec Time (ms)': stats.executionTimeMillis
    });
  }

  console.table(results);
  return results;
}

async function runPerformanceProfiling() {
  console.log('====================================================');
  console.log('    PHASE 1: NODE & MONGO PERFORMANCE PROFILING     ');
  console.log('====================================================');

  // Start event-loop delay monitor (10ms resolution)
  const elLagMonitor = monitorEventLoopDelay({ resolution: 10 });
  elLagMonitor.enable();

  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/food-donation', {
      maxPoolSize: 50
    });

    await new Promise((resolve) => {
      server = app.listen(PORT, () => {
        console.log(`✅ Profiling server booted on port ${PORT}`);
        resolve();
      });
    });

    const ts = Date.now();
    const donor = await User.create({ name: 'Profile Donor', email: `p_donor_${ts}@test.com`, password: 'password123', role: 'donor' });
    const ngo = await User.create({ name: 'Profile NGO', email: `p_ngo_${ts}@test.com`, password: 'password123', role: 'ngo', isVerified: true });
    const vol = await User.create({ name: 'Profile Vol', email: `p_vol_${ts}@test.com`, password: 'password123', role: 'volunteer', isVerified: true });
    await NgoProfile.create({ user: ngo._id, organizationName: 'P Org', registrationNumber: `P-REG-${ts}`, verificationStatus: 'approved' });
    await VolunteerProfile.create({ user: vol._id, availabilityStatus: 'available', activeDeliveries: 0, completedDeliveries: 0 });

    const tokens = {
      donorToken: jwt.sign({ id: donor._id }, process.env.JWT_SECRET || 'secret'),
      ngoToken: jwt.sign({ id: ngo._id }, process.env.JWT_SECRET || 'secret'),
      volToken: jwt.sign({ id: vol._id }, process.env.JWT_SECRET || 'secret')
    };

    // ─────────────────────────────────────────────────────────────
    // SECTION A: 3 REPEATED HEAVY-LOAD ITERATIONS
    // ─────────────────────────────────────────────────────────────
    console.log('\n======================================================');
    console.log('   SECTION A: REPEATED HEAVY-LOAD RUNS (3 ITERATIONS) ');
    console.log('======================================================');

    const runResults = [];
    for (let i = 1; i <= 3; i++) {
      console.log(`Running Iteration #${i} (75 concurrent users)...`);
      const res = await runHeavyLoadIteration(i, 75, tokens);
      runResults.push(res);
      // Short breath between runs
      await new Promise((r) => setTimeout(r, 1000));
    }

    console.table(runResults);

    // ─────────────────────────────────────────────────────────────
    // SECTION B: MONGODB INDEX & EXECUTION STATS
    // ─────────────────────────────────────────────────────────────
    await profileMongoQueries();

    // ─────────────────────────────────────────────────────────────
    // SECTION C: NODE.JS SYSTEM & EVENT LOOP PROFILING
    // ─────────────────────────────────────────────────────────────
    console.log('\n======================================================');
    console.log('   SECTION C: NODE.JS EVENT-LOOP & RUNTIME PROFILING  ');
    console.log('======================================================');

    elLagMonitor.disable();
    const elStats = {
      'p50 Event Loop Lag': `${(elLagMonitor.percentile(50) / 1e6).toFixed(2)} ms`,
      'p95 Event Loop Lag': `${(elLagMonitor.percentile(95) / 1e6).toFixed(2)} ms`,
      'p99 Event Loop Lag': `${(elLagMonitor.percentile(99) / 1e6).toFixed(2)} ms`,
      'Max Event Loop Lag': `${(elLagMonitor.max / 1e6).toFixed(2)} ms`,
      'Active Handles': process._getActiveHandles?.().length || 'N/A',
      'Active Requests': process._getActiveRequests?.().length || 'N/A'
    };
    console.table([elStats]);

    console.log('\n🎉 PERFORMANCE PROFILING COMPLETED! 🎉\n');
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
  }
}

runPerformanceProfiling().catch((err) => {
  console.error('Profiling failed:', err);
  process.exit(1);
});
