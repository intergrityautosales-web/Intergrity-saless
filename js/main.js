// ===== Integrity Used Auto Sales — shared JS =====

const money = (n) => new Intl.NumberFormat('en-US').format(n);
const miles = (n) => new Intl.NumberFormat('en-US').format(n);

function carCardHTML(car) {
  const trimLabel = car.trim ? ` ${car.trim}` : '';
  const featureTags = (car.features && car.features.length)
    ? `<div class="car-tags">${car.features.slice(0, 4).map(f => `<span class="tag">${f}</span>`).join('')}${car.features.length > 4 ? `<span class="tag tag-muted">+${car.features.length - 4} more</span>` : ''}</div>`
    : '';
  const drivetrainMeta = car.drivetrain ? `<span>${car.drivetrain}</span>` : '';
  const downPaymentLine = (car.downPayment !== undefined && car.downPayment !== null)
    ? `<div class="car-down">${car.downPayment === 0 ? '$0 down' : `$${money(car.downPayment)} down`}</div>`
    : '';

  return `
    <article class="car-card">
      <div class="car-photo">
        <img src="${car.image}" alt="${car.make} ${car.model}${trimLabel} ${car.year}" loading="lazy">
        <span class="badge-verified">Verified</span>
      </div>
      <div class="car-body">
        <h3 class="car-title">${car.make} ${car.model}${trimLabel}</h3>
        <div class="car-meta">
          <span>${car.year}</span>
          <span>${miles(car.mileage)} mi</span>
          <span>${car.transmission}</span>
          ${drivetrainMeta}
        </div>
        ${featureTags}
        <p class="car-desc">${car.description}</p>
        <div class="car-footer">
          <div>
            <div class="car-price"><span class="cur">$</span>${money(car.price)}</div>
            ${downPaymentLine}
          </div>
          <a href="financing.html?vehicle=${encodeURIComponent(car.make + ' ' + car.model + trimLabel)}" class="btn btn-secondary">I'm interested</a>
        </div>
      </div>
    </article>
  `;
}

async function fetchInventory() {
  const res = await fetch('data/inventory.json');
  if (!res.ok) throw new Error('Unable to load inventory');
  const data = await res.json();
  const cars = Array.isArray(data) ? data : (data.vehicles || []);
  // only show available vehicles ("sold" ones stay in the file for history)
  return cars.filter(c => (c.status || 'available') !== 'sold');
}

// Renders a limited set on the homepage
async function renderFeatured(containerId, limit = 3) {
  const el = document.getElementById(containerId);
  if (!el) return;
  try {
    const cars = await fetchInventory();
    el.innerHTML = cars.length
      ? cars.slice(0, limit).map(carCardHTML).join('')
      : `<p class="empty-state">New inventory is being added — check back very soon, or <a href="contact.html">contact us</a> to ask about upcoming vehicles.</p>`;
  } catch (e) {
    el.innerHTML = `<p class="empty-state">Inventory temporarily unavailable.</p>`;
  }
}

// Full inventory page with filters
async function renderInventoryPage() {
  const grid = document.getElementById('car-grid');
  const countEl = document.getElementById('results-count');
  if (!grid) return;

  let allCars = [];
  try {
    allCars = await fetchInventory();
  } catch (e) {
    grid.innerHTML = `<p class="empty-state">Inventory temporarily unavailable. Please contact us directly.</p>`;
    return;
  }

  const makeSelect = document.getElementById('filter-make');
  const makes = [...new Set(allCars.map(c => c.make))].sort();
  makes.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m; opt.textContent = m;
    makeSelect.appendChild(opt);
  });

  function applyFilters() {
    const make = document.getElementById('filter-make').value;
    const priceMax = document.getElementById('filter-price').value;
    const search = document.getElementById('filter-search').value.toLowerCase();

    let filtered = allCars.filter(c => {
      if (make && c.make !== make) return false;
      if (priceMax && c.price > Number(priceMax)) return false;
      if (search && !(`${c.make} ${c.model}`.toLowerCase().includes(search))) return false;
      return true;
    });

    grid.innerHTML = filtered.length
      ? filtered.map(carCardHTML).join('')
      : `<p class="empty-state">No vehicles match these filters. Try broadening your search or <a href="contact.html">contact us</a> — we get new vehicles every week.</p>`;

    countEl.textContent = `${filtered.length} vehicle${filtered.length !== 1 ? 's' : ''} available`;
  }

  document.getElementById('filter-make').addEventListener('change', applyFilters);
  document.getElementById('filter-price').addEventListener('change', applyFilters);
  document.getElementById('filter-search').addEventListener('input', applyFilters);

  applyFilters();
}

// Pre-fill "vehicle" field on financing page from URL param
function prefillVehicleField() {
  const field = document.getElementById('vehicle-field');
  if (!field) return;
  const params = new URLSearchParams(window.location.search);
  const v = params.get('vehicle');
  if (v) field.value = v;
}

// Netlify form success handling (works with data-netlify + AJAX submit)
function setupFormSuccess(formId, successId) {
  const form = document.getElementById(formId);
  const success = document.getElementById(successId);
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(data).toString(),
    })
      .then(() => {
        form.style.display = 'none';
        if (success) success.classList.add('active');
      })
      .catch(() => {
        alert("Something went wrong. Please try again or call us directly.");
      });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderFeatured('featured-cars', 3);
  renderInventoryPage();
  prefillVehicleField();
  setupFormSuccess('financing-form', 'financing-success');
  setupFormSuccess('contact-form', 'contact-success');
});
