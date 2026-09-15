import React from 'react';
import { Phone, Store, ShieldCheck, Heart } from 'lucide-react';

interface FooterProps {
  onOpenAdmin: () => void;
  onOpenCatalog: () => void;
  onOpenCart: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdmin, onOpenCatalog, onOpenCart }) => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Col 1: Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white font-black text-base">
              <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-sm font-black">
                MP
              </div>
              <span>Koperasi Desa/Kelurahan Merah Putih</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              Gerai Sembako Cengkareng Timur — Menghadirkan sembako berkualitas dengan harga seragam dan hemat untuk keluarga serta UMKM.
            </p>
            <div className="text-[11px] text-slate-500">
              WhatsApp Layanan: <span className="text-white font-mono font-bold">0858-8168-8927</span>
            </div>
          </div>

        </div>

        {/* Bottom copyright */}
        <div className="pt-8 border-t border-slate-800 text-center flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} Koperasi Merah Putih. Seluruh Hak Cipta Dilindungi.</p>
          <p className="flex items-center gap-1">
            Terintegrasi Firebase Authentication, Firestore Database & WhatsApp Checkout.
          </p>
        </div>
      </div>
    </footer>
  );
};
