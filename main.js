// Warna ikon per regional
const regionalColors = {
  "REGIONAL 1": "yellow",
  "REGIONAL 2": "red",
  "REGIONAL 3": "blue",
  "REGIONAL 4": "green",
  "REGIONAL 5": "orange",
  "REGIONAL 6": "purple"
};

// Inisialisasi peta di tengah Indonesia
const map = L.map("map").setView([-2.5, 118], 5);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

// === ICON BALON ===
// Pakai ikon kustom (balon udara gaya pin)
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

let allMarkers = []; // untuk menyimpan semua marker
let allNopen = [];   // untuk autocomplete

// === LOAD CSV ===
Papa.parse("data.csv", {
  download: true,
  header: true,
  complete: function (results) {
    results.data.forEach((row) => {
      const lat = parseFloat(row["LATITUDE"]);
      const lon = parseFloat(row["LONGITUDE"]);
      if (!lat || !lon) return;

      const regional = row["REGIONAL"];
      const colorName = regionalColors[regional] || "grey";
      const icon = createBalloonIcon(colorName);

      const marker = L.marker([lat, lon], { icon }).addTo(map);

      marker.bindPopup(`
        <b>${row["NAMA KANTOR"]}</b><br>
        NOPEN: ${row["NOPEN INDUK"]}<br>
        Regional: ${row["REGIONAL"]}<br>
        Jenis Kantor: ${row["JENIS KANTOR"]}<br>
        Status PSO: ${row["Status PSO"]}<br>
        Alamat: ${row["ALAMAT"]}<br>
        Provinsi: ${row["PROVINSI"]}
      `);

      allMarkers.push({
        nopen: row["NOPEN INDUK"],
        nama: row["NAMA KANTOR"],
        marker: marker
      });

      allNopen.push({
        label: `${row["NOPEN INDUK"]} - ${row["NAMA KANTOR"]}`,
        value: row["NOPEN INDUK"]
      });
    });

    addLegend();
    addSearchBox();
  }
});

// === LEGEND ===
function addLegend() {
  const legend = L.control({ position: "bottomright" });
  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "info legend");
    div.innerHTML = "<h4>Regional</h4>";
    for (const reg in regionalColors) {
      const color = regionalColors[reg];
      div.innerHTML += `
        <i style="background:${color}; width:15px; height:15px; display:inline-block; margin-right:6px;"></i> ${reg}<br>
      `;
    }
    return div;
  };
  legend.addTo(map);
}

// === SEARCH BOX DI TENGAH ATAS ===
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

  // === Auto-suggest ===
  input.addEventListener("input", () => {
    const value = input.value.toLowerCase();
    suggestions.innerHTML = "";

    if (value.length < 2) return; // baru muncul setelah 2 huruf

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
    if (e.key === "Enter") {
      searchNopen(input.value.trim());
    }
  });
}

// === FUNGSI PENCARIAN ===
function searchNopen(nopen) {
  const found = allMarkers.find(
    (m) => m.nopen.toString().trim() === nopen.toString().trim()
  );

  if (found) {
    map.setView(found.marker.getLatLng(), 12);
    found.marker.openPopup();
  } else {
    alert("NOPEN tidak ditemukan!");
  }
}
