// Эталонные координаты для текущего дерева (левый верхний угол карточки)
// Формат: { id: number, x: number, y: number, level: number }

export const expectedCoordinates = {
  // Главный персонаж и супруг(а)
  mainCard: {
    id: 1,
    x: 0,
    y: 0,
    level: 0,
  },
  spouse: {
    id: 2,
    x: 250,
    y: 0,
    level: 0,
  },

  // Дети (первое поколение вниз)
  children: [
    {
      id: 4,
      x: -30,
      y: 400,
      level: 1,
    },
    {
      id: 3,
      x: 280,
      y: 400,
      level: 1,
    },
  ],

  // Родители (первое поколение вверх)
  parents: [
    {
      id: 6,
      x: 155,
      y: -400,
      level: -1,
    },
    {
      id: 7,
      x: 405,
      y: -400,
      level: -1,
    },
  ],

  // Бабушки и дедушки
  grandparents: [
    {
      id: 13,
      x: 31,
      y: -800,
      level: -2,
    },
    {
      id: 14,
      x: 281,
      y: -800,
      level: -2,
    },
    {
      id: 8,
      x: 638,
      y: -800,
      level: -2,
    },
    {
      id: 9,
      x: 888,
      y: -800,
      level: -2,
    },
  ],

  // Прочие родственники
  others: [
    {
      id: 15,
      x: 810,
      y: 0,
      level: 0,
    },
    {
      id: 12,
      x: 560,
      y: 0,
      level: 0,
    },
    {
      id: 11,
      x: 1120,
      y: 0,
      level: 0,
    },
    {
      id: 10,
      x: 1120,
      y: -400,
      level: -1,
    },
    {
      id: 16,
      x: 685,
      y: 400,
      level: 1,
    },
  ],
};

export function getAllExpectedCoordinates() {
  return [
    expectedCoordinates.mainCard,
    expectedCoordinates.spouse,
    ...expectedCoordinates.children,
    ...expectedCoordinates.parents,
    ...expectedCoordinates.grandparents,
    ...expectedCoordinates.others,
  ];
}
