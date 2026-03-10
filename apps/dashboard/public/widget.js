/**
 * WhatsApp Automation Platform — Embeddable Floating Widget
 *
 * Usage:
 * <script src="https://yourplatform.com/widget.js"
 *   data-phone="919876543210"
 *   data-message="Hello! I need help."
 *   data-color="#25D366"
 *   data-position="right"
 *   data-label="Chat with us">
 * </script>
 */
(function () {
  "use strict";

  var script =
    document.currentScript || document.querySelector("script[data-phone]");

  if (!script) return;

  var config = {
    phone: script.getAttribute("data-phone") || "",
    message: script.getAttribute("data-message") || "Hello!",
    color: script.getAttribute("data-color") || "#25D366",
    position: script.getAttribute("data-position") || "right",
    label: script.getAttribute("data-label") || "Chat on WhatsApp",
    delay: parseInt(script.getAttribute("data-delay") || "2", 10),
    pulse: script.getAttribute("data-pulse") !== "false",
  };

  if (!config.phone) {
    console.warn("[WA Widget] data-phone is required");
    return;
  }

  // Inject styles
  var style = document.createElement("style");
  style.textContent = `
    #wa-widget-btn {
      position: fixed;
      bottom: 24px;
      ${config.position}: 24px;
      z-index: 999999;
      display: flex;
      align-items: center;
      gap: 10px;
      background: ${config.color};
      color: #fff;
      border-radius: 50px;
      padding: 14px 20px;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      box-shadow: 0 4px 24px rgba(37,211,102,0.5);
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      cursor: pointer;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      opacity: 0;
      transform: translateY(20px) scale(0.9);
    }
    #wa-widget-btn.visible {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    #wa-widget-btn:hover {
      transform: translateY(-3px) scale(1.05);
      box-shadow: 0 8px 32px rgba(37,211,102,0.6);
    }
    #wa-widget-btn svg { flex-shrink: 0; }
    @keyframes wa-pulse {
      0% { box-shadow: 0 0 0 0 rgba(37,211,102,0.7); }
      70% { box-shadow: 0 0 0 14px rgba(37,211,102,0); }
      100% { box-shadow: 0 0 0 0 rgba(37,211,102,0); }
    }
    #wa-widget-btn.pulse { animation: wa-pulse 2s infinite; }
    @media (max-width: 480px) {
      #wa-widget-btn span { display: none; }
      #wa-widget-btn { border-radius: 50%; padding: 16px; }
    }
  `;
  document.head.appendChild(style);

  // Create button
  var waIcon =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M5.077 20.093l-.002-.001c-1.505-.937-2.88-2.225-3.928-3.817C0 14.613-.001 12.264.677 10.049a11.37 11.37 0 013.116-4.668C5.552 3.905 7.965 2.923 10.5 2.923c2.535 0 4.948.981 6.707 2.758a11.37 11.37 0 013.116 4.668c.678 2.215.677 4.564-.322 6.226-1.048 1.592-2.423 2.88-3.928 3.817l.003.004L12 21.077l-6.923-4.984z"/></svg>';

  var btn = document.createElement("a");
  btn.id = "wa-widget-btn";
  btn.href =
    "https://wa.me/" +
    config.phone +
    "?text=" +
    encodeURIComponent(config.message);
  btn.target = "_blank";
  btn.rel = "noopener noreferrer";
  btn.setAttribute("aria-label", "Chat on WhatsApp");
  btn.innerHTML = waIcon + "<span>" + config.label + "</span>";
  if (config.pulse) btn.classList.add("pulse");

  document.body.appendChild(btn);

  // Animate in after delay
  setTimeout(function () {
    btn.classList.add("visible");
  }, config.delay * 1000);
})();
