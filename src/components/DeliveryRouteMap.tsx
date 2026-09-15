import React, { useState, useMemo } from 'react';
import { 
  MapPin, 
  Navigation, 
  ExternalLink, 
  Info, 
  Compass, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Minus,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { CustomerOrder, ShippingLocation } from '../types';
import { 
  formatDistanceDescription, 
  getStraightLineGpsDistanceKm, 
  estimateRoadDistanceKm 
} from '../services/deliveryOptimizationService';

interface DeliveryRouteMapProps {
  origin: ShippingLocation;
  orders: CustomerOrder[];
  routeOrders: CustomerOrder[];
  anchorOrderId: string | null;
  onSelectAnchor: (orderId: string) => void;
  onToggleRouteOrder: (order: CustomerOrder) => void;
  onOpenGoogleMapsRoute: () => void;
}

export const DeliveryRouteMap: React.FC<DeliveryRouteMapProps> = ({
  origin,
  orders,
  routeOrders,
  anchorOrderId,
  onSelectAnchor,
  onToggleRouteOrder,
  onOpenGoogleMapsRoute,
}) => {
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Calculate bounding box of coordinates to scale onto SVG canvas
  const { minLat, maxLat, minLng, maxLng } = useMemo(() => {
    const allCoords = [
      { lat: origin.lat, lng: origin.lng },
      ...orders.map((o) => o.deliveryCoords || { lat: origin.lat, lng: origin.lng }),
    ];

    let minLa = Infinity;
    let maxLa = -Infinity;
    let minLn = Infinity;
    let maxLn = -Infinity;

    allCoords.forEach((c) => {
      if (c.lat < minLa) minLa = c.lat;
      if (c.lat > maxLa) maxLa = c.lat;
      if (c.lng < minLn) minLn = c.lng;
      if (c.lng > maxLn) maxLn = c.lng;
    });

    // Add padding to bounds
    const latSpan = Math.max(0.02, maxLa - minLa);
    const lngSpan = Math.max(0.02, maxLn - minLn);

    return {
      minLat: minLa - latSpan * 0.15,
      maxLat: maxLa + latSpan * 0.15,
      minLng: minLn - lngSpan * 0.15,
      maxLng: maxLn + lngSpan * 0.15,
    };
  }, [origin, orders]);

  // Project lat/lng to SVG viewBox (800 x 500)
  const project = (lat: number, lng: number) => {
    const x = ((lng - minLng) / (maxLng - minLng)) * 740 + 30;
    // Invert Y because latitude goes up from south to north, but SVG Y goes down
    const y = 470 - ((lat - minLat) / (maxLat - minLat)) * 440;
    return { x: Math.max(20, Math.min(780, x)), y: Math.max(20, Math.min(480, y)) };
  };

  const originPt = project(origin.lat, origin.lng);

  // Projected points for route line
  const routePoints = useMemo(() => {
    const pts = [originPt];
    routeOrders.forEach((o) => {
      const c = o.deliveryCoords || { lat: origin.lat, lng: origin.lng };
      pts.push(project(c.lat, c.lng));
    });
    return pts;
  }, [originPt, routeOrders, minLat, maxLat, minLng, maxLng]);

  // SVG polyline points string
  const routePolyline = routePoints.map((p) => `${p.x},${p.y}`).join(' ');

  const selectedOrder = orders.find((o) => o.id === selectedPinId);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              Peta Pengiriman & Rute Berbasis GPS
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                {orders.length} Pesanan di Peta
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Visualisasi koordinat satelit GPS, titik tujuan, dan alur rute pengiriman
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.2))}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
              title="Perkecil"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold px-2 text-slate-600">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.6, z + 0.2))}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
              title="Perbesar"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {routeOrders.length > 0 && (
            <button
              onClick={onOpenGoogleMapsRoute}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Buka Rute di Google Maps ({routeOrders.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* SVG Canvas Stage */}
      <div className="relative bg-slate-900 overflow-hidden" style={{ minHeight: '380px' }}>
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, #94a3b8 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        <div 
          className="w-full h-full flex items-center justify-center p-2 transition-transform duration-200"
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
        >
          <svg
            viewBox="0 0 800 500"
            className="w-full h-auto max-h-[460px] select-none"
            style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}
          >
            <defs>
              {/* Animated glow marker */}
              <radialGradient id="kopdesGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="anchorGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </radialGradient>
              <filter id="shadow">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.5" />
              </filter>
            </defs>

            {/* Connecting Route Lines */}
            {routePoints.length > 1 && (
              <>
                {/* Background path glow */}
                <polyline
                  points={routePolyline}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="8"
                  strokeOpacity="0.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Dashed directional route path */}
                <polyline
                  points={routePolyline}
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth="3"
                  strokeDasharray="6,4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {/* Other orders dashed lines to anchor if anchor is active */}
            {anchorOrderId && (() => {
              const anchor = orders.find((o) => o.id === anchorOrderId);
              if (!anchor) return null;
              const aPt = project(anchor.deliveryCoords?.lat || origin.lat, anchor.deliveryCoords?.lng || origin.lng);
              return (
                <g opacity="0.4">
                  {orders.filter((o) => o.id !== anchorOrderId).map((o) => {
                    const oPt = project(o.deliveryCoords?.lat || origin.lat, o.deliveryCoords?.lng || origin.lng);
                    return (
                      <line
                        key={`anchor_line_${o.id}`}
                        x1={aPt.x}
                        y1={aPt.y}
                        x2={oPt.x}
                        y2={oPt.y}
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                        strokeDasharray="3,3"
                      />
                    );
                  })}
                </g>
              );
            })()}

            {/* 🔵 KOPDES ORIGIN PIN */}
            <g transform={`translate(${originPt.x}, ${originPt.y})`} className="cursor-pointer">
              <circle r="22" fill="url(#kopdesGlow)" className="animate-pulse" />
              <circle r="12" fill="#2563eb" stroke="#ffffff" strokeWidth="2.5" filter="url(#shadow)" />
              <text textAnchor="middle" y="4" fill="#ffffff" fontSize="10" fontWeight="bold">
                HQ
              </text>
              <rect x="-60" y="-36" width="120" height="20" rx="4" fill="#1e293b" fillOpacity="0.9" />
              <text textAnchor="middle" y="-22" fill="#93c5fd" fontSize="9" fontWeight="bold">
                🔵 Lokasi Kopdes (Pusat)
              </text>
            </g>

            {/* 📍 ORDER PINS */}
            {orders.map((order) => {
              const coords = order.deliveryCoords || { lat: origin.lat, lng: origin.lng };
              const pt = project(coords.lat, coords.lng);
              const isSelected = selectedPinId === order.id;
              const isAnchor = anchorOrderId === order.id;
              const routeIndex = routeOrders.findIndex((ro) => ro.id === order.id);
              const isInRoute = routeIndex >= 0;

              // Color determination
              let pinBg = '#64748b'; // default slate
              if (isAnchor) pinBg = '#f59e0b'; // amber
              else if (isInRoute) pinBg = '#10b981'; // emerald in route
              else if (order.deliveryStatus === 'Siap Dikirim') pinBg = '#3b82f6'; // blue
              else if (order.deliveryStatus === 'Dalam Perjalanan') pinBg = '#8b5cf6'; // purple

              return (
                <g
                  key={order.id}
                  transform={`translate(${pt.x}, ${pt.y})`}
                  className="cursor-pointer transition-transform hover:scale-125"
                  onClick={() => setSelectedPinId(order.id)}
                >
                  {isAnchor && <circle r="24" fill="url(#anchorGlow)" className="animate-pulse" />}
                  
                  {/* Pin circle */}
                  <circle
                    r={isSelected ? '15' : '11'}
                    fill={pinBg}
                    stroke="#ffffff"
                    strokeWidth={isSelected ? '3' : '2'}
                    filter="url(#shadow)"
                  />

                  {/* Pin Label / Sequence Number */}
                  <text
                    textAnchor="middle"
                    y="4"
                    fill="#ffffff"
                    fontSize={isInRoute ? '10' : '8'}
                    fontWeight="bold"
                  >
                    {isInRoute ? `#${routeIndex + 1}` : '📍'}
                  </text>

                  {/* Order Number Tag */}
                  <rect
                    x="-40"
                    y={isSelected ? '-38' : '-28'}
                    width="80"
                    height="16"
                    rx="3"
                    fill="#0f172a"
                    fillOpacity="0.85"
                  />
                  <text
                    textAnchor="middle"
                    y={isSelected ? '-26' : '-17'}
                    fill={isAnchor ? '#fde68a' : '#e2e8f0'}
                    fontSize="8"
                    fontWeight="bold"
                  >
                    {isAnchor ? `★ ${order.orderNumber}` : order.orderNumber}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend Overlay */}
        <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-xs text-white border border-slate-700/60 rounded-xl p-2.5 text-[11px] shadow-lg flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-600 border border-white"></span>
            <span className="text-slate-300">🔵 Lokasi Kopdes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 border border-white"></span>
            <span className="text-slate-300">📍 Titik Utama</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white"></span>
            <span className="text-slate-300">🚚 Masuk Rute</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-slate-500 border border-white"></span>
            <span className="text-slate-300">📦 Pesanan Aktif</span>
          </div>
        </div>
      </div>

      {/* Selected Order Detail Modal / Bottom Drawer */}
      {selectedOrder && (
        <div className="p-4 sm:p-5 bg-blue-50/50 border-t border-blue-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-black text-slate-900 text-sm">
                {selectedOrder.orderNumber}
              </span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                selectedOrder.customerRole === 'ANGGOTA' 
                  ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {selectedOrder.customerRole === 'ANGGOTA' ? '👥 Anggota' : '👤 Basic'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                {selectedOrder.deliveryStatus || 'Siap Dikirim'}
              </span>
              {anchorOrderId === selectedOrder.id && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-white flex items-center gap-1">
                  ★ Titik Utama
                </span>
              )}
            </div>

            <p className="text-xs text-slate-700 font-semibold">
              Penerima: <strong className="text-slate-900">{selectedOrder.customerName}</strong> ({selectedOrder.customerPhone})
            </p>
            <p className="text-xs text-slate-600">
              📍 {selectedOrder.shippingAddress}
            </p>
            {selectedOrder.landmarkNotes && (
              <p className="text-[11px] text-amber-800 font-medium">
                🏢 Patokan: {selectedOrder.landmarkNotes}
              </p>
            )}

            {/* Distance Info Breakdown */}
            {selectedOrder.deliveryCoords && (
              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-600">
                <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200 font-medium">
                  🌐 GPS Garis Lurus: <strong>{getStraightLineGpsDistanceKm(origin, selectedOrder.deliveryCoords)} km</strong>
                </span>
                <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200 font-medium">
                  🛣️ Est. Rute Jalan: <strong>{estimateRoadDistanceKm(getStraightLineGpsDistanceKm(origin, selectedOrder.deliveryCoords))} km</strong>
                </span>
                <span className="text-[10px] text-slate-400">
                  Koordinat: {selectedOrder.deliveryCoords.lat.toFixed(5)}, {selectedOrder.deliveryCoords.lng.toFixed(5)}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 self-stretch md:self-center">
            <button
              onClick={() => onSelectAnchor(selectedOrder.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                anchorOrderId === selectedOrder.id
                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                  : 'bg-white hover:bg-amber-50 text-amber-900 border border-amber-300'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{anchorOrderId === selectedOrder.id ? 'Titik Utama Terpilih' : 'Jadikan Titik Utama'}</span>
            </button>

            <button
              onClick={() => onToggleRouteOrder(selectedOrder)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                routeOrders.some((ro) => ro.id === selectedOrder.id)
                  ? 'bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>
                {routeOrders.some((ro) => ro.id === selectedOrder.id)
                  ? 'Keluarkan dari Rute'
                  : '➕ Tambahkan ke Rute'}
              </span>
            </button>

            <button
              onClick={() => setSelectedPinId(null)}
              className="px-2.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
              title="Tutup Detail"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Educational Distance Notice */}
      <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500">
        <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
        <p>
          <strong>Catatan Jarak Sistem:</strong> Jarak garis lurus satelit GPS dihitung secara matematis antar koordinat. Estimasi rute jalan memperhitungkan kelokan jalan perkotaan Jakarta. Untuk navigasi tercepat dengan pemantauan kondisi lalu lintas terkini, gunakan tombol <strong>Buka di Google Maps</strong>.
        </p>
      </div>
    </div>
  );
};
