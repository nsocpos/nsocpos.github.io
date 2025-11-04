//var map = L.map('map').setView([51.505, -0.09], 13);

//L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
//    maxZoom: 19,
//    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'

// }).addTo(map);



// Tunggu sampai halaman selesai dimuat
document.addEventListener('DOMContentLoaded', () => {
  // Buat peta dan posisikan di tengah Indonesia
  const map = L.map('map').setView([-2.5489, 118.0149], 5); // Koordinat tengah Indonesia

  // Tambahkan tile layer dari OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Contoh marker (bisa hapus nanti kalau sudah ada data CSV)
  const marker = L.marker([-6.175392, 106.827153]).addTo(map);
  marker.bindPopup('Monas - Jakarta').openPopup();
});
