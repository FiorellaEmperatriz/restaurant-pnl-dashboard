/**
 * Fennel & Co. Group - Weekly P&L Performance (DEMO)
 *
 * Google Apps Script web app bound to a Google Sheet with two tabs:
 *   PL_Data   weekly P&L rows (one row per site per week)
 *   Managers  demo sign-in: email, name, site, code
 *
 * Everything here is fictional demo data. See README.md for setup.
 */

var SHEET_DATA = 'PL_Data';
var SHEET_MANAGERS = 'Managers';
var COMPANY_NAME = 'Fennel & Co. Group';

// Targets used by the "what needs attention" rules. Edit to taste.
var TARGETS = {
  labourPct: 32,   // labour as % of sales
  cogsPct: 29,     // cost of goods as % of sales
  ebitdaPct: 14    // EBITDA margin
};

var SESSION_SECONDS = 6 * 60 * 60; // sign-in lasts 6 hours

// ---------------------------------------------------------------- web app --

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle(COMPANY_NAME + ' | Weekly Performance')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ------------------------------------------------------------ data access --

function readRows_() {
  var sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_DATA);
  if (!sheet) throw new Error('Missing tab: ' + SHEET_DATA);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  var header = values[0].map(String);
  var tz = Session.getScriptTimeZone();
  var rows = [];

  for (var i = 1; i < values.length; i++) {
    var r = {};
    for (var c = 0; c < header.length; c++) r[header[c]] = values[i][c];
    if (!r.site || !r.week_ending) continue;

    var we = r.week_ending instanceof Date
      ? Utilities.formatDate(r.week_ending, tz, 'yyyy-MM-dd')
      : String(r.week_ending).slice(0, 10);

    var num = function (k) { return Number(r[k]) || 0; };
    var foodSales = num('food_sales'), drinkSales = num('drink_sales');
    var foodCogs = num('food_cogs'), drinkCogs = num('drink_cogs');
    var labour = num('labour'), rent = num('rent'), utilities = num('utilities');
    var marketing = num('marketing'), other = num('other_costs');

    var sales = foodSales + drinkSales;
    var cogs = foodCogs + drinkCogs;
    var gross = sales - cogs;
    var opex = labour + rent + utilities + marketing + other;
    var ebitda = gross - opex;

    rows.push({
      week: we,
      site: String(r.site),
      sales: sales,
      cogs: cogs,
      gross: gross,
      labour: labour,
      ebitda: ebitda,
      covers: num('covers'),
      grossPct: pct_(gross, sales),
      cogsPct: pct_(cogs, sales),
      labourPct: pct_(labour, sales),
      primePct: pct_(cogs + labour, sales),
      ebitdaPct: pct_(ebitda, sales),
      spendPerCover: num('covers') ? sales / num('covers') : 0
    });
  }
  rows.sort(function (a, b) { return a.week < b.week ? -1 : a.week > b.week ? 1 : 0; });
  return rows;
}

function pct_(part, whole) {
  return whole ? Math.round((part / whole) * 1000) / 10 : 0;
}

function sum_(rows, key) {
  return rows.reduce(function (t, r) { return t + r[key]; }, 0);
}

/** Combine several sites for one week into a single row. */
function combine_(rows) {
  var sales = sum_(rows, 'sales'), cogs = sum_(rows, 'cogs');
  var gross = sum_(rows, 'gross'), labour = sum_(rows, 'labour');
  var ebitda = sum_(rows, 'ebitda'), covers = sum_(rows, 'covers');
  return {
    week: rows[0].week, site: 'All sites',
    sales: sales, cogs: cogs, gross: gross, labour: labour, ebitda: ebitda, covers: covers,
    grossPct: pct_(gross, sales), cogsPct: pct_(cogs, sales),
    labourPct: pct_(labour, sales), primePct: pct_(cogs + labour, sales),
    ebitdaPct: pct_(ebitda, sales), spendPerCover: covers ? sales / covers : 0
  };
}

// --------------------------------------------------------------- API calls --

/** Called once when the page loads. */
function getBootstrap() {
  var rows = readRows_();
  var sites = [];
  rows.forEach(function (r) { if (sites.indexOf(r.site) < 0) sites.push(r.site); });
  sites.sort();
  var weeks = [];
  rows.forEach(function (r) { if (weeks.indexOf(r.week) < 0) weeks.push(r.week); });
  return { company: COMPANY_NAME, sites: sites, weeks: weeks, targets: TARGETS };
}

/**
 * Dashboard payload for one site (or 'All sites') over the last N weeks.
 */
function getDashboard(site, numWeeks) {
  numWeeks = numWeeks || 13;
  var rows = readRows_();
  var allWeeks = [];
  rows.forEach(function (r) { if (allWeeks.indexOf(r.week) < 0) allWeeks.push(r.week); });
  var weeks = allWeeks.slice(-numWeeks);

  var series = weeks.map(function (w) {
    var inWeek = rows.filter(function (r) { return r.week === w && (site === 'All sites' || r.site === site); });
    if (!inWeek.length) return null;
    var combined = combine_(inWeek);
    combined.site = site; // label the series with what the user selected
    return combined;
  }).filter(Boolean);

  if (!series.length) return { series: [], latest: null };

  var latest = series[series.length - 1];
  var previous = series.length > 1 ? series[series.length - 2] : null;

  // Site ranking for the latest week (always across all sites).
  var latestWeek = latest.week;
  var ranking = rows.filter(function (r) { return r.week === latestWeek; })
    .sort(function (a, b) { return b.ebitdaPct - a.ebitdaPct; });

  return {
    series: series,
    latest: latest,
    previous: previous,
    ranking: ranking,
    insights: buildInsights_(rows, allWeeks)
  };
}

// ---------------------------------------------------------------- insights --

/**
 * Simple, explainable rules. Each one is checked per site against the last
 * weeks of data. Nothing here is a black box: a manager can see exactly why a
 * flag fired.
 */
function buildInsights_(rows, allWeeks) {
  var out = [];
  var sites = [];
  rows.forEach(function (r) { if (sites.indexOf(r.site) < 0) sites.push(r.site); });

  sites.forEach(function (site) {
    var s = rows.filter(function (r) { return r.site === site; });
    if (s.length < 6) return;
    var last = s[s.length - 1];
    var recent3 = s.slice(-3);
    var baseline = s.slice(-9, -3); // six weeks before the recent three

    // 1. Labour over target for 3 weeks running.
    var overLabour = recent3.every(function (r) { return r.labourPct > TARGETS.labourPct; });
    if (overLabour) {
      out.push({
        level: 'high', site: site,
        title: 'Labour above target for 3 weeks',
        detail: 'Labour has been ' + recent3.map(function (r) { return r.labourPct + '%'; }).join(', ') +
          ' of sales against a ' + TARGETS.labourPct + '% target. Latest week sales: ' + fmtGbp_(last.sales) + '.'
      });
    }

    // 2. Food/drink cost jump vs the previous six weeks.
    var baseCogs = avg_(baseline, 'cogsPct');
    var recentCogs = avg_(recent3, 'cogsPct');
    if (recentCogs - baseCogs >= 2.5) {
      out.push({
        level: 'medium', site: site,
        title: 'Cost of goods is running high',
        detail: 'Last 3 weeks average ' + round1_(recentCogs) + '% vs ' + round1_(baseCogs) +
          '% over the six weeks before. Worth checking supplier prices, waste and portioning.'
      });
    }

    // 3. Margin below target in the latest week.
    if (last.ebitdaPct < TARGETS.ebitdaPct - 4) {
      out.push({
        level: 'high', site: site,
        title: 'EBITDA margin well below target',
        detail: 'Latest week ' + last.ebitdaPct + '% vs a ' + TARGETS.ebitdaPct + '% target.'
      });
    }
  });

  if (!out.length) {
    out.push({ level: 'ok', site: 'All sites', title: 'Nothing needs attention',
      detail: 'Labour, cost of goods and margin are within target ranges.' });
  }
  return out;
}

function avg_(rows, key) {
  return rows.length ? sum_(rows, key) / rows.length : 0;
}
function round1_(n) { return Math.round(n * 10) / 10; }
function fmtGbp_(n) {
  // Manual thousands separator: locale formatting is unreliable in Apps Script.
  return '£' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ---------------------------------------------------------- sign-in / submit --

/**
 * Demo sign-in: email + code from the Managers tab.
 * Returns a short-lived token held in CacheService. In a real deployment use
 * Google account sign-in (Session.getActiveUser) or a proper identity provider,
 * and never keep plain-text codes in a sheet.
 */
function signIn(email, code) {
  email = String(email || '').trim().toLowerCase();
  code = String(code || '').trim();
  var sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_MANAGERS);
  if (!sheet) return { ok: false, message: 'Managers tab not found.' };

  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    var rowEmail = String(values[i][0]).trim().toLowerCase();
    var rowCode = String(values[i][3]).trim();
    if (rowEmail === email && rowCode === code) {
      var token = Utilities.getUuid();
      CacheService.getScriptCache().put(
        'session:' + token,
        JSON.stringify({ email: email, name: values[i][1], site: values[i][2] }),
        SESSION_SECONDS
      );
      return { ok: true, token: token, name: values[i][1], site: values[i][2] };
    }
  }
  return { ok: false, message: 'Email or code not recognised.' };
}

function getSession_(token) {
  if (!token) return null;
  var raw = CacheService.getScriptCache().get('session:' + token);
  return raw ? JSON.parse(raw) : null;
}

/**
 * Managers submit (or correct) their own site's week.
 * One row per site per week: resubmitting replaces the earlier row.
 */
function submitWeek(token, payload) {
  var session = getSession_(token);
  if (!session) return { ok: false, message: 'Session expired. Please sign in again.' };

  var week = String(payload.week_ending || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) return { ok: false, message: 'Pick a valid week ending date.' };
  var d = new Date(week + 'T12:00:00');
  if (d.getDay() !== 0) return { ok: false, message: 'Week ending must be a Sunday.' };

  var fields = ['food_sales', 'drink_sales', 'food_cogs', 'drink_cogs', 'labour',
                'rent', 'utilities', 'marketing', 'other_costs', 'covers'];
  var clean = {};
  for (var i = 0; i < fields.length; i++) {
    var v = Number(payload[fields[i]]);
    if (isNaN(v) || v < 0) return { ok: false, message: 'Check "' + fields[i].replace('_', ' ') + '": needs a number of 0 or more.' };
    clean[fields[i]] = v;
  }
  if (clean.food_sales + clean.drink_sales <= 0) return { ok: false, message: 'Sales cannot be zero.' };

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_DATA);
    var values = sheet.getDataRange().getValues();
    var header = values[0].map(String);
    var tz = Session.getScriptTimeZone();

    var newRow = header.map(function (h) {
      if (h === 'week_ending') return week;
      if (h === 'site') return session.site;
      if (h === 'submitted_by') return session.email;
      if (h === 'submitted_at') return new Date();
      return clean.hasOwnProperty(h) ? clean[h] : '';
    });

    var wIdx = header.indexOf('week_ending'), sIdx = header.indexOf('site');
    var replaced = false;
    for (var r = 1; r < values.length; r++) {
      var existing = values[r][wIdx] instanceof Date
        ? Utilities.formatDate(values[r][wIdx], tz, 'yyyy-MM-dd')
        : String(values[r][wIdx]).slice(0, 10);
      if (existing === week && values[r][sIdx] === session.site) {
        sheet.getRange(r + 1, 1, 1, newRow.length).setValues([newRow]);
        replaced = true;
        break;
      }
    }
    if (!replaced) sheet.appendRow(newRow);

    return { ok: true, message: (replaced ? 'Updated ' : 'Submitted ') + session.site + ' for week ending ' + week + '.' };
  } finally {
    lock.releaseLock();
  }
}
