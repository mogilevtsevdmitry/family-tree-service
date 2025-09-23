// Эталонные координаты для текущего дерева (левый верхний угол карточки)
// Формат: { id: number, x: number, y: number, level: number }

export const expectedCoordinates = {
  // Я
  mainCard: {
    id: 1,
    x: 0,
    y: 0,
    level: 0,
  },
  // Мария
  spouse: {
    id: 2,
    x: 250,
    y: 0,
    level: 0,
  },

  // Дети (первое поколение вниз)
  children: [
    // Ксюша
    {
      id: 4,
      x: -30,
      y: 400,
      level: 1,
    },
    //Арина
    {
      id: 3,
      x: 280,
      y: 400,
      level: 1,
    },
  ],

  // Родители (первое поколение вверх)
  parents: [
    // Отец
    {
      id: 6,
      x: 155,
      y: -400,
      level: -1,
    },
    // Мать
    {
      id: 7,
      x: 405,
      y: -400,
      level: -1,
    },
  ],

  // Бабушки и дедушки
  grandparents: [
    // Василий
    {
      id: 13,
      x: 30,
      y: -800,
      level: -2,
    },
    // Зоя
    {
      id: 14,
      x: 280,
      y: -800,
      level: -2,
    },
    // Николай
    {
      id: 8,
      x: 637.5,
      y: -800,
      level: -2,
    },
    // Валентина
    {
      id: 9,
      x: 887.5,
      y: -800,
      level: -2,
    },
  ],

  // Прочие родственники
  others: [
    // Коля
    {
      id: 15,
      x: 810,
      y: 0,
      level: 0,
    },
    // Алёна
    {
      id: 12,
      x: 560,
      y: 0,
      level: 0,
    },
    // Андрей
    {
      id: 11,
      x: 1120,
      y: 0,
      level: 0,
    },
    // Наталья
    {
      id: 10,
      x: 1120,
      y: -400,
      level: -1,
    },
    // Олег
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
