window.addEventListener('DOMContentLoaded', () => {
  // ---------- HEADER NAVIGATION INDICATOR ----------
  const finalNavLinks = document.querySelectorAll('.final-nav .nav-link');
  const finalIndicator = document.querySelector('.final-indicator');

  function moveFinalIndicator(link) {
    if (!link || !finalIndicator) return;
    const parentRect = link.parentElement.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    const offsetLeft = linkRect.left - parentRect.left;

    finalIndicator.style.left = `${offsetLeft - 8}px`;
    finalIndicator.style.width = `${link.offsetWidth + 16}px`;
  }

  // ✅ URL से current path लो
  const currentPath = window.location.pathname;
  const navParams = new URLSearchParams(window.location.search);
  const fromParam = navParams.get('from');

  
// Determine fallback tab
let matchPath = currentPath;

// If we're on a details page, simulate the previous tab
if (currentPath.includes('/Details') && fromParam) {
  if (fromParam === 'home') {
    matchPath = '/';
  } else if (fromParam === 'store') {
    matchPath = '/store';
  }
}

finalNavLinks.forEach(link => {
  if (link.getAttribute('href') === matchPath) {
    link.classList.add('active');
    moveFinalIndicator(link);
  } else {
    link.classList.remove('active');
  }
});

  // ---------- IMAGE SLIDER ----------
  const track = document.querySelector('.carousel-track');
const dotsContainer = document.querySelector('.carousel-dots');

if (track && dotsContainer) {
  const slides = track.children;
  let startX = 0, currentTranslate = 0, prevTranslate = 0, currentIndex = 0;

  // Create dots dynamically
  for (let i = 0; i < slides.length; i++) {
    const dot = document.createElement('div');
    dot.classList.add('dot');
    if (i === 0) dot.classList.add('active');
    dotsContainer.appendChild(dot);
  }

  const dots = document.querySelectorAll('.dot');

  track.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    clearInterval(autoSlideInterval);
  });

  track.addEventListener('touchmove', (e) => {
    const moveX = e.touches[0].clientX - startX;
    currentTranslate = prevTranslate + moveX;
    track.style.transform = `translateX(${currentTranslate}px)`;
  });

  track.addEventListener('touchend', () => {
    const movedBy = currentTranslate - prevTranslate;

    if (movedBy < -50 && currentIndex < slides.length - 1) currentIndex++;
    if (movedBy > 50 && currentIndex > 0) currentIndex--;

    currentTranslate = -currentIndex * slides[0].clientWidth;
    track.style.transform = `translateX(${currentTranslate}px)`;
    prevTranslate = currentTranslate;

    updateDots();

    autoSlideInterval = setInterval(autoSlide, 3000);
  });

  function updateDots() {
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentIndex);
    });
  }

  function autoSlide() {
    currentIndex = (currentIndex + 1) % slides.length;
    currentTranslate = -currentIndex * slides[0].clientWidth;
    track.style.transform = `translateX(${currentTranslate}px)`;
    prevTranslate = currentTranslate;
    updateDots();
  }

  let autoSlideInterval = setInterval(autoSlide, 6000);
}


  // ---------- ACTIVE CLASS FOR LIST ITEMS ----------
  // const list = document.querySelectorAll('.list');
  // list.forEach(item =>
  //   item.addEventListener('click', function () {
  //     list.forEach(i => i.classList.remove('active'));
  //     this.classList.add('active');
  //   })
  // );

  //-------- Search function -------------
 const searchIconButton = document.getElementById('searchIconButton');
const upperHeader = document.getElementById('upperHeader');
const closeSearchButton = document.getElementById('closeSearch');

if (searchIconButton && upperHeader && closeSearchButton) {
  searchIconButton.addEventListener('click', () => {
    upperHeader.classList.add('expanded');
  });

  closeSearchButton.addEventListener('click', () => {
    upperHeader.classList.remove('expanded');
  });
}

// const searchSubmitBtn = document.getElementById('searchSubmitBtn');
// const searchInput = document.getElementById('searchBarInput');

// if (searchSubmitBtn && searchInput) {
//   searchSubmitBtn.addEventListener('click', () => {
//     const query = searchInput.value.trim();
//     if (query) {
//       alert("Searching for: " + query);
//       // Optionally route to: window.location.href = `/search?q=${encodeURIComponent(query)}`
//     }
//   });
// }

// ---------- SPA TAB FADE NAVIGATION ----------
const tabOrder = ['new', 'second', 'accessories'];
let currentTab = 'second';
let isTransitioning = false;

const tabLinks = document.querySelectorAll('.store-tabs .tab-link');
const sections = document.querySelectorAll('.mobile-section');

// --- Handle tab selection from query param ---
const urlParams = new URLSearchParams(window.location.search);
const tabFromURL = urlParams.get("tab");
if (tabFromURL && tabOrder.includes(tabFromURL)) {
  const defaultActive = document.querySelector(".tab-link.active");
  const sectionActive = document.querySelector('.mobile-section.active');
  const nextLink = document.querySelector(`.tab-link[data-tab="${tabFromURL}"]`);
  const nextSection = document.querySelector(`.mobile-section[data-tab="${tabFromURL}"]`);

  // Remove default active
  defaultActive?.classList.remove("active");
  sectionActive?.classList.remove("active");

  // Add new active
  nextLink?.classList.add("active");
  nextSection?.classList.add("active");

  currentTab = tabFromURL;
}


tabLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const targetTab = link.dataset.tab;

    // Block if already selected or animation in progress
    if (targetTab === currentTab || isTransitioning) return;
    isTransitioning = true;

    // Update active tab underline
    tabLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');

    // Get sections
    const currentSection = document.querySelector(`.mobile-section[data-tab="${currentTab}"]`);
    const nextSection = document.querySelector(`.mobile-section[data-tab="${targetTab}"]`);

    // Prepare next section: show and start transparent
    nextSection.classList.add('active');
    nextSection.style.opacity = '0';
    void nextSection.offsetWidth; // force reflow so opacity transition works

    // Animate fade
    currentSection.style.opacity = '0';
    nextSection.style.opacity = '1';

    // Cleanup after transition
    setTimeout(() => {
      currentSection.classList.remove('active');
      currentTab = targetTab;
      isTransitioning = false;
    }, 3); // Must match the CSS transition duration
  });
});









});
