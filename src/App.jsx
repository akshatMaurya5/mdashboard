import dataset from "./data/coomersData.json";

const PEOPLE = ["j", "a", "m"];
const PERSON_LABEL = { j: "J", a: "A", m: "M" };
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toLocalIsoDate(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function weekdayIndex(dateIso) {
  return new Date(`${dateIso}T00:00:00Z`).getUTCDay();
}

function sumRows(rows, key) {
  return rows.reduce((acc, row) => acc + row[key], 0);
}

function pct(n, total) {
  return total === 0 ? "0.0%" : `${((n / total) * 100).toFixed(1)}%`;
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function longestStreak(rows, predicate) {
  let best = 0;
  let current = 0;
  for (const row of rows) {
    if (predicate(row)) {
      current += 1;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  }
  return best;
}

function currentStreak(rows, predicate) {
  let streak = 0;
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (predicate(rows[i])) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

function topDays(rows, limit = 10) {
  return [...rows]
    .sort((a, b) => b.total - a.total || (a.date < b.date ? 1 : -1))
    .slice(0, limit);
}

function aggregateByMonth(rows) {
  const map = new Map();
  for (const row of rows) {
    const month = row.date.slice(0, 7);
    if (!map.has(month)) map.set(month, { month, j: 0, a: 0, m: 0, total: 0 });
    const bucket = map.get(month);
    bucket.j += row.j;
    bucket.a += row.a;
    bucket.m += row.m;
    bucket.total += row.total;
  }
  return [...map.values()].sort((x, y) => (x.month < y.month ? -1 : 1));
}

function bestMonthForPerson(monthlyRows, person) {
  let best = null;
  for (const row of monthlyRows) {
    if (!best || row[person] > best[person]) best = row;
  }
  return best;
}

function aggregateByYear(rows) {
  const map = new Map();
  for (const row of rows) {
    const year = row.date.slice(0, 4);
    if (!map.has(year)) map.set(year, { year, j: 0, a: 0, m: 0, total: 0, days: 0 });
    const bucket = map.get(year);
    bucket.j += row.j;
    bucket.a += row.a;
    bucket.m += row.m;
    bucket.total += row.total;
    bucket.days += 1;
  }
  return [...map.values()].sort((x, y) => (x.year < y.year ? -1 : 1));
}

function aggregateByQuarter(rows) {
  const map = new Map();
  for (const row of rows) {
    const month = Number(row.date.slice(5, 7));
    const quarter = `Q${Math.floor((month - 1) / 3) + 1}-${row.date.slice(0, 4)}`;
    if (!map.has(quarter)) map.set(quarter, { quarter, j: 0, a: 0, m: 0, total: 0 });
    const bucket = map.get(quarter);
    bucket.j += row.j;
    bucket.a += row.a;
    bucket.m += row.m;
    bucket.total += row.total;
  }
  return [...map.values()].sort((x, y) => (x.quarter < y.quarter ? -1 : 1));
}

function aggregateWeekdays(rows) {
  const out = WEEKDAYS.map((name) => ({ weekday: name, j: 0, a: 0, m: 0, total: 0 }));
  for (const row of rows) {
    const idx = weekdayIndex(row.date);
    out[idx].j += row.j;
    out[idx].a += row.a;
    out[idx].m += row.m;
    out[idx].total += row.total;
  }
  return out;
}

function personPeak(rows, person) {
  let best = null;
  for (const row of rows) {
    if (!best || row[person] > best[person]) best = row;
  }
  return best;
}

function sourceUsage(rows) {
  const map = new Map();
  for (const row of rows) {
    map.set(row.source, (map.get(row.source) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([source, days]) => ({ source, days }))
    .sort((a, b) => b.days - a.days);
}

function distribution(rows) {
  const map = new Map();
  for (const row of rows) {
    map.set(row.total, (map.get(row.total) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([totalActs, days]) => ({ totalActs: Number(totalActs), days }))
    .sort((a, b) => a.totalActs - b.totalActs);
}

function lastWindow(rows, days) {
  return rows.slice(Math.max(rows.length - days, 0));
}

function compareRecentWindows(rows, days) {
  const recent = rows.slice(Math.max(rows.length - days, 0));
  const previous = rows.slice(Math.max(rows.length - days * 2, 0), Math.max(rows.length - days, 0));
  const totalRecent = sumRows(recent, "total");
  const totalPrevious = sumRows(previous, "total");
  const delta = totalRecent - totalPrevious;
  const deltaPct = totalPrevious === 0 ? 0 : (delta / totalPrevious) * 100;
  return { days, totalRecent, totalPrevious, delta, deltaPct };
}

function App() {
  const allRows = [...dataset.records].sort((a, b) => (a.date < b.date ? -1 : 1));
  const asOf = toLocalIsoDate(new Date());
  const elapsedRows = allRows.filter((row) => row.date <= asOf);
  const rows = elapsedRows.length > 0 ? elapsedRows : allRows;

  const total = sumRows(rows, "total");
  const totalsList = rows.map((r) => r.total);
  const totalsByPerson = {
    j: sumRows(rows, "j"),
    a: sumRows(rows, "a"),
    m: sumRows(rows, "m")
  };
  const activeDays = rows.filter((row) => row.total > 0).length;
  const noActivityDays = rows.length - activeDays;

  const longestAnyActivity = longestStreak(rows, (r) => r.total > 0);
  const longestDryStreak = longestStreak(rows, (r) => r.total === 0);
  const currentDryStreak = currentStreak(rows, (r) => r.total === 0);
  const currentActivityStreak = currentStreak(rows, (r) => r.total > 0);
  const recent7 = lastWindow(rows, 7);
  const recent30 = lastWindow(rows, 30);
  const compare30 = compareRecentWindows(rows, 30);
  const sourceSplit = sourceUsage(rows);

  const monthly = aggregateByMonth(rows);

  const perPerson = PEOPLE.map((p) => {
    const personTotal = totalsByPerson[p];
    const personActiveDays = rows.filter((row) => row[p] > 0).length;
    const peak = personPeak(rows, p);
    const peakMonth = bestMonthForPerson(monthly, p);
    return {
      key: p,
      total: personTotal,
      share: pct(personTotal, total),
      activeDays: personActiveDays,
      avgPerDay: rows.length ? (personTotal / rows.length).toFixed(2) : "0.00",
      avgWhenActive: personActiveDays ? (personTotal / personActiveDays).toFixed(2) : "0.00",
      peakDate: peak?.date ?? "-",
      peakValue: peak?.[p] ?? 0,
      peakMonth: peakMonth?.month ?? "-",
      peakMonthValue: peakMonth?.[p] ?? 0,
      longestDry: longestStreak(rows, (r) => r[p] === 0),
      longestActive: longestStreak(rows, (r) => r[p] > 0),
      currentDry: currentStreak(rows, (r) => r[p] === 0),
      currentActive: currentStreak(rows, (r) => r[p] > 0)
    };
  });

  const yearly = aggregateByYear(rows);
  const quarterly = aggregateByQuarter(rows);
  const weekdays = aggregateWeekdays(rows);
  const totalDistribution = distribution(rows);
  const bestMonths = [...monthly].sort((a, b) => b.total - a.total).slice(0, 8);
  const biggestDays = topDays(rows, 12);
  const weekdayMax = Math.max(...weekdays.map((d) => d.total), 1);
  const bestMonthMax = Math.max(...bestMonths.map((d) => d.total), 1);
  const distMax = Math.max(...totalDistribution.map((d) => d.days), 1);

  return (
    <div className="page">
      <header className="hero">
        <h1>Coomers Dashboard</h1>
        <p>
          Deduplicated daily records from <code>2026</code>, <code>backup</code>, and{" "}
          <code>history</code> with source priority {dataset.sourcePriority.join(" > ")}.
        </p>
        <p>
          Date range: {rows[0]?.date} to {rows[rows.length - 1]?.date} | As of: {asOf}
        </p>
      </header>

      <section className="grid kpi-grid">
        <article className="card">
          <h2>Total Acts</h2>
          <p className="big">{total.toLocaleString()}</p>
          <p>{(total / rows.length).toFixed(2)} per calendar day</p>
          <p>{activeDays} active days | {noActivityDays} zero days</p>
          <p>Median/day: {median(totalsList).toFixed(2)} | Mean/day: {mean(totalsList).toFixed(2)}</p>
        </article>
        <article className="card">
          <h2>Streaks</h2>
          <p>Longest active streak: <strong>{longestAnyActivity}</strong> days</p>
          <p>Longest dry streak: <strong>{longestDryStreak}</strong> days</p>
          <p>Current active streak: <strong>{currentActivityStreak}</strong> days</p>
          <p>Current dry streak: <strong>{currentDryStreak}</strong> days</p>
        </article>
        <article className="card">
          <h2>Recent Pace</h2>
          <p>Last 7 days total: <strong>{sumRows(recent7, "total")}</strong></p>
          <p>Last 30 days total: <strong>{sumRows(recent30, "total")}</strong></p>
          <p>
            30d vs previous 30d:{" "}
            <strong className={compare30.delta >= 0 ? "up" : "down"}>
              {compare30.delta >= 0 ? "+" : ""}
              {compare30.delta} ({compare30.deltaPct.toFixed(1)}%)
            </strong>
          </p>
        </article>
        <article className="card">
          <h2>Data Integrity</h2>
          <p>Merged dates found in multiple sheets: <strong>{dataset.diagnostics.duplicatedDateCount}</strong></p>
          <p>Value conflicts across sheets: <strong>{dataset.diagnostics.conflictCount}</strong></p>
          <p>Total tracked days: <strong>{dataset.diagnostics.totalDays}</strong></p>
          {sourceSplit.map((s) => (
            <p key={s.source}>Chosen from {s.source}: <strong>{s.days}</strong> days</p>
          ))}
        </article>
      </section>

      <section className="card">
        <h2>Per Person</h2>
        <table>
          <thead>
            <tr>
              <th>Person</th>
              <th>Total</th>
              <th>Share</th>
              <th>Active Days</th>
              <th>Avg / Day</th>
              <th>Avg / Active Day</th>
              <th>Peak Day</th>
              <th>Peak Month</th>
              <th>Streaks (Active/Dry)</th>
            </tr>
          </thead>
          <tbody>
            {perPerson.map((row) => (
              <tr key={row.key}>
                <td>{PERSON_LABEL[row.key]}</td>
                <td>{row.total.toLocaleString()}</td>
                <td>{row.share}</td>
                <td>{row.activeDays}</td>
                <td>{row.avgPerDay}</td>
                <td>{row.avgWhenActive}</td>
                <td>{row.peakDate} ({row.peakValue})</td>
                <td>{row.peakMonth} ({row.peakMonthValue})</td>
                <td>{row.longestActive}/{row.longestDry} (now {row.currentActive}/{row.currentDry})</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="grid two-col">
        <article className="card">
          <h2>Yearly Totals</h2>
          <table>
            <thead>
              <tr>
                <th>Year</th>
                <th>J</th>
                <th>A</th>
                <th>M</th>
                <th>Total</th>
                <th>Avg / Day</th>
              </tr>
            </thead>
            <tbody>
              {yearly.map((row) => (
                <tr key={row.year}>
                  <td>{row.year}</td>
                  <td>{row.j}</td>
                  <td>{row.a}</td>
                  <td>{row.m}</td>
                  <td>{row.total}</td>
                  <td>{(row.total / row.days).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="card">
          <h2>Top Months</h2>
          <div className="bars">
            {bestMonths.map((row) => (
              <div className="bar-row" key={row.month}>
                <span>{row.month}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(row.total / bestMonthMax) * 100}%` }} />
                </div>
                <strong>{row.total}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid two-col">
        <article className="card">
          <h2>Quarterly Totals</h2>
          <table>
            <thead>
              <tr>
                <th>Quarter</th>
                <th>J</th>
                <th>A</th>
                <th>M</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {quarterly.slice(-10).map((row) => (
                <tr key={row.quarter}>
                  <td>{row.quarter}</td>
                  <td>{row.j}</td>
                  <td>{row.a}</td>
                  <td>{row.m}</td>
                  <td>{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </section>

      <section className="grid two-col">
        <article className="card">
          <h2>Weekday Pattern</h2>
          <div className="bars">
            {weekdays.map((row) => (
              <div className="bar-row" key={row.weekday}>
                <span>{row.weekday}</span>
                <div className="bar-track">
                  <div className="bar-fill alt" style={{ width: `${(row.total / weekdayMax) * 100}%` }} />
                </div>
                <strong>{row.total}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="card">
          <h2>Top Days</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>J</th>
                <th>A</th>
                <th>M</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {biggestDays.map((row) => (
                <tr key={row.date}>
                  <td>{row.date}</td>
                  <td>{row.j}</td>
                  <td>{row.a}</td>
                  <td>{row.m}</td>
                  <td>{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </section>

      <section className="grid two-col">
        <article className="card">
          <h2>Daily Total Distribution</h2>
          <div className="bars">
            {totalDistribution.map((row) => (
              <div className="bar-row" key={row.totalActs}>
                <span>{row.totalActs} acts</span>
                <div className="bar-track">
                  <div className="bar-fill neutral" style={{ width: `${(row.days / distMax) * 100}%` }} />
                </div>
                <strong>{row.days}d</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      {dataset.diagnostics.conflictCount > 0 && (
        <section className="card">
          <h2>Conflict Dates</h2>
          {dataset.diagnostics.conflicts.map((conflict) => (
            <div className="conflict" key={conflict.date}>
              <p>
                <strong>{conflict.date}</strong>
              </p>
              <pre>{JSON.stringify(conflict.valuesBySource, null, 2)}</pre>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

export default App;
