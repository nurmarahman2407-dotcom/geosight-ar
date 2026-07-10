/**
 * SheetConnector — hantar data ke Google Apps Script Web App (yang append ke Google Sheets).
 *
 * PENTING: tukar SHEET_API_URL di bawah dengan URL "exec" sebenar
 * lepas anda deploy Apps Script (Deploy > New deployment > Web app > Anyone).
 *
 * Guna mode:'no-cors' sebab Apps Script tak hantar CORS header secara default.
 * Ini bermakna kita TAK boleh baca response (fire-and-forget), tapi data
 * tetap sampai & masuk ke Sheet — cukup untuk logging/analytics.
 */

const SheetConnector = {
  // GANTI dengan URL Apps Script exec anda sendiri, contoh:
  // "https://script.google.com/macros/s/AKfycb.../exec"
  apiUrl: "https://script.google.com/macros/s/AKfycbwXtrnut0DpRjM1Ltex-2amnZD7rj7XUn4ppU9oIStsfARu6mPMpF3GZanB5oc-pcAwIw/exec",

  send(payload) {
    if (!this.apiUrl || this.apiUrl.startsWith("PASTE_")) {
      console.warn("[SheetConnector] URL belum di-set — data ini TIDAK dihantar:", payload);
      return Promise.resolve(false);
    }
    return fetch(this.apiUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" }, // elak CORS preflight
      body: JSON.stringify(payload)
    })
      .then(() => true)
      .catch((err) => {
        console.warn("[SheetConnector] Hantar gagal (tak kritikal, murid boleh terus):", err);
        return false;
      });
  },

  /**
   * Baca balik data dari Sheets guna teknik JSONP (elak sekatan CORS
   * Apps Script). Pulangkan Promise yang resolve dengan object data.
   */
  fetchData(studentName, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      if (!this.apiUrl || this.apiUrl.startsWith("PASTE_")) {
        reject(new Error("SheetConnector URL belum di-set"));
        return;
      }

      const callbackName = "geosightCb_" + Date.now();
      const script = document.createElement("script");
      let settled = false;

      const cleanup = () => {
        delete window[callbackName];
        if (script.parentNode) script.parentNode.removeChild(script);
      };

      window[callbackName] = (data) => {
        settled = true;
        cleanup();
        resolve(data);
      };

      script.src = `${this.apiUrl}?callback=${callbackName}&studentName=${encodeURIComponent(studentName || "")}`;
      script.onerror = () => {
        if (!settled) { cleanup(); reject(new Error("Gagal load data dari Sheets")); }
      };

      setTimeout(() => {
        if (!settled) { cleanup(); reject(new Error("Timeout — Sheets tak respon")); }
      }, timeoutMs);

      document.body.appendChild(script);
    });
  }
};
