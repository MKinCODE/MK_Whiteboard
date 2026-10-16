# Portfolio Download Guide — MK Whiteboard

This guide explains **which file to give users on your portfolio website**, **how to host it for free**, and **the HTML download button code** to paste into your portfolio.

---

## 1. Which File Do You Give to Users?

The file you attach for users to download is:

```
d:\Whiteboard\MK-Whiteboard-Setup-1.0.0.exe  (Size: ~113 MB)
```

When users click download and run this file on Windows:
1. It automatically installs **MK Whiteboard** on their computer.
2. It adds shortcuts to their **Desktop** and **Windows Start Menu**.
3. On first launch, it opens the **Setup Wizard** allowing them to pick where on their PC they want their `.mkwhiteboard` files saved (defaults to `Documents\MK Whiteboard`).
4. Everything is 100% offline, local, and private.

---

## 2. Important: How to Host the `.exe` (GitHub Releases)

> **Crucial Git Rule**: GitHub has a strict **100 MB limit** for individual files in standard `git push` commits. Because the compiled `.exe` installer is ~113 MB, you **cannot** push the `.exe` inside your source code commits (our `.gitignore` already protects you from this error).

Instead, every major Windows desktop app on GitHub (like VS Code, Obsidian, and HandBrake) uses **GitHub Releases** for binary downloads. It is 100% free, fast, and gives you a permanent direct download link.

### Step-by-Step Instructions:

1. **Push your code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of MK Whiteboard"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

2. **Create a Release on GitHub**:
   - Go to your repository on GitHub (`https://github.com/<your-username>/<your-repo-name>`).
   - On the right sidebar, click **"Releases"** (or click **"Create a new release"**).
   - In **"Choose a tag"**, type `v1.0.0` and click **"Create new tag"**.
   - Release title: `MK Whiteboard v1.0.0 for Windows`.
   - In the box that says **"Attach binaries by dropping them here or selecting them"**, drag and drop:
     `d:\Whiteboard\MK-Whiteboard-Setup-1.0.0.exe`
   - Click the green **"Publish release"** button.

3. **Get your direct download link**:
   Your direct download link will always be:
   ```
   https://github.com/<your-username>/<your-repo-name>/releases/latest/download/MK-Whiteboard-Setup-1.0.0.exe
   ```
   *(Replace `<your-username>` and `<your-repo-name>` with your actual GitHub username and repository name).*

---

## 3. Portfolio Website Code (Copy & Paste)

Add this download button to your portfolio website HTML where you showcase the project:

### HTML:

```html
<!-- MK Whiteboard Download Card on Portfolio -->
<div class="project-download-card">
  <h3>MK Whiteboard for Windows</h3>
  <p>100% Local-first infinite canvas with pressure-sensitive inking, virtual ruler, and zero cloud tracking.</p>
  
  <a href="https://github.com/<your-username>/<your-repo-name>/releases/latest/download/MK-Whiteboard-Setup-1.0.0.exe" 
     class="download-exe-button" 
     download>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
    <span>Download for Windows (.exe)</span>
  </a>
  <span class="file-meta">Version 1.0.0 • Windows 10/11 (64-bit) • 100% Free & Offline</span>
</div>
```

### CSS:

```css
.project-download-card {
  max-width: 480px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
}

.download-exe-button {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background-color: #0284c7;
  color: #ffffff;
  padding: 12px 24px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
  transition: background-color 0.15s ease;
  margin: 12px 0 8px 0;
}

.download-exe-button:hover {
  background-color: #0369a1;
}

.file-meta {
  display: block;
  font-size: 12px;
  color: #64748b;
}
```

---

## 4. Alternative Hosting Options (If Not Using GitHub Releases)

If you prefer not to use GitHub Releases, you can upload `MK-Whiteboard-Setup-1.0.0.exe` to:
- **Google Drive**: Upload the `.exe`, set share permissions to *"Anyone with the link can view"*, and generate a direct download link.
- **Cloudflare R2 / AWS S3**: Upload the `.exe` to an S3/R2 bucket with public read access.
- **Your Web Hosting CPanel**: Upload directly into your website's `/downloads/` folder (e.g. `https://yourdomain.com/downloads/MK-Whiteboard-Setup-1.0.0.exe`).
