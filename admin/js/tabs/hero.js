/**
 * Tab: Hero / Capa
 */

import { appState, saveAppData } from '../state.js';
import { resolveImagePath } from '../utils/helpers.js';
import { uploadImage, showUploadProgress } from '../utils/upload.js';

export async function renderHero(container) {
  const hero = appState.appData.hero || {};

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem;">
      <h2 style="font-size:1.5rem; font-weight:bold; color:#f3f4f6;">Hero / Capa</h2>

      <!-- Texto -->
      <div style="border:1px solid #374151; border-radius:0.75rem; background:#1f2937; padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <h3 style="font-size:1rem; font-weight:600; color:#d1d5db;">Textos</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:500; color:#9ca3af; margin-bottom:0.25rem;">Titulo Principal</label>
            <input type="text" id="heroTitle" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6;"
              value="${hero.title || ''}" placeholder="Ex: CLIQUE·ZOOM">
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:500; color:#9ca3af; margin-bottom:0.25rem;">Subtitulo</label>
            <input type="text" id="heroSubtitle" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6;"
              value="${hero.subtitle || ''}" placeholder="Ex: Fotografia Profissional">
          </div>
        </div>
      </div>

      <!-- Imagem de Fundo -->
      <div style="border:1px solid #374151; border-radius:0.75rem; background:#1f2937; padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <h3 style="font-size:1rem; font-weight:600; color:#d1d5db;">Imagem de Fundo</h3>
        <div style="display:flex; gap:1rem; align-items:center;">
          <label style="background:#2563eb; color:white; padding:0.5rem 1rem; border-radius:0.375rem; font-size:0.875rem; font-weight:600; cursor:pointer;">
            Upload Imagem
            <input type="file" id="heroImage" accept="image/*" style="display:none;">
          </label>
          ${hero.image ? '<span style="font-size:0.875rem; color:#34d399;">Imagem configurada</span>' : '<span style="font-size:0.875rem; color:#9ca3af;">Nenhuma imagem</span>'}
        </div>
        <div id="heroUploadProgress"></div>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:1rem;">
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:600; color:#9ca3af; text-transform:uppercase; margin-bottom:0.25rem;">Zoom</label>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <input type="range" id="heroScale" min="0.5" max="2" step="0.05" value="${hero.imageScale ?? (hero.transform?.scale ?? 1)}" style="flex:1;">
              <span id="scaleValue" style="font-size:0.875rem; font-family:monospace; color:#f3f4f6; min-width:3rem; text-align:right;">${(hero.imageScale ?? (hero.transform?.scale ?? 1))}x</span>
            </div>
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:600; color:#9ca3af; text-transform:uppercase; margin-bottom:0.25rem;">Posicao X</label>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <input type="range" id="heroPosX" min="0" max="100" step="1" value="${hero.imagePosX ?? (hero.transform?.posX ?? 50)}" style="flex:1;">
              <span id="posXValue" style="font-size:0.875rem; font-family:monospace; color:#f3f4f6; min-width:3rem; text-align:right;">${hero.imagePosX ?? (hero.transform?.posX ?? 50)}%</span>
            </div>
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:600; color:#9ca3af; text-transform:uppercase; margin-bottom:0.25rem;">Posicao Y</label>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <input type="range" id="heroPosY" min="0" max="100" step="1" value="${hero.imagePosY ?? (hero.transform?.posY ?? 50)}" style="flex:1;">
              <span id="posYValue" style="font-size:0.875rem; font-family:monospace; color:#f3f4f6; min-width:3rem; text-align:right;">${hero.imagePosY ?? (hero.transform?.posY ?? 50)}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Transform do Titulo -->
      <div style="border:1px solid #374151; border-radius:0.75rem; background:#1f2937; padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <h3 style="font-size:1rem; font-weight:600; color:#d1d5db;">Posicao do Titulo</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:1rem;">
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:600; color:#9ca3af; text-transform:uppercase; margin-bottom:0.25rem;">Posicao X</label>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <input type="range" id="titlePosX" min="0" max="100" step="1" value="${hero.titlePosX ?? (hero.titleTransform?.posX ?? 50)}" style="flex:1;">
              <span id="titlePosXVal" style="font-size:0.875rem; font-family:monospace; color:#f3f4f6; min-width:3rem; text-align:right;">${hero.titlePosX ?? (hero.titleTransform?.posX ?? 50)}%</span>
            </div>
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:600; color:#9ca3af; text-transform:uppercase; margin-bottom:0.25rem;">Posicao Y</label>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <input type="range" id="titlePosY" min="0" max="100" step="1" value="${hero.titlePosY ?? (hero.titleTransform?.posY ?? 40)}" style="flex:1;">
              <span id="titlePosYVal" style="font-size:0.875rem; font-family:monospace; color:#f3f4f6; min-width:3rem; text-align:right;">${hero.titlePosY ?? (hero.titleTransform?.posY ?? 40)}%</span>
            </div>
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:600; color:#9ca3af; text-transform:uppercase; margin-bottom:0.25rem;">Tamanho da Fonte</label>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <input type="range" id="titleFontSize" min="24" max="80" step="1" value="${hero.titleFontSize ?? 48}" style="flex:1;">
              <span id="titleFSVal" style="font-size:0.875rem; font-family:monospace; color:#f3f4f6; min-width:3rem; text-align:right;">${hero.titleFontSize ?? 48}px</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Transform do Subtitulo -->
      <div style="border:1px solid #374151; border-radius:0.75rem; background:#1f2937; padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <h3 style="font-size:1rem; font-weight:600; color:#d1d5db;">Posicao do Subtitulo</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:1rem;">
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:600; color:#9ca3af; text-transform:uppercase; margin-bottom:0.25rem;">Posicao X</label>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <input type="range" id="subtitlePosX" min="0" max="100" step="1" value="${hero.subtitlePosX ?? (hero.subtitleTransform?.posX ?? 50)}" style="flex:1;">
              <span id="subtitlePosXVal" style="font-size:0.875rem; font-family:monospace; color:#f3f4f6; min-width:3rem; text-align:right;">${hero.subtitlePosX ?? (hero.subtitleTransform?.posX ?? 50)}%</span>
            </div>
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:600; color:#9ca3af; text-transform:uppercase; margin-bottom:0.25rem;">Posicao Y</label>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <input type="range" id="subtitlePosY" min="0" max="100" step="1" value="${hero.subtitlePosY ?? (hero.subtitleTransform?.posY ?? 55)}" style="flex:1;">
              <span id="subtitlePosYVal" style="font-size:0.875rem; font-family:monospace; color:#f3f4f6; min-width:3rem; text-align:right;">${hero.subtitlePosY ?? (hero.subtitleTransform?.posY ?? 55)}%</span>
            </div>
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:600; color:#9ca3af; text-transform:uppercase; margin-bottom:0.25rem;">Tamanho da Fonte</label>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <input type="range" id="subtitleFontSize" min="12" max="40" step="1" value="${hero.subtitleFontSize ?? 18}" style="flex:1;">
              <span id="subtitleFSVal" style="font-size:0.875rem; font-family:monospace; color:#f3f4f6; min-width:3rem; text-align:right;">${hero.subtitleFontSize ?? 18}px</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Overlay e Barras Cinema -->
      <div style="border:1px solid #374151; border-radius:0.75rem; background:#1f2937; padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <h3 style="font-size:1rem; font-weight:600; color:#d1d5db;">Efeitos</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:1rem;">
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:600; color:#9ca3af; text-transform:uppercase; margin-bottom:0.25rem;">Overlay (escurecimento)</label>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <input type="range" id="overlayOpacity" min="0" max="80" step="5" value="${hero.overlayOpacity ?? 30}" style="flex:1;">
              <span id="overlayVal" style="font-size:0.875rem; font-family:monospace; color:#f3f4f6; min-width:3rem; text-align:right;">${hero.overlayOpacity ?? 30}%</span>
            </div>
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:600; color:#9ca3af; text-transform:uppercase; margin-bottom:0.25rem;">Barra Superior</label>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <input type="range" id="topBarHeight" min="0" max="20" step="1" value="${hero.topBarHeight ?? 0}" style="flex:1;">
              <span id="topBarVal" style="font-size:0.875rem; font-family:monospace; color:#f3f4f6; min-width:3rem; text-align:right;">${hero.topBarHeight ?? 0}%</span>
            </div>
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:600; color:#9ca3af; text-transform:uppercase; margin-bottom:0.25rem;">Barra Inferior</label>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <input type="range" id="bottomBarHeight" min="0" max="20" step="1" value="${hero.bottomBarHeight ?? 0}" style="flex:1;">
              <span id="bottomBarVal" style="font-size:0.875rem; font-family:monospace; color:#f3f4f6; min-width:3rem; text-align:right;">${hero.bottomBarHeight ?? 0}%</span>
            </div>
          </div>
        </div>
      </div>

      <button id="saveHeroBtn" style="background:#2563eb; color:white; padding:0.5rem 1.5rem; border-radius:0.375rem; border:none; font-weight:600; cursor:pointer;">
        Salvar
      </button>

      <!-- Preview -->
      <div id="heroPreview" style="border:1px solid #374151; border-radius:0.75rem; height:20rem; background:#000; overflow:hidden; position:relative;">
        <p style="text-align:center; color:#9ca3af; padding-top:9rem;">Preview</p>
      </div>
    </div>
  `;

  // Refs
  const titleInput = container.querySelector('#heroTitle');
  const subtitleInput = container.querySelector('#heroSubtitle');
  const imageInput = container.querySelector('#heroImage');
  const scaleInput = container.querySelector('#heroScale');
  const posXInput = container.querySelector('#heroPosX');
  const posYInput = container.querySelector('#heroPosY');
  const titlePosXInput = container.querySelector('#titlePosX');
  const titlePosYInput = container.querySelector('#titlePosY');
  const titleFSInput = container.querySelector('#titleFontSize');
  const subtitlePosXInput = container.querySelector('#subtitlePosX');
  const subtitlePosYInput = container.querySelector('#subtitlePosY');
  const subtitleFSInput = container.querySelector('#subtitleFontSize');
  const overlayInput = container.querySelector('#overlayOpacity');
  const topBarInput = container.querySelector('#topBarHeight');
  const bottomBarInput = container.querySelector('#bottomBarHeight');

  // Bind sliders to display values
  const sliderBindings = [
    [scaleInput, container.querySelector('#scaleValue'), v => parseFloat(v).toFixed(2) + 'x'],
    [posXInput, container.querySelector('#posXValue'), v => v + '%'],
    [posYInput, container.querySelector('#posYValue'), v => v + '%'],
    [titlePosXInput, container.querySelector('#titlePosXVal'), v => v + '%'],
    [titlePosYInput, container.querySelector('#titlePosYVal'), v => v + '%'],
    [titleFSInput, container.querySelector('#titleFSVal'), v => v + 'px'],
    [subtitlePosXInput, container.querySelector('#subtitlePosXVal'), v => v + '%'],
    [subtitlePosYInput, container.querySelector('#subtitlePosYVal'), v => v + '%'],
    [subtitleFSInput, container.querySelector('#subtitleFSVal'), v => v + 'px'],
    [overlayInput, container.querySelector('#overlayVal'), v => v + '%'],
    [topBarInput, container.querySelector('#topBarVal'), v => v + '%'],
    [bottomBarInput, container.querySelector('#bottomBarVal'), v => v + '%'],
  ];

  sliderBindings.forEach(([input, display, format]) => {
    input.oninput = () => {
      display.textContent = format(input.value);
      updatePreview();
    };
  });

  titleInput.oninput = updatePreview;
  subtitleInput.oninput = updatePreview;

  // Upload
  imageInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const result = await uploadImage(file, appState.authToken, (percent) => {
        showUploadProgress('heroUploadProgress', percent);
      });
      hero.image = result.url;
      updatePreview();
      e.target.value = '';
    } catch (error) {
      alert('Erro no upload: ' + error.message);
    }
  };

  // Salvar
  container.querySelector('#saveHeroBtn').onclick = async () => {
    const newHero = {
      title: titleInput.value,
      subtitle: subtitleInput.value,
      image: hero.image || '',
      imageScale: parseFloat(scaleInput.value),
      imagePosX: parseInt(posXInput.value),
      imagePosY: parseInt(posYInput.value),
      titlePosX: parseInt(titlePosXInput.value),
      titlePosY: parseInt(titlePosYInput.value),
      titleFontSize: parseInt(titleFSInput.value),
      subtitlePosX: parseInt(subtitlePosXInput.value),
      subtitlePosY: parseInt(subtitlePosYInput.value),
      subtitleFontSize: parseInt(subtitleFSInput.value),
      overlayOpacity: parseInt(overlayInput.value),
      topBarHeight: parseInt(topBarInput.value),
      bottomBarHeight: parseInt(bottomBarInput.value)
    };
    await saveAppData('hero', newHero);
  };

  function updatePreview() {
    const preview = container.querySelector('#heroPreview');
    const image = hero.image || '';
    const scale = parseFloat(scaleInput.value);
    const px = parseInt(posXInput.value);
    const py = parseInt(posYInput.value);
    const tpx = parseInt(titlePosXInput.value);
    const tpy = parseInt(titlePosYInput.value);
    const tfs = parseInt(titleFSInput.value);
    const spx = parseInt(subtitlePosXInput.value);
    const spy = parseInt(subtitlePosYInput.value);
    const sfs = parseInt(subtitleFSInput.value);
    const overlay = parseInt(overlayInput.value);
    const topBar = parseInt(topBarInput.value);
    const bottomBar = parseInt(bottomBarInput.value);

    const imgHtml = image ? `<img src="${resolveImagePath(image)}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:${px}% ${py}%; transform:scale(${scale}); transform-origin:${px}% ${py}%;">` : '';

    preview.innerHTML = `
      ${imgHtml}
      <div style="position:absolute; inset:0; background:rgba(0,0,0,${overlay/100});"></div>
      <div style="position:absolute; top:0; left:0; right:0; height:${topBar}%; background:#000; z-index:2;"></div>
      <div style="position:absolute; bottom:0; left:0; right:0; height:${bottomBar}%; background:#000; z-index:2;"></div>
      <h1 style="position:absolute; left:${tpx}%; top:${tpy}%; transform:translate(-50%,-50%); color:white; font-family:'Playfair Display',serif; font-size:${Math.max(tfs * 0.5, 16)}px; font-weight:bold; text-align:center; text-shadow:2px 2px 4px rgba(0,0,0,0.7); z-index:3; white-space:nowrap;">${titleInput.value || ''}</h1>
      <p style="position:absolute; left:${spx}%; top:${spy}%; transform:translate(-50%,-50%); color:#e5e7eb; font-size:${Math.max(sfs * 0.5, 10)}px; text-align:center; text-shadow:1px 1px 2px rgba(0,0,0,0.7); z-index:3; white-space:nowrap;">${subtitleInput.value || ''}</p>
    `;
  }

  updatePreview();
}
