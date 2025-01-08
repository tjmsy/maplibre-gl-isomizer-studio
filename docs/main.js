import { generateStyle } from "https://cdn.jsdelivr.net/gh/tjmsy/maplibre-gl-isomizer/src/generateStyle.js";
import { addImages } from "https://cdn.jsdelivr.net/gh/tjmsy/maplibre-gl-isomizer/src/addImages.js";

const yamlFiles = {
  designPlan: "https://cdn.jsdelivr.net/gh/tjmsy/isomizer-projectfiles/projects/global/design-plan.yml",
  symbolPalette: "https://cdn.jsdelivr.net/gh/tjmsy/isomizer-projectfiles/palettes/isom2017/symbol-palette.yml",
  colorPalette: "https://cdn.jsdelivr.net/gh/tjmsy/isomizer-projectfiles/palettes/isom2017/color-palette.yml",
  svgPalette: "https://cdn.jsdelivr.net/gh/tjmsy/isomizer-projectfiles/palettes/isom2017/svg-palette.yml",
};

let yamlData = {};

async function loadYamlFiles(files) {
  const loaders = Object.entries(files).map(async ([key, path]) => {
    const response = await fetch(path);
    yamlData[key] = await response.text();
  });
  await Promise.all(loaders);
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
    url: "https://tjmsy.azurewebsites.net/api/terrain-rgb/{z}/{x}/{y}.webp",
    encoding: "mapbox",
    maxzoom: 14,
    worker: true,
    cacheSize: 100,
    timeoutMs: 10000,
  });
  await demSource.setupMaplibre(maplibregl);

  const map = await new maplibregl.Map({
    container: "map",
    style: style,
    center: [0, 0],
    zoom: 1,
    hash: true,
  });
  await addImages(map, getYaml("svgPalette")["svg-palette"]);
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
    "tab-svg-palette": { content: yamlData.svgPalette, readOnly: false },
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
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
  document.getElementById(tabId).classList.add("active");
}

async function handleEditorInput() {
    const activeTab = document.querySelector(".tab.active").id;
    const tabMapping = {
      "tab-design-plan": "designPlan",
      "tab-symbol-palette": "symbolPalette",
      "tab-color-palette": "colorPalette",
      "tab-svg-palette": "svgPalette",
      "tab-style": null, 
    };
  
    const yamlKey = tabMapping[activeTab];
    if (yamlKey) {
      yamlData[yamlKey] = document.getElementById("text-editor").value;
  
      const newStyle = await updateStyle();
      map.setStyle(newStyle);
    }
  }
  

document.getElementById("text-editor").addEventListener("input", handleEditorInput);

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => switchTab(tab.id));
});

await loadYamlFiles(yamlFiles);
const initialStyle = await updateStyle();
const map = await initializeMap(initialStyle);
switchTab("tab-design-plan");
