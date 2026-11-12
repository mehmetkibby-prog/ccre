// ../tmp/core511-r93-zumrut/working/core511-source/scripts/core511/zumrut-map-r93.mjs
var ZUMRUT_AREA = "zumrut";
var ZUMRUT_NAME = "Z\xFCmr\xFCt Vadisi";
var ZUMRUT_BOUNDS = Object.freeze({ width: 4800, height: 3200 });
var ZUMRUT_SPAWN = Object.freeze({ x: 1100, y: 2630 });
var ZUMRUT_NPC = Object.freeze({ id: "usta", x: 1190, y: 2490, name: "Da\u011Fc\u0131 Aras", title: "Balta & Kazma" });
var ZUMRUT_BENCH = Object.freeze({ id: "workbench", x: 1485, y: 2445, name: "Vadi Tezg\xE2h\u0131" });
var ZUMRUT_REACH = 150;
var ZUMRUT_BRIDGES = Object.freeze([1140, 2345]);
var ZUMRUT_CHALET_R93 = Object.freeze({ left: 505, top: 1860, right: 1150, bottom: 2415 });
var SCALE = 3.125;
var GRID = 256;
var RIVER_PIXELS = [[0, 954, 38], [60, 954, 36], [130, 951, 38], [170, 927, 66], [190, 884, 72], [210, 845, 69], [230, 811, 64], [250, 781, 62], [270, 766, 49], [290, 784, 52], [310, 812, 61], [330, 834, 63], [350, 841, 65], [370, 850, 63], [390, 885, 70], [410, 920, 74], [430, 950, 74], [450, 965, 75], [470, 949, 71], [490, 921, 68], [510, 875, 73], [530, 823, 76], [550, 783, 69], [570, 757, 65], [590, 766, 69], [610, 791, 70], [630, 836, 74], [650, 876, 73], [670, 913, 74], [690, 930, 74], [710, 934, 62], [730, 938, 64], [750, 946, 66], [770, 965, 56], [790, 987, 62], [810, 1019, 63], [830, 1040, 66], [850, 1044, 66], [870, 1025, 64], [890, 991, 64], [910, 952, 66], [930, 934, 66], [950, 927, 62], [970, 941, 64], [990, 977, 70], [1010, 1009, 67], [1024, 1043, 68]];
var PATH_PIXELS = [[[345, 202], [330, 224], [349, 252], [400, 280], [457, 318], [547, 348], [640, 365], [695, 378], [759, 355]], [[548, 347], [438, 358], [352, 383], [321, 419], [292, 467], [254, 505], [240, 534], [266, 568], [296, 602], [377, 642], [461, 685], [538, 719], [599, 768], [653, 793], [740, 779], [818, 757], [855, 750]], [[260, 552], [361, 533], [415, 507], [464, 485], [524, 462], [576, 422], [644, 395], [703, 378]], [[855, 750], [756, 774], [631, 808], [495, 817], [382, 850], [295, 849]], [[907, 346], [1e3, 329], [1084, 335], [1161, 311], [1210, 291], [1299, 265], [1358, 255], [1407, 276], [1455, 309], [1440, 357], [1410, 392], [1388, 433], [1351, 455], [1360, 484], [1393, 512], [1367, 549], [1261, 570], [1190, 576], [1148, 600], [1120, 639], [1119, 672], [1082, 710], [1046, 743], [1012, 751]]];
var TREE_PIXELS = [[155, 145], [215, 204], [276, 169], [310, 112], [390, 180], [441, 145], [510, 175], [570, 147], [604, 204], [724, 216], [779, 201], [678, 259], [524, 220], [456, 254], [555, 308], [613, 333], [380, 332], [315, 298], [270, 253], [110, 278], [168, 329], [108, 382], [174, 450], [276, 434], [338, 493], [456, 384], [518, 399], [636, 439], [730, 508], [818, 502], [566, 528], [390, 577], [217, 532], [110, 532], [37, 502], [156, 633], [50, 650], [426, 607], [500, 650], [577, 612], [642, 707], [633, 846], [568, 899], [399, 918], [340, 828], [219, 900], [132, 968], [85, 862], [69, 799], [351, 975], [475, 962], [669, 992], [715, 910], [824, 897], [783, 827], [1096, 170], [1146, 180], [1189, 245], [1287, 255], [1365, 219], [1480, 304], [1394, 356], [1250, 335], [1125, 300], [991, 315], [939, 279], [1058, 248], [1190, 391], [1467, 401], [1278, 470], [1130, 460], [1214, 526], [1315, 519], [1446, 560], [1110, 582], [1015, 590], [1058, 665], [1251, 624], [1315, 678], [1402, 725], [1500, 728], [1268, 751], [1162, 714], [1324, 809], [1470, 873], [1408, 937], [1250, 981], [1157, 986], [1210, 894], [1474, 1009]];
var ROCK_PIXELS = [[116, 174], [356, 124], [316, 205], [214, 265], [260, 320], [321, 375], [424, 484], [71, 565], [296, 871], [223, 977], [38, 901], [150, 793], [583, 652], [619, 567], [610, 487], [666, 305], [639, 223], [799, 462], [770, 710], [701, 835], [972, 605], [962, 548], [1008, 220], [1054, 300], [1027, 357], [1248, 399], [1299, 347], [1413, 262], [1318, 179], [1503, 213], [1494, 467], [1155, 496], [1143, 756], [1343, 721], [1441, 825], [1270, 884], [1491, 937], [1343, 955], [1424, 684], [1070, 928]];
var riverRows = Object.freeze(RIVER_PIXELS.map((row) => Object.freeze(row.map((value) => value * SCALE))));
function riverValue(y, column) {
  if (y <= riverRows[0][0]) return riverRows[0][column];
  if (y >= riverRows.at(-1)[0]) return riverRows.at(-1)[column];
  let low = 0, high = riverRows.length - 1;
  while (high - low > 1) {
    const mid = low + high >> 1;
    if (riverRows[mid][0] > y) high = mid;
    else low = mid;
  }
  const a = riverRows[low], b = riverRows[high], t = (y - a[0]) / (b[0] - a[0]);
  return a[column] + (b[column] - a[column]) * t;
}
var ZUMRUT_RIVER_POINTS_R93 = riverRows;
var zumrutRiverX = (y) => riverValue(y, 1);
var zumrutRiverHalfWidth = (y) => riverValue(y, 2);
function zumrutOnBridge(x, y) {
  return ZUMRUT_BRIDGES.some((by, i) => {
    const dx = x - zumrutRiverX(by);
    return Math.abs(dx) <= 310 && Math.abs(y - by + dx * (i ? 0.21 : 0.16)) <= 69;
  });
}
function zumrutInWater(x, y) {
  return Math.abs(x - zumrutRiverX(y)) < zumrutRiverHalfWidth(y) && !zumrutOnBridge(x, y);
}
function zumrutFishingPoint(point) {
  const y = Math.max(570, Math.min(3070, Number(point?.y) || 0)), center = zumrutRiverX(y), side = (Number(point?.x) || 0) < center ? -1 : 1;
  return { x: center + side * (zumrutRiverHalfWidth(y) - 36), y };
}
function zumrutNearRiver(point) {
  const x = Number(point?.x), y = Number(point?.y);
  return Number.isFinite(x) && Number.isFinite(y) && y >= 570 && y <= 3070 && !zumrutOnBridge(x, y) && !zumrutInWater(x, y) && Math.abs(x - zumrutRiverX(y)) - zumrutRiverHalfWidth(y) <= 100;
}
function segmentDistance(x, y, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], length = dx * dx + dy * dy, t = length ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / length)) : 0;
  return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t);
}
function zumrutPathDistance(x, y) {
  let d = Infinity;
  for (const path of PATH_PIXELS) for (let i = 1; i < path.length; i++) d = Math.min(d, segmentDistance(x / SCALE, y / SCALE, path[i - 1], path[i]) * SCALE);
  return d;
}
var nodes = [];
var cells = /* @__PURE__ */ new Map();
var byId = /* @__PURE__ */ new Map();
var cellKey = (x, y) => Math.floor(x / GRID) + "," + Math.floor(y / GRID);
function nearby(x, y, r) {
  const out = [];
  for (let cy = Math.floor((y - r) / GRID); cy <= Math.floor((y + r) / GRID); cy++) for (let cx = Math.floor((x - r) / GRID); cx <= Math.floor((x + r) / GRID); cx++) for (const node of cells.get(cx + "," + cy) ?? []) out.push(node);
  return out;
}
for (const [kind, points] of [["tree", TREE_PIXELS], ["rock", ROCK_PIXELS]]) for (let i = 0; i < points.length; i++) {
  const [px, py] = points[i], x = px * SCALE, y = py * SCALE, variant = i % 2;
  const node = Object.freeze({ id: kind + "-" + String(i + 1).padStart(3, "0"), kind, x, y, variant, scale: kind === "tree" ? 0.86 + i * 7 % 11 * 0.023 : 0.86 + i * 3 % 9 * 0.025, radius: kind === "tree" ? 21 : 28 });
  nodes.push(node);
  byId.set(node.id, node);
  const key2 = cellKey(x, y);
  if (!cells.has(key2)) cells.set(key2, []);
  cells.get(key2).push(node);
}
var ZUMRUT_NODES = Object.freeze(nodes);
var ZUMRUT_LAYOUT_R93 = Object.freeze({ version: 2, trees: TREE_PIXELS.length, rocks: ROCK_PIXELS.length, worldWidth: 4800, worldHeight: 3200 });
function zumrutNode(id) {
  return byId.get(id) ?? null;
}
function zumrutNodesInRect(x, y, width, height, pad = 180) {
  const out = [];
  for (let cy = Math.floor((y - pad) / GRID); cy <= Math.floor((y + height + pad) / GRID); cy++) for (let cx = Math.floor((x - pad) / GRID); cx <= Math.floor((x + width + pad) / GRID); cx++) for (const node of cells.get(cx + "," + cy) ?? []) if (node.x >= x - pad && node.x <= x + width + pad && node.y >= y - pad && node.y <= y + height + pad) out.push(node);
  return out;
}
function zumrutWalkable(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 75 || x > 4725 || y < 400 || y > 3120 || zumrutInWater(x, y)) return false;
  const house = ZUMRUT_CHALET_R93;
  if (x >= house.left && x <= house.right && y >= house.top && y <= house.bottom) return false;
  if (Math.hypot(x - ZUMRUT_BENCH.x, y - ZUMRUT_BENCH.y) < 47 || Math.hypot(x - ZUMRUT_NPC.x, y - ZUMRUT_NPC.y) < 31) return false;
  return true;
}
function zumrutSegment(x0, y0, x1, y1) {
  if (![x0, y0, x1, y1].every(Number.isFinite) || !zumrutWalkable(x0, y0)) return false;
  const distance = Math.hypot(x1 - x0, y1 - y0), steps = Math.max(1, Math.ceil(distance / 12));
  if (steps > 1e3) return false;
  for (let i = 1; i <= steps; i++) if (!zumrutWalkable(x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps)) return false;
  return true;
}
function zumrutNearest(point, reach = ZUMRUT_REACH, eligible = () => true) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  let chosen = null, best = reach;
  for (const node of [...nearby(point.x, point.y, reach), { ...ZUMRUT_NPC, kind: "shop" }, { ...ZUMRUT_BENCH, kind: "craft" }]) {
    if (!eligible(node)) continue;
    const d = Math.hypot(node.x - point.x, node.y - point.y);
    if (d <= best) {
      chosen = node;
      best = d;
    }
  }
  return chosen;
}
function zumrutHit(x, y, eligible = () => true) {
  let chosen = null, best = Infinity;
  for (const node of [...nearby(x, y, 220), { ...ZUMRUT_NPC, kind: "shop" }, { ...ZUMRUT_BENCH, kind: "craft" }]) {
    if (!eligible(node)) continue;
    const half = node.kind === "tree" ? 63 : node.kind === "rock" ? 54 : 70, height = node.kind === "tree" ? 220 : node.kind === "shop" ? 135 : 90;
    if (Math.abs(x - node.x) <= half && y >= node.y - height && y <= node.y + 20) {
      const d = Math.hypot(x - node.x, y - (node.y - height / 2));
      if (d < best) {
        chosen = node;
        best = d;
      }
    }
  }
  return chosen;
}
var ZUMRUT_WORLD_R93 = Object.freeze({ ...ZUMRUT_BOUNDS, minX: 75, maxX: 4725, minY: 400, maxY: 3120 });
var isZumrutWalkableR93 = zumrutWalkable;
var isZumrutSegmentR93 = zumrutSegment;
var canZumrutFishR93 = (x, y) => zumrutNearRiver({ x, y }) && zumrutWalkable(x, y);

// ../tmp/core511-r93-zumrut/working/core511-source/scripts/core511/zumrut-icons-r93.mjs
var ZUMRUT_ART_FILE_R93 = "zumrut-items-r93-7753cdbf438ef095.webp";
var ZUMRUT_ART_URL_R93 = new URL("./" + ZUMRUT_ART_FILE_R93, import.meta.url).href;
var ZUMRUT_TALISMAN_FILE_R93 = "mount-talisman-r93-0bd57198fab39f6a.webp";
var ZUMRUT_TALISMAN_URL_R93 = new URL("./" + ZUMRUT_TALISMAN_FILE_R93, import.meta.url).href;
var ZUMRUT_ICON_CELLS_R93 = Object.freeze({
  wood: Object.freeze([0, 0]),
  stone: Object.freeze([1, 0]),
  axe: Object.freeze([0, 1]),
  pickaxe: Object.freeze([1, 1]),
  talisman: Object.freeze([0, 0])
});
var aliases = Object.freeze({ mount_talisman_r93: "talisman", "material:mount_talisman_r93": "talisman", zumrut_wood_r93: "wood", zumrut_stone_r93: "stone", zumrut_axe_r93: "axe", zumrut_pickaxe_r93: "pickaxe", zumrut_wood: "wood", zumrut_stone: "stone", zumrut_axe: "axe", zumrut_pickaxe: "pickaxe", wood_r93: "wood", stone_r93: "stone", axe_r93: "axe", pickaxe_r93: "pickaxe" });
var labels = Object.freeze({ wood: "Odun", stone: "Ta\u015F", axe: "Oduncu Baltas\u0131", pickaxe: "Madenci Kazmas\u0131", talisman: "Binek T\u0131ls\u0131m\u0131" });
function zumrutIconKindR93(kind) {
  return Object.hasOwn(ZUMRUT_ICON_CELLS_R93, kind) ? kind : aliases[kind] ?? null;
}
function zumrutIconStyleR93(kind, size = 54, url) {
  const k = zumrutIconKindR93(kind), cell = ZUMRUT_ICON_CELLS_R93[k];
  if (!cell) return null;
  url ?? (url = k === "talisman" ? ZUMRUT_TALISMAN_URL_R93 : ZUMRUT_ART_URL_R93);
  return {
    display: "inline-block",
    width: size,
    height: size,
    flexShrink: 0,
    verticalAlign: "middle",
    backgroundImage: 'url("' + url + '")',
    backgroundSize: k === "talisman" ? "100% 100%" : "200% 200%",
    backgroundRepeat: "no-repeat",
    backgroundPosition: cell[0] * 100 + "% " + cell[1] * 100 + "%",
    filter: "drop-shadow(0 2px 2px #071b1266)"
  };
}
function zumrutItemIconR93(React, kind, label2, size = 54, { url, className = "" } = {}) {
  const k = zumrutIconKindR93(kind), style = zumrutIconStyleR93(k, size, url);
  if (!style) return null;
  return React.createElement("span", { className: "zumrut93-item-icon " + className, role: "img", "aria-label": label2 || labels[k], title: label2 || labels[k], style });
}
var atlases = /* @__PURE__ */ new Map();
function preloadZumrutArtR93(url = ZUMRUT_ART_URL_R93) {
  if (typeof Image === "undefined") return null;
  if (!atlases.has(url)) {
    if (atlases.size >= 2) atlases.delete(atlases.keys().next().value);
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    image.decode?.().catch(() => {
    });
    atlases.set(url, image);
  }
  return atlases.get(url);
}
var shapes = {
  talisman: [
    ["M27 9Q19 2 16 11Q13 19 25 17M27 9Q40 1 44 11L43 19", "none", "#735039", 4],
    ["M18 18Q32 9 46 18Q60 34 51 54L40 58 38 48 43 45Q51 28 38 23H26Q13 28 21 45L26 48 24 58 13 54Q3 34 18 18Z", "#b78c43"],
    ["M18 18Q32 9 46 18M13 49 20 52M44 52 51 49", "none", "#f5d88a", 2],
    ["M31 22 43 32 39 45 31 51 22 44 20 32Z", "#0c6c45"],
    ["M31 22 43 32 31 35 20 32Z", "#70c99b"],
    ["M31 35 39 45 31 51 22 44Z", "#1fa573"],
    ["M21 12 33 10 43 17 32 26 21 20Z", "#c49b59"],
    ["M28 13 31 15 37 14 36 17 32 18 30 22 27 18Z", "#f5d68c"]
  ],
  wood: [
    ["M10 29 35 13 57 22 31 40Z", "#503523"],
    ["M7 37 32 21 56 33 29 50Z", "#785034"],
    ["M11 29C3 31 2 44 12 49L27 56C38 58 43 44 34 38Z", "#c99553"],
    ["M13 32C6 34 7 43 15 46L28 51C35 53 39 45 32 41Z", "#edbe73"],
    ["M16 35C10 37 13 43 18 44L28 48C33 48 35 45 29 43Z", "#b8813d"],
    ["M17 39 29 44", "none", "#ffe3a0", 1.5],
    ["M30 19 48 27M23 26 42 35M19 21 38 31", "none", "#af8150", 2],
    ["M24 20 43 33 36 46M29 17 48 30 41 42", "none", "#dbc390", 3],
    ["M43 8 37 26 50 18M40 16 33 17M42 12 48 12", "none", "#527542", 2]
  ],
  stone: [
    ["M9 37 19 17 39 8 53 25 58 45 36 57 15 52Z", "#657a81"],
    ["M19 17 39 8 35 31 9 37Z", "#b7c8c8"],
    ["M39 8 53 25 35 31Z", "#8fa5ac"],
    ["M9 37 35 31 36 57 15 52Z", "#93a3a3"],
    ["M35 31 53 25 58 45 36 57Z", "#455c68"],
    ["M19 17 35 31 39 8M35 31 36 57", "none", "#d1dcd8", 1.4],
    ["M6 44 15 34 26 44 23 55 10 56Z", "#7c9091"],
    ["M15 34 18 46 6 44Z", "#c3ceca"],
    ["M43 47 54 42 61 49 58 57 44 58Z", "#8b9b9a"],
    ["M14 50 20 47M40 23 44 22", "none", "#63845b", 3]
  ],
  axe: [
    ["M12 55 17 59 47 13 42 10Z", "#5e3b24"],
    ["M16 55 43 13", "none", "#ae7950", 2],
    ["M34 12 42 5 48 11 46 20 57 24 51 37 38 28Z", "#7793a0"],
    ["M42 5 48 11 46 20 57 24 51 37 49 26 39 22 34 12Z", "#c5d4d8"],
    ["M57 24 51 37 47 34 52 23Z", "#edf3eb"],
    ["M32 19 41 24 45 17 36 12Z", "#ba8d45"],
    ["M34 17 42 21", "none", "#f1cc79", 1.7],
    ["M11 51 19 55 28 41 20 37Z", "#215f4e"],
    ["M14 48 22 51M17 44 25 47M20 40 28 43", "none", "#83ab87", 1.4],
    ["M10 54 17 59 21 55 13 50Z", "#bd954e"]
  ],
  pickaxe: [
    ["M11 55 16 59 46 12 41 9Z", "#69452c"],
    ["M15 54 43 13", "none", "#b48858", 2],
    ["M18 11Q32 4 44 12Q56 22 59 39Q47 26 38 23Q30 17 12 18Z", "#748b99"],
    ["M18 11Q32 4 44 12Q56 22 59 39Q50 24 40 18Q28 11 12 18Z", "#cbd8dc"],
    ["M13 18 22 11Q33 8 40 12", "none", "#f3f1e8", 1.4],
    ["M34 17 42 22 47 15 39 9Z", "#bd914c"],
    ["M37 14 44 18", "none", "#f2d08d", 1.7],
    ["M10 52 18 57 28 42 20 37Z", "#245665"],
    ["M14 49 21 53M17 45 24 49M20 41 27 45", "none", "#81a7ad", 1.4],
    ["M9 55 16 60 20 56 12 51Z", "#bf9957"]
  ]
};
var pathCache = /* @__PURE__ */ new Map();
function drawZumrutItemR93(ctx, kind, x, y, size = 48, { url, angle = 0, alpha = 1 } = {}) {
  const k = zumrutIconKindR93(kind), cell = ZUMRUT_ICON_CELLS_R93[k];
  if (!cell) return false;
  url ?? (url = k === "talisman" ? ZUMRUT_TALISMAN_URL_R93 : ZUMRUT_ART_URL_R93);
  const img = preloadZumrutArtR93(url);
  ctx.save();
  ctx.translate(x, y);
  if (angle) ctx.rotate(angle);
  ctx.globalAlpha *= alpha;
  if (img?.complete && img.naturalWidth) {
    const columns = k === "talisman" ? 1 : 2, w = img.naturalWidth / columns, h = img.naturalHeight / columns;
    ctx.drawImage(img, cell[0] * w, cell[1] * h, w, h, -size / 2, -size / 2, size, size);
  } else if (typeof Path2D !== "undefined") {
    let paths = pathCache.get(k);
    if (!paths) {
      paths = shapes[k].map(([d, fill, stroke = "#1b2d2b", width = 1.5]) => ({ path: new Path2D(d), fill, stroke, width }));
      pathCache.set(k, paths);
    }
    ctx.translate(-size / 2, -size / 2);
    ctx.scale(size / 64, size / 64);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    for (const p of paths) {
      if (p.fill !== "none") {
        ctx.fillStyle = p.fill;
        ctx.fill(p.path);
      }
      if (p.stroke !== "none") {
        ctx.strokeStyle = p.stroke;
        ctx.lineWidth = p.width;
        ctx.stroke(p.path);
      }
    }
  }
  ctx.restore();
  return true;
}

// ../tmp/core511-r93-zumrut/working/core511-source/scripts/core511/zumrut-presentation-r93.mjs
var local = /* @__PURE__ */ new Map();
var projected = /* @__PURE__ */ new WeakMap();
var shown = /* @__PURE__ */ new Set();
var clock = null;
var perf = () => typeof performance !== "undefined" ? performance.now() : Date.now();
function stamp(serverAtMs, at = perf()) {
  if (!Number.isFinite(serverAtMs)) return;
  const estimated = clock ? clock.serverAtMs + Math.max(0, at - clock.at) : -Infinity;
  if (serverAtMs > estimated) clock = { serverAtMs, at };
}
function key(nodeId, channel) {
  return channel + ":" + nodeId;
}
function rememberZumrutDepletionR93(row, serverAtMs) {
  if (!row || typeof row.nodeId !== "string" || !Number.isInteger(row.channel) || !Number.isFinite(row.availableAtMs)) return;
  stamp(serverAtMs);
  if (row.availableAtMs <= zumrutServerNowR93()) return;
  const id = key(row.nodeId, row.channel), prior = local.get(id);
  if (!prior || row.availableAtMs > prior.availableAtMs) local.set(id, { ...row });
  while (local.size > 512) local.delete(local.keys().next().value);
}
function acceptZumrutStateR93(state, channel) {
  stamp(state?.serverAtMs);
  for (const row of state?.nodeDepletions ?? []) rememberZumrutDepletionR93({ ...row, channel: row.channel ?? channel }, state.serverAtMs);
}
function zumrutServerNowR93(world) {
  const serverAtMs = world?.zumrutR93?.serverAtMs ?? world?.snapshotAtMs ?? (Number.isFinite(world?.serverTime) ? world.serverTime * 1e3 : void 0);
  stamp(serverAtMs);
  return clock ? clock.serverAtMs + Math.max(0, perf() - clock.at) : Date.now();
}
function projectedRows(world) {
  const rows = world?.zumrutR93?.nodeDepletions;
  if (!Array.isArray(rows)) return null;
  let index = projected.get(rows);
  if (!index) {
    index = new Map(rows.filter((row) => row && typeof row.nodeId === "string" && Number.isFinite(row.availableAtMs)).map((row) => [key(row.nodeId, row.channel ?? world.channel), row.availableAtMs]));
    projected.set(rows, index);
  }
  return index;
}
function zumrutNodeRespawnAtR93(nodeId, world) {
  const id = key(nodeId, world?.channel), value = local.get(id), now = zumrutServerNowR93(world);
  if (value && value.availableAtMs <= now) local.delete(id);
  return Math.max(local.get(id)?.availableAtMs ?? 0, projectedRows(world)?.get(id) ?? 0);
}
function zumrutNodeAvailableR93(nodeId, world, serverNow) {
  return zumrutNodeRespawnAtR93(nodeId, world) <= (Number.isFinite(serverNow) ? serverNow : zumrutServerNowR93(world));
}
function zumrutNextRespawnR93(world) {
  const now = zumrutServerNowR93(world);
  let next = Infinity;
  for (const row of local.values()) if (row.channel === world?.channel && row.availableAtMs > now) next = Math.min(next, row.availableAtMs);
  for (const [id, at] of projectedRows(world) ?? []) if (id.startsWith(world.channel + ":") && at > now) next = Math.min(next, at);
  return Number.isFinite(next) ? next : null;
}
function claimZumrutToastR93(operationId) {
  if (typeof operationId !== "string" || shown.has(operationId)) return false;
  shown.add(operationId);
  while (shown.size > 256) shown.delete(shown.values().next().value);
  return true;
}
function resetZumrutPresentationForTestR93() {
  local.clear();
  shown.clear();
  clock = null;
}

// ../tmp/core511-r93-zumrut/working/core511-source/scripts/core511/zumrut-render-r93.mjs
var ZUMRUT_TERRAIN_ART_R93 = "zumrut-terrain-r93-bcec784fbce4dda0.webp";
var ZUMRUT_PROP_ART_R93 = "zumrut-props-r93-2a4c1d827afff6e3.webp";
var TAU = Math.PI * 2;
var TILE = 512;
var LIMIT = 12 * 1024 * 1024;
var tiles = /* @__PURE__ */ new Map();
var sprites = /* @__PURE__ */ new Map();
var cacheBytes = 0;
var active = null;
var lastArea = null;
var art = null;
var ZUMRUT_RENDER_BUDGET_R93 = Object.freeze({ terrainBytes: LIMIT, particleLimit: 12, tileWorldSize: TILE, artBytes: 375324 });
var PROP_CROPS = Object.freeze([[108, 34, 315, 439], [650, 40, 239, 435], [1126, 164, 313, 244], [122, 688, 282, 201], [568, 605, 399, 321]]);
function canvas(w, h) {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
function ellipse(c, x, y, rx, ry, color) {
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, TAU);
  c.fill();
}
function line(c, points, color, width) {
  c.beginPath();
  c.moveTo(...points[0]);
  for (let i = 1; i < points.length; i++) c.lineTo(...points[i]);
  c.strokeStyle = color;
  c.lineWidth = width;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.stroke();
}
function ready(image) {
  return !!image?.complete && image.naturalWidth > 0;
}
function clearTerrain() {
  tiles.clear();
  cacheBytes = 0;
}
function ensureArt() {
  if (art || typeof Image === "undefined") return art;
  const load = (file) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = clearTerrain;
    image.src = new URL("./" + file, import.meta.url).href;
    image.decode?.().catch(() => {
    });
    return image;
  };
  art = { terrain: load(ZUMRUT_TERRAIN_ART_R93), props: load(ZUMRUT_PROP_ART_R93) };
  return art;
}
function prop(c, index, x, y, width, height) {
  const image = art?.props;
  if (!ready(image)) return false;
  const [sx, sy, sw, sh] = PROP_CROPS[index];
  c.drawImage(image, sx, sy, sw, sh, x - width / 2, y - height * 0.975, width, height);
  return true;
}
function ground(c, x, y) {
  c.fillStyle = "#95b867";
  c.fillRect(x, y, TILE, TILE);
  if (ready(art?.terrain)) c.drawImage(art.terrain, 0, 0, 4800, 3200);
}
function tile(tx, ty, pixels) {
  const key2 = tx + "," + ty + "," + pixels;
  if (tiles.has(key2)) {
    const value = tiles.get(key2);
    tiles.delete(key2);
    tiles.set(key2, value);
    return value.image;
  }
  const image = canvas(pixels, pixels), c = image?.getContext("2d", { alpha: false });
  if (!c) return null;
  c.scale(pixels / TILE, pixels / TILE);
  c.translate(-tx * TILE, -ty * TILE);
  ground(c, tx * TILE, ty * TILE);
  const bytes = pixels * pixels * 4;
  while (cacheBytes + bytes > LIMIT && tiles.size) {
    const oldest = tiles.keys().next().value;
    cacheBytes -= tiles.get(oldest).bytes;
    tiles.delete(oldest);
  }
  tiles.set(key2, { image, bytes });
  cacheBytes += bytes;
  return image;
}
function zumrutTerrainCacheStatsR93() {
  return { tiles: tiles.size, bytes: cacheBytes, limit: LIMIT, sprites: sprites.size, artLoaded: !!ready(art?.terrain), propsLoaded: !!ready(art?.props) };
}
function clearZumrutRenderCacheR93() {
  clearTerrain();
  sprites.clear();
  active = null;
}
function setZumrutAnimationR93(value) {
  active = value ? { ...value } : null;
}
function zumrutAnimationR93() {
  return active;
}
function drawZumrutTerrainR93(c, area, now, view, options = {}) {
  if (area !== ZUMRUT_AREA) {
    if (lastArea === ZUMRUT_AREA) {
      clearTerrain();
      active = null;
    }
    lastArea = area;
    return false;
  }
  lastArea = area;
  ensureArt();
  const vw = view?.width ?? 1600, vh = view?.height ?? 900, cx = view?.x ?? 1100, cy = view?.y ?? 2630, left = Math.max(0, cx - vw / 2), top = Math.max(0, cy - vh / 2), right = Math.min(4800, cx + vw / 2), bottom = Math.min(3200, cy + vh / 2), pixels = vw > 2900 || vh > 2100 ? 128 : 256;
  for (let ty = Math.floor(top / TILE); ty <= Math.floor(bottom / TILE); ty++) for (let tx = Math.floor(left / TILE); tx <= Math.floor(right / TILE); tx++) {
    const image = tile(tx, ty, pixels);
    if (image) c.drawImage(image, tx * TILE, ty * TILE, TILE, TILE);
  }
  if (!options.reduced) {
    c.save();
    for (let i = 0; i < 8; i++) {
      const yy = 620 + i * 325 + now / 95 % 130, xx = zumrutRiverX(yy) + Math.sin(i * 7) * zumrutRiverHalfWidth(yy) * 0.36;
      if (yy < top || yy > bottom || xx < left - 45 || xx > right + 45 || zumrutOnBridge(xx, yy)) continue;
      line(c, [[xx - 17, yy], [xx + 6, yy + 2], [xx + 25, yy]], "#ecfff13d", 1.5);
    }
    if (left < 3100 && right > 2860 && top < 540 && bottom > 350) {
      c.globalAlpha = 0.25 + 0.06 * Math.sin(now / 490);
      for (let i = 0; i < 4; i++) {
        const yy = 365 + i * 34 + now / 45 % 25;
        line(c, [[2972 - i * 4, yy], [2970 - i * 4, yy + 18]], "#f0ffef", 2);
      }
    }
    c.restore();
  }
  return true;
}
function label(c, text, x, y, color = "#fff1c9", size = 14) {
  c.font = `600 ${size}px system-ui`;
  c.textAlign = "center";
  c.lineJoin = "round";
  c.lineWidth = 3;
  c.strokeStyle = "#192b22df";
  c.strokeText(text, x, y);
  c.fillStyle = color;
  c.fillText(text, x, y);
}
function axe(c, pick = false) {
  c.save();
  c.rotate(-0.62);
  drawZumrutItemR93(c, pick ? "pickaxe" : "axe", 14.7, -15.4, 70);
  c.restore();
}
function shop(c, now, drawNpc) {
  if (drawNpc) drawNpc(c, ZUMRUT_NPC, now);
  label(c, ZUMRUT_NPC.name, ZUMRUT_NPC.x, ZUMRUT_NPC.y - 143, "#ffe4a0", 15);
  label(c, ZUMRUT_NPC.title, ZUMRUT_NPC.x, ZUMRUT_NPC.y - 125, "#e7e7c5", 11);
}
function bench(c, now) {
  ellipse(c, ZUMRUT_BENCH.x + 8, ZUMRUT_BENCH.y + 3, 106, 23, "#22372522");
  prop(c, 4, ZUMRUT_BENCH.x, ZUMRUT_BENCH.y, 285, 229);
  label(c, ZUMRUT_BENCH.name, ZUMRUT_BENCH.x, ZUMRUT_BENCH.y - 245, "#ffe4a0", 15);
  label(c, "Malzemeleri d\xF6n\xFC\u015Ft\xFCr", ZUMRUT_BENCH.x, ZUMRUT_BENCH.y - 228, "#e7e7c5", 11);
  if (active?.kind === "craft" && active.phase === "channeling") {
    c.save();
    const phase = (now - active.visualStartedAt) / 1e3;
    c.globalCompositeOperation = "lighter";
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * TAU + phase * 1.4;
      ellipse(c, ZUMRUT_BENCH.x + Math.cos(a) * 55, ZUMRUT_BENCH.y - 132 + Math.sin(a) * 21, 2, 2, "#f6e9a5");
    }
    c.restore();
  }
}
function drawZumrutObjectsR93(c, world, now, view, drawList, own, drawNpc = null) {
  if (world?.area !== ZUMRUT_AREA) return;
  ensureArt();
  const vw = view?.width ?? 1600, vh = view?.height ?? 900, cx = view?.x ?? 1100, cy = view?.y ?? 2630, serverNow = zumrutServerNowR93(world);
  const visible = (x, y, pad = 230) => x >= cx - vw / 2 - pad && x <= cx + vw / 2 + pad && y >= cy - vh / 2 - pad && y <= cy + vh / 2 + pad;
  for (const node of zumrutNodesInRect(cx - vw / 2, cy - vh / 2, vw, vh, 270)) {
    if (!zumrutNodeAvailableR93(node.id, world, serverNow)) continue;
    const key2 = node.kind + node.variant;
    if (!sprites.has(key2)) sprites.set(key2, { index: node.kind === "tree" ? node.variant % 2 : 2 + node.variant % 2 });
    const index = sprites.get(key2).index;
    drawList.push({ y: node.y, draw: () => {
      const moving = active?.nodeId === node.id && active.phase === "channeling", age = (now - (active?.visualStartedAt ?? 0)) / SWING_MS, impact = moving ? gatherCycle(now, active.kind).impact : 0, isTree = node.kind === "tree";
      const alpha = own && Math.abs(own.x - node.x) < 65 && own.y < node.y && own.y > node.y - 210 ? 0.42 : 1;
      c.save();
      c.translate(node.x + (isTree ? 0 : Math.sin(age * 71) * 2 * impact), node.y);
      c.scale(node.scale, node.scale);
      c.globalAlpha = alpha;
      ellipse(c, 13, 3, isTree ? 39 : 48, isTree ? 11 : 14, "#29462c2b");
      if (isTree) c.rotate(Math.sin(age * 26) * 0.023 * impact);
      if (!prop(c, index, 0, 0, isTree ? index === 0 ? 172 : 132 : 134, isTree ? 245 : 100)) ellipse(c, 0, 0, node.radius, node.radius * 0.45, "#45674766");
      if (impact && !isTree) {
        c.globalAlpha = 0.2 * impact;
        ellipse(c, 0, -7, 52 + impact * 9, 14, "#e8dfb4");
      }
      c.restore();
    } });
  }
  if (visible(ZUMRUT_NPC.x, ZUMRUT_NPC.y)) drawList.push({ y: ZUMRUT_NPC.y, draw: () => shop(c, now, drawNpc) });
  if (visible(ZUMRUT_BENCH.x, ZUMRUT_BENCH.y)) drawList.push({ y: ZUMRUT_BENCH.y, draw: () => bench(c, now) });
}
var SWING_MS = 850;
var SWING_KEYS = [
  [0, 0, 0, 0, 0.38],
  [0.16, -3, -1, -0.06, -1.35],
  [0.42, -5, -2, -0.11, -1.65],
  [0.6, 4, 4, 0.18, 1.12],
  [0.68, 2, 3, 0.13, 1.24],
  [0.86, 0, 1, 0.035, 0.72],
  [1, 0, 0, 0, 0.38]
];
function gatherCycle(now, kind) {
  const elapsed = Math.max(0, now - (active?.visualStartedAt ?? now)), phase = elapsed % SWING_MS / SWING_MS;
  let i = 1;
  while (i < SWING_KEYS.length - 1 && phase > SWING_KEYS[i][0]) i++;
  const a = SWING_KEYS[i - 1], b = SWING_KEYS[i], u = (phase - a[0]) / (b[0] - a[0]), t = u * u * (3 - 2 * u), mix = (n) => a[n] + (b[n] - a[n]) * t, pick = kind === "stone";
  return {
    phase,
    x: mix(1),
    y: mix(2) * (pick ? 1.2 : 1),
    angle: mix(3) * (pick ? 1.12 : 1),
    toolAngle: mix(4),
    frame: phase < 0.12 ? 0 : phase < 0.5 ? 3 : phase < 0.72 ? 4 : phase < 0.94 ? 5 : 0,
    impact: phase >= 0.6 ? Math.sin((phase - 0.6) / 0.4 * Math.PI) : 0,
    pick
  };
}
function zumrutGatherPoseR93(id, now, facing = 1) {
  if (!active || active.playerId !== id || active.phase !== "channeling" || !["wood", "stone"].includes(active.kind)) return null;
  const pose = gatherCycle(now, active.kind), sign = facing < -0.08 ? -1 : 1;
  pose.x *= sign;
  pose.angle *= sign;
  return pose;
}
function applyZumrutGatherPoseR93(c, x, y, pose) {
  if (!pose) return;
  c.translate(x + pose.x, y + 18 + pose.y);
  c.rotate(pose.angle);
  c.translate(-x, -(y + 18));
}
var CASTER_GRIP_DELTA = { 0: [-3, -4], 3: [3, -19], 4: [15, -18], 5: [-3, -5] };
function zumrutGatherHandR93(role, hand, frame) {
  const delta = role === "arkanist" ? CASTER_GRIP_DELTA[frame] : null;
  return delta ? { ...hand, x: hand.x + delta[0] * hand.facing, y: hand.y + delta[1] } : hand;
}
function drawZumrutGatherToolR93(c, hand, pose, pick = pose?.pick) {
  if (!pose || !hand) return;
  c.save();
  c.translate(hand.x, hand.y);
  c.scale(hand.facing < 0 ? -1 : 1, 1);
  c.rotate(pose.toolAngle);
  axe(c, pick);
  c.restore();
}
function drawZumrutHeldToolR93(c, player, now) {
  if (!player) return;
  const hand = player.toolHandR93 ?? { x: player.x + 23, y: player.y - 35, facing: 1 };
  if (!active || active.playerId !== player.id || active.phase !== "channeling") {
    if (!["axe", "pickaxe"].includes(player.equippedToolR93)) return;
    c.save();
    c.translate(hand.x, hand.y);
    c.scale(hand.facing < 0 ? -1 : 1, 1);
    c.rotate(0.38);
    c.scale(0.78, 0.78);
    axe(c, player.equippedToolR93 === "pickaxe");
    c.restore();
    return;
  }
  const node = zumrutNode(active.nodeId), pick = active.kind === "stone", craft = active.kind === "craft", facing = (node?.x ?? ZUMRUT_BENCH.x) < player.x ? -1 : 1, elapsed = Math.max(0, now - active.visualStartedAt), cycle = gatherCycle(now, active.kind), p = cycle.phase;
  if (craft || !player.gatherBodyR93) {
    c.save();
    c.translate(hand.x, hand.y);
    c.scale(facing, 1);
    c.rotate(craft ? Math.sin(elapsed / 160) * 0.7 : cycle.toolAngle);
    axe(c, pick || craft);
    c.restore();
  }
  const impactStart = craft ? 0.72 : 0.6;
  if (p > impactStart) {
    const phase = (p - impactStart) / (1 - impactStart), px = node?.x ?? ZUMRUT_BENCH.x, py = (node?.y ?? ZUMRUT_BENCH.y) - (pick ? 38 : craft ? 132 : 34);
    c.save();
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI + i * 0.41, v = 32 + i * 9, x = px + Math.cos(a) * v * phase, y = py + Math.sin(a) * v * phase + 36 * phase * phase;
      c.globalAlpha = 1 - phase;
      c.fillStyle = pick || craft ? i % 2 ? "#e9e4ad" : "#adc5c4" : i % 2 ? "#d9ba77" : "#967047";
      c.fillRect(x, y, pick ? 3 : 5, pick ? 3 : 2);
    }
    c.restore();
  }
}
function drawZumrutFishingR93(c, now, fishing, point, rodTip) {
  if (!fishing || !point) return;
  const target = zumrutFishingPoint(point), tip = rodTip ?? { x: point.x + 27, y: point.y - 120 }, bob = Math.sin(now / 190) * 2;
  c.save();
  c.strokeStyle = "#f6e9c7bb";
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(tip.x, tip.y);
  c.quadraticCurveTo((tip.x + target.x) / 2, Math.min(tip.y, target.y) - 45, target.x, target.y + bob);
  c.stroke();
  ellipse(c, target.x, target.y + bob, 5, 8, fishing.biteAtMs <= now ? "#f7d47b" : "#e58870");
  for (let i = 0; i < 2; i++) {
    const p = (now / 1600 + i * 0.5) % 1;
    c.strokeStyle = `rgba(219,255,236,${0.5 * (1 - p)})`;
    c.beginPath();
    c.ellipse(target.x, target.y, 10 + 28 * p, 4 + 10 * p, 0, 0, TAU);
    c.stroke();
  }
  c.restore();
}
function drawZumrutToolIconR93(c, kind, x = 0, y = 0, scale = 1) {
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  axe(c, kind === "pickaxe");
  c.restore();
}

// ../tmp/core511-r93-zumrut/working/core511-source/scripts/core511/zumrut-materials-r93.mjs
var ZUMRUT_MATERIALS_R93 = Object.freeze({
  zumrut_wood_r93: "Odun",
  zumrut_stone_r93: "Ta\u015F",
  zumrut_axe_r93: "Balta",
  zumrut_pickaxe_r93: "Kazma",
  mount_talisman_r93: "Binek T\u0131ls\u0131m\u0131"
});

// ../tmp/core511-r93-zumrut/working/core511-source/scripts/core511/zumrut-market-client-r93.mjs
function zumrutMarketEntriesR93(world, React) {
  const balances = new Map((world?.dungeonMaterials ?? []).filter((row) => Object.hasOwn(ZUMRUT_MATERIALS_R93, row.kind)).map((row) => [row.kind, row.amount]));
  return Object.entries(ZUMRUT_MATERIALS_R93).map(([kind, label2]) => ({ id: "part:" + kind, kind: "dungeon_material", materialKind: kind, label: label2, amount: balances.get(kind) ?? 0, icon: zumrutItemIconR93(React, kind, label2, 48) }));
}
function zumrutMarketIconR93(React, kind) {
  return Object.hasOwn(ZUMRUT_MATERIALS_R93, kind) ? zumrutItemIconR93(React, kind, ZUMRUT_MATERIALS_R93[kind], 48) : null;
}

// ../tmp/core511-r93-zumrut/working/core511-source/scripts/core511/zumrut-client-r93.mjs
var ZUMRUT_OPEN_R93 = "core511:zumrut-open";
var collectors = /* @__PURE__ */ new Set();
var uuid = () => crypto.randomUUID();
var message = (e) => String(e?.payload?.error ?? e?.body?.error ?? e?.message ?? "\u0130\u015Flem tamamlanamad\u0131.");
var terminal = (e) => Number(e?.status) >= 400 && Number(e?.status) < 500 && e?.payload?.code !== "command_outcome_unknown";
function openZumrutR93(target) {
  if (target && typeof window !== "undefined") window.dispatchEvent(new CustomEvent(ZUMRUT_OPEN_R93, { detail: { id: target.id, kind: target.kind } }));
}
function cancelZumrutR93(reason = "movement") {
  for (const cancel of collectors) cancel(reason);
}
function zumrutGatherFacingR93(player, fallback) {
  const active2 = zumrutAnimationR93();
  if (!active2 || active2.playerId !== player?.id || active2.phase !== "channeling") return fallback;
  const target = active2.kind === "craft" ? ZUMRUT_BENCH : zumrutNode(active2.nodeId);
  if (!target) return fallback;
  const dx = target.x - player.x, dy = target.y - player.y, length = Math.hypot(dx, dy) || 1;
  return { x: Math.abs(dx) < 0.1 ? fallback?.x ?? 1 : dx / length, y: dy / length };
}
function context(value) {
  const { world, own, uiSuspended } = value ?? {};
  return { valid: world?.area === ZUMRUT_AREA && own?.id && own.hp > 0 && !uiSuspended, id: own?.id, area: world?.area, channel: world?.channel, hp: own?.hp, hpRevision: own?.hp_revision, positionRevision: own?.position_revision, x: own?.x, y: own?.y };
}
function unchanged(a, b) {
  return b.valid && a.id === b.id && a.area === b.area && a.channel === b.channel && a.hp === b.hp && a.hpRevision === b.hpRevision && a.positionRevision === b.positionRevision && a.x === b.x && a.y === b.y;
}
function createZumrutControllerR93({ post, getContext, now = () => performance.now(), wallNow = Date.now, makeId = uuid, onState = () => {
}, onChange = () => {
} }) {
  let state = { phase: "idle", progress: 0, message: "", data: null, reward: null, kind: null }, op = null, disposed = false, loading = false;
  const publish = (patch) => {
    state = { ...state, ...patch };
    if (op && !op.finishSent && !disposed) collectors.add(cancel);
    else collectors.delete(cancel);
    setZumrutAnimationR93(op && state.phase === "channeling" ? { playerId: op.context.id, nodeId: op.nodeId, kind: op.kind, phase: state.phase, visualStartedAt: op.visualStartedAt } : null);
    if (!disposed) onState({ ...state });
  };
  const merge = (r) => {
    if (r?.zumrut) {
      acceptZumrutStateR93(r.zumrut, getContext()?.world?.channel);
      state = { ...state, data: { ...state.data ?? {}, ...r.zumrut } };
    }
  };
  const request = async (body) => {
    const r = await post("/api/action", body);
    if (r?.ok === false || r?.error) throw Object.assign(Error(r.error ?? r.message), { status: r.status ?? 409, payload: r });
    return r;
  };
  const cancelRemote = (operationId) => {
    if (operationId) request({ action: "zumrut_cancel", operationId, requestId: makeId() }).catch(() => {
    });
  };
  async function view() {
    if (disposed || loading || !context(getContext()).valid) return;
    loading = true;
    try {
      const r = await request({ action: "zumrut_view" });
      if (disposed) return;
      merge(r);
      publish({});
      if (!op && r.zumrut?.active) {
        const a = r.zumrut.active;
        op = { context: context(getContext()), kind: a.kind, nodeId: a.nodeId, operationId: a.operationId, finishId: makeId(), receivedAt: now(), duration: Math.max(0, a.finishAtMs - r.zumrut.serverAtMs), visualStartedAt: now(), finishSent: false };
        publish({ phase: "channeling", kind: a.kind, progress: 0, message: a.kind === "craft" ? "\xDCretim s\xFCr\xFCyor\u2026" : "Toplama s\xFCr\xFCyor\u2026" });
      }
    } catch (e) {
      if (!disposed) publish({ message: message(e) });
    } finally {
      loading = false;
    }
  }
  async function sendBegin(operation) {
    if (disposed || operation !== op || op.inFlight) return;
    op.inFlight = true;
    publish({ phase: "starting", progress: 0, reward: null, toast: null, message: "Haz\u0131rlan\u0131yor\u2026" });
    try {
      const r = await request({ action: "zumrut_begin", kind: op.kind, nodeId: op.nodeId, selectedItems: op.selectedItems, requestId: op.beginId });
      const a = r.zumrut?.active;
      if (disposed || operation !== op) {
        cancelRemote(a?.operationId);
        return;
      }
      if (!a || typeof a.operationId !== "string" || a.kind !== op.kind || !Number.isFinite(a.finishAtMs) || !Number.isFinite(r.zumrut.serverAtMs)) throw Error("\u0130\u015Flem s\xFCresi sunucudan do\u011Frulanamad\u0131.");
      merge(r);
      op.operationId = a.operationId;
      if (!unchanged(op.context, context(getContext()))) {
        cancel("movement");
        return;
      }
      op.receivedAt = now();
      op.duration = Math.max(0, a.finishAtMs - r.zumrut.serverAtMs);
      op.visualStartedAt = now();
      publish({ phase: "channeling", progress: 0, message: op.kind === "craft" ? "Ustal\u0131k tezg\xE2h\u0131nda \xFCretiliyor\u2026" : op.kind === "wood" ? "A\u011Fa\xE7 kesiliyor\u2026" : "Ta\u015F k\u0131r\u0131l\u0131yor\u2026" });
    } catch (e) {
      if (disposed || operation !== op) return;
      if (terminal(e)) {
        op = null;
        publish({ phase: "error", message: message(e) });
      } else publish({ phase: "retry_begin", message: "\u0130\u015Flem yan\u0131t\u0131 al\u0131namad\u0131. Ayn\u0131 i\u015Flemi yeniden sorgula." });
    } finally {
      operation.inFlight = false;
    }
  }
  async function begin(kind, nodeId, selectedItems = {}) {
    if (op || disposed) return;
    const c = context(getContext()), target = kind === "craft" ? ZUMRUT_BENCH : zumrutNode(nodeId);
    if (!c.valid || !target) return;
    if (kind !== "craft" && !zumrutNodeAvailableR93(target.id, getContext()?.world)) {
      publish({ phase: "error", message: "Bu kaynak yeniden olu\u015Fuyor. Biraz bekle." });
      return;
    }
    if (Math.hypot(c.x - target.x, c.y - target.y) > ZUMRUT_REACH) {
      publish({ phase: "error", message: "\u0130\u015Flem yapmak i\xE7in biraz daha yakla\u015F." });
      return;
    }
    op = { context: c, kind, nodeId, selectedItems, beginId: makeId(), finishId: makeId(), finishSent: false };
    publish({ kind });
    return sendBegin(op);
  }
  async function finish(operation) {
    if (disposed || operation !== op || op.inFlight || !op.operationId) return;
    op.inFlight = true;
    op.finishSent = true;
    publish({ phase: "confirming", progress: 1, message: "Sonu\xE7 do\u011Frulan\u0131yor\u2026" });
    try {
      const r = await request({ action: "zumrut_finish", operationId: op.operationId, requestId: op.finishId });
      if (disposed || operation !== op) return;
      if (r.completed !== true || r.operationId !== op.operationId || r.kind !== op.kind) throw Error("Sonu\xE7 sunucudan do\u011Frulanamad\u0131.");
      merge(r);
      rememberZumrutDepletionR93(r.nodeDepletion, r.zumrut?.serverAtMs);
      const toast = operation.kind !== "craft" && claimZumrutToastR93(operation.operationId) ? { id: operation.operationId, message: operation.kind === "wood" ? "+1 Odun kazand\u0131n!" : "+1 Ta\u015F kazand\u0131n!" } : null;
      op = null;
      onChange();
      publish({ phase: "complete", progress: 1, reward: r.reward ?? null, toast, message: r.message ?? (operation.kind === "wood" ? "+1 Odun kazand\u0131n!" : operation.kind === "stone" ? "+1 Ta\u015F kazand\u0131n!" : "\xDCretim tamamland\u0131.") });
    } catch (e) {
      if (disposed || operation !== op) return;
      if (terminal(e) && Number(e.status) !== 425) {
        op = null;
        onChange();
        publish({ phase: "error", progress: 0, message: message(e) });
      } else publish({ phase: "retry_finish", message: "Sonu\xE7 hen\xFCz al\u0131namad\u0131. Ayn\u0131 i\u015Flemi yeniden sorgula." });
    } finally {
      operation.inFlight = false;
    }
  }
  function cancel(reason = "movement") {
    if (!op) return;
    if (op.finishSent) {
      publish({ message: "\xDCretim sonucu sunucudan do\u011Frulan\u0131yor." });
      return;
    }
    const old = op;
    op = null;
    cancelRemote(old.operationId);
    publish({ phase: "idle", progress: 0, message: reason === "movement" ? "Hareket ettin; i\u015Flem durdu." : reason === "taken" ? "Kaynak topland\u0131; yeniden olu\u015Fmas\u0131n\u0131 bekle." : "\u0130\u015Flem iptal edildi." });
  }
  function update() {
    if (op && !op.finishSent) {
      if (!unchanged(op.context, context(getContext()))) cancel("movement");
      else if (op.kind !== "craft" && !zumrutNodeAvailableR93(op.nodeId, getContext()?.world)) cancel("taken");
    }
  }
  function tick() {
    update();
    if (op && state.phase === "channeling") {
      const p = Math.min(1, Math.max(0, (now() - op.receivedAt) / Math.max(1, op.duration)));
      publish({ progress: p });
      if (p >= 1) return finish(op);
    }
  }
  function retry() {
    if (state.phase === "retry_begin") return sendBegin(op);
    if (state.phase === "retry_finish") return finish(op);
  }
  function dismiss() {
    if (op) {
      cancel("cancel");
      return;
    }
    publish({ phase: "idle", message: "", reward: null, progress: 0 });
  }
  function dispose() {
    cancel("disconnected");
    disposed = true;
    op = null;
    collectors.delete(cancel);
    clearZumrutRenderCacheR93();
  }
  return { view, begin, tick, update, retry, cancel, dismiss, dispose, clearToast: (id) => {
    if (state.toast?.id === id) publish({ toast: null });
  }, get state() {
    return { ...state };
  } };
}
var ZUMRUT_CSS_R93 = `
.zumrut93-toast{position:fixed;left:50%;bottom:calc(18px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:65;padding:11px 20px;border:1px solid #b8d78a;border-radius:10px;background:#133c29f0;color:#edffd6;box-shadow:0 5px 22px #0005;font:700 15px system-ui;pointer-events:none;max-width:calc(100vw - 32px);text-align:center}.zumrut93-dock{position:fixed;left:50%;bottom:136px;transform:translateX(-50%);z-index:40;display:flex;align-items:center;gap:9px;padding:8px 14px;border:1px solid #c8b67a88;border-radius:14px;background:linear-gradient(135deg,#193c30f2,#10271ff5);box-shadow:0 5px 20px #0006;color:#f7edcd;font:13px system-ui;max-width:calc(100vw - 24px);pointer-events:auto}.zumrut93-dock small{display:block;color:#bdcfad;font-size:11px}.zumrut93-dock button,.zumrut93-card button{font:700 13px system-ui;border:1px solid #b59d62;border-radius:8px;padding:9px 16px;min-height:42px;color:#f9edc8;background:linear-gradient(#3c674d,#254635);cursor:pointer;touch-action:manipulation}.zumrut93-dock button:disabled,.zumrut93-card button:disabled{opacity:.5;cursor:default}.zumrut93-wallet{position:fixed;top:112px;right:14px;z-index:24;display:flex;gap:10px;align-items:center;padding:4px 10px;border:1px solid #c4bb7d55;border-radius:10px;background:#19352bdf;color:#f8edce;font:700 13px system-ui;pointer-events:none}.zumrut93-wallet>span{display:flex;align-items:center;gap:2px}.zumrut93-scrim{position:fixed;inset:0;background:#04130eaf;display:grid;place-items:center;z-index:190;padding:16px;pointer-events:auto}.zumrut93-card{width:min(620px,100%);max-height:calc(100dvh - 32px);overflow:auto;border:1px solid #c2aa69;border-radius:18px;background:linear-gradient(145deg,#19392e,#11271f);box-shadow:0 20px 80px #0008;color:#f0e9d2;font:14px/1.5 system-ui}.zumrut93-card header{position:relative;padding:20px 24px 17px;background:radial-gradient(ellipse at 85% 10%,#b8c98830,transparent 65%);border-bottom:1px solid #bdd49d25}.zumrut93-card h2{margin:0;color:#f6e0a5;font-size:27px;line-height:1.2}.zumrut93-card header p{margin:6px 50px 0 0;color:#bdcdb5;font-size:12px}.zumrut93-close{position:absolute;right:14px;top:14px;padding:6px 12px!important;font-size:18px!important;background:#0c2119!important}.zumrut93-body{padding:20px 24px}.zumrut93-products{display:grid;grid-template-columns:1fr 1fr;gap:12px}.zumrut93-product{border:1px solid #c2b67a44;border-radius:12px;padding:13px;background:#dae8b608;text-align:center}.zumrut93-product h3{margin:3px 0;color:#efe1bc;font-size:16px}.zumrut93-product p{margin:5px 0 12px;color:#bdcdb5;font-size:12px}.zumrut93-product button{width:100%;margin-top:10px}.zumrut93-cost{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px solid #d4dcbb15;font-size:12px}.zumrut93-cost strong{white-space:nowrap}.zumrut93-missing{color:#f1aa97}.zumrut93-have{color:#badb99}.zumrut93-choice{display:grid;gap:4px;text-align:left;font-size:12px;margin:7px 0}.zumrut93-choice select{max-width:100%;min-height:70px;padding:5px;background:#0b211b;color:#f4ebd3;border:1px solid #b8b98166;border-radius:6px}.zumrut93-odds{display:grid;grid-template-columns:1fr auto;gap:6px 16px;padding:13px;border:1px solid #c5b88433;border-radius:10px;margin:12px 0;color:#d3ddbe;font-size:13px}.zumrut93-odds b{color:#e5d18d}.zumrut93-note{padding:10px 12px;background:#091d16aa;border-left:3px solid #b6ca89;border-radius:3px;color:#d6e6c1;font-size:12px;margin:12px 0}.zumrut93-state{width:min(390px,calc(100vw - 24px));position:fixed;left:50%;bottom:136px;transform:translateX(-50%);z-index:43;background:linear-gradient(135deg,#244e3af5,#112b24f7);border:1px solid #baa76c;border-radius:14px;padding:13px 17px;box-shadow:0 8px 30px #0008;color:#f0e5bd;font:13px system-ui}.zumrut93-state p{margin:5px 0}.zumrut93-state small{color:#c4d5ae}.zumrut93-track{height:10px;margin:11px 0 6px;overflow:hidden;border-radius:20px;background:#071b14;box-shadow:inset 0 1px 3px #000a}.zumrut93-track i{display:block;height:100%;background:linear-gradient(90deg,#618958,#bad896,#f1d788);border-radius:20px;box-shadow:0 0 10px #d1ed9a66;transition:width .1s linear}.zumrut93-state button{min-height:38px;border:1px solid #c9bc8766;border-radius:7px;background:#153528;color:#f0e4bc;padding:5px 11px;margin:8px 6px 0 0;font:700 12px system-ui;touch-action:manipulation}.zumrut93-state button:disabled{opacity:.4}.zumrut93-craft-stage{height:150px;position:relative;display:grid;place-items:center;overflow:hidden;background:radial-gradient(ellipse,#e9d28c26,transparent 66%);border-radius:12px}.zumrut93-ring{width:112px;height:112px;border:1px solid #b8d89999;border-radius:50%;position:absolute;box-shadow:0 0 25px #b7dd8b25,inset 0 0 25px #b7dd8b15}.zumrut93-ring:before,.zumrut93-ring:after{content:'';position:absolute;inset:12px;border:1px dashed #ddc17e99;border-radius:50%}.zumrut93-ring:after{inset:-12px;border:1px solid #9bc78233}.zumrut93-ring.running{animation:zumrut93-orbit 4s linear infinite}.zumrut93-spark{position:absolute;width:4px;height:4px;background:#f3df9d;border-radius:50%;box-shadow:0 0 8px #e0db9e;transform:rotate(var(--angle)) translateY(-64px)}.zumrut93-reveal{text-align:center;animation:zumrut93-reveal .65s ease-out}.zumrut93-reveal strong{display:block;font-size:19px;color:#f5dda2}.zumrut93-reveal small{display:block;margin-top:5px}.zumrut93-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:15px}.zumrut93-workbench-title{display:flex;align-items:center;gap:10px;margin:0 0 12px}.zumrut93-workbench-title h3{margin:0;font-size:17px}.zumrut93-workbench-title p{margin:3px 0;color:#bdd0b2;font-size:12px}@keyframes zumrut93-orbit{to{transform:rotate(360deg)}}@keyframes zumrut93-reveal{from{opacity:0;transform:translateY(10px) scale(.88)}to{opacity:1;transform:none}}@media(max-height:500px){.zumrut93-dock,.zumrut93-state{bottom:14px;left:50%;max-width:340px}.zumrut93-wallet{top:65px;right:12px;font-size:11px;padding:2px 6px}.zumrut93-card{max-height:calc(100dvh - 20px)}.zumrut93-card header{padding:14px 20px}.zumrut93-card h2{font-size:22px}.zumrut93-body{padding:14px 20px}.zumrut93-craft-stage{height:100px}.zumrut93-ring{width:78px;height:78px}.zumrut93-state{padding:9px 13px}.zumrut93-state small{display:none}}@media(max-width:480px){.zumrut93-products{grid-template-columns:1fr}.zumrut93-card h2{font-size:22px}}@media(prefers-reduced-motion:reduce){.zumrut93-ring.running,.zumrut93-reveal{animation:none}.zumrut93-track i{transition:none}}
`;
function createZumrutUIR93(React, { Portal, Dialog, Content, Header, Title, Description } = {}) {
  const h = React.createElement, Icon = ({ kind, size = 50 }) => zumrutItemIconR93(React, kind, void 0, size);
  function Costs({ rows = [], selected, setSelected }) {
    return h("div", null, ...rows.map((row) => h("div", { key: row.itemId }, h("div", { className: "zumrut93-cost" }, h("span", null, row.name ?? row.itemId), h("strong", { className: row.missing ? "zumrut93-missing" : "zumrut93-have" }, row.amount.toLocaleString("tr-TR"), " / ", Number(row.available ?? 0).toLocaleString("tr-TR"))), row.requiresSelection && h("label", { className: "zumrut93-choice" }, "Kullan\u0131lacak e\u015Fyalar\u0131 se\xE7 (", row.amount, ")", h("select", { multiple: true, value: selected[row.itemId] ?? [], "aria-label": (row.name ?? "E\u015Fya") + " maliyet se\xE7imi", onChange: (e) => setSelected({ ...selected, [row.itemId]: Array.from(e.target.selectedOptions, (o) => o.value) }) }, ...(row.eligibleItems ?? []).map((i) => h("option", { key: i.id, value: i.id }, i.name, " \xB7 G\xFC\xE7 ", i.power ?? 0)))))));
  }
  function Stage({ running, reward, data }) {
    const name = reward?.name ?? reward?.label ?? data?.catalog?.find((x) => x.id === reward?.itemId)?.name ?? "\xDCretim tamamland\u0131";
    return h("div", { className: "zumrut93-craft-stage" }, h("div", { className: "zumrut93-ring" + (running ? " running" : "") }, ...Array.from({ length: 8 }, (_, i) => h("i", { key: i, className: "zumrut93-spark", style: { "--angle": i * 45 + "deg" } }))), reward ? h("div", { className: "zumrut93-reveal" }, zumrutIconKindR93(String(reward.itemId ?? "").replace(/^material:/, "")) && h(Icon, { kind: String(reward.itemId).replace(/^material:/, ""), size: 70 }), h("strong", null, name), h("small", null, (reward.amount ?? 1) + " adet \xB7 \xC7antana eklendi")) : h(Icon, { kind: running ? "pickaxe" : "wood", size: 76 }));
  }
  function Entry({ world, own, post, onChange, uiSuspended }) {
    const [state, setState] = React.useState({ phase: "idle", progress: 0, data: null, message: "" }), [panel, setPanel] = React.useState(null), [selected, setSelected] = React.useState({}), [buyBusy, setBuyBusy] = React.useState(false), [notice, setNotice] = React.useState(""), [respawnVersion, setRespawnVersion] = React.useState(0);
    const latest = React.useRef(null), callbacks = React.useRef(null), controller = React.useRef(null), buyReceipt = React.useRef(null), close = React.useRef(null), card = React.useRef(null);
    latest.current = { world, own, uiSuspended };
    callbacks.current = { post, onChange };
    React.useEffect(() => {
      const c = createZumrutControllerR93({ post: (...args) => callbacks.current.post(...args), getContext: () => latest.current, onState: setState, onChange: () => callbacks.current.onChange?.() });
      controller.current = c;
      void c.view();
      const open = (e) => {
        const p = latest.current;
        if (p.world?.area !== ZUMRUT_AREA || p.uiSuspended) return;
        const n = e.detail?.kind === "shop" ? { ...ZUMRUT_NPC, kind: "shop" } : e.detail?.kind === "craft" ? { ...ZUMRUT_BENCH, kind: "craft" } : zumrutNode(e.detail?.id);
        if (!n) return;
        if (["tree", "rock"].includes(n.kind) && !zumrutNodeAvailableR93(n.id, p.world)) return;
        if (Math.hypot(p.own.x - n.x, p.own.y - n.y) > ZUMRUT_REACH) {
          setNotice("\u0130\u015Flem yapmak i\xE7in yan\u0131na yakla\u015F.");
          return;
        }
        setNotice("");
        if (n.kind === "shop" || n.kind === "craft") {
          setPanel(n.kind);
          setSelected({});
          void c.view();
        } else void c.begin(n.kind === "tree" ? "wood" : "stone", n.id);
      };
      const hidden = () => {
        if (document.hidden) c.cancel("disconnected");
      };
      const cancel = () => c.cancel("disconnected");
      window.addEventListener(ZUMRUT_OPEN_R93, open);
      for (const ev of ["offline", "blur", "coreoflife:game-session-ended", "coreoflife:maintenance-exit491"]) window.addEventListener(ev, cancel);
      document.addEventListener("visibilitychange", hidden);
      return () => {
        c.dispose();
        controller.current = null;
        window.removeEventListener(ZUMRUT_OPEN_R93, open);
        for (const ev of ["offline", "blur", "coreoflife:game-session-ended", "coreoflife:maintenance-exit491"]) window.removeEventListener(ev, cancel);
        document.removeEventListener("visibilitychange", hidden);
      };
    }, []);
    React.useEffect(() => {
      controller.current?.update();
    }, [world, own, uiSuspended]);
    React.useEffect(() => {
      if (panel === "craft" && state.phase === "complete") void controller.current?.view();
    }, [panel, state.phase]);
    React.useEffect(() => {
      if (state.phase !== "channeling") return;
      const timer = setInterval(() => controller.current?.tick(), 100);
      return () => clearInterval(timer);
    }, [state.phase]);
    React.useEffect(() => {
      if (!state.toast) return;
      const id = state.toast.id, timer = setTimeout(() => controller.current?.clearToast(id), 2600);
      return () => clearTimeout(timer);
    }, [state.toast?.id]);
    React.useEffect(() => {
      if (world?.area !== ZUMRUT_AREA) return;
      const at = zumrutNextRespawnR93(world);
      if (at === null) return;
      const timer = setTimeout(() => setRespawnVersion((v) => v + 1), Math.max(1, at - zumrutServerNowR93(world) + 20));
      return () => clearTimeout(timer);
    }, [world?.area, world?.channel, world?.zumrutR93?.nodeDepletions, state.data?.nodeDepletions, state.phase, respawnVersion]);
    React.useEffect(() => {
      if (!panel) return;
      const was = document.activeElement;
      close.current?.focus();
      const key2 = (e) => {
        e.stopImmediatePropagation();
        if (e.key === "Escape" && !buyBusy && !["starting", "channeling", "confirming", "retry_begin", "retry_finish"].includes(state.phase)) setPanel(null);
        if (e.key === "Tab") {
          const all = Array.from(card.current?.querySelectorAll("button:not(:disabled),select:not(:disabled),a[href]") ?? []);
          if (!all.length) return;
          if (e.shiftKey && document.activeElement === all[0]) {
            e.preventDefault();
            all.at(-1).focus();
          } else if (!e.shiftKey && document.activeElement === all.at(-1)) {
            e.preventDefault();
            all[0].focus();
          }
        }
      };
      window.addEventListener("keydown", key2, true);
      return () => {
        window.removeEventListener("keydown", key2, true);
        was?.isConnected && was.focus?.();
      };
    }, [panel, buyBusy, state.phase]);
    React.useEffect(() => {
      if (panel && own) {
        const target = panel === "shop" ? ZUMRUT_NPC : ZUMRUT_BENCH;
        if (Math.hypot(own.x - target.x, own.y - target.y) > ZUMRUT_REACH) setPanel(null);
      }
    }, [own?.x, own?.y, panel]);
    if (world?.area !== ZUMRUT_AREA || !own || uiSuspended) return null;
    const data = state.data, near = zumrutNearest(own, ZUMRUT_REACH, (node) => !["tree", "rock"].includes(node.kind) || zumrutNodeAvailableR93(node.id, world)), active2 = ["starting", "channeling", "confirming", "retry_begin", "retry_finish"].includes(state.phase), busy = active2 || buyBusy, rows = data?.costs ?? {}, labels2 = { tree: "Kes", rock: "K\u0131r", shop: "Alet sat\u0131n al", craft: "\xDCretim tezg\xE2h\u0131" }, description = { tree: "1 odun \xB7 Balta gerekir", rock: "1 ta\u015F \xB7 Kazma gerekir", shop: "Da\u011Fc\u0131 Aras", craft: "Malzemelerinden bir e\u015Fya \xFCret" };
    const buy = async (tool) => {
      if (buyBusy || active2) return;
      const r = buyReceipt.current;
      if (r && r.tool !== tool) {
        setNotice("\xD6nce \xF6nceki al\u0131\u015Fveri\u015Fin sonucunu yeniden sorgula.");
        return;
      }
      const receipt = r ?? { tool, requestId: uuid(), selectedItems: selected };
      buyReceipt.current = receipt;
      setBuyBusy(true);
      setNotice("");
      try {
        const result = await post("/api/action", { action: "zumrut_buy", ...receipt });
        if (result?.ok === false || result?.error) throw Object.assign(Error(result.error ?? result.message), { status: result.status ?? 409 });
        buyReceipt.current = null;
        setNotice(result.message ?? "Alet \xE7antana eklendi.");
        onChange?.();
        await controller.current?.view();
      } catch (e) {
        if (terminal(e)) buyReceipt.current = null;
        setNotice(message(e) + (buyReceipt.current ? " Ayn\u0131 alet d\xFC\u011Fmesine dokunarak sonucu yeniden sorgula." : ""));
      } finally {
        setBuyBusy(false);
      }
    };
    const content = h(
      React.Fragment,
      null,
      h("style", null, ZUMRUT_CSS_R93),
      state.toast && h("div", { key: state.toast.id, className: "zumrut93-toast", role: "status", "aria-live": "polite" }, state.toast.message),
      !panel && !active2 && near && h("aside", { className: "zumrut93-dock", "data-zumrut-node": near.id }, h(Icon, { kind: near.kind === "tree" ? "axe" : near.kind === "rock" ? "pickaxe" : near.kind === "shop" ? "axe" : "wood", size: 36 }), h("span", null, h("strong", null, near.kind === "tree" ? "Vadi \xC7am\u0131" : near.kind === "rock" ? "Alp Kayas\u0131" : near.name), h("small", null, description[near.kind])), h("button", { type: "button", disabled: own.hp <= 0, onClick: () => openZumrutR93(near) }, labels2[near.kind])),
      !panel && !active2 && !near && notice && h("aside", { className: "zumrut93-dock", role: "status" }, notice, h("button", { onClick: () => setNotice("") }, "Kapat")),
      !panel && state.phase !== "idle" && state.phase !== "complete" && h("aside", { className: "zumrut93-state", "aria-label": "Toplama i\u015Flemi" }, h("strong", null, state.kind === "wood" ? "Odunculuk" : state.kind === "stone" ? "Madencilik" : "\xDCretim"), h("p", { role: "status" }, state.message), state.phase === "channeling" && h("div", { className: "zumrut93-track", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": Math.round(state.progress * 100) }, h("i", { style: { width: state.progress * 100 + "%" } })), state.phase === "channeling" && h("small", null, "Animasyon tamamlan\u0131nca 1 malzeme kazan\u0131rs\u0131n. Hareket edersen i\u015Flem durur."), state.phase.startsWith("retry_") && h("button", { onClick: () => controller.current?.retry() }, "Sonucu yeniden sorgula"), h("button", { disabled: ["confirming", "retry_finish"].includes(state.phase), onClick: () => controller.current?.dismiss() }, active2 ? "Vazge\xE7" : "Kapat")),
      panel && h("div", { className: "zumrut93-scrim", onPointerDown: (e) => e.stopPropagation() }, h("section", { ref: card, className: "zumrut93-card", role: "dialog", "aria-modal": true, "aria-labelledby": "zumrut93-title" }, h("header", null, h("h2", { id: "zumrut93-title" }, panel === "shop" ? "Da\u011Fc\u0131 Aras" : "Vadi Tezg\xE2h\u0131"), h("p", null, panel === "shop" ? "Vadinin \xE7amlar\u0131 ve kayalar\u0131 i\xE7in sa\u011Flam el aletleri." : "Malzemelerini birle\u015Ftir. \u015Eans\u0131n\u0131n getirdi\u011Fi e\u015Fyay\u0131 ke\u015Ffet."), h("button", { ref: close, className: "zumrut93-close", disabled: busy, onClick: () => {
        setPanel(null);
        controller.current?.dismiss();
      }, "aria-label": "Pencereyi kapat" }, "\xD7")), h("div", { className: "zumrut93-body" }, !data ? h("p", { role: "status" }, state.message || "Bilgiler y\xFCkleniyor\u2026") : panel === "shop" ? h("div", { className: "zumrut93-products" }, ...["axe", "pickaxe"].map((tool) => h("article", { key: tool, className: "zumrut93-product" }, h(Icon, { kind: tool, size: 104 }), h("h3", null, tool === "axe" ? "Oduncu Baltas\u0131" : "Madenci Kazmas\u0131"), h("p", null, tool === "axe" ? "Her tamamlanan kesimde 1 odun." : "Her tamamlanan k\u0131rmada 1 ta\u015F."), h(Costs, { rows: rows[tool] ?? [], selected, setSelected }), h("button", { disabled: busy || data.tools?.[tool], onClick: () => buy(tool) }, data.tools?.[tool] ? "\xC7antanda var" : buyReceipt.current?.tool === tool ? "Sonucu yeniden sorgula" : "Sat\u0131n al")))) : h(React.Fragment, null, h(Stage, { running: state.phase === "channeling", reward: state.phase === "complete" ? state.reward : null, data }), h("div", { className: "zumrut93-workbench-title" }, h(Icon, { kind: "wood", size: 38 }), h(Icon, { kind: "stone", size: 38 }), h("div", null, h("h3", null, "\xDCretim malzemeleri"), h("p", null, "\xDCretim tamamland\u0131\u011F\u0131nda harcan\u0131r."))), h(Costs, { rows: rows.craft ?? [], selected, setSelected }), h("div", { className: "zumrut93-odds" }, ...(data.config?.recipe?.rewards ?? []).flatMap((row, i) => [h("span", { key: "name" + i }, data.catalog?.find((x) => x.id === row.itemId)?.name ?? row.itemId, " \xD7", row.amount), h("b", { key: "chance" + i }, "%" + row.chance)])), !data.config?.recipe?.rewards?.length && h("p", { className: "zumrut93-note" }, "Y\xF6netici \xFCretim \xF6d\xFCllerini ve \u015Fanslar\u0131n\u0131 belirledi\u011Finde tezg\xE2h a\xE7\u0131lacak."), state.phase === "channeling" && h("div", { className: "zumrut93-track", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": Math.round(state.progress * 100) }, h("i", { style: { width: state.progress * 100 + "%" } })), state.message && h("p", { role: "status", className: "zumrut93-note" }, state.message), h("div", { className: "zumrut93-actions" }, active2 && h("button", { disabled: ["confirming", "retry_finish"].includes(state.phase), onClick: () => controller.current?.cancel("cancel") }, "Vazge\xE7"), state.phase.startsWith("retry_") && h("button", { onClick: () => controller.current?.retry() }, "Sonucu yeniden sorgula"), !active2 && h("button", { disabled: buyBusy || !data.config?.recipe?.rewards?.length || !data.config?.enabled, onClick: () => controller.current?.begin("craft", void 0, selected) }, "\xDCret"))), notice && h("p", { role: "status", className: "zumrut93-note" }, notice))))
    );
    return Portal ? Portal(content, document.body) : content;
  }
  function Bag({ world, own, post, onChange, onSell }) {
    const [busy, setBusy] = React.useState(false), [notice, setNotice] = React.useState(""), receipt = React.useRef(null), alive = React.useRef(true);
    React.useEffect(() => {
      alive.current = true;
      return () => {
        alive.current = false;
      };
    }, []);
    const rows = new Map((world?.dungeonMaterials ?? []).map((row) => [row.kind, row.amount])), equipped = own?.equippedToolR93 ?? world?.zumrutR93?.equippedTool ?? "";
    const equip = async (tool) => {
      if (busy || typeof post !== "function") return;
      const prior = receipt.current;
      if (prior && prior.tool !== tool) {
        setNotice("\xD6nce \xF6nceki i\u015Flemi ayn\u0131 d\xFC\u011Fmeyle yeniden sorgula.");
        return;
      }
      const body = prior ?? { action: "zumrut_equip", tool, requestId: uuid() };
      receipt.current = body;
      setBusy(true);
      setNotice("");
      try {
        const result = await post("/api/action", body);
        if (result?.ok === false || result?.error) throw Object.assign(Error(result.error ?? result.message), { status: result.status ?? 409 });
        receipt.current = null;
        await onChange?.();
        if (alive.current) setNotice(result.message ?? (tool ? "Alet ku\u015Fan\u0131ld\u0131." : "Alet \xE7\u0131kar\u0131ld\u0131."));
      } catch (e) {
        if (terminal(e)) receipt.current = null;
        if (alive.current) setNotice(message(e));
      } finally {
        if (alive.current) setBusy(false);
      }
    };
    const materialKind = (kind) => kind === "talisman" ? "mount_talisman_r93" : "zumrut_" + kind + "_r93";
    const definitions = [["talisman", "Binek T\u0131ls\u0131m\u0131", "Vadi Tezg\xE2h\u0131\u2019ndan kazan\u0131lan de\u011Ferli t\u0131ls\u0131m."], ["wood", "Odun", "Vadi Tezg\xE2h\u0131 \xFCretim malzemesi."], ["stone", "Ta\u015F", "Vadi Tezg\xE2h\u0131 \xFCretim malzemesi."], ["axe", "Oduncu Baltas\u0131", "Z\xFCmr\xFCt Vadisi\u2019nde ku\u015Fan\u0131p bir a\u011Faca yakla\u015F ve Kes d\xFC\u011Fmesine dokun."], ["pickaxe", "Madenci Kazmas\u0131", "Z\xFCmr\xFCt Vadisi\u2019nde ku\u015Fan\u0131p bir kayaya yakla\u015F ve K\u0131r d\xFC\u011Fmesine dokun."]];
    return h(React.Fragment, null, ...definitions.filter(([kind]) => (rows.get(materialKind(kind)) ?? 0) > 0).map(([kind, name, note]) => h("article", { key: kind, className: "bag-item tower27-material zumrut93-bag-item" + (equipped === kind ? " equipped" : "") }, h("div", { className: "item-icon" }, h(Icon, { kind, size: 48 })), h("div", { className: "tower27-label" }, h("strong", null, name + " \xD7 " + rows.get(materialKind(kind))), h("small", null, equipped === kind ? "Ku\u015Fan\u0131ld\u0131 \xB7 " + note : note)), h("div", { className: "bag-actions" }, ["axe", "pickaxe"].includes(kind) && h("button", { disabled: busy || !post, onClick: () => equip(equipped === kind ? "" : kind) }, equipped === kind ? "\xC7\u0131kar" : "Ku\u015Fan"), typeof onSell === "function" && h("button", { disabled: busy, onClick: () => onSell(materialKind(kind)) }, "Sat")))), notice && h("p", { role: "status" }, notice));
  }
  return { Entry, Costs, Bag };
}
export {
  ZUMRUT_AREA,
  ZUMRUT_AREA as ZUMRUT_AREA_R93,
  ZUMRUT_BENCH,
  ZUMRUT_BENCH as ZUMRUT_BENCH_R93,
  ZUMRUT_BOUNDS,
  ZUMRUT_BRIDGES,
  ZUMRUT_CHALET_R93,
  ZUMRUT_CSS_R93,
  ZUMRUT_SPAWN as ZUMRUT_ENTRY_R93,
  ZUMRUT_LAYOUT_R93,
  ZUMRUT_NAME,
  ZUMRUT_NODES,
  ZUMRUT_NODES as ZUMRUT_NODES_R93,
  ZUMRUT_NPC,
  ZUMRUT_NPC as ZUMRUT_NPC_R93,
  ZUMRUT_OPEN_R93,
  ZUMRUT_PROP_ART_R93,
  ZUMRUT_REACH,
  ZUMRUT_RENDER_BUDGET_R93,
  ZUMRUT_RIVER_POINTS_R93,
  ZUMRUT_SPAWN,
  ZUMRUT_TERRAIN_ART_R93,
  ZUMRUT_WORLD_R93,
  acceptZumrutStateR93,
  applyZumrutGatherPoseR93,
  canZumrutFishR93,
  cancelZumrutR93,
  claimZumrutToastR93,
  clearZumrutRenderCacheR93,
  createZumrutControllerR93,
  createZumrutUIR93,
  drawZumrutFishingR93,
  drawZumrutGatherToolR93,
  drawZumrutHeldToolR93,
  drawZumrutObjectsR93,
  drawZumrutTerrainR93,
  drawZumrutToolIconR93,
  isZumrutSegmentR93,
  isZumrutWalkableR93,
  openZumrutR93,
  rememberZumrutDepletionR93,
  resetZumrutPresentationForTestR93,
  setZumrutAnimationR93,
  zumrutAnimationR93,
  zumrutFishingPoint,
  zumrutGatherFacingR93,
  zumrutGatherHandR93,
  zumrutGatherPoseR93,
  zumrutHit,
  zumrutInWater,
  zumrutMarketEntriesR93,
  zumrutMarketIconR93,
  zumrutNearRiver,
  zumrutNearest,
  zumrutNextRespawnR93,
  zumrutNode,
  zumrutNodeAvailableR93,
  zumrutNodeRespawnAtR93,
  zumrutNodesInRect,
  zumrutOnBridge,
  zumrutPathDistance,
  zumrutRiverHalfWidth,
  zumrutRiverX,
  zumrutSegment,
  zumrutServerNowR93,
  zumrutTerrainCacheStatsR93,
  zumrutWalkable
};
