<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>YutuWeb - Analizador profesional de YouTube</title>
  <style>
    :root {
      --bg: #040911;
      --surface: rgba(12, 20, 42, 0.92);
      --surface-strong: rgba(8, 16, 34, 0.95);
      --accent: #ff4d7a;
      --accent-strong: #ff1f56;
      --text: #eef3ff;
      --muted: #90a2bd;
      --success: #3fe7b8;
      --warning: #ffd166;
      --danger: #ff6b6b;
      --border: rgba(255, 255, 255, 0.08);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: Inter, system-ui, sans-serif;
      background: radial-gradient(circle at top left, rgba(255, 111, 177, 0.16), transparent 24%),
                  radial-gradient(circle at bottom right, rgba(45, 214, 255, 0.12), transparent 20%),
                  linear-gradient(180deg, #050a16 0%, #081224 100%);
      color: var(--text);
    }
    .page {
      max-width: 1300px;
      margin: 0 auto;
      padding: 32px 24px 46px;
    }
    header {
      display: grid;
      gap: 16px;
      align-items: center;
      margin-bottom: 28px;
    }
    header .intro {
      display: grid;
      gap: 12px;
    }
    header h1 {
      margin: 0;
      font-size: clamp(2.4rem, 2.8vw, 3.4rem);
      line-height: 1.02;
      letter-spacing: -0.04em;
    }
    header p {
      margin: 0;
      color: var(--muted);
      max-width: 860px;
      line-height: 1.8;
      font-size: 1rem;
    }
    .hero-badge {
      align-self: start;
      display: inline-flex;
      gap: 10px;
      padding: 14px 20px;
      border-radius: 999px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08);
      color: var(--text);
      font-weight: 700;
      width: fit-content;
    }
    .panel {
      display: grid;
      gap: 22px;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 28px;
      box-shadow: 0 32px 80px rgba(0,0,0,0.18);
      padding: 26px;
      backdrop-filter: blur(22px);
    }
    .inputs {
      display: grid;
      gap: 18px;
    }
    .input-group {
      display: grid;
      gap: 10px;
    }
    label {
      color: var(--muted);
      font-size: 0.95rem;
    }
    input {
      width: 100%;
      padding: 16px 18px;
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.05);
      color: var(--text);
      font-size: 1rem;
      outline: none;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    input:focus {
      border-color: rgba(255, 77, 125, 0.85);
      box-shadow: 0 0 0 5px rgba(255, 77, 125, 0.12);
    }
    .button-row {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      align-items: center;
      justify-content: space-between;
    }
    button {
      border: none;
      border-radius: 20px;
      padding: 16px 28px;
      background: linear-gradient(135deg, var(--accent), var(--accent-strong));
      color: #fff;
      font-weight: 800;
      font-size: 1rem;
      cursor: pointer;
      box-shadow: 0 18px 34px rgba(255, 63, 130, 0.2);
      transition: transform 0.2s ease, filter 0.2s ease;
    }
    button:hover { transform: translateY(-2px); filter: brightness(1.06); }
    .error {
      color: var(--danger);
      font-size: 0.98rem;
      margin-top: 4px;
      min-height: 18px;
    }
    .section-title {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      margin-bottom: 18px;
    }
    .section-title h2,
    .section-title h3 {
      margin: 0;
      font-size: 1.15rem;
    }
    .section-title span {
      color: var(--muted);
      font-size: 0.95rem;
    }
    .top-grid {
      display: grid;
      gap: 22px;
      grid-template-columns: minmax(320px, 1fr) minmax(420px, 1.5fr);
    }
    .stats-grid {
      display: grid;
      gap: 18px;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .metric {
      padding: 20px;
      border-radius: 24px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      transition: transform 0.2s ease;
    }
    .metric:hover { transform: translateY(-2px); }
    .metric h3 { margin: 0 0 12px; color: var(--muted); font-size: 0.95rem; }
    .metric strong { display: block; font-size: 1.8rem; color: #fff; }
    .channel-panel { display: grid; gap: 22px; }
    .cover {
      position: relative;
      min-height: 210px;
      border-radius: 28px;
      overflow: hidden;
      background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
    }
    .cover img { width: 100%; height: 100%; object-fit: cover; filter: saturate(1.1) contrast(1.05); }
    .cover-caption {
      position: absolute;
      left: 24px;
      top: 22px;
      padding: 10px 16px;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.35);
      color: #fff;
      font-size: 0.9rem;
      backdrop-filter: blur(12px);
    }
    .avatar {
      position: absolute;
      left: 26px;
      bottom: -22px;
      width: 112px;
      height: 112px;
      border-radius: 28px;
      background: #0b1324;
      border: 4px solid rgba(6, 11, 24, 0.95);
      overflow: hidden;
      box-shadow: 0 22px 48px rgba(0,0,0,0.35);
    }
    .avatar img { width: 100%; height: 100%; object-fit: cover; }
    .channel-info {
      display: grid;
      gap: 14px;
      padding-top: 24px;
    }
    .channel-info h2 { margin: 0; font-size: 2rem; }
    .channel-meta { display: flex; flex-wrap: wrap; gap: 12px; color: var(--muted); font-size: 0.95rem; }
    .pill {
      display: inline-flex;
      gap: 8px;
      padding: 10px 14px;
      border-radius: 999px;
      background: rgba(255,255,255,0.06);
      color: var(--text);
      font-size: 0.9rem;
    }
    .detail-list {
      display: grid;
      gap: 10px;
    }
    .detail-list span { display: flex; justify-content: space-between; color: var(--muted); font-size: 0.95rem; }
    .detail-list span strong { color: var(--text); }
    .tag-list {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 12px;
    }
    .tag-list .tag {
      padding: 10px 14px;
      border-radius: 16px;
      background: rgba(255,255,255,0.06);
      color: var(--text);
      font-size: 0.9rem;
    }
    .status-box {
      padding: 22px;
      border-radius: 24px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.04);
    }
    .status-box strong { display:block; margin-bottom: 12px; }
    .status-box p { margin: 0; color: var(--muted); line-height: 1.75; }
    .recommendations { list-style:none; margin:0; padding:0; display:grid; gap:14px; }
    .recommendations li {
      padding-left: 18px;
      position: relative;
      color: var(--text);
      line-height: 1.7;
    }
    .recommendations li::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0.85em;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ff6a92, #ffd267);
    }
    .chart-container {
      min-height: 380px;
      padding: 24px;
      border-radius: 26px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.03);
    }
    .table-wrapper { overflow-x:auto; }
    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 760px;
    }
    th, td {
      padding: 14px 12px;
      text-align:left;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    th { color: var(--muted); font-size: 0.95rem; }
    td { color: var(--text); font-size: 0.96rem; vertical-align: middle; }
    td img { width: 96px; height: 54px; object-fit: cover; border-radius: 14px; }
    .footer {
      margin-top: 32px;
      text-align:center;
      color: var(--muted);
      font-size: 0.95rem;
      line-height: 1.8;
    }
    @media (max-width: 1080px) {
      .top-grid { grid-template-columns: 1fr; }
      .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .cover { min-height: 240px; }
      table { min-width: 680px; }
    }
    @media (max-width: 760px) {
      .panel { gap: 18px; }
      .inputs { gap: 14px; }
      .button-row { flex-direction: column; align-items: stretch; }
      .stats-grid { grid-template-columns: 1fr; }
      .section-title { flex-direction: column; align-items: flex-start; }
      .channel-info h2 { font-size: 1.7rem; }
      table { min-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="page">
    <header>
      <div class="intro">
        <h1>YutuWeb</h1>
        <p>Analiza canales reales de YouTube con información profesional: métricas completas, portada, SEO, rendimiento de videos y recomendaciones prácticas.</p>
      </div>
      <span class="hero-badge">Diseño profesional • Datos reales</span>
    </header>

    <div class="panel">
      <div class="card">
        <div class="section-title">
          <h3>Buscar canal</h3>
          <span>API integrada</span>
        </div>
        <div class="inputs">
          <div class="input-group">
            <label for="channelUrl">Enlace del canal</label>
            <input id="channelUrl" type="text" value="https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw" placeholder="https://www.youtube.com/channel/..." />
          </div>
          <div class="button-row">
            <button id="analyzeBtn">Ejecutar análisis</button>
          </div>
        </div>
        <p class="error" id="errorText"></p>
      </div>

      <div class="card channel-card" id="channelProfile" style="display:none;">
        <div class="cover" id="coverFrame">
          <img id="coverImage" src="" alt="Portada del canal" />
          <div class="cover-caption">Portada oficial del canal</div>
          <div class="avatar"><img id="avatarImage" src="" alt="Avatar del canal" /></div>
        </div>
        <div class="channel-panel">
          <div class="channel-info">
            <h2 id="channelTitle">Título del canal</h2>
            <div class="channel-meta" id="channelMeta">Categoría • País • Fecha</div>
            <div class="detail-list" id="channelDetails"></div>
            <div class="tag-list" id="tagList"></div>
          </div>
          <div class="stats-grid">
            <div class="metric"><h3>Suscriptores</h3><strong id="subsCount">-</strong></div>
            <div class="metric"><h3>Vistas totales</h3><strong id="viewsCount">-</strong></div>
            <div class="metric"><h3>Videos</h3><strong id="videosCount">-</strong></div>
            <div class="metric"><h3>Promedio vistas</h3><strong id="avgViews">-</strong></div>
            <div class="metric"><h3>Ratio views/subs</h3><strong id="ratioViewsSubs">-</strong></div>
            <div class="metric"><h3>Engagement</h3><strong id="avgLikeRatio">-</strong></div>
          </div>
        </div>
      </div>

      <div class="top-grid">
        <div class="card" id="healthCard" style="display:none;">
          <div class="section-title"><h2>Salud del canal</h2><span>Review rápido</span></div>
          <div class="stats-grid">
            <div class="metric"><h3>Cadencia</h3><strong id="uploadFrequency">-</strong></div>
            <div class="metric"><h3>Edad del canal</h3><strong id="channelAge">-</strong></div>
            <div class="metric"><h3>Descripción</h3><strong id="descriptionScore">-</strong></div>
            <div class="metric"><h3>Próximo video</h3><strong id="nextUpload">-</strong></div>
          </div>
        </div>
        <div class="card" id="performanceCard" style="display:none;">
          <div class="section-title"><h2>Performance reciente</h2><span>Últimos videos</span></div>
          <div class="status-box" id="quickSummary"><strong>Resumen del canal</strong><p>Cargando métricas...</p></div>
          <div class="status-box" id="thumbnailAssessment"><strong>Miniaturas</strong><p>Analizando miniaturas...</p></div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card" id="graphCard" style="display:none;">
          <div class="section-title"><h3>Gráfica de rendimiento</h3><span>Vistas y likes en los últimos videos</span></div>
          <div class="chart-container"><canvas id="viewsChart"></canvas></div>
        </div>
        <div class="card" id="seoCard" style="display:none;">
          <div class="section-title"><h3>SEO & Branding</h3><span>Optimización clave</span></div>
          <div class="status-box" id="seoSummary"></div>
          <div class="status-box" id="descriptionAnalysis"></div>
        </div>
      </div>

      <div class="card" id="tableCard" style="display:none;">
        <div class="section-title"><h3>Videos recientes</h3><span>Los 10 últimos</span></div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Miniatura</th>
                <th>Título</th>
                <th>Views</th>
                <th>Likes</th>
                <th>Publicado</th>
              </tr>
            </thead>
            <tbody id="videoTable"></tbody>
          </table>
        </div>
      </div>

      <div class="card" id="recommendationsCard" style="display:none;">
        <div class="section-title"><h3>Recomendaciones</h3><span>Mejora concreta</span></div>
        <ul class="recommendations" id="recommendationList"></ul>
      </div>

      <div class="footer">YutuWeb usa la API de YouTube para ofrecer análisis real y visualización profesional de canales.</div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script>
    const STORED_API_KEY = 'AIzaSyBDVy01ppoCesDj2sKqN0UluPDdcnY0p1Y';
    const analyzeBtn = document.getElementById('analyzeBtn');
    const channelUrlInput = document.getElementById('channelUrl');
    const errorText = document.getElementById('errorText');
    const channelProfile = document.getElementById('channelProfile');
    const healthCard = document.getElementById('healthCard');
    const performanceCard = document.getElementById('performanceCard');
    const graphCard = document.getElementById('graphCard');
    const seoCard = document.getElementById('seoCard');
    const tableCard = document.getElementById('tableCard');
    const recommendationsCard = document.getElementById('recommendationsCard');
    const coverImage = document.getElementById('coverImage');
    const avatarImage = document.getElementById('avatarImage');
    const channelTitle = document.getElementById('channelTitle');
    const channelMeta = document.getElementById('channelMeta');
    const channelDetails = document.getElementById('channelDetails');
    const tagList = document.getElementById('tagList');
    const subsCount = document.getElementById('subsCount');
    const viewsCount = document.getElementById('viewsCount');
    const videosCount = document.getElementById('videosCount');
    const nextUpload = document.getElementById('nextUpload');
    const avgViews = document.getElementById('avgViews');
    const avgLikeRatio = document.getElementById('avgLikeRatio');
    const ratioViewsSubs = document.getElementById('ratioViewsSubs');
    const uploadFrequency = document.getElementById('uploadFrequency');
    const channelAge = document.getElementById('channelAge');
    const descriptionScore = document.getElementById('descriptionScore');
    const seoSummary = document.getElementById('seoSummary');
    const descriptionAnalysis = document.getElementById('descriptionAnalysis');
    const quickSummary = document.getElementById('quickSummary');
    const thumbnailAssessment = document.getElementById('thumbnailAssessment');
    const videoTable = document.getElementById('videoTable');
    const recommendationList = document.getElementById('recommendationList');
    let chartInstance = null;

    function formatNumber(value) {
      return Number(value).toLocaleString('es-ES');
    }
    function formatDate(iso) {
      return new Date(iso).toLocaleDateString('es-ES', { year:'numeric', month:'short', day:'numeric' });
    }
    function parseYouTubeChannelLink(url) {
      try {
        const parsed = new URL(url.trim());
        const path = parsed.pathname.replace(/\/+$/, '');
        const parts = path.split('/').filter(Boolean);
        if (parts[0] === 'channel' && parts[1]) return { type: 'channelId', value: parts[1] };
        if (parts[0] === 'user' && parts[1]) return { type: 'userName', value: parts[1] };
        if (parts.some(segment => segment.startsWith('@'))) {
          const handle = parts.find(segment => segment.startsWith('@')).replace('@','');
          return { type: 'handle', value: handle };
        }
        if (parts.length === 1) return { type: 'handle', value: parts[0] };
        return null;
      } catch {
        return null;
      }
    }
    function showError(message) {
      errorText.textContent = message;
    }
    function clearError() {
      errorText.textContent = '';
    }
    function setVisible(element, visible) {
      element.style.display = visible ? 'block' : 'none';
    }
    function fetchFromYouTube(endpoint, params) {
      const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
      Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
      return fetch(url.toString()).then(async res => {
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const msg = data?.error?.message || res.statusText;
          throw new Error(msg);
        }
        return data;
      });
    }
    async function resolveChannelData(parsed) {
      if (!parsed) throw new Error('URL de canal inválida');
      const part = 'snippet,statistics,brandingSettings,contentDetails,topicDetails';
      if (parsed.type === 'channelId') {
        return fetchFromYouTube('channels', { part, id: parsed.value, key: STORED_API_KEY });
      }
      if (parsed.type === 'userName') {
        return fetchFromYouTube('channels', { part, forUsername: parsed.value, key: STORED_API_KEY });
      }
      if (parsed.type === 'handle') {
        const search = await fetchFromYouTube('search', { part: 'snippet', q: parsed.value, type: 'channel', maxResults: 1, key: STORED_API_KEY });
        const item = search.items?.[0];
        if (!item) throw new Error('No se encontró el canal por handle.');
        return fetchFromYouTube('channels', { part, id: item.snippet.channelId, key: STORED_API_KEY });
      }
      throw new Error('No se pudo resolver el canal.');
    }
    async function fetchRecentVideoStats(uploadPlaylistId) {
      const playlist = await fetchFromYouTube('playlistItems', {
        part: 'contentDetails,snippet', maxResults: 12, playlistId: uploadPlaylistId, key: STORED_API_KEY
      });
      const ids = playlist.items.map(item => item.contentDetails.videoId).filter(Boolean);
      if (!ids.length) return [];
      const videos = await fetchFromYouTube('videos', {
        part: 'snippet,statistics,contentDetails', id: ids.join(','), maxResults: 12, key: STORED_API_KEY
      });
      return videos.items.map(video => ({
        id: video.id,
        title: video.snippet.title,
        publishedAt: video.snippet.publishedAt,
        viewCount: Number(video.statistics.viewCount || 0),
        likeCount: Number(video.statistics.likeCount || 0),
        commentCount: Number(video.statistics.commentCount || 0),
        duration: video.contentDetails.duration,
        thumbnail: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url || '',
      }));
    }
    function computeCadence(videos) {
      if (videos.length < 2) return null;
      const dates = videos.map(v => new Date(v.publishedAt)).sort((a,b) => b - a);
      const intervals = [];
      for (let i = 1; i < dates.length; i++) {
        intervals.push((dates[i-1] - dates[i]) / (1000*60*60*24));
      }
      return intervals.reduce((sum, x) => sum + x, 0) / intervals.length;
    }
    function analyzeSeo(data) {
      const tags = data.tags;
      const desc = data.description || '';
      const title = data.title || '';
      const summary = [];
      const recommendations = [];
      if (title.length < 30) summary.push('Título corto');
      else if (title.length > 55) summary.push('Título largo');
      else summary.push('Título óptimo');
      if (desc.length < 120) {
        summary.push('Descripción débil');
        recommendations.push('Amplía la descripción con palabras clave, enlaces y llamados a la acción.');
      } else {
        summary.push('Descripción adecuada');
      }
      if (!tags.length) {
        recommendations.push('Añade etiquetas de canal para mejorar el descubrimiento orgánico.');
      }
      if (!data.branding.goodBanner) {
        recommendations.push('Actualiza el banner con un mensaje de valor claro y branding profesional.');
      }
      return {
        summary: `${summary.join(' • ')}. ${tags.length ? 'Tags detectadas.' : 'Sin etiquetas de canal.'}`,
        details: recommendations.length ? recommendations.join(' ') : 'El SEO es funcional. Refuerza miniaturas y frecuencia para mayor impacto.'
      };
    }
    function formatPrecision(value) {
      return Number(value).toFixed(1).replace('.0','');
    }
    function showChannelData(channel, videos) {
      const snippet = channel.snippet;
      const stats = channel.statistics;
      const branding = channel.brandingSettings || {};
      const thumbnails = snippet.thumbnails || {};
      const banner = branding.image?.bannerExternalUrl || thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url || '';
      const avatar = thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url || '';
      const publishedAt = formatDate(snippet.publishedAt);
      const ageYears = Math.max(0, (new Date() - new Date(snippet.publishedAt)) / (1000*60*60*24*365));
      const topics = channel.topicDetails?.topicCategories?.map(tag => tag.split('/').pop()).join(', ') || 'Sin categoría';
      const tags = (branding.channel?.keywords || '').split(',').map(t => t.trim()).filter(Boolean);
      const subCount = Number(stats.subscriberCount || 0);
      const viewCount = Number(stats.viewCount || 0);
      const videoCount = Number(stats.videoCount || 0);
      const avgRecentViews = videos.length ? Math.round(videos.reduce((sum, v) => sum + v.viewCount, 0) / videos.length) : 0;
      const avgLikeRate = videos.length ? videos.reduce((sum, v) => sum + (v.likeCount / Math.max(v.viewCount, 1)), 0) / videos.length * 100 : 0;
      const viewsPerSub = subCount ? Math.round(viewCount / subCount) : 0;
      const cadence = computeCadence(videos);
      const channelAgeLabel = `${Math.floor(ageYears)} años`;
      const descriptionQuality = snippet.description.length > 150 ? 'Alta' : 'Media';

      coverImage.src = banner;
      avatarImage.src = avatar;
      channelTitle.textContent = snippet.title;
      channelMeta.textContent = `${topics} • ${snippet.country || 'País no disponible'}`;
      channelDetails.innerHTML = `
        <span>Suscriptores <strong>${subCount ? formatNumber(subCount) : 'Oculto'}</strong></span>
        <span>Total vistas <strong>${formatNumber(viewCount)}</strong></span>
        <span>Videos <strong>${formatNumber(videoCount)}</strong></span>
        <span>Canal activo desde <strong>${publishedAt}</strong></span>
        <span>URL personalizada <strong>${snippet.customUrl ? 'youtube.com/' + snippet.customUrl : 'No disponible'}</strong></span>
        <span>Tags canal <strong>${tags.length ? tags.length : '0'}</strong></span>
      `;
      tagList.innerHTML = tags.length ? tags.map(tag => `<div class="tag">${tag}</div>`).join('') : '<div class="tag">Sin etiquetas de canal</div>';
      subsCount.textContent = subCount ? formatNumber(subCount) : 'Oculto';
      viewsCount.textContent = formatNumber(viewCount);
      videosCount.textContent = formatNumber(videoCount);
      avgViews.textContent = formatNumber(avgRecentViews);
      avgLikeRatio.textContent = `${formatPrecision(avgLikeRate)}%`;
      ratioViewsSubs.textContent = viewsPerSub ? `${formatNumber(viewsPerSub)} vistas/sub` : 'N/A';
      uploadFrequency.textContent = cadence ? `${formatPrecision(cadence)} días` : 'N/A';
      channelAge.textContent = channelAgeLabel;
      descriptionScore.textContent = descriptionQuality;
      nextUpload.textContent = cadence ? `${formatPrecision(cadence)} días` : 'N/A';

      const seo = analyzeSeo({ title: snippet.title, description: snippet.description, tags, branding });
      seoSummary.innerHTML = `<strong>SEO general</strong><p>${seo.summary}</p>`;
      descriptionAnalysis.innerHTML = `<strong>Recomendaciones SEO</strong><p>${seo.details}</p>`;

      videoTable.innerHTML = videos.slice(0, 10).map(video => `
        <tr>
          <td><img src="${video.thumbnail}" alt="Miniatura" /></td>
          <td>${video.title}</td>
          <td>${formatNumber(video.viewCount)}</td>
          <td>${formatNumber(video.likeCount)}</td>
          <td>${formatDate(video.publishedAt)}</td>
        </tr>
      `).join('');

      const recommendations = [];
      if (!tags.length) recommendations.push('Añade etiquetas de canal para mejorar el descubrimiento orgánico.');
      if (snippet.description.length < 150) recommendations.push('Amplía la descripción con palabras clave y enlaces a redes sociales.');
      if (avgLikeRate < 2) recommendations.push('Mejora miniaturas y títulos para subir la tasa de likes.');
      if (cadence && cadence > 10) recommendations.push('Publica con más regularidad, idealmente cada 7-10 días.');
      if (viewsPerSub < 50) recommendations.push('Promociona tus videos dentro y fuera de YouTube para aumentar vistas por suscriptor.');
      if (!branding.image?.bannerExternalUrl) recommendations.push('Actualiza la portada con diseño profesional y mensaje de valor.');
      if (!recommendations.length) recommendations.push('Buen canal. Mantén consistencia y mejora miniaturas para escalar más rápido.');
      recommendationList.innerHTML = recommendations.map(item => `<li>${item}</li>`).join('');

      quickSummary.innerHTML = `<strong>Resumen</strong><p>El canal tiene ${formatNumber(videoCount)} videos y ${subCount ? formatNumber(subCount) + ' suscriptores' : 'suscriptores ocultos'}. El promedio de vistas de los últimos videos es ${formatNumber(avgRecentViews)}.</p>`;
      thumbnailAssessment.innerHTML = `<strong>Miniaturas</strong><p>${videos.some(v => !v.thumbnail) ? 'Revisa las miniaturas; algunos videos no muestran una miniatura personalizada.' : 'Las miniaturas están disponibles. Mejora el contraste y la legibilidad del texto.'}</p>`;

      const labels = videos.map((_, index) => `#${index + 1}`);
      const viewValues = videos.map(v => v.viewCount);
      const likeValues = videos.map(v => v.likeCount);
      createChart(labels.reverse(), viewValues.reverse(), likeValues.reverse());

      setVisible(channelProfile, true);
      setVisible(healthCard, true);
      setVisible(performanceCard, true);
      setVisible(graphCard, true);
      setVisible(seoCard, true);
      setVisible(tableCard, true);
      setVisible(recommendationsCard, true);
    }
    function createChart(labels, views, likes) {
      const ctx = document.getElementById('viewsChart').getContext('2d');
      if (chartInstance) chartInstance.destroy();
      chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Views',
              data: views,
              backgroundColor: 'rgba(255,99,132,0.78)',
              borderColor: 'rgba(255,99,132,0.95)',
              borderWidth: 1,
              borderRadius: 16,
            },
            {
              label: 'Likes',
              type: 'line',
              data: likes,
              borderColor: 'rgba(79, 198, 255, 0.95)',
              backgroundColor: 'rgba(79, 198, 255, 0.22)',
              tension: 0.35,
              borderWidth: 2,
              pointRadius: 4,
              yAxisID: 'y1',
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: { legend: { labels: { color: '#e8f3ff' } } },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.08)' }, ticks: { color: '#d6e2f3' } },
            y: { grid: { color: 'rgba(255,255,255,0.08)' }, ticks: { color: '#d6e2f3' }, position: 'left' },
            y1: { grid: { display: false }, ticks: { color: '#d6e2f3' }, position: 'right' }
          }
        }
      });
    }
    analyzeBtn.addEventListener('click', async () => {
      clearError();
      const url = channelUrlInput.value.trim();
      if (!url) { showError('Ingresa un enlace de canal válido.'); return; }
      const parsed = parseYouTubeChannelLink(url);
      if (!parsed) { showError('No se pudo analizar la URL del canal. Usa un enlace completo de YouTube.'); return; }
      try {
        analyzeBtn.disabled = true;
        analyzeBtn.textContent = 'Cargando...';
        const response = await resolveChannelData(parsed);
        if (!response.items || !response.items.length) throw new Error('Canal no encontrado.');
        const channel = response.items[0];
        const uploadPlaylist = channel.contentDetails?.relatedPlaylists?.uploads;
        const videos = uploadPlaylist ? await fetchRecentVideoStats(uploadPlaylist) : [];
        showChannelData(channel, videos);
      } catch (error) {
        showError('Error al cargar el canal: ' + error.message);
        console.error(error);
      } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Ejecutar análisis';
      }
    });
  </script>
</body>
</html>
