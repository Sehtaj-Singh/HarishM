// public/javascript/cart.js

document.addEventListener("DOMContentLoaded", () => {
  // -------------------- Helpers --------------------
  const $ = (sel) => document.querySelector(sel);

  // Overlay show/hide (address modal)
  window.showOverlay = function (id) {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = "block";
      setTimeout(() => el.classList.add("show"), 10);
    }
  };

  window.hideOverlay = function (id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove("show");
      setTimeout(() => (el.style.display = "none"), 300);
    }
  };

  // -------------------- Quantity Buttons --------------------
  document.querySelectorAll(".cart-qty").forEach((control) => {
    const minusBtn = control.querySelector(".qty-minus");
    const plusBtn = control.querySelector(".qty-plus");
    const countSpan = control.querySelector(".qty-count");
    const productId = control.getAttribute("data-id");

    const updateQuantity = (newQty) => {
      fetch(`/cart/update/${productId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qty: newQty }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            countSpan.textContent = data.qty;

            const subtotalEl = $("#cart-summary-subtotal");
            const mrpEl = $("#cart-summary-mrp");
            const savedEl = $("#cart-summary-saved");

            if (subtotalEl) subtotalEl.textContent = `₹${data.totalPrice}`;
            if (mrpEl) mrpEl.textContent = `₹${data.totalMrp}`;
            if (savedEl) savedEl.textContent = `You saved ₹${data.saved}`;
          } else {
            alert(data.error || "Failed to update cart");
          }
        })
        .catch((err) => console.error("Update cart failed:", err));
    };

    minusBtn.addEventListener("click", () => {
      let currentQty = parseInt(countSpan.textContent, 10);
      if (currentQty > 1) updateQuantity(currentQty - 1);
    });

    plusBtn.addEventListener("click", () => {
      let currentQty = parseInt(countSpan.textContent, 10);
      updateQuantity(currentQty + 1);
    });
  });

  // -------------------- Address Modal Logic --------------------
  const page = document.getElementById("cart-page");
  const hasAddress = page && page.dataset.hasAddress === "1";

  const addAddressBtn = $("#add-address-btn");
  const editAddressBtn = $("#edit-address-btn");
  const closeAddressBtn = $("#close-address-btn");
  const addressForm = $("#address-form");
  const saveBtn = $("#save-address-btn");

  if (addAddressBtn) {
    addAddressBtn.addEventListener("click", () => {
      addressForm.reset();
      if (saveBtn) saveBtn.innerText = "Save Address";
      window.showOverlay("address-overlay");
    });
  }

  if (editAddressBtn) {
    editAddressBtn.addEventListener("click", () => {
      try {
        const userAddressData = $("#user-address-data");
        if (userAddressData) {
          const userAddress = JSON.parse(userAddressData.textContent);

          addressForm.fullName.value = userAddress.fullName || "";
          addressForm.mobile.value = userAddress.mobile || "";
          addressForm.flat.value = userAddress.flat || "";
          addressForm.area.value = userAddress.area || "";
          addressForm.landmark.value = userAddress.landmark || "";
          addressForm.city.value = userAddress.city || "";
          addressForm.state.value = userAddress.state || "";
          addressForm.pincode.value = userAddress.pincode || "";

          if (saveBtn) saveBtn.innerText = "Update Address";
        }
      } catch (err) {
        console.error("❌ Error pre-filling address:", err);
      }
      window.showOverlay("address-overlay");
    });
  }

  if (closeAddressBtn) {
    closeAddressBtn.addEventListener("click", () =>
      window.hideOverlay("address-overlay")
    );
  }

  if (addressForm) {
    addressForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const formData = new FormData(addressForm);
        const payload = Object.fromEntries(formData.entries());

        const res = await fetch("/user/address", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Save failed");
        }

        window.hideOverlay("address-overlay");
        location.reload();
      } catch (err) {
        console.error(err);
        alert(err.message || "Failed to save address");
      }
    });
  }

  // -------------------- Razorpay Flow --------------------
  if (hasAddress) {
    const payBtn = document.getElementById("place-order-btn");
    if (payBtn) {
      payBtn.addEventListener("click", async () => {
        payBtn.disabled = true;
        payBtn.textContent = "Please wait...";

        try {
          // Step 1: Create order on backend
          const res = await fetch("/checkout/create-order", { method: "POST" });
          if (!res.ok) throw new Error("Order creation failed");
          const data = await res.json();

          // Step 2: Setup Razorpay modal
          const options = {
            key: data.key,
            amount: data.amount,
            currency: data.currency,
            name: "My Store",
            description: "Order Payment",
            order_id: data.id, // Razorpay order ID
            handler: async function (response) {
              try {
                // Step 3: Verify payment with backend
                const verifyRes = await fetch("/checkout/verify", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    orderId: data.id,
                    paymentId: response.razorpay_payment_id,
                    signature: response.razorpay_signature,
                    orderDbId: data.orderDbId, // returned from backend
                  }),
                });
                const vr = await verifyRes.json();

                if (vr.success) {
                  // Redirect to orders page
                  window.location.href = "/orders";
                } else {
                  alert(vr.error || "Payment verification failed");
                }
              } catch (err) {
                console.error("Verify payment failed:", err);
                alert("Error verifying payment");
              }
            },
            prefill: {
              name: window.__CURRENT_USER_NAME || "",
              email: window.__CURRENT_USER_EMAIL || "",
              contact: window.__CURRENT_USER_MOBILE || "",
            },
          };

          const rzp = new Razorpay(options);

          rzp.on("payment.failed", function (resp) {
            console.error("Payment failed:", resp);
            alert("Payment failed, please try again.");
          });

          rzp.open();
        } catch (err) {
          console.error("Payment start error:", err);
          alert("Unable to start payment. Please try again.");
        } finally {
          payBtn.disabled = false;
          payBtn.textContent = "Place Order";
        }
      });
    }
  }
});
