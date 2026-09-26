(function () {
  'use strict';
  const assetRoot = new URL('./', document.currentScript.src);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const dataCache = new Map();
  let playerReady;

  function loadPlayer() {
    if (window.lottie) return Promise.resolve(window.lottie);
    if (!playerReady) {
      playerReady = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/lottie-web@5.13.0/build/player/lottie.min.js';
        script.onload = () => window.lottie ? resolve(window.lottie) : reject(new Error('Player unavailable'));
        script.onerror = reject;
        document.head.append(script);
      }).catch(error => { playerReady = undefined; throw error; });
    }
    return playerReady;
  }

  function loadData(name) {
    if (!dataCache.has(name)) {
      dataCache.set(name, fetch(new URL('lottie/' + name + '.json', assetRoot))
        .then(response => {
          if (!response.ok) throw new Error('Animation unavailable');
          return response.json();
        }).catch(error => { dataCache.delete(name); throw error; }));
    }
    return dataCache.get(name);
  }

  window.CorrioAnimatedIcons = {
    mount(host, name) {
      let disposed = false;
      let animation;
      let ready = false;
      const viewport = host.querySelector('.corrio-icon-viewport');
      host.dataset.state = reducedMotion.matches ? 'fallback' : 'loading';
      const motionChange = () => {
        if (ready && reducedMotion.matches) animation.goToAndStop(animation.totalFrames - 1, true);
      };
      reducedMotion.addEventListener('change', motionChange);
      Promise.all([loadPlayer(), loadData(name)]).then(([player, data]) => {
        if (disposed) return;
        animation = player.loadAnimation({
          container: viewport,
          renderer: 'svg',
          loop: false,
          autoplay: false,
          animationData: JSON.parse(JSON.stringify(data)),
        });
        animation.addEventListener('DOMLoaded', () => {
          if (disposed) return;
          ready = true;
          if (reducedMotion.matches) animation.goToAndStop(animation.totalFrames - 1, true);
          else animation.goToAndPlay(0, true);
          host.dataset.state = 'ready';
        });
        animation.addEventListener('data_failed', () => {
          if (!disposed) host.dataset.state = 'fallback';
        });
      }).catch(() => { if (!disposed) host.dataset.state = 'fallback'; });
      return () => {
        disposed = true;
        reducedMotion.removeEventListener('change', motionChange);
        if (animation) animation.destroy();
      };
    },
  };
})();
