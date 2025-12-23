import React, { useEffect, useMemo, useState } from "react";
import "./Homepage.css";
import {  Box,Button,Chip,Container,Dialog,DialogActions,DialogContent,DialogTitle,FormControl,FormControlLabel,Grid,  InputLabel,  MenuItem,  Paper,  Select,  Slider,  Switch,
  Typography,
} from "@mui/material";
import {LineChart,Line,XAxis,  YAxis,  CartesianGrid,  Tooltip,  ResponsiveContainer,  BarChart,  Bar,  ReferenceLine,} from "recharts";





const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fmtPct = (v) => `${Math.round(v * 100)}%`;
const fmtInt = (v) => new Intl.NumberFormat().format(Math.round(v));
const fmtDate = (d) => {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
};

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function movingAverage(arr, w) {
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    let sum = 0;
    let cnt = 0;
    for (let j = Math.max(0, i - w + 1); j <= i; j++) {
      sum += arr[j];
      cnt++;
    }
    out.push(sum / cnt);
  }
  return out;
}

function zscore(arr) {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const varr =
    arr.reduce((a, b) => a + (b - mean) * (b - mean), 0) /
    Math.max(1, arr.length - 1);
  const sd = Math.sqrt(varr) || 1;
  return arr.map((x) => (x - mean) / sd);
}

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

// synthetic database
const REGIONS = [
  { id: "NY", name: "New York" },
  { id: "CA", name: "California" },
  { id: "TX", name: "Texas" },
  { id: "FL", name: "Florida" },
  { id: "IL", name: "Illinois" },
  { id: "WA", name: "Washington" },
];

const PATHOGENS = [
  { id: "flu", name: "Influenza-like" },
  { id: "rsv", name: "RSV-like" },
  { id: "noro", name: "Norovirus-like" },
];

const HORIZONS = [
  { id: 7, name: "7 days" },
  { id: 14, name: "14 days" },
  { id: 21, name: "21 days" },
];

function makeSeries({ seed = 42, days = 210, regionId = "NY", pathogenId = "flu" }) {
  const rand = seededRandom(
    seed +
      regionId.split("").reduce((a, c) => a + c.charCodeAt(0), 0) +
      pathogenId.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  );

  const start = new Date();
  start.setDate(start.getDate() - days + 1);

  const baseline = pathogenId === "flu" ? 120 : pathogenId === "rsv" ? 80 : 40;
  const seasonalAmp = pathogenId === "noro" ? 0.15 : 0.25;

  const waveStart = Math.floor(days * (0.45 + 0.2 * (rand() - 0.5)));
  const wavePeak = waveStart + Math.floor(days * (0.15 + 0.1 * rand()));
  const waveEnd = wavePeak + Math.floor(days * (0.18 + 0.12 * rand()));
  const waveHeight =
    (pathogenId === "flu" ? 900 : pathogenId === "rsv" ? 700 : 350) *
    (0.8 + 0.5 * rand());

  const regionMultiplier =
    regionId === "NY" ? 1.05
      : regionId === "CA" ? 1.1
      : regionId === "TX" ? 1.0
      : regionId === "FL"  ? 0.92
      : regionId === "IL"  ? 0.9
      : 0.88;

  const incidence = [];
  for (let t = 0; t < days; t++) {
    const dt = new Date(start);
    dt.setDate(start.getDate() + t);

    const season = 1 + seasonalAmp * Math.sin((2 * Math.PI * t) / 60);
    const bump =
      t < waveStart
        ? 0
        : t <= wavePeak
        ? ((t - waveStart) / Math.max(1, wavePeak - waveStart)) * waveHeight
        : t <= waveEnd
        ? (1 - (t - wavePeak) / Math.max(1, waveEnd - wavePeak)) * waveHeight
        : 0;

    const dow = dt.getDay();
    const weekendDip = dow === 0 || dow === 6 ? 0.78 + 0.08 * rand() : 1.0;

    const noise = (rand() - 0.5) * 35;
    const y = Math.max(0, (baseline * season + bump + noise) * weekendDip * regionMultiplier);
    incidence.push(y);
  }

  const incMA = movingAverage(incidence, 7);
  const incZ = zscore(incMA);

  const lead = (k) => incZ.map((_, i) => incZ[clamp(i + k, 0, incZ.length - 1)]);
  const searchProxy = lead(7).map((z) => clamp(0.55 * z + 0.25 * (rand() - 0.5), -3, 3));
  const socialProxy = lead(10).map((z) => clamp(0.5 * z + 0.35 * (rand() - 0.5), -3, 3));
  const newsProxy = lead(5).map((z) => clamp(0.6 * z + 0.4 * (rand() - 0.5), -3, 3));

  const incDiff = incidence.map((v, i) => (i === 0 ? 0 : v - incidence[i - 1]));
  const varWin = 14;
  const variance = incidence.map((_, i) => {
    const a = Math.max(0, i - varWin + 1);
    const w = incidence.slice(a, i + 1);
    const m = w.reduce((x, y) => x + y, 0) / w.length;
    const vv = w.reduce((x, y) => x + (y - m) * (y - m), 0) / Math.max(1, w.length - 1);
    return vv;
  });
  const varZ = zscore(movingAverage(variance, 7));
  const slope = zscore(movingAverage(incDiff, 7));

  const pRaw = incZ.map((z, i) =>
    sigmoid(0.9 * z + 0.6 * varZ[i] + 0.5 * slope[i] + 0.35 * newsProxy[i] + 0.2 * searchProxy[i])
  );
  const prob = movingAverage(pRaw, 5).map((p) => clamp(p, 0, 1));

  const thr = 0.72;
  let onsetIdx = -1;
  for (let i = 0; i < prob.length - 5; i++) {
    if (prob[i] >= thr && prob.slice(i, i + 5).every((x) => x >= thr * 0.9)) {
      onsetIdx = i;
      break;
    }
  }

  const rows = incidence.map((v, i) => {
    const dt = new Date(start);
    dt.setDate(start.getDate() + i);
    const dateStr = dt.toISOString().slice(0, 10);
    const alertLevel = prob[i] >= 0.85 ? "High" : prob[i] >= 0.7 ? "Elevated" : prob[i] >= 0.5 ? "Guarded" : "Low";

    return {
      date: dateStr,
      dateLabel: fmtDate(dt),
      incidence: Math.round(v),
      incidenceMA7: Math.round(incMA[i]),
      prob: prob[i],
      alertLevel,
      newsZ: newsProxy[i],
      searchZ: searchProxy[i],
      socialZ: socialProxy[i],
      ewsVarianceZ: varZ[i],
      ewsSlopeZ: slope[i],
      isOnset: onsetIdx === i,
      onsetIdx,
      threshold: thr,
    };
  });

  return {
    meta: {
      regionId,
      pathogenId,
      days,
      threshold: thr,
      onsetIdx,
      startDate: rows[0]?.date,
      endDate: rows[rows.length - 1]?.date,
    },
    rows,
  };
}

function levelChip(level) {
  const common = { size: "small", variant: "filled" };
  if (level === "High") return <Chip {...common} color="error" label="High" />;
  if (level === "Elevated") return <Chip {...common} color="warning" label="Elevated" />;
  if (level === "Guarded") return <Chip {...common} color="info" label="Guarded" />;
  return <Chip {...common} color="success" label="Low" />;
}

function levelFromProb(p) {
  if (p >= 0.85) return "High";
  if (p >= 0.7) return "Elevated";
  if (p >= 0.5) return "Guarded";
  return "Low";
}

// ---------- main: HOME ONLY ----------
export default function OutbreakDashboardHome() {
  const [region, setRegion] = useState("NY");
  const [pathogen, setPathogen] = useState("flu");
  const [horizon, setHorizon] = useState(14);

  const [minRisk, setMinRisk] = useState(0.5);
  const [windowDays, setWindowDays] = useState(90);
  const [showMA, setShowMA] = useState(true);
  const [showOnset, setShowOnset] = useState(true);

  const [openAlert, setOpenAlert] = useState(false);

  const dataset = useMemo(
    () => makeSeries({ seed: 42, days: 210, regionId: region, pathogenId: pathogen }),
    [region, pathogen]
  );

  const windowed = useMemo(() => {
    const rows = dataset.rows;
    return rows.slice(Math.max(0, rows.length - windowDays));
  }, [dataset, windowDays]);

  const latest = windowed[windowed.length - 1];

  const alerts = useMemo(() => {
    return windowed
      .filter((r) => r.prob >= minRisk)
      .map((r) => ({
        ...r,
        reason:
          r.prob >= 0.85
            ? "Multi-signal surge (incidence + EWS + news/search)"
            : r.prob >= 0.7
            ? "Rising incidence + early warning indicators"
            : "Watchlist: mild elevation",
      }))
      .reverse();
  }, [windowed, minRisk]);

  const topSignals = useMemo(() => {
    if (!latest) return [];
    const items = [
      { label: "News", value: latest.newsZ },
      { label: "Search", value: latest.searchZ },
      { label: "Social", value: latest.socialZ },
      { label: "Variance (EWS)", value: latest.ewsVarianceZ },
      { label: "Slope", value: latest.ewsSlopeZ },
    ];
    return items.sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 5);
  }, [latest]);

  useEffect(() => {
    if (latest?.prob >= 0.85) setOpenAlert(true);
  }, [latest?.prob]);

  const titleLine = useMemo(() => {
    const r = REGIONS.find((x) => x.id === region)?.name ?? region;
    const p = PATHOGENS.find((x) => x.id === pathogen)?.name ?? pathogen;
    return `${r} • ${p} • Horizon: ${horizon} days`;
  }, [region, pathogen, horizon]);
const drawerWidth = 230;
  return (
    <Box className="pageRoot">
      <Container maxWidth="xl">
        {/* Header */}
        <Paper elevation={0} className="card headerCard">
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h5" className="headerTitle">
                Outbreak Early Warning
              </Typography>
              <Typography variant="body2" className="subtle" sx={{ mt: 0.5 }}>
                {titleLine}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <div className="controlsRow">
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Region</InputLabel>
                  <Select label="Region" value={region} onChange={(e) => setRegion(e.target.value)}>
                    {REGIONS.map((r) => (
                      <MenuItem key={r.id} value={r.id}>
                        {r.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Pathogen</InputLabel>
                  <Select label="Pathogen" value={pathogen} onChange={(e) => setPathogen(e.target.value)}>
                    {PATHOGENS.map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Horizon</InputLabel>
                  <Select label="Horizon" value={horizon} onChange={(e) => setHorizon(Number(e.target.value))}>
                    {HORIZONS.map((h) => (
                      <MenuItem key={h.id} value={h.id}>
                        {h.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button variant="outlined" onClick={() => setOpenAlert(true)}>
                  Test Alert
                </Button>
              </div>
            </Grid>
          </Grid>
        </Paper>

        {/* Main */}
        <Grid container spacing={2.5} sx={{ mt: 1 }}>
          {/* Left: Filters */}
          <Grid item xs={12} lg={4}>
            <Paper elevation={0} className="card">
              <Typography variant="subtitle1" className="filtersCardTitle">
                Filters
              </Typography>
              <Typography variant="body2" className="subtle" sx={{ mt: 0.5 }}>
                Adjust window and alert sensitivity
              </Typography>

              <div className="filtersBlock">
                <Typography variant="body2" className="subtle">
                  Min risk (alert list): {fmtPct(minRisk)}
                </Typography>
                <Slider value={minRisk} min={0} max={1} step={0.01} onChange={(_, v) => setMinRisk(Number(v))} />
              </div>

              <div className="filtersBlock">
                <Typography variant="body2" className="subtle">
                  Window: {windowDays} days
                </Typography>
                <Slider value={windowDays} min={30} max={180} step={1} onChange={(_, v) => setWindowDays(Number(v))} />
              </div>

              <div className="filtersBlock">
                <FormControlLabel
                  control={<Switch checked={showMA} onChange={(e) => setShowMA(e.target.checked)} />}
                  label="Show 7-day average"
                />
                <FormControlLabel
                  control={<Switch checked={showOnset} onChange={(e) => setShowOnset(e.target.checked)} />}
                  label="Mark onset"
                />
              </div>

              <div className="statusBox">
                <Typography variant="subtitle2" fontWeight={700}>
                  Today’s status
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1 }}>
                  <Typography variant="body2" className="subtle">
                    Risk
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="body2" fontWeight={700}>
                      {latest ? fmtPct(latest.prob) : "—"}
                    </Typography>
                    {latest ? levelChip(latest.alertLevel) : null}
                  </Box>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1 }}>
                  <Typography variant="body2" className="subtle">
                    Cases
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {latest ? fmtInt(latest.incidence) : "—"}
                  </Typography>
                </Box>
              </div>
            </Paper>
          </Grid>

          {/* Right: Home charts */}
          <Grid item xs={12} lg={8}>
            {/* KPI row */}
            <Grid container spacing={2} className="kpiGrid">
              <Grid item xs={12} md={6}>
                <Paper elevation={0} className="card">
                  <Typography variant="body2" className="subtle">
                    Current risk
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1 }}>
                    <Typography variant="h4" className="kpiValue">
                      {latest ? fmtPct(latest.prob) : "—"}
                    </Typography>
                    {latest ? levelChip(latest.alertLevel) : null}
                  </Box>
                  <Typography variant="body2" className="subtle" sx={{ mt: 0.5 }}>
                    Threshold: {fmtPct(dataset.meta.threshold)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper elevation={0} className="card">
                  <Typography variant="body2" className="subtle">
                    Cases (daily)
                  </Typography>
                  <Typography variant="h4" className="kpiValue" sx={{ mt: 1 }}>
                    {latest ? fmtInt(latest.incidence) : "—"}
                  </Typography>
                  <Typography variant="body2" className="subtle" sx={{ mt: 0.5 }}>
                    {showMA && latest ? `7-day avg: ${fmtInt(latest.incidenceMA7)}` : " "}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Charts */}
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Paper elevation={0} className="card">
                  <Typography variant="subtitle2" fontWeight={700}>
                    Risk probability
                  </Typography>
                  <Typography variant="body2" className="subtle" sx={{ mb: 1 }}>
                    Model output (toy) with threshold
                  </Typography>
                  <div className="chartBox">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={windowed} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="dateLabel" tickMargin={8} minTickGap={18} />
                        <YAxis domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                        <Tooltip
                          formatter={(v, k) => (k === "prob" ? [fmtPct(v), "Risk"] : [v, k])}
                          labelFormatter={(l, payload) => payload?.[0]?.payload?.date ?? l}
                        />
                        <ReferenceLine y={dataset.meta.threshold} strokeDasharray="4 4" />
                        <Line type="monotone" dataKey="prob" dot={false} stroke="#1976d2" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper elevation={0} className="card">
                  <Typography variant="subtitle2" fontWeight={700}>
                    Incidence
                  </Typography>
                  <Typography variant="body2" className="subtle" sx={{ mb: 1 }}>
                    Daily cases (and 7-day average)
                  </Typography>
                  <div className="chartBox">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={windowed} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="dateLabel" tickMargin={8} minTickGap={18} />
                        <YAxis tickFormatter={(v) => fmtInt(v)} />
                        <Tooltip
                          formatter={(v, k) => [fmtInt(v), k === "incidenceMA7" ? "7-day avg" : "Cases"]}
                          labelFormatter={(l, payload) => payload?.[0]?.payload?.date ?? l}
                        />
                        {showOnset && dataset.meta.onsetIdx >= 0 ? (
                          <ReferenceLine x={dataset.rows[dataset.meta.onsetIdx].dateLabel} strokeDasharray="4 4" />
                        ) : null}
                        <Line type="monotone" dataKey="incidence" dot={false} stroke="#2e7d32" strokeWidth={2} />
                        {showMA ? (
                          <Line type="monotone" dataKey="incidenceMA7" dot={false} stroke="#6d4c41" strokeWidth={2} />
                        ) : null}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper elevation={0} className="card">
                  <Typography variant="subtitle2" fontWeight={700}>
                    Today’s signal drivers
                  </Typography>
                  <Typography variant="body2" className="subtle" sx={{ mb: 1 }}>
                    Standardized proxy indicators (z-score)
                  </Typography>
                  <div className="chartBoxTall">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={topSignals.map((s) => ({ name: s.label, value: s.value }))}
                        margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={60} />
                        <YAxis />
                        <Tooltip formatter={(v) => [Number(v).toFixed(2), "z"]} />
                        <Bar dataKey="value" fill="#9c27b0" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper elevation={0} className="card">
                  <Typography variant="subtitle2" fontWeight={700}>
                    Recent alerts
                  </Typography>
                  <Typography variant="body2" className="subtle" sx={{ mb: 2 }}>
                    Days with risk ≥ {fmtPct(minRisk)}
                  </Typography>

                  {alerts.slice(0, 6).map((a) => (
                    <div key={a.date} className="alertItem">
                      <div className="alertLeft">
                        <div className="alertTags">
                          <Typography variant="body2" fontWeight={700}>
                            {a.date}
                          </Typography>
                          {levelChip(levelFromProb(a.prob))}
                          {a.isOnset ? <Chip size="small" label="Onset" /> : null}
                        </div>
                        <Typography variant="caption" className="subtle">
                          {a.reason}
                        </Typography>
                      </div>

                      <div className="alertRight">
                        <Typography variant="body2" fontWeight={800}>
                          {fmtPct(a.prob)}
                        </Typography>
                        <Typography variant="caption" className="subtle">
                          {fmtInt(a.incidence)} cases
                        </Typography>
                      </div>
                    </div>
                  ))}

                  {alerts.length === 0 ? (
                    <Box sx={{ p: 2, borderRadius: 2, border: "1px dashed rgba(0,0,0,0.25)" }}>
                      <Typography variant="body2" className="subtle">
                        No alerts in this window. Try lowering the min risk filter.
                      </Typography>
                    </Box>
                  ) : null}
                </Paper>
              </Grid>
            </Grid>

            <Typography variant="caption" className="footerNote">
              Demo data is synthetic. Generator will be swapped with real pipeline outputs (Delphi incidence, GDELT-derived features, etc.) in the futrue.
            </Typography>
          </Grid>
        </Grid>
      </Container>

      {/* Alert dialog */}
      <Dialog open={openAlert} onClose={() => setOpenAlert(false)} maxWidth="sm" fullWidth>
        <DialogTitle>High-risk alert</DialogTitle>
        <DialogContent>
          <Typography variant="body2" className="subtle">
            {latest
              ? `Current risk is ${fmtPct(latest.prob)} (${levelFromProb(latest.prob)}). Recommended action: verify with official surveillance and review drivers.`
              : "No data loaded."}
          </Typography>

          {latest ? (
            <Box sx={{ mt: 2, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Typography variant="caption" className="subtle">
                  Date
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {latest.date}
                </Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Typography variant="caption" className="subtle">
                  Cases
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {fmtInt(latest.incidence)}
                </Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Typography variant="caption" className="subtle">
                  Threshold
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {fmtPct(dataset.meta.threshold)}
                </Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Typography variant="caption" className="subtle">
                  Level
                </Typography>
                <Box sx={{ mt: 0.5 }}>{levelChip(levelFromProb(latest.prob))}</Box>
              </Paper>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAlert(false)} variant="outlined">
            Dismiss
          </Button>
          <Button onClick={() => setOpenAlert(false)} variant="contained">
            Acknowledge
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
