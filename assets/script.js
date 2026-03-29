const createRange = n => [...Array(n).keys()];
const rand = (min = 0, max = 1) => Math.random() * (max - min) + min;
class Vec2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  plus(v) {
    return new Vec2(this.x + v.x, this.y + v.y);
  }
  minus(v) {
    return new Vec2(this.x - v.x, this.y - v.y);
  }
  multiply(f) {
    return new Vec2(this.x * f, this.y * f);
  }
}

class Pointer {
  constructor() {
    this.position = new Vec2(window.innerWidth / 2, window.innerHeight / 2);

    window.addEventListener('mousemove', e => {
      this.position.x = e.clientX;
      this.position.y = e.clientY;
    });

    window.addEventListener('touchmove', e => {
      if (e.touches.length > 0) {
        this.position.x = e.touches[0].clientX;
        this.position.y = e.touches[0].clientY;
      }
    }, {
      passive: true
    });
  }
}

class Dot {
  constructor({
    pos = new Vec2(),
    color = '#f00',
    radius = 3
  }) {
    this.pos = pos;
    this.color = color;
    this.radius = radius;
  }
  draw(ctx) {
    ctx.beginPath();
    ctx.fillStyle = this.color;
    ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

class SpringNode extends Dot {
  constructor({
    anchor = new Vec2(),
    stiffness = 0.1,
    friction = 0.1,
    color = '#f00',
    radius = 3
  }) {
    super({
      pos: anchor,
      color,
      radius
    });
    this.vel = new Vec2();
    this.anchor = anchor;
    this.stiffness = stiffness;
    this.friction = friction;
  }
  update() {
    const force = this.anchor.minus(this.pos).multiply(this.stiffness);
    const drag = this.vel.multiply(this.friction);
    this.vel = this.vel.plus(force.minus(drag));
    this.pos = this.pos.plus(this.vel);
  }
}

class Arm extends SpringNode {
  constructor(config) {
    super(config);
    this.segments = createRange(config.segments || 10).map(i =>
      new SpringNode({
        anchor: this.pos,
        stiffness: 1 / (i * 8 + 1),
        friction: 8 / (i * 10 + 5),
        color: config.color,
        radius: config.radius
      })
    );
  }
  update() {
    super.update();
    this.segments.forEach(dot => dot.update());
  }
  draw(ctx) {
    super.draw(ctx);
    this.segments.forEach(dot => dot.draw(ctx));
  }
}

class Animator {
  constructor(ctx, width, height) {
    this.ctx = ctx;
    this.dimensions = {
      width,
      height
    };
    this.entities = [];
  }
  add(...items) {
    this.entities.push(...items);
  }
  animate() {
    this.entities.forEach(entity => entity.update());
  }
  render() {
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    this.ctx.fillRect(0, 0, this.dimensions.width, this.dimensions.height);
    this.ctx.restore();
    this.entities.forEach(entity => entity.draw(this.ctx));
  }
}

const canvas = document.getElementById('display');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
const center = new Vec2(canvas.width / 2, canvas.height / 2);
const cursor = new Pointer();
const world = new Animator(ctx, canvas.width, canvas.height);
const greens = [],
  reds = [];
const isMobile = window.innerWidth <= 768;
const greenCount = isMobile ? 250 : 500;
const redCount = isMobile ? 120 : 350;

function waveOffset(index, total, frame) {
  const cols = 20;
  const rows = Math.ceil(total / cols);
  const x = index % cols;
  const y = Math.floor(index / cols);
  const width = isMobile ? 300 : 450;
  const height = isMobile ? 200 : 300;
  let dx = (x / cols - 0.5) * width;
  let dy = (y / rows - 0.5) * height;
  dx += Math.sin((dy + frame * 4) * 0.05) * 15;
  dy += Math.sin((dx + frame * 4) * 0.04) * 10;
  return new Vec2(dx, dy);
}

for (let i = 0; i < greenCount; i++) {
  const p = new Vec2(rand(0, canvas.width), rand(0, canvas.height));
  world.add(new Arm({
    anchor: p,
    radius: 2,
    segments: 10,
    color: `rgba(0,${Math.floor(rand(110, 150))},0,${rand(0.6, 0.9)})`
  }));
  greens.push(p);
}

for (let i = 0; i < redCount; i++) {
  const p = new Vec2(rand(0, canvas.width), rand(0, canvas.height));
  world.add(new Arm({
    anchor: p,
    radius: rand(2.1, 2.7),
    segments: 10,
    color: `rgba(${Math.floor(rand(230, 255))},${Math.floor(rand(0, 40))},${Math.floor(rand(0, 40))},${rand(0.8, 1)})`
  }));
  reds.push(p);
}

let frame = 0;
(function loop() {
  frame++;
  world.animate();
  world.render();
  updateFlags(frame);
  requestAnimationFrame(loop);
})();

function updateFlags(frame) {
  for (let i = 0; i < greens.length; i++) {
    const offset = waveOffset(i, greens.length, frame);
    const target = center.plus(cursor.position.minus(center).multiply(0.8)).plus(offset);
    greens[i].x = target.x;
    greens[i].y = target.y;
    if (rand() < 0.004) {
      const a = Math.floor(rand(0, greens.length));
      const b = Math.floor(rand(0, greens.length));
      [greens[a], greens[b]] = [greens[b], greens[a]];
    }
  }
  for (let i = 0; i < reds.length; i++) {
    const angle = (i / reds.length) * Math.PI * 2;
    let r = 60 + Math.sin(frame / 15 + i) * rand(3, 5);
    let x = Math.cos(angle) * r + Math.sin((frame + i) * 0.1) * rand(3, 5);
    let y = Math.sin(angle) * r + Math.sin((frame + i) * 0.1) * rand(3, 5);
    const pos = center.plus(cursor.position.minus(center).multiply(0.8)).plus(new Vec2(x, y));
    reds[i].x = pos.x;
    reds[i].y = pos.y;
    if (rand() < 0.004) {
      const a = Math.floor(rand(0, reds.length));
      const b = Math.floor(rand(0, reds.length));
      [reds[a], reds[b]] = [reds[b], reds[a]];
    }
  }
}