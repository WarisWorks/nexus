'use client';

import { useEffect, useRef } from 'react';

export default function CustomCursor() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!matchMedia('(pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let x = -100, y = -100, tx = x, ty = y, frame = 0;
    const move = (e: PointerEvent) => {
      tx = e.clientX; ty = e.clientY;
      const target = e.target as HTMLElement;
      const mode = target.closest<HTMLElement>('[data-cursor]')?.dataset.cursor || '';
      if (ref.current) { ref.current.dataset.mode = mode; ref.current.textContent = mode; ref.current.style.opacity = '1'; }
    };
    const leave = () => { if (ref.current) ref.current.style.opacity = '0'; };
    const tick = () => { x += (tx - x) * .18; y += (ty - y) * .18; if (ref.current) ref.current.style.transform = `translate3d(${x}px,${y}px,0)`; frame = requestAnimationFrame(tick); };
    window.addEventListener('pointermove', move); document.addEventListener('pointerleave', leave); tick();
    return () => { cancelAnimationFrame(frame); window.removeEventListener('pointermove', move); document.removeEventListener('pointerleave', leave); };
  }, []);
  return <div className="custom-cursor" ref={ref} aria-hidden="true" />;
}
