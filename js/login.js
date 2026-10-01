(function(){const API=window.LGT_API,$=s=>document.querySelector(s);
if(API.demo)$('#demoBanner').hidden=false;
API.currentUser().then(u=>{if(u)location.replace('dashboard.html')});
$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();const b=$('#loginBtn'),r=$('#loginError');r.textContent='';b.disabled=true;b.textContent='Signing in…';
try{await API.login($('#email').value.trim(),$('#password').value);location.replace('dashboard.html')}
catch(x){r.textContent=x.message||'Sign in failed. Check your email and password.';b.disabled=false;b.textContent='Sign in'}});})();