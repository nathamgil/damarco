/* =====================================================================
   DAMARCO — Terraplanagem e Material · configuração
   Único arquivo que precisa ser editado para sair do modo demonstração.
   Tudo que está marcado "A CONFIRMAR" ainda não veio da DAMARCO.
   ===================================================================== */
window.DM = {

  nome:       'DAMARCO',
  descricao:  'Terraplanagem e Material',
  assinatura: 'BASE É DAMARCO.',
  instagram:  'somosdamarco',
  whatsapp:   '5571994104255',
  whatsappVisivel: '(71) 99410-4255',
  area:       'Tucano/BA e região',          // cidades exatas: A CONFIRMAR

  /* ---- Supabase --------------------------------------------------
     Vazios = MODO DEMONSTRAÇÃO (pedidos só no navegador de quem olha,
     chaves dm_* no localStorage). Para ligar: veja o README.
  ------------------------------------------------------------------ */
  supabaseUrl: '',
  supabaseKey: '',
  bucketFotos: 'fotos-terreno',

  /* ---- Serviços (textos dos posts; "quando usar" é explicação curta) */
  servicos: [
    { id: 'terraplanagem', nome: 'Terraplanagem e nivelamento', quando: 'Terreno com desnível, morro ou buraco que precisa ficar no ponto para a obra começar.' },
    { id: 'escavacao',     nome: 'Escavação',                   quando: 'Quando é preciso abrir o chão: fundação, vala, cava.' },
    { id: 'limpeza',       nome: 'Limpeza de terreno',          quando: 'Mato, toco, pedra ou entulho no caminho. Onde os outros veem mato, a gente vê um quintal esperando pra existir.' },
    { id: 'aceiros',       nome: 'Abertura de aceiros',         quando: 'Faixa limpa na divisa ou em volta da área da propriedade.' },
    { id: 'acessos',       nome: 'Acessos e estradas',          quando: 'Quando carro, caminhão ou máquina não chega onde precisa chegar.' },
    { id: 'acude',         nome: 'Açude',                       quando: 'Para abrir ou recuperar açude na propriedade.' },
    { id: 'carga',         nome: 'Carga e transporte',          quando: 'Retroescavadeira e caçamba para carregar e levar terra, material ou entulho.' },
    { id: 'entulho',       nome: 'Entulho e aterro',            quando: 'Decidir o destino: se fica no terreno ou vai embora. Isso entra no orçamento.' }
  ],

  /* ---- Materiais (guia da própria DAMARCO). Venda por carrada. ------ */
  materiais: [
    { id: 'cascalho', nome: 'Cascalho',         uso: 'Base e drenagem.' },
    { id: 'lavada',   nome: 'Areia lavada',     uso: 'Massa e concreto.' },
    { id: 'levante',  nome: 'Areia de levante', uso: 'Aterro e enchimento. É mais barata e não substitui a lavada no concreto.' },
    { id: 'brita',    nome: 'Brita',            uso: 'Concreto, pavimentação e fundação.' }
  ],

  /* ---- "Qual material eu preciso?" — só a lógica do guia acima ----- */
  guia: [
    { id: 'concreto',   rotulo: 'Concreto (laje, pilar, piso de concreto)', materiais: ['lavada', 'brita'], nota: 'Concreto leva areia lavada e brita. Areia de levante não substitui a lavada no concreto.' },
    { id: 'massa',      rotulo: 'Massa (assentar tijolo, reboco)',          materiais: ['lavada'],          nota: 'Massa pede areia lavada.' },
    { id: 'fundacao',   rotulo: 'Fundação',                                  materiais: ['brita', 'lavada'], nota: 'Brita é material de fundação. Se a fundação leva concreto, entra também a areia lavada.' },
    { id: 'aterro',     rotulo: 'Aterro, enchimento, subir o nível',         materiais: ['levante'],         nota: 'Areia de levante é a de aterro e enchimento, e é a mais barata. Só não use no concreto.' },
    { id: 'base',       rotulo: 'Base de piso, pátio ou chão firme',         materiais: ['cascalho'],        nota: 'Cascalho é o material de base.' },
    { id: 'drenagem',   rotulo: 'Drenagem (água parada, lama)',              materiais: ['cascalho'],        nota: 'Cascalho também serve para drenagem.' },
    { id: 'pavimento',  rotulo: 'Pavimentação',                              materiais: ['brita'],           nota: 'Brita serve para pavimentação.' },
    { id: 'estrada',    rotulo: 'Estrada ou acesso na propriedade',          materiais: ['cascalho'],        nota: 'Cascalho faz a base. Se o acesso ainda precisa ser aberto, peça também o serviço de acessos e estradas.' }
  ],

  /* ---- Recursos da agenda: NOMES GENÉRICOS, frota real A CONFIRMAR -- */
  recursos: [
    { id: 'retro',    nome: 'Retroescavadeira', tipo: 'maquina',  aConfirmar: true },
    { id: 'cacamba1', nome: 'Caçamba 1',        tipo: 'cacamba',  aConfirmar: true }
  ],

  etapas: [
    { id: 'novo',      nome: 'Novo' },
    { id: 'visita',    nome: 'Visita / medição' },
    { id: 'enviado',   nome: 'Orçamento enviado' },
    { id: 'aprovado',  nome: 'Aprovado' },
    { id: 'agendado',  nome: 'Agendado' },
    { id: 'execucao',  nome: 'Em execução' },
    { id: 'concluido', nome: 'Concluído' },
    { id: 'perdido',   nome: 'Perdido' }
  ],

  origens: ['Site', 'Instagram', 'WhatsApp', 'Indicação'],
  pagamentos: ['Pix', 'Dinheiro', 'Transferência', 'Cartão', 'A combinar'],   // formas aceitas: A CONFIRMAR
  maxFotos: 5
};
window.DM.modoDemo = !(window.DM.supabaseUrl && window.DM.supabaseKey);
