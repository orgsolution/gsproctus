// Trigger an immediate direct download of the Proctus Standalone Web Application
export function triggerInstantAppDownload() {
  const appHtmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Proctus - Lanceur Officiel</title>
  <meta name="theme-color" content="#0A1F44">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: linear-gradient(135deg, #0A1F44 0%, #152E5C 100%);
      color: #ffffff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      padding: 24px;
      box-sizing: border-box;
    }
    .card {
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(201, 162, 39, 0.35);
      border-radius: 28px;
      padding: 36px 28px;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    }
    .logo-badge {
      width: 72px;
      height: 72px;
      margin: 0 auto 20px;
      border-radius: 20px;
      background: #0A1F44;
      border: 2px solid #C9A227;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      font-weight: 900;
      color: #C9A227;
      box-shadow: 0 8px 24px rgba(201, 162, 39, 0.25);
    }
    h1 {
      font-size: 24px;
      font-weight: 800;
      margin: 0 0 8px;
      color: #ffffff;
      letter-spacing: -0.5px;
    }
    p {
      font-size: 14px;
      color: #cbd5e1;
      line-height: 1.5;
      margin: 0 0 24px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 14px 20px;
      border-radius: 16px;
      background: #C9A227;
      color: #0A1F44;
      font-size: 15px;
      font-weight: 700;
      text-decoration: none;
      box-shadow: 0 6px 18px rgba(201, 162, 39, 0.35);
      transition: all 0.2s ease;
      box-sizing: border-box;
      cursor: pointer;
      border: none;
    }
    .btn:hover {
      background: #d6b033;
      transform: translateY(-2px);
    }
    .footer-note {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-badge">P</div>
    <h1>PROCTUS</h1>
    <p>Application Universitaire & Réseau Officiel de Promotion. Ouvrez pour accéder à votre espace hors-ligne et synchronisé.</p>
    <a href="${window.location.origin}" class="btn" id="launchBtn">Ouvrir Proctus</a>
    <div class="footer-note">Accès PWA direct multiplateforme • Version 2025-2026</div>
  </div>
  <script>
    // Auto-launch if possible
    setTimeout(function() {
      window.location.href = "${window.location.origin}";
    }, 1500);
  </script>
</body>
</html>`;

  const blob = new Blob([appHtmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Proctus-App.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
