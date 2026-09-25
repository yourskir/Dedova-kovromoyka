// ===== Awards: small milestones of the workshop =====
const ACH = [
  { id: "first", name: "Первый ковёр", desc: "Сдать первый заказ", icon: "star" },
  { id: "kg10", name: "Десять кило", desc: "Вынести из ковров 10 кг грязи", icon: "weight" },
  { id: "kg100", name: "Центнер", desc: "Вынести из ковров 100 кг грязи", icon: "weight" },
  { id: "light30", name: "Легче на треть", desc: "Сдать ковёр, который стал легче на 30%", icon: "weight" },
  { id: "three10", name: "Мастер", desc: "Получить три звезды за 10 заказов", icon: "star" },
  { id: "floor", name: "Чистый пол", desc: "Смыть всю грязь с пола в слив", icon: "hose" },
  { id: "white", name: "Белая бахрома", desc: "Отбелить бахрому целиком", icon: "brush" },
  { id: "repair", name: "Реставратор", desc: "Закончить весь ремонт на ковре", icon: "needle" },
  { id: "duster", name: "Машинист", desc: "Сделать 10 проходов выбивальной машиной", icon: "duster" },
  { id: "dry", name: "Сушильщик", desc: "Высушить 10 ковров в сушильной комнате", icon: "fan" },
  { id: "special", name: "Особый случай", desc: "Выполнить все особые заказы", icon: "book" },
  { id: "daily3", name: "Три дня подряд", desc: "Сдавать заказ дня три дня подряд", icon: "calendar" },
  { id: "album20", name: "Альбом", desc: "Собрать в альбоме 20 ковров", icon: "album" },
  { id: "story", name: "Узор деда", desc: "Отмыть дедов ковёр", icon: "comb" },
  { id: "cat", name: "Пуговка", desc: "Завести кошку в мастерской", icon: "cat" },
  { id: "collector", name: "Коллекционер", desc: "Повесить на стену шесть ковров", icon: "wall" },
  { id: "dealer", name: "Перекупщик", desc: "Заработать на барахолке 20 000 ₽", icon: "coin" },
  { id: "antique", name: "Антиквар", desc: "Отмыть антикварный ковёр на 90% и выше", icon: "rug" },
];
function grantAch(id) {
  S.ach = S.ach || {};
  if (S.ach[id]) return;
  const a = ACH.find((q) => q.id === id); if (!a) return;
  S.ach[id] = Date.now(); G.saveDirty = true;
  setTimeout(() => { UI.toast("Награда: " + a.name); AU.bell(784, 0.08); AU.bell(1047, 0.07, 0.14); AU.bell(1319, 0.06, 0.28); }, 900);
}
// checks after the receipt
function achOnResult(o, gr, stars, wIn, wOut) {
  if (o.kind !== "free") grantAch("first");
  if ((S.kgOut || 0) >= 10) grantAch("kg10");
  if ((S.kgOut || 0) >= 100) grantAch("kg100");
  if (wIn && wOut && (wIn.total - wOut.total) / wIn.total >= 0.3) grantAch("light30");
  if (Object.values(S.stars || {}).filter((v) => v >= 3).length >= 10) grantAch("three10");
  if (SPECIAL.every((q) => S.stars && S.stars[q.id])) grantAch("special");
  if (S.dailyStreak && S.dailyStreak.n >= 3) grantAch("daily3");
  if ((S.album || []).length >= 20) grantAch("album20");
  if (o.finale) grantAch("story");
}
