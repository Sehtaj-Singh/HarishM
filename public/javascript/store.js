window.addEventListener("DOMContentLoaded", () => {
  // ---------- HEADER NAVIGATION INDICATOR ----------
  const navItems = document.querySelectorAll("#lowerHeader .nav-item");

  // detect current path
  const currentPath = window.location.pathname;

  navItems.forEach((item) => {
    if (item.dataset.path === currentPath) {
      item.classList.add("active");
    }

    item.addEventListener("click", () => {
      navItems.forEach((i) => i.classList.remove("active"));
      item.classList.add("active");
      // Optional navigation:
      window.location.href = item.dataset.path;
    });
  });

  // ----------- Cart Modal ---------------
  const cartBtn = document.querySelector(".fa-cart-shopping")?.closest("button");
const cartModal = document.getElementById("cart-modal");
const closeCart = document.getElementById("close-cart");

function openCartModal() {
  if (!cartModal) return;
  cartModal.style.display = "block";
  setTimeout(() => cartModal.classList.add("show"), 10);
}

function closeCartModal() {
  if (!cartModal) return;
  cartModal.classList.remove("show");
  setTimeout(() => (cartModal.style.display = "none"), 800);
}

// Bind manual toggle via header icon
if (cartBtn && cartModal && closeCart) {
  cartBtn.addEventListener("click", openCartModal);
  closeCart.addEventListener("click", closeCartModal);
  cartModal.addEventListener("click", (e) => {
    if (e.target === cartModal) {
      closeCartModal();
    }
  });
}

// Auto-open on ?openCart=1 or ?openCart=login
(function autoOpenCartFromQuery() {
  if (!cartModal) return;
  const params = new URLSearchParams(window.location.search);
  const flag = params.get("openCart");
  if (!flag) return;

  openCartModal();

  // Clean URL so refresh doesn't reopen
  params.delete("openCart");
  const newUrl =
    window.location.pathname +
    (params.toString() ? "?" + params.toString() : "") +
    window.location.hash;
  window.history.replaceState({}, "", newUrl);
})();

  // ---------- IMAGE SLIDER (responsive, fixes gap at 94%) ----------
  const track = document.querySelector(".carousel-track");
  const dotsContainer = document.querySelector(".carousel-dots");

  if (track && dotsContainer) {
    const slides = track.children;
    let startX = 0,
      currentTranslate = 0,
      prevTranslate = 0,
      currentIndex = 0;

    // Create dots dynamically
    for (let i = 0; i < slides.length; i++) {
      const dot = document.createElement("div");
      dot.classList.add("dot");
      if (i === 0) dot.classList.add("active");
      dotsContainer.appendChild(dot);
    }

    const dots = document.querySelectorAll(".dot");

    // --- helper: restart zoom animation for active slide ---
    function runZoomOnCurrent() {
      [...slides].forEach((img) => img.classList.remove("zoom-run"));
      void slides[currentIndex].offsetWidth; // reflow to restart animation
      slides[currentIndex].classList.add("zoom-run");
    }

    // --- swipe handlers ---
    track.addEventListener("touchstart", (e) => {
      startX = e.touches[0].clientX;
      clearInterval(autoSlideInterval);
    });

    track.addEventListener("touchmove", (e) => {
      const moveX = e.touches[0].clientX - startX;
      currentTranslate = prevTranslate + moveX;
      track.style.transform = `translateX(${currentTranslate}px)`;
    });

    track.addEventListener("touchend", () => {
      const movedBy = currentTranslate - prevTranslate;

      if (movedBy < -50 && currentIndex < slides.length - 1) currentIndex++;
      if (movedBy > 50 && currentIndex > 0) currentIndex--;

      currentTranslate = -currentIndex * slides[0].clientWidth;
      track.style.transform = `translateX(${currentTranslate}px)`;
      prevTranslate = currentTranslate;

      updateDots();
      runZoomOnCurrent(); // ✅ trigger zoom when swiping manually

      autoSlideInterval = setInterval(autoSlide, 6000);
    });

    function updateDots() {
      dots.forEach((dot, i) => {
        dot.classList.toggle("active", i === currentIndex);
      });
    }

    function autoSlide() {
      currentIndex = (currentIndex + 1) % slides.length;
      currentTranslate = -currentIndex * slides[0].clientWidth;
      track.style.transform = `translateX(${currentTranslate}px)`;
      prevTranslate = currentTranslate;
      updateDots();
      runZoomOnCurrent(); // ✅ trigger zoom when auto sliding
    }

    let autoSlideInterval = setInterval(autoSlide, 6000);

    // ✅ initial animation on first slide
    runZoomOnCurrent();
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
  const searchIconButton = document.getElementById("searchIconButton");
  const upperHeader = document.getElementById("upperHeader");
  const closeSearchButton = document.getElementById("closeSearch");

  if (searchIconButton && upperHeader && closeSearchButton) {
    searchIconButton.addEventListener("click", () => {
      upperHeader.classList.add("expanded");
    });

    closeSearchButton.addEventListener("click", () => {
      upperHeader.classList.remove("expanded");
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

  // ----------- Slider for store page --------------

  const slider = document.getElementById("slider");
  const sections = document.querySelectorAll(".store-section");
  const navIcons = document.querySelectorAll(".nav-icon");

  // --- read tab param ---
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");

  let currentIndex = 1; // always start with Refurbished
  const sectionWidth = window.innerWidth;
  const TRANSITION = "transform 0.8s ease-in-out";

  // start on refurbished instantly
  slider.style.transition = "none";
  slider.style.transform = `translateX(-${currentIndex * sectionWidth}px)`;

  // enable transitions after first paint
  requestAnimationFrame(() => {
    slider.style.transition = TRANSITION;
  });

  // if coming from another tab, slide after a short delay
  let targetIndex = null;
  if (tab === "new") targetIndex = 0;
  if (tab === "second") targetIndex = 1;
  if (tab === "accessories") targetIndex = 2;

  if (targetIndex !== null && targetIndex !== currentIndex) {
    setTimeout(() => {
      currentIndex = targetIndex;
      slider.style.transform = `translateX(-${currentIndex * sectionWidth}px)`;
    }, 100); // delay so refurbished is visible briefly, then transition runs
  }

  // --- rest of your slider code (buttons + swipe) ---
  function goToSlide(index) {
    if (index < 0) index = 0;
    if (index >= sections.length) index = sections.length - 1;
    currentIndex = index;
    slider.style.transform = `translateX(-${currentIndex * sectionWidth}px)`;
  }

  navIcons.forEach((icon) => {
    icon.addEventListener("click", () => {
      const dir = icon.dataset.dir;
      if (dir === "left") goToSlide(currentIndex - 1);
      if (dir === "right") goToSlide(currentIndex + 1);
    });
  });

  // --- Swipe support
  let startX = 0;
  let isDragging = false;

  slider.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
    isDragging = true;
  });

  slider.addEventListener("touchend", (e) => {
    if (!isDragging) return;
    const endX = e.changedTouches[0].clientX;
    const diff = startX - endX;

    if (diff > 50) {
      goToSlide(currentIndex + 1); // swipe left → next
    } else if (diff < -50) {
      goToSlide(currentIndex - 1); // swipe right → prev
    }

    isDragging = false;
  });
});
