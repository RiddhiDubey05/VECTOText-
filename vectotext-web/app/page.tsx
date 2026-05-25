"use client";

import { useState } from 'react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    // Asynchronous backend orchestration will plug in here later!
  };

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-between p-6 overflow-hidden select-none">
      
      {/* High-End Ambient Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-brand-purple/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-brand-pink/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="relative z-10 w-full max-w-5xl flex justify-between items-center py-4 border-b border-brand-purple/5 backdrop-blur-md">
        <div className="flex items-center gap-2 group cursor-pointer">
          <span className="text-2xl transform group-hover:rotate-12 transition-transform duration-300">🎀</span>
          <span className="bg-gradient-to-r from-brand-purple to-brand-pink bg-clip-text text-transparent font-black text-2xl tracking-tight">
            VectoText
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-gradient-to-r from-brand-purple/10 to-brand-pink/10 text-brand-purple border border-brand-purple/20 px-3 py-1 rounded-full font-bold tracking-wide uppercase">
            v1.0 Developer Alpha ✨
          </span>
        </div>
      </header>

      {/* Main Container */}
      <div className="relative z-10 flex-1 w-full max-w-3xl flex flex-col items-center justify-center text-center my-16">
        
        {/* Cute Micro-Badge */}
        <div className="inline-flex items-center gap-2 bg-white/80 border border-slate-100 px-4 py-1.5 rounded-full shadow-xs mb-6 backdrop-blur-xs">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-pink opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-pink"></span>
          </span>
          <span className="text-xs font-bold text-slate-600 tracking-wide">Next-Gen Content Repurposing</span>
        </div>

        {/* Premium Core Typography */}
        <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1] mb-6 text-slate-900">
          Turn your tech videos into <br />
          <span className="bg-gradient-to-r from-brand-purple via-brand-pink to-brand-purple bg-[length:200%_auto] bg-clip-text text-transparent py-1">
            Bubbly, Premium Blogs
          </span>
        </h1>
        
        <p className="text-slate-500 text-lg max-w-xl mb-10 font-medium leading-relaxed">
          Drop a YouTube link or webinar file. Our data engine instantly forges flawless technical documentation and platform-ready LinkedIn threads.
        </p>
        
        {/* Interactive Workspace Card */}
        <div className="w-full bg-white/60 backdrop-blur-xl border border-white/80 p-8 rounded-[32px] shadow-[0_20px_50px_rgba(155,77,255,0.05)] transition-all duration-300 hover:shadow-[0_20px_50px_rgba(155,77,255,0.1)] group">
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3 items-center">
            
            <div className="relative w-full flex-1">
              {/* Cute input link icon overlay */}
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 font-bold">
                🔗
              </div>
              <input 
                type="url" 
                placeholder="Paste your technical video or YouTube link here..." 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                disabled={isProcessing}
                className="w-full pl-12 pr-4 py-4 bg-white/90 border border-slate-200/80 rounded-2xl text-slate-800 placeholder-slate-400 font-medium focus:outline-hidden focus:ring-2 focus:ring-brand-purple/50 focus:border-brand-purple transition-all duration-300 disabled:opacity-50 text-sm md:text-base"
              />
            </div>

            <button 
              type="submit"
              disabled={isProcessing}
              className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-brand-purple to-brand-pink hover:opacity-90 text-white font-bold rounded-2xl shadow-lg shadow-brand-purple/20 transition-all duration-300 active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 tracking-wide whitespace-nowrap text-sm md:text-base"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Processing...
                </>
              ) : (
                <>
                  ⚡ Repurpose Now
                </>
              )}
            </button>

          </form>

          {/* Micro Trust Text */}
          <p className="text-left text-xs text-slate-400 mt-4 pl-2 font-medium flex items-center gap-1">
            <span>💡</span> Pro tip: Try pasting a deep engineering talk or system architecture overview.
          </p>
        </div>

      </div>

      {/* Footer Branding anchor */}
      <footer className="relative z-10 text-xs text-slate-400 font-medium tracking-wide py-4">
        &copy; {new Date().getFullYear()} <span className="font-bold text-slate-500">VectoText</span>. Crafted beautifully by an engineering founder.
      </footer>
    </main>
  );
}