export type Sex = 'male' | 'female';

export interface User {
  id: number;
  lastName: string;
  firstName: string;
  patronymic?: string;
  birthDate?: string; // "DD.MM.YYYY"
  deathDate?: string; // "DD.MM.YYYY"
  sex?: Sex;
}

export type Link =
  | { type: 'spouse'; a: number; b: number }
  | { type: 'parent'; parent: number; child: number };

export enum Badge {
  SELF = 'self',
  SPOUSE = 'spouse',
  CHILD = 'child',
  GRANDCHILD = 'grandchild',
  PARENT = 'parent',
  GRANDPARENT = 'grandparent',
  SIBLING = 'sibling',
  IN_LAW = 'in_law',
  UNCLE_AUNT = 'uncle_aunt',
  NEPHEW_NIECE = 'nephew_niece',
  COUSIN = 'cousin',
  UNKNOWN = 'unknown',
}

export enum BadgeRu {
  SELF = 'Вы',
  SPOUSE = 'Супруг/супруга',
  CHILD = 'Ребёнок',
  GRANDCHILD = 'Внук/внучка',
  PARENT = 'Родитель',
  GRANDPARENT = 'Дедушка/бабушка',
  SIBLING = 'Брат/сестра',
  IN_LAW = 'Родственник через брак',
  UNCLE_AUNT = 'Дядя/тётя',
  NEPHEW_NIECE = 'Племянник/племянница',
  COUSIN = 'Кузен/кузина',
  UNKNOWN = 'Не определено',
}

export interface LayoutOptions {
  rootId: number;
  cardW?: number;      // по умолчанию 220
  cardH?: number;      // по умолчанию 250
  hGap?: number;       // горизонтальный зазор между колонками
  vGap?: number;       // вертикальный зазор между поколениями
  spouseGutter?: number; // зазор между супругами
  failOnUnknownIds?: boolean; // true -> бросать ошибку на несуществующие id в связях
}

export interface LayoutNode {
  id: number;
  user: User;
  badge: Badge;
  badgeRu: BadgeRu;
  x: number; // левый верхний угол
  y: number;
  level: number; // 0=root, -1=родители, +1=дети, и т.д.
  mateId?: number;
}

export interface UnionNode {
  uid: string;           // стабильный ключ союза
  members: number[];     // [id] или [idA, idB] (в порядке: male слева, если известен)
  level: number;         // поколение
  children: UnionNode[]; // дочерние союзы (следующее поколение)
  // Геометрия в расчёте:
  subtreeW: number;      // ширина поддерева в пикселях (включая пробелы)
  ownWidth: number;      // width of the union block
  xLeft: number;         // left edge of the union block
  xCenter: number;       // центр союза по X (для последующей экспансии в людей)
}
