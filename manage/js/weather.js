/* 7-day forecast from the National Weather Service (free, no key) + paving go/no-go rules of thumb. */
import { esc, weekday, today, badge } from './core.js';
import { db } from './store.js';

export const WX = { days: null, err: false, loading: false, onLoad: () => {} };

export function loadWeather() {
  if (WX.days || WX.loading || WX.err) return;
  const s = db.settings;
  try {
    const c = JSON.parse(sessionStorage.getItem('mp.wx') || 'null');
    if (c && Date.now() - c.t < 36e5 && c.lat === s.lat && c.lon === s.lon) { WX.days = c.days; return; }
  } catch (e) { /* no cache */ }
  WX.loading = true;
  const get = u => fetch(u, { headers: { Accept: 'application/geo+json' } }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
  get(`https://api.weather.gov/points/${s.lat},${s.lon}`)
    .then(p => get(p.properties.forecast))
    .then(fc => {
      const by = {};
      fc.properties.periods.forEach(p => {
        const date = p.startTime.slice(0, 10), d = by[date] || (by[date] = { date, rain: 0 });
        if (p.isDaytime) { d.high = p.temperature; d.short = p.shortForecast; d.wind = p.windSpeed; } else { d.low = p.temperature; d.short = d.short || p.shortForecast; }
        d.rain = Math.max(d.rain, (p.probabilityOfPrecipitation && p.probabilityOfPrecipitation.value) || 0);
      });
      WX.days = Object.values(by).slice(0, 7);
      try { sessionStorage.setItem('mp.wx', JSON.stringify({ t: Date.now(), lat: s.lat, lon: s.lon, days: WX.days })); } catch (e) { /* ignore */ }
    })
    .catch(() => { WX.err = true; })
    .finally(() => { WX.loading = false; WX.onLoad(); });
}
export const wxFor = date => (WX.days || []).find(d => d.date === date);
export function resetWeather() { WX.days = null; WX.err = false; try { sessionStorage.removeItem('mp.wx'); } catch (e) { /* ignore */ } }

// Rules of thumb only; the project or city spec governs.
export function verdict(d) {
  const s = db.settings, rain = d.rain || 0, hi = d.high ?? d.low, lo = d.low ?? d.high;
  const a = hi < s.asphaltMinF || rain >= s.rainMaxPct ? 'No' : hi < s.asphaltMinF + 5 || rain >= s.rainMaxPct - 20 ? 'Watch' : 'Go';
  const c = hi < s.concreteMinF || rain >= s.rainMaxPct ? 'No' : lo < s.concreteMinF || rain >= s.rainMaxPct - 20 ? 'Watch' : 'Go';
  return { a, c };
}
export const wxGo = (d, type) => { if (!d) return null; const v = verdict(d); return type === 'Asphalt' ? v.a : type === 'Concrete' ? v.c : (v.a === 'No' && v.c === 'No' ? 'No' : 'Go'); };

export function weatherStrip() {
  loadWeather();
  if (WX.err) return '<p class="muted small">Forecast unavailable right now (weather.gov). Check again later.</p>';
  if (!WX.days) return '<div class="wx wx--loading">' + Array.from({ length: 7 }, () => '<div class="wx__day skeleton"></div>').join('') + '</div>';
  const s = db.settings;
  return `<div class="wx">${WX.days.map(d => {
    const v = verdict(d);
    return `<div class="wx__day${d.date === today() ? ' is-today' : ''}">
      <strong>${d.date === today() ? 'Today' : esc(weekday(d.date))}</strong>
      <span class="wx__temp">${d.high ?? '–'}°<small> / ${d.low ?? '–'}°</small></span>
      <span class="wx__sky" title="${esc(d.short)}">${esc(d.short || '')}</span>
      <span class="wx__rain">${d.rain || 0}% rain</span>
      <span class="wx__go" title="Asphalt: ${s.asphaltMinF}°F+ and rain under ${s.rainMaxPct}%">Asphalt ${badge(v.a)}</span>
      <span class="wx__go" title="Concrete: overnight low ${s.concreteMinF}°F+ (or plan cold-weather protection)">Concrete ${badge(v.c)}</span>
    </div>`;
  }).join('')}</div>`;
}
