import test from 'node:test';
import assert from 'node:assert/strict';
import { SvgDocument } from '../dist/model/SvgDocument.js';
import { ShapeFactory } from '../dist/model/ShapeFactory.js';

const factory = new ShapeFactory();

test('六种图形通过同一工厂创建，容器递归移动和缩放', () => {
  const doc = new SvgDocument();
  doc.add(factory.create('g', 'outer', []));
  doc.add(factory.create('g', 'inner', []), 'outer');
  for (const [type, id, args] of [
    ['rect', 'r', ['1', '2', '3', '4']],
    ['circle', 'c', ['1', '2', '3']],
    ['ellipse', 'e', ['1', '2', '3', '4']],
    ['line', 'l', ['1', '2', '3', '4']],
    ['text', 't', ['1', '2', '开始']],
  ]) doc.add(factory.create(type, id, args), 'inner');
  doc.find('outer').move(10, 20);
  doc.find('outer').scale(2);
  assert.equal(doc.find('r').attributes().x, '22');
  assert.equal(doc.find('r').attributes().height, '8');
  assert.equal(doc.find('c').attributes().r, '6');
  assert.equal(doc.find('e').attributes().ry, '8');
  assert.equal(doc.find('l').attributes().x2, '26');
  assert.equal(doc.find('t').toSvgNode().text, '开始');
  assert.equal(doc.count, 7);
});

test('分组按原顺序，嵌套解组占据原位置；拒绝祖先与子孙同时入组', () => {
  const doc = new SvgDocument();
  doc.add(factory.create('g', 'scene', []));
  for (const id of ['a', 'b', 'c']) doc.add(factory.create('circle', id, ['0', '0', '1']), 'scene');
  doc.group('pair', ['c', 'a']);
  assert.deepEqual(doc.find('pair').children.map(x => x.id), ['a', 'c']);
  assert.deepEqual(doc.find('scene').children.map(x => x.id), ['pair', 'b']);
  assert.throws(() => doc.group('bad', ['a', 'scene']), /own descendant: scene/);
  doc.ungroup('pair');
  assert.deepEqual(doc.find('scene').children.map(x => x.id), ['a', 'c', 'b']);
  assert.throws(() => doc.ungroup('scene'), /top-level/);
});

test('克隆隔离可变状态；同级前后顺序与换父容器正确', () => {
  const doc = new SvgDocument();
  doc.add(factory.create('g', 'g', []));
  doc.add(factory.create('rect', 'r', ['0', '0', '1', '1']));
  const copy = doc.clone();
  copy.find('r').move(5, 0);
  assert.equal(doc.find('r').attributes().x, '0');
  doc.reorder('r', false);
  assert.deepEqual(doc.children.map(x => x.id), ['r', 'g']);
  doc.addTo('g', 'r');
  assert.equal(doc.parentLabel(doc.find('r')), 'g#g');
  assert.throws(() => doc.addTo('g', 'g'), /own descendant/);
  assert.throws(() => factory.create('box', 'n', []), /unknown shape type/);
});
