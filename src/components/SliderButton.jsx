import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { ArrowRight, ChevronRight } from 'lucide-react';

const SliderButton = ({ onComplete, text = "Slide to Book", maxWidth = "350px", height = "70px" }) => {
  const [isCompleted, setIsCompleted] = useState(false);
  const containerRef = useRef(null);
  const x = useMotionValue(0);
  const [dragRange, setDragRange] = useState(280);

  useEffect(() => {
    if (containerRef.current) {
      setDragRange(containerRef.current.offsetWidth - (parseInt(height) * 0.85 + 10));
    }
  }, [height]);
  
  // Progress from 0 to 1 based on x pos
  const opacity = useTransform(x, [0, 100], [1, 0]);
  const fillWidth = useTransform(x, (value) => value + (parseInt(height) * 0.85)); 

  const handleDragEnd = () => {
    const currentX = x.get();
    const width = containerRef.current.offsetWidth - (parseInt(height) * 0.85 + 10);
    
    if (currentX >= width * 0.8) {
      x.set(width);
      setIsCompleted(true);
      setTimeout(() => { if (onComplete) onComplete(); }, 400);
    } else {
      x.set(0);
    }
  };

  const thumbSize = parseInt(height) * 0.85;

  return (
    <div 
      ref={containerRef}
      style={{
        width: '100%',
        maxWidth: maxWidth,
        height: height,
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '100px',
        padding: '5px',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        cursor: 'pointer'
      }}
    >
      {/* Dynamic Gradient Fill */}
      <motion.div 
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: fillWidth,
          background: 'linear-gradient(90deg, var(--primary) -20%, transparent 100%)',
          opacity: 0.3,
          zIndex: 0,
          pointerEvents: 'none'
        }}
      />

      <motion.div 
        style={{ 
          opacity, 
          position: 'absolute', 
          width: '100%', 
          textAlign: 'center', 
          fontWeight: '700', 
          fontSize: parseInt(height) < 50 ? '0.65rem' : '0.85rem',
          color: 'var(--text-muted)',
          pointerEvents: 'none',
          left: 0,
          zIndex: 1,
          letterSpacing: '1px',
          paddingLeft: '1.5rem'
        }}
      >
        {text}
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: dragRange }}
        dragElastic={0}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        whileTap={{ scale: 0.95 }}
        animate={!isCompleted ? { x: [0, 5, 0] } : {}}
        transition={!isCompleted ? { repeat: Infinity, duration: 1.5, ease: "easeInOut" } : {}}
        className="slider-thumb"
        style={{
          width: `${thumbSize}px`,
          height: `${thumbSize}px`,
          background: 'var(--primary)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 15px rgba(59, 130, 246, 0.5)',
          zIndex: 3,
          x
        }}
      >
        <ChevronRight color="white" size={parseInt(height) < 50 ? 20 : 32} strokeWidth={3} />
      </motion.div>
    </div>
  );
};


export default SliderButton;
