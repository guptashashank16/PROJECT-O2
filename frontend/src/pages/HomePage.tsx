import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  Atom,
  Database,
  GitCompare,
  Lightbulb,
  LogIn,
  LogOut,
  Scale,
  Sparkles,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LoginPage } from './LoginPage';

interface HomePageProps {
  onGetStarted: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onGetStarted }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  return (
    <div className="min-h-screen bg-[#faf7fb] bg-radial-gradient flex flex-col justify-between overflow-x-hidden font-sans text-slate-800 relative selection:bg-pink-100 selection:text-pink-800">
      {/* Background Decorative Ethereal Aura Glows */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-pink-300/30 via-purple-200/20 to-transparent rounded-full blur-3xl pointer-events-none -z-0" />
      <div className="absolute -bottom-20 -left-20 w-[500px] h-[500px] bg-gradient-to-tr from-rose-200/30 via-pink-100/30 to-transparent rounded-full blur-3xl pointer-events-none -z-0" />

      {/* Top Navbar */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-6 py-6 md:px-12 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer group" onClick={onGetStarted}>
          <div className="w-10 h-10 rounded-full border-2 border-pink-400/80 bg-white/80 p-1.5 shadow-sm shadow-pink-500/10 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
            <Atom className="w-6 h-6 text-pink-600 animate-[spin_12s_linear_infinite]" />
          </div>
          <span className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-1.5">
            Q-CARE
          </span>
        </div>

        {/* Auth / Sign In Actions */}
        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 border border-pink-200/80 text-xs shadow-sm">
                <User className="w-3.5 h-3.5 text-pink-600" />
                <span className="font-semibold text-slate-900">{user.full_name || user.username}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-700">
                  {user.role}
                </span>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-pink-200/80 transition text-xs font-semibold shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white text-xs font-semibold shadow-md shadow-pink-500/25 hover:shadow-lg hover:shadow-pink-500/35 transition-all duration-200 hover:-translate-y-0.5"
            >
              <span>Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 py-8 lg:py-12 flex-1 flex flex-col lg:flex-row items-center justify-between gap-12">
        {/* Left Column: Typography & CTAs */}
        <div className="flex-1 max-w-xl space-y-6 text-left">
          <div className="inline-block">
            <span className="text-[11px] font-bold tracking-[0.25em] text-slate-400 uppercase">
              Hybrid Quantum-Classical
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#1e2340] tracking-tight leading-[1.12]">
            Research Platform <br />
            for <span className="bg-gradient-to-r from-pink-600 via-rose-500 to-purple-600 bg-clip-text text-transparent">Biomedical AI</span>
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-lg font-normal">
            Q-CARE combines classical machine learning and quantum computing to help researchers explore better models, deeper insights and more reliable outcomes in biomedical data.
          </p>

          <div className="pt-3">
            <button
              onClick={onGetStarted}
              className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-semibold text-sm shadow-lg shadow-pink-500/30 hover:shadow-xl hover:shadow-pink-500/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        {/* Right Column: 3D Stacked Quantum Processor Visual Illustration */}
        <div className="flex-1 w-full max-w-lg lg:max-w-xl flex items-center justify-center relative">
          {/* Glowing Aura Backdrops */}
          <div className="absolute inset-0 bg-gradient-to-tr from-pink-400/20 via-purple-400/20 to-blue-400/10 rounded-full blur-2xl -z-0" />
          
          <div className="relative w-full aspect-square max-w-[480px] flex items-center justify-center">
            {/* SVG Interactive/Animated Quantum Graphic */}
            <svg
              viewBox="0 0 500 500"
              className="w-full h-full drop-shadow-2xl overflow-visible"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Gradients */}
                <linearGradient id="layerGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f472b6" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#c084fc" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#818cf8" stopOpacity="0.4" />
                </linearGradient>
                <linearGradient id="layerGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fb7185" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#e879f9" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity="0.5" />
                </linearGradient>
                <linearGradient id="layerGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ec4899" stopOpacity="0.95" />
                  <stop offset="50%" stopColor="#f43f5e" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#c026d3" stopOpacity="0.7" />
                </linearGradient>
                <linearGradient id="beamGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                  <stop offset="30%" stopColor="#f472b6" stopOpacity="0.7" />
                  <stop offset="70%" stopColor="#c084fc" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#e0e7ff" stopOpacity="0" />
                </linearGradient>
                <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                  <stop offset="40%" stopColor="#f472b6" stopOpacity="0.8" />
                  <stop offset="80%" stopColor="#a855f7" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                </radialGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Orbital Ellipses */}
              <ellipse
                cx="250"
                cy="250"
                rx="210"
                ry="90"
                stroke="url(#layerGrad1)"
                strokeWidth="1.5"
                strokeDasharray="4 6"
                className="animate-[spin_40s_linear_infinite] origin-center opacity-70"
              />
              <ellipse
                cx="250"
                cy="250"
                rx="190"
                ry="120"
                transform="rotate(-25 250 250)"
                stroke="url(#layerGrad2)"
                strokeWidth="1.5"
                className="opacity-60"
              />
              <ellipse
                cx="250"
                cy="250"
                rx="180"
                ry="80"
                transform="rotate(35 250 250)"
                stroke="url(#layerGrad3)"
                strokeWidth="1.2"
                strokeDasharray="6 4"
                className="opacity-60"
              />

              {/* Vertical Photonic Beam */}
              <path
                d="M 230 250 L 240 60 L 260 60 L 270 250 Z"
                fill="url(#beamGrad)"
                className="animate-pulse opacity-85"
              />
              <line x1="250" y1="260" x2="250" y2="40" stroke="#ffffff" strokeWidth="2.5" opacity="0.9" />
              <line x1="242" y1="230" x2="242" y2="70" stroke="#fbcfe8" strokeWidth="1" opacity="0.6" strokeDasharray="3 3" />
              <line x1="258" y1="230" x2="258" y2="70" stroke="#e9d5ff" strokeWidth="1" opacity="0.6" strokeDasharray="3 3" />

              {/* Bottom Layer 1 (Isometric Glass Diamond/Square) */}
              <g transform="translate(0, 75)">
                <polygon
                  points="250,230 380,170 250,110 120,170"
                  fill="url(#layerGrad1)"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  opacity="0.75"
                />
                <polygon
                  points="250,242 380,182 380,170 250,230 120,170 120,182"
                  fill="#7e22ce"
                  opacity="0.4"
                />
                {/* Circuit Traces */}
                <path d="M 210 160 L 250 180 L 290 160" stroke="#ffffff" strokeWidth="1.2" opacity="0.8" />
                <path d="M 180 175 L 250 210 L 320 175" stroke="#fbcfe8" strokeWidth="1" opacity="0.7" />
                <circle cx="250" cy="180" r="3" fill="#ffffff" />
                <circle cx="210" cy="160" r="2.5" fill="#f472b6" />
                <circle cx="290" cy="160" r="2.5" fill="#c084fc" />
              </g>

              {/* Middle Layer 2 */}
              <g transform="translate(0, 20)">
                <polygon
                  points="250,230 380,170 250,110 120,170"
                  fill="url(#layerGrad2)"
                  stroke="#ffffff"
                  strokeWidth="2"
                  opacity="0.85"
                />
                <polygon
                  points="250,242 380,182 380,170 250,230 120,170 120,182"
                  fill="#a21caf"
                  opacity="0.5"
                />
                {/* Circuit Grid Lines */}
                <path d="M 250 130 L 340 170" stroke="#ffffff" strokeWidth="1" opacity="0.8" />
                <path d="M 250 130 L 160 170" stroke="#ffffff" strokeWidth="1" opacity="0.8" />
                <path d="M 160 170 L 250 210" stroke="#ffffff" strokeWidth="1" opacity="0.8" />
                <path d="M 340 170 L 250 210" stroke="#ffffff" strokeWidth="1" opacity="0.8" />
                <circle cx="250" cy="170" r="4" fill="#ffffff" filter="url(#glow)" />
              </g>

              {/* Top Layer 3 (Highest Glow) */}
              <g transform="translate(0, -35)">
                <polygon
                  points="250,230 380,170 250,110 120,170"
                  fill="url(#layerGrad3)"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  opacity="0.9"
                />
                <polygon
                  points="250,242 380,182 380,170 250,230 120,170 120,182"
                  fill="#be185d"
                  opacity="0.6"
                />
                {/* Inner Core Glowing Chip */}
                <polygon
                  points="250,195 315,165 250,135 185,165"
                  fill="#ffffff"
                  stroke="#f472b6"
                  strokeWidth="2"
                  opacity="0.95"
                  filter="url(#glow)"
                />
                <circle cx="250" cy="165" r="14" fill="url(#coreGlow)" filter="url(#glow)" />
                <circle cx="250" cy="165" r="5" fill="#ffffff" />
              </g>

              {/* Orbiting Quantum Qubit Spheres */}
              {/* Sphere 1: Top Right */}
              <g className="animate-bounce" style={{ animationDuration: '4s' }}>
                <circle cx="410" cy="120" r="16" fill="url(#layerGrad2)" filter="url(#glow)" />
                <circle cx="406" cy="115" r="5" fill="#ffffff" opacity="0.8" />
              </g>

              {/* Sphere 2: Left Mid */}
              <g className="animate-pulse" style={{ animationDuration: '3.5s' }}>
                <circle cx="95" cy="210" r="13" fill="url(#layerGrad1)" filter="url(#glow)" />
                <circle cx="92" cy="207" r="4" fill="#ffffff" opacity="0.7" />
              </g>

              {/* Sphere 3: Bottom Left */}
              <circle cx="85" cy="330" r="11" fill="url(#layerGrad3)" filter="url(#glow)" />
              <circle cx="83" cy="328" r="3" fill="#ffffff" opacity="0.8" />

              {/* Sphere 4: Bottom Right */}
              <circle cx="420" cy="370" r="8" fill="#c084fc" filter="url(#glow)" />

              {/* Floating Sparkles / Particles */}
              <circle cx="240" cy="90" r="2.5" fill="#ffffff" className="animate-ping" style={{ animationDuration: '2s' }} />
              <circle cx="265" cy="110" r="2" fill="#ffffff" className="animate-ping" style={{ animationDuration: '3s' }} />
              <circle cx="230" cy="140" r="1.5" fill="#fdf2f8" />
              <circle cx="280" cy="80" r="2" fill="#ffffff" />
              <circle cx="255" cy="45" r="3" fill="#ffffff" filter="url(#glow)" />
            </svg>
          </div>
        </div>
      </main>

      {/* Bottom Feature Strip */}
      <footer className="relative z-20 w-full border-t border-pink-200/80 bg-white/70 backdrop-blur-md py-4 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* 4 Core Pillars */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 sm:gap-8 text-xs font-semibold text-slate-700">
            {/* 1. Data Processing */}
            <div className="flex items-center gap-2 text-slate-700 hover:text-pink-600 transition-colors">
              <Database className="w-4 h-4 text-pink-500" />
              <span>Data Processing</span>
            </div>

            <div className="hidden sm:block w-px h-4 bg-pink-200" />

            {/* 2. Hybrid Models */}
            <div className="flex items-center gap-2 text-slate-700 hover:text-pink-600 transition-colors">
              <Atom className="w-4 h-4 text-pink-500" />
              <span>Hybrid Models</span>
            </div>

            <div className="hidden sm:block w-px h-4 bg-pink-200" />

            {/* 3. Model Comparison */}
            <div className="flex items-center gap-2 text-slate-700 hover:text-pink-600 transition-colors">
              <Scale className="w-4 h-4 text-pink-500" />
              <span>Model Comparison</span>
            </div>

            <div className="hidden sm:block w-px h-4 bg-pink-200" />

            {/* 4. Explainability */}
            <div className="flex items-center gap-2 text-slate-700 hover:text-pink-600 transition-colors">
              <Lightbulb className="w-4 h-4 text-pink-500" />
              <span>Explainability</span>
            </div>
          </div>

          {/* Right Tagline */}
          <div className="text-right text-xs text-slate-500 font-medium">
            <span className="text-slate-400">— </span>
            <span className="text-slate-700 font-semibold">Better Models.</span>{' '}
            <span>Better Tomorrow.</span>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      {showLoginModal && <LoginPage onClose={() => setShowLoginModal(false)} />}
    </div>
  );
};
