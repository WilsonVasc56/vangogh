import type { PeriodId } from "./periods";
import images from "./images.json";

export interface Artwork {
  slug: string;
  titulo: string;
  ano: number;
  periodo: PeriodId;
  wikiTitle: string;
  museu: string;
  descricao: string;
  imagem: string;
  /** Dimensões reais da tela (fase 2). Quando ausentes, o museu usa o aspecto do JPEG. */
  larguraCm?: number;
  alturaCm?: number;
  /** Técnica/material (ex.: "Óleo sobre tela"). Preenchido nas obras destacadas do livro. */
  tecnica?: string;
}

interface ArtworkMeta {
  slug: string;
  titulo: string;
  ano: number;
  periodo: PeriodId;
  wikiTitle: string;
  museu: string;
  descricao: string;
  larguraCm?: number;
  alturaCm?: number;
  tecnica?: string;
  /**
   * Arquivo exato no Wikimedia Commons (domínio público), lido apenas por
   * scripts/download-images.mjs quando a obra não tem artigo próprio na Wikipedia.
   */
  arquivoCommons?: string;
}

// Conteúdo curado e parafraseado a partir dos artigos da Wikipedia (CC BY-SA).
const meta: ArtworkMeta[] = [
  // ---------- NUENEN (1883–1885) ----------
  {
    slug: "comedores-de-batata",
    titulo: "Os Comedores de Batata",
    ano: 1885,
    periodo: "nuenen",
    wikiTitle: "The Potato Eaters",
    museu: "Van Gogh Museum, Amsterdã",
    descricao:
      "Considerada a primeira obra-prima de Van Gogh, retrata uma família de camponeses ceando à luz de lamparina. O artista buscou tons de 'batata podre' e rostos grosseiros para expressar a vida dura do campo, rejeitando o academicismo polido.",
    larguraCm: 114,
    alturaCm: 82,
    tecnica: "Óleo sobre tela",
  },
  {
    slug: "natureza-morta-com-biblia",
    titulo: "Natureza-Morta com Bíblia",
    ano: 1885,
    periodo: "nuenen",
    wikiTitle: "Still Life with Bible",
    museu: "Van Gogh Museum, Amsterdã",
    descricao:
      "Pintada logo após a morte do pai, pastor protestante, mostra a grande Bíblia da família ao lado de um romance de Zola. A tela é lida como um diálogo silencioso entre a fé do pai e a visão moderna do filho.",
    larguraCm: 78,
    alturaCm: 65,
    tecnica: "Óleo sobre tela",
  },
  {
    slug: "jardim-da-paroquia-em-nuenen",
    titulo: "O Jardim da Paróquia em Nuenen",
    ano: 1884,
    periodo: "nuenen",
    wikiTitle: "The Parsonage Garden at Nuenen",
    museu: "Groninger Museum (roubada em 2020, recuperada em 2023)",
    descricao:
      "Vista do jardim da casa paroquial onde a família morava. Os tons húmidos e outonais antecipam a atmosfera melancólica da fase holandesa. A tela ficou famosa ao ser roubada do museu Singer Laren em 2020.",
  },
  {
    slug: "alameda-de-choupos-no-outono",
    titulo: "Alameda de Choupos no Outono",
    ano: 1884,
    periodo: "nuenen",
    wikiTitle: "Avenue of Poplars in Autumn",
    museu: "Van Gogh Museum, Amsterdã",
    descricao:
      "Uma avenida de choupos dourados sob o céu de outono, com uma figura solitária no caminho. A composição em perspectiva profunda e os amarelos terrosos mostram o Van Gogh holandês ainda sob influência de Millet e da Escola de Haia.",
  },
  {
    slug: "tecelao",
    titulo: "O Tecelão",
    ano: 1884,
    periodo: "nuenen",
    wikiTitle: "Peasant Character Studies (Van Gogh series)",
    museu: "Museum of Fine Arts, Boston",
    descricao:
      "Em Nuenen, Van Gogh pintou dezenas de tecelões presos a teares enormes na penumbra das casas. Via neles trabalhadores dignos e esquecidos, e o tear escuro domina a figura como uma máquina que engole o homem.",
    tecnica: "Óleo sobre tela",
    arquivoCommons: "Vincent van Gogh - Weaver - Google Art Project.jpg",
  },
  {
    slug: "moinho-de-agua-em-kollen",
    titulo: "Moinho de Água em Kollen, perto de Nuenen",
    ano: 1884,
    periodo: "nuenen",
    wikiTitle: "Water Mill at Kollen Near Nuenen",
    museu: "Coleção particular",
    descricao:
      "Pintado em dois dias de maio de 1884, mostra o moinho de telhados vermelhos visto de frente, cercado de choupos. Van Gogh contou o trabalho em carta ao amigo pintor Anthon van Rappard.",
    larguraCm: 80,
    alturaCm: 60.5,
    tecnica: "Óleo sobre tela",
  },
  {
    slug: "vaso-com-lunarias",
    titulo: "Vaso com Lunárias",
    ano: 1884,
    periodo: "nuenen",
    wikiTitle: "Still life paintings by Vincent van Gogh (Netherlands)",
    museu: "Van Gogh Museum, Amsterdã",
    descricao:
      "Uma natureza-morta de ramos secos de lunária num vaso de barro, sobre fundo escuro. Nos meses de inverno em Nuenen, Van Gogh treinava cor e textura com objetos simples da casa paroquial.",
    arquivoCommons: "Vaas met judaspenningen - s0009V1962 - Van Gogh Museum.jpg",
  },
  {
    slug: "saida-da-igreja-reformada",
    titulo: "Congregação Saindo da Igreja Reformada em Nuenen",
    ano: 1884,
    periodo: "nuenen",
    wikiTitle: "Congregation Leaving the Reformed Church in Nuenen",
    museu: "Van Gogh Museum, Amsterdã",
    descricao:
      "A pequena igreja onde o pai pregava, pintada no inverno de 1884 para a mãe acamada. Depois da morte do pai, Van Gogh acrescentou fiéis e folhas de outono — a tela foi roubada em 2002 e recuperada em 2016.",
  },
  {
    slug: "a-choupana",
    titulo: "A Choupana",
    ano: 1885,
    periodo: "nuenen",
    wikiTitle: "Cottages (Van Gogh series)",
    museu: "Van Gogh Museum, Amsterdã",
    descricao:
      "Uma casa de camponeses com telhado de colmo ao entardecer, com a luz amarela de uma janela no escuro. Van Gogh chamava essas moradias de 'ninhos humanos' e as pintou várias vezes em Nuenen.",
    arquivoCommons: "Vincent van Gogh - The cottage - Google Art Project.jpg",
  },
  {
    slug: "velha-torre-da-igreja-em-nuenen",
    titulo: "A Velha Torre da Igreja em Nuenen",
    ano: 1885,
    periodo: "nuenen",
    wikiTitle: "Old Church Tower at Nuenen",
    museu: "Van Gogh Museum, Amsterdã",
    descricao:
      "A torre medieval do cemitério camponês, em demolição enquanto ele a pintava. Para Van Gogh, a ruína entre as cruzes simbolizava como a fé e as instituições passam, mas a vida no campo continua.",
  },
  {
    slug: "camponesa-colhendo-batatas",
    titulo: "Camponesa Colhendo Batatas",
    ano: 1885,
    periodo: "nuenen",
    wikiTitle: "Peasant Woman Digging Up Potatoes",
    museu: "Museu Real de Belas Artes, Antuérpia",
    descricao:
      "Uma camponesa curvada sobre a terra, pintada no verão de Os Comedores de Batata. Seguindo Millet, Van Gogh queria mostrar o camponês enobrecido pelo trabalho duro, com cores de terra e pinceladas pesadas.",
  },
  {
    slug: "cabeca-de-camponesa-com-touca-branca",
    titulo: "Cabeça de Camponesa com Touca Branca",
    ano: 1885,
    periodo: "nuenen",
    wikiTitle: "Peasant Character Studies (Van Gogh series)",
    museu: "Coleção particular",
    descricao:
      "Um dos cerca de quarenta estudos de cabeças camponesas feitos no inverno de 1884–1885, em preparação para Os Comedores de Batata. A touca branca brilha contra o rosto curtido e o fundo escuro.",
    tecnica: "Óleo sobre tela",
    arquivoCommons:
      "Kop van een vrouw met witte muts (Head of a Woman with White Cap) - Vincent van Gogh.jpg",
  },
  // ---------- PARIS (1886–1888) ----------
  {
    slug: "cranio-de-esqueleto-com-cigarro",
    titulo: "Caveira de Esqueleto com Cigarro Aceso",
    ano: 1886,
    periodo: "paris",
    wikiTitle: "Skull of a Skeleton with Burning Cigarette",
    museu: "Van Gogh Museum, Amsterdã",
    descricao:
      "Provável sátira juvenil feita durante os estudos na Academia de Belas Artes de Antuérpia. O humor macabro — uma caveira fumando — mostra um lado irônico raramente associado ao pintor.",
  },
  {
    slug: "um-par-de-sapatos",
    titulo: "Um Par de Sapatos",
    ano: 1886,
    periodo: "paris",
    wikiTitle: "Shoes (Vincent van Gogh)",
    museu: "Van Gogh Museum, Amsterdã",
    descricao:
      "Botas gastas compradas em um mercado de pulgas, pintadas com pinceladas densas. A obra inspirou célebres interpretações filosóficas de Heidegger sobre a vida do trabalhador contida nos objetos.",
    larguraCm: 45.5,
    alturaCm: 37.5,
    tecnica: "Óleo sobre tela",
  },
  {
    slug: "retrato-de-pere-tanguy",
    titulo: "Retrato do Père Tanguy",
    ano: 1887,
    periodo: "paris",
    wikiTitle: "Portrait of Père Tanguy",
    museu: "Musée Rodin, Paris",
    descricao:
      "Julien Tanguy, o 'Père Tanguy', era um vendedor de tintas que apoiava jovens artistas. Ao fundo, estampas japonesas de Hiroshige revelam a paixão de Van Gogh pela arte do Japão nesta fase.",
    larguraCm: 75,
    alturaCm: 92,
    tecnica: "Óleo sobre tela",
  },
  {
    slug: "agostina-segatori",
    titulo: "Agostina Segatori no Café du Tambourin",
    ano: 1887,
    periodo: "paris",
    wikiTitle: "Agostina Segatori Sitting in the Café du Tambourin",
    museu: "Van Gogh Museum, Amsterdã",
    descricao:
      "Retrato da dona do Café du Tambourin, onde Van Gogh expôs suas gravuras japonesas e com quem teria tido um breve romance. O tamagno do café em forma de tamborim aparece na mesa característica.",
  },
  {
    slug: "japonaiserie-ameixeira",
    titulo: "Japonaiserie: Ameixeira em Flor",
    ano: 1887,
    periodo: "paris",
    wikiTitle: "Japonaiserie (Van Gogh)",
    museu: "Van Gogh Museum, Amsterdã",
    descricao:
      "Cópia livre de uma gravura de Hiroshige, com moldura decorada por kanji. Van Gogh acreditava que o Japão era uma utopia de luz e cor, e usava as estampas para treinar o olhar para a Provença.",
    larguraCm: 46,
    alturaCm: 55,
    tecnica: "Óleo sobre tela",
  },
  {
    slug: "moulin-de-la-galette",
    titulo: "O Moulin de la Galette",
    ano: 1886,
    periodo: "paris",
    wikiTitle: "Le Moulin de la Galette (Van Gogh series)",
    museu: "Museu de Arte de São Paulo / outras versões",
    descricao:
      "Uma de várias vistas do famoso moinho de Montmartre. Em Paris, Van Gogh saía para pintar ao ar livre com os impressionistas, clareando a paleta e soltando a pincelada.",
  },
  {
    slug: "autorretrato-com-chapeu-de-palha",
    titulo: "Autorretrato com Chapéu de Palha",
    ano: 1887,
    periodo: "paris",
    wikiTitle: "Self-Portrait with a Straw Hat",
    museu: "Metropolitan Museum of Art, Nova York",
    descricao:
      "Um dos muitos autorretratos feitos em Paris por falta de dinheiro para modelos. As pinceladas curtas e radiantes, em azul e ocre, mostram a influência do pontilhismo de Seurat e Signac.",
    larguraCm: 31.8,
    alturaCm: 40.6,
    tecnica: "Óleo sobre tela",
  },
  {
    slug: "pesca-na-primavera-pont-de-clichy",
    titulo: "Pesca na Primavera, a Pont de Clichy",
    ano: 1887,
    periodo: "paris",
    wikiTitle: "Asnières (Van Gogh series)",
    museu: "Art Institute of Chicago",
    descricao:
      "Um barco sob a ponte de Clichy, em Asnières, onde Van Gogh pintava ao ar livre com Émile Bernard e Signac. Os toques curtos de verde e azul mostram o impressionismo transformando sua paleta.",
    arquivoCommons:
      "Vincent van Gogh - Fishing in Spring, the Pont de Clichy (Asnières) - 1965.1169 - Art Institute of Chicago.jpg",
  },
  {
    slug: "campo-de-trigo-com-perdiz",
    titulo: "Campo de Trigo com Perdiz",
    ano: 1887,
    periodo: "paris",
    wikiTitle: "Wheat Fields",
    museu: "Van Gogh Museum, Amsterdã",
    descricao:
      "Espigas de trigo, papoulas e uma perdiz que levanta voo, na periferia de Paris. É um dos primeiros campos de trigo de Van Gogh, tema que o acompanharia até Auvers.",
    arquivoCommons: "Korenveld met patrijs - s0197V1962 - Van Gogh Museum.jpg",
  },
  {
    slug: "a-italiana",
    titulo: "A Italiana",
    ano: 1887,
    periodo: "paris",
    wikiTitle: "Agostina Segatori",
    museu: "Musée d'Orsay, Paris",
    descricao:
      "Provável retrato de Agostina Segatori em traje típico italiano, com fundo amarelo chapado e moldura listrada pintada. As cores puras e a figura plana vêm das estampas japonesas que Van Gogh colecionava.",
    arquivoCommons: "Vincent van Gogh - The Italian Woman - Google Art Project.jpg",
  },
  {
    slug: "autorretrato-com-chapeu-de-feltro-cinza",
    titulo: "Autorretrato com Chapéu de Feltro Cinza",
    ano: 1887,
    periodo: "paris",
    wikiTitle: "Portraits of Vincent van Gogh",
    museu: "Van Gogh Museum, Amsterdã",
    descricao:
      "O autorretrato mais ousado dos anos parisienses: traços curtos de cores complementares irradiam em volta da cabeça como uma auréola. Mostra como Van Gogh adaptou o pontilhismo a um ritmo próprio.",
    arquivoCommons: "Zelfportret met grijze vilthoed - s0016V1962 - Van Gogh Museum.jpg",
  },
  {
    slug: "autorretrato-como-pintor",
    titulo: "Autorretrato como Pintor",
    ano: 1888,
    periodo: "paris",
    wikiTitle: "Portraits of Vincent van Gogh",
    museu: "Van Gogh Museum, Amsterdã",
    descricao:
      "Pintado pouco antes de deixar Paris, mostra o artista diante do cavalete com a paleta de cores puras. Van Gogh descreveu a Theo um rosto 'cinza-rosado, olhos verdes' e marcado pelo cansaço da cidade.",
    larguraCm: 50,
    alturaCm: 65.1,
    tecnica: "Óleo sobre tela",
    arquivoCommons: "Zelfportret als schilder - s0022V1962 - Van Gogh Museum.jpg",
  },
  // ---------- ARLES (1888–1889) ----------
  {
    slug: "girassois",
    titulo: "Os Girassóis",
    ano: 1888,
    periodo: "arles",
    wikiTitle: "Sunflowers (Van Gogh series)",
    museu: "National Gallery, Londres (entre outras versões)",
    descricao:
      "Série de naturezas-mortas feitas para decorar o quarto de Gauguin na Casa Amarela. Van Gogh explorou todas as gamas do amarelo sobre amarelo, transformando flores murchas em símbolo de gratidão e amizade.",
    larguraCm: 73,
    alturaCm: 92.1,
    tecnica: "Óleo sobre tela",
  },
  {
    slug: "quarto-em-arles",
    titulo: "O Quarto em Arles",
    ano: 1888,
    periodo: "arles",
    wikiTitle: "Bedroom in Arles",
    museu: "Van Gogh Museum, Amsterdã",
    descricao:
      "Seu próprio quarto na Casa Amarela, pintado com perspectiva deliberadamente distorcida para transmitir repouso absoluto. As cores planas e vivas refletem a influência das estampas japonesas.",
    larguraCm: 90,
    alturaCm: 72,
    tecnica: "Óleo sobre tela",
  },
  {
    slug: "o-cafe-noturno",
    titulo: "O Café Noturno",
    ano: 1888,
    periodo: "arles",
    wikiTitle: "The Night Café",
    museu: "Yale University Art Gallery, New Haven",
    descricao:
      "Van Gogh descreveu este café como um lugar 'onde se pode arruinar-se, enlouquecer ou cometer um crime'. Os vermelhos e verdes violentos em choque traduzem a atmosfera opressiva da noite.",
    larguraCm: 89,
    alturaCm: 70,
    tecnica: "Óleo sobre tela",
  },
  {
    slug: "terraço-do-cafe-a-noite",
    titulo: "Terraço do Café à Noite",
    ano: 1888,
    periodo: "arles",
    wikiTitle: "Café Terrace at Night",
    museu: "Kröller-Müller Museum, Otterlo",
    descricao:
      "Primeiro céu estrelado de Van Gogh: um terraço iluminado a gás na Place du Forum, em Arles. A tela combina o amarelo quente da luz artificial com o azul profundo da noite — sem usar preto.",
    larguraCm: 65.3,
    alturaCm: 80.7,
    tecnica: "Óleo sobre tela",
  },
  {
    slug: "noite-estrelada-sobre-o-rodano",
    titulo: "Noite Estrelada sobre o Ródano",
    ano: 1888,
    periodo: "arles",
    wikiTitle: "Starry Night Over the Rhône",
    museu: "Musée d'Orsay, Paris",
    descricao:
      "As constelações refletem-se nas águas do rio Ródano sob as luzes de gás de Arles. Pintado à beira do rio, é o ensaio direto para a grande Noite Estrelada do ano seguinte.",
    larguraCm: 92,
    alturaCm: 72.5,
    tecnica: "Óleo sobre tela",
  },
  {
    slug: "a-casa-amarela",
    titulo: "A Casa Amarela",
    ano: 1888,
    periodo: "arles",
    wikiTitle: "The Yellow House",
    museu: "Van Gogh Museum, Amsterdã",
    descricao:
      "A casa na Place Lamartine que Van Gogh alugou e sonhou transformar no 'Ateliê do Sul', uma comunidade de artistas. Viveu ali seus meses mais produtivos — e também a crise com Gauguin.",
    larguraCm: 91.5,
    alturaCm: 72,
    tecnica: "Óleo sobre tela",
  },
  {
    slug: "o-vinhedo-vermelho",
    titulo: "O Vinhedo Vermelho",
    ano: 1888,
    periodo: "arles",
    wikiTitle: "The Red Vineyard",
    museu: "Museu Pushkin, Moscou",
    descricao:
      "A única tela que Van Gogh vendeu em vida, comprada pela pintora Anna Boch por 400 francos. Retrata colhedores de uva ao pôr do sol, com o vinhedo tingido de vermelho e dourado.",
    larguraCm: 93,
    alturaCm: 75,
    tecnica: "Óleo sobre tela",
  },
  {
    slug: "a-ponte-de-langlois",
    titulo: "A Ponte de Langlois em Arles",
    ano: 1888,
    periodo: "arles",
    wikiTitle: "Langlois Bridge at Arles",
    museu: "Van Gogh Museum, Amsterdã",
    descricao:
      "A ponte levadiça sobre o canal lembrava a Van Gogh as pontes das gravuras japonesas. Pintou-a várias vezes, encantado com a geometria azul da estrutura contra o céu provençal.",
  },
  {
    slug: "a-colheita",
    titulo: "A Colheita",
    ano: 1888,
    periodo: "arles",
    wikiTitle: "The Harvest (Van Gogh)",
    museu: "Van Gogh Museum, Amsterdã",
    descricao:
      "Vista panorâmica da planície de La Crau no verão, com carroças e ceifeiros minúsculos. O próprio artista considerava-a uma de suas telas mais bem-sucedidas pelo equilíbrio entre cor e trabalho rural.",
    larguraCm: 91.8,
    alturaCm: 73.4,
    tecnica: "Óleo sobre tela",
  },
  {
    slug: "lembranca-do-jardim-de-etten",
    titulo: "Lembrança do Jardim de Etten",
    ano: 1888,
    periodo: "arles",
    wikiTitle: "Memory of the Garden at Etten (Ladies of Arles)",
    museu: "Hermitage, São Petersburgo",
    descricao:
      "Pintado de memória, sem modelo: o jardim da casa de infância na Holanda, com figuras que evocam a mãe e a irmã. As cores irreais e o traço decorativo mostram a influência de Gauguin.",
  },
  {
    slug: "la-berceuse",
    titulo: "La Berceuse (A Cantora de Cantigas de Ninar)",
    ano: 1889,
    periodo: "arles",
    wikiTitle: "La Berceuse",
    museu: "Museum of Fine Arts, Boston (entre outras versões)",
    descricao:
      "Retrato de Augustine Roulin, esposa do carteiro amigo, segurando o cordão de um berço invisível. Van Gogh via nela uma 'consoladora' universal e repetiu o tema em cinco versões.",
    larguraCm: 73.7,
    alturaCm: 92.7,
    tecnica: "Óleo sobre tela",
  },
  {
    slug: "autorretrato-com-orelha-enfaixada",
    titulo: "Autorretrato com a Orelha Enfaixada",
    ano: 1889,
    periodo: "arles",
    wikiTitle: "Self-Portrait with Bandaged Ear",
    museu: "Courtauld Gallery, Londres",
    descricao:
      "Pintado semanas após o episódio em que cortou parte da própria orelha durante a crise com Gauguin. O casaco pesado e a estampa japonesa ao fundo mostram o artista tentando retomar o trabalho.",
    larguraCm: 49,
    alturaCm: 60,
    tecnica: "Óleo sobre tela",
  },
  {
    slug: "o-zouave",
    titulo: "O Zouave",
    ano: 1888,
    periodo: "arles",
    wikiTitle: "The Zouave",
    museu: "Van Gogh Museum, Amsterdã",
    descricao:
      "Retrato de um soldado do regimento de zouaves estacionado em Arles. Van Gogh ficou fascinado pelo uniforme vermelho e azul e pelas feições 'selvagens' do modelo, pintando-o em várias versões.",
  },
  {
    slug: "larlesienne",
    titulo: "L'Arlésienne",
    ano: 1888,
    periodo: "arles",
    wikiTitle: "L'Arlésienne (painting)",
    museu: "Musée d'Orsay, Paris (entre outras versões)",
    descricao:
      "Retrato de Marie Ginoux, dona do Café de la Gare, em pose de leitura. Van Gogh e Gauguin pintaram-na juntos; a versão de Van Gogh, com fundo amarelo e livros coloridos, é um dos grandes retratos da fase de Arles.",
  },
  {
    slug: "familia-roulin",
    titulo: "A Família Roulin",
    ano: 1888,
    periodo: "arles",
    wikiTitle: "The Roulin Family",
    museu: "Museum of Fine Arts, Boston / Kröller-Müller / Van Gogh Museum",
    descricao:
      "Série de retratos do carteiro Joseph Roulin e de sua família — a esposa Augustine e os filhos Armand, Camille e Marcelle. Foram os amigos mais próximos de Van Gogh em Arles e os modelos de dezenas de telas.",
  },
  {
    slug: "pomares-em-flor",
    titulo: "Pomares em Flor",
    ano: 1888,
    periodo: "arles",
    wikiTitle: "Flowering Orchards",
    museu: "Van Gogh Museum, Amsterdã (entre outras versões)",
    descricao:
      "Série pintada na primavera de 1888, quando Van Gogh chegou a Arles e se encantou com as árvores floridas. As pinceladas livres e os brancos luminosos celebram o renascimento da natureza provençal.",
  },
  {
    slug: "oleandros",
    titulo: "Natureza-Morta com Oleandros",
    ano: 1888,
    periodo: "arles",
    wikiTitle: "Still Life: Vase with Oleanders",
    museu: "Metropolitan Museum of Art, Nova York",
    descricao:
      "Um vaso de oleandros rosa sobre uma mesa, ao lado de um exemplar de 'A Alegria de Viver' de Zola. As flores, tóxicas e exuberantes, contrastam com o livro — símbolo de vida e de literatura que Van Gogh amava.",
  },
  {
    slug: "barcos-de-pesca-em-saintes-maries",
    titulo: "Barcos de Pesca na Praia de Saintes-Maries",
    ano: 1888,
    periodo: "arles",
    wikiTitle: "Saintes-Maries (Van Gogh series)",
    museu: "Van Gogh Museum, Amsterdã",
    descricao:
      "Numa viagem ao Mediterrâneo em junho de 1888, Van Gogh desenhou os barcos coloridos na areia antes que os pescadores partissem. A tela, feita depois em Arles, tem cores planas de estampa japonesa.",
    tecnica: "Óleo sobre tela",
    arquivoCommons:
      "Vissersboten op het strand van Les Saintes-Maries-de-la-Mer - s0028V1962 - Van Gogh Museum.jpg",
  },
  {
    slug: "o-semeador",
    titulo: "O Semeador ao Pôr do Sol",
    ano: 1888,
    periodo: "arles",
    wikiTitle: "Wheat Fields",
    museu: "Kröller-Müller Museum, Otterlo",
    descricao:
      "Um camponês lança sementes sob um sol enorme, em homenagem ao Semeador de Millet. Van Gogh usou cores deliberadamente irreais — um campo violeta e um céu amarelo — para expressar o ciclo da vida.",
    tecnica: "Óleo sobre tela",
    arquivoCommons: "1888 van Gogh De zaaier anagoria.JPG",
  },
  {
    slug: "carteiro-joseph-roulin",
    titulo: "O Carteiro Joseph Roulin",
    ano: 1888,
    periodo: "arles",
    wikiTitle: "The Roulin Family",
    museu: "Museum of Fine Arts, Boston",
    descricao:
      "O carteiro de barba farta e uniforme azul, sentado de braços cruzados. Roulin foi o amigo mais fiel de Van Gogh em Arles; o pintor o comparava a Sócrates pela bondade e pelo jeito de filósofo.",
    tecnica: "Óleo sobre tela",
    arquivoCommons: "Vincent van Gogh-facteur-Boston.jpeg",
  },
  {
    slug: "eugene-boch",
    titulo: "Eugène Boch (O Poeta)",
    ano: 1888,
    periodo: "arles",
    wikiTitle: "Eugène Boch",
    museu: "Musée d'Orsay, Paris",
    descricao:
      "O pintor belga Eugène Boch, retratado contra um céu azul profundo com estrelas. Van Gogh queria pintar 'o homem que sonha' e fez do amigo a figura do poeta, pendurando a tela no próprio quarto.",
    tecnica: "Óleo sobre tela",
    arquivoCommons: "Vincent van Gogh - Eugène Boch - Google Art Project.jpg",
  },
  {
    slug: "a-cadeira-de-van-gogh",
    titulo: "A Cadeira de Van Gogh",
    ano: 1888,
    periodo: "arles",
    wikiTitle: "Van Gogh's Chair",
    museu: "National Gallery, Londres",
    descricao:
      "Uma cadeira rústica de palha com cachimbo e tabaco, sobre o piso de ladrilhos da Casa Amarela. Formava par com a Cadeira de Gauguin: um autorretrato sem rosto, feito de objetos simples.",
    larguraCm: 73,
    alturaCm: 91.8,
    tecnica: "Óleo sobre tela",
  },
  // ---------- SAINT-RÉMY (1889–1890) ----------
  {
    slug: "a-noite-estrelada",
    titulo: "A Noite Estrelada",
    ano: 1889,
    periodo: "saint-remy",
    wikiTitle: "The Starry Night",
    museu: "MoMA, Nova York",
    descricao:
      "A obra mais famosa de Van Gogh: a vista noturna da janela do asilo de Saint-Rémy, reinventada de memória. O céu turbilhona em vórtices sobre um cipreste em chamas e uma vila imaginária com torre de igreja holandesa.",
    larguraCm: 92.1,
    alturaCm: 73.7,
    tecnica: "Óleo sobre tela",
  },
  {
    slug: "iris",
    titulo: "Íris",
    ano: 1889,
    periodo: "saint-remy",
    wikiTitle: "Irises (painting)",
    museu: "J. Paul Getty Museum, Los Angeles",
    descricao:
      "Pintada no jardim do asilo na primeira semana de internação. As íris violetas dançam sobre o fundo vermelho-terra; uma única flor branca destaca-se, talvez autorretrato do artista entre os demais.",
    larguraCm: 93,
    alturaCm: 71,
    tecnica: "Óleo sobre tela",
  },
  {
    slug: "campo-de-trigo-com-ciprestes",
    titulo: "Campo de Trigo com Ciprestes",
    ano: 1889,
    periodo: "saint-remy",
    wikiTitle: "Wheat Field with Cypresses",
    museu: "National Gallery, Londres",
    descricao:
      "Os ciprestes escuros como chamas verdes tornaram-se obsessão de Van Gogh em Saint-Rémy: 'belos como um obelisco egípcio'. O vento percorre o trigo e as nuvens em espirais contínuas.",
    larguraCm: 90.9,
    alturaCm: 72.1,
    tecnica: "Óleo sobre tela",
  },
  {
    slug: "ciprestes",
    titulo: "Ciprestes",
    ano: 1889,
    periodo: "saint-remy",
    wikiTitle: "Cypresses (Metropolitan Museum of Art)",
    museu: "Metropolitan Museum of Art, Nova York",
    descricao:
      "Dois ciprestes torcidos como chamas sobem até a borda da tela, sob um céu de nuvens espirais. Pintado em junho de 1889, pouco depois da internação, com a tinta aplicada em relevo espesso.",
    larguraCm: 74,
    alturaCm: 93.4,
    tecnica: "Óleo sobre tela",
  },
  {
    slug: "campo-de-trigo-com-ceifeiro",
    titulo: "Campo de Trigo com Ceifeiro",
    ano: 1889,
    periodo: "saint-remy",
    wikiTitle: "Reaper (Van Gogh series)",
    museu: "Kröller-Müller Museum, Otterlo (entre outras versões)",
    descricao:
      "Um ceifeiro no campo atrás do asilo, sob um sol matinal que inunda tudo de ouro. Van Gogh via nele a imagem da morte ceifando a humanidade, mas descreveu a cena como 'quase sorridente'.",
  },
  {
    slug: "amendoeira-em-flor",
    titulo: "Amendoeira em Flor",
    ano: 1890,
    periodo: "saint-remy",
    wikiTitle: "Almond Blossoms",
    museu: "Van Gogh Museum, Amsterdã",
    descricao:
      "Presente para o sobrinho recém-nascido, batizado Vincent em sua homenagem. Galhos de amendoeira contra o céu turquesa, com contornos de gravura japonesa — símbolo de vida nova em pleno inverno.",
    larguraCm: 92.4,
    alturaCm: 73.3,
    tecnica: "Óleo sobre tela",
  },
  {
    slug: "a-porta-da-eternidade",
    titulo: "À Porta da Eternidade (O Velho em Aflição)",
    ano: 1890,
    periodo: "saint-remy",
    wikiTitle: "At Eternity's Gate",
    museu: "Kröller-Müller Museum, Otterlo",
    descricao:
      "Um velho sentado, o rosto enterrado nas mãos — talvez a imagem mais crua da angústia de Van Gogh. Baseada numa litografia que ele mesmo fizera anos antes, ganhou cores intensas na versão em óleo.",
    larguraCm: 64,
    alturaCm: 80,
    tecnica: "Óleo sobre tela",
  },
  {
    slug: "oliveiras",
    titulo: "Oliveiras",
    ano: 1889,
    periodo: "saint-remy",
    wikiTitle: "Olive Trees (Van Gogh series)",
    museu: "MoMA, Nova York (entre outras versões)",
    descricao:
      "Série sobre os olivais ao pé dos Alpilles. Para Van Gogh, as oliveiras retorcidas eram ao mesmo tempo estudo de natureza e meditação espiritual — 'a luta do homem com a natureza'.",
  },
  {
    slug: "autorretrato-1889",
    titulo: "Autorretrato",
    ano: 1889,
    periodo: "saint-remy",
    wikiTitle: "Van Gogh self-portrait (1889)",
    museu: "Musée d'Orsay, Paris",
    descricao:
      "Seu último grande autorretrato: o rosto imóvel e determinado emerge de um fundo de arabescos azuis em redemoinho. Possivelmente o quadro que levou a Theo como prova de recuperação.",
    larguraCm: 54,
    alturaCm: 65,
    tecnica: "Óleo sobre tela",
  },
  {
    slug: "a-ronda-dos-prisioneiros",
    titulo: "A Ronda dos Prisioneiros",
    ano: 1890,
    periodo: "saint-remy",
    wikiTitle: "The Round of the Prisoners",
    museu: "Museu Pushkin, Moscou",
    descricao:
      "Cópia de uma gravura de Gustave Doré: presos marcham em círculo num pátio sem saída. No asilo, Van Gogh identificava-se com eles — um dos rostos do círculo seria um autorretrato disfarçado.",
  },
  {
    slug: "estrada-com-cipreste-e-estrela",
    titulo: "Estrada com Cipreste e Estrela",
    ano: 1890,
    periodo: "saint-remy",
    wikiTitle: "Road with Cypress and Star",
    museu: "Kröller-Müller Museum, Otterlo",
    descricao:
      "Uma estrada noturna sob uma estrela enorme e um crescente lunar, dominada por um cipreste flamejante. Van Gogh descreveu-a a Theo como uma de suas telas mais expressivas do período do asilo.",
  },
  {
    slug: "rosas-rosadas",
    titulo: "Vaso com Rosas Rosadas",
    ano: 1890,
    periodo: "saint-remy",
    wikiTitle: "Still Life: Vase with Pink Roses",
    museu: "National Gallery of Art, Washington",
    descricao:
      "Pintada nos últimos dias em Saint-Rémy, como um presente de despedida. As rosas quase brancas sobre fundo verde-claro transmitem calma e esperança — contraste deliberado com as tempestades dos ciprestes.",
  },
  {
    slug: "a-sesta",
    titulo: "A Sesta",
    ano: 1890,
    periodo: "saint-remy",
    wikiTitle: "The Siesta (Van Gogh)",
    museu: "Musée d'Orsay, Paris",
    descricao:
      "Homenagem a Millet, de quem Van Gogh copiou a composição de um casal descansando sobre o feno ao meio-dia. A luz dourada e violeta transforma o descanso camponês em idílio provençal.",
  },
  {
    slug: "primeiros-passos",
    titulo: "Primeiros Passos (segundo Millet)",
    ano: 1890,
    periodo: "saint-remy",
    wikiTitle: "Copies by Vincent van Gogh",
    museu: "Metropolitan Museum of Art, Nova York",
    descricao:
      "Um pai larga a pá e abre os braços para a filha que dá os primeiros passos. No asilo, sem modelos, Van Gogh 'traduzia' gravuras de Millet em cor, como um músico interpreta uma partitura.",
    larguraCm: 91.1,
    alturaCm: 72.4,
    tecnica: "Óleo sobre tela",
    arquivoCommons: "First Steps, after Millet MET DP124808.jpg",
  },
  // ---------- AUVERS-SUR-OISE (1890) ----------
  {
    slug: "retrato-do-dr-gachet",
    titulo: "Retrato do Dr. Gachet",
    ano: 1890,
    periodo: "auvers",
    wikiTitle: "Portrait of Dr. Gachet",
    museu: "Coleção particular (Musée d'Orsay guarda a 2ª versão)",
    descricao:
      "O médico homeopata e pintor amador que cuidou de Van Gogh nos últimos meses. A pose melancólica e a dedaleira (digitalis) sobre a mesa resumem o 'rosto quebrantado do nosso tempo', nas palavras do artista.",
    larguraCm: 56,
    alturaCm: 67,
    tecnica: "Óleo sobre tela",
  },
  {
    slug: "a-igreja-de-auvers",
    titulo: "A Igreja de Auvers",
    ano: 1890,
    periodo: "auvers",
    wikiTitle: "The Church at Auvers",
    museu: "Musée d'Orsay, Paris",
    descricao:
      "A igreja gótica da vila vista sob um céu cobalto profundo, com caminhos que divergem no primeiro plano. A arquitetura ondula como se viva, entre o sol e a sombra.",
    larguraCm: 74,
    alturaCm: 94,
    tecnica: "Óleo sobre tela",
  },
  {
    slug: "campo-de-trigo-com-corvos",
    titulo: "Campo de Trigo com Corvos",
    ano: 1890,
    periodo: "auvers",
    wikiTitle: "Wheatfield with Crows",
    museu: "Van Gogh Museum, Amsterdã",
    descricao:
      "Longamente lida como tela de despedida: três caminhos que não levam a lugar algum, corvos negros sobre o trigo dourado e um céu de tempestade. Escreveu a Theo sobre a 'tristeza e a solidão extrema' desses campos.",
    larguraCm: 103,
    alturaCm: 50.5,
    tecnica: "Óleo sobre tela",
  },
  {
    slug: "raizes-de-arvore",
    titulo: "Raízes de Árvore",
    ano: 1890,
    periodo: "auvers",
    wikiTitle: "Tree Roots",
    museu: "Van Gogh Museum, Amsterdã",
    descricao:
      "Considerada sua última pintura, deixada inacabada no dia em que se feriu mortalmente. Troncos e raízes entrelaçados em verde e ocre ocupam toda a tela — uma luta abstrata da vida contra a terra.",
    larguraCm: 100,
    alturaCm: 50,
    tecnica: "Óleo sobre tela",
  },
  {
    slug: "o-jardim-de-daubigny",
    titulo: "O Jardim de Daubigny",
    ano: 1890,
    periodo: "auvers",
    wikiTitle: "Daubigny's Garden",
    museu: "Kunstmuseum Basel / Van Gogh Museum",
    descricao:
      "O jardim da casa do pintor Daubigny, herói da geração anterior de paisagistas, que Van Gogh venerava. Pintou-o três vezes, uma delas sobre um pano de cozinha por falta de tela.",
  },
  {
    slug: "a-casa-branca-a-noite",
    titulo: "A Casa Branca à Noite",
    ano: 1890,
    periodo: "auvers",
    wikiTitle: "White House at Night",
    museu: "Hermitage, São Petersburgo",
    descricao:
      "Uma casa solitária sob um céu verde-escuro com uma única estrela branca. A tela, cheia de presságio, permaneceu décadas esquecida e hoje é vista como obra-chave dos últimos dias.",
  },
  {
    slug: "casas-em-auvers",
    titulo: "Casas em Auvers",
    ano: 1890,
    periodo: "auvers",
    wikiTitle: "Houses at Auvers",
    museu: "MFA Boston / Toledo Museum of Art (versões)",
    descricao:
      "As casas de telhado inclinado da vila de Auvers, pintadas com pinceladas densas e cores saturadas. Van Gogh captou a arquitetura rural do norte da França com a mesma intensidade dos campos de trigo.",
  },
  {
    slug: "chales-de-colmo",
    titulo: "Chalés de Colmo e Casas",
    ano: 1890,
    periodo: "auvers",
    wikiTitle: "Thatched Cottages and Houses",
    museu: "Hermitage, São Petersburgo",
    descricao:
      "Chalés de colmo ondulantes sob um céu turbulento. A perspectiva baixa e as massas de cor fazem as construções parecerem vivas — uma das paisagens mais expressionistas dos últimos meses.",
  },
  {
    slug: "paisagem-com-carruagem-e-trem",
    titulo: "Paisagem com Carruagem e Trem",
    ano: 1890,
    periodo: "auvers",
    wikiTitle: "Landscape with a Carriage and a Train",
    museu: "Museu Pushkin, Moscou",
    descricao:
      "Um campo verde cortado por uma estrada e, ao fundo, um trem a vapor. A modernidade do século XIX invade a paisagem rural — Van Gogh, fascinado por trens, os incluía como sinais do tempo novo.",
  },
  {
    slug: "retrato-de-adeline-ravoux",
    titulo: "Retrato de Adeline Ravoux",
    ano: 1890,
    periodo: "auvers",
    wikiTitle: "Portrait of Adeline Ravoux",
    museu: "Cleveland Museum of Art (entre outras versões)",
    descricao:
      "A filha adolescente do dono da pensão onde Van Gogh morava em Auvers. Pintada em azul e verde com o olhar sereno, é um dos últimos retratos do artista e um registro da vida cotidiana da vila.",
    larguraCm: 56.5,
    alturaCm: 67.3,
    tecnica: "Óleo sobre tela",
  },
  {
    slug: "ramos-de-castanheiro-em-flor",
    titulo: "Ramos de Castanheiro em Flor",
    ano: 1890,
    periodo: "auvers",
    wikiTitle: "Blossoming Chestnut Branches",
    museu: "Fundação E.G. Bührle, Zurique",
    descricao:
      "Galhos de castanheiro em flor sobre fundo azul-violeta, pintados em Auvers na primavera. As flores brancas e os contornos sinuosos lembram as amendoeiras de Saint-Rémy, agora com a luz do norte.",
  },
  {
    slug: "campos-de-trigo-verde-auvers",
    titulo: "Campos de Trigo Verde, Auvers",
    ano: 1890,
    periodo: "auvers",
    wikiTitle: "Wheat Fields",
    museu: "National Gallery of Art, Washington",
    descricao:
      "Um campo de trigo ainda verde ondulando ao vento, sem horizonte nem figuras. As pinceladas longas e rítmicas quase tornam a paisagem abstrata — puro movimento de cor.",
    larguraCm: 91.44,
    alturaCm: 72.39,
    tecnica: "Óleo sobre tela",
    arquivoCommons: "Vincent van Gogh, Green Wheat Fields, Auvers, 1890, NGA 163323.jpg",
  },
  {
    slug: "marguerite-gachet-ao-piano",
    titulo: "Marguerite Gachet ao Piano",
    ano: 1890,
    periodo: "auvers",
    wikiTitle: "Marguerite Gachet",
    museu: "Kunstmuseum Basel",
    descricao:
      "A filha do Dr. Gachet ao piano, num formato vertical e estreito incomum. O vestido branco e o fundo verde pontilhado de laranja fazem do retrato uma composição quase musical.",
    tecnica: "Óleo sobre tela",
    arquivoCommons: "Vincent van Gogh - Mademoiselle Gachet au piano.jpg",
  },
  {
    slug: "rua-e-escadaria-em-auvers",
    titulo: "Rua e Escadaria em Auvers",
    ano: 1890,
    periodo: "auvers",
    wikiTitle: "List of works by Vincent van Gogh",
    museu: "Saint Louis Art Museum",
    descricao:
      "Moradores sobem e descem os degraus de uma rua da vila, entre casas e árvores ondulantes. As figuras pequenas e os caminhos sinuosos mostram a vida cotidiana de Auvers nos últimos meses do pintor.",
    tecnica: "Óleo sobre tela",
    arquivoCommons: "Vincent van Gogh - Stairway at Auvers - 1-1935 - Saint Louis Art Museum.jpg",
  },
  {
    slug: "camponesa-diante-do-trigo",
    titulo: "Camponesa Diante do Trigo",
    ano: 1890,
    periodo: "auvers",
    wikiTitle: "Peasant Woman Against a Background of Wheat",
    museu: "Coleção particular",
    descricao:
      "Uma camponesa de chapéu de palha amarelo e blusa azul pontilhada, diante de uma parede de espigas e papoulas. Van Gogh pintou várias versões do tema, unindo retrato e trigo, os dois grandes assuntos de Auvers.",
  },
  {
    slug: "fazendas-perto-de-auvers",
    titulo: "Fazendas perto de Auvers",
    ano: 1890,
    periodo: "auvers",
    wikiTitle: "Farms near Auvers",
    museu: "Tate, Londres",
    descricao:
      "Telhados de colmo cobertos de musgo, cujas curvas se repetem nos campos e colinas. Van Gogh escreveu à irmã que os telhados eram 'soberbos'; o céu em branco sugere uma tela inacabada.",
  },
  {
    slug: "campo-de-trigo-sob-nuvens-de-tempestade",
    titulo: "Campo de Trigo sob Nuvens de Tempestade",
    ano: 1890,
    periodo: "auvers",
    wikiTitle: "Wheat Fields",
    museu: "Van Gogh Museum, Amsterdã",
    descricao:
      "Uma faixa verde de trigo sob um céu azul pesado, num formato largo de 'quadrado duplo'. Van Gogh falou a Theo da 'tristeza e solidão extrema' desses campos, mas também do que via de saudável neles.",
    larguraCm: 101.3,
    alturaCm: 50.4,
    tecnica: "Óleo sobre tela",
    arquivoCommons: "Korenveld onder onweerslucht - s0106V1962 - Van Gogh Museum.jpg",
  },
  {
    slug: "campos-de-trigo-apos-a-chuva",
    titulo: "Campos de Trigo após a Chuva (A Planície de Auvers)",
    ano: 1890,
    periodo: "auvers",
    wikiTitle: "Wheat Fields",
    museu: "Carnegie Museum of Art, Pittsburgh",
    descricao:
      "A planície de Auvers vista do alto, em faixas de verde e amarelo sob nuvens baixas. Pintada em julho de 1890, poucas semanas antes da morte, é uma das últimas grandes paisagens do artista.",
    tecnica: "Óleo sobre tela",
    arquivoCommons:
      "Vincent van Gogh - Wheat Fields after the Rain (The Plain of Auvers) - 1890.jpg",
  },
];

const imageMap = images as Record<string, string>;

export const artworks: Artwork[] = meta
  .map((m) => ({ ...m, imagem: imageMap[m.slug] ?? "/artworks/placeholder.jpg" }))
  .sort((a, b) => a.ano - b.ano);

export function getArtworksByPeriod(periodo: PeriodId): Artwork[] {
  return artworks.filter((a) => a.periodo === periodo);
}
