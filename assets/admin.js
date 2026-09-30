/* =====================================================================
   DAMARCO — painel: orçamentos → obras e entregas
   Demo: localStorage (dm_pedidos, dm_entregas, dm_recursos).
   Real: Supabase (tabelas orcamentos, entregas, recursos + bucket de fotos).
   ===================================================================== */
(function () {
  'use strict';
  var CFG = window.DM;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var SERV = {}; CFG.servicos.forEach(function (s) { SERV[s.id] = s; });
  var MAT = {}; CFG.materiais.forEach(function (m) { MAT[m.id] = m; });
  var ETAPA = {}; CFG.etapas.forEach(function (e) { ETAPA[e.id] = e; });
  var COR = { novo: '#0b4f8a', visita: '#6a3d9a', enviado: '#9a4300', aprovado: '#1d6b33', agendado: '#141414', execucao: '#f7841f', concluido: '#4d4d4d', perdido: '#8a8a8a' };
  var FECHADAS = ['aprovado', 'agendado', 'execucao', 'concluido'];
  var ESTADOS_ENT = [['programada', 'Programada'], ['saiu', 'Saiu para entrega'], ['entregue', 'Entregue'], ['conferida', 'Conferida com o cliente']];
  var S = { pedidos: [], entregas: [], recursos: [] };
  var sb = null, aba = 'geral', semanaOff = 0, funilEtapaCel = 'novo', filtro = { q: '', tipo: '', origem: '' }, periodo = 'mes';

  /* ---------------- utilidades ---------------- */
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function hoje() { return iso(new Date()); }
  function soma(isoDia, n) { var d = new Date(isoDia + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); }
  function diaDe(isoTs) { return iso(new Date(isoTs)); }
  var SEM = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  function dataCurta(isoDia) { var d = new Date(isoDia + 'T12:00:00'); return SEM[d.getDay()] + ' ' + String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'); }
  function dataHora(isoTs) { var d = new Date(isoTs); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function reais(c) { return (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }); }
  function paraCent(txt) { var v = String(txt || '').replace(/[^\d,.]/g, '').replace(/\./g, '').replace(',', '.'); return Math.round((parseFloat(v) || 0) * 100); }
  function ha(isoTs) {
    var m = Math.max(0, Math.round((Date.now() - new Date(isoTs).getTime()) / 60000));
    if (m < 60) return 'há ' + m + ' min';
    if (m < 60 * 24) return 'há ' + Math.round(m / 60) + 'h';
    return 'há ' + Math.round(m / 1440) + ' dia' + (m >= 2880 ? 's' : '');
  }
  function primeiroNome(n) { return String(n || '').replace(/\s*\(exemplo\)/, '').split(' ')[0]; }
  function inicioSemana(off) { var d = new Date(); d.setHours(12, 0, 0, 0); var w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w + off * 7); return iso(d); }
  function recurso(id) { return S.recursos.find(function (r) { return r.id === id; }) || { id: id, nome: id }; }
  function nomeRec(id) { var r = recurso(id); return r.nome + (r.aConfirmar ? ' (a confirmar)' : ''); }
  function oQue(p) {
    var a = [];
    if (p.servicos && p.servicos.length) a.push(p.servicos.map(function (s) { return SERV[s] ? SERV[s].nome : s; }).join(', '));
    if (p.materiais && p.materiais.length) a.push(p.materiais.map(function (m) { return (MAT[m.id] ? MAT[m.id].nome : m.id) + ' ' + qtdTxt(m.qtd); }).join(', '));
    if (p.material_nao_sei) a.push('Material: não sabe qual');
    return a.join(' + ') || '—';
  }
  function qtdTxt(q) { return q === '?' ? '(qtd. a definir)' : q === '10+' ? '(10+ carradas)' : '(' + q + ' carr.)'; }
  function lugar(p) { return [p.local.zona === 'Zona rural' ? 'Zona rural' : '', p.local.cidade].filter(Boolean).join(' · '); }
  function atrasado(p) { return p.etapa === 'novo' && !p.respondido_em && diaDe(p.criado_em) < hoje(); }
  function aResponder(p) { return p.etapa === 'novo' && !p.respondido_em; }
  function checkOk(p) { return p.check.maquina && p.check.operador && p.check.material; }
  function ocupaDia(p, d) { if (!p.agenda) return false; var fim = soma(p.agenda.inicio, (p.agenda.dias || 1) - 1); return d >= p.agenda.inicio && d <= fim; }
  function toast(t) { var e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(function () { e.classList.remove('on'); }, 3200); }
  function fone(p) { var t = String(p.telefone || '').replace(/\D/g, ''); return t.indexOf('55') === 0 && t.length > 11 ? t : '55' + t; }
  function selo(txt, tipo) { return '<span class="selo selo-' + tipo + '">' + esc(txt) + '</span>'; }
  function seloEtapa(e) { return '<span class="selo" style="color:' + (e === 'execucao' ? '#7a3c00' : COR[e]) + '">' + esc(ETAPA[e].nome) + '</span>'; }

  /* ---------------- dados: demo e real ---------------- */
  var LS = {
    ler: function (k, pad) { try { return JSON.parse(localStorage.getItem(k)) || pad; } catch (e) { return pad; } },
    gravar: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { toast('A memória do navegador encheu. Recomece a demo.'); return false; } }
  };
  function doBanco(r) {
    return {
      id: r.id, codigo: r.codigo, criado_em: r.criado_em, tipo: r.tipo, servicos: r.servicos || [], terreno: r.terreno, materiais: r.materiais || [],
      material_nao_sei: r.material_nao_sei, uso: r.uso, obs: r.obs,
      local: { zona: r.zona, cidade: r.cidade, referencia: r.referencia, lat: r.lat, lng: r.lng },
      fotos: r.fotos || [], prazo: r.prazo, nome: r.nome, telefone: r.telefone, origem: r.origem, etapa: r.etapa, respondido_em: r.respondido_em,
      valor_centavos: r.valor_centavos || 0, valor_fechado: r.valor_fechado, pagamento: r.pagamento || '', sinal_centavos: r.sinal_centavos || 0, sinal_pago: r.sinal_pago,
      check: { maquina: r.chk_maquina, operador: r.chk_operador, material: r.chk_material },
      agenda: r.agenda_recurso ? { recurso: r.agenda_recurso, inicio: r.agenda_inicio, dias: r.agenda_dias } : null,
      medicao: r.medicao || '', motivo_perda: r.motivo_perda || '', historico: r.historico || []
    };
  }
  function proBanco(p) {
    return {
      etapa: p.etapa, respondido_em: p.respondido_em, valor_centavos: p.valor_centavos, valor_fechado: p.valor_fechado, pagamento: p.pagamento,
      sinal_centavos: p.sinal_centavos, sinal_pago: p.sinal_pago, chk_maquina: p.check.maquina, chk_operador: p.check.operador, chk_material: p.check.material,
      agenda_recurso: p.agenda ? p.agenda.recurso : null, agenda_inicio: p.agenda ? p.agenda.inicio : null, agenda_dias: p.agenda ? p.agenda.dias : null,
      medicao: p.medicao, motivo_perda: p.motivo_perda, historico: p.historico
    };
  }
  function carrega() {
    if (CFG.modoDemo) {
      S.pedidos = LS.ler('dm_pedidos', []); S.entregas = LS.ler('dm_entregas', []); S.recursos = LS.ler('dm_recursos', CFG.recursos.slice());
      S.pedidos.forEach(function (p) { p.check = p.check || { maquina: false, operador: false, material: false }; p.historico = p.historico || []; });
      return Promise.resolve();
    }
    return Promise.all([
      sb.from('orcamentos').select('*').order('criado_em', { ascending: false }),
      sb.from('entregas').select('*').order('dia'),
      sb.from('recursos').select('*').order('ordem')
    ]).then(function (r) {
      if (r[0].error) throw r[0].error;
      S.pedidos = r[0].data.map(doBanco);
      S.entregas = (r[1].data || []).map(function (e) { return { id: e.id, codigo: e.codigo, dia: e.dia, material: e.material, carradas: e.carradas, destino: e.destino, recurso: e.recurso, estado: e.estado }; });
      S.recursos = (r[2].data || []).map(function (x) { return { id: x.slug, nome: x.nome, tipo: x.tipo, aConfirmar: x.a_confirmar, _uuid: x.id }; });
      if (!S.recursos.length) S.recursos = CFG.recursos.slice();
    });
  }
  function salvaPedido(p) {
    if (CFG.modoDemo) return Promise.resolve(LS.gravar('dm_pedidos', S.pedidos));
    return sb.from('orcamentos').update(proBanco(p)).eq('codigo', p.codigo).then(function (r) { if (r.error) toast('Não salvou: ' + r.error.message); });
  }
  function salvaEntrega(e, apagar) {
    if (CFG.modoDemo) return Promise.resolve(LS.gravar('dm_entregas', S.entregas));
    if (apagar) return sb.from('entregas').delete().eq('id', e.id);
    var linha = { codigo: e.codigo, dia: e.dia, material: e.material, carradas: e.carradas, destino: e.destino, recurso: e.recurso, estado: e.estado };
    if (/^e\d|^novo/.test(e.id)) return sb.from('entregas').insert(linha).select().then(function (r) { if (r.data) e.id = r.data[0].id; });
    return sb.from('entregas').update(linha).eq('id', e.id);
  }
  function salvaRecursos() {
    if (CFG.modoDemo) return Promise.resolve(LS.gravar('dm_recursos', S.recursos));
    return sb.from('recursos').upsert(S.recursos.map(function (r, i) { return { slug: r.id, nome: r.nome, tipo: r.tipo, a_confirmar: !!r.aConfirmar, ordem: i }; }), { onConflict: 'slug' });
  }
  function registra(p, txt) { p.historico.push({ em: new Date().toISOString(), txt: txt }); }

  /* ---------------- abas ---------------- */
  $$('#abas button').forEach(function (b) {
    b.addEventListener('click', function () { vaiPara(b.dataset.aba); });
  });
  function vaiPara(nova) {
    aba = nova;
    $$('#abas button').forEach(function (b) { if (b.dataset.aba === aba) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    $$('.aba').forEach(function (s) { s.hidden = s.id !== 'aba-' + aba; });
    try { sessionStorage.setItem('dm_aba', aba); } catch (e) {}
    desenha(); window.scrollTo(0, 0);
  }
  function desenha() {
    ({ geral: geral, funil: funil, agenda: agenda, entregas: entregas, relatorio: relatorio, equipamentos: equipamentos })[aba]();
  }

  /* ---------------- visão geral ---------------- */
  function geral() {
    var h = hoje(), ini = inicioSemana(0), fim = soma(ini, 6), mes = h.slice(0, 7);
    var novos = S.pedidos.filter(function (p) { return p.etapa === 'novo'; });
    var resp = S.pedidos.filter(aResponder).sort(function (a, b) { return a.criado_em < b.criado_em ? -1 : 1; });
    var atr = resp.filter(atrasado);
    var obras = S.pedidos.filter(function (p) { if (!p.agenda || p.etapa === 'perdido') return false; var f = soma(p.agenda.inicio, p.agenda.dias - 1); return p.agenda.inicio <= fim && f >= ini && recurso(p.agenda.recurso).tipo !== 'cacamba'; });
    var entSem = S.entregas.filter(function (e) { return e.dia >= ini && e.dia <= fim; });
    var carrSem = entSem.reduce(function (s, e) { return s + (+e.carradas || 0); }, 0);
    var doMes = S.pedidos.filter(function (p) { return diaDe(p.criado_em).slice(0, 7) === mes; });
    var orcado = doMes.reduce(function (s, p) { return s + (p.valor_centavos || 0); }, 0);
    var fechado = doMes.filter(function (p) { return FECHADAS.indexOf(p.etapa) >= 0; }).reduce(function (s, p) { return s + (p.valor_centavos || 0); }, 0);
    var hojeObras = S.pedidos.filter(function (p) { return ocupaDia(p, h) && p.etapa !== 'perdido'; });
    var hojeEnt = S.entregas.filter(function (e) { return e.dia === h; });
    var esperando = S.pedidos.filter(function (p) { return p.etapa === 'aprovado'; });

    var html = '<div class="cab-aba"><h1>Visão geral</h1><p>' + esc(dataCurta(h)) + ' · promessa da casa: <strong>responder no mesmo dia</strong>.</p></div>';
    html += '<div class="kpis">' +
      kpi('funil', 'Orçamentos novos', novos.length, 'no funil agora', 'destaque') +
      kpi('responder', 'A responder hoje', resp.length, atr.length ? atr.length + ' atrasado' + (atr.length > 1 ? 's' : '') + ' (de ontem ou antes)' : 'nenhum atrasado', atr.length ? 'atraso' : '') +
      kpi('agenda', 'Obras da semana', obras.length, 'máquina na obra') +
      kpi('entregas', 'Entregas da semana', entSem.length, carrSem + ' carradas') +
      kpi('relatorio', 'Orçado no mês', reais(orcado), doMes.filter(function (p) { return p.valor_centavos; }).length + ' orçamentos', '', true) +
      kpi('relatorio', 'Fechado no mês', reais(fechado), orcado ? Math.round(fechado / orcado * 100) + '% do orçado' : '—', '', true) +
      '</div>';

    html += '<div class="grade-2"><div>';
    html += '<section class="painel" id="p-responder"><h2>Responder hoje <span class="cont">' + resp.length + '</span></h2>';
    if (!resp.length) html += '<p class="vazio">Tudo respondido. Promessa cumprida.</p>';
    resp.forEach(function (p) {
      html += '<div class="linha-ped"><div class="quem"><strong>' + esc(p.nome) + '</strong><span>' + esc(oQue(p)) + '</span><br><span>' + esc(lugar(p)) + ' · ' + esc(p.origem) + '</span></div>' +
        (atrasado(p) ? selo('Atrasado · chegou ' + dataHora(p.criado_em), 'atraso') : selo('Chegou ' + ha(p.criado_em), 'hoje')) +
        '<div class="acoes"><a class="btn btn-wa" data-wa1="' + p.codigo + '" href="' + linkWa(p, msgPadrao(p, 'primeira')) + '" target="_blank" rel="noopener">Responder</a>' +
        '<button class="btn" data-abre="' + p.codigo + '">Abrir</button></div></div>';
    });
    html += '</section>';
    html += '<section class="painel"><h2>Aprovados esperando data <span class="cont">' + esperando.length + '</span></h2>' +
      '<p class="regra">Regra da casa: a data só é marcada com <strong>máquina, operador e material</strong> confirmados.</p>';
    if (!esperando.length) html += '<p class="vazio">Nenhum aprovado parado.</p>';
    esperando.forEach(function (p) {
      html += '<div class="linha-ped"><div class="quem"><strong>' + esc(p.nome) + '</strong><span>' + esc(oQue(p)) + '</span></div>' + chkMini(p) +
        '<div class="acoes"><button class="btn" data-abre="' + p.codigo + '">' + (checkOk(p) ? 'Agendar' : 'Confirmar') + '</button></div></div>';
    });
    html += '</section></div><div>';
    html += '<section class="painel"><h2>Hoje na obra</h2>';
    if (!hojeObras.length) html += '<p class="vazio">Nenhuma máquina programada hoje.</p>';
    hojeObras.forEach(function (p) {
      html += '<div class="linha-ped"><div class="quem"><strong>' + esc(nomeRec(p.agenda.recurso)) + '</strong><span>' + esc(p.nome) + ' · ' + esc(lugar(p)) + '</span></div>' + seloEtapa(p.etapa) +
        '<div class="acoes"><button class="btn" data-abre="' + p.codigo + '">Abrir</button></div></div>';
    });
    html += '</section><section class="painel"><h2>Entregas de hoje <span class="cont">' + hojeEnt.reduce(function (s, e) { return s + (+e.carradas); }, 0) + ' carradas</span></h2>';
    if (!hojeEnt.length) html += '<p class="vazio">Sem entregas hoje.</p>';
    hojeEnt.forEach(function (e) {
      html += '<div class="linha-ped"><div class="quem"><strong>' + esc(e.carradas + ' × ' + (MAT[e.material] ? MAT[e.material].nome : e.material)) + '</strong><span>' + esc(e.destino) + '</span></div>' +
        selo(ESTADOS_ENT.find(function (s) { return s[0] === e.estado; })[1], e.estado === 'programada' ? 'neutro' : e.estado === 'saiu' ? 'info' : 'ok') + '</div>';
    });
    html += '<div class="linha-botoes"><button class="btn" data-vai="entregas">Ver todas as entregas</button></div></section></div></div>';
    $('#aba-geral').innerHTML = html;
  }
  function kpi(dest, rot, n, sub, cls, dinheiro) {
    return '<button class="kpi ' + (cls || '') + '" data-vai="' + dest + '"><span class="r">' + esc(rot) + '</span><span class="n' + (dinheiro ? ' dinheiro' : '') + '">' + esc(n) + '</span><span class="s">' + esc(sub) + '</span></button>';
  }
  function chkMini(p) {
    return '<span class="chk-mini">' + [['maquina', 'Máquina'], ['operador', 'Operador'], ['material', 'Material']].map(function (c) {
      return '<span class="' + (p.check[c[0]] ? 's' : 'n') + '">' + (p.check[c[0]] ? '✓ ' : '✗ ') + c[1] + '</span>';
    }).join('') + '</span>';
  }

  /* ---------------- funil ---------------- */
  function funil() {
    var q = filtro.q.toLowerCase();
    var lista = S.pedidos.filter(function (p) {
      if (filtro.tipo && p.tipo !== filtro.tipo) return false;
      if (filtro.origem && p.origem !== filtro.origem) return false;
      if (q && (p.nome + ' ' + p.codigo + ' ' + oQue(p) + ' ' + lugar(p) + ' ' + (p.local.referencia || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    var html = '<div class="cab-aba"><h1>Funil de orçamentos</h1><p>Novo → Visita/medição → Orçamento enviado → Aprovado → Agendado → Em execução → Concluído (medido e conferido) ou Perdido.</p></div>';
    html += '<div class="filtros"><input type="search" id="f-q" placeholder="Buscar cliente, código, local, material…" value="' + esc(filtro.q) + '" aria-label="Buscar">' +
      '<select id="f-tipo" aria-label="Tipo"><option value="">Serviço e material</option><option value="servico">Só serviço</option><option value="material">Só material</option><option value="ambos">Os dois</option></select>' +
      '<select id="f-origem" aria-label="Origem"><option value="">Toda origem</option>' + CFG.origens.map(function (o) { return '<option>' + o + '</option>'; }).join('') + '</select></div>';
    html += '<div class="etapas-cel"><label class="visualmente-oculto" for="f-etapa-cel">Etapa</label><select id="f-etapa-cel">' + CFG.etapas.map(function (e) {
      return '<option value="' + e.id + '"' + (e.id === funilEtapaCel ? ' selected' : '') + '>' + e.nome + ' (' + lista.filter(function (p) { return p.etapa === e.id; }).length + ')</option>';
    }).join('') + '</select></div>';
    html += '<div class="quadro">';
    CFG.etapas.forEach(function (e) {
      var col = lista.filter(function (p) { return p.etapa === e.id; }).sort(function (a, b) { return a.criado_em < b.criado_em ? 1 : -1; });
      html += '<section class="coluna' + (e.id === funilEtapaCel ? ' ativa' : '') + '" style="--c:' + COR[e.id] + '"><h2>' + esc(e.nome) + '<span class="cont">' + col.length + '</span></h2>';
      if (!col.length) html += '<p class="vazio" style="padding:4px">Nada aqui.</p>';
      col.forEach(function (p) { html += cartao(p); });
      html += '</section>';
    });
    html += '</div>';
    $('#aba-funil').innerHTML = html;
    $('#f-tipo').value = filtro.tipo; $('#f-origem').value = filtro.origem;
    $('#f-q').addEventListener('input', function () { filtro.q = this.value; var pos = this.selectionStart; funil(); var i = $('#f-q'); i.focus(); i.setSelectionRange(pos, pos); });
    $('#f-tipo').addEventListener('change', function () { filtro.tipo = this.value; funil(); });
    $('#f-origem').addEventListener('change', function () { filtro.origem = this.value; funil(); });
    $('#f-etapa-cel').addEventListener('change', function () { funilEtapaCel = this.value; funil(); });
  }
  function cartao(p) {
    var extra = '';
    if (atrasado(p)) extra += selo('Atrasado', 'atraso');
    else if (aResponder(p)) extra += selo('Responder hoje', 'hoje');
    if (p.etapa === 'aprovado') extra += checkOk(p) ? selo('Pronto p/ agendar', 'ok') : selo('Falta confirmar', 'conf');
    if (p.agenda && (p.etapa === 'agendado' || p.etapa === 'execucao')) extra += selo(dataCurta(p.agenda.inicio), 'info');
    var fotos = (p.fotos || []).slice(0, 3).map(function (f) { return /^(data:|fotos\/|https?:)/.test(f) ? '<img src="' + esc(f) + '" alt="">' : ''; }).join('');
    return '<button class="cartao-ped" style="--c:' + COR[p.etapa] + '" data-abre="' + p.codigo + '"><strong>' + esc(p.nome) + '</strong>' +
      '<span class="o">' + esc(oQue(p)) + '<br>' + esc(lugar(p)) + '</span>' +
      '<span class="rod">' + extra + '<span>' + esc(p.origem) + ' · ' + ha(p.criado_em) + '</span>' + (p.valor_centavos ? '<span class="valor">' + reais(p.valor_centavos) + '</span>' : '') + '</span>' +
      (fotos ? '<span class="mini-fotos">' + fotos + '</span>' : '') + '</button>';
  }

  /* ---------------- WhatsApp ---------------- */
  var MODELOS = [
    ['primeira', 'Primeira resposta'], ['localizacao', 'Pedir localização / fotos'], ['visita', 'Marcar visita para medir'],
    ['orcamento', 'Enviar orçamento por escrito'], ['data', 'Confirmar data'], ['conferencia', 'Medir e conferir no fim']
  ];
  function msgPadrao(p, m) {
    var n = primeiroNome(p.nome), cod = p.codigo, oq = oQue(p);
    var ab = 'Olá, ' + n + '! Aqui é da DAMARCO. ';
    if (m === 'primeira') return ab + 'Recebemos seu pedido ' + cod + ' (' + oq + '). Já estamos vendo e hoje mesmo te passamos o próximo passo.';
    if (m === 'localizacao') return ab + 'Sobre o pedido ' + cod + ': pode mandar a localização do terreno aqui no WhatsApp (clipe > Localização) e umas fotos do local? Assim o orçamento sai mais certo.';
    if (m === 'visita') return ab + 'Para o pedido ' + cod + ' ficar certo, a gente precisa passar no local para medir. Qual o melhor dia e horário para você?';
    if (m === 'orcamento') {
      var L = [ab + 'Segue o orçamento por escrito do pedido ' + cod + ':', '', '• ' + oq];
      if (p.valor_centavos) L.push('• Valor: ' + reais(p.valor_centavos));
      if (p.pagamento) L.push('• Pagamento: ' + p.pagamento);
      if (p.sinal_centavos) L.push('• Sinal para reservar a data: ' + reais(p.sinal_centavos));
      L.push('', 'A data só é marcada com máquina, operador e material confirmados. No fim, tudo é medido e conferido com você.');
      return L.join('\n');
    }
    if (m === 'data') {
      if (!p.agenda) return ab + 'Seu pedido ' + cod + ' está aprovado. Assim que máquina, operador e material estiverem confirmados, te passo a data.';
      return ab + 'Data confirmada para o pedido ' + cod + ': ' + dataCurta(p.agenda.inicio) + (p.agenda.dias > 1 ? ' (' + p.agenda.dias + ' dias)' : '') + '. Máquina, operador e material confirmados. Base é DAMARCO.';
    }
    if (m === 'conferencia') return ab + 'Terminamos o pedido ' + cod + '. Vamos medir e conferir juntos? Me diz o melhor horário.';
    return ab;
  }
  function modeloDaEtapa(p) {
    if (p.etapa === 'novo') return p.local.lat == null && !(p.fotos || []).length ? 'localizacao' : 'primeira';
    return { visita: 'visita', enviado: 'orcamento', aprovado: 'data', agendado: 'data', execucao: 'conferencia', concluido: 'conferencia', perdido: 'primeira' }[p.etapa];
  }
  function linkWa(p, txt) { return 'https://wa.me/' + fone(p) + '?text=' + encodeURIComponent(txt); }
  function marcaRespondido(p) {
    if (!p.respondido_em) { p.respondido_em = new Date().toISOString(); registra(p, 'Primeira resposta ao cliente (WhatsApp)'); salvaPedido(p); }
  }

  /* ---------------- gaveta do pedido ---------------- */
  var atual = null;
  function abre(codigo) {
    atual = S.pedidos.find(function (p) { return p.codigo === codigo; });
    if (!atual) return;
    pintaGaveta();
    var g = $('#gaveta'); if (!g.open) g.showModal();
    g.scrollTop = 0;
  }
  function fotosUrls(p) {
    var fs = p.fotos || [];
    if (CFG.modoDemo || !fs.length || /^(data:|fotos\/|https?:)/.test(fs[0])) return Promise.resolve(fs);
    return sb.storage.from(CFG.bucketFotos).createSignedUrls(fs, 3600).then(function (r) { return (r.data || []).map(function (x) { return x.signedUrl; }); });
  }
  function pintaGaveta() {
    var p = atual, h = '';
    h += '<div class="gv-cab"><div><h2 id="gv-titulo">' + esc(p.nome) + '</h2><p>' + esc(p.codigo) + ' · chegou ' + esc(dataHora(p.criado_em)) + ' (' + ha(p.criado_em) + ') · ' + esc(p.origem) +
      (p.respondido_em ? ' · respondido ' + esc(dataHora(p.respondido_em)) : '') + '</p></div><button class="gv-fechar" id="gv-fechar" aria-label="Fechar pedido">✕</button></div>';
    h += '<div class="gv-etapas" role="group" aria-label="Mover para a etapa">' + CFG.etapas.map(function (e) {
      return '<button data-etapa="' + e.id + '" aria-pressed="' + (p.etapa === e.id) + '">' + esc(e.nome) + '</button>';
    }).join('') + '</div><div class="gv-corpo">';
    if (atrasado(p)) h += '<p class="regra" style="background:var(--erro-fundo);border-color:var(--erro);color:var(--erro)"><strong>Atrasado:</strong> chegou ' + esc(dataHora(p.criado_em)) + ' e ainda não teve resposta. A promessa é responder no mesmo dia.</p>';

    // o que precisa
    h += '<section class="bloco"><h3>O que o cliente precisa</h3><dl class="dados">';
    h += '<dt>Tipo</dt><dd>' + esc({ servico: 'Serviço', material: 'Material', ambos: 'Serviço e material' }[p.tipo]) + '</dd>';
    if (p.servicos.length) h += '<dt>Serviços</dt><dd>' + esc(p.servicos.map(function (s) { return SERV[s] ? SERV[s].nome : s; }).join(', ')) + '</dd>';
    if (p.terreno) {
      if (p.terreno.tamanho) h += '<dt>Terreno</dt><dd>' + esc(p.terreno.tamanho) + '</dd>';
      if (p.terreno.situacao) h += '<dt>Situação</dt><dd>' + esc(p.terreno.situacao) + '</dd>';
      if (p.terreno.acesso) h += '<dt>Caminhão chega?</dt><dd>' + esc(p.terreno.acesso) + '</dd>';
    }
    if (p.materiais.length) h += '<dt>Material</dt><dd>' + esc(p.materiais.map(function (m) { return (MAT[m.id] ? MAT[m.id].nome : m.id) + ' ' + qtdTxt(m.qtd); }).join(' · ')) + '</dd>';
    if (p.material_nao_sei) h += '<dt>Não sabe o material</dt><dd>Vai fazer: ' + esc(p.uso) + '</dd>';
    if (p.obs) h += '<dt>Observação</dt><dd>' + esc(p.obs) + '</dd>';
    h += '<dt>Prazo</dt><dd>' + esc(p.prazo) + '</dd><dt>WhatsApp</dt><dd>' + esc(p.telefone) + '</dd></dl></section>';

    // fotos
    h += '<section class="bloco"><h3>Fotos do terreno <span class="cont">' + (p.fotos || []).length + '</span></h3><div class="fotos-ped" id="gv-fotos">' +
      ((p.fotos || []).length ? '' : '<p class="vazio">Sem fotos. Use a mensagem "Pedir localização / fotos".</p>') + '</div></section>';

    // local
    h += '<section class="bloco"><h3>Local</h3><dl class="dados"><dt>Onde</dt><dd>' + esc(lugar(p) || '—') + '</dd><dt>Referência</dt><dd>' + esc(p.local.referencia || '—') + '</dd></dl>';
    if (p.local.lat != null) {
      var d = 0.012, bb = [p.local.lng - d, p.local.lat - d * 0.7, p.local.lng + d, p.local.lat + d * 0.7].join(',');
      h += '<iframe class="mapa" title="Mapa do local do pedido" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=' + bb + '&layer=mapnik&marker=' + p.local.lat + ',' + p.local.lng + '"></iframe>' +
        '<div class="mapa-acoes"><a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps?q=' + p.local.lat + ',' + p.local.lng + '">Abrir no Google Maps</a>' +
        '<a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=' + p.local.lat + ',' + p.local.lng + '">Traçar rota</a></div>';
    } else {
      h += '<p class="regra">Sem localização do GPS. Peça pelo WhatsApp (mensagem "Pedir localização / fotos").</p>';
    }
    h += '</section>';

    // whatsapp
    var mod = modeloDaEtapa(p);
    h += '<section class="bloco"><h3>Mensagem pronta no WhatsApp</h3><label class="campo"><span>Modelo</span><select id="gv-modelo">' +
      MODELOS.map(function (m) { return '<option value="' + m[0] + '"' + (m[0] === mod ? ' selected' : '') + '>' + m[1] + '</option>'; }).join('') + '</select></label>' +
      '<label class="campo" style="margin-top:10px"><span>Texto (pode editar)</span><textarea class="msg-wa" id="gv-msg">' + esc(msgPadrao(p, mod)) + '</textarea></label>' +
      '<div class="linha-botoes"><a class="btn btn-wa" id="gv-wa" target="_blank" rel="noopener" href="#">Abrir no WhatsApp</a></div></section>';

    // valores
    h += '<section class="bloco"><h3>Orçamento e pagamento</h3><div class="campos">' +
      '<label class="campo"><span>Valor do orçamento (R$)</span><input id="gv-valor" inputmode="decimal" value="' + (p.valor_centavos ? (p.valor_centavos / 100).toLocaleString('pt-BR') : '') + '" placeholder="0"></label>' +
      '<label class="campo"><span>Forma de pagamento</span><select id="gv-pag"><option value="">A definir</option>' + CFG.pagamentos.map(function (x) { return '<option' + (p.pagamento === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></label>' +
      '<label class="campo"><span>Sinal (R$)</span><input id="gv-sinal" inputmode="decimal" value="' + (p.sinal_centavos ? (p.sinal_centavos / 100).toLocaleString('pt-BR') : '') + '" placeholder="0"></label>' +
      '<label class="campo-check"><input type="checkbox" id="gv-sinal-pago"' + (p.sinal_pago ? ' checked' : '') + '> Sinal recebido</label></div>' +
      '<div class="linha-botoes"><button class="btn btn-escuro" id="gv-salva-valor">Salvar valores</button>' +
      (p.etapa === 'novo' || p.etapa === 'visita' ? '<button class="btn" id="gv-enviado">Salvar e marcar "Orçamento enviado"</button>' : '') + '</div></section>';

    // programação
    var ok = checkOk(p);
    h += '<section class="bloco" id="gv-prog"><h3>Programação</h3>' +
      '<p class="regra' + (ok ? ' regra-ok' : '') + '">' + (ok ? '✓ Máquina, operador e material confirmados. Pode marcar a data.' : 'Só entra na agenda com <strong>máquina, operador e material</strong> confirmados.') + '</p>' +
      '<div class="checklist">' + [['maquina', 'Máquina confirmada'], ['operador', 'Operador confirmado'], ['material', 'Material confirmado']].map(function (c) {
        return '<label class="' + (p.check[c[0]] ? 'feito' : '') + '"><input type="checkbox" data-chk="' + c[0] + '"' + (p.check[c[0]] ? ' checked' : '') + '> ' + c[1] + '</label>';
      }).join('') + '</div>';
    var ag = p.agenda || {};
    h += '<div class="campos"><label class="campo"><span>Máquina / equipe</span><select id="gv-rec">' + S.recursos.map(function (r) {
      return '<option value="' + esc(r.id) + '"' + (ag.recurso === r.id ? ' selected' : '') + '>' + esc(nomeRec(r.id)) + '</option>';
    }).join('') + '</select></label>' +
      '<label class="campo"><span>Início</span><input type="date" id="gv-ini" value="' + esc(ag.inicio || soma(hoje(), 1)) + '"></label>' +
      '<label class="campo"><span>Dias de máquina</span><input type="number" id="gv-dias" min="1" max="15" value="' + (ag.dias || 1) + '"></label></div>' +
      '<p class="erro" id="gv-ag-erro" role="alert"></p>' +
      '<div class="linha-botoes"><button class="btn btn-laranja" id="gv-agendar"' + (ok ? '' : ' disabled') + '>' + (p.agenda ? 'Remarcar' : 'Agendar') + '</button>' +
      (p.agenda ? '<button class="btn" id="gv-desagendar">Tirar da agenda</button>' : '') + '</div>';
    if (p.materiais.length || p.material_nao_sei) {
      var ents = S.entregas.filter(function (e) { return e.codigo === p.codigo; });
      h += '<h3 style="margin-top:18px">Entregas de material deste pedido</h3>';
      h += ents.length ? '<ul class="hist">' + ents.map(function (e) { return '<li><time>' + esc(dataCurta(e.dia)) + '</time>' + esc(e.carradas + ' carradas de ' + (MAT[e.material] ? MAT[e.material].nome : e.material) + ' · ' + nomeRec(e.recurso) + ' · ' + ESTADOS_ENT.find(function (s) { return s[0] === e.estado; })[1]) + '</li>'; }).join('') + '</ul>' : '<p class="vazio">Nenhuma entrega programada.</p>';
      h += '<div class="campos" style="margin-top:10px"><label class="campo"><span>Dia</span><input type="date" id="gv-e-dia" value="' + soma(hoje(), 1) + '"></label>' +
        '<label class="campo"><span>Material</span><select id="gv-e-mat">' + CFG.materiais.map(function (m) { var tem = p.materiais.some(function (x) { return x.id === m.id; }); return '<option value="' + m.id + '"' + (tem ? ' selected' : '') + '>' + m.nome + '</option>'; }).join('') + '</select></label>' +
        '<label class="campo"><span>Carradas</span><input type="number" id="gv-e-qtd" min="1" max="50" value="1"></label>' +
        '<label class="campo"><span>Caçamba</span><select id="gv-e-rec">' + S.recursos.map(function (r) { return '<option value="' + esc(r.id) + '"' + (r.tipo === 'cacamba' ? ' selected' : '') + '>' + esc(nomeRec(r.id)) + '</option>'; }).join('') + '</select></label></div>' +
        '<div class="linha-botoes"><button class="btn btn-escuro" id="gv-e-add"' + (ok ? '' : ' disabled') + '>Programar entrega</button></div>';
    }
    h += '</section>';

    // fechamento
    h += '<section class="bloco"><h3>Fechamento</h3><label class="campo"><span>Medição e conferência com o cliente</span><textarea id="gv-medicao" placeholder="Ex.: 3 carradas conferidas na descarga; nível conferido na trena com o cliente">' + esc(p.medicao) + '</textarea></label>' +
      '<div class="linha-botoes"><button class="btn btn-escuro" id="gv-concluir">Concluir: medido e conferido</button></div>' +
      '<label class="campo" style="margin-top:14px"><span>Motivo da perda</span><input id="gv-motivo" value="' + esc(p.motivo_perda) + '" placeholder="Ex.: achou mais barato, adiou a obra, fora da área"></label>' +
      '<div class="linha-botoes"><button class="btn btn-perigo" id="gv-perder">Marcar como perdido</button></div></section>';

    // histórico
    h += '<section class="bloco"><h3>Histórico</h3><ul class="hist">' + p.historico.slice().reverse().map(function (x) {
      return '<li><time>' + esc(dataHora(x.em)) + '</time>' + esc(x.txt) + '</li>';
    }).join('') + '</ul></section></div>';

    $('#gaveta-in').innerHTML = h;
    ligaGaveta(p);
  }
  function ligaGaveta(p) {
    $('#gv-fechar').addEventListener('click', function () { $('#gaveta').close(); });
    fotosUrls(p).then(function (urls) {
      var box = $('#gv-fotos'); if (!urls.length) return;
      box.innerHTML = urls.map(function (u, i) { return '<button data-zoom="' + i + '" aria-label="Ampliar foto ' + (i + 1) + '"><img src="' + esc(u) + '" alt="Foto do terreno ' + (i + 1) + '"></button>'; }).join('');
      $$('[data-zoom]', box).forEach(function (b) { b.addEventListener('click', function () { zoom(urls, +b.dataset.zoom); }); });
    });
    $$('.gv-etapas button').forEach(function (b) { b.addEventListener('click', function () { mudaEtapa(p, b.dataset.etapa); }); });
    var msg = $('#gv-msg'), wa = $('#gv-wa');
    function atualizaWa() { wa.href = linkWa(p, msg.value); }
    atualizaWa();
    msg.addEventListener('input', atualizaWa);
    $('#gv-modelo').addEventListener('change', function () { msg.value = msgPadrao(p, this.value); atualizaWa(); });
    wa.addEventListener('click', function () { marcaRespondido(p); registra(p, 'Mensagem enviada: ' + $('#gv-modelo').selectedOptions[0].textContent); salvaPedido(p); setTimeout(function () { pintaGaveta(); desenha(); }, 300); });
    function leValores() {
      p.valor_centavos = paraCent($('#gv-valor').value); p.pagamento = $('#gv-pag').value;
      p.sinal_centavos = paraCent($('#gv-sinal').value); p.sinal_pago = $('#gv-sinal-pago').checked;
    }
    $('#gv-salva-valor').addEventListener('click', function () { leValores(); registra(p, 'Valores atualizados' + (p.valor_centavos ? ': ' + reais(p.valor_centavos) : '')); salvaPedido(p); toast('Valores salvos'); pintaGaveta(); desenha(); });
    var env = $('#gv-enviado');
    if (env) env.addEventListener('click', function () {
      leValores();
      if (!p.valor_centavos) { toast('Coloque o valor do orçamento antes.'); $('#gv-valor').focus(); return; }
      marcaRespondido(p); p.etapa = 'enviado'; registra(p, 'Orçamento enviado por escrito: ' + reais(p.valor_centavos)); salvaPedido(p);
      $('#gv-modelo').value = 'orcamento'; toast('Movido para "Orçamento enviado"'); pintaGaveta(); desenha();
    });
    $$('[data-chk]').forEach(function (c) {
      c.addEventListener('change', function () {
        p.check[c.dataset.chk] = c.checked; registra(p, (c.checked ? 'Confirmado: ' : 'Desmarcado: ') + { maquina: 'máquina', operador: 'operador', material: 'material' }[c.dataset.chk]);
        salvaPedido(p); pintaGaveta(); $('#gv-prog').scrollIntoView({ block: 'start' }); desenha();
      });
    });
    $('#gv-agendar').addEventListener('click', function () {
      var er = $('#gv-ag-erro');
      if (!checkOk(p)) { er.textContent = 'Confirme máquina, operador e material antes de marcar a data.'; return; }
      var rec = $('#gv-rec').value, ini = $('#gv-ini').value, dias = Math.max(1, Math.min(15, +$('#gv-dias').value || 1));
      if (!ini) { er.textContent = 'Escolha o dia de início.'; return; }
      var fim = soma(ini, dias - 1);
      var choque = S.pedidos.find(function (o) { return o !== p && o.agenda && o.agenda.recurso === rec && o.etapa !== 'perdido' && o.etapa !== 'concluido' && o.agenda.inicio <= fim && soma(o.agenda.inicio, o.agenda.dias - 1) >= ini; });
      if (choque) { er.textContent = nomeRec(rec) + ' já está com ' + choque.nome + ' (' + choque.codigo + ') a partir de ' + dataCurta(choque.agenda.inicio) + '. Escolha outra data ou outra máquina.'; return; }
      p.agenda = { recurso: rec, inicio: ini, dias: dias };
      if (['novo', 'visita', 'enviado', 'aprovado'].indexOf(p.etapa) >= 0) p.etapa = 'agendado';
      p.valor_fechado = true;
      registra(p, 'Agendado: ' + nomeRec(rec) + ', ' + dataCurta(ini) + (dias > 1 ? ' (' + dias + ' dias)' : '') + ', com máquina, operador e material confirmados');
      salvaPedido(p); toast('Agendado em ' + dataCurta(ini)); pintaGaveta(); desenha();
    });
    var des = $('#gv-desagendar');
    if (des) des.addEventListener('click', function () { p.agenda = null; if (p.etapa === 'agendado') p.etapa = 'aprovado'; registra(p, 'Tirado da agenda'); salvaPedido(p); pintaGaveta(); desenha(); });
    var eadd = $('#gv-e-add');
    if (eadd) eadd.addEventListener('click', function () {
      if (!checkOk(p)) return;
      var e = { id: 'novo' + Date.now(), codigo: p.codigo, dia: $('#gv-e-dia').value, material: $('#gv-e-mat').value, carradas: Math.max(1, +$('#gv-e-qtd').value || 1),
        destino: lugar(p) + ' · ' + (p.local.referencia || ''), recurso: $('#gv-e-rec').value, estado: 'programada' };
      if (!e.dia) { toast('Escolha o dia da entrega.'); return; }
      S.entregas.push(e); salvaEntrega(e);
      if (['novo', 'visita', 'enviado', 'aprovado'].indexOf(p.etapa) >= 0) p.etapa = 'agendado';
      registra(p, 'Entrega programada: ' + e.carradas + ' carradas de ' + MAT[e.material].nome + ' em ' + dataCurta(e.dia));
      salvaPedido(p); toast('Entrega programada'); pintaGaveta(); desenha();
    });
    $('#gv-concluir').addEventListener('click', function () {
      var m = $('#gv-medicao').value.trim();
      if (!m) { toast('Escreva como foi medido e conferido com o cliente.'); $('#gv-medicao').focus(); return; }
      p.medicao = m; p.etapa = 'concluido'; p.valor_fechado = true; registra(p, 'Concluído: medido e conferido com o cliente'); salvaPedido(p); toast('Pedido concluído'); pintaGaveta(); desenha();
    });
    $('#gv-perder').addEventListener('click', function () {
      var m = $('#gv-motivo').value.trim();
      if (!m) { toast('Diga o motivo da perda (ajuda no relatório).'); $('#gv-motivo').focus(); return; }
      p.motivo_perda = m; p.etapa = 'perdido'; p.valor_fechado = false; registra(p, 'Perdido: ' + m); salvaPedido(p); toast('Marcado como perdido'); pintaGaveta(); desenha();
    });
  }
  function mudaEtapa(p, e) {
    if (e === p.etapa) return;
    if (e === 'agendado' && !(checkOk(p) && p.agenda)) { toast('Para agendar: confirme máquina, operador e material e marque a data.'); $('#gv-prog').scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
    if (e === 'concluido') { toast('Use "Concluir: medido e conferido" no fim do pedido.'); $('#gv-medicao').focus(); return; }
    if (e === 'perdido') { toast('Diga o motivo e use "Marcar como perdido".'); $('#gv-motivo').focus(); return; }
    if (e !== 'novo') marcaRespondido(p);
    p.etapa = e; p.valor_fechado = FECHADAS.indexOf(e) >= 0;
    registra(p, 'Etapa: ' + ETAPA[e].nome); salvaPedido(p); toast('Movido para "' + ETAPA[e].nome + '"'); pintaGaveta(); desenha();
  }

  /* zoom das fotos */
  var zLista = [], zI = 0;
  function zoom(urls, i) { zLista = urls; zI = i; pintaZoom(); $('#zoom').showModal(); }
  function pintaZoom() { $('#zoom-img').src = zLista[zI]; $('#zoom-img').alt = 'Foto ' + (zI + 1) + ' de ' + zLista.length; $('#zoom-cont').textContent = (zI + 1) + ' de ' + zLista.length; }
  $('#zoom-fechar').addEventListener('click', function () { $('#zoom').close(); });
  $('#zoom-ant').addEventListener('click', function () { zI = (zI - 1 + zLista.length) % zLista.length; pintaZoom(); });
  $('#zoom-prox').addEventListener('click', function () { zI = (zI + 1) % zLista.length; pintaZoom(); });

  /* ---------------- agenda ---------------- */
  function agenda() {
    var ini = inicioSemana(semanaOff), dias = [0, 1, 2, 3, 4, 5, 6].map(function (i) { return soma(ini, i); }), h = hoje();
    var html = '<div class="cab-aba"><h1>Agenda da semana</h1><div class="dir semana-nav"><button class="btn" id="sem-ant" aria-label="Semana anterior">‹ Anterior</button><strong>' +
      esc(dataCurta(dias[0]) + ' a ' + dataCurta(dias[6])) + '</strong><button class="btn" id="sem-prox" aria-label="Próxima semana">Próxima ›</button>' +
      (semanaOff ? '<button class="btn" id="sem-hoje">Esta semana</button>' : '') + '</div>' +
      '<p>Programação por máquina e caçamba. Nomes genéricos: <strong>frota real a confirmar</strong> (edite em Equipamentos).</p></div>';
    html += '<p class="regra">Regra da DAMARCO: a data só é marcada com <strong>máquina, operador e material confirmados</strong>. O botão de agendar só libera com os três marcados.</p>';
    html += '<div class="legenda"><span><i style="background:#141414"></i>Obra agendada</span><span><i style="background:#f7841f"></i>Em execução</span><span><i style="background:#e5f0fa;border-color:#0b4f8a"></i>Entrega de material</span></div>';
    function itens(r, d) {
      var out = '';
      S.pedidos.forEach(function (p) {
        if (p.agenda && p.agenda.recurso === r.id && ocupaDia(p, d) && p.etapa !== 'perdido') {
          var n = Math.round((new Date(d) - new Date(p.agenda.inicio)) / 86400000) + 1;
          out += '<button class="ag-item ' + (p.etapa === 'execucao' ? 'ag-exec' : 'ag-obra') + '" data-abre="' + p.codigo + '"><strong>' + esc(primeiroNome(p.nome)) + (p.agenda.dias > 1 ? ' · dia ' + n + '/' + p.agenda.dias : '') + '</strong>' +
            esc(p.servicos.length ? p.servicos.map(function (s) { return SERV[s].nome; }).join(', ') : oQue(p)) + '<br>' + esc(lugar(p)) + (p.etapa === 'concluido' ? ' ✓' : '') + '</button>';
        }
      });
      S.entregas.forEach(function (e) {
        if (e.recurso === r.id && e.dia === d) out += '<button class="ag-item ag-entrega" data-abre="' + e.codigo + '"><strong>' + esc(e.carradas + '× ' + (MAT[e.material] ? MAT[e.material].nome : e.material)) + '</strong>' + esc(e.destino.replace(' (exemplo)', '')) + '</button>';
      });
      return out;
    }
    html += '<div class="agenda-grade"><div class="ag-cab">Máquina / equipe</div>' + dias.map(function (d) { return '<div class="ag-cab' + (d === h ? ' hoje' : '') + '">' + esc(dataCurta(d)) + (d === h ? ' · hoje' : '') + '</div>'; }).join('');
    S.recursos.forEach(function (r) {
      html += '<div class="ag-rec">' + esc(r.nome) + (r.aConfirmar ? '<small>' + selo('a confirmar', 'conf') + '</small>' : '') + '</div>';
      dias.forEach(function (d) { html += '<div class="ag-dia' + (d === h ? ' hoje' : '') + (new Date(d + 'T12:00').getDay() === 0 ? ' domingo' : '') + '">' + itens(r, d) + '</div>'; });
    });
    html += '</div><div class="agenda-cel">';
    dias.forEach(function (d) {
      var corpo = S.recursos.map(function (r) { var it = itens(r, d); return it ? '<h3 style="margin:10px 0 6px">' + esc(nomeRec(r.id)) + '</h3>' + it : ''; }).join('');
      html += '<section class="painel"' + (d === h ? ' style="border-color:#141414;box-shadow:inset 0 5px 0 #f7841f"' : '') + '><h2>' + esc(dataCurta(d)) + (d === h ? ' · hoje' : '') + '</h2>' + (corpo || '<p class="vazio">Livre.</p>') + '</section>';
    });
    html += '</div>';
    var esp = S.pedidos.filter(function (p) { return p.etapa === 'aprovado'; });
    html += '<section class="painel" style="margin-top:18px"><h2>Aprovados esperando data <span class="cont">' + esp.length + '</span></h2>';
    if (!esp.length) html += '<p class="vazio">Nenhum.</p>';
    esp.forEach(function (p) { html += '<div class="linha-ped"><div class="quem"><strong>' + esc(p.nome) + '</strong><span>' + esc(oQue(p)) + ' · ' + esc(lugar(p)) + '</span></div>' + chkMini(p) + '<div class="acoes"><button class="btn" data-abre="' + p.codigo + '">' + (checkOk(p) ? 'Agendar' : 'Confirmar') + '</button></div></div>'; });
    html += '</section>';
    $('#aba-agenda').innerHTML = html;
    $('#sem-ant').addEventListener('click', function () { semanaOff--; agenda(); });
    $('#sem-prox').addEventListener('click', function () { semanaOff++; agenda(); });
    var sh = $('#sem-hoje'); if (sh) sh.addEventListener('click', function () { semanaOff = 0; agenda(); });
  }

  /* ---------------- entregas ---------------- */
  function entregas() {
    var h = hoje(), ini = inicioSemana(0), fim = soma(ini, 6);
    var prox = S.entregas.filter(function (e) { return e.dia >= h; }).sort(function (a, b) { return a.dia < b.dia ? -1 : 1; });
    var ant = S.entregas.filter(function (e) { return e.dia < h; }).sort(function (a, b) { return a.dia < b.dia ? 1 : -1; });
    var sem = S.entregas.filter(function (e) { return e.dia >= ini && e.dia <= fim; });
    var html = '<div class="cab-aba"><h1>Entregas de material</h1><p>Carradas por dia, material, destino e estado. Cada entrega fica ligada ao pedido.</p></div>';
    html += '<div class="resumo-mat">' + CFG.materiais.map(function (m) {
      var n = sem.filter(function (e) { return e.material === m.id; }).reduce(function (s, e) { return s + (+e.carradas); }, 0);
      return '<div><span>' + esc(m.nome) + ' na semana</span><strong>' + n + ' carr.</strong></div>';
    }).join('') + '</div>';
    function tabela(lista) {
      return '<table class="tabela"><thead><tr><th>Material</th><th>Carradas</th><th>Destino</th><th>Caçamba</th><th>Pedido</th><th>Situação</th></tr></thead><tbody>' + lista.map(function (e) {
        var p = S.pedidos.find(function (x) { return x.codigo === e.codigo; });
        return '<tr><td data-r="Material"><strong>' + esc(MAT[e.material] ? MAT[e.material].nome : e.material) + '</strong></td><td data-r="Carradas"><strong>' + esc(e.carradas) + '</strong></td>' +
          '<td class="largo" data-r="Destino">' + esc(e.destino) + '</td><td data-r="Caçamba">' + esc(nomeRec(e.recurso)) + '</td>' +
          '<td data-r="Pedido">' + (p ? '<button class="btn-link" data-abre="' + p.codigo + '">' + esc(primeiroNome(p.nome) + ' · ' + p.codigo) + '</button>' : esc(e.codigo)) + '</td>' +
          '<td class="largo" data-r="Situação"><select data-estado="' + esc(e.id) + '" aria-label="Situação da entrega">' + ESTADOS_ENT.map(function (s) { return '<option value="' + s[0] + '"' + (e.estado === s[0] ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select></td></tr>';
      }).join('') + '</tbody></table>';
    }
    var porDia = {};
    prox.forEach(function (e) { (porDia[e.dia] = porDia[e.dia] || []).push(e); });
    if (!prox.length) html += '<section class="painel"><p class="vazio">Nenhuma entrega programada. Programe pelo pedido (bloco Programação).</p></section>';
    Object.keys(porDia).forEach(function (d) {
      var l = porDia[d];
      html += '<section class="painel dia-entregas"><h2>' + esc(dataCurta(d)) + (d === h ? ' · hoje' : '') + ' <span class="cont">' + l.reduce(function (s, e) { return s + (+e.carradas); }, 0) + ' carradas</span></h2>' + tabela(l) + '</section>';
    });
    if (ant.length) html += '<details class="painel"><summary><strong>Entregas anteriores (' + ant.length + ')</strong></summary>' + tabela(ant) + '</details>';
    $('#aba-entregas').innerHTML = html;
    $$('[data-estado]').forEach(function (s) {
      s.addEventListener('change', function () {
        var e = S.entregas.find(function (x) { return String(x.id) === s.dataset.estado; }); e.estado = s.value; salvaEntrega(e);
        var p = S.pedidos.find(function (x) { return x.codigo === e.codigo; });
        if (p) { registra(p, 'Entrega ' + dataCurta(e.dia) + ': ' + s.selectedOptions[0].textContent); if (s.value === 'saiu' && p.etapa === 'agendado') p.etapa = 'execucao'; salvaPedido(p); }
        toast('Situação atualizado');
      });
    });
  }

  /* ---------------- relatório ---------------- */
  function relatorio() {
    var h = hoje(), desde = periodo === 'mes' ? h.slice(0, 8) + '01' : periodo === '30' ? soma(h, -30) : '0000';
    var L = S.pedidos.filter(function (p) { return diaDe(p.criado_em) >= desde; });
    var fech = L.filter(function (p) { return FECHADAS.indexOf(p.etapa) >= 0; });
    var perd = L.filter(function (p) { return p.etapa === 'perdido'; });
    var decididos = fech.length + perd.length;
    var ticket = fech.length ? fech.reduce(function (s, p) { return s + p.valor_centavos; }, 0) / fech.length : 0;
    var resp = L.filter(function (p) { return p.respondido_em; });
    var mesmoDia = resp.filter(function (p) { return diaDe(p.respondido_em) === diaDe(p.criado_em); });
    var html = '<div class="cab-aba"><h1>Relatório</h1><div class="dir"><label class="visualmente-oculto" for="r-per">Período</label><select id="r-per" class="btn"><option value="mes">Este mês</option><option value="30">Últimos 30 dias</option><option value="tudo">Tudo</option></select></div>' +
      '<p>' + L.length + ' pedidos no período' + (CFG.modoDemo ? ' · valores de exemplo' : '') + '.</p></div>';
    html += '<div class="numeros">' +
      kpi('funil', 'Conversão', decididos ? Math.round(fech.length / decididos * 100) + '%' : '—', fech.length + ' fechados de ' + decididos + ' decididos', 'destaque') +
      kpi('funil', 'Ticket médio', ticket ? reais(ticket) : '—', 'por pedido fechado', '', true) +
      kpi('geral', 'Resposta no mesmo dia', resp.length ? Math.round(mesmoDia.length / resp.length * 100) + '%' : '—', mesmoDia.length + ' de ' + resp.length + ' respondidos', mesmoDia.length < resp.length ? 'atraso' : '') +
      kpi('funil', 'Fechado', reais(fech.reduce(function (s, p) { return s + p.valor_centavos; }, 0)), 'orçado: ' + reais(L.reduce(function (s, p) { return s + p.valor_centavos; }, 0)), '', true) + '</div>';
    function barras(titulo, pares) {
      var max = Math.max.apply(null, pares.map(function (x) { return x[1]; }).concat([1]));
      return '<section class="painel"><h2>' + esc(titulo) + '</h2><div class="barras">' + pares.map(function (x) {
        return '<div class="barra-l"><span>' + esc(x[0]) + '</span><div class="trilho"><div class="enche" style="width:' + (x[1] / max * 100) + '%"></div></div><b>' + x[1] + '</b></div>';
      }).join('') + '</div></section>';
    }
    var porServ = CFG.servicos.map(function (s) { return [s.nome, L.filter(function (p) { return p.servicos.indexOf(s.id) >= 0; }).length]; }).sort(function (a, b) { return b[1] - a[1]; });
    var porMat = CFG.materiais.map(function (m) { return [m.nome, L.filter(function (p) { return p.materiais.some(function (x) { return x.id === m.id; }); }).length]; })
      .concat([['Não sabia qual', L.filter(function (p) { return p.material_nao_sei; }).length]]);
    var porOrig = CFG.origens.map(function (o) { return [o, L.filter(function (p) { return p.origem === o; }).length]; });
    var porEtapa = CFG.etapas.map(function (e) { return [e.nome, L.filter(function (p) { return p.etapa === e.id; }).length]; });
    var convOrig = CFG.origens.map(function (o) { var t = L.filter(function (p) { return p.origem === o; }); var f = t.filter(function (p) { return FECHADAS.indexOf(p.etapa) >= 0; }); return [o, t.length ? Math.round(f.length / t.length * 100) : 0]; });
    html += '<div class="grade-3">' + barras('Pedidos por serviço', porServ) + barras('Pedidos por material', porMat) + barras('Origem dos pedidos', porOrig) + '</div>';
    html += '<div class="grade-2">' + barras('Funil do período', porEtapa) + barras('Conversão por origem (%)', convOrig) + '</div>';
    if (perd.length) html += '<section class="painel"><h2>Por que perdemos</h2><ul class="hist">' + perd.map(function (p) { return '<li><time>' + esc(p.codigo) + '</time>' + esc(p.motivo_perda || 'sem motivo') + '</li>'; }).join('') + '</ul></section>';
    $('#aba-relatorio').innerHTML = html;
    $('#r-per').value = periodo;
    $('#r-per').addEventListener('change', function () { periodo = this.value; relatorio(); });
  }

  /* ---------------- equipamentos ---------------- */
  function equipamentos() {
    var html = '<div class="cab-aba"><h1>Equipamentos</h1><p>Máquinas, caçambas e equipes que aparecem na agenda. Os nomes da demo são genéricos: <strong>a frota real da DAMARCO está a confirmar</strong>.</p></div>';
    html += '<section class="painel">' + S.recursos.map(function (r, i) {
      return '<div class="linha-ped"><label class="campo" style="flex:1 1 220px"><span>Nome</span><input data-rn="' + i + '" value="' + esc(r.nome) + '"></label>' +
        '<label class="campo"><span>Tipo</span><select data-rt="' + i + '"><option value="maquina"' + (r.tipo === 'maquina' ? ' selected' : '') + '>Máquina</option><option value="cacamba"' + (r.tipo === 'cacamba' ? ' selected' : '') + '>Caçamba / caminhão</option><option value="equipe"' + (r.tipo === 'equipe' ? ' selected' : '') + '>Equipe</option></select></label>' +
        '<label class="campo-check"><input type="checkbox" data-rc="' + i + '"' + (r.aConfirmar ? ' checked' : '') + '> A confirmar</label>' +
        '<button class="btn btn-perigo" data-rx="' + i + '">Remover</button></div>';
    }).join('') + '<div class="linha-botoes"><button class="btn" id="rec-add">+ Adicionar equipamento</button><button class="btn btn-escuro" id="rec-salva">Salvar</button></div></section>';
    $('#aba-equipamentos').innerHTML = html;
    function le() {
      $$('[data-rn]').forEach(function (i) { S.recursos[+i.dataset.rn].nome = i.value.trim() || 'Sem nome'; });
      $$('[data-rt]').forEach(function (i) { S.recursos[+i.dataset.rt].tipo = i.value; });
      $$('[data-rc]').forEach(function (i) { S.recursos[+i.dataset.rc].aConfirmar = i.checked; });
    }
    $('#rec-add').addEventListener('click', function () { le(); S.recursos.push({ id: 'r' + Date.now(), nome: 'Novo equipamento', tipo: 'maquina', aConfirmar: true }); equipamentos(); });
    $('#rec-salva').addEventListener('click', function () { le(); salvaRecursos(); toast('Equipamentos salvos'); });
    $$('[data-rx]').forEach(function (b) {
      b.addEventListener('click', function () {
        var r = S.recursos[+b.dataset.rx];
        var usa = S.pedidos.some(function (p) { return p.agenda && p.agenda.recurso === r.id && p.agenda.inicio >= hoje(); }) || S.entregas.some(function (e) { return e.recurso === r.id && e.dia >= hoje(); });
        if (usa) { toast(r.nome + ' tem obra ou entrega marcada. Remarque antes de remover.'); return; }
        le(); S.recursos.splice(+b.dataset.rx, 1); salvaRecursos(); equipamentos();
      });
    });
  }

  /* ---------------- cliques gerais ---------------- */
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest('[data-abre]'); if (a) { ev.preventDefault(); abre(a.dataset.abre); return; }
    var v = ev.target.closest('[data-vai]');
    if (v) { var d = v.dataset.vai; if (d === 'responder') { var pr = $('#p-responder'); if (pr) pr.scrollIntoView({ behavior: 'smooth' }); return; } vaiPara(d); return; }
    var w = ev.target.closest('[data-wa1]');
    if (w) { var p = S.pedidos.find(function (x) { return x.codigo === w.dataset.wa1; }); if (p) { marcaRespondido(p); setTimeout(desenha, 300); } }
  });
  $('#gaveta').addEventListener('click', function (e) { if (e.target === this) this.close(); });

  /* ---------------- início ---------------- */
  function comeca() {
    var salva = null; try { salva = sessionStorage.getItem('dm_aba'); } catch (e) {}
    var q = new URLSearchParams(location.search);
    carrega().then(function () {
      vaiPara(q.get('aba') || salva || 'geral');
      if (q.get('pedido')) abre(q.get('pedido'));
    }).catch(function (e) { toast('Erro ao carregar: ' + (e.message || e)); });
  }
  if (CFG.modoDemo) {
    $('#selo-demo').hidden = false; $('#aviso-demo').hidden = false;
    $('#btn-zerar').addEventListener('click', function () {
      Object.keys(localStorage).filter(function (k) { return k.indexOf('dm_') === 0; }).forEach(function (k) { localStorage.removeItem(k); });
      location.reload();
    });
    comeca();
  } else {
    sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey);
    sb.auth.getSession().then(function (r) {
      if (r.data.session) { $('#btn-sair').hidden = false; comeca(); }
      else { $('#login').hidden = false; $('#conteudo').hidden = true; $('#abas').hidden = true; }
    });
    $('#form-login').addEventListener('submit', function (e) {
      e.preventDefault();
      sb.auth.signInWithPassword({ email: $('#lg-email').value.trim(), password: $('#lg-senha').value }).then(function (r) {
        if (r.error) { $('#lg-erro').textContent = 'E-mail ou senha não conferem.'; return; }
        location.reload();
      });
    });
    $('#btn-sair').addEventListener('click', function () { sb.auth.signOut().then(function () { location.reload(); }); });
  }
})();
