const _ = require('lodash');

const links = [];
const nodes = [];
const transactions = [];
const radius = 3;
const txlimit = 10;

const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const { width, height } = canvas;

// Set up D3 Simulation
function drawLink(d) {
  context.moveTo(d.source.x, d.source.y);
  context.lineTo(d.target.x, d.target.y);
}

function drawNode(d) {
  context.beginPath();
  if (d.x > (width / 2) - (radius * 2) || d.x < (width / -2) + (radius * 2)) {
    const newX = d.x > 1 ? width / 2 - radius * 2 : width / -2;
    d.x = newX;
  }

  if (d.y > (height / 2) - (radius * 2) || d.y < (height / -2) + (radius * 2)) {
    const newY = d.y > 1 ? height / 2 - radius * 2 : height / -2;
    d.y = newY;
  }

  context.moveTo(d.x + radius, d.y);
  context.arc(d.x, d.y, radius, 0, 2 * Math.PI);

  const nodeColorMap = {
    0: () => '#002aff', // Blue, Transaction
    1: () => '#00ff3f', // Green, Input
    2: () => '#ffd400', // Yellow, Output
    3: () => '#aa00ff', // Purple
  };
  const fn = nodeColorMap[d.type];
  if (fn) {
    context.strokeStyle = fn();
    context.fillStyle = fn();
  } else {
    context.strokeStyle = '#ff00ee';
    context.fillStyle = '#ff00ee';
  }
  context.fill();
  context.fillText(d.id, d.x + 10, d.y);
  context.stroke();
}


function ticked() {
  context.clearRect(0, 0, width, height);
  context.save();
  context.translate(width / 2, height / 2);
  context.beginPath();
  context.beginPath();
  links.forEach(drawLink);
  context.strokeStyle = '#000000';
  context.stroke();
  nodes.forEach(drawNode);
  context.restore();
}

const simulation = d3.forceSimulation(nodes)
  .force('charge', d3.forceManyBody())
  .force('link', d3.forceLink(links).id((d => d.id)).distance(50).strength(1))
  .force('collision', d3.forceCollide().radius(d => d.radius))
  //   .force('x', d3.forceX())
  //   .force('y', d3.forceY())
  .on('tick', ticked);

function dragSubject() {
  return simulation.find(d3.event.x - (width / 2), d3.event.y - (height / 2));
}

function dragStarted() {
  if (!d3.event.active) {
    simulation.alphaTarget(0.3).restart();
  }
  d3.event.subject.fx = d3.event.subject.x;
  d3.event.subject.fy = d3.event.subject.y;
}

function dragged() {
  d3.event.subject.fx = d3.event.x;
  d3.event.subject.fy = d3.event.y;
}

function dragEnd() {
  if (!d3.event.active) {
    simulation.alphaTarget(0);
  }
  d3.event.subject.fx = null;
  d3.event.subject.fy = null;
}

d3.select(canvas)
  .call(d3.drag()
    .container(canvas)
    .subject(dragSubject)
    .on('start', dragStarted)
    .on('drag', dragged)
    .on('end', dragEnd));


// Handle data

function processTransactions(txs) {
  const processedTxs = txs.map(transaction => (
    {
      type: 0,
      id: transaction.x.hash,
      inputs: transaction.x.inputs.map(input => input.prev_out.addr).map((input, index) => ({
        type: 1,
        id: `${input}input${transaction.x.hash}${index}`,
        hash: transaction.x.hash,
        source: `${input}input${transaction.x.hash}${index}`,
        target: transaction.x.hash,
      })),
      outputs: transaction.x.out.map(output => output.addr).filter(addr => (!!addr)).map((output, index) => ({
        type: 2,
        id: `${output}output${transaction.x.hash}${index}`,
        hash: transaction.x.hash,
        source: transaction.x.hash,
        target: `${output}output${transaction.x.hash}${index}`,
      })),
    }
  ));
  processedTxs.forEach((tx) => {
    const outputCounter = _.countBy(tx.outputs.map(output => output.id.substring(0, output.id.indexOf('output'))));
    tx.inputs.map(input => input.id.substring(0, input.id.indexOf('input'))).forEach((input) => {
      if (outputCounter[input] % 2) {
        tx.changeTransaction = true;
      }
    });
  });
  return processedTxs;
}

const socket = new WebSocket('wss://ws.blockchain.info/inv');
socket.addEventListener('open', () => {
  socket.send(JSON.stringify({ op: 'unconfirmed_sub' }));
});

socket.onmessage = (event) => {
  transactions.push(JSON.parse(event.data));
  console.log(processTransactions(transactions));
};

