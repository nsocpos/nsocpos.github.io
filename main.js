// Warna ikon per Paket
const PaketColors = {
  "PAKET 1": "yellow",
  "PAKET 2A": "red",
  "PAKET 2B": "blue",
  "PAKET 3A": "green",
  "PAKET 3B": "orange",
  "PAKET 4": "violet"
};

// Inisialisasi peta di tengah Indonesia
const map = L.map("map").setView([-2.5, 118], 5);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

// === ICON BALON ===
function createBalloonIcon(color) {
  return L.icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [0, -35],
    shadowSize: [41, 41]
  });
}

let allMarkers = [];
let allNopen = [];

// === LOAD CSV ===
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

      const marker = L.marker([lat, lon], { icon }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: 'Segoe UI'; line-height: 1;">
        <h3 style="margin: 0 0 8px;">${row["NAMA KANTOR"]}</h3>
        <dl style="margin: 8px 0; padding: 0; font-size: 0.9em;">
        <dt style="font-weight: bold; display: inline;">NOPEN:</dt>
        <dd style="display: inline; margin-left: 5px;">${row["NOPEN"]}</dd><br>

        <dt style="font-weight: bold; display: inline;">Paket:</dt>
        <dd style="display: inline; margin-left: 5px;">${row["Paket"]}</dd><br>

        <dt style="font-weight: bold; display: inline;">Regional:</dt>
        <dd style="display: inline; margin-left: 5px;">${row["REGIONAL"]}</dd><br>

        <dt style="font-weight: bold; display: inline;">Jenis Kantor:</dt>
        <dd style="display: inline; margin-left: 5px;">${row["JENIS KANTOR"]}</dd><br>

        <dt style="font-weight: bold; display: inline;">Status PSO:</dt>
        <dd style="display: inline; margin-left: 5px;">${row["Status PSO"]}</dd><br>

        <dt style="font-weight: bold; display: inline;">Alamat:</dt>
        <dd style="display: inline; margin-left: 5px;">${row["ALAMAT"]}</dd><br>

        <dt style="font-weight: bold; display: inline;">Provinsi:</dt>
        <dd style="display: inline; margin-left: 5px;">${row["PROVINSI"]}</dd>
      </dl>
    </div>
  `);

      allMarkers.push({
        nopen: row["NOPEN"],
        nama: row["NAMA KANTOR"],
        marker
      });

      allNopen.push({
        label: `${row["NOPEN"]} - ${row["NAMA KANTOR"]}`,
        value: row["NOPEN"]
      });
    });

    addLegend();
    addSearchBox();
  }
});

// === LEGEND BERDASARKAN PAKET ===
function addLegend() {
  const legend = L.control({ position: "bottomright" });
  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "info legend");
    div.innerHTML = "<h4>Paket Layanan</h4>";
    for (const p in PaketColors) {
      const color = PaketColors[p];
      div.innerHTML += `
        <i style="background:${color}; width:15px; height:15px; display:inline-block; margin-right:6px;"></i> ${p}<br>
      `;
    }
    return div;
  };
  legend.addTo(map);
}

// === SEARCH BOX ===
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

    const filtered = allNopen.filter((item) =>
      item.label.toLowerCase().includes(value)
    );

    filtered.slice(0, 10).forEach((item) => {
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
  iconUrl:
    'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-gold.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -35],
  shadowSize: [41, 41]
});

// === FUNGSI PENCARIAN ===
function searchNopen(nopen) {
  const targetNopen = nopen.toString().trim();
  const found = allMarkers.find(m => m.nopen.toString().trim() === targetNopen);

  if (found) {
    const originalIcon = found.marker.options.icon;
    found.marker.setIcon(highlightIcon);
    const latlng = found.marker.getLatLng();
    map.setView(latlng, 12, { animate: true });

    setTimeout(() => {
      found.marker.openPopup();
      setTimeout(() => found.marker.setIcon(originalIcon), 2000);
    }, 300);
  } else {
    alert("NOPEN tidak ditemukan: " + targetNopen);
  }
}
