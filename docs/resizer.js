const resizer = document.getElementById("resizer");
const map = document.getElementById("map");
const textViewer = document.getElementById("text-viewer");

let isResizing = false;

resizer.addEventListener("mousedown", (e) => {
  isResizing = true;
  document.body.style.cursor = "ew-resize";
});

document.addEventListener("mousemove", (e) => {
  if (!isResizing) return;

  const mapWidth = e.clientX;
  const totalWidth = window.innerWidth;

  if (mapWidth < 100 || totalWidth - mapWidth < 100) return;

  map.style.width = `${mapWidth}px`;
  textViewer.style.width = `${totalWidth - mapWidth}px`;
});

document.addEventListener("mouseup", () => {
  if (isResizing) {
    isResizing = false;
    document.body.style.cursor = "default";
  }
});
