import { computeLayout } from './src/core/layout';
import { usersSample, linksSample } from './tests/sample-data';
import { LayoutOptions } from './src/core/types';

// Опции для расчета макета
const layoutOptions: LayoutOptions = {
  rootId: 1, // ID главного пользователя (Дмитрий Могилевцев)
  cardW: 220, // ширина карточки
  cardH: 250, // высота карточки
  hGap: 40, // горизонтальный отступ между карточками
  vGap: 80, // вертикальный отступ между уровнями
  spouseGutter: 30, // отступ между супругами
  failOnUnknownIds: true, // строго проверять существование всех ID
};

// Вычисляем координаты для всех пользователей
const layoutResult = computeLayout(usersSample, linksSample, layoutOptions);

// Выводим результат
console.log('=== РЕЗУЛЬТАТ РАСЧЕТА КООРДИНАТ ===\n');

// Группируем по уровням для удобного просмотра
const byLevel = new Map<number, typeof layoutResult>();
for (const node of layoutResult) {
  if (!byLevel.has(node.level)) {
    byLevel.set(node.level, []);
  }
  byLevel.get(node.level)!.push(node);
}

// Выводим по уровням (от верхних к нижним)
const sortedLevels = Array.from(byLevel.keys()).sort((a, b) => a - b);

for (const level of sortedLevels) {
  const nodes = byLevel.get(level)!;
  const levelName =
    level === 0
      ? 'КОРЕНЬ'
      : level > 0
      ? `ДЕТИ (${level})`
      : `ПРЕДКИ (${Math.abs(level)})`;

  console.log(`--- ${levelName} ---`);

  // Сортируем по X координате для удобства
  nodes.sort((a, b) => a.x - b.x);

  for (const node of nodes) {
    const { user, x, y, badge, badgeRu, mateId } = node;
    const mateInfo = mateId ? ` (супруг: ID ${mateId})` : '';

    console.log(
      `ID ${user.id}: ${user.firstName} ${user.lastName}` +
        `\n  Координаты: (${x}, ${y})` +
        `\n  Роль: ${badgeRu} (${badge})${mateInfo}` +
        `\n  Дата рождения: ${user.birthDate}\n`
    );
  }
}

// Дополнительная статистика
console.log('=== СТАТИСТИКА ===');
console.log(`Всего пользователей: ${layoutResult.length}`);
console.log(
  `Уровней: ${sortedLevels.length} (от ${Math.min(
    ...sortedLevels
  )} до ${Math.max(...sortedLevels)})`
);

// Проверяем наличие пересечений (не должно быть)
let hasOverlaps = false;
for (let i = 0; i < layoutResult.length; i++) {
  for (let j = i + 1; j < layoutResult.length; j++) {
    const a = layoutResult[i];
    const b = layoutResult[j];

    const aRight = a.x + (layoutOptions.cardW || 220);
    const aBottom = a.y + (layoutOptions.cardH || 250);
    const bRight = b.x + (layoutOptions.cardW || 220);
    const bBottom = b.y + (layoutOptions.cardH || 250);

    const overlaps = !(
      aRight <= b.x ||
      bRight <= a.x ||
      aBottom <= b.y ||
      bBottom <= a.y
    );

    if (overlaps) {
      console.log(`⚠️  ПЕРЕСЕЧЕНИЕ: ID ${a.id} и ID ${b.id}`);
      hasOverlaps = true;
    }
  }
}

if (!hasOverlaps) {
  console.log('✅ Пересечений карточек не обнаружено');
}

// Возвращаем массив для возможного использования в других местах
export { layoutResult };
export default layoutResult;
