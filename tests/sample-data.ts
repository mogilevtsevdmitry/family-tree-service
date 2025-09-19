import { Link, User } from '../src/core/types';

export const usersSample: User[] = [
  { id: 1,  lastName: 'Могилевцев', firstName: 'Дмитрий', patronymic: 'Александрович', birthDate: '25.03.1991', sex: 'male' },
  { id: 2,  lastName: 'Седлецкая',  firstName: 'Мария',   patronymic: 'Сергеевна',      birthDate: '23.01.1990', sex: 'female' },
  { id: 3,  lastName: 'Могилевцева',firstName: 'Арина',   patronymic: 'Дмитриевна',     birthDate: '03.09.2019', sex: 'female' },
  { id: 4,  lastName: 'Могилевцева',firstName: 'Ксения',  patronymic: 'Дмитриевна',     birthDate: '02.04.2014', sex: 'female' },

  { id: 6,  lastName: 'Могилевцев', firstName: 'Александр', patronymic: 'Васильевич',   birthDate: '30.06.1965', sex: 'male' },
  { id: 7,  lastName: 'Могилевцева',firstName: 'Ирина',     patronymic: 'Николаевна',   birthDate: '09.01.1971', sex: 'female' },
  { id: 8,  lastName: 'Беда',       firstName: 'Николай',   patronymic: 'Сергеевич',    birthDate: '01.11.1944', sex: 'male' },
  { id: 9,  lastName: 'Беда',       firstName: 'Валентина', patronymic: 'Ивановна',     birthDate: '17.08.1948', sex: 'female' },
  { id: 10, lastName: 'Вопилова',   firstName: 'Наталья',   patronymic: 'Сергеевна',    birthDate: '25.12.1969', sex: 'female' },
  { id: 11, lastName: 'Вопилов',    firstName: 'Андрей',    patronymic: 'Александрович',birthDate: '25.01.2000', sex: 'male' },
];

export const linksSample: Link[] = [
  { type: 'spouse', a: 1, b: 2 },
  { type: 'spouse', a: 6, b: 7 },
  { type: 'spouse', a: 8, b: 9 },
  { type: 'parent', parent: 1, child: 3 },
  { type: 'parent', parent: 2, child: 3 },
  { type: 'parent', parent: 1, child: 4 },
  { type: 'parent', parent: 2, child: 4 },
  { type: 'parent', parent: 6, child: 1 },
  { type: 'parent', parent: 7, child: 1 },
  { type: 'parent', parent: 8, child: 7 },
  { type: 'parent', parent: 9, child: 7 },
  { type: 'parent', parent: 8, child: 10 },
  { type: 'parent', parent: 9, child: 10 },
  { type: 'parent', parent: 10, child: 11 },
];

// Вариант с «дырявыми» id (5,12,13) — для проверки failOnUnknownIds
export const linksWithUnknowns: Link[] = [
  ...linksSample,
  { type: 'spouse', a: 12, b: 13 } as any,
  { type: 'parent', parent: 6, child: 5 } as any,
  { type: 'parent', parent: 7, child: 5 } as any,
];
