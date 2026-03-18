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

test("findMatchesCore respects backward direction", () => {
  const doc = "one two one two one";
  const cursorPos = doc.lastIndexOf("two");
  const matches = findMatchesCore({
    doc,
    pattern: "one",
    cursorPos,
    visibleRanges: [{ from: 0, to: doc.length }],
    searchScope: "document",
    searchDirection: "backward",
    caseSensitive: false,
    smartCase: true
  });

  assert.equal(matches.length, 2);
  assert.ok(matches.every((m) => m.from <= cursorPos));
});

test("findMatchesCore respects viewport ranges", () => {
  const doc = "alpha beta gamma alpha delta alpha";
  const firstAlpha = doc.indexOf("alpha");
  const secondAlpha = doc.indexOf("alpha", firstAlpha + 1);
  const thirdAlpha = doc.indexOf("alpha", secondAlpha + 1);

  const matches = findMatchesCore({
    doc,
    pattern: "alpha",
    cursorPos: 0,
    visibleRanges: [
      { from: 0, to: 12 },
      { from: thirdAlpha, to: doc.length }
    ],
    searchScope: "viewport",
    searchDirection: "closest",
    caseSensitive: false,
    smartCase: true
  });

  assert.deepEqual(matches.map((m) => m.from), [firstAlpha, thirdAlpha]);
});

test("findMatchesCore case sensitivity matrix", () => {
  const doc = "Alpha alpha ALPHA";

  const strict = findMatchesCore({
    doc,
    pattern: "alpha",
    cursorPos: 0,
    visibleRanges: [{ from: 0, to: doc.length }],
    searchScope: "document",
    searchDirection: "closest",
    caseSensitive: true,
    smartCase: true
  });
  assert.equal(strict.length, 1);

  const smartCaseUpper = findMatchesCore({
    doc,
    pattern: "Alpha",
    cursorPos: 0,
    visibleRanges: [{ from: 0, to: doc.length }],
    searchScope: "document",
    searchDirection: "closest",
    caseSensitive: false,
    smartCase: true
  });
  assert.equal(smartCaseUpper.length, 1);

  const insensitive = findMatchesCore({
    doc,
    pattern: "alpha",
    cursorPos: 0,
    visibleRanges: [{ from: 0, to: doc.length }],
    searchScope: "document",
    searchDirection: "closest",
    caseSensitive: false,
    smartCase: false
  });
  assert.equal(insensitive.length, 3);
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

test("assignLabelsCore respects reuse mode none/all", () => {
  const doc = "alpha beta alpha";
  const matches = [
    { from: 0, to: 5 },
    { from: 11, to: 16 }
  ];

  const noneReuseMap = new Map<number, string>([[11, "z"]]);
  const noneLabeled = assignLabelsCore({
    doc,
    matches,
    cursorPos: 0,
    labelAlphabet: "abcd",
    labelReuseMode: "none",
    labelCurrentMatch: true,
    searchDirection: "closest",
    reusedLabelsByPos: noneReuseMap
  });
  assert.equal(noneLabeled.find((m) => m.from === 11)?.label, "b");

  const allReuseMap = new Map<number, string>([[11, "Q"]]);
  const allLabeled = assignLabelsCore({
    doc,
    matches,
    cursorPos: 0,
    labelAlphabet: "Qasd",
    labelReuseMode: "all",
    labelCurrentMatch: true,
    searchDirection: "closest",
    reusedLabelsByPos: allReuseMap
  });
  assert.equal(allLabeled.find((m) => m.from === 11)?.label, "Q");
});

test("assignLabelsCore ignores stale reuse labels and falls back safely", () => {
  const doc = "alpha beta alpha";
  const matches = [
    { from: 0, to: 5 },
    { from: 11, to: 16 }
  ];
  const staleReuse = new Map<number, string>([[11, "z"]]);

  const labeled = assignLabelsCore({
    doc,
    matches,
    cursorPos: 0,
    labelAlphabet: "asdf",
    labelReuseMode: "all",
    labelCurrentMatch: true,
    searchDirection: "closest",
    reusedLabelsByPos: staleReuse
  });

  assert.notEqual(labeled.find((m) => m.from === 11)?.label, "z");
  assert.ok(labeled.every((m) => m.label === undefined || "asdf".includes(m.label)));
});

test("assignLabelsCore continuation skip falls back when all labels filtered", () => {
  const doc = "ab aa";
  const matches = [
    { from: 0, to: 1 },
    { from: 3, to: 4 }
  ];

  const labeled = assignLabelsCore({
    doc,
    matches,
    cursorPos: 0,
    labelAlphabet: "a",
    labelReuseMode: "none",
    labelCurrentMatch: true,
    searchDirection: "closest",
    reusedLabelsByPos: new Map()
  });

  assert.equal(labeled[0]?.label, "a");
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
