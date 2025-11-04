// Daftar warna untuk tiap regional
const regionalColors = {
  "REGIONAL 2": "red",
  "REGIONAL 3": "blue",
  "REGIONAL 4": "green",
  "REGIONAL 5": "orange",
  "REGIONAL 6": "purple"
};

// Inisialisasi peta Indonesia
const map = L.map('map').setView([-2.5, 118], 5);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Fungsi load CSV pakai PapaParse
Papa.parse("data.csv", {
  download: true,
  header: true,
  complete: function(results) {
    results.data.forEach(row => {
      const lat = parseFloat(row["LATITUDE"]);
      const lon = parseFloat(row["LONGITUDE"]);
      if (!lat || !lon) return;

      const regional = row["REGIONAL"];
      const color = regionalColors[regional] || "gray";

      // Tambahkan marker warna sesuai regional
      const marker = L.circleMarker([lat, lon], {
        radius: 8,
        fillColor: color,
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(map);

      // Popup detail kantor
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

    // Setelah semua marker ditambahkan, tampilkan legend
    addLegend();
  }
});

// Fungsi untuk menambahkan legend warna di pojok kanan bawah
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
