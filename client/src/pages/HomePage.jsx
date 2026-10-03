import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HiHeart, HiTruck, HiUserGroup, HiArrowRight, HiShieldCheck, HiOutlineClock } from 'react-icons/hi';
import { motion } from 'framer-motion';
import Navbar from '../components/layout/Navbar';
import { getPublicStats } from '../services/donationService';

// Smooth animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1
    }
  }
};

const popIn = {
  hidden: { opacity: 0, scale: 0.88, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 14 } }
};

const HomePage = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let mounted = true;
    getPublicStats()
      .then((data) => {
        if (mounted && data) {
          setStats(data);
        }
      })
      .catch((err) => {
        console.warn('Could not load live platform stats:', err?.message);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f6f0] flex flex-col font-body selection:bg-primary-200 selection:text-primary-900">
      <Navbar onToggleSidebar={() => {}} />

      <main className="flex-1 overflow-x-hidden">
        {/* ================= HERO SECTION (Split Layout) ================= */}
        <section className="relative pt-12 pb-20 lg:pt-16 lg:pb-28 overflow-hidden">
          {/* Subtle Organic Background Glows */}
          <div className="absolute top-10 left-1/4 w-96 h-96 bg-primary-200/30 rounded-full blur-3xl pointer-events-none -z-10" />
          <div className="absolute top-40 right-10 w-80 h-80 bg-accent-200/30 rounded-full blur-3xl pointer-events-none -z-10" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              
              {/* Left Column: Headline & Action */}
              <motion.div 
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="lg:col-span-7 text-left"
              >
                {/* Pill Badge */}
                <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#e8f1e5] border border-[#cfdfcc] text-primary-800 text-xs sm:text-sm font-semibold tracking-wide mb-6 shadow-2xs">
                  <span className="text-base">🌱</span>
                  <span>Food Donation Platform</span>
                </motion.div>

                {/* Main Heading */}
                <motion.h1 
                  variants={fadeInUp} 
                  className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-[#192b17] tracking-tight leading-[1.08] mb-6"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  Share Food,<br />
                  <span className="text-primary-600">Share Hope.</span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p 
                  variants={fadeInUp} 
                  className="text-lg sm:text-xl text-[#3d4f3b] mb-10 max-w-xl font-normal leading-relaxed"
                >
                  Connecting surplus food with those who need it most. Join our community of food businesses, local NGOs, and volunteers to make a real difference, one meal at a time.
                </motion.p>

                {/* Pill CTA Buttons */}
                <motion.div variants={fadeInUp} className="flex flex-wrap items-center gap-4">
                  <Link to="/register">
                    <motion.button 
                      whileHover={{ scale: 1.03 }} 
                      whileTap={{ scale: 0.97 }} 
                      className="btn-primary text-base px-8 py-3.5 shadow-lg shadow-primary-700/20"
                    >
                      <span>Start Donating</span>
                      <HiArrowRight size={18} />
                    </motion.button>
                  </Link>

                  <a href="#how-it-works">
                    <motion.button 
                      whileHover={{ scale: 1.03 }} 
                      whileTap={{ scale: 0.97 }} 
                      className="btn-secondary text-base px-8 py-3.5"
                    >
                      Find Local Food
                    </motion.button>
                  </a>
                </motion.div>

                {/* Trust mini-badge */}
                <motion.div variants={fadeInUp} className="mt-10 flex items-center gap-6 text-xs text-gray-600 font-medium">
                  <div className="flex items-center gap-2">
                    <HiShieldCheck className="text-primary-600 text-lg" />
                    <span>Verified NGO Partners</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HiOutlineClock className="text-accent-500 text-lg" />
                    <span>Real-time Redistribution</span>
                  </div>
                </motion.div>
              </motion.div>

              {/* Right Column: Visual Frame with Floating Food Badges */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-5 relative flex justify-center"
              >
                {/* Background soft decorative blob */}
                <div className="absolute inset-0 bg-gradient-to-tr from-primary-200/50 to-accent-200/40 rounded-3xl transform rotate-2 scale-102 filter blur-xs -z-10" />

                {/* Main Illustrated Card Frame */}
                <div className="relative w-full max-w-md bg-white rounded-3xl p-3 shadow-2xl shadow-primary-900/10 border-4 border-white/80 overflow-hidden">
                  <img
                    src="/images/home-hero-community.png"
                    alt="Volunteer delivering food donations to a community member"
                    className="w-full h-auto rounded-2xl object-cover aspect-square hover:scale-102 transition-transform duration-700 ease-out"
                  />

                  {/* Floating Badge Tag (Bottom Overlay) */}
                  <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl border border-stone-border shadow-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700">
                        <HiHeart size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">Zero Food Waste Goal</p>
                        <p className="text-[11px] text-gray-500">Every donation safely claimed</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-full border border-primary-200">
                      Live
                    </span>
                  </div>
                </div>

                {/* Floating Emojis / Accents */}
                <motion.div 
                  animate={{ y: [0, -8, 0] }} 
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-4 -left-4 sm:-left-6 bg-white p-3 rounded-2xl shadow-lg border border-stone-border flex items-center justify-center text-2xl"
                  title="Fresh produce"
                >
                  🍎
                </motion.div>

                <motion.div 
                  animate={{ y: [0, 8, 0] }} 
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="absolute top-1/2 -right-4 sm:-right-6 bg-white p-3 rounded-2xl shadow-lg border border-stone-border flex items-center justify-center text-2xl"
                  title="Nutritious food"
                >
                  🥕
                </motion.div>

                <motion.div 
                  animate={{ y: [0, -6, 0] }} 
                  transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute -bottom-3 left-12 bg-white p-2.5 rounded-2xl shadow-lg border border-stone-border flex items-center justify-center text-xl"
                  title="Artisan breads"
                >
                  🥖
                </motion.div>
              </motion.div>

            </div>
          </div>
        </section>

        {/* ================= PILL STATS COUNTER ROW ================= */}
        <section className="py-6 -mt-6 mb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={staggerContainer}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              {/* Stat 1: Meals */}
              <motion.div
                variants={popIn}
                className="flex items-center gap-3 bg-[#b75d31] text-white rounded-2xl px-5 py-4 shadow-md shadow-[#b75d31]/25 cursor-default hover:scale-105 transition-transform duration-200"
              >
                <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center text-xl shrink-0">
                  🍲
                </div>
                <div>
                  <div className="text-2xl font-extrabold tracking-tight leading-none">
                    {stats?.mealsShared ? `${stats.mealsShared.toLocaleString()}+` : '320+'}
                  </div>
                  <div className="text-xs text-white/80 font-medium mt-0.5">Meals Shared</div>
                </div>
              </motion.div>

              {/* Stat 2: NGOs */}
              <motion.div
                variants={popIn}
                className="flex items-center gap-3 bg-[#9e6231] text-white rounded-2xl px-5 py-4 shadow-md shadow-[#9e6231]/25 cursor-default hover:scale-105 transition-transform duration-200"
              >
                <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center text-xl shrink-0">
                  🏢
                </div>
                <div>
                  <div className="text-2xl font-extrabold tracking-tight leading-none">
                    {stats?.ngoPartners ? `${stats.ngoPartners}+` : '4+'}
                  </div>
                  <div className="text-xs text-white/80 font-medium mt-0.5">NGO Partners</div>
                </div>
              </motion.div>

              {/* Stat 3: Volunteers */}
              <motion.div
                variants={popIn}
                className="flex items-center gap-3 bg-[#d48b3a] text-white rounded-2xl px-5 py-4 shadow-md shadow-[#d48b3a]/25 cursor-default hover:scale-105 transition-transform duration-200"
              >
                <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center text-xl shrink-0">
                  🤝
                </div>
                <div>
                  <div className="text-2xl font-extrabold tracking-tight leading-none">
                    {stats?.volunteers ? `${stats.volunteers}+` : '3+'}
                  </div>
                  <div className="text-xs text-white/80 font-medium mt-0.5">Volunteers</div>
                </div>
              </motion.div>

              {/* Stat 4: Zero Waste Goal */}
              <motion.div
                variants={popIn}
                className="flex items-center gap-3 bg-[#6c7841] text-white rounded-2xl px-5 py-4 shadow-md shadow-[#6c7841]/25 cursor-default hover:scale-105 transition-transform duration-200"
              >
                <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center text-xl shrink-0">
                  ♻️
                </div>
                <div>
                  <div className="text-2xl font-extrabold tracking-tight leading-none">Zero</div>
                  <div className="text-xs text-white/80 font-medium mt-0.5">Food Waste Goal</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ================= HOW IT WORKS SECTION ================= */}
        <section id="how-it-works" className="py-20 lg:py-28 bg-[#fbf9f5] border-y border-[#e6ded3] relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="text-center max-w-3xl mx-auto mb-20"
            >
              <motion.span variants={fadeInUp} className="inline-block px-3 py-1 rounded-full bg-primary-100 text-primary-800 text-xs font-bold uppercase tracking-wider mb-4">
                Simple 3-Step Flow
              </motion.span>
              <motion.h2 variants={fadeInUp} className="text-3xl sm:text-5xl font-extrabold text-[#192b17] tracking-tight mb-5" style={{ fontFamily: 'var(--font-sans)' }}>
                How ShareBite Works
              </motion.h2>
              <motion.p variants={fadeInUp} className="text-lg text-gray-600">
                A seamless bridge connecting surplus freshness to the communities that need it most, powered by caring people.
              </motion.p>
            </motion.div>

            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10"
            >
              {/* Step 1: Partner Up / Donors Give */}
              <motion.div 
                variants={popIn} 
                className="bg-white rounded-3xl p-8 border border-[#e6ded3] shadow-sm hover:shadow-xl hover:border-primary-300 transition-all duration-300 group flex flex-col items-center text-center"
              >
                <div className="h-20 w-20 rounded-2xl bg-[#eaf3e8] text-primary-700 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary-600 group-hover:text-white transition-all duration-300 shadow-xs">
                  <HiHeart size={36} />
                </div>
                <span className="text-xs font-extrabold text-primary-600 tracking-wider uppercase mb-2">Step 1</span>
                <h3 className="text-2xl font-bold text-gray-900 mb-3" style={{ fontFamily: 'var(--font-sans)' }}>
                  Donors Post Surplus
                </h3>
                <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                  Restaurants, bakeries, caterers, or households easily list surplus food with photos, quantity, and pickup windows in under a minute.
                </p>
              </motion.div>

              {/* Step 2: NGOs Claim */}
              <motion.div 
                variants={popIn} 
                className="bg-white rounded-3xl p-8 border border-[#e6ded3] shadow-sm hover:shadow-xl hover:border-primary-300 transition-all duration-300 group flex flex-col items-center text-center"
              >
                <div className="h-20 w-20 rounded-2xl bg-[#fdf2e4] text-accent-500 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-accent-500 group-hover:text-white transition-all duration-300 shadow-xs">
                  <HiUserGroup size={36} />
                </div>
                <span className="text-xs font-extrabold text-accent-600 tracking-wider uppercase mb-2">Step 2</span>
                <h3 className="text-2xl font-bold text-gray-900 mb-3" style={{ fontFamily: 'var(--font-sans)' }}>
                  NGOs Claim Quickly
                </h3>
                <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                  Verified local charities and food pantries receive real-time alerts for nearby listings and instantly claim items for meal programs.
                </p>
              </motion.div>

              {/* Step 3: Volunteers Deliver */}
              <motion.div 
                variants={popIn} 
                className="bg-white rounded-3xl p-8 border border-[#e6ded3] shadow-sm hover:shadow-xl hover:border-primary-300 transition-all duration-300 group flex flex-col items-center text-center"
              >
                <div className="h-20 w-20 rounded-2xl bg-[#edf4ed] text-primary-800 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary-800 group-hover:text-white transition-all duration-300 shadow-xs">
                  <HiTruck size={36} />
                </div>
                <span className="text-xs font-extrabold text-primary-800 tracking-wider uppercase mb-2">Step 3</span>
                <h3 className="text-2xl font-bold text-gray-900 mb-3" style={{ fontFamily: 'var(--font-sans)' }}>
                  Volunteers Transport
                </h3>
                <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                  Community volunteers accept pickup dispatches, securely collect food using verification codes, and deliver fresh meals safely.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ================= IMPACT STORY SECTION ================= */}
        <section id="impact" className="py-24 bg-[#f5f0e8] overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              
              {/* Photo Showcase */}
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={fadeInUp}
                className="lg:col-span-6 relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white"
              >
                <img
                  src="/images/home-impact.png"
                  alt="Volunteer handing nutritious food box to community member"
                  className="w-full h-[460px] object-cover hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />
                <div className="absolute bottom-6 left-6 right-6 text-white z-10">
                  <h4 
                    className="text-xl sm:text-2xl font-bold !text-white text-white drop-shadow-md leading-snug"
                    style={{ color: '#ffffff', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}
                  >
                    Making a sustainable, local difference.
                  </h4>
                </div>
              </motion.div>

              {/* Impact Narrative & Metrics */}
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={staggerContainer}
                className="lg:col-span-6"
              >
                <motion.span variants={fadeInUp} className="text-xs font-extrabold text-primary-700 tracking-wider uppercase">
                  Measurable Good
                </motion.span>
                <motion.h2 
                  variants={fadeInUp} 
                  className="text-3xl sm:text-5xl font-extrabold text-[#192b17] mt-2 mb-6 leading-tight tracking-tight"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  Small acts of kindness,<br />
                  <span className="text-primary-600">massive community impact.</span>
                </motion.h2>

                <motion.p variants={fadeInUp} className="text-lg text-gray-600 mb-8 leading-relaxed">
                  Every day, perfectly good meals are discarded while thousands face food insecurity. ShareBite closes that cycle with modern coordination, clear verification, and immediate community action.
                </motion.p>

                <motion.div variants={staggerContainer} className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-[#e6ded3] shadow-xs">
                    <div className="text-3xl font-extrabold text-primary-700 mb-1" style={{ fontFamily: 'var(--font-sans)' }}>100%</div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Free Platform</div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-[#e6ded3] shadow-xs">
                    <div className="text-3xl font-extrabold text-accent-500 mb-1" style={{ fontFamily: 'var(--font-sans)' }}>&lt; 60m</div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Avg. Claim Time</div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-[#e6ded3] shadow-xs">
                    <div className="text-3xl font-extrabold text-primary-800 mb-1" style={{ fontFamily: 'var(--font-sans)' }}>
                      {stats?.citiesReached ? `${stats.citiesReached}+` : '3+'}
                    </div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Cities</div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-[#e6ded3] shadow-xs">
                    <div className="text-3xl font-extrabold text-emerald-600 mb-1" style={{ fontFamily: 'var(--font-sans)' }}>Secure</div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">OTP Verification</div>
                  </div>
                </motion.div>
              </motion.div>

            </div>
          </div>
        </section>

        {/* ================= BOTTOM CTA ================= */}
        <section className="py-24 bg-[#eaf2e8] border-t border-[#d8e7d5] relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-16 -mr-16 w-80 h-80 bg-primary-200/50 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-80 h-80 bg-accent-200/40 rounded-full blur-3xl pointer-events-none" />

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center"
          >
            <motion.span variants={popIn} className="text-3xl mb-3 inline-block">🌿</motion.span>
            <motion.h2 
              variants={popIn} 
              className="text-3xl sm:text-5xl font-extrabold text-[#192b17] mb-6 tracking-tight"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              Ready to create positive change?
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-lg sm:text-xl text-[#394d37] mb-10 max-w-2xl mx-auto font-normal">
              Whether you are a donor with surplus food, a nonprofit serving meals, or a volunteer ready to drive — your community needs you.
            </motion.p>
            <motion.div variants={fadeInUp}>
              <Link to="/register">
                <motion.button 
                  whileHover={{ scale: 1.04 }} 
                  whileTap={{ scale: 0.96 }} 
                  className="btn-primary text-lg px-10 py-4 shadow-xl shadow-primary-700/25"
                >
                  Join the ShareBite Movement
                  <HiArrowRight size={20} />
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>
        </section>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="bg-white border-t border-[#e8e2d5] py-12 text-center text-sm text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center text-white text-xs font-bold">
              🌱
            </div>
            <span className="text-lg font-bold text-gray-800 tracking-tight" style={{ fontFamily: 'var(--font-sans)' }}>
              Share<span className="text-primary-600">Bite</span>
            </span>
          </div>
          <p className="max-w-md text-gray-500 text-xs sm:text-sm">
            Dedicated to eliminating local food waste and nourishing communities with dignity, empathy, and speed.
          </p>
          <div className="flex items-center gap-6 text-xs text-gray-400 mt-2">
            <Link to="/" className="hover:text-primary-700 transition-colors">Home</Link>
            <a href="#how-it-works" className="hover:text-primary-700 transition-colors">How It Works</a>
            <a href="#impact" className="hover:text-primary-700 transition-colors">Our Impact</a>
            <Link to="/login" className="hover:text-primary-700 transition-colors">Log In</Link>
          </div>
          <p className="text-xs text-gray-400 mt-2">© {new Date().getFullYear()} ShareBite Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
