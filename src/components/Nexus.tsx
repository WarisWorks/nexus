'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, Minus, Plus, RotateCcw, Settings2, Volume2, VolumeX, X } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { artifacts, chapters, type JourneyState } from '@/lib/journey';
import CustomCursor from './ui/CustomCursor';
import MagneticButton from './ui/MagneticButton';

const Experience = dynamic(() => import('./canvas/Experience'), { ssr: false });
gsap.registerPlugin(ScrollTrigger);

export default function Nexus() {
  const journey = useRef<JourneyState>({ current: 0, local: 0, reduced: false, hidden: false });
  const lenis = useRef<Lenis | null>(null);
  const [chapter, setChapter] = useState(0);
  const [ready, setReady] = useState(false);
  const [load, setLoad] = useState(0);
  const [failure, setFailure] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [burst, setBurst] = useState(0);
  const [quality, setQuality] = useState<'high' | 'low'>('high');
  const [reduced, setReduced] = useState(false);
  const [settings, setSettings] = useState(false);
  const [about, setAbout] = useState(false);
  const [sound, setSound] = useState(false);
  const [inspected, setInspected] = useState<string | null>(null);
  const [worldZoom, setWorldZoom] = useState(0);
  const [worldReset, setWorldReset] = useState(0);
  const audio = useRef<AudioContext | null>(null);
  const soundEnabled = useRef(false);
  const main = useRef<HTMLElement>(null);

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(media.matches); journey.current.reduced = media.matches;
    if (innerWidth < 768 || navigator.hardwareConcurrency < 5) setQuality('low');
    const change = () => { setReduced(media.matches); journey.current.reduced = media.matches; };
    const visibility = () => { journey.current.hidden = document.hidden; if (document.hidden && audio.current?.state === 'running') void audio.current.suspend(); else if (!document.hidden && audio.current?.state === 'suspended' && soundEnabled.current) void audio.current.resume(); };
    media.addEventListener('change', change); document.addEventListener('visibilitychange', visibility);
    return () => { media.removeEventListener('change', change); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  useEffect(()=>{soundEnabled.current=sound;},[sound]);

  useEffect(() => {
    journey.current.reduced = reduced;
    const smooth = new Lenis({ duration: reduced ? 0 : 1.15, smoothWheel: !reduced, anchors: true, stopInertiaOnNavigate: true });
    lenis.current = smooth;
    smooth.on('scroll', ScrollTrigger.update);
    const ticker = (time: number) => smooth.raf(time * 1000);
    gsap.ticker.add(ticker);
    gsap.ticker.lagSmoothing(0);
    const ctx = gsap.context(() => {
      document.querySelectorAll<HTMLElement>('.journey-section').forEach((element, i) => {
        ScrollTrigger.create({ trigger: element, start: 'top top', end: i===5?'bottom bottom':'bottom top',
          onUpdate: self => { if (self.isActive || (i===5 && self.progress===1)) { journey.current.current = i; journey.current.local = self.progress; setChapter(i); } },
          onEnter: () => { journey.current.current = i; journey.current.local = 0; setChapter(i); },
          onEnterBack: () => { journey.current.current = i; journey.current.local = .99; setChapter(i); },
        });
        if (!reduced) gsap.fromTo(element.querySelectorAll('.reveal'), { y: 45, opacity: .12 }, { y: 0, opacity: 1, duration: 1, stagger: .1, scrollTrigger: {trigger:element,start:'top 72%',toggleActions:'play none none reverse'} });
      });
      ScrollTrigger.refresh();
    }, main);
    return () => { ctx.revert(); gsap.ticker.remove(ticker); smooth.destroy(); lenis.current = null; };
  }, [reduced]);

  useEffect(() => { const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { setSelected(null); setSettings(false); setAbout(false); setInspected(null); } }; window.addEventListener('keydown',escape); return () => window.removeEventListener('keydown',escape); }, []);
  useEffect(() => () => { if (audio.current) void audio.current.close(); }, []);
  useEffect(() => {
    if (!about) return;
    lenis.current?.stop();
    const trap=(event:KeyboardEvent)=>{
      if(event.key!=='Tab')return;
      const buttons=document.querySelectorAll<HTMLButtonElement>('.about-dialog button');
      const first=buttons[0],last=buttons[buttons.length-1];
      if(event.shiftKey && document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus();}
    };
    document.addEventListener('keydown',trap);
    return()=>{document.removeEventListener('keydown',trap);lenis.current?.start();};
  },[about]);

  const go = useCallback((index: number) => {
    setSelected(null); setAbout(false);
    const target = document.getElementById(chapters[index].id);
    if (!target) return;
    const destination=target.getBoundingClientRect().top+window.scrollY+(index===0?0:2);
    if (lenis.current) lenis.current.scrollTo(destination, { duration: reduced ? 0 : 1.8 });
    else target.scrollIntoView({behavior:reduced?'instant':'smooth'});
  }, [reduced]);
  const select = useCallback((index: number) => { setSelected(index); setBurst(b => b + 1); }, []);
  const onReady = useCallback(() => { setLoad(100); setReady(true); }, []);
  const onFailure = useCallback(() => { setFailure(true); setReady(true); }, []);
  const toggleSound = async () => {
    if (!audio.current) {
      const context = new AudioContext(); const gain = context.createGain(); gain.gain.value = .022; gain.connect(context.destination);
      [55,82.41,110.2].forEach((frequency,i) => { const oscillator = context.createOscillator(); oscillator.type='sine'; oscillator.frequency.value=frequency; const volume=context.createGain(); volume.gain.value=i===0?.6:.2; oscillator.connect(volume); volume.connect(gain); oscillator.start(); });
      audio.current=context;
    }
    if (sound) await audio.current.suspend(); else await audio.current.resume();
    setSound(!sound);
  };

  return <div className={`nexus ${ready ? 'is-ready' : ''}`}>
    <a className="skip-link" href="#dimension">Skip to the experience</a>
    <div className="canvas-shell" data-cursor={chapter===4?'DRAG':'EXPLORE'}>
      <Experience journey={journey} quality={quality} reducedMotion={reduced} selected={selected} burst={burst} worldZoom={worldZoom} worldReset={worldReset} onSelect={select} onInspect={setInspected} onReady={onReady} onProgress={setLoad} onFailure={onFailure} />
    </div>
    <div className="film-grain" aria-hidden="true" />
    <div className="vignette" aria-hidden="true" />
    <AnimatePresence>{!ready && <motion.div className="loading-screen" exit={{opacity:0,filter:'blur(12px)'}} transition={{duration:.8}}>
      <span className="loading-word">NEXUS<span>®</span></span><div className="loading-bottom"><span>INITIALIZING EXPERIENCE</span><span>{Math.round(load)}%</span></div><progress aria-label="Loading 3D experience" value={load} max={100}/>
    </motion.div>}</AnimatePresence>

    <header className="navigation">
      <button className="wordmark" onClick={()=>go(0)} aria-label="Nexus home">NEXUS<span>®</span></button>
      <nav aria-label="Main navigation"><button onClick={()=>go(1)} className={chapter===1?'active':''}>Experience</button><button onClick={()=>go(2)} className={chapter===2?'active':''}>The collection</button><button onClick={()=>setAbout(true)}>About <ArrowUpRight size={12}/></button></nav>
      <button className="nav-enter" onClick={()=>go(1)}>Enter the dimension <ArrowUpRight size={15}/></button>
    </header>

    <aside className="chapter-rail" aria-label="Journey chapters">{chapters.map((item,i)=><button key={item.id} onClick={()=>go(i)} aria-label={`Chapter ${i+1}: ${item.title}`} aria-current={chapter===i?'step':undefined}><span className="rail-label">{item.label}</span><span className="rail-line"/></button>)}</aside>

    <main ref={main}>
      <section id="awakening" className="journey-section hero" aria-labelledby="hero-title">
        <div className="hero-ghost" aria-hidden="true">NEXUS</div>
        <div className="hero-copy">
          <div className="eyebrow reveal"><span className="live-dot"/> AN EXPLORATION OF WHAT COMES NEXT</div>
          <h1 id="hero-title" className="reveal">BEYOND THE<br/><span>INTERFACE.</span></h1>
          <p className="reveal">A new dimension of digital experience.<br/>An extraordinary world. Waiting for you.</p>
          <div className="reveal hero-actions"><MagneticButton className="button-primary" onClick={()=>go(1)}>Explore the experience <ArrowUpRight size={17}/></MagneticButton><button className="circle-button" onClick={()=>go(2)} aria-label="Explore the collection"><ArrowDown size={18}/></button></div>
        </div>
        <div className="object-annotation"><span className="annotation-cross">+</span><span>NXS—001<br/><strong>THE AWAKENING</strong></span></div>
        <div className="hero-coordinate" aria-hidden="true">[ FORM WITHOUT LIMITS ]</div>
        <div className="hero-bottom"><div className="chapter-name"><span>01 / 06</span> THE AWAKENING</div><div className="hero-instruction"><span>SCROLL TO DISCOVER</span><ArrowDown size={14}/></div><span className="hero-edition">INDEPENDENT DIGITAL EXPLORATION</span></div>
      </section>

      <section id="dimension" className="journey-section dimension" aria-labelledby="dimension-title">
        <div className="section-copy"><span className="section-index reveal">02 — ENTER THE DIMENSION</span><h2 id="dimension-title" className="reveal">The other side<br/>of <em>possible.</em></h2><p className="reveal">Leave the familiar behind. An architecture of light, suspended between the physical and the imagined.</p><MagneticButton className="text-button reveal" onClick={()=>go(2)}>Discover the artifacts <ArrowRight size={18}/></MagneticButton></div>
        <div className="scene-note"><span className="note-line"/> MOVE YOUR POINTER. CHANGE YOUR PERSPECTIVE.</div>
      </section>

      <section id="artifacts" className="journey-section gallery" aria-labelledby="gallery-title">
        <div className="gallery-heading"><span className="section-index reveal">03 — THE COLLECTION</span><h2 id="gallery-title" className="reveal">Objects of <em>possibility.</em></h2><p className="reveal">Four experiments. Infinite ways to interact.</p></div>
        <div className="artifact-selectors">{artifacts.map((item,i)=><button key={item.name} className={`artifact-selector ${selected===i?'selected':''}`} onClick={()=>select(i)} data-cursor="VIEW" aria-pressed={selected===i}><span className="artifact-number">0{i+1}<ArrowUpRight size={15}/></span><strong>{item.name}</strong><span className="artifact-category">{item.category}</span></button>)}</div>
        <AnimatePresence>{selected!==null && <motion.aside className="artifact-panel" aria-label={`${artifacts[selected].name} details`} initial={{opacity:0,x:30}} animate={{opacity:1,x:0}} exit={{opacity:0,x:30}}><button className="panel-close" onClick={()=>setSelected(null)} aria-label="Close artifact details"><X size={18}/></button><span className="section-index">ARTIFACT 0{selected+1}</span><h3>{artifacts[selected].name}</h3><p>{artifacts[selected].text}</p><p className="interaction-tip">{artifacts[selected].action}</p><div className="panel-controls"><button className="text-button" onClick={()=>select(selected)}>{selected===2?'Disperse & reform':selected===3?'Orbit the core':'Activate form'}<RotateCcw size={15}/></button><button className="circle-button" aria-label="Previous artifact" onClick={()=>select((selected+3)%4)}><ChevronLeft size={16}/></button><button className="circle-button" aria-label="Next artifact" onClick={()=>select((selected+1)%4)}><ChevronRight size={16}/></button></div></motion.aside>}</AnimatePresence>
      </section>

      <section id="transformation" className="journey-section transformation" aria-labelledby="transformation-title">
        <div className="transformation-sticky"><div className="section-copy"><span className="section-index reveal">04 — METAMORPHOSIS</span><h2 id="transformation-title" className="reveal">Nothing stays<br/>the <em>same.</em></h2><p className="reveal">Form becomes fragments. Fragments become a field. Out of the chaos, something entirely new emerges.</p><span className="quiet-instruction reveal">Scroll forward to transform. Reverse to reconstruct.</span></div><TransformationStages journey={journey}/></div>
      </section>

      <section id="world" className="journey-section world" aria-labelledby="world-title">
        <div className="section-copy"><span className="section-index reveal">05 — THE MICRO UNIVERSE</span><h2 id="world-title" className="reveal">A world<br/><em>within.</em></h2><p className="reveal">A place that exists only here. Turn it around. Get a little closer. Find your own point of view.</p><span className="quiet-instruction reveal">Drag to rotate · Select a structure to inspect</span></div>
        <div className="world-controls" aria-label="World camera controls"><button aria-label="Zoom out" disabled={worldZoom<=-2} onClick={()=>setWorldZoom(v=>Math.max(-2,v-1))}><Minus size={17}/></button><span>EXPLORE</span><button aria-label="Zoom in" disabled={worldZoom>=3} onClick={()=>setWorldZoom(v=>Math.min(3,v+1))}><Plus size={17}/></button><i/><button aria-label="Reset world camera" onClick={()=>{setWorldZoom(0);setWorldReset(v=>v+1);setInspected(null);}}><RotateCcw size={16}/></button></div>
        {inspected && <div className="world-inspection" role="status"><span className="live-dot"/><div><strong>{inspected}</strong><span>STRUCTURE SELECTED · DRAG TO CHANGE PERSPECTIVE</span></div><button aria-label="Close structure information" onClick={()=>setInspected(null)}><X size={15}/></button></div>}
      </section>

      <section id="portal" className="journey-section portal" aria-labelledby="portal-title">
        <div className="portal-copy"><span className="section-index reveal">06 — THE FINAL PORTAL</span><h2 id="portal-title" className="reveal">THE FUTURE IS<br/><em>INTERACTIVE.</em></h2><p className="reveal">NOTHING IS STATIC.</p><MagneticButton className="button-primary reveal" onClick={()=>go(0)}>Enter again <ArrowUpRight size={17}/></MagneticButton></div><footer><button className="wordmark" onClick={()=>go(0)}>NEXUS<span>®</span></button><span>BEYOND THE INTERFACE.</span><button className="text-button" onClick={()=>setAbout(true)}>About this experience <ArrowUpRight size={13}/></button></footer>
      </section>
    </main>

    <div className="utility-bar"><button onClick={toggleSound} aria-label={sound?'Mute ambient sound':'Enable ambient sound'}>{sound?<Volume2 size={14}/>:<VolumeX size={14}/>}<span>SOUND {sound?'ON':'OFF'}</span></button><span className="utility-divider"/><button aria-label="Experience settings" aria-expanded={settings} onClick={()=>setSettings(!settings)}><Settings2 size={15}/></button></div>
    <div className="live-status"><span className="live-dot"/>{failure?'WEBGL UNAVAILABLE':'LIVE 3D EXPERIENCE'}</div>
    <AnimatePresence>{settings && <motion.div className="settings-panel" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:10}}><div className="settings-title">EXPERIENCE SETTINGS<button onClick={()=>setSettings(false)} aria-label="Close settings"><X size={16}/></button></div><div className="setting-row"><span>Rendering quality</span><div><button aria-pressed={quality==='low'} onClick={()=>setQuality('low')}>Balanced</button><button aria-pressed={quality==='high'} onClick={()=>setQuality('high')}>High</button></div></div><button className="setting-row motion-setting" aria-pressed={reduced} onClick={()=>setReduced(!reduced)}><span>Reduce motion</span><span className={reduced?'toggle checked':'toggle'}>{reduced&&<Check size={12}/>}</span></button><p>Balanced mode reduces pixel density and postprocessing. All six environments remain interactive.</p></motion.div>}</AnimatePresence>
    <AnimatePresence>{about && <motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setAbout(false)}><motion.div className="about-dialog" role="dialog" aria-modal="true" aria-labelledby="about-title" initial={{y:20}} animate={{y:0}} onClick={e=>e.stopPropagation()}><button autoFocus className="panel-close" onClick={()=>setAbout(false)} aria-label="Close about"><X size={20}/></button><span className="section-index">AN INDEPENDENT DIGITAL EXPLORATION</span><h2 id="about-title">Beyond<br/>the interface.</h2><p>NEXUS is an interactive art installation in your browser. Six connected environments explore how light, material, and movement can become an experience.</p><p>Every object is rendered live in 3D. Move your pointer, select the artifacts, drag the world, and let scrolling change its form.</p><MagneticButton className="button-primary" onClick={()=>go(0)}>Start the journey <ArrowUpRight size={16}/></MagneticButton></motion.div></motion.div>}</AnimatePresence>
    {failure && <div className="webgl-notice" role="status">Your browser couldn’t start the 3D renderer. You can still explore the chapters. Enable hardware acceleration and reload for the full experience.<button onClick={()=>location.reload()}>Retry <RotateCcw size={13}/></button></div>}
    <CustomCursor/>
  </div>;
}

function TransformationStages({journey}:{journey:React.RefObject<JourneyState>}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(()=>{ let frame=0; const update=()=>{const p=journey.current.current===3?Math.min(1,journey.current.local/.46):0; const stage=Math.min(4,Math.floor(p*5)); ref.current?.querySelectorAll<HTMLElement>('span').forEach((el,i)=>{el.dataset.active=String(i===stage);});frame=requestAnimationFrame(update);};update();return()=>cancelAnimationFrame(frame);},[journey]);
  return <div className="transformation-stages" ref={ref}>{['Solid','Fragmentation','Particle field','Reconstruction','New form'].map((s,i)=><span key={s} data-active={i===0}><b>0{i+1}</b>{s}</span>)}</div>;
}
