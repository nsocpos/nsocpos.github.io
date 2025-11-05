import L from "https://unpkg.com/leaflet@1.9.4/dist/leaflet-src.esm.js";

// Inisialisasi Peta
const map = L.map("map").setView([-2.5, 118], 5);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

let kantorData = [];
let markers = [];

// === Baca CSV pakai PapaParse ===
Papa.parse("data.csv", {
  download: true,
  header: true,
  complete: (results) => {
    kantorData = results.data;

    // Tambah marker ke peta
    kantorData.forEach((row) => {
      if (!row.LATITUDE || !row.LONGITUDE) return;

      const lat = parseFloat(row.LATITUDE);
      const lon = parseFloat(row.LONGITUDE);

      const marker = L.marker([lat, lon], {
        icon: L.icon({
          iconUrl:
            "https://cdn-icons-png.flaticon.com/512/854/854878.png", // ikon balon lokasi
          iconSize: [30, 40],
          iconAnchor: [15, 40],
          popupAnchor: [0, -35],
        }),
      })
        .addTo(map)
        .bindPopup(`
          <b>${row["NAMA KANTOR"]}</b><br>
          NOPEN: ${row["NOPEN"]}<br>
          REGIONAL: ${row["REGIONAL"]}<br>
          ALAMAT: ${row["ALAMAT"]}<br>
          PROVINSI: ${row["PROVINSI"]}
        `);

      markers.push({ nopen: row["NOPEN"], marker });
    });
  },
});

// === Fitur Pencarian ===
const searchInput = document.getElementById("searchInput");
const clearBtn = document.getElementById("clearBtn");
const suggestionsBox = document.getElementById("suggestions");

searchInput.addEventListener("input", () => {
  const keyword = searchInput.value.trim().toLowerCase();
  clearBtn.style.display = keyword ? "inline" : "none";
  suggestionsBox.innerHTML = "";

  if (keyword) {
    const filtered = kantorData.filter((item) =>
      item["NOPEN"].toLowerCase().includes(keyword)
    );

    filtered.slice(0, 10).forEach((item) => {
      const div = document.createElement("div");
      div.classList.add("suggestion-item");
      div.textContent = `${item["NOPEN"]} - ${item["NAMA KANTOR"]}`;
      div.onclick = () => {
        searchInput.value = item["NOPEN"];
        suggestionsBox.innerHTML = "";

        const found = markers.find((m) => m.nopen === item["NOPEN"]);
        if (found) {
          found.marker.openPopup();
          map.setView(found.marker.getLatLng(), 12, { animate: true });
        }
      };
      suggestionsBox.appendChild(div);
    });
  }
});

clearBtn.addEventListener("click", () => {
  searchInput.value = "";
  clearBtn.style.display = "none";
  suggestionsBox.innerHTML = "";
});
