import assert from 'node:assert/strict';
import test from 'node:test';
import { createScenePlayback } from '../src/scripts/scene-playback.js';

function setup(options={}) {
  let time=0,sequence=0,maxTimers=0;
  const jobs=new Map(),changes=[];
  const playback=createScenePlayback({
    count:8,interval:6000,...options,now:()=>time,
    setTimer(callback,delay){const id=++sequence;jobs.set(id,{callback,at:time+delay});maxTimers=Math.max(maxTimers,jobs.size);return id;},
    clearTimer:id=>jobs.delete(id),onChange:state=>changes.push(state),
  });
  function advance(milliseconds){
    const end=time+milliseconds;
    for(let safety=0;safety<1000;safety++){
      const next=[...jobs.entries()].sort((a,b)=>a[1].at-b[1].at)[0];
      if(!next||next[1].at>end){time=end;return;}
      time=next[1].at;jobs.delete(next[0]);next[1].callback();
    }
    throw new Error('Runaway timer');
  }
  return {playback,advance,jobs,changes,get maxTimers(){return maxTimers;}};
}

test('starts only in view, advances after six seconds and wraps eight scenes',()=>{
  const s=setup();s.advance(20000);assert.equal(s.playback.getState().index,0);assert.equal(s.jobs.size,0);
  s.playback.setInView(true);s.advance(5999);assert.equal(s.playback.getState().index,0);
  s.advance(1);assert.equal(s.playback.getState().index,1);
  s.advance(42000);assert.equal(s.playback.getState().index,0);assert.equal(s.maxTimers,1);
});

test('manual selection persists through hover and viewport changes until explicit continue',()=>{
  const s=setup();s.playback.setInView(true);s.advance(2000);s.playback.select(4);
  s.playback.setHovered(true);s.playback.setInView(false);s.advance(30000);
  s.playback.setHovered(false);s.playback.setInView(true);s.advance(30000);
  assert.equal(s.playback.getState().index,4);assert.equal(s.playback.getState().wantsPlay,false);assert.equal(s.jobs.size,0);
  s.playback.play();s.advance(5999);assert.equal(s.playback.getState().index,4);
  s.advance(1);assert.equal(s.playback.getState().index,5);
});

test('overlapping hover and focus blockers preserve the remaining duration',()=>{
  const s=setup();s.playback.setInView(true);s.advance(2250);s.playback.setHovered(true);
  assert.equal(s.playback.getState().remaining,3750);s.advance(50000);
  s.playback.setFocused(true);s.playback.setHovered(false);assert.equal(s.jobs.size,0);
  s.playback.setFocused(false);s.advance(3749);assert.equal(s.playback.getState().index,0);
  s.advance(1);assert.equal(s.playback.getState().index,1);
});

test('hidden tab and offscreen module must both recover before playing',()=>{
  const s=setup();s.playback.setInView(true);s.advance(1000);s.playback.setPageVisible(false);s.playback.setInView(false);
  s.advance(60000);assert.equal(s.playback.getState().index,0);
  s.playback.setPageVisible(true);assert.equal(s.jobs.size,0);
  s.playback.setInView(true);s.advance(5000);assert.equal(s.playback.getState().index,1);
});

test('reduced motion is manual by default and live preference changes stop playback',()=>{
  const s=setup({reducedMotion:true});s.playback.setInView(true);s.playback.play();s.advance(20000);
  assert.equal(s.jobs.size,0);assert.equal(s.playback.getState().index,0);
  s.playback.setReducedMotion(false);assert.equal(s.jobs.size,0);
  s.playback.play();s.advance(6000);assert.equal(s.playback.getState().index,1);
  s.playback.setReducedMotion(true);s.advance(20000);assert.equal(s.playback.getState().index,1);
  s.playback.setReducedMotion(false);assert.equal(s.playback.getState().wantsPlay,false);assert.equal(s.jobs.size,0);
});

test('repeated play, visibility, focus and pointer changes never create competing timers',()=>{
  const s=setup();s.playback.setInView(true);
  for(let i=0;i<100;i++){
    s.playback.play();s.playback.setInView(true);s.playback.setFocused(true);s.playback.setHovered(true);
    s.playback.setFocused(false);s.playback.setHovered(false);s.advance(10);
  }
  assert.equal(s.maxTimers,1);assert.equal(s.jobs.size,1);
});

test('a stale cleared callback cannot advance a manually selected scene',()=>{
  const s=setup();s.playback.setInView(true);const stale=[...s.jobs.values()][0].callback;
  s.playback.select(6);stale();assert.equal(s.playback.getState().index,6);assert.equal(s.jobs.size,0);
  s.playback.play();stale();assert.equal(s.jobs.size,1);assert.equal(s.playback.getState().index,6);
});

test('arrow/swipe indices wrap and selecting the current scene also pauses',()=>{
  const s=setup();s.playback.setInView(true);s.playback.select(-1);assert.equal(s.playback.getState().index,7);
  s.playback.select(8);assert.equal(s.playback.getState().index,0);
  s.playback.play();s.playback.select(0);assert.equal(s.playback.getState().wantsPlay,false);
});

test('a canceled or vertical gesture resumes the user intent without losing elapsed time',()=>{
  const s=setup();s.playback.setInView(true);s.advance(1500);s.playback.setInteracting(true);s.advance(10000);
  assert.equal(s.playback.getState().wantsPlay,true);assert.equal(s.jobs.size,0);
  s.playback.setInteracting(false);s.advance(4500);assert.equal(s.playback.getState().index,1);
});

test('continue while temporarily blocked waits, and pause remains persistent',()=>{
  const s=setup();s.playback.setInView(true);s.playback.setFocused(true);s.playback.pause();s.playback.play();
  assert.equal(s.jobs.size,0);assert.equal(s.playback.getState().wantsPlay,true);
  s.playback.setFocused(false);assert.equal(s.jobs.size,1);
  s.playback.pause();s.playback.setInView(false);s.playback.setInView(true);assert.equal(s.jobs.size,0);
});

test('dispose cancels pending work and later events cannot restart it',()=>{
  const s=setup();s.playback.setInView(true);const stale=[...s.jobs.values()][0].callback;
  s.playback.dispose();stale();s.playback.setInView(false);s.playback.setInView(true);s.playback.play();s.advance(10000);
  assert.equal(s.jobs.size,0);assert.equal(s.playback.getState().index,0);
});

test('one scene has a readable static state without an autoplay timer',()=>{
  const s=setup({count:1});s.playback.setInView(true);s.advance(60000);assert.equal(s.jobs.size,0);assert.equal(s.playback.getState().index,0);
});
