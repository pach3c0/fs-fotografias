/**
 * Utilitários auxiliares para o painel admin
 */

/**
 * Resolve o caminho da imagem (URL do Cloudinary ou path local)
 */
export function resolveImagePath(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return url;
  return `/assets/${url}`;
}

/**
 * Formata data para exibição (DD/MM/AAAA)
 */
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Converte DD/MM/AAAA para ISO (YYYY-MM-DD)
 */
export function convertDateToISO(dateStr) {
  if (!dateStr || !dateStr.includes('/')) return new Date().toISOString().split('T')[0];
  const [day, month, year] = dateStr.split('/');
  return `${year}-${month}-${day}`;
}

/**
 * Cria um ID único
 */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Copia texto para clipboard
 */
export function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert('✅ Copiado!');
  }).catch(() => {
    alert('❌ Erro ao copiar');
  });
}

/**
 * Valida email
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Escapa HTML para segurança
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
