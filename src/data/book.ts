import { biography } from "./biography";

/**
 * Modelo de dados do livro digital (`/livro`).
 *
 * Cada página é definida explicitamente (curadoria manual): a altura da página
 * no flip-book é fixa, então o texto é pensado para caber sem refluxo em runtime.
 */

export interface BookSource {
  titulo: string;
  url: string;
  licenca?: string;
}

export type BookPage =
  | { tipo: "texto"; paragrafos: string[] }
  | { tipo: "obra"; slug: string; legenda?: string }
  | { tipo: "texto-obra"; paragrafos: string[]; slug: string }
  | { tipo: "contexto"; titulo: string; paragrafos: string[] };

export interface BookChapter {
  id: string;
  numero: number;
  titulo: string;
  anos: string;
  local: string;
  /** Citação de carta a Theo, com referência (ex.: "Carta 155, julho de 1880"). */
  epigrafe?: { texto: string; fonte: string };
  paginas: BookPage[];
  fontes: BookSource[];
}

/**
 * Página "achatada" pronta para o flip-book: mistura páginas especiais
 * (capa, sumário, timeline…) com as páginas de conteúdo dos capítulos.
 */
export type FlatPage =
  | { tipo: "capa" }
  | { tipo: "sumario" }
  | { tipo: "abertura"; capitulo: BookChapter }
  | {
      tipo: "conteudo";
      capitulo: BookChapter;
      pagina: BookPage;
      /** Índice da página dentro do capítulo (0-based). */
      indiceNoCapitulo: number;
    }
  | { tipo: "timeline"; marcos: { ano: string; evento: string }[]; parte: number; totalPartes: number }
  | { tipo: "referencias"; fontes: BookSource[]; parte: number; totalPartes: number }
  | { tipo: "creditos" }
  | { tipo: "contracapa" };

/** Quantidade de marcos da linha do tempo por página. */
const MARCOS_POR_PAGINA = 8;
/** Quantidade de fontes por página de referências. */
const FONTES_POR_PAGINA = 10;

function chunk<T>(lista: T[], tamanho: number): T[][] {
  const partes: T[][] = [];
  for (let i = 0; i < lista.length; i += tamanho) {
    partes.push(lista.slice(i, i + tamanho));
  }
  return partes;
}

/** Junta e deduplica as fontes de todos os capítulos (pela URL). */
function todasAsFontes(chapters: BookChapter[]): BookSource[] {
  const vistas = new Set<string>();
  const fontes: BookSource[] = [];
  for (const cap of chapters) {
    for (const fonte of cap.fontes) {
      if (!vistas.has(fonte.url)) {
        vistas.add(fonte.url);
        fontes.push(fonte);
      }
    }
  }
  return fontes;
}

/**
 * Monta a sequência completa de páginas do livro na ordem de leitura:
 * capa → sumário → capítulos (abertura + conteúdo) → timeline → referências
 * → créditos → contracapa.
 */
export function flattenBook(chapters: BookChapter[]): FlatPage[] {
  const pages: FlatPage[] = [{ tipo: "capa" }, { tipo: "sumario" }];

  for (const capitulo of chapters) {
    pages.push({ tipo: "abertura", capitulo });
    capitulo.paginas.forEach((pagina, indiceNoCapitulo) => {
      pages.push({ tipo: "conteudo", capitulo, pagina, indiceNoCapitulo });
    });
  }

  const marcosPartes = chunk(biography.marcos, MARCOS_POR_PAGINA);
  marcosPartes.forEach((marcos, i) => {
    pages.push({
      tipo: "timeline",
      marcos,
      parte: i + 1,
      totalPartes: marcosPartes.length,
    });
  });

  const fontesPartes = chunk(todasAsFontes(chapters), FONTES_POR_PAGINA);
  fontesPartes.forEach((fontes, i) => {
    pages.push({
      tipo: "referencias",
      fontes,
      parte: i + 1,
      totalPartes: fontesPartes.length,
    });
  });

  pages.push({ tipo: "creditos" }, { tipo: "contracapa" });
  return pages;
}

/** Índice (na sequência achatada) da abertura de cada capítulo — usado no sumário. */
export function indiceDosCapitulos(pages: FlatPage[]): Map<string, number> {
  const mapa = new Map<string, number>();
  pages.forEach((p, i) => {
    if (p.tipo === "abertura") mapa.set(p.capitulo.id, i);
  });
  return mapa;
}

export const bookChapters: BookChapter[] = [
  {
    id: "infancia", numero: 1, titulo: "O Filho do Pastor", anos: "1853–1875", local: "Zundert · Haia · Londres · Paris",
    epigrafe: { texto: "Há uma grande força em alguém que sabe que pode fazer alguma coisa e que tenta fazê-la.", fonte: "Carta a Theo, novembro de 1873" },
    paginas: [
      { tipo: "texto", paragrafos: ["Vincent Willem van Gogh nasceu em 30 de março de 1853, em Groot-Zundert, no sul dos Países Baixos. Exatamente um ano antes, seus pais haviam enterrado um filho natimorto, também chamado Vincent. Filho do pastor Theodorus van Gogh e de Anna Carbentus, cresceu numa casa de disciplina protestante, leitura e longas caminhadas pela paisagem de Brabante.", "A família vivia junto à paróquia. Vincent frequentou internatos em Zevenbergen e Tilburg, mas deixou a escola cedo. Desenhava, observava a natureza e lia muito; ainda não havia decidido ser artista. O mundo que o formou era rural e religioso, marcado pelas hortas, pelos camponeses e pelo trabalho cotidiano que retornariam mais tarde em sua pintura."] },
      { tipo: "texto", paragrafos: ["Aos dezesseis anos, em 1869, entrou como aprendiz na filial de Haia da marchande de arte Goupil & Cie., por influência do tio Cent. O emprego o introduziu ao comércio internacional de pinturas e gravuras. Em 1873, a empresa o transferiu para Londres, onde viveu primeiro em Brixton e depois em Kennington.", "Na versão tradicional de sua biografia, apaixonou-se sem ser correspondido por Eugénie Loyer, filha de sua senhoria; a documentação torna essa narrativa menos segura do que costumava parecer. O fato indiscutível é seu progressivo desalento com o mercado de arte. Transferido a Paris em 1875, já se afastava da lógica comercial que a Goupil exigia."] },
      { tipo: "contexto", titulo: "A família Van Gogh", paragrafos: ["Os Van Gogh tinham vínculos com a Igreja Reformada Holandesa e com o comércio de arte. Theo, quatro anos mais novo, também trabalharia na Goupil e se tornaria o principal interlocutor de Vincent.", "Em 1876, Vincent foi dispensado da Goupil. A ruptura abriu anos de busca religiosa, profissional e afetiva."] },
      { tipo: "texto", paragrafos: ["Antes de pintar, Vincent conheceu a arte como mercadoria, reprodução e assunto de conversa. As cartas desse período já mostram um observador intenso, atento a livros, imagens e à condição humana. Essa educação visual indireta seria decisiva quando, poucos anos depois, escolhesse aprender a desenhar.", "Seu percurso inicial não anuncia uma carreira linear. A passagem de empregado de galeria a pregador e, enfim, a artista foi feita de recusas, mudanças de cidade e trabalho obstinado. O futuro pintor começou como um jovem procurando uma vocação que pudesse conciliar fé, serviço e expressão."] } ],
    fontes: [{ titulo: "Vincent van Gogh — Wikipedia (em inglês)", url: "https://en.wikipedia.org/wiki/Vincent_van_Gogh", licenca: "CC BY-SA" }, { titulo: "Vincent van Gogh: biography — Van Gogh Museum", url: "https://www.vangoghmuseum.nl/en/art-and-stories/vincent-van-gogh", }, { titulo: "Cartas de Van Gogh — vangoghletters.org", url: "http://vangoghletters.org/vg/" }]
  },
  {
    id: "borinage", numero: 2, titulo: "Fé e Carvão", anos: "1876–1880", local: "Inglaterra · Borinage, Bélgica",
    epigrafe: { texto: "Há uma grande fogueira dentro de mim, mas ninguém vem se aquecer nela.", fonte: "Carta 155 a Theo, ~21 de julho de 1880" },
    paginas: [
      { tipo: "texto", paragrafos: ["Depois da Goupil, Vincent buscou no cristianismo uma missão. Foi professor assistente em Ramsgate e Isleworth, na Inglaterra, e pregador auxiliar metodista. De volta aos Países Baixos, preparou-se sem êxito para os exames de teologia em Amsterdã. Também não concluiu a formação evangelista em Bruxelas.", "Em 1878 chegou ao Borinage, região carbonífera da Bélgica, como missionário leigo. Em Wasmes e Pâturages encontrou famílias de mineiros expostas à pobreza, aos acidentes e à doença. Sua vocação tomou a forma de solidariedade extrema, mais próxima de uma identificação com os trabalhadores do que da distância esperada de um pregador."] },
      { tipo: "texto", paragrafos: ["Vincent distribuiu roupas e bens, viveu em alojamentos precários e cuidou de feridos depois de acidentes nas minas. Seus superiores consideraram a conduta excessiva e não renovaram seu posto. O fracasso religioso foi devastador, mas o contato com os mineiros ofereceu um tema moral e visual que nunca o abandonaria.", "Entre 1879 e 1880, atravessou uma crise profunda. Desenhar passou a ser, aos poucos, uma possibilidade de trabalho e de serviço. Na carta 155, escrita a Theo em julho de 1880, a imagem da fogueira descreve um desejo de utilidade que ainda não encontrava forma."] },
      { tipo: "contexto", titulo: "O Borinage industrial", paragrafos: ["O Borinage era uma das grandes bacias de carvão da Bélgica. A riqueza industrial convivia com jornadas perigosas e moradias miseráveis para os trabalhadores.", "A experiência deu a Vincent uma compreensão direta do mundo operário e camponês que sustentaria suas primeiras obras." ] },
      { tipo: "texto", paragrafos: ["Em 1880, Vincent decidiu tornar-se artista. Não foi uma conversão súbita para a fama, mas uma escolha de ofício: aprender perspectiva, anatomia, materiais e o gesto do desenho. Theo apoiaria a decisão, ainda incerta, enviando dinheiro e encorajamento.", "O carvão do Borinage não aparece literalmente em sua obra mais conhecida, mas permanece em sua ética. Quando pintou trabalhadores, tecelões e comedores de batata, buscou mostrar pessoas que ganhavam o pão com as próprias mãos, sem idealização sentimental."] } ],
    fontes: [{ titulo: "Vincent van Gogh — Wikipedia (em inglês)", url: "https://en.wikipedia.org/wiki/Vincent_van_Gogh", licenca: "CC BY-SA" }, { titulo: "Vincent in the Borinage — Van Gogh Museum", url: "https://www.vangoghmuseum.nl/en/art-and-stories/stories/vincent-in-the-borinage" }, { titulo: "Carta 155 — Van Gogh Letters", url: "http://vangoghletters.org/vg/letters/let155/letter.html" }]
  },
  {
    id: "eten-haia", numero: 3, titulo: "Aprendiz de Artista", anos: "1881–1883", local: "Etten · Haia · Drenthe",
    epigrafe: { texto: "O que é desenhar? Como se chega a isso? É abrir caminho através de uma parede invisível de ferro.", fonte: "Carta 132 a Theo, setembro de 1880" },
    paginas: [
      { tipo: "texto", paragrafos: ["Em Etten, na casa dos pais, Vincent se dedicou a desenhar e se apaixonou pela prima viúva Kee Vos-Stricker. Diante de sua insistência, ela respondeu a frase que se tornaria célebre: “não, jamais, nunca”. A recusa agravou a tensão familiar e revelou a intensidade com que Vincent buscava vínculos afetivos e uma vida independente.", "Em Haia, seu primo por afinidade Anton Mauve lhe ensinou princípios de aquarela e pintura a óleo. Vincent trabalhou com modelos e estudou a cidade, os pobres e os trabalhadores. Aprendia por repetição: mãos, pés, perspectivas, interiores e figuras. O domínio do desenho era, para ele, uma conquista contra a resistência do olhar e da matéria."] },
      { tipo: "texto", paragrafos: ["Em 1882, passou a viver com Clasina Maria Hoornik, conhecida como Sien, grávida e mãe de uma menina. Ela posou para muitos desenhos. A relação, vista com reprovação pela família, combinava afeto, cuidado e dificuldades financeiras. Vincent chegou a considerar casamento, mas a união se desfez no ano seguinte.", "No outono de 1883, partiu sozinho para Drenthe. As charnecas, canais e cabanas de turfa lhe deram uma paisagem de silêncio e trabalho. A estadia foi breve e solitária; em dezembro, retornou para junto dos pais, então instalados em Nuenen."] },
      { tipo: "texto-obra", slug: "lembranca-do-jardim-de-etten", paragrafos: ["Pintada em Arles, em 1888, esta lembrança reconstruída de Etten transforma uma memória familiar em cor intensa. A obra é posterior aos fatos deste capítulo, mas preserva a importância duradoura daquele lugar." ] },
      { tipo: "contexto", titulo: "Modelos e escândalo", paragrafos: ["Na Holanda do século XIX, uma artista sem recursos dependia de redes familiares e de modelos acessíveis. A convivência de Vincent com Sien confrontava convenções sociais e preocupações econômicas.", "A controvérsia não reduz Sien a episódio biográfico: ela foi colaboradora concreta de um período importante de estudos." ] },
      { tipo: "texto", paragrafos: ["Em Nuenen, Vincent retomaria contato com Margot Begemann, vizinha e amiga. A relação provocou nova oposição familiar; Margot tentou tirar a própria vida e sobreviveu. Esses episódios pertencem à história de pessoas reais e não devem ser usados para transformar a biografia em lenda de sofrimento.", "O saldo de 1881 a 1883 foi técnico e humano. Vincent ainda não tinha uma linguagem madura, mas havia escolhido seus assuntos: corpos que trabalham, interiores pobres, paisagens do norte e a procura de dignidade nos que raramente ocupavam o centro da pintura."] } ],
    fontes: [{ titulo: "Vincent van Gogh — Wikipedia (em inglês)", url: "https://en.wikipedia.org/wiki/Vincent_van_Gogh", licenca: "CC BY-SA" }, { titulo: "Carta 132 — Van Gogh Letters", url: "http://vangoghletters.org/vg/letters/let132/letter.html" }, { titulo: "Vincent in The Hague — Van Gogh Museum", url: "https://www.vangoghmuseum.nl/en/art-and-stories/stories/vincent-in-the-hague" }]
  },
  {
    id: "nuenen", numero: 4, titulo: "Nuenen — A Paleta da Terra", anos: "1883–1885", local: "Países Baixos",
    epigrafe: { texto: "Quero pintar camponeses como se eu próprio fosse um deles.", fonte: "Carta a Theo, abril de 1885" },
    paginas: [
      { tipo: "texto", paragrafos: ["Durante quase dois anos, Vincent viveu na casa paroquial de Nuenen. Escolheu tecelões, lavradores e mulheres camponesas como modelos, estudando-lhes gestos, mãos e rostos. Produziu centenas de cabeças pintadas, necessárias, em sua visão, para aprender a figura humana sem recorrer ao acabamento elegante da pintura acadêmica.", "A paleta era escura: verdes profundos, terras, pretos e ocres. Ela respondia não apenas à luz holandesa, mas à intenção de representar uma vida moldada pelo trabalho. Em março de 1885, a morte repentina de Theodorus van Gogh acrescentou luto a um período já tenso na família."] },
      { tipo: "texto-obra", slug: "natureza-morta-com-biblia", paragrafos: ["Pintada logo após a morte do pai, em 1885, a natureza-morta coloca a grande Bíblia da família ao lado de um romance de Zola: um diálogo silencioso entre a fé herdada e as ideias modernas do filho." ] },
      { tipo: "obra", slug: "comedores-de-batata", legenda: "A primeira obra-prima de Vincent, pintada em Nuenen em abril de 1885." },
      { tipo: "texto", paragrafos: ["Em Os Comedores de Batata, cinco pessoas dividem uma refeição à luz de uma lamparina. Vincent insistia que elas haviam cavado a terra com as mãos que agora levavam à boca. O quadro não pretende consolar o observador: os tons sombrios e os rostos angulosos afirmam a dureza material da vida rural.", "O pintor considerou a tela um passo decisivo, embora ela recebesse críticas. Também atravessou um conflito doloroso com Margot Begemann, cuja tentativa de suicídio após a oposição ao relacionamento expôs os limites da vida doméstica em Nuenen. Em novembro de 1885, seguiu para Antuérpia."] },
      { tipo: "contexto", titulo: "Pintar o campesinato", paragrafos: ["Millet e a Escola de Haia eram referências para Vincent. Seu objetivo, porém, não era a cena pitoresca: era dar peso e presença a quem vivia do cultivo e do ofício manual.", "A fase holandesa forneceu o desenho, a observação e a gravidade que continuariam sob as cores brilhantes de seus anos finais." ] } ],
    fontes: [{ titulo: "The Potato Eaters — Van Gogh Museum", url: "https://www.vangoghmuseum.nl/en/collection/s0005V1962" }, { titulo: "Vincent in Nuenen — Van Gogh Museum", url: "https://www.vangoghmuseum.nl/en/art-and-stories/stories/vincent-in-nuenen" }, { titulo: "The Potato Eaters — Wikipedia", url: "https://en.wikipedia.org/wiki/The_Potato_Eaters", licenca: "CC BY-SA" }]
  },
  {
    id: "paris", numero: 5, titulo: "Antuérpia e Paris — A Descoberta da Cor", anos: "1885–1888", local: "Bélgica · França",
    epigrafe: { texto: "Em vez de tentar reproduzir exatamente o que vejo, uso a cor de maneira mais arbitrária para me expressar com força.", fonte: "Carta a Theo, agosto de 1888" },
    paginas: [
      { tipo: "texto", paragrafos: ["Em Antuérpia, Vincent frequentou por poucos meses a Academia de Belas-Artes, descobriu Rubens e comprou gravuras japonesas. No início de 1886, mudou-se sem aviso para Paris e passou a morar com Theo, no Boulevard de Clichy, em Montmartre. Ali encontrou uma cidade onde a pintura moderna era uma conversa diária.", "No ateliê de Fernand Cormon, conheceu Émile Bernard e Toulouse-Lautrec; conviveu também com Pissarro e Signac. O contato com impressionistas e neoimpressionistas clareou radicalmente sua paleta. Em Asnières, experimentou pinceladas divididas e combinações de cores complementares."] },
      { tipo: "texto-obra", slug: "retrato-de-pere-tanguy", paragrafos: ["Julien Tanguy vendia tintas, acolhia artistas e expunha telas em sua loja. No retrato, estampas japonesas condensam a rede de influências que Paris ofereceu a Vincent." ] },
      { tipo: "obra", slug: "autorretrato-com-chapeu-de-palha", legenda: "O próprio rosto tornou-se laboratório de luz, cor e pincelada." },
      { tipo: "texto", paragrafos: ["Sem dinheiro para contratar modelos, Vincent produziu cerca de trinta autorretratos. Eles registram menos uma confissão psicológica do que uma pesquisa: fundos complementares, pontos de cor, tons de pele e a direção da pincelada. Colecionou estampas ukiyo-e e copiou Hiroshige, atraído por enquadramentos planos e contornos definidos.", "Expôs no Café du Tambourin, ligado a Agostina Segatori, e no restaurante La Fourche. A capital ampliou suas amizades e seus recursos, mas a vida compartilhada com Theo e o ritmo urbano o exauriram. Em fevereiro de 1888, partiu para Arles à procura da luz do sul."] },
      { tipo: "contexto", titulo: "Impressionismo e japonismo", paragrafos: ["Os impressionistas pintavam efeitos fugidios de luz com cores mais claras e pincelada visível. Seurat e Signac sistematizaram a divisão de tons em pequenos toques.", "As gravuras japonesas, muito colecionadas em Paris, ofereceram a Vincent novas soluções de composição e cor, não um simples exotismo decorativo." ] } ],
    fontes: [{ titulo: "Vincent in Paris — Van Gogh Museum", url: "https://www.vangoghmuseum.nl/en/art-and-stories/stories/vincent-in-paris" }, { titulo: "Portrait of Père Tanguy — Wikipedia", url: "https://en.wikipedia.org/wiki/Portrait_of_P%C3%A8re_Tanguy", licenca: "CC BY-SA" }, { titulo: "Japonaiserie — Van Gogh Museum", url: "https://www.vangoghmuseum.nl/en/art-and-stories/stories/vincent-and-japan" }, { titulo: "Cartas de Van Gogh — vangoghletters.org", url: "http://vangoghletters.org/vg/" }]
  },
  {
    id: "arles", numero: 6, titulo: "Arles — O Ateliê do Sul", anos: "1888–1889", local: "Provença, França",
    epigrafe: { texto: "O girassol é meu, de certo modo.", fonte: "Carta 537 a Theo, janeiro de 1889" },
    paginas: [
      { tipo: "texto", paragrafos: ["Vincent chegou a Arles em fevereiro de 1888, sob neve. Logo encontrou pomares em flor, campos e uma luz que julgou comparável à do Japão imaginado por suas gravuras. Alugou parte da Casa Amarela, na Place Lamartine, e a concebeu como núcleo do “Ateliê do Sul”, uma comunidade de pintores que trabalhariam e viveriam juntos.", "Produziu com velocidade extraordinária: paisagens, pontes, cafés, retratos dos Roulin e cenas noturnas. Joseph Roulin, o carteiro, e sua família tornaram-se amigos e modelos. Vincent explorou amarelos, azuis e complementares em telas como O Café Noturno, Terraço do Café à Noite e Noite Estrelada sobre o Ródano."] },
      { tipo: "obra", slug: "girassois", legenda: "Pintados para receber Gauguin no quarto da Casa Amarela." },
      { tipo: "texto-obra", slug: "quarto-em-arles", paragrafos: ["O quarto simplificado é uma imagem de repouso desejado. Perspectiva e cor foram deliberadamente forçadas para construir uma sensação, não uma fotografia do espaço." ] },
      { tipo: "texto", paragrafos: ["Paul Gauguin chegou em outubro de 1888. As nove semanas de convivência trouxeram debate intenso e tensão crescente. Em 23 de dezembro, após uma crise, Vincent mutilou parte da própria orelha e foi levado ao hospital. A gravidade do episódio exige distância de versões sensacionalistas: os relatos contemporâneos são incompletos e a doença não explica a obra.", "Depois da alta, uma petição de vizinhos contribuiu para novo internamento. Em maio de 1889, Vincent escolheu internar-se em Saint-Rémy. Antes disso, vendeu O Vinhedo Vermelho a Anna Boch por 400 francos, a única venda de uma pintura sua em vida comprovada com segurança."] },
      { tipo: "contexto", titulo: "A venda do Vinhedo Vermelho", paragrafos: ["Anna Boch, pintora belga e integrante do grupo Les XX, comprou a tela exibida em Bruxelas. A venda não significa ausência total de reconhecimento: Vincent já participava de redes artísticas, ainda que sem mercado estável.", "O projeto do Ateliê do Sul fracassou como residência coletiva, mas Arles transformou definitivamente sua linguagem." ] } ],
    fontes: [{ titulo: "Vincent in Arles — Van Gogh Museum", url: "https://www.vangoghmuseum.nl/en/art-and-stories/stories/vincent-in-arles" }, { titulo: "Sunflowers — National Gallery", url: "https://www.nationalgallery.org.uk/paintings/vincent-van-gogh-sunflowers" }, { titulo: "The Red Vineyard — Wikipedia", url: "https://en.wikipedia.org/wiki/The_Red_Vineyard", licenca: "CC BY-SA" }, { titulo: "Cartas de Van Gogh — vangoghletters.org", url: "http://vangoghletters.org/vg/" }]
  },
  {
    id: "saint-remy", numero: 7, titulo: "Saint-Rémy — O Asilo dos Ciprestes", anos: "1889–1890", local: "Saint-Paul-de-Mausole, Provença",
    epigrafe: { texto: "Os ciprestes ainda me preocupam; gostaria de fazer deles algo como as telas dos girassóis.", fonte: "Carta a Theo, junho de 1889" },
    paginas: [
      { tipo: "texto", paragrafos: ["Em maio de 1889, Vincent internou-se voluntariamente no asilo de Saint-Paul-de-Mausole, perto de Saint-Rémy. Recebeu um quarto e, depois, um espaço para trabalhar. Os diagnósticos da época mencionaram epilepsia; interpretações médicas posteriores são debatidas e não permitem uma certeza retrospectiva simples.", "Entre crises recorrentes, pintou o jardim do asilo, íris, oliveiras e as montanhas dos Alpilles. Em períodos de estabilidade, trabalhou com disciplina notável. Em crises mais severas, chegou a ingerir tintas e precisou interromper a produção. A pintura não foi cura milagrosa, mas uma prática que organizava seus dias."] },
      { tipo: "obra", slug: "a-noite-estrelada", legenda: "Vista da janela leste do asilo, reinventada no ateliê em junho de 1889." },
      { tipo: "texto-obra", slug: "campo-de-trigo-com-ciprestes", paragrafos: ["Vincent comparou os ciprestes a obeliscos egípcios. Na tela, eles unem terra e céu em um ritmo de curvas, mais expressivo que descritivo." ] },
      { tipo: "texto", paragrafos: ["A Noite Estrelada não é uma transcrição literal da paisagem: a vila e o céu foram reorganizados pela imaginação e pela memória. Vincent também copiou gravuras de Millet e Doré, traduzindo imagens alheias para sua própria cor; A Ronda dos Prisioneiros é um exemplo dessa conversa com a tradição.", "Em 1890, obras suas foram mostradas na exposição do grupo Les XX, em Bruxelas. Em janeiro, o crítico Albert Aurier publicou no Mercure de France um texto elogioso, o mais importante recebido por Vincent em vida. Em maio, ele deixou o asilo e passou por Paris para conhecer Jo, Theo e o sobrinho Vincent."] },
      { tipo: "contexto", titulo: "O diagnóstico: o que sabemos", paragrafos: ["Os registros médicos de 1889–1890 pertencem ao vocabulário de sua época. Hipóteses modernas variam e não substituem um diagnóstico clínico impossível a distância.", "É mais rigoroso reconhecer crises documentadas, tratamentos e interrupções de trabalho do que reduzir a arte a uma única explicação médica." ] } ],
    fontes: [{ titulo: "Vincent at Saint-Rémy — Van Gogh Museum", url: "https://www.vangoghmuseum.nl/en/art-and-stories/stories/vincent-at-saint-remy" }, { titulo: "The Starry Night — MoMA", url: "https://www.moma.org/collection/works/79802" }, { titulo: "Wheatfield with Cypresses — National Gallery", url: "https://www.nationalgallery.org.uk/paintings/vincent-van-gogh-wheatfield-with-cypresses" }, { titulo: "Vincent van Gogh — Wikipedia (em inglês)", url: "https://en.wikipedia.org/wiki/Vincent_van_Gogh", licenca: "CC BY-SA" }]
  },
  {
    id: "auvers", numero: 8, titulo: "Auvers-sur-Oise — Os Setenta Dias", anos: "maio–julho de 1890", local: "França",
    epigrafe: { texto: "São imensas extensões de trigo sob céus turbulentos, e não precisei sair do meu caminho para tentar exprimir tristeza e solidão extrema.", fonte: "Carta 649 a Theo, 10 de julho de 1890" },
    paginas: [
      { tipo: "texto", paragrafos: ["Em 20 de maio de 1890, Vincent chegou a Auvers-sur-Oise, perto de Paris, e se hospedou na pousada Ravoux. Ficou sob os cuidados do dr. Paul Gachet, médico homeopata, pintor amador e amigo de Pissarro e Cézanne. Vincent o retratou com empatia, mas também expressou dúvidas sobre a capacidade do médico de ajudá-lo.", "O ritmo de trabalho foi extraordinário: mais de setenta pinturas em cerca de setenta dias. Casas, jardins, retratos e campos foram tratados com formatos e perspectivas cada vez mais ousados. A Igreja de Auvers e o Retrato do Dr. Gachet pertencem a esse período curto e concentrado."] },
      { tipo: "obra", slug: "retrato-do-dr-gachet", legenda: "O médico que acompanhou Vincent nos últimos meses." },
      { tipo: "texto-obra", slug: "a-igreja-de-auvers", paragrafos: ["A igreja parece oscilar sob o azul intenso; os dois caminhos não se encontram. A arquitetura observada torna-se imagem de movimento e tensão." ] },
      { tipo: "texto", paragrafos: ["As cartas revelam preocupação com o futuro de Theo, cuja posição profissional atravessava incertezas e que planejava uma mudança. Vincent visitou Paris em julho, encontrou o irmão, Jo e o sobrinho, e retornou a Auvers inquieto. A carta 649 associa seus campos a tristeza e solidão, sem autorizar transformar cada tela em uma mensagem final.", "Em 27 de julho, Vincent sofreu um ferimento a bala em um campo. A tese tradicional é que tenha disparado contra si mesmo; as circunstâncias continuam debatidas. Levado à pousada Ravoux, morreu dois dias depois, em 29 de julho de 1890, aos 37 anos, com Theo ao lado. “La tristesse durera toujours” são palavras atribuídas a ele, não um registro incontestável." ] },
      { tipo: "contexto", titulo: "Uma morte, fontes incompletas", paragrafos: ["Depoimentos e documentos do fim de julho de 1890 são limitados. A prudência histórica exige distinguir fatos estabelecidos de reconstruções posteriores.", "O essencial permanece: Vincent morreu em Auvers, foi enterrado ali e Theo morreu seis meses depois." ] } ],
    fontes: [{ titulo: "Vincent in Auvers-sur-Oise — Van Gogh Museum", url: "https://www.vangoghmuseum.nl/en/art-and-stories/stories/vincent-in-auvers-sur-oise" }, { titulo: "Portrait of Dr. Gachet — Wikipedia", url: "https://en.wikipedia.org/wiki/Portrait_of_Dr._Gachet", licenca: "CC BY-SA" }, { titulo: "The Church at Auvers — Musée d'Orsay", url: "https://www.musee-orsay.fr/en/artworks/leglise-dauvers-sur-oise-vue-du-chevet-782" }, { titulo: "Carta 649 — Van Gogh Letters", url: "http://vangoghletters.org/vg/letters/let649/letter.html" }]
  },
  {
    id: "theo-cartas", numero: 9, titulo: "Theo e as Cartas", anos: "1872–1891", local: "A correspondência",
    epigrafe: { texto: "Meu caro Theo, você sabe o que quero: trabalhar e avançar.", fonte: "Carta a Theo, 1882" },
    paginas: [
      { tipo: "texto", paragrafos: ["Theo van Gogh, nascido em 1857, foi mais que o irmão mais novo de Vincent. Trabalhou como marchand na Goupil e, depois, na Boussod, Valadon & Cie. Por aproximadamente uma década, enviou-lhe dinheiro mensal, materiais e notícias do circuito artístico. Esse apoio material tornou possível uma produção que raramente encontrava compradores.", "A relação não foi idealizada nem sem atritos. As cartas mostram dependência, afeto, discordâncias e colaboração intelectual. Theo lia manuscritos, recebia desenhos e telas, aconselhava sobre exposições e oferecia a Vincent um destinatário constante quando cidades, empregos e relações se desfaziam."] },
      { tipo: "contexto", titulo: "Um arquivo excepcional", paragrafos: ["Sobrevivem cerca de 820 cartas de Vincent, mais de 650 dirigidas a Theo. Elas foram escritas em holandês, francês e inglês e incluem desenhos, listas de obras e reflexões sobre literatura e arte.", "A correspondência é fonte primária, mas também é uma conversa: precisa ser lida considerando destinatário, data, lacunas e circunstâncias." ] },
      { tipo: "texto", paragrafos: ["Theo morreu em Utrecht, em janeiro de 1891, apenas seis meses após Vincent. Sua viúva, Johanna van Gogh-Bonger, assumiu uma tarefa decisiva: guardar as obras, organizar exposições, emprestar telas e sustentar uma rede internacional de críticos, artistas e colecionadores.", "Jo traduziu e publicou uma edição das cartas em 1914. Seu trabalho não criou sozinho a reputação de Vincent, mas deu continuidade concreta ao que os irmãos haviam construído. Mais tarde, Theo foi reenterrado ao lado de Vincent, no cemitério de Auvers-sur-Oise."] },
      { tipo: "contexto", titulo: "Como as cartas chegaram até nós", paragrafos: ["A edição digital vangoghletters.org reúne transcrições, traduções, fac-símiles e anotações, permitindo confrontar citações com os manuscritos e sua cronologia.", "Ler as cartas evita dois extremos: a hagiografia do “gênio incompreendido” e a redução de toda obra a sintoma biográfico." ] },
      { tipo: "texto", paragrafos: ["A correspondência permite acompanhar uma formação artística em tempo real: desenhos de composição, pedidos de tinta, comentários sobre Delacroix, Millet, gravuras japonesas e colegas. Ao mesmo tempo, preserva uma intimidade fraterna que escapa às telas.", "Theo não foi apenas financiador. Foi interlocutor crítico e ponte com o mundo da arte. Sem sua presença e sem a persistência posterior de Jo, a obra de Vincent teria chegado ao século XX por uma história muito diferente."] } ],
    fontes: [{ titulo: "Cartas de Van Gogh — vangoghletters.org", url: "http://vangoghletters.org/vg/" }, { titulo: "Theo van Gogh — Wikipedia", url: "https://en.wikipedia.org/wiki/Theo_van_Gogh_(art_dealer)", licenca: "CC BY-SA" }, { titulo: "Johanna van Gogh-Bonger — Wikipedia", url: "https://en.wikipedia.org/wiki/Johanna_van_Gogh-Bonger", licenca: "CC BY-SA" }]
  },
  {
    id: "legado", numero: 10, titulo: "Legado — O Pintor que Vendeu um Quadro", anos: "1891–hoje", local: "O mundo",
    epigrafe: { texto: "Não posso mudar o fato de que minhas pinturas não vendem; mas chegará o tempo em que as pessoas reconhecerão que valem mais do que o preço das tintas.", fonte: "Carta a Theo, outubro de 1888" },
    paginas: [
      { tipo: "texto", paragrafos: ["A fórmula “o pintor que vendeu um quadro” resume uma verdade com ressalvas: O Vinhedo Vermelho foi a única venda de pintura sua em vida comprovada com segurança. Após 1890, exposições póstumas, a ação de Jo van Gogh-Bonger e o interesse de críticos e colecionadores fizeram sua reputação crescer rapidamente.", "Fauves como Matisse, Derain e Vlaminck, assim como expressionistas alemães, encontraram em Vincent uma licença para usar cor e pincelada com intensidade emocional. Seu legado não é uma escola única: é uma mudança no que a pintura moderna passou a aceitar como forma, energia e experiência." ] },
      { tipo: "texto-obra", slug: "girassois", paragrafos: ["Os Girassóis tornaram-se ícone global, reproduzido em cartazes, livros e objetos. A fama, porém, não substitui sua circunstância original: eram pinturas de amizade e hospitalidade para a Casa Amarela." ] },
      { tipo: "texto", paragrafos: ["Inaugurado em 1973, o Van Gogh Museum, em Amsterdã, preserva a maior concentração da obra: cerca de 200 pinturas, 500 desenhos e 700 cartas. O Kröller-Müller Museum mantém a segunda maior coleção. Museus em todo o mundo conservam versões decisivas de suas séries, permitindo comparar escolhas de escala e cor.", "Em 1990, uma versão do Retrato do Dr. Gachet foi vendida por US$ 82,5 milhões, recorde então para uma obra de arte em leilão. O dado ilustra a reviravolta de valor de mercado, mas não mede a importância histórica de um artista que trabalhou em condições de grande precariedade."] },
      { tipo: "contexto", titulo: "Números de uma obra", paragrafos: ["Em aproximadamente dez anos de atividade, Vincent produziu cerca de 900 pinturas e 1.100 desenhos. A contagem varia conforme estudos, obras atribuídas e técnicas incluídas.", "A edição digital completa em vangoghletters.org transformou o acesso à correspondência e permite investigar a obra além de seus mitos populares." ] },
      { tipo: "texto", paragrafos: ["A presença de Van Gogh na cultura popular é imensa, da literatura ao cinema, da publicidade às canções. Ela trouxe admiradores, mas também simplificações: a biografia dramática muitas vezes eclipsa o trabalhador metódico, leitor atento e experimentador técnico que as cartas revelam.", "Voltar às obras, aos documentos e às pessoas ao redor de Vincent é a melhor forma de escapar dessa redução. Seu legado continua vivo porque suas telas permanecem difíceis: nelas, a cor não ilustra o mundo, mas parece colocá-lo novamente em movimento."] } ],
    fontes: [{ titulo: "Van Gogh Museum — coleção", url: "https://www.vangoghmuseum.nl/en/collection" }, { titulo: "Kröller-Müller Museum — coleção Van Gogh", url: "https://krollermuller.nl/en/vincent-van-gogh" }, { titulo: "Vincent van Gogh — Wikipedia (em inglês)", url: "https://en.wikipedia.org/wiki/Vincent_van_Gogh", licenca: "CC BY-SA" }, { titulo: "Cartas de Van Gogh — vangoghletters.org", url: "http://vangoghletters.org/vg/" }]
  }
];
