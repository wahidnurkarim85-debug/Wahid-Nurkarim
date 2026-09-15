import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { useSiteConfig } from '../context/SiteConfigContext';

interface HeroCarouselProps {
  onOpenCatalog: () => void;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ onOpenCatalog }) => {
  const { banners } = useSiteConfig();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [banners.length]);

  if (!banners || banners.length === 0) return null;

  const current = banners[currentIndex];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  return (
    <>
      {/* Clickable Banner Container opening Fullscreen Modal */}
      <div 
        onClick={() => {
          setZoomLevel(100);
          setIsModalOpen(true);
        }}
        className="relative w-full overflow-hidden bg-slate-900 shadow-xl rounded-2xl max-w-7xl mx-auto my-4 group cursor-pointer transition-transform hover:shadow-2xl"
        title="Klik untuk melihat gambar banner secara penuh dan jelas"
      >
        {/* Background Image with HD contrast and clarity */}
        <div className="absolute inset-0 overflow-hidden">
          <img 
            src={current.imageUrl} 
            alt={current.title}
            className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-700 opacity-80 filter contrast-105 saturate-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/80 to-transparent"></div>
        </div>

        {/* Fullscreen Hint Badge */}
        <div className="absolute top-4 right-4 z-20">
          <span className="px-3 py-1.5 rounded-xl bg-black/60 text-white backdrop-blur-md border border-white/20 text-xs font-bold flex items-center gap-1.5 shadow-lg group-hover:bg-red-600 transition-colors">
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Klik untuk Full Jendela</span>
          </span>
        </div>

        {/* Content */}
        <div className="relative z-10 px-6 sm:px-12 py-12 sm:py-16 md:py-20 flex flex-col justify-center max-w-2xl text-white space-y-4">
          {current.badgeText && (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-red-600 text-white text-xs font-black uppercase tracking-wider w-fit shadow-md">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{current.badgeText}</span>
            </div>
          )}
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight drop-shadow-sm">
            {current.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed max-w-lg drop-shadow-sm">
            {current.subtitle}
          </p>
          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenCatalog();
              }}
              className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-black shadow-lg shadow-red-950/40 transition-transform active:scale-95 cursor-pointer"
            >
              Belanja Sembako Sekarang
            </button>
          </div>
        </div>

        {/* Navigation Buttons */}
        {banners.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-xs transition-colors z-20 cursor-pointer shadow-lg"
              title="Geser Kiri"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-xs transition-colors z-20 cursor-pointer shadow-lg"
              title="Geser Kanan"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Dots Indicator */}
            <div className="absolute bottom-4 right-6 z-20 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              {banners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2.5 rounded-full transition-all ${
                    idx === currentIndex ? 'w-8 bg-red-600' : 'w-2.5 bg-white/50 hover:bg-white'
                  }`}
                  title={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Fullscreen High-Definition Image Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-lg animate-fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="relative max-w-6xl w-full max-h-[95vh] flex flex-col bg-slate-900 rounded-3xl p-6 border border-slate-700 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
              <div>
                <h3 className="text-white text-base font-black">{current.title}</h3>
                <p className="text-slate-400 text-xs">Tampilan Detail Gambar HD Full Jendela</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoomLevel((prev) => Math.max(prev - 25, 100))}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ZoomOut className="w-4 h-4" /> <span>Perkecil</span>
                </button>
                <button
                  onClick={() => setZoomLevel((prev) => Math.min(prev + 50, 250))}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ZoomIn className="w-4 h-4" /> <span>Perbesar ({zoomLevel}%)</span>
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-xl bg-red-600 hover:bg-red-500 text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-auto max-h-[75vh] w-full flex items-center justify-center p-4 my-2 rounded-2xl bg-black/80 border border-slate-800 shadow-inner">
              <img 
                src={current.imageUrl} 
                alt={current.title}
                className="max-h-[70vh] object-contain transition-transform duration-300 rounded-xl shadow-2xl filter contrast-105"
                style={{ transform: `scale(${zoomLevel / 100})` }}
              />
            </div>
            
            <div className="text-center text-xs text-slate-300 pt-2 shrink-0 font-medium">
              {current.subtitle}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
