// Простой скрипт для запуска демонстрации
// Использует скомпилированную версию TypeScript кода

const { computeLayout } = require('./dist/src/core/layout.js');
const { usersSample, linksSample } = require('./dist/tests/sample-data.js');

const layoutOptions = {
  rootId: 1,
  cardW: 220,
  cardH: 250,
  hGap: 40,
  vGap: 80,
  spouseGutter: 30,
  failOnUnknownIds: true,
};

console.log('🌳 ДЕМОНСТРАЦИЯ АЛГОРИТМА СЕМЕЙНОГО ДЕРЕВА\n');

try {
  const result = computeLayout(usersSample, linksSample, layoutOptions);

  console.log('✅ Расчет координат выполнен успешно!');
  console.log(`📊 Размещено пользователей: ${result.length}\n`);

  // Простой вывод координат
  result
    .sort((a, b) => a.level - b.level || a.x - b.x)
    .forEach((node) => {
      const { user, x, y, level, badgeRu } = node;
      console.log(
        `${user.firstName} ${user.lastName}: (${x}, ${y}) - ${badgeRu} [уровень ${level}]`
      );
    });
} catch (error) {
  console.error('❌ Ошибка при расчете:', error.message);
}

console.log(
  '\n📝 Для более подробной информации скомпилируйте и запустите demo-layout.ts'
);
console.log('   npm run build && node dist/demo-layout.js');
