/* =========================================================
   OUR WORLD — SMOOTH INTERACTION SYSTEM
   ========================================================= */
(() => {
  "use strict";

  const scenes = [...document.querySelectorAll(".scene")];
  const chapters = [...document.querySelectorAll(".chapter")];
  const loader = document.getElementById("loader");
  const mouseGlow = document.getElementById("mouseGlow");
  const particleLayer = document.getElementById("particles");

  /* ===== SCENE REVEAL ===== */
  const sceneObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
      }
    });
  }, {
    threshold: 0.16,
    rootMargin: "-8% 0px -8% 0px"
  });

  scenes.forEach((scene) => sceneObserver.observe(scene));

  /* ===== ACTIVE CHAPTER ===== */
  const activeObserver = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!visible) return;

    chapters.forEach((chapter) => {
      chapter.classList.toggle(
        "active",
        chapter.dataset.target === visible.target.id
      );
    });
  }, {
    threshold: [0.2, 0.45, 0.7],
    rootMargin: "-25% 0px -25% 0px"
  });

  scenes.forEach((scene) => activeObserver.observe(scene));

  /* ===== CHAPTER NAVIGATION ===== */
  chapters.forEach((chapter) => {
    chapter.setAttribute("role", "button");
    chapter.setAttribute("tabindex", "0");

    const navigate = () => {
      const target = document.getElementById(chapter.dataset.target);
      if (!target) return;

      target.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start"
      });
    };

    chapter.addEventListener("click", navigate);
    chapter.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        navigate();
      }
    });
  });

  /* ===== MOUSE GLOW — DESKTOP ONLY ===== */
  const canHover = window.matchMedia("(hover:hover) and (pointer:fine)");

  if (canHover.matches && mouseGlow) {
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let visible = false;

    window.addEventListener("pointermove", (event) => {
      targetX = event.clientX;
      targetY = event.clientY;

      if (!visible) {
        visible = true;
        mouseGlow.style.opacity = "1";
      }
    }, { passive: true });

    const animateGlow = () => {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;

      mouseGlow.style.left = `${currentX}px`;
      mouseGlow.style.top = `${currentY}px`;

      requestAnimationFrame(animateGlow);
    };

    requestAnimationFrame(animateGlow);

    window.addEventListener("pointerleave", () => {
      mouseGlow.style.opacity = "0";
    });
  }

  /* ===== LIGHT PARALLAX — ONE RAF LOOP ===== */
  if (canHover.matches) {
    let pointerX = 0;
    let pointerY = 0;
    let rafPending = false;

    window.addEventListener("pointermove", (event) => {
      pointerX = (event.clientX / window.innerWidth - 0.5) * 2;
      pointerY = (event.clientY / window.innerHeight - 0.5) * 2;

      if (rafPending) return;
      rafPending = true;

      requestAnimationFrame(() => {
        const bg = document.querySelector(".bg");
        if (bg) {
          bg.style.transform =
            `translate3d(${pointerX * 8}px,${pointerY * 6}px,0)`;
        }
        rafPending = false;
      });
    }, { passive: true });
  }

  /* ===== AMBIENT PARTICLES ===== */
  if (particleLayer && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const count = window.innerWidth < 600 ? 14 : 26;
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < count; i++) {
      const particle = document.createElement("span");
      particle.className = "particle";

      const size = Math.random() * 3 + 1;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.animationDuration = `${Math.random() * 16 + 14}s`;
      particle.style.animationDelay = `${Math.random() * -20}s`;
      particle.style.opacity = `${Math.random() * .5 + .15}`;

      fragment.appendChild(particle);
    }

    particleLayer.appendChild(fragment);
  }

  /* ===== LOADER ===== */
  const hideLoader = () => {
    if (!loader) return;
    window.setTimeout(() => loader.classList.add("hide"), 1100);
  };

  if (document.readyState === "complete") {
    hideLoader();
  } else {
    window.addEventListener("load", hideLoader, { once: true });
  }

  /* ===== IMAGE SAFETY ===== */
  document.querySelectorAll(".memory-polaroid img").forEach((img) => {
    img.loading = "lazy";
    img.decoding = "async";
  });

  /* ===== VIDEO SAFETY ===== */
  document.querySelectorAll("video").forEach((video) => {
    video.setAttribute("playsinline", "");
    video.muted = true;
  });
})();
