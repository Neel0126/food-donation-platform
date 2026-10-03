/**
 * ShareBite Automated High-Concurrency Load & Performance Benchmark
 * Simulates concurrent VUs (Virtual Users) executing end-to-end donation lifecycles:
 * Register/Login -> Create Donation -> Browse/Accept -> Claim Task -> Verify OTP -> Complete
 *
 * Measures:
 * - Requests / second (Throughput)
 * - Avg, Min, Max, p50, p95, p99 Latency
 * - Success / Error rate
 * - Heap & Memory usage
 * - High-load race condition collision (10 NGOs fighting for 1 donation while 100 VUs generate background load)
 */

const mongoose = require('mongoose');
process.env.SKIP_EMAIL = 'true';
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const User = require('../models/User');
const Donation = require('../models/Donation');
const NgoProfile = require('../models/NgoProfile');
const VolunteerProfile = require('../models/VolunteerProfile');
const app = require('../app');

const PORT = 5010;
let server;
const baseUrl = `http://localhost:${PORT}`;

// Latency & metric tracker
class MetricsTracker {
  constructor(name) {
    this.name = name;
    this.latencies = [];
    this.statusCodes = {};
    this.errors = 0;
    this.startTime = Date.now();
    this.endTime = null;
  }

  record(status, durationMs) {
    this.latencies.push(durationMs);
    this.statusCodes[status] = (this.statusCodes[status] || 0) + 1;
    if (status >= 400 && status !== 409) {
      // 409 is expected in race condition tests, other 4xx/5xx are errors
      this.errors++;
    }
  }

  finish() {
    this.endTime = Date.now();
    this.latencies.sort((a, b) => a - b);
  }

  getStats() {
    const total = this.latencies.length;
    if (total === 0) return { name: this.name, total: 0 };

    const sum = this.latencies.reduce((a, b) => a + b, 0);
    const avg = sum / total;
    const min = this.latencies[0];
    const max = this.latencies[total - 1];
    const p50 = this.latencies[Math.floor(total * 0.5)];
    const p95 = this.latencies[Math.floor(total * 0.95)] || max;
    const p99 = this.latencies[Math.floor(total * 0.99)] || max;
    const durationSec = (this.endTime - this.startTime) / 1000;
    const rps = total / (durationSec || 1);
    const errorRate = ((this.errors / total) * 100).toFixed(2);

    return {
      name: this.name,
      totalRequests: total,
      durationSec: durationSec.toFixed(2),
      requestsPerSec: rps.toFixed(2),
      avgLatencyMs: avg.toFixed(2),
      minLatencyMs: min.toFixed(2),
      maxLatencyMs: max.toFixed(2),
      p50LatencyMs: p50.toFixed(2),
      p95LatencyMs: p95.toFixed(2),
      p99LatencyMs: p99.toFixed(2),
      errorCount: this.errors,
      errorRatePercent: `${errorRate}%`,
      statusDistribution: this.statusCodes
    };
  }
}

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

async function runVirtualUserWorkflow(vuIndex, tokens, metrics) {
  const { donorToken, ngoToken, volToken } = tokens;

  // 1. Donor creates donation
  const createRes = await timedFetch(`${baseUrl}/api/donations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${donorToken}`
    },
    body: JSON.stringify({
      foodType: `Meal Batch VU-${vuIndex}`,
      quantity: `${(vuIndex % 20) + 5} meals`,
      pickupLocation: { street: `${vuIndex} Market St`, city: 'Metro' },
      pickupWindow: '2 hours'
    })
  });
  metrics.record(createRes.status, createRes.duration);
  if (createRes.status !== 201) return;
  const donationId = createRes.data._id;

  // 2. NGO browses nearby donations
  const browseRes = await timedFetch(`${baseUrl}/api/ngos/donations?all=true`, {
    headers: { Authorization: `Bearer ${ngoToken}` }
  });
  metrics.record(browseRes.status, browseRes.duration);

  // 3. NGO accepts donation
  const acceptRes = await timedFetch(`${baseUrl}/api/ngos/donations/${donationId}/accept`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${ngoToken}` }
  });
  metrics.record(acceptRes.status, acceptRes.duration);
  if (acceptRes.status !== 200) return;

  // 4. NGO requests volunteer
  const reqVolRes = await timedFetch(`${baseUrl}/api/ngos/donations/${donationId}/request-volunteer`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${ngoToken}` }
  });
  metrics.record(reqVolRes.status, reqVolRes.duration);

  // 5. Volunteer claims task from pool
  const claimRes = await timedFetch(`${baseUrl}/api/volunteers/tasks/${donationId}/accept`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${volToken}` }
  });
  metrics.record(claimRes.status, claimRes.duration);
  if (claimRes.status !== 200) return;

  // 6. Read donation to get generated pickup and delivery OTPs
  const donDoc = await Donation.findById(donationId);
  if (!donDoc) return;

  // 7. Volunteer verifies pickup OTP
  const pickupRes = await timedFetch(`${baseUrl}/api/volunteers/tasks/${donationId}/verify-pickup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${volToken}`
    },
    body: JSON.stringify({ otp: donDoc.pickupOtp })
  });
  metrics.record(pickupRes.status, pickupRes.duration);

  // 8. Volunteer verifies delivery OTP
  const delOtpRes = await timedFetch(`${baseUrl}/api/volunteers/tasks/${donationId}/verify-delivery`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${volToken}`
    },
    body: JSON.stringify({ otp: donDoc.deliveryOtp })
  });
  metrics.record(delOtpRes.status, delOtpRes.duration);

  // 9. Volunteer completes task
  const completeRes = await timedFetch(`${baseUrl}/api/volunteers/tasks/${donationId}/complete`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${volToken}`
    },
    body: JSON.stringify({ deliveryOtp: donDoc.deliveryOtp })
  });
  metrics.record(completeRes.status, completeRes.duration);
}

async function runStage(stageName, vuCount, iterationsPerVu, tokens) {
  console.log(`\n======================================================`);
  console.log(`   STAGE: ${stageName.toUpperCase()} (${vuCount} VUs, ${vuCount * iterationsPerVu * 7} total operations)`);
  console.log(`======================================================`);

  const initialMem = process.memoryUsage();
  const metrics = new MetricsTracker(stageName);

  const vuPromises = [];
  for (let vu = 0; vu < vuCount; vu++) {
    vuPromises.push(
      (async () => {
        for (let iter = 0; iter < iterationsPerVu; iter++) {
          await runVirtualUserWorkflow(`${vu}_${iter}`, tokens, metrics);
        }
      })()
    );
  }

  await Promise.all(vuPromises);
  metrics.finish();

  const finalMem = process.memoryUsage();
  const heapDeltaMB = ((finalMem.heapUsed - initialMem.heapUsed) / (1024 * 1024)).toFixed(2);
  const rssDeltaMB = ((finalMem.rss - initialMem.rss) / (1024 * 1024)).toFixed(2);

  const stats = metrics.getStats();
  console.table([
    {
      Stage: stats.name,
      'Total Req': stats.totalRequests,
      'Throughput (req/s)': stats.requestsPerSec,
      'Avg Latency': `${stats.avgLatencyMs} ms`,
      'p50 Latency': `${stats.p50LatencyMs} ms`,
      'p95 Latency': `${stats.p95LatencyMs} ms`,
      'p99 Latency': `${stats.p99LatencyMs} ms`,
      'Error Rate': stats.errorRatePercent,
      'Heap Delta': `${heapDeltaMB} MB`,
      'RSS Delta': `${rssDeltaMB} MB`
    }
  ]);
  console.log('Status code distribution:', stats.statusDistribution);
  return stats;
}

async function runLoadTests() {
  console.log('====================================================');
  console.log('       SHAREBITE COMPREHENSIVE LOAD TEST SUITE      ');
  console.log('====================================================');

  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/food-donation', {
      maxPoolSize: 100 // High-concurrency connection pool
    });
    await new Promise((resolve) => {
      server = app.listen(PORT, () => {
        console.log(`✅ Benchmark server listening on port ${PORT}`);
        resolve();
      });
    });

    const ts = Date.now();

    // 1. Provision Benchmark Actors
    console.log('Provisioning benchmark users...');
    const donor = await User.create({
      name: 'Load Donor',
      email: `donor_load_${ts}@test.com`,
      password: 'password123',
      role: 'donor'
    });
    const donorToken = jwt.sign({ id: donor._id }, process.env.JWT_SECRET || 'secret');

    const ngo = await User.create({
      name: 'Load NGO',
      email: `ngo_load_${ts}@test.com`,
      password: 'password123',
      role: 'ngo',
      isVerified: true
    });
    await NgoProfile.create({
      user: ngo._id,
      organizationName: 'Load NGO Partner',
      registrationNumber: `REG-LOAD-${ts}`,
      verificationStatus: 'approved'
    });
    const ngoToken = jwt.sign({ id: ngo._id }, process.env.JWT_SECRET || 'secret');

    const vol = await User.create({
      name: 'Load Volunteer',
      email: `vol_load_${ts}@test.com`,
      password: 'password123',
      role: 'volunteer',
      isVerified: true
    });
    await VolunteerProfile.create({
      user: vol._id,
      availabilityStatus: 'available',
      activeDeliveries: 0,
      completedDeliveries: 0
    });
    const volToken = jwt.sign({ id: vol._id }, process.env.JWT_SECRET || 'secret');

    const tokens = { donorToken, ngoToken, volToken };

    // STAGE 1: Baseline (10 VUs)
    await runStage('Baseline', 10, 2, tokens);

    // STAGE 2: Normal Load (50 VUs)
    await runStage('Normal Load', 50, 1, tokens);

    // STAGE 3: Heavy Load (100 VUs)
    await runStage('Heavy Load', 100, 1, tokens);

    // STAGE 4: Sudden Spike (0 -> 250 Concurrent Requests)
    console.log(`\n======================================================`);
    console.log(`   STAGE: SUDDEN SPIKE (250 Concurrent Requests Fired Instantly)`);
    console.log(`======================================================`);
    const spikeMetrics = new MetricsTracker('Sudden Spike (250)');
    const spikePromises = Array(250)
      .fill(null)
      .map((_, i) =>
        timedFetch(`${baseUrl}/api/donations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${donorToken}`
          },
          body: JSON.stringify({
            foodType: `Spike Food ${i}`,
            quantity: '10 boxes',
            pickupLocation: { street: `${i} Spike Way`, city: 'Metro' }
          })
        }).then((res) => spikeMetrics.record(res.status, res.duration))
      );
    await Promise.all(spikePromises);
    spikeMetrics.finish();
    const spikeStats = spikeMetrics.getStats();
    console.table([
      {
        Stage: spikeStats.name,
        'Total Req': spikeStats.totalRequests,
        'Throughput (req/s)': spikeStats.requestsPerSec,
        'Avg Latency': `${spikeStats.avgLatencyMs} ms`,
        'p50 Latency': `${spikeStats.p50LatencyMs} ms`,
        'p95 Latency': `${spikeStats.p95LatencyMs} ms`,
        'p99 Latency': `${spikeStats.p99LatencyMs} ms`,
        'Error Rate': spikeStats.errorRatePercent
      }
    ]);

    // STAGE 5: RACE CONDITION UNDER ACTIVE PRESSURE
    // 100 background requests happening while 10 NGOs collide on the same donation
    console.log(`\n======================================================`);
    console.log(`   STAGE: RACE COLLISION UNDER HEAVY BACKGROUND LOAD   `);
    console.log(`======================================================`);

    // Create 10 distinct NGOs
    const collidingNgoTokens = [];
    for (let i = 0; i < 10; i++) {
      const u = await User.create({
        name: `Colliding NGO ${i}`,
        email: `collide_ngo_${i}_${ts}@test.com`,
        password: 'password123',
        role: 'ngo',
        isVerified: true
      });
      await NgoProfile.create({
        user: u._id,
        organizationName: `Colliding Org ${i}`,
        registrationNumber: `REG-COLLIDE-${i}-${ts}`,
        verificationStatus: 'approved'
      });
      collidingNgoTokens.push(jwt.sign({ id: u._id }, process.env.JWT_SECRET || 'secret'));
    }

    // Target donation for collision
    const contestedDonation = await Donation.create({
      donor: donor._id,
      foodType: 'High-Demand Fresh Supplies',
      quantity: '100 packages',
      pickupLocation: { street: '1 Contested Plaza', city: 'Metro' },
      status: 'pending',
      expiresAt: new Date(Date.now() + 3600000)
    });

    // 100 background noise requests
    const backgroundNoise = Array(100)
      .fill(null)
      .map((_, i) =>
        fetch(`${baseUrl}/api/ngos/donations?all=true`, {
          headers: { Authorization: `Bearer ${ngoToken}` }
        })
      );

    // 10 colliding accept requests on the exact same donation
    const collidingAccepts = collidingNgoTokens.map((token) =>
      fetch(`${baseUrl}/api/ngos/donations/${contestedDonation._id}/accept`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      }).then(async (r) => ({ status: r.status, data: await r.json() }))
    );

    // Fire both simultaneously!
    const [noiseResults, collisionResults] = await Promise.all([
      Promise.all(backgroundNoise),
      Promise.all(collidingAccepts)
    ]);

    const successes = collisionResults.filter((r) => r.status === 200);
    const conflicts = collisionResults.filter((r) => r.status === 409 || r.status === 400);

    console.log(`Collision Results under Load: ${successes.length} claimed (200), ${conflicts.length} conflicted (409/400)`);
    if (successes.length !== 1) {
      throw new Error(`CRITICAL ATOMICITY BREAK: Under load, ${successes.length} NGOs claimed the same donation!`);
    }

    const verifyContested = await Donation.findById(contestedDonation._id);
    if (verifyContested.status !== 'accepted') {
      throw new Error(`Inconsistent donation status: ${verifyContested.status}`);
    }
    console.log('✅ PROVEN: Atomic database operations remain 100% resilient under heavy application pressure!');

    console.log('\n🎉 ALL LOAD AND BENCHMARKING TESTS COMPLETED SUCCESSFULLY! 🎉\n');
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
  }
}

runLoadTests().catch((err) => {
  console.error('❌ Load test failed:', err);
  process.exit(1);
});
