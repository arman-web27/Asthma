// ============ Ad attribution (UTM + Meta) ============

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_campaign_id",
  "utm_adset",
  "utm_adset_id",
  "utm_ad",
  "utm_ad_id",
  "utm_placement",
];

function setHidden(name, value) {
  const input = document.querySelector('#orderForm input[name="' + name + '"]');
  if (input) input.value = value || "";
}

function readCookie(name) {
  const match = document.cookie.match(
    new RegExp("(^|;\\s*)" + name + "=([^;]*)"),
  );
  return match ? decodeURIComponent(match[2]) : "";
}

function stickyValue(key, fromUrl) {
  if (fromUrl) {
    try {
      sessionStorage.setItem(key, fromUrl);
    } catch (e) {
      /* private mode */
    }
    return fromUrl;
  }
  try {
    return sessionStorage.getItem(key) || "";
  } catch (e) {
    return "";
  }
}

function captureUtmParams() {
  const urlParams = new URLSearchParams(window.location.search);

  UTM_KEYS.forEach(function (key) {
    setHidden(key, stickyValue(key, urlParams.get(key)));
  });

  // Meta click ID. Present only on the first landing URL, so persist it.
  const fbclid = stickyValue("fbclid", urlParams.get("fbclid"));
  setHidden("fbclid", fbclid);

  let fbc = readCookie("_fbc");
  if (!fbc && fbclid) {
    const savedFbc = stickyValue("fbc", "");
    fbc =
      savedFbc && savedFbc.endsWith("." + fbclid)
        ? savedFbc
        : stickyValue("fbc", "fb.1." + Date.now() + "." + fbclid);
  }
  setHidden("fbc", fbc);
  setHidden("fbp", readCookie("_fbp"));
}

function newEventId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "evt-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

const orderFormEl = document.getElementById("orderForm");

document.getElementById("name").addEventListener("input", function () {
  this.value = this.value.replace(/[^A-Za-z ]/g, "");
  this.setCustomValidity("");
});

document.getElementById("phone").addEventListener("input", function () {
  this.value = this.value.replace(/[^0-9]/g, "").replace(/^[0-5]+/, "").slice(0, 10);
  this.setCustomValidity("");
});

// Ensure submission metadata exists even when the form only renders customer fields.
[...UTM_KEYS, "fbclid", "fbc", "fbp", "date", "event_id"].forEach(function (name) {
  if (!orderFormEl.querySelector('input[name="' + name + '"]')) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.id = name;
    orderFormEl.appendChild(input);
  }
});

function updateProgress() {
  ["name", "phone"].forEach(function (id) {
    const input = document.getElementById(id);
    const error = document.getElementById(id + "Error");
    if (error && input.validity.valid) {
      error.classList.remove("show");
    }
  });
}

window.addEventListener("pageshow", function () {
  orderFormEl.reset();
  if (window.SecureForm && SecureForm.instance) SecureForm.instance.reset();
  captureUtmParams();
  updateProgress();
  document.getElementById("loading").classList.remove("show");
  const button = document.getElementById("submitBtn");
  button.style.display = "";
  button.disabled = false;
});
captureUtmParams();

const ENDPOINT =
  "https://script.google.com/macros/s/AKfycbyM5nmQbbMTc-9U-bvrDwY3q5BoNvhCMtBiNfz7smPyK5D_K95GQ1N3SzkF593a2QTy/exec";

let pendingOrder = "";

SecureForm.init({
  endpoint: ENDPOINT,
  form: "#orderForm",
  redirect: "./Thankyou.html",
  requestTimeout: 45000,
  loader: "#loading",
  onChange: function () {
    updateProgress();
  },

  beforeSubmit: function () {
    const name = document.getElementById("name");
    name.value = name.value.trim();
    name.setCustomValidity(
      !/^[A-Za-z ]+$/.test(name.value) || name.value.replace(/ /g, "").length < 2
        ? "Please enter your full name using letters and spaces only."
        : "",
    );
    const phone = document.getElementById("phone");
    phone.setCustomValidity(
      /^[6-9][0-9]{9}$/.test(phone.value)
        ? ""
        : "Enter a 10-digit contact number starting with 6, 7, 8 or 9.",
    );
    if (!orderFormEl.reportValidity()) return false;

    // Re-read attribution in case the page was opened before it was
    // stored, then stamp submission time and a fresh dedupe id.
    captureUtmParams();

    document.getElementById("date").value = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date());
    // Reuse the ID on retry in case the save succeeded but its response was lost.
    const order = JSON.stringify([name.value, document.getElementById("phone").value]);
    if (order !== pendingOrder || !document.getElementById("event_id").value) {
      document.getElementById("event_id").value = newEventId();
      pendingOrder = order;
    }
    document.getElementById("orderStatus").textContent = "Saving your order. Please wait...";
  },

  onSuccess: function () {
    if (window.Swal)
      window.Swal.fire({
        icon: "success",
        title: "Success",
        text: "Processing Your Order. Please wait....",
        confirmButtonColor: "#3085d6",
        confirmButtonText: "OK",
      });
  },

  onError: function (err) {
    console.error("Fetch error:", err);
    document.getElementById("orderStatus").textContent =
      "We could not confirm your order was saved. Please try again or call +91 88606 06078.";
  },
});

let dotCount = 1;
setInterval(() => {
  const d = document.getElementById("dotAnim");
  if (d) {
    dotCount = (dotCount % 3) + 1;
    d.textContent = ".".repeat(dotCount);
  }
}, 500);
