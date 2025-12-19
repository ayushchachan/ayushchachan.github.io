// assets/main.js
console.log("Main JS loaded");

// Future animations or interactions will go here
// ================= INTRO TYPING ANIMATION =================
// ================= INTRO TYPING ANIMATION =================

const line1Text = "Hi, I’m Ayush Chachan.";
const line2Text = "Welcome to my personal space on the web.";

const line1 = document.getElementById("intro-line-1");
const line2 = document.getElementById("intro-line-2");

const cursor1 = document.getElementById("cursor-1");
const cursor2 = document.getElementById("cursor-2");

let i = 0;
let j = 0;
const speed = 80;

function typeLine1() {
  if (i < line1Text.length) {
    line1.textContent += line1Text.charAt(i);
    i++;
    setTimeout(typeLine1, speed);
  } else {
    cursor1.classList.add("hidden");
    cursor2.classList.remove("hidden");
    setTimeout(typeLine2, 300);
  }
}

function typeLine2() {
  if (j < line2Text.length) {
    line2.textContent += line2Text.charAt(j);
    j++;
    setTimeout(typeLine2, speed);
  }
}

typeLine1();

// About section reveal
const aboutSection = document.querySelector(".about-container");

const observer = new IntersectionObserver(
  ([entry]) => {
    if (entry.isIntersecting) {
      aboutSection.classList.add("visible");
    }
  },
  { threshold: 0.2 }
);

observer.observe(aboutSection);
