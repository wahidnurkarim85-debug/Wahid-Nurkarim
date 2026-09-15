import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PointProvider } from './context/PointContext';
import { OrderProvider } from './context/OrderContext';
import { CartProvider, useCart } from './context/CartContext';
import { SiteConfigProvider, useSiteConfig } from './context/SiteConfigContext';
import { InboxProvider } from './context/InboxContext';
import { AnalyticsProvider, useAnalytics } from './context/AnalyticsContext';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { HeroCarousel } from './components/HeroCarousel';
import { ProductCatalog } from './components/ProductCatalog';
import { CartView } from './components/CartView';
import { AdminPanel } from './components/AdminPanel';
import { MemberView } from './components/MemberView';
import { CompanyProfile } from './components/CompanyProfile';
import { StaffHomeNotification } from './components/StaffHomeNotification';
import { AuthModal } from './components/AuthModal';
import { StaffAuthModal } from './components/StaffAuthModal';
import { FinancialReportModal } from './components/FinancialReportModal';
import { ProfileModal } from './components/ProfileModal';
import { UpgradeModal } from './components/UpgradeModal';
import { InboxModal } from './components/InboxModal';
import { OrderHistoryModal } from './components/OrderHistoryModal';
import { PointModal } from './components/PointModal';
import { PromoToastContainer } from './components/PromoToastContainer';
import { Footer } from './components/Footer';
import { AudioWelcomeManager } from './components/AudioWelcomeManager';
import { ReviewLoveProvider } from './context/ReviewLoveContext';
import { seedInitialFirestoreData } from './lib/firebase';
import { Product } from './types';
import { ShoppingCart } from 'lucide-react';

function MainContent() {
  const [activeTab, setActiveTab] = useState<'home' | 'catalog' | 'cart' | 'admin' | 'member' | 'profile'>('home');
  const [adminSubTab, setAdminSubTab] = useState<'products' | 'vouchers' | 'promotions' | 'employees' | 'members' | 'visitors' | 'inbox' | 'staffInfo' | 'slider' | 'appearance' | 'revenue' | 'stockLogs' | 'shipping'>('products');
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [staffAuthModalOpen, setStaffAuthModalOpen] = useState<boolean>(false);
  const [financialReportModalOpen, setFinancialReportModalOpen] = useState<boolean>(false);
  const [profileModalOpen, setProfileModalOpen] = useState<boolean>(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState<boolean>(false);
  const [inboxModalOpen, setInboxModalOpen] = useState<boolean>(false);
  const [orderHistoryModalOpen, setOrderHistoryModalOpen] = useState<boolean>(false);
  const [pointModalOpen, setPointModalOpen] = useState<boolean>(false);
  const [productToEditInAdmin, setProductToEditInAdmin] = useState<Product | null>(null);

  const { user } = useAuth();
  const { totalItems } = useCart();
  const { appearance } = useSiteConfig();
  const { trackEvent } = useAnalytics();

  // Support deep links from URL query parameters (e.g. from WhatsApp Copywriting)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      const productParam = urlParams.get('product');

      if (productParam || tabParam === 'catalog') {
        setActiveTab('catalog');
      } else if (tabParam && ['home', 'catalog', 'cart', 'admin', 'member', 'profile'].includes(tabParam)) {
        setActiveTab(tabParam as any);
      }
    } catch (e) {
      console.warn('URL parsing error:', e);
    }
  }, []);

  // Listen for direct navigation to product from copywriting / "Belanja Sekarang" banner
  useEffect(() => {
    const handleNavigateToProduct = (e: any) => {
      const productId = e.detail?.productId;
      if (productId) {
        try {
          const url = new URL(window.location.href);
          url.searchParams.set('tab', 'catalog');
          url.searchParams.set('product', productId);
          window.history.pushState({}, '', url.toString());
        } catch (err) {
          console.warn('History pushState error:', err);
        }
        setActiveTab('catalog');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    window.addEventListener('kopdes_navigate_to_product', handleNavigateToProduct);
    return () => window.removeEventListener('kopdes_navigate_to_product', handleNavigateToProduct);
  }, []);

  // Track tab changes
  useEffect(() => {
    if (activeTab === 'catalog') {
      trackEvent('catalog_view');
    } else if (activeTab === 'cart') {
      trackEvent('cart_view');
    }
  }, [activeTab, trackEvent]);

  // Seed Firestore on startup if empty
  useEffect(() => {
    seedInitialFirestoreData().catch((err) => {
      console.warn('Initial seed error:', err);
    });
  }, []);

  // Automatically close auth modal when user logs in
  useEffect(() => {
    if (user && authModalOpen) {
      setAuthModalOpen(false);
    }
  }, [user, authModalOpen]);

  const handleEditProductFromCatalog = (product: Product) => {
    setProductToEditInAdmin(product);
    setAdminSubTab('products');
    setActiveTab('admin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectAdminSubTab = (subTab: 'products' | 'vouchers' | 'employees' | 'members' | 'visitors' | 'staffInfo' | 'slider' | 'appearance' | 'revenue' | 'shipping') => {
    setAdminSubTab(subTab as any);
  };

  const bodyStyle = appearance.bodyBgUrl 
    ? { backgroundImage: `url(${appearance.bodyBgUrl})`, backgroundSize: 'cover', backgroundAttachment: 'fixed' } 
    : {};

  return (
    <div 
      className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-red-100 selection:text-red-900 relative"
      style={bodyStyle}
    >
      {appearance.bodyBgUrl && (
        <div className="absolute inset-0 bg-white/90 pointer-events-none z-0"></div>
      )}

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Sticky Header Navbar */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          openAuthModal={() => {
            setAuthModalOpen(true);
          }}
          onOpenStaffAuth={() => {
            setStaffAuthModalOpen(true);
          }}
          onSelectAdminSubTab={handleSelectAdminSubTab}
          onOpenFinancialReport={() => setFinancialReportModalOpen(true)}
          onOpenProfile={() => setProfileModalOpen(true)}
          onOpenUpgrade={() => setUpgradeModalOpen(true)}
          onOpenInbox={() => setInboxModalOpen(true)}
          onOpenOrderHistory={() => setOrderHistoryModalOpen(true)}
          onOpenPointModal={() => setPointModalOpen(true)}
        />

        {/* Main Views Container */}
        <main className="flex-1">
          {activeTab === 'home' && (
            <div>
              {/* Notifikasi Email Login & Tanda Akun Email yang Dipakai */}
              <StaffHomeNotification
                onOpenAdmin={(subTab) => {
                  if (subTab) setAdminSubTab(subTab);
                  setActiveTab('admin');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />

              {/* Carousel / Slider Banner Bergerak (Di bawah Header Background) */}
              <HeroCarousel
                onOpenCatalog={() => {
                  setActiveTab('catalog');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />

              <HeroSection
                onOpenCatalog={() => {
                  setActiveTab('catalog');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onOpenCart={() => {
                  setActiveTab('cart');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onOpenAuth={() => setAuthModalOpen(true)}
                onOpenAdmin={() => {
                  setActiveTab('admin');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
              <CompanyProfile />
            </div>
          )}

          {activeTab === 'catalog' && (
            <ProductCatalog
              onBackToHome={() => {
                setActiveTab('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenCart={() => {
                setActiveTab('cart');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onEditProductInAdmin={handleEditProductFromCatalog}
              onOpenAuth={() => setAuthModalOpen(true)}
            />
          )}

          {activeTab === 'cart' && (
            <CartView
              onBackToCatalog={() => {
                setActiveTab('catalog');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenAuth={() => setAuthModalOpen(true)}
              onOpenOrderHistory={() => setOrderHistoryModalOpen(true)}
            />
          )}

          {activeTab === 'member' && (
            <MemberView
              onOpenCatalog={() => {
                setActiveTab('catalog');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenAuth={() => setAuthModalOpen(true)}
              onOpenUpgrade={() => setUpgradeModalOpen(true)}
              onOpenProfile={() => setProfileModalOpen(true)}
            />
          )}

          {activeTab === 'admin' && (
            <AdminPanel
              initialEditProduct={productToEditInAdmin}
              initialSubTab={adminSubTab}
              onClearInitialEdit={() => setProductToEditInAdmin(null)}
            />
          )}
        </main>

        {/* Floating Cart Button */}
        {totalItems > 0 && activeTab !== 'cart' && (
          <button
            onClick={() => {
              setActiveTab('cart');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="fixed bottom-6 right-6 z-40 px-5 py-3.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-black text-sm flex items-center gap-2.5 shadow-xl shadow-red-950/30 hover:scale-105 active:scale-95 transition-all"
          >
            <ShoppingCart className="w-5 h-5" />
            <span>Lihat Keranjang ({totalItems})</span>
          </button>
        )}

        {/* Modals */}
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
        />

        <StaffAuthModal
          isOpen={staffAuthModalOpen}
          onClose={() => setStaffAuthModalOpen(false)}
        />

        <FinancialReportModal
          isOpen={financialReportModalOpen}
          onClose={() => setFinancialReportModalOpen(false)}
        />

        <ProfileModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          onOpenUpgrade={() => setUpgradeModalOpen(true)}
        />

        <UpgradeModal
          isOpen={upgradeModalOpen}
          onClose={() => setUpgradeModalOpen(false)}
        />

        {/* 📩 Modal Kotak Pesan Pelanggan & Anggota */}
        <InboxModal
          isOpen={inboxModalOpen}
          onClose={() => setInboxModalOpen(false)}
          onOpenAuth={() => {
            setInboxModalOpen(false);
            setAuthModalOpen(true);
          }}
          onNavigateTab={(tab) => {
            setActiveTab(tab);
            setInboxModalOpen(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />

        {/* 📋 Modal Riwayat Pesanan Website */}
        <OrderHistoryModal
          isOpen={orderHistoryModalOpen}
          onClose={() => setOrderHistoryModalOpen(false)}
          onOpenCatalog={() => {
            setActiveTab('catalog');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />

        {/* ⭐ Modal Point Pembelian & Penukaran Reward */}
        <PointModal
          isOpen={pointModalOpen}
          onClose={() => setPointModalOpen(false)}
          onOpenCatalog={() => {
            setActiveTab('catalog');
            setPointModalOpen(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />

        {/* 🔔 Toast Animasi Pojok Kanan Atas Promo Bundling & Bonus Gratis */}
        <PromoToastContainer
          onViewCart={() => {
            setActiveTab('cart');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />

        {/* Footer */}
        <Footer
          onOpenCatalog={() => {
            setActiveTab('catalog');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenCart={() => {
            setActiveTab('cart');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenAdmin={() => {
            setActiveTab('admin');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />

        {/* Fitur Audio Sambutan Wanita & Backsound Loop Legal */}
        <AudioWelcomeManager />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SiteConfigProvider>
        <AnalyticsProvider>
          <InboxProvider>
            <PointProvider>
              <OrderProvider>
                <ReviewLoveProvider>
                  <CartProvider>
                    <MainContent />
                  </CartProvider>
                </ReviewLoveProvider>
              </OrderProvider>
            </PointProvider>
          </InboxProvider>
        </AnalyticsProvider>
      </SiteConfigProvider>
    </AuthProvider>
  );
}
