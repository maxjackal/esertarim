(() => {
  function ensureToastRoot() {
    let root = document.getElementById("toastRoot");
    if (root) return root;

    root = document.createElement("div");
    root.id = "toastRoot";
    root.className = "toast-root";
    document.body.appendChild(root);
    return root;
  }

  function show(message, type = "info") {
    const root = ensureToastRoot();

    const toast = document.createElement("div");
    toast.className = `toast-item toast-${type}`;
    toast.innerHTML = `
      <div class="toast-item__content">
        <div class="toast-item__title">${message}</div>
      </div>
      <button class="toast-item__close" type="button">×</button>
    `;

    const close = () => {
      toast.classList.add("toast-item--hide");
      setTimeout(() => toast.remove(), 250);
    };

    toast.querySelector(".toast-item__close")?.addEventListener("click", close);

    root.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add("toast-item--show");
    });

    setTimeout(close, 3000);
  }

  window.Toast = { show };
})();