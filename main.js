let links = [];
let nodes = [];
const radius = 3;
const txLimit = 1500;
let process = 1;

const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d');
canvas.width = window.innerWidth * 0.95;
canvas.height = window.innerHeight * 0.95;
const { width, height } = canvas;

// Set up D3 Simulation
function drawLink(d) {
  context.moveTo(d.source.x, d.source.y);
  context.lineTo(d.target.x, d.target.y);
}

function drawNode(d) {
  context.beginPath();
  // if (d.x > (width / 2) - (radius * 2) || d.x < (width / -2) + (radius * 2)) {
  //   const newX = d.x > 1 ? width / 2 - radius * 2 : width / -2;
  //   d.x = newX;
  // }

  // if (d.y > (height / 2) - (radius * 2) || d.y < (height / -2) + (radius * 2)) {
  //   const newY = d.y > 1 ? height / 2 - radius * 2 : height / -2;
  //   d.y = newY;
  // }

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
  context.stroke();
}


function ticked() {
  if (process) {
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
  } process = 1 - process;
}

const simulation = d3.forceSimulation(nodes)
  .force('charge', d3.forceManyBody())
  .force('link', d3.forceLink(links).id((d => d.id)).distance(20).strength(1))
  .force('collision', d3.forceCollide().radius(d => d.radius))
  .force('x', d3.forceX())
  .force('y', d3.forceY())
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


// function removeOldNodes() {
//   const removedTransaction = transactions.shift();
//   const newNodes = [];
//   const newLinks = [];

//   nodes.forEach((node) => {
//     if (node.hash !== removedTransaction.x.hash) {
//       newNodes.push(node);
//     }
//   });

//   links.forEach((link) => {
//     if (link.hash !== removedTransaction.x.hash) {
//       newLinks.push(link);
//     }
//   });
//   nodes = newNodes;
//   links = newLinks;
//   simulation.nodes(nodes);
//   simulation.force('link').links(links);
//   simulation.alpha(1).restart();
// }

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
  console.log(nodes.length + links.length);

  // Handle input links
  const nodeCopy = nodes;
  let node = null;
  let otherNode = null;
  if (link.type === 1) {
    for (let i = 0; i < nodeCopy.length; i++) {
      const testNode = nodeCopy[i];
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
    for (let j = 0; j < nodeCopy.length; j++) {
      const otherTestNode = nodeCopy[j];
      if (otherTestNode.id === link.target) {
        otherNode = otherTestNode;
      }
    }
    if (!otherNode) {
      nodes.push({
        id: link.target,
        hash: link.hash,
        type: link.type,
      });
    } else if (otherNode.type === 1) {
      otherNode.type = 3;
    }
  }
  if (!node && !otherNode) {
    links.push(link);
  } else if (otherNode) {
    links.push({
      hash: otherNode.hash,
      source: otherNode.id,
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

