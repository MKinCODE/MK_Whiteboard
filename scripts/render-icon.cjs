const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 256,
    height: 256,
    useContentSize: true,
    show: false,
    frame: false,
    transparent: true,
    webPreferences: {
      offscreen: true
    }
  });

  const svgPath = path.resolve(__dirname, '../public/assets/mk-logo.svg');
  const svgData = fs.readFileSync(svgPath, 'utf8');
  const html = `<!DOCTYPE html><html><head><style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 256px; height: 256px; overflow: hidden; background: transparent; }
    svg { width: 256px; height: 256px; display: block; }
  </style></head><body>${svgData}</body></html>`;
  
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  setTimeout(async () => {
    const image = await win.capturePage();
    const pngPath256 = path.resolve(__dirname, '../public/assets/mk-logo-256.png');
    const pngPath32 = path.resolve(__dirname, '../public/assets/mk-logo-32.png');
    
    fs.writeFileSync(pngPath256, image.toPNG());
    console.log('Saved 256x256 icon to:', pngPath256);
    
    const image32 = image.resize({ width: 32, height: 32 });
    fs.writeFileSync(pngPath32, image32.toPNG());
    console.log('Saved 32x32 icon to:', pngPath32);
    
    app.exit(0);
  }, 600);
});
