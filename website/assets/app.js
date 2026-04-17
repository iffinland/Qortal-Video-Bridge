const DATA_ROOT = './data';

const fetchJson = async (path) => {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }

  return response.json();
};

const fetchText = async (path) => {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }

  return response.text();
};

const query = (selector) => document.querySelector(selector);
const createDetailPath = (videoId) => `./video.html?id=${encodeURIComponent(videoId)}`;

const escapeHtml = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const createVideoMarkup = (video, { controls = true, autoplay = false } = {}) => {
  if (!video?.qdnPath) {
    return `
      <div class="video-placeholder">
        <div>
          <strong>Video path not configured yet.</strong>
          <p>Edit <code>website/data/videos.json</code> and set <code>qdnPath</code>.</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="video-frame">
      <video
        src="${escapeHtml(video.qdnPath)}"
        ${controls ? 'controls' : ''}
        ${autoplay ? 'autoplay muted playsinline' : 'preload="metadata"'}
        poster="${escapeHtml(video.thumbnailUrl || '')}"
      ></video>
    </div>
  `;
};

const renderMetaChips = (video) => {
  const chips = [
    video.publisher ? `<span class="meta-chip">${escapeHtml(video.publisher)}</span>` : '',
    video.duration ? `<span class="meta-chip">${escapeHtml(video.duration)}</span>` : '',
    video.visibility ? `<span class="meta-chip">${escapeHtml(video.visibility)}</span>` : '',
  ].filter(Boolean);

  return chips.length ? `<div class="meta-row">${chips.join('')}</div>` : '';
};

const renderHome = async () => {
  const [posts, videos] = await Promise.all([
    fetchJson(`${DATA_ROOT}/posts.json`),
    fetchJson(`${DATA_ROOT}/videos.json`),
  ]);

  const videosById = new Map(videos.map((video) => [video.id, video]));
  const container = query('#featured-posts');

  if (!container) {
    return;
  }

  const postsWithContent = await Promise.all(
    posts.map(async (post) => ({
      ...post,
      contentHtml: post.contentPath ? await fetchText(post.contentPath) : '',
    }))
  );

  container.innerHTML = postsWithContent
    .map((post) => {
      const video = videosById.get(post.videoId);
      const detailPath = createDetailPath(post.videoId);

      return `
        <article class="post-card">
          <div class="post-inner">
            <div class="post-copy">
              <p class="eyebrow">${escapeHtml(post.tagline)}</p>
              <h3>${escapeHtml(post.title)}</h3>
              ${post.contentHtml}
              <div class="meta-row">
                <a class="button button-primary" href="${detailPath}">
                  Open Detail View
                </a>
                <a class="button button-secondary" href="${detailPath}">
                  Share Link
                </a>
                <a class="button button-secondary" href="./gallery.html">
                  Browse Gallery
                </a>
              </div>
            </div>
            <div class="post-media">
              ${createVideoMarkup(video)}
            </div>
          </div>
        </article>
      `;
    })
    .join('');
};

const renderGallery = async () => {
  const videos = await fetchJson(`${DATA_ROOT}/videos.json`);
  const container = query('#gallery-grid');

  if (!container) {
    return;
  }

  container.innerHTML = videos
    .map(
      (video) => {
        const detailPath = createDetailPath(video.id);

        return `
        <article class="gallery-card">
          ${createVideoMarkup(video, { controls: true })}
          <div class="card-copy">
            <div>
              <p class="eyebrow">${escapeHtml(video.category || 'Video')}</p>
              <h3>${escapeHtml(video.title)}</h3>
            </div>
            <p>${escapeHtml(video.excerpt || '')}</p>
            ${renderMetaChips(video)}
            <div class="meta-row">
              <a class="button button-primary" href="${detailPath}">
                View Details
              </a>
              <a class="button button-secondary" href="${detailPath}">
                Share Link
              </a>
            </div>
          </div>
        </article>
      `;
      }
    )
    .join('');
};

const renderVideoDetail = async () => {
  const videos = await fetchJson(`${DATA_ROOT}/videos.json`);
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const video = videos.find((entry) => entry.id === id);
  const container = query('#video-detail');

  if (!container) {
    return;
  }

  if (!video) {
    container.innerHTML = `
      <section class="empty-state">
        <h1>Video not found</h1>
        <p>Check the URL parameter or update <code>website/data/videos.json</code>.</p>
      </section>
    `;
    return;
  }

  const embedCode = `<figure class="q-video-embed">
  <figcaption style="font-family: Arial, sans-serif; font-size: 18px; color: #2c3e50; font-weight: bold; margin-bottom: 10px;">${escapeHtml(video.title)}</figcaption>
  <video controls preload="metadata" src="${escapeHtml(video.qdnPath)}"${video.thumbnailUrl ? ` poster="${escapeHtml(video.thumbnailUrl)}"` : ''} style="width: 100%; max-width: 960px; border-radius: 12px; background: #000;"></video>
  ${video.description || video.excerpt ? `<p style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #4b5563; margin: 10px 0 0;">${escapeHtml(video.description || video.excerpt || '')}</p>` : ''}
</figure>`;
  const detailPath = createDetailPath(video.id);

  container.innerHTML = `
    <article class="detail-card">
      <div class="detail-player">
        ${createVideoMarkup(video)}
      </div>
    </article>
    <aside class="detail-card">
      <div class="detail-copy">
        <div>
          <p class="eyebrow">${escapeHtml(video.category || 'Video')}</p>
          <h1>${escapeHtml(video.title)}</h1>
        </div>
        <p>${escapeHtml(video.description || video.excerpt || '')}</p>
        ${renderMetaChips(video)}
        <div class="embed-box">
          <h3>Embed snippet</h3>
          <pre>${escapeHtml(embedCode)}</pre>
        </div>
        <div class="embed-actions">
          <a class="button button-primary" href="${detailPath}">Share Link</a>
          <a class="button button-secondary" href="./gallery.html">Back to Gallery</a>
          <a class="button button-secondary" href="./index.html">Back to Home</a>
        </div>
      </div>
    </aside>
  `;
};

const init = async () => {
  const page = document.body.dataset.page;

  try {
    if (page === 'home') {
      await renderHome();
      return;
    }

    if (page === 'gallery') {
      await renderGallery();
      return;
    }

    if (page === 'video') {
      await renderVideoDetail();
    }
  } catch (error) {
    const target = query('#featured-posts') || query('#gallery-grid') || query('#video-detail');

    if (target) {
      target.innerHTML = `
        <section class="empty-state">
          <h2>Could not load website data</h2>
          <p>${escapeHtml(error instanceof Error ? error.message : 'Unknown error')}</p>
        </section>
      `;
    }
  }
};

void init();
