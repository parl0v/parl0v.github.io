import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

// ─── All 51 Rivals weapons (grouped by category) ──────────────
const WEAPONS = [
  // Primary (16)
  "Assault Rifle", "Bow", "Burst Rifle", "Crossbow", "Distortion",
  "Energy Rifle", "Flamethrower", "Grenade Launcher", "Gunblade", "Minigun",
  "Paintball Gun", "Permafrost", "RPG", "Scepter", "Shotgun", "Sniper",
  // Secondary (12)
  "Daggers", "Energy Pistols", "Exogun", "Flare Gun", "Glass Cannon",
  "Handgun", "Revolver", "Shorty", "Slingshot", "Spray", "Uzi", "Warper",
  // Melee (10)
  "Battle Axe", "Chainsaw", "Fists", "Glast Shard", "Katana", "Knife",
  "Maul", "Riot Shield", "Scythe", "Trowel",
  // Utility (13)
  "Elixir", "Flashbang", "Freeze Ray", "Grenade", "Jump Pad", "Medkit",
  "Molotov", "RNG Dice", "Satchel", "Smoke Grenade", "Subspace Tripmine",
  "War Horn", "Warpstone",
];

const RARITY_ORDER = [
  "Common", "Rare", "Legendary", "Mythical", "Special", "Glorious", "Unobtainable",
];

function defaultConfig() {
  const obj = {};
  WEAPONS.forEach((w) => (obj[w] = { Skin: "" }));
  return obj;
}

function generateConfig(config) {
  const inner = {};
  WEAPONS.forEach((weapon) => {
    inner[weapon] = { Skin: config[weapon]?.Skin ?? "" };
  });
  return JSON.stringify({ Skin: inner }, null, 2);
}

// ─── App ──────────────────────────────────────────────────────
export default function App() {
  const [skins, setSkins] = useState([]);
  const [weaponFilter, setWeaponFilter] = useState("");
  const [rarityFilter, setRarityFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("az");
  const [config, setConfig] = useState(defaultConfig);
  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    fetch("/skins.json")
      .then((r) => r.json())
      .then(setSkins);
  }, []);

  const weapons = useMemo(
    () => [...new Set(skins.map((s) => s.weapon))].sort(),
    [skins]
  );

  const stats = useMemo(() => {
    const count = {};
    skins.forEach((s) => { count[s.rarity] = (count[s.rarity] || 0) + 1; });
    return count;
  }, [skins]);

  const filtered = useMemo(() => {
    let data = [...skins];
    if (weaponFilter) data = data.filter((s) => s.weapon === weaponFilter);
    if (rarityFilter) data = data.filter((s) => s.rarity === rarityFilter);
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (s) =>
          s.skin_name.toLowerCase().includes(q) ||
          s.weapon.toLowerCase().includes(q)
      );
    }
    if (sort === "az") data.sort((a, b) => a.skin_name.localeCompare(b.skin_name));
    if (sort === "za") data.sort((a, b) => b.skin_name.localeCompare(a.skin_name));
    if (sort === "rarity") {
      data.sort((a, b) => {
        const diff = RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
        return diff !== 0 ? diff : a.skin_name.localeCompare(b.skin_name);
      });
    }
    return data;
  }, [skins, weaponFilter, rarityFilter, search, sort]);

  const equipSkin = useCallback((skin) => {
    setConfig((prev) => ({ ...prev, [skin.weapon]: { Skin: skin.skin_name } }));
  }, []);

  const clearSkin = useCallback((weapon) => {
    setConfig((prev) => ({ ...prev, [weapon]: { Skin: "" } }));
  }, []);

  function handleExport() {
    navigator.clipboard.writeText(generateConfig(config)).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  }

  function handleDownload() {
    const blob = new Blob([generateConfig(config)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Skins.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport() {
    const text = importText.trim();
    if (!text) {
      alert("Please paste a config first.");
      return;
    }
    try {
      const parsed = JSON.parse(text);
      // Accept both { Skin: { ... } } and bare { "Assault Rifle": { Skin: "" }, ... }
      const skinMap = parsed?.Skin ?? parsed;
      if (typeof skinMap !== "object" || Array.isArray(skinMap)) throw new Error();
      const newConfig = defaultConfig();
      let applied = 0;
      Object.entries(skinMap).forEach(([weapon, val]) => {
        if (Object.prototype.hasOwnProperty.call(newConfig, weapon)) {
          newConfig[weapon] = { Skin: typeof val === "object" ? (val?.Skin ?? "") : String(val) };
          applied++;
        }
      });
      setConfig(newConfig);
      setImportText("");
      setShowImport(false);
      document.title = `✓ Imported ${applied} entries`;
      setTimeout(() => (document.title = "Rivals Skins - Config Maker"), 2500);
    } catch {
      alert('Invalid JSON.\n\nExpected format:\n{"Skin":{"Assault Rifle":{"Skin":"Phoenix Rifle"},...}}');
    }
  }

  function randomSkin() {
    if (!skins.length) return;
    equipSkin(skins[Math.floor(Math.random() * skins.length)]);
  }

  function clearFilters() {
    setWeaponFilter("");
    setRarityFilter("");
    setSearch("");
  }

  const equippedCount = useMemo(
    () => Object.values(config).filter((v) => v.Skin !== "").length,
    [config]
  );

  const hasFilters = weaponFilter || rarityFilter || search;

  return (
    <div className="app">
      {/* ── Main Area ── */}
      <div className="main">
        <header className="header">
          <div className="header-title">
            <h1>Rivals <span className="accent">Skins</span></h1>
            <p className="subtitle">
              {skins.length} skins &middot; {weapons.length} weapons
            </p>
          </div>

          <div className="stats-row">
            {RARITY_ORDER.filter((r) => stats[r]).map((r) => (
              <button
                key={r}
                className={`stat-chip rarity-chip-${r}${rarityFilter === r ? " active" : ""}`}
                onClick={() => setRarityFilter(rarityFilter === r ? "" : r)}
                title={`Filter by ${r}`}
              >
                <span className="stat-dot" />
                {r} <strong>{stats[r]}</strong>
              </button>
            ))}
          </div>
        </header>

        <div className="controls">
          <div className="search-wrap">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              placeholder="Search skins or weapons…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="clear-input-btn" onClick={() => setSearch("")} aria-label="Clear search">
                ×
              </button>
            )}
          </div>

          <select value={weaponFilter} onChange={(e) => setWeaponFilter(e.target.value)}>
            <option value="">All Weapons</option>
            {weapons.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>

          <select value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)}>
            <option value="">All Rarities</option>
            {RARITY_ORDER.filter((r) => stats[r]).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="az">A → Z</option>
            <option value="za">Z → A</option>
            <option value="rarity">By Rarity</option>
          </select>

          <button className="btn-random" onClick={randomSkin} title="Equip a random skin">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="14" height="14">
              <polyline points="16 3 21 3 21 8" />
              <line x1="4" y1="20" x2="21" y2="3" />
              <polyline points="21 16 21 21 16 21" />
              <line x1="15" y1="15" x2="21" y2="21" />
            </svg>
            Random
          </button>
        </div>

        <div className="results-info">
          Showing <strong>{filtered.length}</strong> of {skins.length} skins
          {hasFilters && (
            <button className="reset-filters-btn" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>

        <div className="grid">
          {filtered.map((skin) => (
            <SkinCard
              key={skin.skin_name + skin.weapon}
              skin={skin}
              onEquip={equipSkin}
            />
          ))}
          {filtered.length === 0 && (
            <div className="empty-state">No skins found. Try different filters.</div>
          )}
        </div>
      </div>

      {/* ── Config Panel ── */}
      <ConfigPanel
        config={config}
        equippedCount={equippedCount}
        copySuccess={copySuccess}
        showImport={showImport}
        importText={importText}
        onExport={handleExport}
        onDownload={handleDownload}
        onClearAll={() => setConfig(defaultConfig())}
        onClearSkin={clearSkin}
        onToggleImport={() => setShowImport((v) => !v)}
        onImportTextChange={setImportText}
        onImport={handleImport}
      />
    </div>
  );
}

// ─── SkinCard ─────────────────────────────────────────────────
function SkinCard({ skin, onEquip }) {
  const ref = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("show");
          observer.disconnect();
        }
      },
      { threshold: 0.08 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function handleMouseMove(e) {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    el.style.transform = `perspective(600px) rotateX(${(0.5 - y) * 14}deg) rotateY(${(x - 0.5) * 14}deg) scale(1.04)`;
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
  }

  function handleMouseLeave(e) {
    e.currentTarget.style.transform = "perspective(600px) rotateX(0deg) rotateY(0deg) scale(1)";
  }

  const rarity = skin.rarity ?? "Common";

  return (
    <div
      ref={ref}
      className={`card rarity-${rarity}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="card-img-wrap">
        {!imgLoaded && !imgError && <div className="img-skeleton" />}
        {!imgError && (
          <img
            src={skin.image}
            alt={skin.skin_name}
            loading="lazy"
            style={{ opacity: imgLoaded ? 1 : 0 }}
            onLoad={() => setImgLoaded(true)}
            onError={() => { setImgLoaded(true); setImgError(true); }}
          />
        )}
        {imgError && <span className="img-error-text">No image</span>}
      </div>

      <div className="card-info">
        <span className={`rarity-badge badge-${rarity}`}>{rarity}</span>
        <p className="card-name">{skin.skin_name}</p>
        <span className="card-weapon">{skin.weapon}</span>
      </div>

      <button className="equip-btn" onClick={() => onEquip(skin)} title={`Equip "${skin.skin_name}"`}>
        +
      </button>
    </div>
  );
}

// ─── ConfigPanel ──────────────────────────────────────────────
const SAVE_PATH = "C:\\Matcha\\workspace\\Celeste\\Rivals\\Config";

function ConfigPanel({
  config, equippedCount, copySuccess, showImport,
  importText, onExport, onDownload, onClearAll, onClearSkin,
  onToggleImport, onImportTextChange, onImport,
}) {
  return (
    <aside className="config-panel">
      <div className="config-header">
        <h2>Config Preview</h2>
        <span className="equipped-pill">{equippedCount} / {WEAPONS.length}</span>
      </div>

      <pre className="config-code">{generateConfig(config)}</pre>

      <div className="config-actions">
        <button
          className={`btn-copy${copySuccess ? " copied" : ""}`}
          onClick={onExport}
        >
          {copySuccess ? "✓ Copied!" : "Copy"}
        </button>
        <button className="btn-download" onClick={onDownload} title="Download as Skins.txt">
          ↓ Download
        </button>
        <button className="btn-clear-all" onClick={onClearAll}>
          Clear
        </button>
      </div>

      <p className="save-hint" title={SAVE_PATH}>
        Save to: <code>{SAVE_PATH}</code>
      </p>

      <button className="btn-import-toggle" onClick={onToggleImport}>
        {showImport ? "▲ Hide Import" : "▼ Import Config"}
      </button>

      {showImport && (
        <div className="import-section">
          <textarea
            placeholder={'Paste your JSON config here…\n{"Skin":{"Assault Rifle":{"Skin":"Phoenix Rifle"},…}}'}
            value={importText}
            onChange={(e) => onImportTextChange(e.target.value)}
            rows={6}
          />
          <button className="btn-apply-import" onClick={onImport}>
            Apply Import
          </button>
        </div>
      )}

      <hr className="config-divider" />

      <div className="slots-section">
        <p className="slots-label">Equipped Skins</p>
        {WEAPONS.map((weapon) => {
          const skin = config[weapon]?.Skin || "";
          return (
            <div key={weapon} className={`slot ${skin ? "slot-equipped" : "slot-empty"}`}>
              <span className="slot-weapon">{weapon}</span>
              <span className="slot-skin">{skin || "—"}</span>
              {skin && (
                <button
                  className="slot-clear-btn"
                  onClick={() => onClearSkin(weapon)}
                  title={`Clear ${weapon}`}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
