import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';

// Mirrors Flutter's _PromoCarousel: auto-sliding gradient cards with dot
// indicators. Flutter's slides are admin-managed via a settings provider
// that doesn't exist in React yet, so these are static/hardcoded — same
// visual result, no backend dependency.
const DEFAULT_SLIDES = [
  {
    badge: 'AI ASSISTANT', title: 'Hiring the right\nprovider matters.',
    subtitle: 'AI tells you exactly what skills and experience to look for before you choose.',
    buttonText: 'Match Me', gradient: ['#ec4899', '#8b5cf6'],
  },
  {
    badge: 'FAST & RELIABLE', title: 'Get help in\nminutes, not days.',
    subtitle: 'Post a request and get bids from verified providers near you.',
    buttonText: 'Post Request', gradient: ['#3b82f6', '#1d4ed8'],
  },
  {
    badge: 'VERIFIED PROS', title: 'Every provider,\nbackground checked.',
    subtitle: 'Book with confidence — all providers are verified before they can bid.',
    buttonText: 'Browse Providers', gradient: ['#10b981', '#059669'],
  },
];

export const PromoCarousel = ({ slides = DEFAULT_SLIDES, onSlideClick }) => {
  const [page, setPage] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (slides.length < 2) return;
    timerRef.current = setInterval(() => {
      setPage((p) => (p + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timerRef.current);
  }, [slides.length]);

  if (!slides.length) return null;
  const slide = slides[page];

  return (
    <div>
      <div
        onClick={() => onSlideClick?.(slide)}
        style={{
          position: 'relative', overflow: 'hidden', cursor: onSlideClick ? 'pointer' : 'default',
          padding: '1.25rem', borderRadius: 24, minHeight: 190,
          background: `linear-gradient(135deg, ${slide.gradient[0]}, ${slide.gradient[1]})`,
          boxShadow: `0 10px 24px ${slide.gradient[1]}59`,
          display: 'flex', alignItems: 'flex-start', gap: 8,
        }}
      >
        <div style={{ position: 'absolute', right: -24, top: -34, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <div style={{ position: 'absolute', right: 20, bottom: -50, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

        <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 100, background: 'rgba(255,255,255,0.18)',
            fontSize: '0.62rem', fontWeight: 800, color: 'white', letterSpacing: 0.4,
          }}>
            ✨ {slide.badge}
          </span>
          <div style={{ fontSize: '1rem', fontWeight: 900, color: 'white', marginTop: 10, lineHeight: 1.2, whiteSpace: 'pre-line' }}>{slide.title}</div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.82)', marginTop: 5, lineHeight: 1.4, fontWeight: 500 }}>{slide.subtitle}</div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 11,
            padding: '8px 14px', borderRadius: 100, background: 'white',
            fontSize: '0.72rem', fontWeight: 800, color: slide.gradient[1],
            boxShadow: '0 3px 8px rgba(0,0,0,0.18)',
          }}>
            {slide.buttonText} <ArrowRight size={12} />
          </span>
        </div>

        <div style={{
          width: 50, height: 50, borderRadius: '50%', flexShrink: 0, position: 'relative', zIndex: 1,
          background: 'rgba(255,255,255,0.16)', border: '1.5px solid rgba(255,255,255,0.28)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ShieldCheck size={23} color="white" />
        </div>
      </div>

      {slides.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
          {slides.map((_, i) => (
            <span key={i} style={{
              width: i === page ? 18 : 6, height: 6, borderRadius: 100,
              background: i === page ? '#3B82F6' : 'rgba(255,255,255,0.08)',
              transition: 'width 0.25s',
            }} />
          ))}
        </div>
      )}
    </div>
  );
};
