document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passInput = document.getElementById('password');
  const remember = document.getElementById('remember');
  const submitBtn = document.getElementById('submit');
  const msg = document.getElementById('message');
  const emailErr = document.getElementById('email-error');
  const passErr = document.getElementById('password-error');
  const signupForm = document.getElementById('signup-form');
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const signupBtn = document.getElementById('signup');
  const fullname = document.getElementById('fullname');
  const signupEmail = document.getElementById('signup-email');
  const signupPass = document.getElementById('signup-pass');

  // demo credentials (replace with real auth in production)
  const DEMO_EMAIL = 'user@example.com';
  const DEMO_PASS = 'password123';

  // restore remembered email
  try { const saved = localStorage.getItem('savedEmail'); if (saved) { emailInput.value = saved; remember.checked = true; } } catch (e) {}

  function setMessage(text, ok) { msg.textContent = text; msg.style.color = ok ? '#6C8A3D' : '#EF4444'; }
  function clearErrors() { emailErr.textContent = ''; passErr.textContent = ''; setMessage('', true); }

  function validate() {
    clearErrors();
    let valid = true;
    const email = emailInput.value.trim();
    const pass = passInput.value;
    if (!email) { emailErr.textContent = 'Email is required'; valid = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { emailErr.textContent = 'Enter a valid email'; valid = false; }
    if (!pass) { passErr.textContent = 'Password is required'; valid = false; }
    else if (pass.length < 6) { passErr.textContent = 'Use at least 6 characters'; valid = false; }
    return valid;
  }

  // Toggle between login and signup
  function showLogin() {
    form.classList.remove('form-hidden');
    signupForm.classList.add('form-hidden');
    tabLogin.classList.add('active'); tabLogin.setAttribute('aria-selected','true');
    tabSignup.classList.remove('active'); tabSignup.setAttribute('aria-selected','false');
  }
  function showSignup(){
    form.classList.add('form-hidden');
    signupForm.classList.remove('form-hidden');
    tabSignup.classList.add('active'); tabSignup.setAttribute('aria-selected','true');
    tabLogin.classList.remove('active'); tabLogin.setAttribute('aria-selected','false');
  }
  tabLogin.addEventListener('click', showLogin);
  tabSignup.addEventListener('click', showSignup);

  // helper: get users from localStorage
  function getUsers(){ try{ return JSON.parse(localStorage.getItem('sb_users')||'[]') }catch(e){ return [] } }
  function saveUser(u){ const arr=getUsers(); arr.push(u); localStorage.setItem('sb_users',JSON.stringify(arr)); }

  // login submit
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) return;
    submitBtn.disabled = true;
    setMessage('Signing in...', true);

    setTimeout(function () {
      const email = emailInput.value.trim();
      const pass = passInput.value;
      // check demo or stored users
      const users = getUsers();
      const found = users.find(x=>x.email===email && x.password===pass);
      if (email === DEMO_EMAIL && pass === DEMO_PASS) {
        authSuccess(email);
      } else if (found) {
        authSuccess(email);
      } else {
        setMessage('Invalid email or password', false);
        submitBtn.disabled = false;
      }
    }, 600);
  });

  function authSuccess(email){
    setMessage('Signed in successfully — redirecting...', true);
    if (remember.checked) { try { localStorage.setItem('savedEmail', email); } catch (e) {} }
    else { try { localStorage.removeItem('savedEmail'); } catch (e) {} }
    setTimeout(function () { location.href = 'role.html'; }, 800);
  }

  // signup handling (basic localStorage stub)
  signupBtn.addEventListener('click', function(){
    const name = (fullname && fullname.value || '').trim();
    const email = (signupEmail && signupEmail.value || '').trim();
    const pass = (signupPass && signupPass.value || '');
    if (!name){ alert('Enter full name'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ alert('Enter a valid email'); return }
    if (pass.length < 6){ alert('Choose a password with at least 6 characters'); return }
    // save
    saveUser({name:name,email:email,password:pass});
    alert('Account created (demo). You can now login.');
    // switch to login
    showLogin();
    emailInput.value = email;
  });

  
});
