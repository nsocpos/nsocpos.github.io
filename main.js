// Warna ikon per Paket
const PaketColors = {
  "PAKET 1": "yellow",
  "PAKET 2A": "red",
  "PAKET 2B": "blue",
  "PAKET 3A": "green",
  "PAKET 3B": "orange",
  "PAKET 4": "violet"
};

// Inisialisasi map
const map = L.map("map").setView([-2.5, 118], 5);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18
}).addTo(map);

// ICON MARKER
function createBalloonIcon(color) {
  return L.icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [0, -35],
    shadowSize: [41, 41]
  });
}

let allMarkers = [];
let allNopen = [];

// LOAD CSV
Papa.parse("data.csv", {
  download: true,
  header: true,
  complete: function (results) {

    results.data.forEach((row) => {
      const lat = parseFloat(row["LATITUDE"]);
      const lon = parseFloat(row["LONGITUDE"]);
      if (!lat || !lon) return;

      const paket = row["Paket"];
      const colorName = PaketColors[paket] || "gray";
      const icon = createBalloonIcon(colorName);

      const marker = L.marker([lat, lon], { icon });

      marker.bindPopup(`
        <h3>${row["NAMA KANTOR"]}</h3>
        <dl>
          <dt>NOPEN:</dt><dd>${row["NOPEN"]}</dd>
          <dt>Paket:</dt><dd>${row["Paket"]}</dd>
          <dt>Regional:</dt><dd>${row["REGIONAL"]}</dd>
          <dt>Jenis Kantor:</dt><dd>${row["JENIS KANTOR"]}</dd>
          <dt>Status PSO:</dt><dd>${row["Status PSO"]}</dd>
          <dt>Alamat:</dt><dd>${row["ALAMAT"]}</dd>
          <dt>Provinsi:</dt><dd>${row["PROVINSI"]}</dd>
        </dl>
      `);

      allMarkers.push({
        paket: row["Paket"],
        nopen: row["NOPEN"],
        nama: row["NAMA KANTOR"],
        marker
      });

      allNopen.push({
        label: `${row["NOPEN"]} - ${row["NAMA KANTOR"]}`,
        value: row["NOPEN"]
      });
    });

    addSearchBox();
    applyFilter(); // tampilkan marker pertama kali
    initFilter();
  }
});

// === FILTER CHECKBOX ===
function initFilter() {
  document.querySelectorAll(".paketFilter").forEach(cb => {
    cb.addEventListener("change", applyFilter);
  });
}

function applyFilter() {
  const selected = [...document.querySelectorAll(".paketFilter:checked")]
    .map(cb => cb.value);

  allMarkers.forEach(item => {
    if (selected.includes(item.paket)) {
      map.addLayer(item.marker);
    } else {
      map.removeLayer(item.marker);
    }
  });
}

// === SEARCH ===
function addSearchBox() {
  const searchBox = L.control({ position: "topleft" });

  searchBox.onAdd = function () {
    const div = L.DomUtil.create("div", "search-container");
    div.innerHTML = `
      <div class="search-wrapper">
        <input type="text" id="searchNopen" placeholder="🔍 Cari NOPEN atau Nama Kantor...">
        <div id="suggestions" class="suggestions"></div>
      </div>
    `;
    return div;
  };

  searchBox.addTo(map);

  const input = document.getElementById("searchNopen");
  const suggestions = document.getElementById("suggestions");

  input.addEventListener("input", () => {
    const value = input.value.toLowerCase();
    suggestions.innerHTML = "";

    if (value.length < 2) return;

    const filtered = allNopen.filter(item =>
      item.label.toLowerCase().includes(value)
    );

    filtered.slice(0, 10).forEach(item => {
      const div = document.createElement("div");
      div.textContent = item.label;
      div.classList.add("suggestion-item");

      div.addEventListener("click", () => {
        input.value = item.value;
        suggestions.innerHTML = "";
        searchNopen(item.value);
      });

      suggestions.appendChild(div);
    });
  });

  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchNopen(input.value.trim());
  });
}

const highlightIcon = L.icon({
  iconUrl: "https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-gold.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

// FUNC SEARCH
function searchNopen(nopen) {
  const target = allMarkers.find(
    m => m.nopen.toString().trim() === nopen.toString().trim()
  );

  if (!target) return alert("NOPEN tidak ditemukan!");

  // auto centering
  map.setView(target.marker.getLatLng(), 12);

  // highlight
  const originalIcon = target.marker.options.icon;
  target.marker.setIcon(highlightIcon);

  setTimeout(() => target.marker.setIcon(originalIcon), 2000);

  // buka popup
  setTimeout(() => target.marker.openPopup(), 300);
}
