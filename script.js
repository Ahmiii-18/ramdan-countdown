// =======================
// Variables
// =======================
let fajrTime, maghribTime;
let played = false;
let lastDateChecked = null;

const citySelect = document.getElementById("city-select");
const countdownPage = document.getElementById("countdown-page");
const calendarPage = document.getElementById("calendar-page");
const azan = document.getElementById("azanAudio");

// =======================
// Fetch Prayer Times
// =======================
function fetchPrayerTimes(city) {
  fetch(`https://api.aladhan.com/v1/timingsByCity?city=${city}&country=Pakistan&method=2`)
    .then(res => res.json())
    .then(data => {
      const timings = data.data.timings;
      const hijri = data.data.date.hijri;

      document.getElementById("hijri-date").innerText =
        `Hijri Date: ${hijri.day} ${hijri.month.en} ${hijri.year}`;

      const today = new Date();

      // Set Fajr time
      fajrTime = new Date(today);
      const [fajrH, fajrM] = timings.Fajr.split(":");
      fajrTime.setHours(fajrH, fajrM, 0);

      // Set Maghrib time
      maghribTime = new Date(today);
      const [maghribH, maghribM] = timings.Maghrib.split(":");
      maghribTime.setHours(maghribH, maghribM, 0);

      played = false;

      // Load calendar after fetching timings
      loadRamadanCalendar(city);
    })
    .catch(err => console.error("Error fetching prayer times:", err));
}

// =======================
// Countdown Logic
// =======================
function updateCountdown() {
  if (!fajrTime || !maghribTime) return;

  const now = new Date();
  const todayStr = now.toDateString();

  // Reset played flag if date changed
  if (lastDateChecked !== todayStr) {
    lastDateChecked = todayStr;
    played = false;
    fetchPrayerTimes(citySelect.value);
  }

  let targetTime, eventText;

  if (now < maghribTime) {
    targetTime = maghribTime;
    eventText = "Time left for Iftar";
  } else {
    const tomorrowFajr = new Date(fajrTime);
    tomorrowFajr.setDate(tomorrowFajr.getDate() + 1);
    targetTime = tomorrowFajr;
    eventText = "Time left for Sehri";
  }

  const diff = targetTime - now;

  // Play Azan when countdown reaches zero
  if (diff <= 0 && !played) {
    if (azan) {
      azan.currentTime = 0;
      azan.volume = 0.8;
      azan.play().catch(() => console.log("Audio cannot play"));
    }
    played = true;
  }

  const hours = Math.floor(diff / (1000*60*60));
  const minutes = Math.floor((diff / (1000*60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  const formatTime = t => t.toString().padStart(2,"0");

  document.getElementById("event-name").innerText = eventText;
  document.getElementById("countdown").innerText =
    `${formatTime(hours)}:${formatTime(minutes)}:${formatTime(seconds)}`;
}

// =======================
// Load Ramadan Calendar (30 Days)
// =======================
function loadRamadanCalendar(city) {
  const year = new Date().getFullYear();
  const startDate = new Date(year, 1, 19); // 19 Feb
  const todayStr = new Date().toISOString().split("T")[0];

  // Fetch both February & March calendar
  Promise.all([
    fetch(`https://api.aladhan.com/v1/calendarByCity?city=${city}&country=Pakistan&method=2&month=2&year=${year}`).then(res=>res.json()),
    fetch(`https://api.aladhan.com/v1/calendarByCity?city=${city}&country=Pakistan&method=2&month=3&year=${year}`).then(res=>res.json())
  ])
  .then(([febData, marData]) => {
    const combinedData = [...febData.data, ...marData.data];
    let tableRows = "";

    for (let i = 0; i < 30; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);

      const day = currentDate.getDate().toString().padStart(2,"0");
      const month = (currentDate.getMonth()+1).toString().padStart(2,"0");
      const apiFormat = `${day}-${month}-${year}`;
      const isoFormat = currentDate.toISOString().split("T")[0];

      const dayData = combinedData.find(d => d.date.gregorian.date === apiFormat);

      if (dayData) {
        tableRows += `
          <tr class="${isoFormat === todayStr ? 'today-row' : ''}">
            <td>${apiFormat}</td>
            <td>${dayData.timings.Fajr}</td>
            <td>${dayData.timings.Maghrib}</td>
          </tr>
        `;
      }
    }

    document.querySelector("#ramadan-table tbody").innerHTML = tableRows;
  })
  .catch(err => console.error("Error loading calendar:", err));
}

// =======================
// Event Listeners
// =======================
citySelect.addEventListener("change", () => fetchPrayerTimes(citySelect.value));

document.getElementById("show-calendar").addEventListener("click", () => {
  countdownPage.style.display = "none";
  calendarPage.style.display = "flex";
});

document.getElementById("back-to-countdown").addEventListener("click", () => {
  calendarPage.style.display = "none";
  countdownPage.style.display = "flex";
});

// Unlock audio on first interaction
document.body.addEventListener('click', () => {
  if (azan && azan.paused) {
    azan.play().then(()=>azan.pause()).catch(()=>{});
  }
}, { once: true });

// =======================
// Initialize
// =======================
fetchPrayerTimes(citySelect.value || "Lahore");
setInterval(updateCountdown, 1000);