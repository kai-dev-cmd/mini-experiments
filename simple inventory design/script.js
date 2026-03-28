// ======================
// STATE (manages game data)
// ======================
const state = {
  cash: 100,
  items: {
    milk: 0,
    beans: 0,
    matcha: 0,
  },
  products: {
    coffee: 0,
    matchaLatte: 0,
  },
  sellTimers: {
    coffee: null,
    matchaLatte: null,
  },
  ui: {
    activeTab: "inventory",
    purchaseQty: { milk: 0, beans: 0, matcha: 0 },
  },
  recipes: {
    coffee: { qty: 0 },
    matchaLatte: { qty: 0 },
  },
};

// ======================
// CONSTANTS (fixed values)
// ======================
const PRICES = { milk: 8, beans: 11, matcha: 14 };
const COFFEE_PER_RECIPE = 1;
const MATCHA_LATTE_PER_RECIPE = 1;

// ======================
// DOM REFERENCES (UI hooks)
// ======================
const mainBodyEl = document.getElementById("mainBody");
const infoBodyEl = document.getElementById("infoBody");
const mainPanelEl = document.getElementById("mainPanel");
const infoPanelEl = document.getElementById("infoPanel");

// ======================
// SYSTEM VARIABLES (runtime)
// ======================
let tickIntervalId = null;
let depletionTick = 0;
let quickInfoPopupEl = null;
let quickInfoCloseTimeoutId = null;
let purchaseBlockedPopupEl = null;
let purchaseBlockedTimeoutId = null;

// popup state
function removeQuickInfoPopup() {
  if (quickInfoCloseTimeoutId !== null) {
    clearTimeout(quickInfoCloseTimeoutId);
    quickInfoCloseTimeoutId = null;
  }
  if (quickInfoPopupEl) {
    quickInfoPopupEl.remove();
    quickInfoPopupEl = null;
  }
}

// ======================
// POPUP SYSTEM (UI feedback)
// ======================

// remove quick info popup
function showQuickInfoPopup(product = "coffee") {
  removeQuickInfoPopup();

  const ingredients =
    product === "matchaLatte" ? "Milk + Matcha" : "Milk + Coffee Beans";

  quickInfoPopupEl = document.createElement("div");
  quickInfoPopupEl.style =
    "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:#fff;color:#111;padding:12px;border-radius:8px;z-index:9999;";
  quickInfoPopupEl.className = "quick-info-popup";
  quickInfoPopupEl.innerHTML = `<div>Ingredients:</div><div>${ingredients}</div><div class="popup-bar-container"><div class="popup-bar"></div></div>`;

  document.body.appendChild(quickInfoPopupEl);

  // show recipe info popup
  const bar = quickInfoPopupEl.querySelector(".popup-bar");
  if (bar) {
    bar.style.transitionDuration = "5s";
    setTimeout(() => (bar.style.width = "0%"), 0);
  }

  quickInfoCloseTimeoutId = setTimeout(removeQuickInfoPopup, 5000);
}

// purchase block popup
function removepurchaseBlockedPopup() {
  if (purchaseBlockedTimeoutId !== null) {
    clearTimeout(purchaseBlockedTimeoutId);
    purchaseBlockedTimeoutId = null;
  }
  if (purchaseBlockedPopupEl) {
    purchaseBlockedPopupEl.remove();
    purchaseBlockedPopupEl = null;
  }
}

function showpurchaseBlockedPopup(product = "coffee") {
  removepurchaseBlockedPopup();

  const needText =
    product === "matchaLatte" ? "(need milk + matcha)" : "(need milk + beans)";

  purchaseBlockedPopupEl = document.createElement("div");
  purchaseBlockedPopupEl.style =
    "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:#ef4444;color:#fff;padding:10px 12px;border-radius:6px;z-index:9999;";
  purchaseBlockedPopupEl.innerHTML = `<div>Not enough money to purchase</div><div>${needText}</div><div class="popup-bar-container"><div class="popup-bar"></div></div>`;

  document.body.appendChild(purchaseBlockedPopupEl);

  const bar = purchaseBlockedPopupEl.querySelector(".popup-bar");
  if (bar) {
    bar.style.transitionDuration = "5s";
    setTimeout(() => (bar.style.width = "0%"), 0);
  }

  purchaseBlockedTimeoutId = setTimeout(removepurchaseBlockedPopup, 5000);
}

// ======================
// HELPER LOGIC
// ======================

// returns UI status based on stock level
function stockMeta(stock) {
  if (stock === 0)
    return {
      rowClass: "stock-zero",
      statusClass: "zero",
      status: "Out of Stock",
    };
  if (stock <= 3)
    return { rowClass: "stock-low", statusClass: "low", status: "Low Stock" };
  return { rowClass: "", statusClass: "", status: "" };
}

// ======================
// RENDER SYSTEM (UI generation)
// ======================

// inventory table
function renderInventoryContent() {
  const rows = [
    { key: "milk", label: "Milk" },
    { key: "beans", label: "Coffee Beans" },
    { key: "matcha", label: "Matcha" },
  ]
    .map(({ key, label }) => {
      const stock = state.items[key];
      const qty = state.ui.purchaseQty[key];
      const totalPrice = qty * PRICES[key];
      const canBuy = qty > 0 && state.cash >= totalPrice;
      const meta = stockMeta(stock);

      return `
        <div class="row inventory ${meta.rowClass}">
          <div>${label}</div>
          <div class="text-center">${stock}</div>
          <div class="qty">
            <button data-action="purchase-dec" data-item="${key}">-</button>
            <span>${qty}</span>
            <button data-action="purchase-inc" data-item="${key}">+</button>
          </div>
          <div class="text-center">$${totalPrice}</div>
          <div>
            <button data-action="buy" data-item="${key}" ${canBuy ? "" : "disabled"}>Buy</button>
          </div>
          <div class="status ${meta.statusClass}">${meta.status}</div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="table-head inventory">
      <div>Item</div>
      <div>Stock</div>
      <div>Qty</div>
      <div>Total Price</div>
      <div></div>
      <div></div>
    </div>
    ${rows}
  `;
}

// recipe table
function renderRecipesContent() {
  const coffeeStock = state.products.coffee;
  const matchaLatteStock = state.products.matchaLatte;
  const coffeeQty = state.recipes.coffee.qty;
  const matchaLatteQty = state.recipes.matchaLatte.qty;
  const coffeeTotalCost = coffeeQty * (PRICES.milk + PRICES.beans);
  const matchaTotalCost = matchaLatteQty * (PRICES.milk + PRICES.matcha);
  const canMakeCoffee =
    coffeeQty > 0 &&
    state.items.milk >= coffeeQty &&
    state.items.beans >= coffeeQty;
  const canMakeMatchaLatte =
    matchaLatteQty > 0 &&
    state.items.milk >= matchaLatteQty &&
    state.items.matcha >= matchaLatteQty;
  const coffeeMeta = stockMeta(coffeeStock);
  const matchaMeta = stockMeta(matchaLatteStock);

  return `
    <div class="table-head recipes">
      <div>Product</div>
      <div>Profit</div>
      <div>Stock</div>
      <div>Qty</div>
      <div></div>
      <div></div>
    </div>

    <div class="row recipes ${coffeeMeta.rowClass}">
      <div>Coffee <button data-action="quick-info" data-product="coffee">i</button></div>
      <div>$5/sec</div>
      <div class="text-center">
      ${coffeeStock}
      <div class="sell-progress ${coffeeStock > 0 ? "active" : ""}"></div>
</div>
      <div class="qty">
        <button data-action="recipe-dec" data-product="coffee">-</button>
        <span>${coffeeQty}</span>
        <button data-action="recipe-inc" data-product="coffee">+</button>
        ${coffeeTotalCost > 0 ? `<span style="opacity:0.8;">-$${coffeeTotalCost}</span>` : ""}
      </div>
      <div>
        <button data-action="make" data-product="coffee" class="${canMakeCoffee ? "btn-green" : "btn-red"}">Make</button>
      </div>
      <div class="status ${coffeeMeta.statusClass}">${coffeeMeta.status}</div>
    </div>

    <div class="row recipes ${matchaMeta.rowClass}">
      <div>Matcha Latte <button data-action="quick-info" data-product="matchaLatte">i</button></div>
      <div>$12/sec</div>
      <div class="text-center">
      ${matchaLatteStock}
      <div class="sell-progress ${matchaLatteStock > 0 ? "active" : ""}"></div>
</div>
      <div class="qty">
        <button data-action="recipe-dec" data-product="matchaLatte">-</button>
        <span>${matchaLatteQty}</span>
        <button data-action="recipe-inc" data-product="matchaLatte">+</button>
        ${matchaTotalCost > 0 ? `<span style="opacity:0.8;">-$${matchaTotalCost}</span>` : ""}
      </div>
      <div>
        <button data-action="make" data-product="matchaLatte" class="${canMakeMatchaLatte ? "btn-green" : "btn-red"}">Make</button>
      </div>
      <div class="status ${matchaMeta.statusClass}">${matchaMeta.status}</div>
    </div>
  `;
}

// main render (rebuilds entire UI)

function render() {
  const profitPerSecond = state.products.coffee + state.products.matchaLatte;
  const costPerBatch = 23;
  const batchProfitPerSecond = 5;
  const breakEvenSeconds = Math.round(costPerBatch / batchProfitPerSecond);
  const matchaLatteCostPerBatch = PRICES.milk + PRICES.matcha;

  const inventoryTabClass =
    state.ui.activeTab === "inventory" ? "tab active" : "tab";
  const recipesTabClass =
    state.ui.activeTab === "recipes" ? "tab active" : "tab";

  mainBodyEl.innerHTML = `
    <div class="top-bar">
      <div>Cash: $${state.cash}</div>
      <div>Profit per second: <span class="profit-value">$${profitPerSecond}</span></div>
      <button data-action="toggle-info">Info</button>
    </div>

    <div class="tabs">
      <button class="${inventoryTabClass}" data-action="tab" data-tab="inventory">Inventory</button>
      <button class="${recipesTabClass}" data-action="tab" data-tab="recipes">Recipes</button>
    </div>

    <div>
      ${state.ui.activeTab === "inventory" ? renderInventoryContent() : renderRecipesContent()}
    </div>
  `;

  infoBodyEl.innerHTML = `
  <div class="summary-line"><strong>📊 Summary</strong></div>
  <div class="summary-line">Total Coffee: ${state.products.coffee}</div>
  <div class="summary-line">Total Matcha Latte: ${state.products.matchaLatte}</div>
  <div class="summary-line">Profit/sec: $${profitPerSecond}</div>

  <div class="summary-line" style="margin-top:12px;"><strong>☕ Coffee</strong></div>
  <div class="summary-line">1 Milk + 1 Coffee Bean → +1 Coffee</div>
  <div class="summary-line">Cost: $19</div>
  <div class="summary-line">Sell: +$5 every 2s</div>

  <div class="summary-line" style="margin-top:12px;"><strong>🍵 Matcha Latte</strong></div>
  <div class="summary-line">1 Milk + 1 Matcha → +1 Matcha Latte</div>
  <div class="summary-line">Cost: $22</div>
  <div class="summary-line">Sell: +$12 every 2s</div>
`;
}

// ======================
// EVENT SYSTEM (user actions)
// ======================
function handleMainClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  const action = target.dataset.action;
  const product = target.dataset.product;

  if (action === "toggle-info") {
    infoPanelEl.classList.toggle("hidden");
    return;
  }

  if (action === "quick-info") {
    if (!product) return;
    showQuickInfoPopup(product);
    return;
  }

  // switch tabs
  if (action === "tab") {
    state.ui.activeTab = target.dataset.tab;
    render();
    return;
  }

  // increase purchase qty
  if (action === "purchase-inc") {
    const item = target.dataset.item;
    const nextQty = state.ui.purchaseQty[item] + 1;
    const nextTotal = nextQty * PRICES[item];

    if (state.cash >= nextTotal) {
      state.ui.purchaseQty[item] = nextQty;
      render();
    } else {
      showpurchaseBlockedPopup();
    }

    return;
  }

  // buy items
  if (action === "purchase-dec") {
    const item = target.dataset.item;
    state.ui.purchaseQty[item] = Math.max(0, state.ui.purchaseQty[item] - 1);
    render();
    return;
  }

  if (action === "buy") {
    const item = target.dataset.item;
    const qty = state.ui.purchaseQty[item];
    const total = qty * PRICES[item];
    if (qty > 0 && state.cash >= total) {
      state.items[item] += qty;
      state.cash -= total;
      state.ui.purchaseQty[item] = 0;
      render();
    }
    return;
  }

  // recipe increase
  if (action === "recipe-inc") {
    if (!product || !state.recipes[product]) return;

    if (product === "matchaLatte") {
      const nextQty = state.recipes[product].qty + 1;
      const requiredMilk = nextQty;
      const requiredMatcha = nextQty;
      const missingMilk = Math.max(0, requiredMilk - state.items.milk);
      const missingMatcha = Math.max(0, requiredMatcha - state.items.matcha);
      const cost = missingMilk * PRICES.milk + missingMatcha * PRICES.matcha;

      if (state.cash >= cost) {
        state.recipes[product].qty++;
        render();
      } else {
        showpurchaseBlockedPopup("matchaLatte");
      }
    } else {
      const nextQty = state.recipes[product].qty + 1;
      const requiredMilk = nextQty;
      const requiredBeans = nextQty;
      const missingMilk = Math.max(0, requiredMilk - state.items.milk);
      const missingBeans = Math.max(0, requiredBeans - state.items.beans);
      const cost = missingMilk * PRICES.milk + missingBeans * PRICES.beans;

      if (state.cash >= cost) {
        state.recipes[product].qty++;
        render();
      } else {
        showpurchaseBlockedPopup("coffee");
      }
    }
    return;
  }

  // recipe decrease
  if (action === "recipe-dec") {
    if (!product || !state.recipes[product]) return;

    state.recipes[product].qty = Math.max(0, state.recipes[product].qty - 1);
    render();
    return;
  }

  // make coffee
  if (action === "make") {
    if (!product || !state.recipes[product]) return;

    const qty = state.recipes[product].qty;

    if (product === "matchaLatte") {
      const missingMilk = Math.max(0, qty - state.items.milk);
      const missingMatcha = Math.max(0, qty - state.items.matcha);
      const autoBuyCost =
        missingMilk * PRICES.milk + missingMatcha * PRICES.matcha;

      if (autoBuyCost > 0) {
        if (state.cash >= autoBuyCost) {
          state.items.milk += missingMilk;
          state.items.matcha += missingMatcha;
          state.cash -= autoBuyCost;
        } else {
          showpurchaseBlockedPopup("matchaLatte");
          return;
        }
      }

      if (qty > 0 && state.items.milk >= qty && state.items.matcha >= qty) {
        state.items.milk -= qty;
        state.items.matcha -= qty;
        state.products.matchaLatte += qty * MATCHA_LATTE_PER_RECIPE;
        console.log("MAKE CLICK MATCHA", Date.now());
        state.recipes[product].qty = 0;
        if (state.sellTimers[product] === null) {
          state.sellTimers[product] = Date.now() + 2000;
        }
        render();
      } else {
        showpurchaseBlockedPopup("matchaLatte");
      }
    } else {
      const missingMilk = Math.max(0, qty - state.items.milk);
      const missingBeans = Math.max(0, qty - state.items.beans);
      const autoBuyCost =
        missingMilk * PRICES.milk + missingBeans * PRICES.beans;

      if (autoBuyCost > 0) {
        if (state.cash >= autoBuyCost) {
          state.items.milk += missingMilk;
          state.items.beans += missingBeans;
          state.cash -= autoBuyCost;
        } else {
          showpurchaseBlockedPopup("coffee");
          return;
        }
      }

      if (qty > 0 && state.items.milk >= qty && state.items.beans >= qty) {
        state.items.milk -= qty;
        state.items.beans -= qty;
        state.products.coffee += qty * COFFEE_PER_RECIPE;
        console.log("MAKE CLICK COFFEE", Date.now());
        state.recipes[product].qty = 0;
        if (state.sellTimers[product] === null) {
          state.sellTimers[product] = Date.now() + 2000;
        }
        render();
      } else {
        showpurchaseBlockedPopup("coffee");
      }
    }
  }
}

function handleInfoClick(event) {
  if (event.target.dataset.action === "close-info") {
    infoPanelEl.classList.add("hidden");
  }
}

// ======================
// DRAGGABLE PANELS (UI interaction)
// ======================
function makePanelDraggable(panelEl) {
  const header = panelEl.querySelector(".panel-header");
  let dragging = false,
    offsetX = 0,
    offsetY = 0;

  header.addEventListener("mousedown", (e) => {
    dragging = true;
    offsetX = e.clientX - panelEl.offsetLeft;
    offsetY = e.clientY - panelEl.offsetTop;
  });

  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    panelEl.style.left = `${e.clientX - offsetX}px`;
    panelEl.style.top = `${e.clientY - offsetY}px`;
  });

  document.addEventListener("mouseup", () => (dragging = false));
}

// ======================
// GAME LOOP (auto updates)
// ======================
function startSystemLoop() {
  if (tickIntervalId) return;

  tickIntervalId = setInterval(() => {
    let didSell = false;
    const now = Date.now();

    if (
      state.products.coffee > 0 &&
      state.sellTimers.coffee !== null &&
      now >= state.sellTimers.coffee
    ) {
      state.cash += 5;
      state.products.coffee--;
      didSell = true;

      if (state.products.coffee > 0) {
        state.sellTimers.coffee = Date.now() + 2000;
      } else {
        state.sellTimers.coffee = null;
      }
    }

    if (
      state.products.matchaLatte > 0 &&
      state.sellTimers.matchaLatte !== null &&
      now >= state.sellTimers.matchaLatte
    ) {
      state.cash += 12;
      state.products.matchaLatte--;
      didSell = true;

      if (state.products.matchaLatte > 0) {
        state.sellTimers.matchaLatte = Date.now() + 2000;
      } else {
        state.sellTimers.matchaLatte = null;
      }
    }

    if (didSell) {
      render();
    }
  }, 250);
}

// ======================
// INIT (entry point)
// ======================
function init() {
  mainBodyEl.addEventListener("click", handleMainClick);
  infoPanelEl.addEventListener("click", handleInfoClick);
  makePanelDraggable(mainPanelEl);
  makePanelDraggable(infoPanelEl);
  startSystemLoop();
  render();
}

init();
