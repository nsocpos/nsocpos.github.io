//var map = L.map('map').setView([51.505, -0.09], 13);

//L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
//    maxZoom: 19,
//    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'

// }).addTo(map);

document.addEventListener('DOMContentLoaded', () => {
  const map = L.map('map').setView([-2.5489, 118.0149], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  const marker = L.marker([-6.175392, 106.827153]).addTo(map);
  marker.bindPopup('Monas - Jakarta').openPopup();
});
