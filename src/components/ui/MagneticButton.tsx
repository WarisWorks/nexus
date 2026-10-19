'use client';
import { useRef, type ButtonHTMLAttributes } from 'react';

export default function MagneticButton({children,className = '',...props}:ButtonHTMLAttributes<HTMLButtonElement>) {
  const ref = useRef<HTMLButtonElement>(null);
  return <button {...props} ref={ref} className={`magnetic ${className}`} data-cursor=""
    onPointerMove={e => { if (e.pointerType !== 'mouse' || matchMedia('(prefers-reduced-motion: reduce)').matches) return; const r = e.currentTarget.getBoundingClientRect(); if (ref.current) ref.current.style.transform = `translate(${(e.clientX-r.left-r.width/2)*.12}px,${(e.clientY-r.top-r.height/2)*.15}px)`; }}
    onPointerLeave={() => { if (ref.current) ref.current.style.transform = ''; }}>{children}</button>;
}
