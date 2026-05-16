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
    const content = document.createElement("div");
    content.className = "toast-item__content";

    const title = document.createElement("div");
    title.className = "toast-item__title";
    title.textContent = String(message ?? "");

    const closeBtn = document.createElement("button");
    closeBtn.className = "toast-item__close";
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Bildirimi kapat");
    closeBtn.textContent = "×";

    content.appendChild(title);
    toast.append(content, closeBtn);

    const close = () => {
      toast.classList.add("toast-item--hide");
      setTimeout(() => toast.remove(), 250);
    };

    closeBtn.addEventListener("click", close);

    root.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add("toast-item--show");
    });

    setTimeout(close, 3000);
  }

  window.Toast = { show };
})();
