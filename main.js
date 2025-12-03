// Warna ikon per regional
const regionalColors = {
  "REGIONAL 1": "yellow",
  "REGIONAL 2": "red",
  "REGIONAL 3": "blue",
  "REGIONAL 4": "green",
  "REGIONAL 5": "orange",
  "REGIONAL 6": "violet"
};

let map = L.map('map').setView([-2.5, 118], 5);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19
}).addTo(map);

let allMarkers = [];
let csvData = [];

// === LOAD CSV ===
Papa.parse("data.csv", {
  download: true,
  header: true,
  complete: function(result) {
    csvData = result.data;
    renderMarkers();
  }
});

// === RENDER MARKER SESUAI FILTER ===
function renderMarkers() {
  allMarkers.forEach(m => map.removeLayer(m));
  allMarkers = [];

  const checked = [...document.querySelectorAll('.paketFilter:checked')].map(x => x.value);
  const useFilter = checked.length > 0;

  csvData.forEach(row => {
    if (!row.LAT || !row.LONG) return;

    // FILTER: tampilkan hanya paket yang dicentang
    if (useFilter) {
      if (!checked.includes(row.PAKET)) return;
    }

    let color = regionalColors[row.REGIONAL] || "gray";

    let icon = L.divIcon({
      className: "custom-marker",
      html: `<i style='color:${color};font-size:18px'>⬤</i>`
    });

    let marker = L.marker([row.LAT, row.LONG], { icon }).addTo(map);

    let popupHTML = `
      <h3>${row.NAMA}</h3>
      <dl>
        <dt>Regional:</dt><dd>${row.REGIONAL}</dd>
        <dt>Paket:</dt><dd>${row.PAKET}</dd>
        <dt>Alamat:</dt><dd>${row.ALAMAT}</dd>
      </dl>
    `;

    marker.bindPopup(popupHTML);
    allMarkers.push(marker);
  });
}

// === EVENT FILTER CHECKBOX ===
document.querySelectorAll(".paketFilter").forEach(cb => {
  cb.addEventListener("change", renderMarkers);
});

// === SEARCH ===
document.getElementById("searchBox").addEventListener("keyup", function () {
  let q = this.value.toLowerCase();

  allMarkers.forEach(marker => {
    let name = marker.getPopup().getContent().toLowerCase();
    if (name.includes(q)) {
      marker.setOpacity(1);
    } else {
      marker.setOpacity(0.2);
    }
  });
});
