export type PeriodId = "nuenen" | "paris" | "arles" | "saint-remy" | "auvers";

export interface Period {
  id: PeriodId;
  nome: string;
  anos: string;
  local: string;
  descricao: string;
}

export const periods: Period[] = [
  {
    id: "nuenen",
    nome: "Nuenen",
    anos: "1883–1885",
    local: "Países Baixos",
    descricao:
      "Período sombrio e terroso. Van Gogh retrata camponeses e tecelões com uma paleta escura de marrons e verdes, culminando em sua primeira grande obra, Os Comedores de Batata.",
  },
  {
    id: "paris",
    nome: "Paris",
    anos: "1886–1888",
    local: "França",
    descricao:
      "Morando com o irmão Theo, descobre os impressionistas e a arte japonesa. Sua paleta clareia radicalmente e ele experimenta o pontilhismo e autorretratos luminosos.",
  },
  {
    id: "arles",
    nome: "Arles",
    anos: "1888–1889",
    local: "Provença, França",
    descricao:
      "O auge da cor. Na luz intensa do sul da França, cria os Girassóis, O Quarto em Arles e os cafés noturnos. Recebe Gauguin, sofre a crise da orelha cortada e termina internado.",
  },
  {
    id: "saint-remy",
    nome: "Saint-Rémy",
    anos: "1889–1890",
    local: "Asilo de Saint-Paul-de-Mausole",
    descricao:
      "Internado voluntariamente, pinta o jardim e as vistas do asilo. Nascem A Noite Estrelada, os ciprestes sinuosos e os campos de trigo em movimento — sua fase mais expressionista.",
  },
  {
    id: "auvers",
    nome: "Auvers-sur-Oise",
    anos: "1890",
    local: "França",
    descricao:
      "Os últimos 70 dias de vida, sob os cuidados do Dr. Gachet. Ritmo frenético: mais de 70 telas, incluindo A Igreja de Auvers e o enigmático Campo de Trigo com Corvos.",
  },
];
