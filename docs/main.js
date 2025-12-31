import { generateStyle } from "https://cdn.jsdelivr.net/gh/tjmsy/maplibre-gl-isomizer@0.3/src/generateStyle.js";
import { addImages } from "https://cdn.jsdelivr.net/gh/tjmsy/maplibre-gl-isomizer@0.3/src/addImages.js";

const yamlFiles = {
  designPlan:
    "https://cdn.jsdelivr.net/gh/tjmsy/isomizer-projectfiles/projects/global/design-plan.yml",
  symbolPalette:
    "https://cdn.jsdelivr.net/gh/tjmsy/isomizer-projectfiles/palettes/isom2017/symbol-palette.yml",
  colorPalette:
    "https://cdn.jsdelivr.net/gh/tjmsy/isomizer-projectfiles/palettes/isom2017/color-palette.yml",
  imagePalette:
    "https://cdn.jsdelivr.net/gh/tjmsy/isomizer-projectfiles/palettes/isom2017/image-palette.yml",
};

let yamlData = {};

async function loadYamlFiles(files) {
  const loaders = Object.entries(files).map(async ([key, path]) => {
    const response = await fetch(path);
    yamlData[key] = await response.text();
  });
  await Promise.all(loaders);
}

async function saveProjectAsZip() {
  const zip = new JSZip();

  zip.file("design-plan.yml", yamlData.designPlan);
  zip.file("symbol-palette.yml", yamlData.symbolPalette);
  zip.file("color-palette.yml", yamlData.colorPalette);
  zip.file("image-palette.yml", yamlData.imagePalette);

  const blob = await zip.generateAsync({ type: "blob" });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "isomizer-project.zip";
  a.click();

  URL.revokeObjectURL(url);
}

function getYaml(key) {
  return jsyaml.load(yamlData[key]);
}

function updateStyle() {
  const { rules, sources } = getYaml("designPlan");
  return generateStyle(
    rules,
    sources,
    getYaml("symbolPalette")["symbol-palette"],
    getYaml("colorPalette")["color-palette"]
  );
}

async function initializeMap(style) {
  const demSource = await new mlcontour.DemSource({
    url: "https://tiles.gsj.jp/tiles/elev/land/{z}/{y}/{x}.png",
    encoding: "numpng",
    maxzoom: 15,
    worker: true,
    cacheSize: 100,
    timeoutMs: 10_000,
  });
  await demSource.setupMaplibre(maplibregl);

  const map = await new maplibregl.Map({
    container: "map",
    style: {
      version: 8,
      sources: {},
      layers: [],
    },
    center: [0, 0],
    zoom: 1,
    hash: true,
  });
  await addImages(map, getYaml("imagePalette")["image-palette"]);

  map.addSource("contour-source", {
    type: "vector",
    tiles: [
      demSource.contourProtocolUrl({
        thresholds: {
          5: [2560, 12800],
          6: [1280, 6400],
          7: [640, 3200],
          8: [320, 1600],
          9: [160, 800],
          10: [80, 400],
          11: [40, 200],
          12: [20, 100],
          13: [10, 50],
          14: [5, 25],
        },
        contourLayer: "contours",
        elevationKey: "ele",
        levelKey: "level",
        extent: 4096,
        buffer: 1,
      }),
    ],
    maxzoom: 15,
    attribution:
      "<a href='https://tiles.gsj.jp/tiles/elev/tiles.html#land' target='_blank'>産総研 シームレス標高タイル(陸域統合DEM)</a>",
  });

  return map;
}

function updateEditor(content, readOnly = false) {
  const editor = document.getElementById("text-editor");
  editor.value = content;
  editor.readOnly = readOnly;
}

async function switchTab(tabId) {
  const tabMapping = {
    "tab-design-plan": { content: yamlData.designPlan, readOnly: false },
    "tab-symbol-palette": { content: yamlData.symbolPalette, readOnly: false },
    "tab-color-palette": { content: yamlData.colorPalette, readOnly: false },
    "tab-image-palette": { content: yamlData.imagePalette, readOnly: false },
    "tab-style": { content: await getStyleContent(), readOnly: true },
  };

  const { content, readOnly } = tabMapping[tabId];
  updateEditor(content, readOnly);
  setActiveTab(tabId);
}

async function getStyleContent() {
  const style = await updateStyle();
  return JSON.stringify(style, null, 2);
}

function setActiveTab(tabId) {
  document
    .querySelectorAll(".tab")
    .forEach((tab) => tab.classList.remove("active"));
  document.getElementById(tabId).classList.add("active");
}

async function handleEditorInput() {
  const activeTab = document.querySelector(".tab.active").id;
  const tabMapping = {
    "tab-design-plan": "designPlan",
    "tab-symbol-palette": "symbolPalette",
    "tab-color-palette": "colorPalette",
    "tab-image-palette": "imagePalette",
    "tab-style": null,
  };

  const yamlKey = tabMapping[activeTab];
  if (yamlKey) {
    yamlData[yamlKey] = document.getElementById("text-editor").value;

    const newStyle = await updateStyle();
    map.setStyle(newStyle);
  }
}

document
  .getElementById("text-editor")
  .addEventListener("input", handleEditorInput);

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => switchTab(tab.id));
});

document.getElementById("save-zip").addEventListener("click", saveProjectAsZip);

await loadYamlFiles(yamlFiles);
const initialStyle = await updateStyle();
const map = await initializeMap(initialStyle);
switchTab("tab-design-plan");
