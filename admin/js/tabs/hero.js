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
              value="${hero.title || ''}" placeholder="Ex: FS FOTOGRAFIAS">
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
              <input type="range" id="heroScale" min="0.5" max="2" step="0.05" value="${hero.imageScale ?? 1}" style="flex:1;">
              <span id="scaleValue" style="font-size:0.875rem; font-family:monospace; color:#f3f4f6; min-width:3rem; text-align:right;">${(hero.imageScale ?? 1)}x</span>
            </div>
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:600; color:#9ca3af; text-transform:uppercase; margin-bottom:0.25rem;">Posicao X</label>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <input type="range" id="heroPosX" min="0" max="100" step="1" value="${hero.imagePosX ?? 50}" style="flex:1;">
              <span id="posXValue" style="font-size:0.875rem; font-family:monospace; color:#f3f4f6; min-width:3rem; text-align:right;">${hero.imagePosX ?? 50}%</span>
            </div>
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:600; color:#9ca3af; text-transform:uppercase; margin-bottom:0.25rem;">Posicao Y</label>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <input type="range" id="heroPosY" min="0" max="100" step="1" value="${hero.imagePosY ?? 50}" style="flex:1;">
              <span id="posYValue" style="font-size:0.875rem; font-family:monospace; color:#f3f4f6; min-width:3rem; text-align:right;">${hero.imagePosY ?? 50}%</span>
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
              <input type="range" id="titlePosX" min="0" max="100" step="1" value="${hero.titlePosX ?? 50}" style="flex:1;">
              <span id="titlePosXVal" style="font-size:0.875rem; font-family:monospace; color:#f3f4f6; min-width:3rem; text-align:right;">${hero.titlePosX ?? 50}%</span>
            </div>
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:600; color:#9ca3af; text-transform:uppercase; margin-bottom:0.25rem;">Posicao Y</label>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <input type="range" id="titlePosY" min="0" max="100" step="1" value="${hero.titlePosY ?? 40}" style="flex:1;">
              <span id="titlePosYVal" style="font-size:0.875rem; font-family:monospace; color:#f3f4f6; min-width:3rem; text-align:right;">${hero.titlePosY ?? 40}%</span>
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
              <input type="range" id="subtitlePosX" min="0" max="100" step="1" value="${hero.subtitlePosX ?? 50}" style="flex:1;">
              <span id="subtitlePosXVal" style="font-size:0.875rem; font-family:monospace; color:#f3f4f6; min-width:3rem; text-align:right;">${hero.subtitlePosX ?? 50}%</span>
            </div>
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:600; color:#9ca3af; text-transform:uppercase; margin-bottom:0.25rem;">Posicao Y</label>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <input type="range" id="subtitlePosY" min="0" max="100" step="1" value="${hero.subtitlePosY ?? 55}" style="flex:1;">
              <span id="subtitlePosYVal" style="font-size:0.875rem; font-family:monospace; color:#f3f4f6; min-width:3rem; text-align:right;">${hero.subtitlePosY ?? 55}%</span>
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
      <div id="heroPreview" style="border:1px solid #374151; border-radius:0.75rem; width:100%; background:#000; overflow:hidden; position:relative; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); container-type: inline-size; transition: aspect-ratio 0.2s ease; box-sizing: border-box;">
        <p style="text-align:center; color:#9ca3af; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);">Carregando Preview...</p>
      </div>
    </div>
  `;

  // Refs
  const previewContainer = container.querySelector('#heroPreview');

  // Sincroniza o aspecto do preview com a proporção real da tela (sua sugestão)
  const syncAspectRatio = () => {
    const ratio = window.innerWidth / window.innerHeight;
    previewContainer.style.aspectRatio = ratio.toFixed(4);
  };
  syncAspectRatio();
  window.addEventListener('resize', syncAspectRatio);

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

    const scalePct = scale * 100;

    // Para um espelho perfeito, convertemos os limites de PX do site para unidades relativas ao container (CQW)
    // Baseado na largura atual da janela para manter a proporção exata do que você vê no site público
    const windowW = window.innerWidth;
    const titleMaxW = (800 / windowW) * 100;
    const subMaxW = (600 / windowW) * 100;
    const titleFontSizeCqw = (tfs / windowW) * 100;
    const subFontSizeCqw = (sfs / windowW) * 100;
    const titleMinCqw = (28 / windowW) * 100;
    const subMinCqw = (14 / windowW) * 100;

    const imgHtml = image ? `<div style="position:absolute; inset:0; background-image:url('${resolveImagePath(image)}'); background-repeat:no-repeat; background-size:max(${scalePct}%, 100%) max(${scalePct}%, 100%); background-position:${px}% ${py}%;"></div>` : '';

    preview.innerHTML = `
      ${imgHtml}
      <div style="position:absolute; inset:0; background:rgba(0,0,0,${overlay/100});"></div>
      <div style="position:absolute; top:0; left:0; right:0; height:${topBar}%; background:#000; z-index:2;"></div>
      <div style="position:absolute; bottom:0; left:0; right:0; height:${bottomBar}%; background:#000; z-index:2;"></div>
      <h1 style="position:absolute; left:${tpx}%; top:${tpy}%; transform:translate(-50%,-50%); color:white; font-family:'Playfair Display',serif; font-size:clamp(${titleMinCqw}cqw, 6cqw, ${titleFontSizeCqw}cqw); font-weight:bold; text-align:center; text-shadow:2px 2px 4px rgba(0,0,0,0.7); z-index:3; line-height:1.15; width:90%; max-width:${titleMaxW}cqw; white-space:normal; pointer-events:none;">${titleInput.value || ''}</h1>
      <p style="position:absolute; left:${spx}%; top:${spy}%; transform:translate(-50%,-50%); color:#e5e7eb; font-size:clamp(${subMinCqw}cqw, 3.5cqw, ${subFontSizeCqw}cqw); text-align:center; text-shadow:1px 1px 2px rgba(0,0,0,0.7); z-index:3; line-height:1.6; width:80%; max-width:${subMaxW}cqw; white-space:normal; pointer-events:none;">${subtitleInput.value || ''}</p>
    `;
  }

  updatePreview();
}
