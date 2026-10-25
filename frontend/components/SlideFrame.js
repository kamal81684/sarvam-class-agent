"use client";
import { useEffect, useRef, useState } from "react";

// Slides are authored for a 1280x720 canvas. Render them at that size and
// scale the whole canvas to the container, like a presentation viewer.
const W = 1280;
const H = 720;

// Injected into every slide: lock the canvas size, shrink content that is taller
// than the canvas so nothing is cut off, and highlight data-ax elements on request.
const SLIDE_RUNTIME = `<style>
html, body { margin: 0 !important; width: ${W}px !important; height: ${H}px !important; overflow: hidden !important; }
[data-ax] { transition: outline-color .2s, box-shadow .2s; outline: 3px solid transparent; outline-offset: 4px; border-radius: 6px; }
[data-ax].ax-on { outline-color: #F9D666; box-shadow: 0 0 0 6px rgba(249, 214, 102, .25), 0 0 28px rgba(249, 214, 102, .55); }
</style>
<script>
(function () {
  // Shrink content that does not fit. While shrinking, widen the layout by the same
  // factor so the content reflows across the full canvas instead of a corner.
  function fit() {
    var b = document.body, z = 1;
    for (var i = 0; i < 5; i++) {
      b.style.setProperty("zoom", String(z));
      b.style.setProperty("width", ${W} / z + "px", "important");
      b.style.setProperty("height", ${H} / z + "px", "important");
      var h = b.scrollHeight, w = b.scrollWidth;
      var next = Math.min(z, z * (${H} / z) / h, z * (${W} / z) / w);
      if (next >= z - 0.005) break;
      z = Math.max(next, 0.4);
    }
  }
  window.addEventListener("load", function () { fit(); setTimeout(fit, 300); });
  window.addEventListener("message", function (e) {
    document.querySelectorAll("[data-ax]").forEach(function (el) { el.classList.remove("ax-on"); });
    if (!e.data || !e.data.target) return;
    var el = document.querySelector('[data-ax="' + e.data.target + '"]');
    if (el) el.classList.add("ax-on");
  });
})();
</script>`;

export default function SlideFrame({ html, frameRef, onLoad }) {
  const box = useRef(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / W));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={box} className="slide-box">
      <iframe
        ref={frameRef}
        title="slide"
        sandbox="allow-scripts"
        srcDoc={(html || "") + SLIDE_RUNTIME}
        onLoad={onLoad}
        style={{ width: W, height: H, transform: `scale(${scale})` }}
      />
    </div>
  );
}
