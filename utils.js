
let context = null;
let width = null;
let height = null;
let simulation = null;
// Colors
const bgColor = '#02003f';
const linkColor = '#5b5b5b';
const txNodeColor = '#1D84B5';
const inputNodeColor = '#41D3BD';
const outputNodeColor = '#E8E288';
const mixedNodeColor = '#A14EBF';
const unknownNodeColor = '#ff0000';

const radius = 3;

module.exports = {
  getBgColor() {
    return bgColor;
  },

  getLinkColor() {
    return linkColor;
  },

  setup(ctx, w, h, sim) {
    context = ctx;
    width = w;
    height = h;
    simulation = sim;
  },

  dragged() {
    d3.event.subject.fx = d3.event.x;
    d3.event.subject.fy = d3.event.y;
  },

  drawLink(d) {
    context.moveTo(d.source.x, d.source.y);
    context.lineTo(d.target.x, d.target.y);
  },
  drawNode(d) {
    context.beginPath();
    context.moveTo(d.x + radius, d.y);
    context.arc(d.x, d.y, radius, 0, 2 * Math.PI);

    const nodeColorMap = {
      0: () => txNodeColor, // Blue, Transaction
      1: () => inputNodeColor, // Green, Input
      2: () => outputNodeColor, // Yellow, Output
      3: () => mixedNodeColor, // Purple
    };

    const fn = nodeColorMap[d.type];

    if (fn) {
      context.strokeStyle = fn();
      context.fillStyle = fn();
    } else {
      context.strokeStyle = unknownNodeColor;
      context.fillStyle = unknownNodeColor;
    }
    context.fill();
    context.stroke();
  },

  dragSubject() {
    return simulation.find(d3.event.x - (width / 2), d3.event.y - (height / 2));
  },

  dragStarted() {
    if (!d3.event.active) {
      simulation.alphaTarget(0.3).restart();
    }
    d3.event.subject.fx = d3.event.subject.x;
    d3.event.subject.fy = d3.event.subject.y;
  },

  dragEnd() {
    if (!d3.event.active) {
      simulation.alphaTarget(0);
    }
    d3.event.subject.fx = null;
    d3.event.subject.fy = null;
  },

};

