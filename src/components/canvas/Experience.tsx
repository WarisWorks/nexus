'use client';

import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { AdaptiveDpr, Environment, Lightformer, PerformanceMonitor } from '@react-three/drei';
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Group, MathUtils, ShaderMaterial, Vector3 } from 'three';
import { MechanicalSphere } from '../objects/MechanicalSphere';
import { LiquidChrome } from '../objects/LiquidChrome';
import { GlassStructure } from '../objects/GlassStructure';
import { EnergyCore } from '../objects/EnergyCore';
import { TransformationScene } from '../scenes/TransformationScene';
import { WorldScene } from '../scenes/WorldScene';
import { DimensionEnvironment } from '../environments/DimensionEnvironment';
import { PortalEnvironment } from '../environments/PortalEnvironment';
import { SpaceParticles } from '../environments/SpaceParticles';
import { sceneSpacing, type JourneyState } from '@/lib/journey';

interface Props {
  journey: RefObject<JourneyState>; quality:'high'|'low'; reducedMotion:boolean;
  selected:number|null; burst:number; worldZoom:number; worldReset:number;
  onSelect:(index:number)=>void; onInspect:(name:string)=>void;
  onReady:()=>void; onProgress:(value:number)=>void; onFailure:()=>void;
}

class RendererBoundary extends Component<{children:ReactNode;onFailure:()=>void},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(){this.props.onFailure();}
  render(){return this.state.failed?null:this.props.children;}
}

export default function Experience(props:Props) {
  const [dpr,setDpr]=useState(1.5);
  useEffect(()=>props.onProgress(15),[props.onProgress]);
  return <RendererBoundary onFailure={props.onFailure}><Canvas
    dpr={props.quality==='low'?1:Math.min(dpr,1.65)} camera={{position:[0,0,8.5],fov:43,near:.1,far:95}}
    gl={{antialias:true,alpha:false,powerPreference:'high-performance',stencil:false}}
    fallback={<span>This experience requires a browser with WebGL support.</span>}
    onCreated={({gl})=>{gl.setClearColor('#08090b');props.onProgress(65);}}
    eventPrefix="client"
    aria-label="Interactive NEXUS 3D universe. Explore six chapters by scrolling."
  >
    <Suspense fallback={null}>
      <Scene {...props}/>
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={4} color="#e4e9ef" position={[-5,4,3]} rotation={[0,Math.PI/4,0]} scale={[3,8,1]}/>
        <Lightformer form="rect" intensity={2.5} color="#adbed2" position={[5,0,2]} rotation={[0,-Math.PI/3,0]} scale={[2,7,1]}/>
        <Lightformer form="rect" intensity={5} color="#ffffff" position={[0,5,-3]} rotation={[Math.PI/2,0,0]} scale={[8,1,1]}/>
        <Lightformer form="ring" intensity={2} color="#c9c6bc" position={[0,-2,4]} scale={4}/>
      </Environment>
      {props.quality==='high' && <EffectComposer multisampling={0}><Bloom luminanceThreshold={1.4} intensity={.35} mipmapBlur/><Noise opacity={.018}/><Vignette offset={.2} darkness={.38}/></EffectComposer>}
      <PerformanceMonitor onDecline={()=>setDpr(1)} onIncline={()=>setDpr(1.5)} flipflops={2} onFallback={()=>setDpr(1)}/>
      <AdaptiveDpr pixelated/>
      <Ready onReady={props.onReady} onFailure={props.onFailure} journey={props.journey}/>
    </Suspense>
  </Canvas></RendererBoundary>;
}

function Ready({onReady,onFailure,journey}:{onReady:()=>void;onFailure:()=>void;journey:RefObject<JourneyState>}) {
  const gl=useThree(s=>s.gl);const set=useThree(s=>s.set);const invalidate=useThree(s=>s.invalidate);const initialized=useRef(false);
  const statistics=useRef({start:0,frames:0});
  useFrame(()=>{if(!initialized.current){initialized.current=true;onReady();}const now=performance.now();statistics.current.frames++;if(now-statistics.current.start>1500){gl.domElement.dataset.fps=String(Math.round(statistics.current.frames*1000/(now-statistics.current.start)));gl.domElement.dataset.drawCalls=String(gl.info.render.calls);gl.domElement.dataset.triangles=String(gl.info.render.triangles);statistics.current={start:now,frames:0};}});
  useEffect(()=>{
    const visibility=()=>{set({frameloop:document.hidden?'never':'always'});journey.current.hidden=document.hidden;if(!document.hidden)invalidate();};
    const lost=(event:Event)=>{event.preventDefault();onFailure();};
    document.addEventListener('visibilitychange',visibility);gl.domElement.addEventListener('webglcontextlost',lost);
    return()=>{document.removeEventListener('visibilitychange',visibility);gl.domElement.removeEventListener('webglcontextlost',lost);};
  },[set,invalidate,gl,onFailure,journey]);return null;
}

function Scene({journey,reducedMotion,selected,burst,worldZoom,worldReset,onSelect,onInspect,quality}:Props) {
  const mobile=useThree(s=>s.size.width<768);
  const groups=useRef<(Group|null)[]>([]);
  const [active,setActive]=useState(0);
  const heroProgress=useRef(0), dimensionProgress=useRef(0), transformProgress=useRef(0), portalProgress=useRef(0);
  const particles=useRef<Group>(null);
  useFrame(({camera})=>{
    const chapter=journey.current.current;const p=journey.current.local;
    if(active!==chapter)setActive(chapter);
    heroProgress.current=chapter===0?MathUtils.smoothstep(p,.1,.82):1;
    dimensionProgress.current=chapter===1?p:0;
    transformProgress.current=chapter===3?Math.min(1,p/ .46):chapter>3?1:0;
    portalProgress.current=chapter===5?p:0;
    groups.current.forEach((group,i)=>{if(group)group.visible=Math.abs(camera.position.x-i*sceneSpacing)<24;});
    if(particles.current)particles.current.position.x=camera.position.x;
  });
  return <>
    <fog attach="fog" args={['#08090b',18,65]}/>
    <ambientLight intensity={.36}/><Lighting journey={journey}/>
    <CameraRig journey={journey} selected={selected} burst={burst} worldZoom={worldZoom}/>
    <group ref={particles}><SpaceParticles count={quality==='low'?550:1400} reducedMotion={reducedMotion}/></group>
    <group ref={el=>{groups.current[0]=el;}} position={[mobile?0:1.45,mobile?1.55:.52,0]} scale={mobile?.88:1} rotation={[.12,-.25,-.28]}>
      <MechanicalSphere progressRef={heroProgress} active={active===0} reducedMotion={reducedMotion}/>
      <HeroSatellites active={active===0} reducedMotion={reducedMotion}/>
    </group>
    <group ref={el=>{groups.current[1]=el;}} position={[sceneSpacing,0,0]}>
      <DimensionEnvironment progress={0} progressRef={dimensionProgress} active={Math.abs(active-1)<2} reducedMotion={reducedMotion}/>
    </group>
    <group ref={el=>{groups.current[2]=el;}} position={[sceneSpacing*2,0,0]}>
      <Gallery selected={selected} burst={burst} active={active===2} reducedMotion={reducedMotion} onSelect={onSelect}/>
    </group>
    <group ref={el=>{groups.current[3]=el;}} position={[sceneSpacing*3+(mobile?0:1.5),mobile?-.9:0,0]} scale={mobile?1:1.2}>
      <TransformationScene progress={0} progressRef={transformProgress} active={active===3} reducedMotion={reducedMotion}/>
    </group>
    <group ref={el=>{groups.current[4]=el;}} position={[sceneSpacing*4+(mobile?0:1.5),mobile?-.95:-.3,0]} scale={mobile?1:1.15}>
      <WorldScene active={active===4} reducedMotion={reducedMotion} onInspect={onInspect} resetKey={worldReset}/>
    </group>
    <group ref={el=>{groups.current[5]=el;}} position={[sceneSpacing*5,1.25,-1]} scale={1.15}>
      <PortalEnvironment progress={0} progressRef={portalProgress} active={active===5} reducedMotion={reducedMotion}/>
    </group>
  </>;
}

function CameraRig({journey,selected,burst,worldZoom}:{journey:RefObject<JourneyState>;selected:number|null;burst:number;worldZoom:number}) {
  const look=useRef(new Vector3(0,0,0));const destination=useMemo(()=>new Vector3(),[]);const target=useMemo(()=>new Vector3(),[]);
  const orbit=useRef(0);const previousBurst=useRef(burst);
  useFrame(({camera,pointer,size},delta)=>{
    const {current:chapter,local:p,reduced}=journey.current;
    const mobile=size.width<768;const transition=chapter<5?MathUtils.smoothstep(p,.78,1):0;
    const x=(chapter+transition)*sceneSpacing;
    let z=mobile?11:8.5;let y=.1;let lookX=x;
    if(chapter===0){z=MathUtils.lerp(mobile?11:8.5,3.1,MathUtils.smoothstep(p,.18,.8));z=MathUtils.lerp(z,8.5,transition);}
    if(chapter===1)z=7.6-p*4.8+transition*5;
    if(chapter===2){z=mobile?14.2:10; y=.15; if(selected!==null){lookX=x+(mobile?[-1.45,1.45,-1.45,1.45][selected]*.35:[-3.6,-1.2,1.2,3.6][selected]*.7);z=mobile?13:7.8;if(mobile)y=selected<2?.3:-.9;}}
    if(chapter===3)z=mobile?11:8.7;
    if(chapter===4)z=(mobile?11:9.5)-worldZoom*.55;
    if(chapter===5){z=MathUtils.lerp(mobile?12:10, mobile?10:7.4,MathUtils.smoothstep(p,0,1));y=.7;}
    if(burst!==previousBurst.current){previousBurst.current=burst;orbit.current=selected===3?Math.PI*.55:0;}
    orbit.current=MathUtils.damp(orbit.current,0,1.1,delta);
    const drift=reduced?0:1;
    destination.set(lookX+pointer.x*.15*drift+Math.sin(orbit.current)*2,y+pointer.y*.12*drift,z);
    const speed=reduced?1:1-Math.exp(-4.5*Math.min(delta,.05));camera.position.lerp(destination,speed);
    target.set(lookX,chapter===5?.65:0,chapter===1?-4:0);look.current.lerp(target,speed);camera.lookAt(look.current);
  });return null;
}

function Lighting({journey}:{journey:RefObject<JourneyState>}) {
  const ref=useRef<Group>(null);
  useFrame(({camera,pointer})=>{if(ref.current){ref.current.position.x=camera.position.x;ref.current.rotation.y=journey.current.reduced?0:pointer.x*.03;}});
  return <group ref={ref}><directionalLight position={[-4,6,5]} intensity={3} color="#e5eaf0"/><pointLight position={[4,1,4]} intensity={18} color="#b3ccdf" distance={22}/><pointLight position={[-4,-3,1]} intensity={10} color="#d9cdbc" distance={20}/><rectAreaLight position={[0,5,2]} intensity={4} width={7} height={3}/></group>;
}

function HeroSatellites({active,reducedMotion}:{active:boolean;reducedMotion:boolean}) {
  const ref=useRef<Group>(null);
  useFrame(({clock},delta)=>{if(ref.current&&active&&!reducedMotion){ref.current.rotation.y+=delta*.025;ref.current.position.y=Math.sin(clock.elapsedTime*.3)*.08;}});
  return <group ref={ref}>{Array.from({length:11},(_,i)=>{const angle=i/11*Math.PI*2;const r=2.7+(i%3)*.4;return <mesh key={i} position={[Math.cos(angle)*r,Math.sin(angle)*r*.7,Math.sin(i*4)*1.2-.5]} rotation={[i*.4,i*.8,.2]} scale={i%3===0?.17:.08}><octahedronGeometry args={[1,0]}/><meshStandardMaterial color="#858b95" metalness={1} roughness={.18}/></mesh>;})}</group>;
}

function Gallery({selected,burst,active,reducedMotion,onSelect}:{selected:number|null;burst:number;active:boolean;reducedMotion:boolean;onSelect:(i:number)=>void}) {
  const mobile=useThree(s=>s.size.width<768);
  const groups=useRef<(Group|null)[]>([]);
  useFrame((_,delta)=>{groups.current.forEach((group,i)=>{if(!group)return;const s=selected===i?1.05:selected!==null?.65:.78;group.scale.setScalar(MathUtils.damp(group.scale.x,s,5,delta));const baseline=mobile?(i<2?.45:-1.7):0;group.position.y=MathUtils.damp(group.position.y,baseline+(selected===i?.1:0),5,delta);});});
  const choose=(e:ThreeEvent<MouseEvent>,i:number)=>{e.stopPropagation();onSelect(i);};
  return <>{[-3.6,-1.2,1.2,3.6].map((x,i)=><group key={i} position={[mobile?(i%2===0?-1.45:1.45):x,mobile?(i<2?.45:-1.7):0,0]} ref={el=>{groups.current[i]=el;}} onClick={e=>choose(e,i)}>
    {i===0?<LiquidChrome activation={selected===0?burst:0} active={active} reducedMotion={reducedMotion}/>:i===1?<GlassStructure activation={selected===1?burst:0} active={active} reducedMotion={reducedMotion}/>:i===2?<ParticleArtifact active={active} reducedMotion={reducedMotion} burst={selected===2?burst:0}/>:<EnergyCore activation={selected===3?burst:0} active={active} reducedMotion={reducedMotion}/>}
    <mesh position={[0,-1.72,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.5,.505,64]}/><meshBasicMaterial color="#69717c" transparent opacity={.5}/></mesh>
  </group>)}</>;
}

function ParticleArtifact({active,reducedMotion,burst}:{active:boolean;reducedMotion:boolean;burst:number}) {
  const material=useRef<ShaderMaterial>(null);const group=useRef<Group>(null);const pulse=useRef(0);const last=useRef(burst);
  const resources=useMemo(()=>{
    const count=3600;const position=new Float32Array(count*3),seeds=new Float32Array(count);
    for(let i=0;i<count;i++){const u=i/count*Math.PI*2*19,v=i*2.399963;const r=1+.3*Math.cos(v);position.set([r*Math.cos(u),.3*Math.sin(v),r*Math.sin(u)],i*3);seeds[i]=(i*.618)%1;}
    const geometry=new BufferGeometry();geometry.setAttribute('position',new BufferAttribute(position,3));geometry.setAttribute('aSeed',new BufferAttribute(seeds,1));
    return {geometry,uniforms:{uTime:{value:0},uBurst:{value:0},uShape:{value:0},uPointer:{value:[0,0]}}};
  },[]);
  useEffect(()=>()=>resources.geometry.dispose(),[resources]);
  useFrame(({pointer},delta)=>{if(!active)return;if(last.current!==burst){last.current=burst;pulse.current=1;resources.uniforms.uShape.value=burst%2;}pulse.current=MathUtils.damp(pulse.current,0,2.5,delta);resources.uniforms.uTime.value+=reducedMotion?0:delta;resources.uniforms.uBurst.value=pulse.current;resources.uniforms.uPointer.value=[pointer.x*2,pointer.y*2];if(group.current&&!reducedMotion){group.current.rotation.x=.7;group.current.rotation.z+=delta*.08;}});
  return <group ref={group}><points geometry={resources.geometry} frustumCulled={false} onPointerOver={()=>{pulse.current=.3;}}><shaderMaterial ref={material} uniforms={resources.uniforms} transparent depthWrite={false} blending={AdditiveBlending}
    vertexShader={`uniform float uTime;uniform float uBurst;uniform float uShape;uniform vec2 uPointer;attribute float aSeed;varying float vAlpha;void main(){vec3 p=position;vec3 sphere=normalize(p)*1.25; p=mix(p,sphere,uShape);p+=normalize(p)*(uBurst*(1.0+aSeed)*1.7);float d=length(p.xy-uPointer);p.xy+=normalize(p.xy-uPointer+.001)*exp(-d*d)*.25;p.y+=sin(aSeed*30.+uTime)*.035;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp((1.0+aSeed)*12./-mv.z,1.,3.);vAlpha=.4+aSeed*.6;}`}
    fragmentShader={`varying float vAlpha;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(.77,.88,.96,smoothstep(.5,.0,d)*vAlpha);}`}/></points></group>;
}
