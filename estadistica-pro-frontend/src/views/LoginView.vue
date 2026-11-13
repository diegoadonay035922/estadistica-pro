
<script setup>
import { useUsuarioStore } from '@/stores/usuario'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'

const router = useRouter()
const usuarioStore = useUsuarioStore()

const correo = ref('')
const contrasenha = ref('')
const error = ref('')
const cargando = ref(false)

const iniciarSesion = async () => {
  error.value = ''
  cargando.value = true

  try {
    const response = await api.post('/login', {
      correo_usuario: correo.value,
      contrasenha: contrasenha.value
    })

    usuarioStore.guardarUsuario(response.data.data)
    router.replace('/conjuntos')
  } catch (err) {
    console.error('Error de login:', err)

    error.value = err.response?.status === 401
      ? 'El correo o la contraseña no son correctos.'
      : 'No pudimos iniciar sesión. Inténtalo de nuevo.'
  } finally {
    cargando.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <!-- Panel izquierdo -->
    <section class="login-intro">
      <div class="brand-lockup">
        <h1 class="brand-name brand-name-large">
          Estadística<span class="brand-light">Pro</span>
        </h1>
      </div>

      <!-- Texto centrado verticalmente -->
      <div class="intro-copy">
        <h2>
          Convierte tus datos en
          <em>decisiones.</em>
        </h2>

        <p>
          Organiza tus conjuntos de datos y encuentra
          claridad en cada variable.
        </p>
      </div>

      <!-- Barras estadísticas integradas en el fondo -->
      <div class="background-bars" aria-hidden="true">
        <i></i><i></i><i></i><i></i><i></i>
        <i></i><i></i><i></i><i></i><i></i>
        <i></i><i></i><i></i><i></i><i></i>
        <i></i><i></i><i></i><i></i><i></i>
      </div>
    </section>

    <!-- Panel derecho -->
    <section class="login-panel">
      <div class="mobile-brand brand-lockup">
        <span class="brand-name">
          Estadística<span class="brand-light">Pro</span>
        </span>
      </div>

      <div class="login-content">
        <div class="login-heading">
          <h2>Inicia sesión</h2>
          <p>Ingresa tus datos para acceder a tu espacio.</p>
        </div>

        <form
          class="login-form"
          @submit.prevent="iniciarSesion"
        >
          <div class="form-group">
            <label for="correo">Correo electrónico</label>

            <input
              id="correo"
              v-model.trim="correo"
              type="email"
              autocomplete="username"
              required
            />
          </div>

          <div class="form-group">
            <label for="contrasenha">Contraseña</label>

            <input
              id="contrasenha"
              v-model="contrasenha"
              type="password"
              autocomplete="current-password"
              required
            />
          </div>

          <p
            v-if="error"
            class="error-message"
            role="alert"
          >
            <span aria-hidden="true">!</span>
            {{ error }}
          </p>

          <button type="submit" :disabled="cargando">
            <span>
              {{
                cargando
                  ? 'Validando acceso…'
                  : 'Iniciar sesión'
              }}
            </span>

            <span class="button-arrow" aria-hidden="true">
              {{ cargando ? '···' : '→' }}
            </span>
          </button>
        </form>

      </div>

      <footer class="login-footer">
        <span>© 2026 Estadística Pro</span>
        <span class="footer-dot">·</span>
        <span>Herramientas para trabajar mejor con datos</span>
      </footer>
    </section>
  </main>
</template>

<style>
:root {
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system,
    BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

* {
  box-sizing: border-box;
}

html,
body,
#app {
  width: 100%;
  min-width: 320px;
  min-height: 100%;
  margin: 0;
}

body {
  min-height: 100vh;
}

button,
input {
  font: inherit;
}

.login-page {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(420px, 0.95fr);
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: #fff;
  color: #17253b;
}

/* =========================
   PANEL IZQUIERDO
========================= */

.login-intro {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 100vh;
  min-height: 100dvh;
  padding: clamp(32px, 5vw, 76px)
           clamp(32px, 6vw, 100px);
  overflow: hidden;
  color: #fff;

  background:
    radial-gradient(
      ellipse at 76% 19%,
      rgba(25, 202, 180, 0.22),
      transparent 34%
    ),
    linear-gradient(
      145deg,
      #101f38 0%,
      #172d4c 58%,
      #153b50 100%
    );
}

.brand-lockup {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.brand-name {
  margin: 0;
  color: #fff;
  font-size: 17px;
  font-weight: 780;
  letter-spacing: -0.6px;
}

.brand-light {
  color: #71e1cf;
}

.brand-mark {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  width: 34px;
  height: 34px;
  padding: 7px;
  border: 1px solid rgba(127, 231, 215, 0.35);
  border-radius: 10px;
  background: rgba(67, 198, 183, 0.12);
}

.brand-mark span {
  flex: 1;
  border-radius: 2px 2px 1px 1px;
  background: #70dfce;
}

.brand-mark span:nth-child(1) {
  height: 35%;
  opacity: 0.65;
}

.brand-mark span:nth-child(2) {
  height: 58%;
  opacity: 0.8;
}

.brand-mark span:nth-child(3) {
  height: 80%;
}

.brand-mark span:nth-child(4) {
  height: 100%;
  opacity: 0.8;
}

/* Texto principal:
   ocupa el centro vertical real del panel */

.intro-copy {
  position: absolute;
  z-index: 2;
  top: 50%;
  left: clamp(32px, 6vw, 100px);
  right: clamp(32px, 6vw, 100px);
  width: auto;
  max-width: 610px;
  margin: 0;
  transform: translateY(-50%);
}

.intro-copy h2 {
  max-width: 610px;
  margin: 0 0 24px;
  font-size: clamp(42px, 4.4vw, 70px);
  font-weight: 720;
  letter-spacing: -3.6px;
  line-height: 1.07;
}

.intro-copy h2 em {
  display: inline;
  color: #74dfcf;
  font-style: normal;
}

.intro-copy p {
  max-width: 410px;
  margin: 0;
  color: #c1cddd;
  font-size: 16px;
  line-height: 1.85;
}

/* =========================
   BARRAS ESTADÍSTICAS
   EN EL FONDO
========================= */

.background-bars {
  position: absolute;
  z-index: 0;
  right: 0;
  bottom: 0;

  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  gap: clamp(4px, 0.55vw, 9px);

  width: 100%;
  height: 25%;
  overflow: hidden;
  opacity: 0.34;
  pointer-events: none;

  -webkit-mask-image: linear-gradient(
    to top,
    #000 0%,
    rgba(0, 0, 0, 0.9) 45%,
    transparent 100%
  );

  mask-image: linear-gradient(
    to top,
    #000 0%,
    rgba(0, 0, 0, 0.9) 45%,
    transparent 100%
  );
}

.background-bars i {
  display: block;
  flex: 1 1 0;
  min-width: 0;
  max-width: 85px;
  border-radius: 7px 7px 0 0;

  background: linear-gradient(
    to top,
    rgba(28, 177, 177, 0.18),
    rgba(67, 220, 202, 0.9)
  );

  box-shadow:
    inset 0 1px 0 rgba(133, 255, 232, 0.22);
}

/* Alturas variadas para conservar el estilo estadístico */

.background-bars i:nth-child(10n + 1) {
  height: 17%;
}

.background-bars i:nth-child(10n + 2) {
  height: 25%;
}

.background-bars i:nth-child(10n + 3) {
  height: 36%;
}

.background-bars i:nth-child(10n + 4) {
  height: 21%;
}

.background-bars i:nth-child(10n + 5) {
  height: 46%;
}

.background-bars i:nth-child(10n + 6) {
  height: 32%;
}

.background-bars i:nth-child(10n + 7) {
  height: 63%;
}

.background-bars i:nth-child(10n + 8) {
  height: 42%;
}

.background-bars i:nth-child(10n + 9) {
  height: 77%;
}

.background-bars i:nth-child(10n) {
  height: 96%;
}

/* =========================
   PANEL DERECHO
========================= */

.login-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 40px clamp(30px, 6vw, 100px) 24px;
  background: #fff;
}

.login-content {
  width: 100%;
  max-width: 400px;
  margin: auto;
}

.login-heading {
  margin-bottom: 36px;
}

.login-heading h2 {
  margin: 0 0 9px;
  color: #17253b;
  font-size: clamp(30px, 2.5vw, 38px);
  font-weight: 750;
  letter-spacing: -1.5px;
  line-height: 1.2;
}

.login-heading p {
  margin: 0;
  color: #738197;
  font-size: 14px;
  line-height: 1.75;
}

/* Formulario */

.login-form {
  display: flex;
  flex-direction: column;
  gap: 23px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-group label {
  color: #344258;
  font-size: 13px;
  font-weight: 700;
}

.form-group input {
  display: block;
  width: 100%;
  min-width: 0;
  padding: 15px 16px;
  border: 1px solid #dce3eb;
  border-radius: 9px;
  outline: none;
  background: #fbfcfe;
  color: #1b2a40;
  font-size: 14px;

  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.form-group input::placeholder {
  color: #a1adbc;
}

.form-group input:hover {
  border-color: #b9c9d5;
}

.form-group input:focus {
  border-color: #21aaa0;
  background: #fff;
  box-shadow: 0 0 0 4px rgba(33, 170, 160, 0.11);
}

/* Botón de acceso */

.login-form button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  min-height: 50px;
  margin-top: 3px;
  padding: 14px 17px;
  border: 1px solid #147f82;
  border-radius: 9px;
  background: #147f82;
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  box-shadow: 0 8px 18px rgba(19, 127, 131, 0.17);

  transition:
    background-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.login-form button:hover:not(:disabled) {
  transform: translateY(-1px);
  background: #106d74;
  box-shadow: 0 10px 22px rgba(19, 127, 131, 0.22);
}

.login-form button:focus-visible {
  outline: 3px solid rgba(33, 170, 160, 0.35);
  outline-offset: 3px;
}

.login-form button:disabled {
  opacity: 0.7;
  cursor: wait;
  box-shadow: none;
}

.button-arrow {
  font-size: 21px;
  font-weight: 400;
}

/* Errores */

.error-message {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin: -4px 0 0;
  padding: 12px 14px;
  border: 1px solid #f4d2d0;
  border-radius: 9px;
  background: #fff6f5;
  color: #b33e38;
  font-size: 13px;
  line-height: 1.6;
}

.error-message span {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 17px;
  margin-top: 1px;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 800;
}

/* Nota de seguridad */

.security-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 26px 0 0;
  color: #8390a1;
  font-size: 11px;
  line-height: 1.7;
}

.security-note svg {
  flex-shrink: 0;
  color: #15958f;
}

/* Marca móvil y pie de página */

.mobile-brand {
  display: none;
}

.login-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 5px;
  width: 100%;
  margin-top: 32px;
  color: #9aa5b3;
  font-size: 10px;
  line-height: 1.8;
  text-align: center;
}

.footer-dot {
  padding: 0 3px;
  color: #30a89f;
}

/* =========================
   TABLETAS
========================= */

@media (max-width: 1000px) {
  .login-page {
    grid-template-columns: minmax(0, 1fr) minmax(350px, 0.95fr);
  }

  .login-intro {
    padding-right: 7%;
    padding-left: 7%;
  }

  .intro-copy {
    left: 7%;
    right: 7%;
  }

  .intro-copy h2 {
    font-size: clamp(40px, 5vw, 54px);
    letter-spacing: -2.5px;
  }

  .login-panel {
    padding-right: 35px;
    padding-left: 35px;
  }

  .background-bars {
    width: 100%;
    gap: 8px;
  }
}

/* =========================
   MÓVILES
========================= */

@media (max-width: 700px) {
  .login-page {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    min-height: 100dvh;
    overflow: visible;
  }

  .login-intro {
    display: none;
  }

  .login-panel {
    align-items: stretch;
    justify-content: flex-start;
    flex: 1;
    width: 100%;
    min-height: 100vh;
    min-height: 100dvh;
    padding: 28px 24px 20px;
  }

  .mobile-brand {
    display: flex;
    align-self: flex-start;
    margin-bottom: 20px;
  }

  .mobile-brand .brand-name {
    color: #17253b;
  }

  .mobile-brand .brand-light {
    color: #138e8b;
  }

  .mobile-brand .brand-mark {
    border-color: #d4efeb;
    background: #eef9f7;
  }

  .login-content {
    max-width: 440px;
    margin: auto;
    padding: 38px 0;
  }

  .login-heading {
    margin-bottom: 30px;
  }

  .login-heading h2 {
    font-size: 32px;
  }

  .login-form {
    gap: 20px;
  }

  .login-footer {
    margin-top: auto;
    padding-top: 20px;
  }
}

/* Móviles pequeños */

@media (max-width: 380px) {
  .login-panel {
    padding-right: 19px;
    padding-left: 19px;
  }

  .login-heading h2 {
    font-size: 29px;
  }

  .form-group input {
    padding: 13px 12px;
  }
}

/* Pantallas de escritorio con poca altura */

@media (max-height: 650px) and (min-width: 701px) {
  .login-page {
    min-height: 650px;
  }

  .login-intro,
  .login-panel {
    min-height: 650px;
  }

  .login-panel {
    padding-top: 24px;
    padding-bottom: 20px;
  }

  .login-footer {
    margin-top: 20px;
  }
}

/* Marca principal: mismo tamaño que el título central */

.brand-name-large {
  font-size: clamp(42px, 4.4vw, 70px);
  font-weight: 720;
  letter-spacing: -3.6px;
  line-height: 1.07;
}

.brand-name-large .brand-light {
  color: #71e1cf;
}

/* Marca en móvil */

.mobile-brand .brand-name {
  color: #17253b;
  font-size: 26px;
  letter-spacing: -1px;
}

.mobile-brand .brand-light {
  color: #138e8b;
}
</style>
