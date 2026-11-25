// DEV ONLY: simulates prefers-reduced-motion by copying every
// @media (prefers-reduced-motion: reduce) block into an unconditional
// stylesheet, then lists CSS animations that are still running.
// Canvas motion (office walk bob, board pulse) reads matchMedia at mount and
// is not covered here.
export async function checkReducedMotion() {
  const before = document.getAnimations().filter((a) => a.playState === 'running').length;
  let css = '';
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch (e) { continue; }
    for (const rule of rules) {
      if (rule.media && /prefers-reduced-motion:\s*reduce/.test(rule.media.mediaText)) {
        for (const inner of rule.cssRules) css += inner.cssText + '\n';
      }
    }
  }
  const style = document.createElement('style');
  style.id = 'qa-forced-reduced-motion';
  style.textContent = css;
  document.head.appendChild(style);
  await new Promise((r) => setTimeout(r, 300));
  const still = document.getAnimations().filter((a) => {
    if (a.playState !== 'running') return false;
    const t = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : null;
    // A 0.01ms single-iteration animation is effectively instant.
    return !(t && t.duration <= 1 && t.iterations === 1);
  });
  const result = {
    runningBefore: before,
    stillRunningUnderReduce: still.length,
    offenders: still.slice(0, 10).map((a) => (a.effect && a.effect.target ? a.effect.target.className.baseVal ?? a.effect.target.className : '?') + ' :: ' + (a.animationName || ''))
  };
  style.remove();
  return result;
}

export default checkReducedMotion;
