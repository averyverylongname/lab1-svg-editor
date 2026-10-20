import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Editor } from '../dist/application/Editor.js';
import { CreateCommand } from '../dist/application/commands/CreateCommand.js';
import { DeleteCommand } from '../dist/application/commands/DeleteCommand.js';
import { MoveCommand } from '../dist/application/commands/MoveCommand.js';
import { ScaleCommand } from '../dist/application/commands/ScaleCommand.js';
import { GroupCommand } from '../dist/application/commands/GroupCommand.js';
import { SvgCodec } from '../dist/io/SvgCodec.js';

const codec = new SvgCodec();
const xml = body => `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">${body}</svg>`;
const snapshot = editor => editor.document.toSvgNode();

test('一条分组或删除对应一个历史单元；重复撤销重做恢复顺序和属性', () => {
  const editor = new Editor();
  editor.init();
  editor.execute(new CreateCommand('rect', 'r', ['0.1', '2', '3', '4']));
  editor.execute(new CreateCommand('circle', 'c', ['5', '6', '7']));
  const before = snapshot(editor);
  editor.execute(new GroupCommand('pair', ['c', 'r']));
  const grouped = snapshot(editor);
  editor.execute(new DeleteCommand('pair'));
  assert.equal(editor.document.count, 0);
  editor.undo();
  assert.deepEqual(snapshot(editor), grouped);
  editor.undo();
  assert.deepEqual(snapshot(editor), before);
  editor.redo();
  assert.deepEqual(snapshot(editor), grouped);
  editor.execute(new ScaleCommand('pair', 0.3));
  for (let index = 0; index < 3; index++) { editor.undo(); editor.redo(); }
  editor.undo();
  assert.deepEqual(snapshot(editor), grouped);
});

test('失败编辑保留文档和 redo；成功新编辑清空 redo', () => {
  const editor = new Editor();
  editor.init();
  editor.execute(new CreateCommand('rect', 'r', ['0', '0', '1', '1']));
  editor.execute(new MoveCommand('r', 10, 20));
  editor.undo();
  const before = snapshot(editor);
  assert.throws(() => editor.execute(new ScaleCommand('r', 0)), /scale factor must be positive/);
  assert.deepEqual(snapshot(editor), before);
  editor.redo();
  assert.equal(editor.document.find('r').attributes().x, '10');
  editor.undo();
  editor.execute(new MoveCommand('r', 1, 0));
  assert.throws(() => editor.redo(), /nothing to redo/);
});

test('递归操作中途溢出也不会泄漏部分修改', () => {
  const editor = new Editor();
  editor.init();
  editor.execute(new CreateCommand('g', 'g', []));
  editor.execute(new CreateCommand('rect', 'small', ['1', '2', '3', '4'], 'g'));
  editor.execute(new CreateCommand('circle', 'large', ['1e308', '0', '1'], 'g'));
  const before = snapshot(editor);
  assert.throws(() => editor.execute(new ScaleCommand('g', 10)), /invalid number/);
  assert.deepEqual(snapshot(editor), before);
  editor.undo();
  assert.throws(() => editor.document.find('large'), /no such shape/);
});

test('成功文档操作建立历史边界；失败读写、初始化和 resize 保留全部状态', () => {
  const directory = mkdtempSync(join(tmpdir(), 'svg-history-'));
  try {
    const file = join(directory, 'a file.svg');
    const editor = new Editor();
    assert.throws(() => editor.undo(), /no document/);
    editor.init();
    assert.throws(() => editor.undo(), /undo not allowed after io command/);
    editor.execute(new CreateCommand('rect', 'r', ['1', '2', '3', '4']));
    editor.save(file);
    assert.throws(() => editor.redo(), /undo not allowed after io command/);
    editor.execute(new MoveCommand('r', 9, 0));
    editor.canvas();
    const before = snapshot(editor);
    assert.throws(() => editor.read(join(directory, 'missing.svg')), /cannot read file/);
    assert.throws(() => editor.save(join(directory, 'absent', 'b.svg')), /cannot write file/);
    assert.throws(() => editor.init(-1, 2), /dimensions must be positive/);
    assert.throws(() => editor.canvas(0, 2), /dimensions must be positive/);
    assert.deepEqual(snapshot(editor), before);
    editor.undo();
    assert.equal(editor.document.find('r').attributes().x, '1');
    editor.save();
    assert.deepEqual(codec.parse(readFileSync(file, 'utf8')).document.toSvgNode(), snapshot(editor));
    editor.read(file);
    assert.throws(() => editor.undo(), /undo not allowed/);
    editor.execute(new MoveCommand('r', 1, 1));
    editor.canvas(600, 500);
    assert.throws(() => editor.undo(), /undo not allowed/);
    assert.deepEqual(readdirSync(directory), ['a file.svg']);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('SVG 支持六种元素、命名空间、默认几何、样式和特殊文字的语义往返', () => {
  const source = xml(`<g id="g" fill="red"><rect id="r" x="1.5" width="10" height="20"/><circle id="c" r="2"/><ellipse id="e" rx="3" ry="4"/><line id="l" stroke="black" stroke-width="2"/><text id="t" x="5" y="6">&lt;&amp; 中文 "text"</text></g>`);
  const document = codec.parse(source).document;
  const saved = codec.stringify(document);
  assert.match(saved, /&lt;&amp;/);
  assert.deepEqual(codec.parse(saved).document.toSvgNode(), document.toSvgNode());
  assert.equal(document.count, 6);
  assert.equal(document.find('r').attributes().y, '0');
  assert.equal(document.find('r').attributes().fill, undefined);
  const prefixed = codec.parse('<s:svg xmlns:s="http://www.w3.org/2000/svg" width="10px" height="20"><s:text id="t"><![CDATA[<中文>]]></s:text></s:svg>');
  assert.equal(prefixed.document.find('t').toSvgNode().text, '<中文>');
});

test('自动 id 先避开全文已有名称，按类型计数并返回准确警告', () => {
  const result = codec.parse(xml('<rect/><g><rect id="rect1"/><rect/></g><circle/><rect id="Rect1"/>'));
  assert.deepEqual([...result.document.walk()].map(shape => shape.id), ['rect2', 'g1', 'rect1', 'rect3', 'circle1', 'Rect1']);
  assert.deepEqual(result.warnings, [
    'warning: assigned id rect2 to unnamed <rect>',
    'warning: assigned id g1 to unnamed <g>',
    'warning: assigned id rect3 to unnamed <rect>',
    'warning: assigned id circle1 to unnamed <circle>',
  ]);
});

test('外部 box 降级为可编辑普通容器', () => {
  const document = codec.parse(xml('<g id="n" data-kind="box"><rect id="n-rect"/><text id="n-label">标题</text></g>')).document;
  assert.equal(document.find('n').type, 'g');
  assert.equal(document.find('n').children.length, 2);
  document.find('n').move(2, 3);
  assert.equal(document.find('n-label').attributes().y, '3');
});

test('拒绝损坏或超出支持范围的 SVG，失败 read 不提交警告或部分文档', () => {
  for (const source of [
    xml('<rect id="a"/><circle id="a"/>'),
    xml('<g><rect></g>'),
    xml('<path id="p" d="M0 0"/>'),
    xml('<g id="g" transform="translate(1,2)"/>'),
    xml('<text id="t"><tspan>child</tspan></text>'),
    xml('<rect id="r" width="-1"/>'),
    xml('<circle id="c" r="NaN"/>'),
    xml('<text id="t">&missing;</text>'),
    '<svg width="10" height="20" viewBox="1 0 10 20"/>',
    '<svg xmlns="urn:wrong" width="10" height="20"/>',
    '<!DOCTYPE svg><svg width="10" height="20"/>',
    '<svg width="10" height="20"><foreign xmlns="urn:wrong"/></svg>',
  ]) assert.throws(() => codec.parse(source), undefined, source);

  const directory = mkdtempSync(join(tmpdir(), 'svg-invalid-'));
  try {
    const file = join(directory, 'invalid.svg');
    writeFileSync(file, xml('<rect/><circle id="c" r="-1"/>'));
    const editor = new Editor();
    editor.init();
    editor.execute(new CreateCommand('g', 'original', []));
    assert.throws(() => editor.read(file), /non-negative/);
    assert.equal(editor.document.find('original').type, 'g');
    editor.undo();
    assert.equal(editor.document.count, 0);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
