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

// Fungsi buat ikon balon warna-warni
function createColoredIcon(color) {
  return L.icon({
    iconUrl: `https://chart.googleapis.com/chart?chst=d_map_pin_icon&chld=home|${color}`,
    iconSize: [30, 50],
    iconAnchor: [15, 45],
    popupAnchor: [0, -40]
  });
}

let allMarkers = []; // simpan semua marker agar bisa dicari nanti

// Load CSV data
Papa.parse("data.csv", {
  download: true,
  header: true,
  complete: function (results) {
    results.data.forEach((row) => {
      const lat = parseFloat(row["LATITUDE"]);
      const lon = parseFloat(row["LONGITUDE"]);
      if (!lat || !lon) return;

      const regional = row["REGIONAL"];
      const color = regionalColors[regional] || "gray";
      const icon = createColoredIcon(color);

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

      allMarkers.push({ nopen: row["NOPEN INDUK"], marker: marker });
    });

    addLegend();
    addSearchBox();
  }
});

// Tambah legend warna
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

// Tambah kolom pencarian NOPEN di pojok atas
function addSearchBox() {
  const searchBox = L.control({ position: "topleft" });

  searchBox.onAdd = function () {
    const div = L.DomUtil.create("div", "search-box");
    div.innerHTML = `
      <input type="text" id="searchNopen" placeholder="Cari NOPEN...">
      <button id="btnSearch">Cari</button>
    `;
    return div;
  };

  searchBox.addTo(map);

  document.getElementById("btnSearch").addEventListener("click", () => {
    const input = document.getElementById("searchNopen").value.trim();
    if (!input) return alert("Masukkan NOPEN terlebih dahulu!");

    const found = allMarkers.find(m => m.nopen === input);
    if (found) {
      map.setView(found.marker.getLatLng(), 12);
      found.marker.openPopup();
    } else {
      alert("NOPEN tidak ditemukan!");
    }
  });
}
