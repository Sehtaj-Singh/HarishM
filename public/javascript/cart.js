// public/js/cart.js

document.addEventListener("DOMContentLoaded", () => {
  // ----- Helpers -----
  const $ = (sel) => document.querySelector(sel);

  // Expose as globals so inline onclick works
  window.showOverlay = function (id) {
    const el = document.getElementById(id);
    if (el) el.style.display = "block";
  };

  window.hideOverlay = function (id) {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  };

  // ----- Read page state (set by data-attribute in cart.ejs) -----
  const page = document.getElementById("cart-page");
  const hasAddress = page && page.dataset.hasAddress === "1";

  // ----- Address modal wiring -----
  const addAddressBtn = document.getElementById("add-address-btn");
  const editAddressBtn = document.getElementById("edit-address-btn");
  const closeAddressBtn = document.getElementById("close-address-btn");
  const addressForm = document.getElementById("address-form");
  const saveBtn = document.getElementById("save-address-btn");

  // Add Address
  if (addAddressBtn) {
    addAddressBtn.addEventListener("click", () => {
      addressForm.reset();
      if (saveBtn) saveBtn.innerText = "Save Address";
      window.showOverlay("address-overlay");
    });
  }

  // Edit Address
  if (editAddressBtn) {
    editAddressBtn.addEventListener("click", () => {
      try {
        const userAddressData = document.getElementById("user-address-data");
        if (userAddressData) {
          const userAddress = JSON.parse(userAddressData.textContent);

          addressForm.fullName.value = userAddress.fullName || "";
          addressForm.mobile.value   = userAddress.mobile || "";
          addressForm.flat.value     = userAddress.flat || "";
          addressForm.area.value     = userAddress.area || "";
          addressForm.landmark.value = userAddress.landmark || "";
          addressForm.city.value     = userAddress.city || "";
          addressForm.state.value    = userAddress.state || "";
          addressForm.pincode.value  = userAddress.pincode || "";

          if (saveBtn) saveBtn.innerText = "Update Address";
        }
      } catch (err) {
        console.error("❌ Error pre-filling address:", err);
      }
      window.showOverlay("address-overlay");
    });
  }

  // Close modal
  if (closeAddressBtn) {
    closeAddressBtn.addEventListener("click", () => window.hideOverlay("address-overlay"));
  }

  // Save / Update form
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

        // Close modal and reload to show address + Place Order button
        window.hideOverlay("address-overlay");
        location.reload();
      } catch (err) {
        console.error(err);
        alert(err.message || "Failed to save address");
      }
    });
  }

  // ----- Razorpay, only when address exists -----
  if (hasAddress) {
    const payBtn = document.getElementById("pay-now");
    if (payBtn) {
      payBtn.addEventListener("click", async () => {
        try {
          const res = await fetch("/checkout/create-order", { method: "POST" });
          const data = await res.json();

          const options = {
            key: data.key,
            amount: data.amount,
            currency: data.currency,
            name: "My Store",
            description: "Order Payment",
            order_id: data.id,
            handler: async function (response) {
              const verifyRes = await fetch("/checkout/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  orderId: data.id,
                  paymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                }),
              });
              const vr = await verifyRes.json();
              if (vr.success) {
                window.location.href = "/orders";
              } else {
                alert("Payment verification failed");
              }
            },
          };

          new Razorpay(options).open();
        } catch (err) {
          console.error(err);
          alert("Payment could not be started");
        }
      });
    }
  }
});
