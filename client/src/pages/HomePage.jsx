import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HiHeart, HiTruck, HiUserGroup, HiArrowRight } from 'react-icons/hi';
import { motion, useAnimation, useInView } from 'framer-motion';
import Navbar from '../components/layout/Navbar';

// Advanced animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1
    }
  }
};

const popIn = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 12, mass: 0.8 } }
};

const slideInLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }
};

const slideInRight = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }
};

const HomePage = () => {
  return (
    <div className="min-h-screen bg-[#fff7ed] flex flex-col font-sans">
      <Navbar onToggleSidebar={() => {}} />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-white overflow-hidden">
          <div className="absolute inset-0">
            <motion.img
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              src="/images/home-hero.png"
              alt="Community sharing food"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/30 mix-blend-multiply" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 flex flex-col items-center sm:items-start text-center sm:text-left">
            <motion.div 
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="max-w-2xl"
            >
              <motion.span variants={fadeInUp} className="inline-block py-1 px-3 rounded-full bg-primary-500/20 text-primary-200 border border-primary-500/30 text-sm font-semibold tracking-wide uppercase mb-6 backdrop-blur-sm">
                Food Donation Platform
              </motion.span>
              <motion.h1 variants={fadeInUp} className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white tracking-tight mb-6 leading-tight" style={{ fontFamily: 'var(--font-sans)' }}>
                Share Food, <br className="hidden sm:block" />
                <span className="text-primary-400">Share Hope.</span>
              </motion.h1>
              <motion.p variants={fadeInUp} className="text-lg sm:text-xl text-gray-200 mb-10 max-w-xl font-light">
                Join our mission to reduce food waste and fight hunger. Connect with local donors, NGOs, and volunteers to make a real difference in your community today.
              </motion.p>
              
              <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4">
                <Link to="/register">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-500 hover:shadow-xl hover:shadow-primary-600/40 transition-colors duration-300">
                    Join the Movement
                    <HiArrowRight size={20} />
                  </motion.div>
                </Link>
                <Link to="/login">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold text-white bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 hover:border-white/30 backdrop-blur-sm transition-colors duration-300">
                    Log In
                  </motion.div>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 lg:py-32 bg-[#fff7ed] relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="text-center max-w-3xl mx-auto mb-24"
            >
              <motion.h2 variants={fadeInUp} className="text-4xl font-bold text-gray-900 sm:text-5xl mb-6 tracking-tight" style={{ fontFamily: 'var(--font-sans)' }}>
                How ShareBite Works
              </motion.h2>
              <motion.p variants={fadeInUp} className="text-xl text-gray-600">
                Our platform bridges the gap between surplus food and those who need it most, powered by a community of compassionate individuals.
              </motion.p>
            </motion.div>

            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-20"
            >
              {/* Pillar 1 */}
              <motion.div variants={popIn} whileHover={{ y: -10 }} className="flex flex-col items-center text-center group cursor-pointer">
                <div className="h-28 w-28 rounded-full bg-white shadow-xl shadow-primary-500/10 text-primary-600 flex items-center justify-center mb-8 relative">
                  <div className="absolute inset-0 bg-primary-100 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500 ease-out" />
                  <HiHeart size={44} className="relative z-10 transition-colors duration-500 group-hover:text-primary-700" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-sans)' }}>Donors Give</h3>
                <p className="text-lg text-gray-600 leading-relaxed max-w-sm">
                  Restaurants, grocery stores, or individuals with surplus fresh food can easily create a donation listing in seconds.
                </p>
              </motion.div>

              {/* Pillar 2 */}
              <motion.div variants={popIn} whileHover={{ y: -10 }} className="flex flex-col items-center text-center group cursor-pointer">
                <div className="h-28 w-28 rounded-full bg-white shadow-xl shadow-accent-500/10 text-accent-600 flex items-center justify-center mb-8 relative">
                  <div className="absolute inset-0 bg-accent-100 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500 ease-out" />
                  <HiUserGroup size={44} className="relative z-10 transition-colors duration-500 group-hover:text-accent-700" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-sans)' }}>NGOs Claim</h3>
                <p className="text-lg text-gray-600 leading-relaxed max-w-sm">
                  Verified local NGOs and community centers receive alerts for nearby donations and can claim the food for distribution.
                </p>
              </motion.div>

              {/* Pillar 3 */}
              <motion.div variants={popIn} whileHover={{ y: -10 }} className="flex flex-col items-center text-center group cursor-pointer">
                <div className="h-28 w-28 rounded-full bg-white shadow-xl shadow-green-500/10 text-green-600 flex items-center justify-center mb-8 relative">
                  <div className="absolute inset-0 bg-green-100 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500 ease-out" />
                  <HiTruck size={44} className="relative z-10 transition-colors duration-500 group-hover:text-green-700" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-sans)' }}>Volunteers Deliver</h3>
                <p className="text-lg text-gray-600 leading-relaxed max-w-sm">
                  Dedicated volunteers pick up the claimed food and safely transport it from the donor directly to the NGO.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Impact Section */}
        <section className="py-24 lg:py-0 bg-white overflow-hidden">
          <div className="max-w-7xl mx-auto lg:flex items-stretch">
            {/* Image Side */}
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={slideInLeft}
              className="lg:w-1/2 relative min-h-[500px] lg:min-h-[700px] rounded-3xl lg:rounded-none lg:rounded-r-[4rem] overflow-hidden mx-4 lg:mx-0 shadow-2xl"
            >
              <motion.img
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 10, ease: "linear" }}
                src="/images/home-impact.png"
                alt="Volunteer handing a meal box"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-primary-900/80 via-primary-900/40 to-transparent" />
            </motion.div>

            {/* Content Side */}
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="lg:w-1/2 flex items-center p-8 lg:p-24"
            >
              <div className="max-w-xl">
                <motion.h2 variants={fadeInUp} className="text-4xl sm:text-5xl font-bold text-gray-900 mb-8 leading-tight tracking-tight" style={{ fontFamily: 'var(--font-sans)' }}>
                  Small acts of kindness, <br className="hidden sm:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-accent-600">massive impact.</span>
                </motion.h2>
                <motion.p variants={fadeInUp} className="text-xl text-gray-600 mb-12 leading-relaxed">
                  Every single day, tons of perfectly good food go to waste while millions go hungry. We built ShareBite to change that equation, one meal at a time.
                </motion.p>

                <motion.div variants={staggerContainer} className="grid grid-cols-2 gap-x-8 gap-y-12">
                  <motion.div variants={popIn}>
                    <div className="text-5xl font-extrabold text-primary-600 mb-2 tracking-tighter" style={{ fontFamily: 'var(--font-sans)' }}>10k+</div>
                    <div className="text-sm font-bold text-gray-500 uppercase tracking-widest">Meals Shared</div>
                  </motion.div>
                  <motion.div variants={popIn}>
                    <div className="text-5xl font-extrabold text-accent-600 mb-2 tracking-tighter" style={{ fontFamily: 'var(--font-sans)' }}>50+</div>
                    <div className="text-sm font-bold text-gray-500 uppercase tracking-widest">Partner NGOs</div>
                  </motion.div>
                  <motion.div variants={popIn}>
                    <div className="text-5xl font-extrabold text-green-600 mb-2 tracking-tighter" style={{ fontFamily: 'var(--font-sans)' }}>200+</div>
                    <div className="text-sm font-bold text-gray-500 uppercase tracking-widest">Volunteers</div>
                  </motion.div>
                  <motion.div variants={popIn}>
                    <div className="text-5xl font-extrabold text-amber-500 mb-2 tracking-tighter" style={{ fontFamily: 'var(--font-sans)' }}>0</div>
                    <div className="text-sm font-bold text-gray-500 uppercase tracking-widest">Food Wasted</div>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-32 bg-primary-50/50 relative overflow-hidden border-t border-primary-100">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-primary-200/40 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-96 h-96 bg-accent-200/30 rounded-full blur-3xl pointer-events-none" />
          
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center"
          >
            <motion.h2 variants={popIn} className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 tracking-tight" style={{ fontFamily: 'var(--font-sans)' }}>
              Ready to make a difference?
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-2xl text-gray-600 mb-12 max-w-2xl mx-auto font-light">
              Join the ShareBite community today. It only takes a minute to sign up and start changing lives.
            </motion.p>
            <motion.div variants={fadeInUp}>
              <Link to="/register">
                <motion.div 
                  whileHover={{ scale: 1.05 }} 
                  whileTap={{ scale: 0.95 }} 
                  className="inline-flex items-center justify-center px-12 py-5 text-xl font-bold text-white bg-primary-600 rounded-2xl hover:bg-primary-700 hover:shadow-2xl hover:shadow-primary-600/30 transition-colors duration-300"
                >
                  Get Started Now
                </motion.div>
              </Link>
            </motion.div>
          </motion.div>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="bg-white text-gray-500 py-12 text-center text-sm border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 opacity-60">
             <div className="h-6 w-6 rounded-md bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                <span className="text-primary-700 text-[10px] font-bold">S</span>
             </div>
             <span className="text-lg font-bold text-gray-700 tracking-tight" style={{ fontFamily: 'var(--font-sans)' }}>
                ShareBite
             </span>
          </div>
          <p>© {new Date().getFullYear()} ShareBite Platform. Created to fight hunger and reduce food waste.</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
