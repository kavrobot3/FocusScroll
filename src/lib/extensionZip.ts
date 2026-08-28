import JSZip from 'jszip';
import { recordExtensionDownload } from './downloadCounter';

export async function generateAndDownloadExtensionZip(): Promise<void> {
  // Increment live download counter on trigger
  recordExtensionDownload();

  // First try to fetch the real pre-built dist.zip
  try {
    const res = await fetch('/dist.zip');
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'FocusScroll-Extension.zip';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return;
    }
  } catch (err) {
    console.warn('Direct zip fetch fallback to dynamic generator:', err);
  }

  // Fallback JSZip generator if static asset cannot be fetched
  const zip = new JSZip();

  const manifest = {
    manifest_version: 3,
    name: 'FocusScroll - Shorts & Reels Focus Intervention',
    description: 'Track YouTube Shorts & Instagram Reels dwell time and rebuild mindfulness with gentle scroll intervention.',
    version: '1.0.0',
    permissions: ['storage'],
    host_permissions: [
      'https://www.youtube.com/*',
      'https://youtube.com/*',
      'https://www.instagram.com/*',
      'https://instagram.com/*'
    ],
    action: {
      default_title: 'FocusScroll - Shorts Intervention',
      default_popup: 'popup.html'
    },
    background: {
      service_worker: 'background.js'
    },
    content_scripts: [
      {
        matches: ['https://instagram.com/*', 'https://www.instagram.com/*'],
        run_at: 'document_idle',
        js: ['content-scripts/instagram.js']
      },
      {
        matches: ['https://www.youtube.com/*', 'https://youtube.com/*'],
        run_at: 'document_idle',
        js: ['content-scripts/youtube.js']
      }
    ]
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  zip.file(
    'README.txt',
    `FOCUS SCROLL - CHROME EXTENSION INSTALLATION
============================================

IMPORTANT NOTE:
When unzipping this file, your extraction tool may create an outer folder
(e.g., "FocusScroll-Extension" or "dist") containing an inner "dist" folder.

Make sure you select the INNER folder that directly contains "manifest.json"
when clicking "Load unpacked" in chrome://extensions.

Step-by-Step Instructions:
1. Extract this ZIP archive into a regular folder.
2. Verify you can see "manifest.json" in the folder.
3. Open Google Chrome and go to chrome://extensions
4. Toggle "Developer mode" to ON in the top right corner.
5. Click the "Load unpacked" button in the top left corner.
6. Select the folder containing "manifest.json" (select the inner folder if nested).
7. FocusScroll is now active on YouTube Shorts and Instagram Reels!
`
  );

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'FocusScroll-Extension.zip';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

