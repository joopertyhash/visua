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
