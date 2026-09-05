// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Linking } from "react-native";
import { RichTextContent } from "../RichTextContent";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
jest.mock("react-native", () => {
  const React = require("react");
  return {
    Text: (props) => React.createElement("Text", props, props.children),
    View: (props) => React.createElement("View", props, props.children),
    Linking: { openURL: jest.fn() },
  };
});
function render(html: string) {
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(<RichTextContent html={html} color="#111" mutedColor="#555" accentColor="#00f" />); });
  return renderer!;
}
const textOf = (node) => typeof node === "string" ? node : node.children.map(textOf).join("");

it("keeps literal HTML examples readable inside formatted text", () => {
  const renderer = render('<p>Use <code>&lt;p&gt;</code> for paragraphs &amp; spacing.</p>');
  expect(renderer.root.findAllByType("Text").map(textOf).join(" ")).toContain('<p>');
  expect(renderer.root.findAllByType("Text").map(textOf).join(" ")).toContain('for paragraphs & spacing.');
});

it("renders larger headings before smaller headings and lets text inherit their size", () => {
  const renderer = render('<h1>Main heading</h1><h3>Small heading</h3>');
  const headings = renderer.root.findAllByType("Text").filter(node => node.props.style?.fontWeight === "900");
  expect(headings[0].props.style.fontSize).toBeGreaterThan(headings[1].props.style.fontSize);
  for (const heading of headings) {
    const child = heading.findAllByType("Text").find(node => node !== heading);
    expect(child.props.style.fontSize ?? heading.props.style.fontSize).toBe(heading.props.style.fontSize);
  }
});

it("renders clickable links and numbered lists", () => {
  const renderer = render('<ol><li>Read the <a href="https://example.com/guide">guide</a>.</li></ol>');
  const link = renderer.root.findAllByType("Text").find(node => node.props.onPress);
  act(() => link.props.onPress());
  expect(Linking.openURL).toHaveBeenCalledWith('https://example.com/guide');
  expect(renderer.root.findAllByType("Text").some(node => textOf(node) === '1.')).toBe(true);
});
