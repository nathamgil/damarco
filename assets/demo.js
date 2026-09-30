/* =====================================================================
   Dados de EXEMPLO do modo demonstração (site e painel).
   Só roda com o Supabase desligado. Clientes, valores e locais são
   fictícios e marcados "(exemplo)" — NÃO são preços nem obras da DAMARCO.
   Chaves: dm_pedidos, dm_entregas, dm_recursos (prefixo dm_).
   ===================================================================== */
(function () {
  'use strict';
  var CFG = window.DM;
  if (!CFG || !CFG.modoDemo) return;
  var VERSAO = 'dm_demo_semeado_v1';
  try { if (localStorage.getItem(VERSAO)) return; } catch (e) { return; }

  var BASE = { lat: -10.9630, lng: -38.7880 };   // referência aproximada de Tucano/BA, só para o mapa da demo
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function dia(off) { var d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + off); if (d.getDay() === 0) d.setDate(d.getDate() + (off < 0 ? -1 : 1)); return iso(d); }
  function quando(off, h, m) {
    var agora = new Date(), d = new Date(); d.setDate(d.getDate() + off); d.setHours(h, m || 0, 0, 0);
    if (d > agora) d = new Date(agora.getTime() - (n + 1) * 23 * 60000);   // demo aberta de madrugada: nada no futuro
    return d.toISOString();
  }
  function mais(isoStr, horas) { var t = Math.min(new Date(isoStr).getTime() + horas * 3600000, Date.now() - 5 * 60000); return new Date(Math.max(t, new Date(isoStr).getTime())).toISOString(); }

  var n = 0;
  function P(o) {
    n++;
    var criado = quando(o.criado[0], o.criado[1], o.criado[2] || 12);
    var c = (o.check || '');
    var p = {
      codigo: 'EX' + (1000 + n), criado_em: criado, exemplo: true,
      tipo: o.tipo, servicos: o.serv || [], terreno: o.terreno ? { tamanho: o.terreno[0], situacao: o.terreno[1], acesso: o.terreno[2] } : null,
      materiais: (o.mat || []).map(function (m) { return { id: m[0], qtd: m[1] }; }),
      material_nao_sei: !!o.uso, uso: o.uso || '', obs: o.obs || '',
      local: { zona: o.local[0], cidade: o.local[1], referencia: o.local[2] + ' (exemplo)',
        lat: o.gps ? +(BASE.lat + o.gps[0]).toFixed(5) : null, lng: o.gps ? +(BASE.lng + o.gps[1]).toFixed(5) : null },
      fotos: o.fotos || [], prazo: o.prazo, nome: o.nome + ' (exemplo)', telefone: '7590000' + String(1000 + n).slice(-4),
      origem: o.origem, etapa: o.etapa, respondido_em: o.resp != null ? mais(criado, o.resp) : null,
      valor_centavos: (o.valor || 0) * 100, valor_fechado: ['aprovado', 'agendado', 'execucao', 'concluido'].indexOf(o.etapa) >= 0,
      pagamento: o.pag || '', sinal_centavos: (o.sinal || 0) * 100, sinal_pago: !!o.sinalPago,
      check: { maquina: c.indexOf('M') >= 0, operador: c.indexOf('O') >= 0, material: c.indexOf('A') >= 0 },
      agenda: o.agenda ? { recurso: o.agenda[0], inicio: dia(o.agenda[1]), dias: o.agenda[2] } : null,
      medicao: o.medicao || '', motivo_perda: o.motivo || '',
      historico: [{ em: criado, txt: 'Pedido recebido (' + o.origem + ')' }]
    };
    if (p.respondido_em) p.historico.push({ em: p.respondido_em, txt: 'Primeira resposta ao cliente' });
    if (o.etapa === 'visita') p.historico.push({ em: mais(criado, 26), txt: 'Visita para medir marcada' });
    if (['enviado', 'aprovado', 'agendado', 'execucao', 'concluido', 'perdido'].indexOf(o.etapa) >= 0 && o.valor) p.historico.push({ em: mais(criado, 30), txt: 'Orçamento enviado por escrito' });
    if (['aprovado', 'agendado', 'execucao', 'concluido'].indexOf(o.etapa) >= 0) p.historico.push({ em: mais(criado, 60), txt: 'Cliente aprovou o orçamento' });
    if (p.agenda) p.historico.push({ em: mais(criado, 70), txt: 'Agendado com máquina, operador e material confirmados' });
    if (o.etapa === 'concluido') p.historico.push({ em: mais(criado, 150), txt: 'Medido e conferido com o cliente' });
    return p;
  }

  var pedidos = [
    // NOVOS — dois de hoje e um de ontem ainda sem resposta (atrasado)
    P({ nome: 'Josué A.', origem: 'Site', tipo: 'servico', serv: ['limpeza', 'terraplanagem'], terreno: ['Lote médio (300 a 1.000 m²)', 'Com mato', 'Sim, chega'],
        local: ['Cidade', 'Tucano', 'Rua de trás do mercado'], gps: [0.004, -0.003], fotos: ['fotos/retro-terreno.jpg', 'fotos/escavacao.jpg'], prazo: 'O quanto antes', etapa: 'novo', criado: [0, 8, 40],
        obs: 'Quero limpar e deixar no nível para construir a casa' }),
    P({ nome: 'Dona Lurdes', origem: 'WhatsApp', tipo: 'material', mat: [['lavada', '2'], ['brita', '2']], local: ['Cidade', 'Tucano', 'Perto da igreja'],
        prazo: 'Nos próximos 15 dias', etapa: 'novo', criado: [0, 10, 5], obs: 'Laje da cozinha' }),
    P({ nome: 'Everaldo S.', origem: 'Instagram', tipo: 'servico', serv: ['aceiros'], terreno: ['Mais de 1 hectare', 'Com mato', 'Chega com dificuldade'],
        local: ['Zona rural', 'Tucano, zona rural', 'Fazenda depois da porteira azul'], gps: [-0.061, 0.052], fotos: ['fotos/retro-terreno.jpg'], prazo: 'O quanto antes', etapa: 'novo', criado: [-1, 16, 20] }),
    P({ nome: 'Rosângela M.', origem: 'Site', tipo: 'material', uso: 'Encher o quintal que alaga quando chove', mat: [], local: ['Cidade', 'Tucano', 'Rua do posto'],
        prazo: 'Neste mês ou no próximo', etapa: 'novo', criado: [0, 11, 30] }),
    P({ nome: 'Genivaldo P.', origem: 'Indicação', tipo: 'ambos', serv: ['acessos'], terreno: ['Área grande (1.000 m² a 1 hectare)', 'Com desnível', 'Não chega'], mat: [['cascalho', '10+']],
        local: ['Zona rural', 'Tucano, zona rural', 'Estrada da roça, 3 km depois da ponte'], gps: [0.045, 0.071], prazo: 'Nos próximos 15 dias', etapa: 'novo', criado: [0, 7, 55], resp: 1 }),

    // VISITA / MEDIÇÃO
    P({ nome: 'Marcos V.', origem: 'Instagram', tipo: 'servico', serv: ['acude'], terreno: ['Área grande (1.000 m² a 1 hectare)', 'Com mato', 'Chega com dificuldade'],
        local: ['Zona rural', 'Tucano, zona rural', 'Sítio do lado da escola rural'], gps: [-0.083, -0.041], fotos: ['fotos/escavacao.jpg'], prazo: 'Neste mês ou no próximo', etapa: 'visita', criado: [-3, 9], resp: 2 }),
    P({ nome: 'Célia R.', origem: 'Site', tipo: 'servico', serv: ['terraplanagem'], terreno: ['Lote pequeno (até 300 m²)', 'Com desnível', 'Sim, chega'],
        local: ['Cidade', 'Tucano', 'Loteamento novo, rua 4'], gps: [0.009, 0.006], fotos: ['fotos/retro-chao.jpg'], prazo: 'Nos próximos 15 dias', etapa: 'visita', criado: [-2, 14], resp: 3 }),
    P({ nome: 'Associação rural', origem: 'Indicação', tipo: 'servico', serv: ['acessos', 'limpeza'], terreno: ['Mais de 1 hectare', 'Com mato', 'Chega com dificuldade'],
        local: ['Zona rural', 'Cidade vizinha', 'Estrada da associação'], gps: [0.12, -0.09], prazo: 'Neste mês ou no próximo', etapa: 'visita', criado: [-4, 10], resp: 5 }),

    // ORÇAMENTO ENVIADO
    P({ nome: 'Paulo H.', origem: 'Site', tipo: 'ambos', serv: ['terraplanagem', 'entulho'], terreno: ['Lote médio (300 a 1.000 m²)', 'Com entulho', 'Sim, chega'], mat: [['levante', '6']],
        local: ['Cidade', 'Tucano', 'Atrás do ginásio'], gps: [-0.006, 0.004], fotos: ['fotos/retro-chao.jpg', 'fotos/carga-caminhao.jpg'], prazo: 'Nos próximos 15 dias', etapa: 'enviado', criado: [-5, 9], resp: 2, valor: 4800 }),
    P({ nome: 'Construtora local', origem: 'WhatsApp', tipo: 'material', mat: [['brita', '8'], ['lavada', '8']], local: ['Cidade', 'Tucano', 'Obra da rua principal'],
        prazo: 'O quanto antes', etapa: 'enviado', criado: [-2, 8], resp: 1, valor: 7200 }),
    P({ nome: 'Seu Antônio', origem: 'Indicação', tipo: 'servico', serv: ['limpeza'], terreno: ['Área grande (1.000 m² a 1 hectare)', 'Com mato', 'Sim, chega'],
        local: ['Zona rural', 'Tucano, zona rural', 'Roça do Seu Antônio, pé da serra'], gps: [0.07, -0.02], prazo: 'Ainda estou pesquisando', etapa: 'enviado', criado: [-8, 15], resp: 4, valor: 2600 }),
    P({ nome: 'Irene C.', origem: 'Instagram', tipo: 'material', mat: [['cascalho', '3']], local: ['Cidade', 'Tucano', 'Garagem do lado da farmácia'],
        prazo: 'Nos próximos 15 dias', etapa: 'enviado', criado: [-1, 13], resp: 2, valor: 1350 }),

    // APROVADO — aguardando checklist para agendar
    P({ nome: 'Fábio L.', origem: 'Site', tipo: 'servico', serv: ['escavacao'], terreno: ['Lote pequeno (até 300 m²)', 'Limpo', 'Sim, chega'],
        local: ['Cidade', 'Tucano', 'Rua da feira'], gps: [0.002, -0.008], fotos: ['fotos/escavacao.jpg'], prazo: 'O quanto antes', etapa: 'aprovado', criado: [-6, 9], resp: 2, valor: 1900, pag: 'Pix', sinal: 500, sinalPago: true, check: 'MO' }),
    P({ nome: 'Neide F.', origem: 'WhatsApp', tipo: 'material', mat: [['levante', '5']], local: ['Cidade', 'Tucano', 'Casa amarela da esquina'],
        prazo: 'Nos próximos 15 dias', etapa: 'aprovado', criado: [-4, 11], resp: 1, valor: 1750, pag: 'Dinheiro', check: 'M' }),
    P({ nome: 'Chácara do Sr. Nilo', origem: 'Instagram', tipo: 'ambos', serv: ['terraplanagem'], terreno: ['Área grande (1.000 m² a 1 hectare)', 'Com desnível', 'Sim, chega'], mat: [['cascalho', '6']],
        local: ['Zona rural', 'Tucano, zona rural', 'Chácara da entrada da cidade'], gps: [-0.02, 0.03], prazo: 'Neste mês ou no próximo', etapa: 'aprovado', criado: [-7, 16], resp: 3, valor: 6400, pag: 'Transferência', sinal: 2000, check: '' }),

    // AGENDADO
    P({ nome: 'Ricardo T.', origem: 'Site', tipo: 'servico', serv: ['terraplanagem', 'limpeza'], terreno: ['Lote médio (300 a 1.000 m²)', 'Com mato', 'Sim, chega'],
        local: ['Cidade', 'Tucano', 'Loteamento novo, rua 2'], gps: [0.011, 0.002], fotos: ['fotos/retro-terreno.jpg'], prazo: 'Nos próximos 15 dias', etapa: 'agendado', criado: [-9, 10], resp: 2, valor: 3900, pag: 'Pix', sinal: 1000, sinalPago: true, check: 'MOA', agenda: ['retro', 2, 2] }),
    P({ nome: 'Fazenda do Zé Carlos', origem: 'Indicação', tipo: 'servico', serv: ['aceiros'], terreno: ['Mais de 1 hectare', 'Com mato', 'Chega com dificuldade'],
        local: ['Zona rural', 'Tucano, zona rural', 'Fazenda da estrada de chão'], gps: [-0.09, 0.08], prazo: 'O quanto antes', etapa: 'agendado', criado: [-10, 8], resp: 1, valor: 5200, pag: 'Transferência', sinal: 1500, sinalPago: true, check: 'MOA', agenda: ['retro', 4, 2] }),
    P({ nome: 'Joana B.', origem: 'Instagram', tipo: 'material', mat: [['cascalho', '4']], local: ['Cidade', 'Tucano', 'Rua do cemitério'],
        prazo: 'Nos próximos 15 dias', etapa: 'agendado', criado: [-5, 14], resp: 1, valor: 1800, pag: 'Pix', check: 'MOA', agenda: ['cacamba1', 1, 1] }),

    // EM EXECUÇÃO
    P({ nome: 'Valdir S.', origem: 'WhatsApp', tipo: 'ambos', serv: ['acessos'], terreno: ['Área grande (1.000 m² a 1 hectare)', 'Com desnível', 'Chega com dificuldade'], mat: [['cascalho', '10']],
        local: ['Zona rural', 'Tucano, zona rural', 'Acesso da roça do Valdir'], gps: [0.05, -0.06], fotos: ['fotos/carga-caminhao.jpg'], prazo: 'O quanto antes', etapa: 'execucao', criado: [-12, 9], resp: 1, valor: 9800, pag: 'Transferência', sinal: 3000, sinalPago: true, check: 'MOA', agenda: ['retro', 0, 2] }),
    P({ nome: 'Obra do galpão', origem: 'Indicação', tipo: 'material', mat: [['brita', '6'], ['lavada', '6']], local: ['Cidade', 'Tucano', 'Galpão perto da saída'],
        prazo: 'O quanto antes', etapa: 'execucao', criado: [-6, 8], resp: 1, valor: 5100, pag: 'Pix', sinal: 1000, sinalPago: true, check: 'MOA', agenda: ['cacamba1', 0, 1] }),

    // CONCLUÍDOS — medidos e conferidos
    P({ nome: 'Luciano P.', origem: 'Site', tipo: 'servico', serv: ['terraplanagem'], terreno: ['Lote pequeno (até 300 m²)', 'Com desnível', 'Sim, chega'],
        local: ['Cidade', 'Tucano', 'Rua nova do bairro'], gps: [0.003, 0.01], prazo: 'Nos próximos 15 dias', etapa: 'concluido', criado: [-20, 10], resp: 2, valor: 2400, pag: 'Pix', sinal: 600, sinalPago: true, check: 'MOA', agenda: ['retro', -14, 1],
        medicao: 'Nivelado conferido com o cliente na trena (exemplo)' }),
    P({ nome: 'Dona Ivone', origem: 'Instagram', tipo: 'material', mat: [['levante', '4']], local: ['Cidade', 'Tucano', 'Casa de muro azul'],
        prazo: 'O quanto antes', etapa: 'concluido', criado: [-16, 9], resp: 1, valor: 1400, pag: 'Dinheiro', check: 'MOA', agenda: ['cacamba1', -13, 1], medicao: '4 carradas entregues e conferidas (exemplo)' }),
    P({ nome: 'Sítio de Dona Cida', origem: 'Indicação', tipo: 'servico', serv: ['acude'], terreno: ['Área grande (1.000 m² a 1 hectare)', 'Com mato', 'Chega com dificuldade'],
        local: ['Zona rural', 'Tucano, zona rural', 'Sítio da baixada'], gps: [-0.05, -0.07], prazo: 'Neste mês ou no próximo', etapa: 'concluido', criado: [-25, 8], resp: 3, valor: 12500, pag: 'Transferência', sinal: 4000, sinalPago: true, check: 'MOA', agenda: ['retro', -9, 3],
        medicao: 'Açude medido e conferido com o dono (exemplo)' }),
    P({ nome: 'Marta G.', origem: 'WhatsApp', tipo: 'material', mat: [['lavada', '3'], ['brita', '2']], local: ['Cidade', 'Tucano', 'Rua da escola'],
        prazo: 'Nos próximos 15 dias', etapa: 'concluido', criado: [-11, 15], resp: 1, valor: 2250, pag: 'Pix', check: 'MOA', agenda: ['cacamba1', -6, 1], medicao: 'Material conferido na descarga (exemplo)' }),

    // PERDIDOS
    P({ nome: 'Carlos E.', origem: 'Site', tipo: 'servico', serv: ['limpeza'], terreno: ['Lote médio (300 a 1.000 m²)', 'Com mato', 'Sim, chega'],
        local: ['Cidade', 'Tucano', 'Lote ao lado da quadra'], prazo: 'Ainda estou pesquisando', etapa: 'perdido', criado: [-14, 11], resp: 2, valor: 1600, motivo: 'Adiou a obra (exemplo)' }),
    P({ nome: 'Edson R.', origem: 'Instagram', tipo: 'material', mat: [['cascalho', '2']], local: ['Zona rural', 'Cidade vizinha', 'Sítio longe da pista'],
        prazo: 'O quanto antes', etapa: 'perdido', criado: [-9, 9], resp: 5, valor: 1100, motivo: 'Fora da área de entrega (exemplo)' })
  ];

  // entregas de material (carradas) — ligadas aos pedidos de material
  var entregas = [
    { id: 'e1', codigo: 'EX1020', dia: dia(0), material: 'brita',    carradas: 3, destino: 'Tucano · Galpão perto da saída (exemplo)', recurso: 'cacamba1', estado: 'entregue' },
    { id: 'e2', codigo: 'EX1020', dia: dia(0), material: 'lavada',   carradas: 3, destino: 'Tucano · Galpão perto da saída (exemplo)', recurso: 'cacamba1', estado: 'saiu' },
    { id: 'e3', codigo: 'EX1019', dia: dia(0), material: 'cascalho', carradas: 4, destino: 'Zona rural · Acesso da roça do Valdir (exemplo)', recurso: 'cacamba1', estado: 'programada' },
    { id: 'e4', codigo: 'EX1018', dia: dia(1), material: 'cascalho', carradas: 4, destino: 'Tucano · Rua do cemitério (exemplo)', recurso: 'cacamba1', estado: 'programada' },
    { id: 'e5', codigo: 'EX1020', dia: dia(1), material: 'brita',    carradas: 3, destino: 'Tucano · Galpão perto da saída (exemplo)', recurso: 'cacamba1', estado: 'programada' },
    { id: 'e6', codigo: 'EX1020', dia: dia(1), material: 'lavada',   carradas: 3, destino: 'Tucano · Galpão perto da saída (exemplo)', recurso: 'cacamba1', estado: 'programada' },
    { id: 'e7', codigo: 'EX1019', dia: dia(2), material: 'cascalho', carradas: 6, destino: 'Zona rural · Acesso da roça do Valdir (exemplo)', recurso: 'cacamba1', estado: 'programada' },
    { id: 'e8', codigo: 'EX1024', dia: dia(-6), material: 'lavada',  carradas: 3, destino: 'Tucano · Rua da escola (exemplo)', recurso: 'cacamba1', estado: 'conferida' },
    { id: 'e9', codigo: 'EX1024', dia: dia(-6), material: 'brita',   carradas: 2, destino: 'Tucano · Rua da escola (exemplo)', recurso: 'cacamba1', estado: 'conferida' },
    { id: 'e10', codigo: 'EX1022', dia: dia(-13), material: 'levante', carradas: 4, destino: 'Tucano · Casa de muro azul (exemplo)', recurso: 'cacamba1', estado: 'conferida' }
  ];

  try {
    localStorage.setItem('dm_pedidos', JSON.stringify(pedidos));
    localStorage.setItem('dm_entregas', JSON.stringify(entregas));
    localStorage.setItem('dm_recursos', JSON.stringify(CFG.recursos));
    localStorage.setItem(VERSAO, '1');
  } catch (e) {}
})();
