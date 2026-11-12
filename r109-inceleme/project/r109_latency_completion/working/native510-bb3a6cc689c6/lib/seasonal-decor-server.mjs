// V453: decoration data is configuration, never an entity or a simulation job.
// This self-contained factory is shared by the source route and injected into
// the two actual V452 native server bundles without rebuilding stale sources.
export function createSeasonalDecorServer453() {
  const areas = ['forest','frozen','black','bazaar','fishing','sanctum','sinsi','war','arena',"ancient","afk","dragon","event","rune",'guild_arena'];
  const themes = ['new_year','halloween','ramadan','first_light'];
  const acceptedThemes = ['none', ...themes];
  const cache = new Map();
  const readSql = 'SELECT seasonal_themes_json,new_year_mode,halloween_mode FROM game_settings WHERE id=1';
  const writeSql = 'UPDATE game_settings SET seasonal_themes_json=? WHERE id=1 AND seasonal_themes_json=? AND new_year_mode=? AND halloween_mode=?';
  let parseCount = 0;
  const plain = value => !!value && typeof value === 'object' && !Array.isArray(value);
  const n = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
  const round = value => Math.round(value * 1e5) / 1e5;
  const validRevision = revision => Number.isSafeInteger(revision) && revision >= 0;
  const error = (status, message) => ({ok:false,status,error:message});
  function validateLayout(theme, props, lights) {
    if (!themes.includes(theme) || !Array.isArray(props) || props.length > 32 || !Array.isArray(lights) || lights.length > 8) return null;
    const normalizedProps = [], normalizedLights = [];
    for (const prop of props) {
      if (!Array.isArray(prop) || prop.length < 4 || prop.length > 5 || !Number.isInteger(prop[0]) || prop[0] < 0 || prop[0] > ((theme === "new_year" || theme === "halloween") ? 11 : 5) ||
          !n(prop[1],0,1) || !n(prop[2],0,1) || !n(prop[3],60,320) || (prop.length === 5 && typeof prop[4] !== 'boolean')) return null;
      normalizedProps.push(prop.length === 5 ? [prop[0],round(prop[1]),round(prop[2]),round(prop[3]),prop[4]] : [prop[0],round(prop[1]),round(prop[2]),round(prop[3])]);
    }
    for (const light of lights) {
      if (!Array.isArray(light) || light.length !== 5 || !n(light[0],0,1) || !n(light[1],0,1) || !n(light[2],0,1) || !n(light[3],0,1) || !n(light[4],0,.08)) return null;
      normalizedLights.push(light.map(round));
    }
    return {props:normalizedProps,lights:normalizedLights};
  }
  function parse(raw) {
    raw = typeof raw === 'string' && raw.length <= 196608 ? raw : '{}';
    if (cache.has(raw)) return cache.get(raw);
    parseCount++;
    let map;
    try { map = JSON.parse(raw); } catch { map = {}; }
    if (!plain(map)) map = {};
    const publicThemes = {};
    for (const area of areas.slice(0,-1)) if (Object.hasOwn(map,area) && acceptedThemes.includes(map[area])) publicThemes[area] = map[area];
    const layouts = {};
    if (map.__decor?.version === 1 && plain(map.__decor.layouts)) for (const theme of themes) for (const area of areas) {
      const key = theme + ':' + area;
      const value = map.__decor.layouts[key];
      if (!plain(value) || !validRevision(value.revision) || typeof value.custom !== 'boolean') continue;
      const layout = validateLayout(theme,value.props,value.lights);
      if (!layout) continue;
      const item = {revision:value.revision,custom:value.custom,...(value.custom ? layout : {props:[],lights:[]})};
      for (const tuple of item.props) Object.freeze(tuple);
      for (const tuple of item.lights) Object.freeze(tuple);
      Object.freeze(item.props); Object.freeze(item.lights); Object.freeze(item);
      layouts[key] = item;
    }
    const config = Object.freeze({themes:Object.freeze(publicThemes),layouts:Object.freeze(layouts),publicJson:JSON.stringify(publicThemes)});
    if (cache.size >= 4) cache.delete(cache.keys().next().value);
    cache.set(raw,config);
    return config;
  }
  function theme(settings, area) {
    if (!areas.includes(area)) return 'none';
    const themeArea = area === 'guild_arena' ? 'arena' : area;
    const config = parse(settings?.seasonal_themes_json);
    return Object.hasOwn(config.themes,themeArea) ? config.themes[themeArea] : Number(settings?.new_year_mode) === 1 ? 'new_year' : Number(settings?.halloween_mode) === 1 ? 'halloween' : 'none';
  }
  function layout(settings, area, selectedTheme) {
    if (!areas.includes(area) || !themes.includes(selectedTheme)) return null;
    return parse(settings?.seasonal_themes_json).layouts[selectedTheme + ':' + area] ?? null;
  }
  function projectSettings(settings, area, arenaMatchId = '') {
    const raw = settings?.seasonal_themes_json;
    // The baseline has no custom records. Preserve the exact original object,
    // shape and bytes until an administrator creates a decoration revision.
    if (typeof raw !== 'string' || !raw.includes('__decor')) return settings;
    // Guild matches persist player.area='arena'. Their existing match ID
    // already identifies the courtyard; no new viewer query is necessary.
    if (area === 'arena' && typeof arenaMatchId === 'string' && arenaMatchId.startsWith('guild-')) area = 'guild_arena';
    const config = parse(raw);
    const result = {...settings,seasonal_themes_json:config.publicJson};
    delete result.seasonal_decor_current;
    const selectedTheme = theme(settings,area);
    const selected = selectedTheme === 'none' ? null : config.layouts[selectedTheme + ':' + area];
    if (selected) result.seasonal_decor_current = {area,theme:selectedTheme,...selected};
    return result;
  }
  function pack(config, publicThemes = config.themes, layouts = config.layouts) {
    return JSON.stringify({...publicThemes,...(Object.keys(layouts).length ? {__decor:{version:1,layouts}} : {})});
  }
  async function save(database, payload) {
    if (!areas.includes(payload.area) || !themes.includes(payload.theme) || !validRevision(payload.expectedRevision) || payload.expectedRevision === Number.MAX_SAFE_INTEGER) return error(400,'Harita, tema veya yerleşim sürümü geçersiz.');
    const resetting = payload.action === 'reset_decor_layout';
    if (!resetting && payload.action !== 'set_decor_layout') return error(400,'Süsleme işlemi geçersiz.');
    const nextLayout = resetting ? {props:[],lights:[]} : validateLayout(payload.theme,payload.props,payload.lights);
    if (!nextLayout) return error(400,'En fazla 32 süs ve 8 ışık dizisi kullanılabilir. Süs türü, boyutu veya konumu geçersiz.');
    const current = await database.prepare(readSql).first();
    if (!current) return error(409,'Dünya ayarı bulunamadı. Paneli yenile.');
    const config = parse(current.seasonal_themes_json);
    const key = payload.theme + ':' + payload.area;
    if ((config.layouts[key]?.revision ?? 0) !== payload.expectedRevision) return error(409,'Bu yerleşim başka pencerede değişti. Paneli yenile.');
    const revision = payload.expectedRevision + 1;
    const layouts = {...config.layouts,[key]:{revision,custom:!resetting,...nextLayout}};
    const saved = await database.prepare(writeSql).bind(pack(config,config.themes,layouts),current.seasonal_themes_json,current.new_year_mode,current.halloween_mode).run();
    if (!saved.meta?.changes) return error(409,'Süsler veya temalar başka pencerede değişti. Paneli yenile.');
    cache.clear();
    return {ok:true,revision};
  }
  async function setMapTheme(database,payload) {
    if (!areas.slice(0,-1).includes(payload.area) || !acceptedThemes.includes(payload.theme)) return error(400,'Harita veya tema geçersiz. Zindanda tema kullanılamaz.');
    const current = await database.prepare(readSql).first();
    if (!current || theme(current,payload.area) !== payload.expectedTheme) return error(409,'Bu haritanın teması değişmiş. Paneli yenileyip tekrar dene.');
    const config = parse(current.seasonal_themes_json);
    const map = Object.fromEntries(areas.slice(0,-1).map(area=>[area,theme(current,area)]));
    map[payload.area] = payload.theme;
    const saved = await database.prepare(writeSql).bind(pack(config,map),current.seasonal_themes_json,current.new_year_mode,current.halloween_mode).run();
    if (!saved.meta?.changes) return error(409,'Temalar başka pencerede değişti. Paneli yenile.');
    cache.clear();
    return {ok:true};
  }
  async function setGlobalTheme(database,payload) {
    if (typeof payload.enabled !== 'boolean' || !['set_new_year_mode','set_halloween_mode'].includes(payload.action)) return error(400,'Tema durumu geçersiz.');
    const current = await database.prepare(readSql).first();
    if (!current) return error(409,'Dünya ayarı bulunamadı. Paneli yenile.');
    const config = parse(current.seasonal_themes_json);
    const winter = payload.action === 'set_new_year_mode';
    const newYear = winter ? (payload.enabled ? 1 : 0) : payload.enabled ? 0 : current.new_year_mode;
    const halloween = winter ? payload.enabled ? 0 : current.halloween_mode : (payload.enabled ? 1 : 0);
    const saved = await database.prepare('UPDATE game_settings SET seasonal_themes_json=?,new_year_mode=?,halloween_mode=? WHERE id=1 AND seasonal_themes_json=? AND new_year_mode=? AND halloween_mode=?').bind(pack(config,{}),newYear,halloween,current.seasonal_themes_json,current.new_year_mode,current.halloween_mode).run();
    if (!saved.meta?.changes) return error(409,'Temalar başka pencerede değişti. Paneli yenile.');
    cache.clear();
    return {ok:true};
  }
  return Object.freeze({projectSettings,save,setMapTheme,setGlobalTheme,layout,theme,validateLayout,cacheState:()=>({size:cache.size,parseCount})});
}
export const seasonalDecorServer453 = createSeasonalDecorServer453();
