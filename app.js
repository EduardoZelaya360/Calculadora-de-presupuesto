// ─── Estado global ────────────────────────────────────────────────────────────
let currentType = "ingreso";
let transactions = [];
let chartIngresos = null;
let chartGastos   = null;
let chartBalance  = null;

const STORAGE_KEY = "control_financiero_txs";

// ─── Inicialización ───────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  injectLayout();
  loadFromStorage();
  setDate();
  renderAll();
});

function setDate() {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("f-date").value = today;
}

// ─── Inyectar estructura fuera del navbar ─────────────────────────────────────
function injectLayout() {
  const container = document.querySelector(".container2");

  // 1. Tarjetas de resumen — antes del row principal
  if (!document.getElementById("summary-cards")) {
    const summary = document.createElement("div");
    summary.id = "summary-cards";
    summary.className = "row g-3 mb-4";
    container.insertBefore(summary, container.firstChild);
  }

  // 2. Historial — después del row principal
  if (!document.getElementById("tx-list-section")) {
    const list = document.createElement("div");
    list.id = "tx-list-section";
    list.className = "mt-4";
    container.appendChild(list);
  }
}

// ─── Tipo (Ingreso / Gasto) ───────────────────────────────────────────────────
function setType(type) {
  currentType = type;
  const btnIng = document.getElementById("btn-ing");
  const btnGas = document.getElementById("btn-gas");

  if (type === "ingreso") {
    btnIng.className = "btn btn-success w-50 fw-bold";
    btnGas.className = "btn btn-outline-danger w-50 fw-bold";
  } else {
    btnIng.className = "btn btn-outline-success w-50 fw-bold";
    btnGas.className = "btn btn-danger w-50 fw-bold";
  }
}

// ─── Agregar transacción ──────────────────────────────────────────────────────
function addTx() {
  const desc    = document.getElementById("f-desc").value.trim();
  const amount  = parseFloat(document.getElementById("f-amount").value);
  const cat     = document.getElementById("f-cat").value;
  const date    = document.getElementById("f-date").value;

  if (!desc)           return showToast("Ingresa una descripción.", "warning");
  if (!amount || amount <= 0) return showToast("Ingresa un monto válido.", "warning");
  if (!cat)            return showToast("Selecciona una categoría.", "warning");
  if (!date)           return showToast("Selecciona una fecha.", "warning");

  const tx = { id: Date.now(), type: currentType, desc, amount, cat, date };
  transactions.unshift(tx);
  saveToStorage();
  renderAll();
  resetForm();
  showToast(
    `${currentType === "ingreso" ? "Ingreso" : "Gasto"} agregado correctamente.`,
    "success"
  );
}

function resetForm() {
  document.getElementById("f-desc").value   = "";
  document.getElementById("f-amount").value = "";
  document.getElementById("f-cat").value    = "";
  setDate();
}

// ─── Eliminar transacción ─────────────────────────────────────────────────────
function deleteTx(id) {
  transactions = transactions.filter((t) => t.id !== id);
  saveToStorage();
  renderAll();
  showToast("Transacción eliminada.", "danger");
}

// ─── LocalStorage ─────────────────────────────────────────────────────────────
function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function loadFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  transactions = raw ? JSON.parse(raw) : [];
}

// ─── Render principal ─────────────────────────────────────────────────────────
function renderAll() {
  renderSummary();
  renderChart();
  renderList();
}

// ─── Tarjetas de resumen ──────────────────────────────────────────────────────
function renderSummary() {
  const totalIngresos = transactions
    .filter((t) => t.type === "ingreso")
    .reduce((s, t) => s + t.amount, 0);
  const totalGastos = transactions
    .filter((t) => t.type === "gasto")
    .reduce((s, t) => s + t.amount, 0);
  const balance = totalIngresos - totalGastos;
  const balanceColor = balance >= 0 ? "text-success" : "text-danger";

  document.getElementById("summary-cards").innerHTML = `
    <div class="col-12 col-md-4">
      <div class="card border-0 shadow-sm rounded-3 px-3 py-2 d-flex flex-row align-items-center gap-3">
        <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
          style="width:40px;height:40px;background:#e8f5e9">
          <span style="font-size:1.1rem">↑</span>
        </div>
        <div>
          <div class="text-muted" style="font-size:.7rem;font-weight:600;letter-spacing:.05em">INGRESOS</div>
          <div class="fw-bold text-success" style="font-size:1rem">L ${fmt(totalIngresos)}</div>
        </div>
      </div>
    </div>
    <div class="col-12 col-md-4">
      <div class="card border-0 shadow-sm rounded-3 px-3 py-2 d-flex flex-row align-items-center gap-3">
        <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
          style="width:40px;height:40px;background:#ffebee">
          <span style="font-size:1.1rem">↓</span>
        </div>
        <div>
          <div class="text-muted" style="font-size:.7rem;font-weight:600;letter-spacing:.05em">GASTOS</div>
          <div class="fw-bold text-danger" style="font-size:1rem">L ${fmt(totalGastos)}</div>
        </div>
      </div>
    </div>
    <div class="col-12 col-md-4">
      <div class="card border-0 shadow-sm rounded-3 px-3 py-2 d-flex flex-row align-items-center gap-3">
        <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
          style="width:40px;height:40px;background:#e3f2fd">
          <span style="font-size:1.1rem">⚖</span>
        </div>
        <div>
          <div class="text-muted" style="font-size:.7rem;font-weight:600;letter-spacing:.05em">BALANCE</div>
          <div class="fw-bold ${balanceColor}" style="font-size:1rem">L ${fmt(balance)}</div>
        </div>
      </div>
    </div>
  `;
}

// ─── Gráficos (3 donas) ───────────────────────────────────────────────────────
function renderChart() {
  const wrapper = document.querySelector(".bg-light.border.rounded-3");
  if (!wrapper) return;

  if (!document.getElementById("charts-grid")) {
    wrapper.innerHTML = `
      <div id="charts-grid" style="width:100%">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
          <div class="bg-white rounded-3 p-2 shadow-sm text-center">
            <div class="text-muted fw-semibold mb-1" style="font-size:.7rem;letter-spacing:.05em">INGRESOS POR CATEGORÍA</div>
            <div style="height:160px;position:relative"><canvas id="chartIngresos"></canvas></div>
          </div>
          <div class="bg-white rounded-3 p-2 shadow-sm text-center">
            <div class="text-muted fw-semibold mb-1" style="font-size:.7rem;letter-spacing:.05em">GASTOS POR CATEGORÍA</div>
            <div style="height:160px;position:relative"><canvas id="chartGastos"></canvas></div>
          </div>
        </div>
        <div class="bg-white rounded-3 p-2 shadow-sm text-center">
          <div class="text-muted fw-semibold mb-1" style="font-size:.7rem;letter-spacing:.05em">BALANCE INGRESOS vs GASTOS</div>
          <div style="height:160px;position:relative"><canvas id="chartBalance"></canvas></div>
        </div>
      </div>`;
  }

  const colors = ["#1976d2","#43a047","#fb8c00","#8e24aa","#00acc1","#f4511e","#6d4c41","#546e7a","#c0ca33","#e53935"];

  const ingMap = {};
  transactions.filter(t => t.type === "ingreso")
    .forEach(t => { ingMap[t.cat] = (ingMap[t.cat] || 0) + t.amount; });

  const gasMap = {};
  transactions.filter(t => t.type === "gasto")
    .forEach(t => { gasMap[t.cat] = (gasMap[t.cat] || 0) + t.amount; });

  if (chartIngresos) chartIngresos.destroy();
  chartIngresos = makeDona("chartIngresos", Object.keys(ingMap).map(labelCat), Object.values(ingMap), colors);

  if (chartGastos) chartGastos.destroy();
  chartGastos = makeDona("chartGastos", Object.keys(gasMap).map(labelCat), Object.values(gasMap),
    ["#e53935","#fb8c00","#f4511e","#8e24aa","#6d4c41","#546e7a","#c0ca33"]);

  const totalIng = Object.values(ingMap).reduce((a, b) => a + b, 0);
  const totalGas = Object.values(gasMap).reduce((a, b) => a + b, 0);
  if (chartBalance) chartBalance.destroy();
  chartBalance = makeDona("chartBalance", ["Ingresos", "Gastos"], [totalIng, totalGas], ["#43a047","#e53935"]);
}

function makeDona(id, labels, data, colors) {
  const canvas = document.getElementById(id);
  if (!canvas) return null;
  const ctx = canvas.getContext("2d");

  if (!data.length || data.every(v => v === 0)) {
    return new Chart(ctx, {
      type: "doughnut",
      data: { labels: ["Sin datos"], datasets: [{ data: [1], backgroundColor: ["#e0e0e0"], borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } },
    });
  }

  return new Chart(ctx, {
    type: "doughnut",
    data: { labels, datasets: [{ data, backgroundColor: colors.slice(0, data.length), borderWidth: 2, borderColor: "#fff" }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { font: { size: 10 }, boxWidth: 10 } },
        tooltip: { callbacks: { label: (c) => ` L ${fmt(c.parsed)} (${pct(c.parsed, data)}%)` } },
      },
    },
  });
}

// ─── Lista de transacciones ───────────────────────────────────────────────────
function renderList() {
  const listSection = document.getElementById("tx-list-section");

  if (transactions.length === 0) {
    listSection.innerHTML = `
      <div class="card border-0 shadow-sm rounded-3 p-4 text-center text-muted">
        <p class="mb-0 fw-semibold">No hay transacciones registradas.</p>
      </div>`;
    return;
  }

  const rows = transactions.map((t) => `
    <tr>
      <td class="text-muted small">${t.date}</td>
      <td>${t.desc}</td>
      <td><span class="badge bg-secondary">${labelCat(t.cat)}</span></td>
      <td class="fw-bold ${t.type === "ingreso" ? "text-success" : "text-danger"}">
        ${t.type === "ingreso" ? "+" : "−"} L ${fmt(t.amount)}
      </td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="deleteTx(${t.id})">✕</button>
      </td>
    </tr>`).join("");

  listSection.innerHTML = `
    <div class="card border-0 shadow-sm rounded-3">
      <div class="card-body p-4">
        <h2 class="fs-4 fw-bold mb-3 text-secondary">Historial de transacciones</h2>
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th>Fecha</th>
                <th>Descripción</th>
                <th>Categoría</th>
                <th>Monto</th>
                <th class="text-center">Eliminar</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    </div>`;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg, type = "success") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.style.cssText =
      "position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;display:flex;flex-direction:column;gap:.5rem;";
    document.body.appendChild(container);
  }

  const colors = { success: "#198754", danger: "#dc3545", warning: "#fd7e14" };
  const toast = document.createElement("div");
  toast.style.cssText = `
    background:${colors[type] || "#333"};color:#fff;
    padding:.75rem 1.25rem;border-radius:.5rem;
    font-size:.9rem;font-weight:600;
    box-shadow:0 4px 12px rgba(0,0,0,.2);
    opacity:0;transition:opacity .3s;
  `;
  toast.textContent = msg;
  container.appendChild(toast);
  requestAnimationFrame(() => (toast.style.opacity = "1"));
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

// ─── Utilidades ───────────────────────────────────────────────────────────────
function fmt(n) {
  return n.toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(val, arr) {
  const total = arr.reduce((a, b) => a + b, 0);
  return total ? ((val / total) * 100).toFixed(1) : 0;
}

function labelCat(key) {
  const map = {
    salario: "Salario", freelance: "Freelance", inversiones: "Inversiones",
    alquiler: "Alquiler", servicios: "Servicios", transporte: "Transporte",
    comida_rapida: "Comida Rápida", compras_online: "Compras Online",
    suscripciones: "Suscripciones", videojuegos: "Videojuegos", salud: "Salud",
  };
  return map[key] || key;
}