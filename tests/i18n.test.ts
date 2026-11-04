import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { es, t } from '../src/i18n';

const UI_FILES = [
  'src/core/Config.ts',
  'src/core/hotkeys.ts',
  ...fs
    .readdirSync(path.resolve('src/ui'))
    .filter((file) => file.endsWith('.ts'))
    .map((file) => `src/ui/${file}`),
];

const SPANISH_UI =
  /\b(Menú|Opciones|Volver|Continuar|Partida|Pausa|Objetivos|Atajos|Calidad|Niebla|Sonido|Música|Consejos|Victoria|Derrota|Campaña|Misión|Civilización|Escaramuza|Dificultad|Recursos|Población|Guardar|Abandonar|Tutorial|Omitir|Fuente|Postura|Daño|Rango|Blindaje|Fuerte|Débil|Comprar|Vender|Replantar|Vivienda|Granja|Detener|Formación|Patrullar|Agresivo|Defensivo|Pasivo|Próximamente|Jugar|Repetición|Códice|Entrar|Iniciar|Fechas|Bonificaciones|Civilizaciones|Campañas|Fuentes)\b/;

function stringLiterals(file: string): { line: number; value: string }[] {
  const source = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const out: { line: number; value: string }[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      out.push({ line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1, value: node.text });
    } else if (ts.isTemplateExpression(node)) {
      const line = sf.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      out.push({ line, value: node.head.text });
      for (const span of node.templateSpans) out.push({ line, value: span.literal.text });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

describe('i18n', () => {
  it('interpolates named parameters', () => {
    expect(t('hud.tutorial.step', { current: 2, total: 5 })).toBe('Paso 2 / 5');
    expect(
      t('hud.unit.stats', {
        hp: 10,
        maxHp: 10,
        attack: 3,
        range: 1,
        armor: 0,
        counters: '',
        stance: 'x',
        stanceLabel: 'x',
      }),
    ).toContain('HP 10/10');
  });

  it('has non-empty strings for every key', () => {
    for (const [key, value] of Object.entries(es)) {
      expect(value.trim(), key).not.toBe('');
    }
  });

  it('keeps Spanish UI literals out of the HUD, menus and Config', () => {
    const failures: string[] = [];
    for (const file of UI_FILES) {
      for (const { line, value } of stringLiterals(path.resolve(file))) {
        if (value.startsWith('hud.') || value.startsWith('resource.') || value.startsWith('map.')) continue;
        if (value.includes('{') || value.includes('}') || value.length > 500) continue;
        if (SPANISH_UI.test(value) || /[ÁÉÍÓÚáéíóúÑñ]/.test(value)) {
          failures.push(`${file}:${line}: ${value.slice(0, 100)}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });
});
