let fajrTime, maghribTime;
let played = false;
let lastDateChecked = null;

const citySelect = document.getElementById("city-select");
const azan = document.getElementById("azanAudio");

// Fetch prayer times
function fetchPrayerTimes(city) {
  fetch(`https://api.aladhan.com/v1/timingsByCity?city=${city}&country=Pakistan&method=2`)
    .then(res => res.json())
    .then(data => {
      const timings = data.data.timings;
      const hijri = data.data.date.hijri;

      document.getElementById("hijri-date").innerText =
        `Hijri Date: ${hijri.day} ${hijri.month.en} ${hijri.year}`;

      const today = new Date();
      fajrTime = new Date(today); 
      const [fh, fm] = timings.Fajr.split(":"); 
      fajrTime.setHours(fh, fm, 0);

      maghribTime = new Date(today); 
      const [mh, mm] = timings.Maghrib.split(":"); 
      maghribTime.setHours(mh, mm, 0);

      played = false;
      loadRamadanCalendar(city);
    })
    .catch(err => console.error(err));
}

// Format 12-hour time
function formatAMPM(date) {
  let hours = date.getHours();
  let minutes = date.getMinutes();
  let ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  minutes = minutes < 10 ? "0"+minutes : minutes;
  return hours + ":" + minutes + " " + ampm;
}

// Countdown
function updateCountdown() {
  if (!fajrTime || !maghribTime) return;
  const now = new Date();
  const todayStr = now.toDateString();
  if (lastDateChecked !== todayStr) {
    lastDateChecked = todayStr;
    fetchPrayerTimes(citySelect.value);
  }

  // Fixed Sehri/Iftar times
  document.getElementById("sehri-countdown").innerText = formatAMPM(fajrTime);
  document.getElementById("iftar-countdown").innerText = formatAMPM(maghribTime);

  // Countdown for main display only
  const tomorrowFajr = new Date(fajrTime); tomorrowFajr.setDate(fajrTime.getDate()+1);
  const tomorrowMaghrib = new Date(maghribTime); tomorrowMaghrib.setDate(maghribTime.getDate()+1);

  const nextSehri = now < fajrTime ? fajrTime : tomorrowFajr;
  const nextIftar = now < maghribTime ? maghribTime : tomorrowMaghrib;

  const diffSehri = nextSehri - now;
  const diffIftar = nextIftar - now;

  function formatCountdown(diff) {
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000)/60000);
    const s = Math.floor((diff % 60000)/1000);
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  }

  if (diffIftar <= diffSehri) {
    document.getElementById("event-name").innerText = "Time left for Iftar";
    document.getElementById("countdown").innerText = formatCountdown(diffIftar);
  } else {
    document.getElementById("event-name").innerText = "Time left for Sehri";
    document.getElementById("countdown").innerText = formatCountdown(diffSehri);
  }

  if ((diffIftar<=0 || diffSehri<=0) && !played) {
    azan.currentTime = 0;
    azan.play().catch(()=>{});
    played = true;
  }
}

// Load Ramadan Calendar (19 Feb → 20 Mar, 30 days)
function loadRamadanCalendar(city) {
  const year = new Date().getFullYear();
  const startDate = new Date(year, 1, 19); // Feb 19
  const todayStr = new Date().toISOString().split("T")[0];

  Promise.all([2,3].map(month =>
    fetch(`https://api.aladhan.com/v1/calendarByCity?city=${city}&country=Pakistan&method=2&month=${month}&year=${year}`)
      .then(r=>r.json())
  ))
  .then(results => {
    const combinedData = results.flatMap(r=>r.data);
    let tableRows = "";

    for (let i=0; i<30; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);

      const dd = String(currentDate.getDate()).padStart(2,"0");
      const mm = String(currentDate.getMonth()+1).padStart(2,"0");
      const yyyy = currentDate.getFullYear();

      const apiFormat = `${dd}-${mm}-${yyyy}`;
      const isoFormat = `${yyyy}-${mm}-${dd}`;

      const dayData = combinedData.find(d => d.date.gregorian.date === apiFormat);
      if (!dayData) continue;

      tableRows += `
        <tr class="${isoFormat === todayStr ? 'today-row' : ''}">
          <td>${apiFormat}</td>
          <td>${dayData.timings.Fajr}</td>
          <td>${dayData.timings.Maghrib}</td>
        </tr>
      `;
    }

    document.querySelector("#ramadan-table tbody").innerHTML = tableRows;
  })
  .catch(err => console.error(err));
}

// Event Listeners
citySelect.addEventListener("change", ()=>fetchPrayerTimes(citySelect.value));
document.getElementById("show-calendar").onclick = ()=>{
  document.getElementById("countdown-page").style.display="none";
  document.getElementById("calendar-page").style.display="flex";
};
document.getElementById("back-to-countdown").onclick = ()=>{
  document.getElementById("calendar-page").style.display="none";
  document.getElementById("countdown-page").style.display="block";
};

// Unlock audio
document.body.addEventListener('click',()=>{
  if(azan.paused) azan.play().then(()=>azan.pause()).catch(()=>{});
},{once:true});

// Initialize
fetchPrayerTimes("Lahore");
setInterval(updateCountdown,1000);
