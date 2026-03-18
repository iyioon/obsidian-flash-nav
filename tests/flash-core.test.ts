import test from "node:test";
import assert from "node:assert/strict";
import { applyLabelPlacementCore, assignLabelsCore, findMatchesCore } from "../src/flash-core";

test("findMatchesCore respects line scope", () => {
  const doc = "alpha beta\nalpha gamma\nalpha";
  const cursorPos = doc.indexOf("gamma");
  const matches = findMatchesCore({
    doc,
    pattern: "alpha",
    cursorPos,
    visibleRanges: [{ from: 0, to: doc.length }],
    searchScope: "line",
    searchDirection: "closest",
    caseSensitive: false,
    smartCase: true
  });

  assert.equal(matches.length, 1);
  assert.equal(matches[0]?.from, doc.indexOf("alpha", doc.indexOf("\n") + 1));
});

test("findMatchesCore respects forward direction", () => {
  const doc = "one two one two one";
  const cursorPos = doc.indexOf("two");
  const matches = findMatchesCore({
    doc,
    pattern: "one",
    cursorPos,
    visibleRanges: [{ from: 0, to: doc.length }],
    searchScope: "document",
    searchDirection: "forward",
    caseSensitive: false,
    smartCase: true
  });

  assert.equal(matches.length, 2);
  assert.ok(matches.every((m) => m.from >= cursorPos));
});

test("findMatchesCore supports numeric pattern", () => {
  const doc = "a1 b2 c2 d3";
  const matches = findMatchesCore({
    doc,
    pattern: "2",
    cursorPos: 0,
    visibleRanges: [{ from: 0, to: doc.length }],
    searchScope: "document",
    searchDirection: "closest",
    caseSensitive: false,
    smartCase: true
  });

  assert.equal(matches.length, 2);
});

test("assignLabelsCore reuses lowercase labels in lowercase mode", () => {
  const doc = "alpha beta alpha";
  const matches = [
    { from: 0, to: 5 },
    { from: 11, to: 16 }
  ];
  const reused = new Map<number, string>([[11, "s"]]);

  const labeled = assignLabelsCore({
    doc,
    matches,
    cursorPos: 0,
    labelAlphabet: "asdf",
    labelReuseMode: "lowercase",
    labelCurrentMatch: true,
    searchDirection: "closest",
    reusedLabelsByPos: reused
  });

  const reusedMatch = labeled.find((m) => m.from === 11);
  assert.equal(reusedMatch?.label, "s");
});

test("assignLabelsCore can hide current match label", () => {
  const doc = "alpha beta gamma";
  const matches = [
    { from: 0, to: 5 },
    { from: 6, to: 10 }
  ];

  const labeled = assignLabelsCore({
    doc,
    matches,
    cursorPos: 0,
    labelAlphabet: "asdf",
    labelReuseMode: "none",
    labelCurrentMatch: false,
    searchDirection: "forward",
    reusedLabelsByPos: new Map()
  });

  assert.equal(labeled[0]?.label, undefined);
  assert.equal(labeled[1]?.label, "a");
});

test("applyLabelPlacementCore anchors next character then falls back at line end", () => {
  const doc = "abx\ncd";
  const placed = applyLabelPlacementCore(doc, [
    { from: 0, to: 2, label: "a" },
    { from: 4, to: 6, label: "s" }
  ]);

  assert.deepEqual(
    placed.map((m) => [m.labelFrom, m.labelTo]),
    [
      [2, 3],
      [5, 6]
    ]
  );
});
