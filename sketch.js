/*
 * 星海流波 · Flow Field 粒子动画
 * 用法：p5.js Web Editor 中新建草图，用本文件内容替换 sketch.js 后点播放
 * 交互：移动鼠标，粒子会绕开光标
 */

let particles = [];
let flowField = [];
let scl = 14;               // 流场网格尺寸
let cols, rows;
let zoff = 0;               // 流场随时间演化
let hueBase = 0;            // 全局色相偏移
let mouseReady = false;     // 鼠标是否已进入画布
let stars = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  noStroke();

  cols = floor(width / scl);
  rows = floor(height / scl);
  flowField = new Array(cols * rows);

  // 背景星点
  for (let i = 0; i < 140; i++) {
    stars.push({ x: random(width), y: random(height), r: random(0.6, 1.8), tw: random(TWO_PI) });
  }

  // 粒子
  for (let i = 0; i < 240; i++) {
    particles.push(new Particle());
  }
}

function draw() {
  // 半透明底色，产生流光拖尾
  fill(0, 0, 7, 16);
  rect(0, 0, width, height);

  // 星星闪烁
  for (const s of stars) {
    s.tw += 0.05;
    fill(210, 30, 95, 35 + 55 * (0.5 + 0.5 * sin(s.tw)));
    circle(s.x, s.y, s.r * 2);
  }

  // 重算流场（Perlin 噪声 + 时间维演化）
  let yoff = 0;
  for (let y = 0; y < rows; y++) {
    let xoff = 0;
    for (let x = 0; x < cols; x++) {
      const idx = x + y * cols;
      const angle = noise(xoff, yoff, zoff) * TWO_PI * 2;
      flowField[idx] = p5.Vector.fromAngle(angle);
      xoff += 0.1;
    }
    yoff += 0.1;
  }
  zoff += 0.004;
  hueBase = (hueBase + 0.12) % 360;

  // 更新并绘制粒子
  for (const p of particles) {
    p.follow();
    p.edges();
    p.update();
    p.show();
  }

  // 提示文字
  fill(200, 40, 90, 45);
  textSize(13);
  textAlign(LEFT, BOTTOM);
  text('星海流波 · p5.js demo ｜ 移动鼠标，粒子会避开光标', 14, height - 14);
}

class Particle {
  constructor() {
    this.pos = createVector(random(width), random(height));
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);
    this.maxSpeed = 2.2;
    this.hue = random(180, 330);   // 青-紫-粉区间
    this.r = random(2.2, 3.4);
  }

  follow() {
    const x = floor(constrain(this.pos.x / scl, 0, cols - 1));
    const y = floor(constrain(this.pos.y / scl, 0, rows - 1));
    this.acc.add(flowField[x + y * cols]);
  }

  edges() {
    if (this.pos.x < -10) this.pos.x = width + 10;
    if (this.pos.x > width + 10) this.pos.x = -10;
    if (this.pos.y < -10) this.pos.y = height + 10;
    if (this.pos.y > height + 10) this.pos.y = -10;
  }

  update() {
    if (mouseReady) {
      const d = dist(this.pos.x, this.pos.y, mouseX, mouseY);
      if (d < 130 && d > 0.001) {
        const rep = p5.Vector.sub(this.pos, createVector(mouseX, mouseY));
        rep.setMag(map(d, 0, 130, 2.4, 0));
        this.acc.add(rep);
      }
    }
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.mult(0);
  }

  show() {
    fill((this.hue + hueBase) % 360, 75, 95, 62);
    circle(this.pos.x, this.pos.y, this.r);
  }
}

function mouseMoved() {
  mouseReady = true;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  cols = floor(width / scl);
  rows = floor(height / scl);
  flowField = new Array(cols * rows);
}
