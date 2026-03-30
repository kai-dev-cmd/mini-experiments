// ======================
// STATE (manages game data)
// ======================
const state = {
  // starting cash
  cash: 100,

  // expenses tracking (for info panel)
  expenses: {
    ingredients: 0,
    waste: 0,
  },

  // ingredients
  items: {
    milk: 0,
    beans: 0,
    matcha: 0,
  },

  // products
  products: {
    coffee: {
      stock: [],
      isProducing: false,
      type: "finished",
    },
    matchaLatte: {
      stock: [],
      isProducing: false,
      type: "finished",
    },
  },

  customer: {
    list: [],
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
const SERVINGS_PER_BATCH = 5;
const COFFEE_PRODUCTION_TIME_MS = 8000;
const MATCHA_LATTE_PRODUCTION_TIME_MS = 15000;
const SERVE_PRICE = 5;
const SPOIL_TIME = 20000; // 20 seconds
const CUSTOMERS = [
  {
    name: "Jack",
    order: "coffee",
    label: "coffee",
    dialogue: "A cup of coffee, please!",
    thankYou: "Thanks, that smells amazing!",
    angry: "Hey! I've been waiting forever...",
    price: 5,
  },
  {
    name: "Evie",
    order: "matchaLatte",
    label: "matcha latte",
    dialogue: "Uhh...can I like get a matcha latte?",
    thankYou: "Yay thanks! This looks so good 💚",
    angry: "Umm… hello?? I’ve been waiting 😒",
    price: 5,
  },
];

// ======================
// DOM REFERENCES (UI hooks)
// ======================
const mainBodyEl = document.getElementById("mainBody");
const infoBodyEl = document.getElementById("infoBody");
const mainPanelEl = document.getElementById("mainPanel");
const infoPanelEl = document.getElementById("infoPanel");
const customerBodyEl = document.getElementById("customerBody");
const customerPanelEl = document.getElementById("customerPanel");

// ======================
// SYSTEM VARIABLES (runtime)
// ======================
let quickInfoPopupEl = null;
let quickInfoCloseTimeoutId = null;
let purchaseBlockedPopupEl = null;
let purchaseBlockedTimeoutId = null;
let customerPopupActive = false;

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

// popup for purchases

let purchasedPopupEl = null;
let purchasedTimeoutId = null;

function removePurchasedPopup() {
  if (purchasedTimeoutId !== null) {
    clearTimeout(purchasedTimeoutId);
    purchasedTimeoutId = null;
  }
  if (purchasedPopupEl) {
    purchasedPopupEl.remove();
    purchasedPopupEl = null;
  }
}

function showPurchasedPopup() {
  removePurchasedPopup();

  purchasedPopupEl = document.createElement("div");
  purchasedPopupEl.style =
    "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:#22c55e;color:#fff;padding:10px 12px;border-radius:6px;z-index:9999;";

  purchasedPopupEl.innerHTML = `
    <div>Purchased!</div>
    <div class="popup-bar-container"><div class="popup-bar"></div></div>
  `;

  document.body.appendChild(purchasedPopupEl);

  const bar = purchasedPopupEl.querySelector(".popup-bar");
  if (bar) {
    bar.style.transitionDuration = "2s";
    setTimeout(() => (bar.style.width = "0%"), 0);
  }

  purchasedTimeoutId = setTimeout(removePurchasedPopup, 2000);
}

// new customer pop up
function showCustomerPopup() {
  if (customerPopupActive) return;

  customerPopupActive = true;

  const el = document.createElement("div");
  el.style =
    "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:#111;color:#fff;padding:16px;border-radius:8px;z-index:9999;";
  el.innerText = "New Customer Request";

  document.body.appendChild(el);

  setTimeout(() => {
    el.remove();
    customerPopupActive = false;
  }, 2000);
}

// serve popup
function showServePopup(amount) {
  const el = document.createElement("div");
  el.style =
    "position:fixed;left:50%;top:40%;transform:translate(-50%,-50%);background:#22c55e;color:#fff;padding:10px 14px;border-radius:6px;z-index:9999;font-weight:bold;";
  el.innerText = `+ $${amount}`;

  document.body.appendChild(el);

  setTimeout(() => el.remove(), 1000);
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

// updates customer progress bars
function updateCustomerProgressBar() {
  const customers = state.customer.list;
  if (!customers.length) return;

  customers.forEach((customer) => {
    const bar = document.querySelector(
      `[data-progress-id="${customer.startTime}"]`,
    );
    if (!bar) return;

    const elapsed = Date.now() - customer.startTime;
    const progress = Math.max(0, 1 - elapsed / customer.duration);

    bar.style.width = `${progress * 100}%`;
    bar.style.background =
      progress > 0.6 ? "#22c55e" : progress > 0.3 ? "#eab308" : "#ef4444";
  });
}

// determines stock state based on age for finished products
function getStockState(item) {
  const age = Date.now() - item.createdAt;
  const ratio = age / SPOIL_TIME;

  if (ratio < 0.5) return "fresh";
  if (ratio < 0.8) return "warning";
  return "spoiled";
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

          <div class="qty">
            <button data-action="purchase-dec" data-item="${key}">-</button>
            <span>${qty}</span>
            <button data-action="purchase-inc" data-item="${key}">+</button>
          </div>

          <div class="text-center">$${totalPrice}</div>

          <div>
            <button data-action="buy" data-item="${key}" ${canBuy ? "" : "disabled"}>Buy</button>
          </div>

          <div class="stock-cell">
            <div class="stock-text ${meta.statusClass}">
              ${stock === 0 ? "Out of Stock" : stock <= 3 ? `${stock} Low` : stock}
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="table-head inventory">
      <div>Item</div>
      <div>Qty</div>
      <div>Total Price</div>
      <div></div>
      <div>Stock</div>
    </div>
    ${rows}
  `;
}

// recipe table
function renderRecipesContent() {
  const coffeeStock = state.products.coffee.stock;
  const matchaLatteStock = state.products.matchaLatte.stock;
  const coffeeIsProducing = state.products.coffee.isProducing;
  const matchaIsProducing = state.products.matchaLatte.isProducing;
  const coffeeQty = state.recipes.coffee.qty;
  const matchaLatteQty = state.recipes.matchaLatte.qty;
  const coffeeTotalCost = coffeeQty * (PRICES.milk + PRICES.beans);
  const matchaTotalCost = matchaLatteQty * (PRICES.milk + PRICES.matcha);
  const canAffordCoffee = state.cash >= PRICES.milk + PRICES.beans;
  const canAffordMatcha = state.cash >= PRICES.milk + PRICES.matcha;
  const canMakeCoffee =
    coffeeQty > 0 &&
    state.items.milk >= coffeeQty &&
    state.items.beans >= coffeeQty;
  const canMakeMatchaLatte =
    matchaLatteQty > 0 &&
    state.items.milk >= matchaLatteQty &&
    state.items.matcha >= matchaLatteQty;
  const canStartCoffee = coffeeQty > 0 && !coffeeIsProducing;
  const coffeeIsReady = coffeeQty > 0;
  const canStartMatchaLatte = matchaLatteQty > 0 && !matchaIsProducing;
  const matchaIsReady = matchaLatteQty > 0;
  const coffeeMeta = stockMeta(coffeeStock.length);
  const coffeeHasSpoiled = state.products.coffee.stock.some(
    (item) => getStockState(item) === "spoiled",
  );
  const matchaMeta = stockMeta(matchaLatteStock.length);
  const matchaHasSpoiled = state.products.matchaLatte.stock.some(
    (item) => getStockState(item) === "spoiled",
  );

  return `
    <div class="table-head recipes">
      <div>Product</div>
      <div>Serve</div>
      <div>Qty</div>
      <div></div>
      <div>Stock</div>
    </div>

    <div class="row recipes ${coffeeMeta.rowClass}">
      <div>Coffee <button data-action="quick-info" data-product="coffee">i</button></div>
      <div>$${SERVE_PRICE} / per serving</div>

    <div class="qty">
      <button data-action="recipe-dec" data-product="coffee">-</button>
      <span>${coffeeQty}</span>
      <button data-action="recipe-inc" data-product="coffee">+</button>
      ${coffeeTotalCost > 0 ? `<span style="opacity:0.8;">-$${coffeeTotalCost}</span>` : ""}
    </div>

    <div style="display:flex; gap:6px;">
      <button data-action="make" data-product="coffee" 
      class="${
        coffeeIsProducing
          ? "btn-green"
          : coffeeIsReady
            ? "btn-green"
            : canAffordCoffee
              ? "btn-yellow"
              : "btn-red"
      }"
      >
        ${
          coffeeIsProducing
            ? Math.ceil((state.products.coffee.endTime - Date.now()) / 1000) +
              "s"
            : "Make"
        }
      </button>

      <button 
        data-action="waste" 
        data-product="coffee" 
        class="btn-red"
        ${coffeeHasSpoiled ? "" : "disabled"}
      >
        Waste
      </button>
    </div>

    <div class="stock-cell">
      <div>
        ${coffeeStock.length === 0 ? "Out of Stock" : coffeeStock.length}
      </div>
        <div class="stock-blocks">
        ${state.products.coffee.stock
          .map((item) => {
            const s = getStockState(item);
            return `<div class="stock-block ${s}"></div>`;
          })
          .join("")}
    </div>
  </div>
</div>

    <div class="row recipes ${matchaMeta.rowClass}">
      <div>Matcha Latte <button data-action="quick-info" data-product="matchaLatte">i</button></div>
        <div>$${SERVE_PRICE} / per serving</div>

    <div class="qty">
      <button data-action="recipe-dec" data-product="matchaLatte">-</button>
      <span>${matchaLatteQty}</span>
      <button data-action="recipe-inc" data-product="matchaLatte">+</button>
      ${matchaTotalCost > 0 ? `<span style="opacity:0.8;">-$${matchaTotalCost}</span>` : ""}
    </div>

    <div style="display:flex; gap:6px;">
      <button data-action="make" data-product="matchaLatte" 
      class="${
        matchaIsProducing
          ? "btn-green"
          : matchaIsReady
            ? "btn-green"
            : canAffordMatcha
              ? "btn-yellow"
              : "btn-red"
      }"
      >
        ${
          matchaIsProducing
            ? Math.ceil((state.products.matchaLatte.endTime - Date.now()) / 1000) +
              "s"
            : "Make"
        }
      </button>

      <button 
        data-action="waste" 
        data-product="matchaLatte" 
        class="btn-red"
        ${matchaHasSpoiled ? "" : "disabled"}
      >
        Waste
      </button>
    </div>

    <div class="stock-cell">
      <div>
        ${matchaLatteStock.length === 0 ? "Out of Stock" : matchaLatteStock.length}
      </div>
      <div class="stock-blocks">
        ${state.products.matchaLatte.stock
          .map((item) => {
            const s = getStockState(item);
            return `<div class="stock-block ${s}"></div>`;
          })
          .join("")}
    </div>
  </div>
</div>
  `;
}

// main render (rebuilds entire UI)

function renderCustomerPanel() {
  const customers = state.customer.list;

  if (!customers.length) {
    return `
      <div class="customer-panel" style="padding:10px;border:1px solid #ddd;border-radius:6px;opacity:0.7;">
        <div>No customers at the moment...</div>
        <div style="font-size:12px;opacity:0.6;">Waiting for next order</div>
      </div>
    `;
  }

  return customers
    .map((customer) => {
      const product = state.products[customer.order];
      const hasStock = product && product.stock.length > 0;

      const elapsed = Date.now() - customer.startTime;
      const progress = Math.max(0, 1 - elapsed / customer.duration);

      return `
      <div class="customer-panel" style="margin-bottom:12px;padding:10px;border:1px solid #ddd;border-radius:6px;">
        ${customer.name}: ${
          customer.phase === "served"
            ? customer.thankYou
            : customer.phase === "expired"
              ? customer.angry
              : customer.dialogue
        }

        ${
          customer.phase === "ordering"
            ? `
        <div style="margin-top:8px;">
          <button 
            data-action="serve-customer"
            data-product="${customer.order}"
            data-id="${customer.startTime}"
            style="background:${hasStock ? "#22c55e" : "#ef4444"}"
            ${hasStock ? "" : "disabled"}
          >
            Serve
          </button>
        </div>`
            : ""
        }

         ${
           customer.phase === "ordering"
             ? `
        <div style="margin-top:8px;">
          <div style="height:6px;background:#eee;border-radius:4px;">
            <div data-progress-id="${customer.startTime}" style="
              height:100%;
              width:${progress * 100}%;
              background:${
                progress > 0.6
                  ? "#22c55e" // green
                  : progress > 0.3
                    ? "#eab308" // yellow
                    : "#ef4444" // red
              };
            "></div>
          </div>
        </div>`
             : ""
         }

      </div>
    `;
    })
    .join("");
}

function render() {
  const totalFinishedStock =
    state.products.coffee.stock.length +
    state.products.matchaLatte.stock.length;

  const inventoryTabClass =
    state.ui.activeTab === "inventory" ? "tab active" : "tab";
  const recipesTabClass =
    state.ui.activeTab === "recipes" ? "tab active" : "tab";

  mainBodyEl.innerHTML = `
    <div class="top-bar">
      <div>Cash: $${state.cash}</div>
      <div>Ready Servings: <span class="profit-value">${totalFinishedStock}</span></div>
      <div>Expenses: $${state.expenses.ingredients + state.expenses.waste}</div>
      <div style="opacity:0.7;">Waste: $${state.expenses.waste}</div>
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

  // customer panel content

  customerBodyEl.innerHTML = renderCustomerPanel();

  // info panel content

  infoBodyEl.innerHTML = `
  <div class="summary-line"><strong>📊 Summary</strong></div>
  <div class="summary-line">Coffee Stock: ${state.products.coffee.stock.length}</div>
  <div class="summary-line">Matcha Latte Stock: ${state.products.matchaLatte.stock.length}</div>
  <div class="summary-line">Serve Value: $${SERVE_PRICE} each</div>

  <div class="summary-line" style="margin-top:12px;"><strong>☕ Coffee</strong></div>
  <div class="summary-line">Servings Per stock: +5</div>
  <div class="summary-line">Ingredients: 1 Milk + 1 Coffee Bean</div>
  <div class="summary-line">Cost: $19</div>
  <div class="summary-line">Production Time: 8s</div>

  <div class="summary-line" style="margin-top:12px;"><strong>🍵 Matcha Latte</strong></div>
  <div class="summary-line">Servings Per stock: +5</div>
  <div class="summary-line">Ingredients: 1 Milk + 1 Matcha</div>
  <div class="summary-line">Cost: $22</div>
  <div class="summary-line">Production Time: 15s</div>
`;
}

// serve product to customer
function serveProduct(productType, id) {
  const customer = state.customer.list.find((c) => c.startTime == id);
  if (!customer) return;

  const product = state.products[productType];
  if (!product || product.stock.length <= 0) return;
  if (customer.order !== productType) return;

  const tip = calculateTip(customer);

  product.stock.shift();
  state.cash += customer.price + tip;

  showServePopup(customer.price + tip);

  customer.phase = "served";

  setTimeout(() => {
    const index = state.customer.list.indexOf(customer);
    if (index !== -1) {
      state.customer.list.splice(index, 1);
      render();
    }
  }, 1500);

  render();
}

// spawn customer
function spawnCustomer() {
  if (state.customer.list.length >= 5) return;

  const base = getRandomCustomer();

  const newCustomer = {
    ...base,
    duration: 20000,
    startTime: Date.now(),
    phase: "ordering",
    maxTip: 5,
  };

  state.customer.list.push(newCustomer);

  // expiration logic
  setTimeout(() => {
    if (!state.customer.list.includes(newCustomer)) return;

    newCustomer.phase = "expired";
    render();

    setTimeout(() => {
      const index = state.customer.list.indexOf(newCustomer);
      if (index !== -1) {
        state.customer.list.splice(index, 1);
        render();
      }
    }, 1500);
  }, newCustomer.duration);

  // IMPORTANT: popup trigger
  if (state.customer.list.length === 1) {
    showCustomerPopup();
  }

  render();
}

function calculateTip(customer) {
  const elapsed = Date.now() - customer.startTime;
  const ratio = 1 - elapsed / customer.duration;

  const tip = Math.max(0, Math.floor(customer.maxTip * ratio));
  return tip;
}

// random customer generator
function getRandomCustomer() {
  const randomIndex = Math.floor(Math.random() * CUSTOMERS.length);
  return CUSTOMERS[randomIndex];
}

function acceptCustomer() {
  const customer = state.customer.active;
  if (!customer) return;

  customer.timer = setTimeout(() => {
    state.customer.active = null;
    render();
  }, customer.duration);

  render();
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

  if (action === "serve") {
    if (!product) return;
    serveProduct(product);
    return;
  }

  if (action === "accept-customer") {
    acceptCustomer();
    return;
  }

  if (action === "serve-customer") {
    const product = target.dataset.product;
    const id = target.dataset.id;
    serveProduct(product, id);
    return;
  }

  // waste spoiled products
  if (action === "waste") {
    const productState = state.products[product];

    if (!productState || productState.stock.length === 0) return;

    const spoiled = productState.stock.filter(
      (item) => getStockState(item) === "spoiled",
    );

    const wasteCost = spoiled.length * 2;

    productState.stock = productState.stock.filter(
      (item) => getStockState(item) !== "spoiled",
    );

    state.cash -= wasteCost;

    render();
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
      showPurchasedPopup();
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

    const productState = state.products[product];
    if (!productState || productState.isProducing) return;

    const qty = state.recipes[product].qty;
    if (qty <= 0) return;

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
          showPurchasedPopup();
        } else {
          showpurchaseBlockedPopup("matchaLatte");
          return;
        }
      }

      if (!(state.items.milk >= qty && state.items.matcha >= qty)) {
        showpurchaseBlockedPopup("matchaLatte");
        return;
      }

      if (qty > 0 && state.items.milk >= qty && state.items.matcha >= qty) {
        state.items.milk -= qty;
        state.items.matcha -= qty;
        state.recipes[product].qty = 0;
        productState.isProducing = true;
        productState.endTime = Date.now() + MATCHA_LATTE_PRODUCTION_TIME_MS;
        render();

        setTimeout(() => {
          for (let i = 0; i < qty * SERVINGS_PER_BATCH; i++) {
            productState.stock.push({
              createdAt: Date.now(),
            });
          }

          productState.isProducing = false;
          render();
        }, MATCHA_LATTE_PRODUCTION_TIME_MS);
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
          showPurchasedPopup();
        } else {
          showpurchaseBlockedPopup("coffee");
          return;
        }
      }

      if (!(state.items.milk >= qty && state.items.beans >= qty)) {
        showpurchaseBlockedPopup("coffee");
        return;
      }

      if (qty > 0 && state.items.milk >= qty && state.items.beans >= qty) {
        state.items.milk -= qty;
        state.items.beans -= qty;
        state.recipes[product].qty = 0;
        productState.isProducing = true;
        productState.endTime = Date.now() + COFFEE_PRODUCTION_TIME_MS;
        render();

        setTimeout(() => {
          for (let i = 0; i < qty * SERVINGS_PER_BATCH; i++) {
            productState.stock.push({
              createdAt: Date.now(),
            });
          }

          productState.isProducing = false;
          render();
        }, COFFEE_PRODUCTION_TIME_MS);
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
// INIT (entry point)
// ======================
function init() {
  mainBodyEl.addEventListener("click", handleMainClick);
  customerBodyEl.addEventListener("click", handleMainClick);
  infoPanelEl.addEventListener("click", handleInfoClick);

  makePanelDraggable(mainPanelEl);
  makePanelDraggable(infoPanelEl);
  makePanelDraggable(customerPanelEl);

  render();

  // customer loop defined INSIDE
  function startCustomerLoop() {
    setTimeout(() => {
      if (state.customer.list.length < 5) {
        spawnCustomer();
      }
      startCustomerLoop();
    }, 5000);
  }

  // start it INSIDE
  startCustomerLoop();

  // lightweight UI updates
  setInterval(updateCustomerProgressBar, 100);

  setInterval(() => {
    if (
      state.products.coffee.isProducing ||
      state.products.matchaLatte.isProducing
    ) {
      render();
    }
  }, 500);
}

init();
