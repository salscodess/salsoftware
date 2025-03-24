document.addEventListener("DOMContentLoaded", () => {
    AOS.init(); // Initialize AOS animations

    gsap.from("header", { opacity: 0, y: -50, duration: 1 });
    gsap.from(".hero h1", { opacity: 0, x: -100, duration: 1, delay: 0.5 });
    gsap.from(".hero p", { opacity: 0, x: 100, duration: 1, delay: 0.7 });
    gsap.from(".btn-glow", { opacity: 0, scale: 0.5, duration: 1, delay: 1 });
});
