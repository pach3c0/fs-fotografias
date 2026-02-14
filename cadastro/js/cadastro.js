/**
 * Cadastro - FS Fotografias SaaS
 * Logica do formulario de registro de novos fotografos
 */

// ============================================================================
// SLUG SANITIZATION + PREVIEW
// ============================================================================

const slugInput = document.getElementById('slug');
const slugPreview = document.getElementById('slugPreview');

slugInput.addEventListener('input', function () {
  let value = this.value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-');
  this.value = value;

  if (value && value.length >= 2) {
    slugPreview.textContent = value + '.fsfotografias.com.br';
    slugPreview.style.color = '#2563eb';
  } else {
    slugPreview.textContent = 'seu-estudio.fsfotografias.com.br';
    slugPreview.style.color = '#999';
  }
});

// ============================================================================
// FORM SUBMISSION
// ============================================================================

const form = document.getElementById('registerForm');
const submitBtn = document.getElementById('submitBtn');
const formError = document.getElementById('formError');
const successState = document.getElementById('successState');
const successSlug = document.getElementById('successSlug');

function showError(msg) {
  formError.textContent = msg;
  formError.style.display = 'block';
}

function hideError() {
  formError.style.display = 'none';
}

form.addEventListener('submit', async function (e) {
  e.preventDefault();
  hideError();

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const orgName = document.getElementById('orgName').value.trim();
  const slug = document.getElementById('slug').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  // Validacoes client-side
  if (!name || !email || !orgName || !slug || !password) {
    showError('Preencha todos os campos.');
    return;
  }

  if (slug.length < 3) {
    showError('A URL deve ter pelo menos 3 caracteres.');
    return;
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    showError('A URL deve conter apenas letras minusculas, numeros e hifens.');
    return;
  }

  if (password.length < 6) {
    showError('A senha deve ter pelo menos 6 caracteres.');
    return;
  }

  if (password !== confirmPassword) {
    showError('As senhas nao conferem.');
    return;
  }

  // Enviar
  submitBtn.disabled = true;
  submitBtn.textContent = 'Criando conta...';

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, orgName, slug })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      // Sucesso - mostrar tela de confirmacao
      form.style.display = 'none';
      form.nextElementSibling.style.display = 'none'; // form-footer
      successSlug.textContent = data.organizationSlug + '.fsfotografias.com.br';
      successState.style.display = 'block';
    } else {
      showError(data.error || 'Erro ao criar cadastro. Tente novamente.');
    }
  } catch (err) {
    showError('Erro de conexao. Verifique sua internet e tente novamente.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Criar Minha Conta';
  }
});

// ============================================================================
// FAQ ACCORDION
// ============================================================================

document.querySelectorAll('.faq-question').forEach(function (btn) {
  btn.addEventListener('click', function () {
    const answer = this.nextElementSibling;
    const isOpen = this.classList.contains('active');

    // Fechar todos
    document.querySelectorAll('.faq-question').forEach(function (b) {
      b.classList.remove('active');
      b.nextElementSibling.style.maxHeight = null;
    });

    // Abrir o clicado (se estava fechado)
    if (!isOpen) {
      this.classList.add('active');
      answer.style.maxHeight = answer.scrollHeight + 'px';
    }
  });
});

// ============================================================================
// SMOOTH SCROLL
// ============================================================================

document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    var target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
