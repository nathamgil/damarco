/* DAMARCO — vitrine: serviços, materiais, guia "qual material", antes/depois, atalhos */
(function () {
  'use strict';
  var CFG = window.DM;
  function $(s, r) { return (r || document).querySelector(s); }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  var MAT = {}; CFG.materiais.forEach(function (m) { MAT[m.id] = m; });

  // WhatsApp e área
  var msgWa = 'Olá, DAMARCO! Vim pelo site e quero um orçamento.';
  document.querySelectorAll('[data-wa]').forEach(function (a) {
    a.href = 'https://wa.me/' + CFG.whatsapp + '?text=' + encodeURIComponent(msgWa);
  });
  document.querySelectorAll('[data-wa-num]').forEach(function (s) { s.textContent = CFG.whatsappVisivel; });
  document.querySelectorAll('[data-area]').forEach(function (s) { s.textContent = CFG.area; });

  // serviços
  var gradeS = $('#servicos-grade');
  CFG.servicos.forEach(function (s, i) {
    var c = el('article', 'servico');
    c.appendChild(el('div', 'servico-ico', String(i + 1).padStart(2, '0')));
    c.appendChild(el('h3', null, s.nome));
    c.appendChild(el('p', 'quando', 'Quando usar'));
    c.appendChild(el('p', null, s.quando));
    gradeS.appendChild(c);
  });

  // materiais
  var gradeM = $('#materiais-grade');
  CFG.materiais.forEach(function (m) {
    var c = el('article', 'material');
    c.appendChild(el('h3', null, m.nome));
    c.appendChild(el('p', null, m.uso));
    c.appendChild(el('p', 'por', 'Por carrada · sob orçamento'));
    gradeM.appendChild(c);
  });

  // guia "Qual material eu preciso?"
  var opcoes = $('#guia-opcoes'), res = $('#guia-resultado');
  var todas = CFG.guia.concat([{ id: 'naosei', rotulo: 'Outra coisa / não sei', materiais: [], nota: 'Manda o que você vai fazer que a gente te diz qual material atende.' }]);
  todas.forEach(function (g) {
    var b = el('button', 'guia-op', g.rotulo);
    b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false');
    b.addEventListener('click', function () {
      opcoes.querySelectorAll('.guia-op').forEach(function (x) { x.setAttribute('aria-checked', 'false'); });
      b.setAttribute('aria-checked', 'true');
      mostra(g);
    });
    opcoes.appendChild(b);
  });
  function mostra(g) {
    res.innerHTML = '';
    if (g.materiais.length) {
      res.appendChild(el('p', null, 'Para isso, você precisa de:'));
      var ul = el('ul', 'guia-mats');
      g.materiais.forEach(function (id) { ul.appendChild(el('li', null, MAT[id].nome)); });
      res.appendChild(ul);
    }
    res.appendChild(el('p', null, g.nota));
    var b = el('a', 'btn btn-laranja', g.materiais.length ? 'Pedir orçamento desse material' : 'Pedir ajuda no orçamento');
    b.href = '#orcamento';
    b.addEventListener('click', function () {
      if (window.DMOrc) window.DMOrc.preseleciona(g.materiais, g.materiais.length ? g.rotulo : '');
    });
    res.appendChild(b);
  }

  // antes / depois
  var ctrl = $('#ad-controle'), antes = $('#ad-antes'), linha = $('#ad-linha');
  function pos() { var v = ctrl.value; antes.style.clipPath = 'inset(0 ' + (100 - v) + '% 0 0)'; linha.style.left = v + '%'; }
  ctrl.addEventListener('input', pos); pos();

  // barra do celular some quando o orçamento está na tela
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { document.body.classList.toggle('no-orc', e[0].isIntersecting); }, { threshold: 0.05 })
      .observe($('#orcamento'));
  }
})();
