/**
 * Bölüm doğrulayıcı (geliştirici aracı): oyundaki bütün bölümleri motor ve
 * çözücüyle denetler, ölçütlerini tablo olarak yazdırır. Bir sorun varsa
 * sıfırdan farklı kodla çıkar. (Aynı denetimler `npm test` içinde de koşar.)
 *
 *   npm run levels:validate
 */
import { FORGIVING_LEVELS, levels } from '../src/data/levels';
import { stageLevel, waveCount } from '../src/engine';
import { measure } from '../src/generator';

let problems = 0;
console.log('bölüm  boyut  dalga  penguen  par  park  dönme  çıkmaz  not');
levels.forEach((level, index) => {
  const label = level.id.padStart(5);
  const size = `${level.grid[0]!.length}x${level.grid.length}`.padStart(6);
  const stages = Array.from({ length: waveCount(level) }, (_, i) => stageLevel(level, i));
  const measured = stages.map((stage) => measure(stage, 4000));
  const issues: string[] = [];

  measured.forEach((m, i) => {
    if (!m) issues.push(`dalga ${i + 1} geçersiz ya da çözümsüz`);
    else if (stages[i]!.par !== m.par) issues.push(`dalga ${i + 1}: kayıtlı par ${stages[i]!.par}, gerçek ${m.par}`);
    if (m && index < FORGIVING_LEVELS && m.deadEnds !== 0) issues.push('erken bölümde çıkmaz var');
  });
  const ok = measured.filter((m) => m !== null);
  const total = ok.reduce((sum, m) => sum + m.par, 0);
  if (level.par !== total) issues.push(`toplam par ${level.par}, gerçek ${total}`);
  problems += issues.length;

  const deadEnds = ok.some((m) => m.deadEnds > 0) ? 'var' : ok.some((m) => m.deadEnds < 0) ? '?' : 'yok';
  console.log(
    [
      label,
      size,
      String(stages.length).padStart(6),
      ok.map((m) => m.penguins).join('').padStart(8),
      String(total).padStart(4),
      String(ok.reduce((sum, m) => sum + m.teamwork, 0)).padStart(5),
      String(ok.reduce((sum, m) => sum + m.spins, 0)).padStart(6),
      deadEnds.padStart(7),
      issues.length > 0 ? `  ✗ ${issues.join('; ')}` : '',
    ].join(' '),
  );
});
console.log(problems === 0 ? `\n✓ ${levels.length} bölüm sorunsuz.` : `\n✗ ${problems} sorun bulundu.`);
process.exit(problems === 0 ? 0 : 1);
