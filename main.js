// === DESKRIPSI PAKET ===
const PaketInfo = {
  "PAKET 1": "Main link 100 Mbps + Backup 100 Mbps + SDWAN (active-active)",
  "PAKET 2A": "Main link 50 Mbps + Backup 50 Mbps + SDWAN (active-active)",
  "PAKET 2B": "Main link 50 Mbps + Backup VSAT up to 6 Mbps + SDWAN (active-passive)",
  "PAKET 3A": "Main link 20 Mbps + Backup GSM M2M + SDWAN (active-standby)",
  "PAKET 3B": "Main link VSAT up to 2 Mbps + Backup GSM M2M + SDWAN (active-standby)",
  "PAKET 4": "GSM M2M + WiFi LTE Router + ZTNA"
};

// === FILTER PAKET ===
const paketSelect = document.getElementById("paketSelect");
const paketCheckboxes = document.querySelectorAll(".paket-checkbox");

paketSelect.addEventListener("change", function () {
  const selected = this.value;

  paketCheckboxes.forEach(div => div.style.display = "none");
  if (selected) document.getElementById(selected).style.display = "block";
});

// === PETA LEAFLET ===
const map = L.map("map").setView([-2.5, 118], 5);

// Basemap
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19
}).addTo(map);

// === LOAD CSV ===
Papa.parse("data.csv", {
  download: true,
  header: true,
  complete: function(results) {
    results.data.forEach(row => {
      if (!row.LAT || !row.LONG) return;

      const marker = L.marker([row.LAT, row.LONG]).addTo(map);

      marker.bindPopup(`
        <h3>${row["NAMA KANTOR"]}</h3>
        <dl>
          <dt>NOPEN:</dt><dd>${row["NOPEN"]}</dd>
          <dt>Paket:</dt><dd>${row["Paket"]}</dd>
          <dt>Keterangan Paket:</dt><dd>${PaketInfo[row["Paket"]] || "-"}</dd>
          <dt>Regional:</dt><dd>${row["REGIONAL"]}</dd>
          <dt>Jenis Kantor:</dt><dd>${row["JENIS KANTOR"]}</dd>
          <dt>Status PSO:</dt><dd>${row["Status PSO"]}</dd>
          <dt>Alamat:</dt><dd>${row["ALAMAT"]}</dd>
          <dt>Provinsi:</dt><dd>${row["PROVINSI"]}</dd>
        </dl>
      `);
    });
  }
});
