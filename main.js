// year
document.getElementById("year").textContent = new Date().getFullYear();

// scroll reveal animation
const elems = document.querySelectorAll(".reveal");

const observer = new IntersectionObserver(
  entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        observer.unobserve(e.target);
      }
    });
  },
  { threshold: 0.2 }
);

elems.forEach(el => observer.observe(el));
