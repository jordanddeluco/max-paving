/* Max Paving — site scripts */
(function () {
  "use strict";

  /* Sticky header shadow */
  const header = document.querySelector(".header");
  const toTop = document.querySelector(".totop");
  const onScroll = () => {
    const y = window.scrollY || document.documentElement.scrollTop;
    if (header) header.classList.toggle("is-scrolled", y > 8);
    if (toTop) toTop.classList.toggle("is-visible", y > 500);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (toTop) toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  /* Mobile nav */
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      if (header) nav.style.setProperty("--nav-top", header.getBoundingClientRect().bottom + "px");
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      document.body.style.overflow = open ? "hidden" : "";
    });
    nav.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      })
    );
  }

  /* Reveal on scroll */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-in"));
  }

  /* Services tabs (hash-driven so nav anchors like #commercial-concrete work) */
  const tabs = document.querySelector("[data-tabs]");
  if (tabs) {
    const buttons = Array.from(tabs.querySelectorAll(".tabs__btn"));
    const panels = Array.from(tabs.querySelectorAll(".tabs__panel"));
    const activate = (id, scroll) => {
      const btn = buttons.find((b) => b.dataset.tab === id) || buttons[0];
      const target = btn.dataset.tab;
      buttons.forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === target)));
      panels.forEach((p) => p.classList.toggle("is-active", p.id === target));
      if (scroll) {
        const top = tabs.getBoundingClientRect().top + window.scrollY - 110;
        window.scrollTo({ top, behavior: "smooth" });
      }
    };
    buttons.forEach((b) =>
      b.addEventListener("click", () => {
        history.replaceState(null, "", "#" + b.dataset.tab);
        activate(b.dataset.tab, false);
      })
    );
    const fromHash = () => {
      const id = location.hash.replace("#", "");
      if (id && panels.some((p) => p.id === id)) activate(id, true);
    };
    window.addEventListener("hashchange", fromHash);
    activate(location.hash.replace("#", "") || buttons[0].dataset.tab, false);
    if (location.hash) setTimeout(fromHash, 50);
  }

  /* Quote / contact form — posts to FormSubmit (no backend needed on GitHub Pages) */
  document.querySelectorAll("form[data-quote-form]").forEach((form) => {
    const ok = form.querySelector(".form__msg--ok");
    const err = form.querySelector(".form__msg--err");
    const submit = form.querySelector('button[type="submit"]');
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      ok.classList.remove("is-visible");
      err.classList.remove("is-visible");
      if (!form.reportValidity()) return;
      if (form.querySelector('[name="_honey"]').value) return; // bot
      submit.classList.add("is-loading");
      try {
        const data = new FormData(form);
        const res = await fetch(form.action, {
          method: "POST",
          headers: { Accept: "application/json" },
          body: data,
        });
        if (!res.ok) throw new Error("bad status");
        ok.classList.add("is-visible");
        form.reset();
      } catch (e) {
        err.classList.add("is-visible");
      } finally {
        submit.classList.remove("is-loading");
      }
    });
  });

  /* Video hero
     - plays once, muted, with a compact caption so the footage stays visible
     - "Watch with sound" / Replay restart from 0:00 with audio
     - when it ends, the full message fades in over a blurred frame */
  const hero = document.querySelector(".hero--video");
  const heroVideo = document.getElementById("hero-video");
  if (hero && heroVideo) {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const soundBtn = hero.querySelector("[data-sound]");
    const setSoundUI = (on) => {
      if (!soundBtn) return;
      soundBtn.setAttribute("aria-pressed", String(on));
      soundBtn.setAttribute("aria-label", on ? "Mute video" : "Unmute video");
    };
    const finish = () => {
      hero.classList.add("is-ended");
      hero.classList.remove("is-sound");
      // the clip fades to black at the end; hold on a real frame so the blur has something to show
      try { heroVideo.pause(); if (heroVideo.duration) heroVideo.currentTime = Math.max(0, heroVideo.duration - 6); } catch (_) {}
    };
    const restart = (withSound) => {
      hero.classList.remove("is-ended");
      hero.classList.toggle("is-sound", !!withSound);
      heroVideo.currentTime = 0;
      heroVideo.muted = !withSound;
      setSoundUI(!!withSound);
      heroVideo.play().catch(() => { heroVideo.muted = true; setSoundUI(false); heroVideo.play().catch(() => {}); });
    };

    heroVideo.addEventListener("playing", () => hero.classList.add("is-playing"), { once: true });
    heroVideo.addEventListener("ended", finish);

    if (reduced) {
      heroVideo.removeAttribute("autoplay");
      heroVideo.pause();
      hero.classList.add("is-playing");
      finish(); // show the message straight away, no motion
    } else {
      const p = heroVideo.play();
      if (p && p.catch) p.catch(() => {});
      // If autoplay is blocked the video never starts: show the message instead of an idle poster
      setTimeout(() => { if (heroVideo.paused && !hero.classList.contains("is-sound")) { hero.classList.add("is-playing"); finish(); } }, 3000);
    }

    hero.querySelectorAll("[data-play], [data-replay]").forEach((b) => b.addEventListener("click", () => restart(true)));
    if (soundBtn) {
      soundBtn.addEventListener("click", () => {
        const on = heroVideo.muted;
        heroVideo.muted = !on;
        hero.classList.toggle("is-sound", on);
        setSoundUI(on);
        if (heroVideo.paused) heroVideo.play().catch(() => {});
      });
    }
    // Browsers may suspend a muted background video (hidden/occluded tab); resume when visible again
    const resume = () => {
      if (document.visibilityState !== "visible" || hero.classList.contains("is-ended")) return;
      if (heroVideo.paused) heroVideo.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("focus", resume);
    // Pause when scrolled away, resume when back (unless finished)
    if ("IntersectionObserver" in window && !reduced) {
      new IntersectionObserver((entries) => entries.forEach((e) => {
        if (hero.classList.contains("is-ended")) return;
        if (e.isIntersecting) heroVideo.play().catch(() => {}); else heroVideo.pause();
      }), { threshold: 0.05 }).observe(hero);
    }
  }

  /* Footer year */
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
})();
