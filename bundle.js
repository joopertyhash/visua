(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const Utils = require('./utils');

let links = [];
let nodes = [];

const txLimit = 1500;
let process = 1;

const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d');
const dimen = Math.min(window.innerWidth, window.innerHeight);
canvas.width = dimen;
canvas.height = dimen;
const { width, height } = canvas;

function ticked() {
  if (process) {
    context.clearRect(0, 0, width, height);
    context.save();
    context.fillStyle = Utils.getBgColor();
    context.fillRect(0, 0, width, height);
    context.translate(width / 2, height / 2);
    context.beginPath();
    context.beginPath();
    links.forEach(Utils.drawLink);
    context.strokeStyle = Utils.getLinkColor();
    context.stroke();
    nodes.forEach(Utils.drawNode);
    context.restore();
  } process = 1 - process;
}

const simulation = d3.forceSimulation(nodes)
  .force('charge', d3.forceManyBody())
  .force('link', d3.forceLink(links).id((d => d.id)).distance(20).strength(0.1))
  .force('collision', d3.forceCollide().radius(d => d.radius))
  .force('x', d3.forceX())
  .force('y', d3.forceY())
  .on('tick', ticked);

d3.select(canvas)
  .call(d3.drag()
    .container(canvas)
    .subject(Utils.dragSubject)
    .on('start', Utils.dragStarted)
    .on('drag', Utils.dragged)
    .on('end', Utils.dragEnd));

Utils.setup(context, width, height, simulation);

function createNodes(link) {
  // Remove transaction if greater than txLimit
  if (nodes.length + links.length > txLimit) {
    const removedNode = nodes[0];
    const newNodes = [];
    const newLinks = [];
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (removedNode.hash !== node.hash) {
        newNodes.push(node);
      }
    }

    for (let j = 0; j < links.length; j++) {
      const testLink = links[j];
      if (removedNode.hash !== testLink.hash) {
        newLinks.push(testLink);
      }
    }
    nodes = newNodes;
    links = newLinks;
  }

  // Handle input links
  let node = null;
  if (link.type === 1) {
    for (let i = 0; i < nodes.length; i++) {
      const testNode = nodes[i];
      if (testNode.id.substring(0, testNode.id.indexOf('transaction')) === link.source.substring(0, link.source.indexOf('transaction'))) {
        node = testNode;
      }
    }
    if (!node) {
      nodes.push({
        id: link.source,
        hash: link.hash,
        type: link.type,
      });
    } else if (node.type === 2) {
      node.type = 3;
    }
  } else if (link.type === 2) {
    for (let j = 0; j < nodes.length; j++) {
      const otherTestNode = nodes[j];
      if (otherTestNode.id === link.target) {
        node = otherTestNode;
      }
    }
    if (!node) {
      nodes.push({
        id: link.target,
        hash: link.hash,
        type: link.type,
      });
    } else if (node.type === 1) {
      node.type = 3;
    }
  }
  if (!node) {
    links.push(link);
  } else if (node.type === 2) {
    links.push({
      hash: node.hash,
      source: node.id,
      target: link.source,
    });
  } else if (node) {
    links.push({
      hash: node.hash,
      source: node.id,
      target: link.target,
    });
  }
  simulation.nodes(nodes);
  simulation.force('link').links(links);
  simulation.alpha(1).restart();
}

const socket = new WebSocket('wss://ws.blockchain.info/inv');
socket.addEventListener('open', () => {
  socket.send(JSON.stringify({ op: 'unconfirmed_sub' }));
});

socket.onmessage = (event) => {
  const tx = JSON.parse(event.data);
  console.log(tx);
  if (tx.op === 'utx') {
    const { hash, inputs, out } = tx.x;
    // Create transaction node
    if (hash && inputs && out) {
      nodes.push({
        id: hash,
        hash,
        type: 0,
      });
      let linksBuffer = [];
      // Create input links
      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        linksBuffer.push({
          source: `${input.prev_out.addr}transactioninput${hash}${i}`,
          target: hash,
          hash,
          type: 1,
        });
      }
      // Create output links
      for (let j = 0; j < out.length; j++) {
        const output = out[j];
        if (output.addr) {
          linksBuffer.push({
            source: hash,
            target: `${output.addr}transactionoutput${hash}${j}`,
            hash,
            type: 2,
          });
        }
      }
      // Create nodes from new links
      for (let k = 0; k < linksBuffer.length; k++) {
        const link = linksBuffer[k];
        createNodes(link);
      }
      linksBuffer = [];
    }
  }
};


},{"./utils":2}],2:[function(require,module,exports){

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


},{}]},{},[1]);
