// Warna ikon per regional
const regionalColors = {
  "REGIONAL 2": "red",
  "REGIONAL 3": "blue",
  "REGIONAL 4": "green",
  "REGIONAL 5": "orange",
  "REGIONAL 6": "purple"
};

// Peta Indonesia
const map = L.map("map").setView([-2.5, 118], 5);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

// Fungsi buat icon balon warna-warni
function createColoredIcon(color) {
  return L.icon({
    iconUrl: `https://chart.googleapis.com/chart?chst=d_map_pin_icon&chld=home|${color}`,
    iconSize: [30, 50],
    iconAnchor: [15, 45],
    popupAnchor: [0, -40]
  });
}

// Load CSV
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

      // Tambahkan marker balon warna sesuai regional
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
    });

    addLegend();
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
