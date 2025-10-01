import { marked, Renderer } from 'marked';

// add `target='_blank'` to outgoing links

// https://github.com/chjj/marked/pull/451#issuecomment-49976076

const myRenderer = new Renderer();
myRenderer.link = function(href, title, text) {
  let external, newWindow, out;
  external = /^https?:\/\/.+$/.test(href);
  newWindow = external || title === 'newWindow';
  out = "<a href=\"" + href + "\"";
  if (newWindow) {
    out += ' target="_blank"';
  }
  if (title && title !== 'newWindow') {
    out += " title=\"" + title + "\"";
  }
  return out += ">" + text + "</a>";
};

marked.setOptions({ renderer: myRenderer });

export default marked;