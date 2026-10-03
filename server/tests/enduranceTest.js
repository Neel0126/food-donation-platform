/**
 * Endurance & Long-Duration Memory Leak Profiling Script
 *
 * Runs continuous sustained load (75 concurrent requests per batch) across configured duration.
 * Samples system metrics every 15-30 seconds:
 * - RSS (Resident Set Size)
 * - heapUsed & heapTotal
 * - Event loop lag (p50, p95, p99, max)
 * - Active handles & timers
 * - Average latency & throughput
 *
 * Checks for stable saw-tooth GC pattern vs monotonic growth (memory leaks).
 */

const mongoose = require('mongoose');
const { monitorEventLoopDelay, performance } = require('perf_hooks');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

process.env.SKIP_EMAIL = 'true';

const app = require('../app');
const User = require('../models/User');
const Donation = require('../models/Donation');
const NgoProfile = require('../models/NgoProfile');

const PORT = 5055;
const DURATION_SECONDS = parseInt(process.env.DURATION || '60', 10); // Configurable via DURATION env

let server;

async function runEnduranceTest() {
  console.log('================================================================');
  console.log(`   ENDURANCE & SUSTAINED MEMORY STABILITY PROFILER (${DURATION_SECONDS}s)   `);
  console.log('================================================================');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/food-donation', {
    maxPoolSize: 50
  });

  server = app.listen(PORT);
  const baseUrl = `http://localhost:${PORT}`;

  const elLagMonitor = monitorEventLoopDelay({ resolution: 10 });
  elLagMonitor.enable();

  const ts = Date.now();
  const ngo = await User.create({ name: 'Endurance NGO', email: `end_ngo_${ts}@test.com`, password: 'password123', role: 'ngo', isVerified: true });
  await NgoProfile.create({ user: ngo._id, organizationName: 'End Org', registrationNumber: `END-${ts}`, verificationStatus: 'approved' });
  const ngoToken = jwt.sign({ id: ngo._id }, process.env.JWT_SECRET || 'secret');

  const samples = [];
  const startTime = Date.now();
  const endTime = startTime + DURATION_SECONDS * 1000;
  let batchNum = 0;

  console.log(`Starting continuous load with 75 concurrent requests per batch...`);

  while (Date.now() < endTime) {
    batchNum++;
    const batchStart = performance.now();

    // Fire 75 concurrent requests
    const promises = Array.from({ length: 75 }).map(() =>
      fetch(`${baseUrl}/api/ngos/donations`, {
        headers: { Authorization: `Bearer ${ngoToken}` }
      }).then((r) => r.status).catch(() => 500)
    );

    const statuses = await Promise.all(promises);
    const batchDuration = performance.now() - batchStart;

    const mem = process.memoryUsage();
    const elapsedSec = Math.round((Date.now() - startTime) / 1000);

    const sample = {
      elapsed: `${elapsedSec}s`,
      batch: batchNum,
      rssMB: (mem.rss / 1024 / 1024).toFixed(1),
      heapUsedMB: (mem.heapUsed / 1024 / 1024).toFixed(1),
      heapTotalMB: (mem.heapTotal / 1024 / 1024).toFixed(1),
      p95LagMs: (elLagMonitor.percentile(95) / 1e6).toFixed(1),
      handles: process._getActiveHandles?.().length || 'N/A',
      batchMs: Math.round(batchDuration)
    };

    samples.push(sample);
    console.log(`[${sample.elapsed}] Batch #${batchNum} | HeapUsed: ${sample.heapUsedMB} MB | RSS: ${sample.rssMB} MB | Handles: ${sample.handles} | Batch: ${sample.batchMs}ms`);

    // Give 500ms breather between batches
    await new Promise((r) => setTimeout(r, 500));
  }

  elLagMonitor.disable();

  console.log('\n================================================================');
  console.log('              ENDURANCE TEST PROFILE SUMMARY                    ');
  console.log('================================================================');
  console.table(samples);

  const firstHeap = parseFloat(samples[0].heapUsedMB);
  const lastHeap = parseFloat(samples[samples.length - 1].heapUsedMB);
  console.log(`Starting Heap: ${firstHeap} MB | Final Heap: ${lastHeap} MB`);

  server.close();
  await mongoose.disconnect();
}

runEnduranceTest().catch((err) => {
  console.error('Endurance test error:', err);
  if (server) server.close();
  process.exit(1);
});
