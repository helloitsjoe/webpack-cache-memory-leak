// Custom loader to render React components to static markup at build time.
// React and ReactDOM are not shipped to the client, only used during the build.
module.exports.pitch = function reactLoader() {
  this.cacheable();

  return `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server.node';
import Component from '${this.remainingRequest}';

export default function render() {
  return renderToStaticMarkup(React.createElement(Component));
}
  `;
};
