/* =====================================================================
   DAMARCO — orçamento guiado
   Tipo → Detalhes → Local (GPS opcional) → Fotos (até 5, reduzidas no
   navegador) → Prazo → Dados → Confirmação com resumo pro WhatsApp.
   Demo: grava em localStorage (dm_pedidos). Real: Supabase (RPC + bucket).
   ===================================================================== */
(function () {
  'use strict';
  var CFG = window.DM;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  var SERV = {}; CFG.servicos.forEach(function (s) { SERV[s.id] = s; });
  var MAT = {}; CFG.materiais.forEach(function (m) { MAT[m.id] = m; });
  var TOTAL = 6, passo = 1, gps = null, fotos = [], pedidoFeito = null;

  /* ---- listas ---- */
  var ls = $('#lista-servicos');
  CFG.servicos.forEach(function (s) {
    var l = el('label'); var i = el('input'); i.type = 'checkbox'; i.name = 'servico'; i.value = s.id;
    l.appendChild(i); l.appendChild(el('span', null, s.nome)); ls.appendChild(l);
  });
  var QTDS = [['1', '1 carrada'], ['2', '2 carradas'], ['3', '3 carradas'], ['4', '4 carradas'], ['5', '5 carradas'], ['6', '6 carradas'],
    ['8', '8 carradas'], ['10', '10 carradas'], ['10+', 'Mais de 10'], ['?', 'Não sei, me ajudem']];
  var lm = $('#lista-materiais');
  CFG.materiais.forEach(function (m) {
    var linha = el('div', 'mat-linha'); linha.dataset.mat = m.id;
    var lab = el('label'); var c = el('input'); c.type = 'checkbox'; c.value = m.id; c.className = 'mat-check';
    var t = el('span'); t.appendChild(document.createTextNode(m.nome)); t.appendChild(el('small', null, m.uso));
    lab.appendChild(c); lab.appendChild(t);
    var q = el('div', 'qtd'); q.hidden = true;
    var sl = el('select'); sl.className = 'mat-qtd'; sl.setAttribute('aria-label', 'Quantidade de ' + m.nome);
    QTDS.forEach(function (x) { var o = el('option', null, x[1]); o.value = x[0]; sl.appendChild(o); });
    sl.value = '?';
    q.appendChild(sl);
    c.addEventListener('change', function () { q.hidden = !c.checked; linha.classList.toggle('ativo', c.checked); });
    linha.appendChild(lab); linha.appendChild(q); lm.appendChild(linha);
  });
  $('#mat-naosei').addEventListener('change', function () { $('#campo-uso').hidden = !this.checked; });

  /* ---- navegação ---- */
  function tipo() { var r = $('input[name=tipo]:checked'); return r ? r.value : ''; }
  function radio(n) { var r = $('input[name=' + n + ']:checked'); return r ? r.value : ''; }
  function mostra(n) {
    passo = n;
    $$('.orc-passo').forEach(function (f) { f.hidden = +f.dataset.passo !== n; });
    var t = tipo();
    $('#det-servico').hidden = t === 'material';
    $('#det-material').hidden = t === 'servico';
    $('#orc-barra').style.width = Math.min(100, (n / TOTAL) * 100) + '%';
    $('#orc-etapa').textContent = n > TOTAL ? 'Pronto' : 'Etapa ' + n + ' de ' + TOTAL;
    $('#btn-voltar').hidden = n === 1 || n > TOTAL;
    $('#orc-nav').hidden = n > TOTAL;
    $('#btn-avancar').textContent = n === TOTAL ? 'Registrar pedido' : n === 4 ? (fotos.length ? 'Continuar' : 'Pular sem foto') : 'Continuar';
    erro('');
  }
  function erro(t) { $('#orc-erro').textContent = t; }
  function topo() { var o = $('#orc'); var y = o.getBoundingClientRect().top + window.scrollY - 80; if (Math.abs(window.scrollY - y) > 120) window.scrollTo(0, y); }

  function valida(n) {
    var t = tipo();
    if (n === 1 && !t) return 'Escolha: serviço, material ou os dois.';
    if (n === 2) {
      if (t !== 'material' && !$$('input[name=servico]:checked').length) return 'Marque pelo menos um serviço.';
      if (t !== 'servico') {
        var algum = $$('.mat-check:checked').length, nao = $('#mat-naosei').checked;
        if (!algum && !nao) return 'Marque um material ou "Não sei qual material, me ajudem".';
        if (nao && !$('#mat-uso').value.trim()) return 'Conte o que você vai fazer, para a gente indicar o material.';
      }
    }
    if (n === 3 && !$('#loc-cidade').value.trim() && !gps) return 'Diga a cidade, povoado ou fazenda, ou use sua localização.';
    if (n === 5 && !radio('prazo')) return 'Escolha para quando você precisa.';
    if (n === 6) {
      if ($('#cli-nome').value.trim().length < 2) return 'Diga seu nome.';
      if ($('#cli-tel').value.replace(/\D/g, '').length < 10) return 'Informe o WhatsApp com DDD.';
    }
    return '';
  }
  $('#btn-avancar').addEventListener('click', function () {
    var e = valida(passo);
    if (e) { erro(e); return; }
    if (passo === TOTAL) { registra(); return; }
    mostra(passo + 1); topo();
  });
  $('#btn-voltar').addEventListener('click', function () { mostra(passo - 1); topo(); });
  $$('input[name=tipo]').forEach(function (r) { r.addEventListener('change', function () { erro(''); }); });

  /* ---- GPS ---- */
  $('#btn-gps').addEventListener('click', function () {
    var msg = $('#gps-msg');
    if (!navigator.geolocation) { msg.textContent = 'Seu celular não liberou a localização. Escreva a referência acima.'; return; }
    msg.textContent = 'Pegando a localização…';
    navigator.geolocation.getCurrentPosition(function (p) {
      gps = { lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) };
      msg.innerHTML = ''; msg.appendChild(el('span', 'gps-ok', '✓ Localização anexada (' + gps.lat + ', ' + gps.lng + ')'));
      erro('');
    }, function () {
      msg.textContent = 'Não deu para pegar a localização. Sem problema: escreva a cidade e a referência.';
    }, { enableHighAccuracy: true, timeout: 15000 });
  });

  /* ---- fotos do terreno: até 5, JPEG ~1280px qualidade 0,8 ---- */
  var LADO = 1280, MAX_MB = 20, TIPOS = /^image\/(jpe?g|png|webp|heic|heif)$/i, EXTS = /\.(jpe?g|png|webp|heic|heif)$/i;
  var inp = $('#input-anexo'), zona = $('#anexo-zona');
  $('#btn-anexo').addEventListener('click', function () { inp.click(); });
  inp.addEventListener('change', function () { recebe(inp.files); inp.value = ''; });
  ['dragenter', 'dragover'].forEach(function (ev) { zona.addEventListener(ev, function (e) { e.preventDefault(); zona.classList.add('arrastando'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { zona.addEventListener(ev, function (e) { e.preventDefault(); zona.classList.remove('arrastando'); }); });
  zona.addEventListener('drop', function (e) { recebe(e.dataTransfer.files); });

  function avisa(t) { var m = $('#anexo-msg'); m.innerHTML = ''; if (t) m.appendChild(el('div', 'aviso aviso-erro', t)); }
  function reduz(arquivo) {
    return new Promise(function (ok, falha) {
      var url = URL.createObjectURL(arquivo), img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, LADO / Math.max(w, h));
        var cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(h * k));
        var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
        cx.drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url); ok(cv.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = function () { URL.revokeObjectURL(url); falha(); };
      img.src = url;
    });
  }
  function recebe(lista) {
    lista = Array.prototype.slice.call(lista || []);
    if (!lista.length) return;
    var erros = [], vagas = CFG.maxFotos - fotos.length;
    if (lista.length > vagas) { erros.push('Cabem até ' + CFG.maxFotos + ' fotos.' + (vagas > 0 ? ' Fiquei com as ' + vagas + ' primeiras.' : '')); lista = lista.slice(0, Math.max(0, vagas)); }
    var ps = lista.map(function (a) {
      if (!(TIPOS.test(a.type) || EXTS.test(a.name))) { erros.push(a.name + ': não é foto.'); return null; }
      if (a.size > MAX_MB * 1048576) { erros.push(a.name + ': maior que ' + MAX_MB + ' MB.'); return null; }
      return reduz(a).then(function (u) { if (fotos.length < CFG.maxFotos) fotos.push(u); }, function () { erros.push(a.name + ': não consegui abrir. Tente tirar print da foto.'); });
    });
    Promise.all(ps).then(function () { avisa(erros.join(' ')); pinta(); });
  }
  function pinta() {
    var ul = $('#anexo-lista'); ul.innerHTML = '';
    fotos.forEach(function (u, i) {
      var li = el('li'), im = el('img'); im.src = u; im.alt = 'Foto do terreno ' + (i + 1);
      var x = el('button', 'anexo-tira'); x.type = 'button'; x.setAttribute('aria-label', 'Remover foto ' + (i + 1));
      x.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
      x.addEventListener('click', function () { fotos.splice(i, 1); avisa(''); pinta(); });
      li.appendChild(im); li.appendChild(x); ul.appendChild(li);
    });
    var b = $('#btn-anexo'); b.disabled = fotos.length >= CFG.maxFotos;
    b.lastElementChild.textContent = b.disabled ? 'Limite de ' + CFG.maxFotos + ' fotos' : fotos.length ? 'Adicionar mais uma' : 'Adicionar foto';
    if (passo === 4) $('#btn-avancar').textContent = fotos.length ? 'Continuar' : 'Pular sem foto';
  }

  /* ---- monta o pedido ---- */
  function monta() {
    var t = tipo();
    var p = {
      codigo: 'DM' + String(Date.now()).slice(-5),
      criado_em: new Date().toISOString(),
      tipo: t,
      servicos: t === 'material' ? [] : $$('input[name=servico]:checked').map(function (i) { return i.value; }),
      terreno: t === 'material' ? null : { tamanho: $('#terreno-tamanho').value, situacao: radio('situacao'), acesso: radio('acesso') },
      materiais: t === 'servico' ? [] : $$('.mat-check:checked').map(function (c) {
        return { id: c.value, qtd: c.closest('.mat-linha').querySelector('.mat-qtd').value };
      }),
      material_nao_sei: t !== 'servico' && $('#mat-naosei').checked,
      uso: t !== 'servico' ? $('#mat-uso').value.trim() : '',
      obs: $('#det-obs').value.trim(),
      local: { zona: radio('zona'), cidade: $('#loc-cidade').value.trim(), referencia: $('#loc-ref').value.trim(), lat: gps ? gps.lat : null, lng: gps ? gps.lng : null },
      fotos: fotos.slice(),
      prazo: radio('prazo'),
      nome: $('#cli-nome').value.trim(),
      telefone: $('#cli-tel').value.replace(/\D/g, ''),
      origem: $('#cli-origem').value,
      etapa: 'novo', respondido_em: null, valor_centavos: 0, valor_fechado: false, pagamento: '', sinal_centavos: 0, sinal_pago: false,
      check: { maquina: false, operador: false, material: false }, agenda: null, medicao: '', motivo_perda: '',
      historico: [{ em: new Date().toISOString(), txt: 'Pedido recebido pelo site' }]
    };
    return p;
  }
  function qtdTxt(q) { return q === '?' ? 'quantidade: não sei, me ajudem' : q === '10+' ? 'mais de 10 carradas' : q + (q === '1' ? ' carrada' : ' carradas'); }
  function resumo(p) {
    var L = ['Olá, DAMARCO! Pedido de orçamento pelo site (' + p.codigo + ').', ''];
    L.push('Preciso de: ' + ({ servico: 'serviço', material: 'material', ambos: 'serviço e material' })[p.tipo]);
    if (p.servicos.length) L.push('Serviços: ' + p.servicos.map(function (s) { return SERV[s].nome; }).join(', '));
    if (p.terreno) {
      var tt = [p.terreno.tamanho, p.terreno.situacao && 'terreno ' + p.terreno.situacao.toLowerCase(), p.terreno.acesso && 'caminhão: ' + p.terreno.acesso.toLowerCase()].filter(Boolean);
      if (tt.length) L.push('Terreno: ' + tt.join(' · '));
    }
    if (p.materiais.length) L.push('Material: ' + p.materiais.map(function (m) { return MAT[m.id].nome + ' (' + qtdTxt(m.qtd) + ')'; }).join('; '));
    if (p.material_nao_sei) L.push('Não sei qual material. Vou fazer: ' + p.uso);
    if (p.obs) L.push('Obs.: ' + p.obs);
    L.push('');
    L.push('Local: ' + [p.local.zona, p.local.cidade].filter(Boolean).join(' · ') + (p.local.referencia ? '. Referência: ' + p.local.referencia : ''));
    if (p.local.lat != null) L.push('Localização: https://maps.google.com/?q=' + p.local.lat + ',' + p.local.lng);
    if (p.fotos.length) L.push('Fotos do terreno: ' + p.fotos.length + ' (mando aqui na conversa)');
    L.push('Prazo: ' + p.prazo);
    L.push('');
    L.push('Nome: ' + p.nome);
    L.push('WhatsApp: ' + p.telefone);
    return L.join('\n');
  }

  /* ---- grava ---- */
  function gravaDemo(p) {
    var lista = [];
    try { lista = JSON.parse(localStorage.getItem('dm_pedidos') || '[]'); } catch (e) {}
    lista.push(p);
    for (var tent = 0; tent < 30; tent++) {
      try { localStorage.setItem('dm_pedidos', JSON.stringify(lista)); return Promise.resolve(p); }
      catch (e) {   // memória cheia: tira fotos dos pedidos mais antigos primeiro
        var alvo = lista.find(function (x) { return x !== p && x.fotos && x.fotos.some(function (f) { return /^data:/.test(f); }); });
        if (alvo) alvo.fotos = alvo.fotos.filter(function (f) { return !/^data:/.test(f); });
        else if (p.fotos.length) p.fotos.pop();
        else return Promise.resolve(p);
      }
    }
    return Promise.resolve(p);
  }
  function dataUrlBlob(u) {
    var b = atob(u.split(',')[1]), a = new Uint8Array(b.length);
    for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
    return new Blob([a], { type: 'image/jpeg' });
  }
  function gravaReal(p) {
    var sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey);
    var pasta = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
    var ups = p.fotos.map(function (u, i) {
      var caminho = pasta + '/' + (i + 1) + '.jpg';
      return sb.storage.from(CFG.bucketFotos).upload(caminho, dataUrlBlob(u), { contentType: 'image/jpeg' })
        .then(function (r) { return r.error ? null : caminho; });
    });
    return Promise.all(ups).then(function (caminhos) {
      var dados = JSON.parse(JSON.stringify(p)); dados.fotos = caminhos.filter(Boolean);
      return sb.rpc('criar_orcamento', { dados: dados }).then(function (r) {
        if (r.error) throw r.error;
        p.codigo = r.data || p.codigo; return p;
      });
    });
  }
  function registra() {
    var b = $('#btn-avancar'); b.disabled = true; b.textContent = 'Registrando…';
    var p = monta();
    (CFG.modoDemo ? gravaDemo(p) : gravaReal(p)).then(function (feito) {
      pedidoFeito = feito;
      var txt = resumo(feito);
      $('#resumo').textContent = txt;
      $('#fim-codigo').textContent = 'Código ' + feito.codigo;
      $('#fim-fotos').textContent = feito.fotos.length ? 'As ' + feito.fotos.length + ' fotos ficaram no pedido. Se puder, mande também na conversa do WhatsApp.' : '';
      $('#btn-enviar-wa').href = 'https://wa.me/' + CFG.whatsapp + '?text=' + encodeURIComponent(txt);
      mostra(TOTAL + 1); topo();
    }).catch(function () {
      erro('Não consegui registrar agora. Toque em "WhatsApp" e mande o pedido direto por lá.');
    }).then(function () { b.disabled = false; });
  }
  $('#btn-copiar').addEventListener('click', function () {
    var t = $('#resumo').textContent, bt = this;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { bt.textContent = 'Copiado ✓'; }, function () { bt.textContent = 'Selecione e copie o texto acima'; });
  });
  $('#btn-novo').addEventListener('click', function () { location.hash = ''; location.reload(); });

  /* ---- atalho vindo do guia de materiais ---- */
  window.DMOrc = {
    preseleciona: function (ids, uso) {
      var t = $('input[name=tipo][value=material]'); t.checked = true;
      $$('.mat-check').forEach(function (c) {
        var on = ids.indexOf(c.value) >= 0; c.checked = on;
        c.dispatchEvent(new Event('change'));
      });
      var ns = $('#mat-naosei');
      ns.checked = !ids.length; ns.dispatchEvent(new Event('change'));
      if (uso) $('#det-obs').value = 'Vou usar para: ' + uso;
      mostra(2);
    }
  };

  mostra(1);
})();
