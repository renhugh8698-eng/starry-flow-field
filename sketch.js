/*
 * 追鸟 · 天空小鸟追逐动画（p5.js）
 * 交互（鼠标 / 手机触摸均支持）：
 *   点/触一只小鸟 → 它变成"被追者"，鸟群追逐它；追到后目标转移，形成互相追逐
 *   点/触天空     → 鸟群飞向该点聚集
 */

let birds = [];
let clouds = [];
let skyCanvas = null;
let itBird = null;
let gatherPoint = null;
let gatherUntil = 0;
let score = 0;
let feathers = [];   // 追到/点选时的羽毛粒子
let hintAlpha = 255; // 提示文字渐隐
let lastTap = 0;     // 防鼠标/触摸双触发

const PALETTE = ['#f58f29', '#ef5da8', '#1f9e8f', '#8a6de9', '#f2c94c', '#4a90d9', '#e4573d', '#41b883'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  textFont('sans-serif');
  const cv = select('canvas');
  if (cv) cv.style('touch-action', 'none');
  makeSky();

  for (let i = 0; i < 6; i++) {
    clouds.push({ x: random(width), y: random(height * 0.45), s: random(0.7, 1.4), sp: random(0.15, 0.45), o: random(TWO_PI) });
  }
  for (let i = 0; i < 44; i++) {
    birds.push(new Bird());
  }
}

function draw() {
  image(skyCanvas, 0, 0);

  // 云
  noStroke();
  for (const c of clouds) {
    c.x += c.sp;
    c.o += 0.004;
    if (c.x > width + 140) { c.x = -140; c.y = random(height * 0.45); }
    const a = 70 + 18 * sin(c.o);
    fill(255, a);
    ellipse(c.x, c.y, 130 * c.s, 34 * c.s);
    ellipse(c.x - 40 * c.s, c.y + 8 * c.s, 80 * c.s, 26 * c.s);
    ellipse(c.x + 42 * c.s, c.y + 6 * c.s, 90 * c.s, 28 * c.s);
  }

  // 羽毛粒子
  for (let i = feathers.length - 1; i >= 0; i--) {
    const f = feathers[i];
    f.pos.add(f.vel);
    f.vel.mult(0.94);
    f.life -= 0.02;
    if (f.life <= 0) { feathers.splice(i, 1); continue; }
    fill(f.col, f.life * 255);
    circle(f.pos.x, f.pos.y, f.size);
  }

  // 更新鸟（先用上一帧位置算质心，供被追者逃跑用）
  let cx = 0, cy = 0;
  for (const b of birds) { cx += b.pos.x; cy += b.pos.y; }
  cx /= birds.length; cy /= birds.length;
  for (const b of birds) { b.update(cx, cy); }

  // 追逐判定：追到即转移目标
  if (itBird) {
    for (const b of birds) {
      if (b === itBird) continue;
      if (dist(b.pos.x, b.pos.y, itBird.pos.x, itBird.pos.y) < 26) {
        poof(itBird.pos.x, itBird.pos.y, itBird.col);
        setIt(b);
        score++;
        break;
      }
    }
  }

  // 绘制鸟
  for (const b of birds) { b.show(); }

  // 被追者标记：光圈 + 头顶星星
  if (itBird) {
    noFill();
    stroke(255, 200);
    strokeWeight(2);
    circle(itBird.pos.x, itBird.pos.y, (28 + 8 * sin(frameCount * 0.15)));
    drawStar(itBird.pos.x, itBird.pos.y - 24 - 3 * sin(frameCount * 0.15), 7, 10, 4, color(255, 214, 82, 235));
  }

  // 聚集点标记
  if (gatherPoint && millis() < gatherUntil) {
    noFill();
    stroke(255, 180);
    strokeWeight(1.5);
    circle(gatherPoint.x, gatherPoint.y, 30 + 12 * sin(frameCount * 0.2));
    fill(255, 200);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(14);
    text('来啦来啦', gatherPoint.x, gatherPoint.y - 26);
  }

  // HUD
  noStroke();
  fill(255, 220);
  textSize(17);
  textAlign(CENTER, TOP);
  text('追到 ' + score + ' 次', width / 2, 14);

  if (hintAlpha > 0) {
    hintAlpha -= 0.4;
    fill(255, hintAlpha);
    textSize(12);
    textAlign(CENTER, BOTTOM);
    text('点小鸟：开始追逐  点天空：聚集并停止追逐', width / 2, height - 12);
  }
}

class Bird {
  constructor() {
    this.pos = createVector(random(width), random(height));
    this.vel = p5.Vector.fromAngle(random(TWO_PI)).mult(random(1.2, 2));
    this.acc = createVector(0, 0);
    this.baseSpeed = random(1.7, 2.6);
    this.maxSpeed = this.baseSpeed;
    this.chaseSpeed = this.baseSpeed * 1.45;
    this.angle = this.vel.heading();
    this.col = color(PALETTE[floor(random(PALETTE.length))]);
    this.wingCol = lerpColor(this.col, color('#ffffff'), 0.35);
    this.flapPhase = random(TWO_PI);
    this.flapSpeed = random(0.15, 0.28);
    this.wob = random(1000);
    this.isIt = false;
  }

  update(cx, cy) {
    this.acc.mult(0);
    this.separate();
    this.wander();

    if (this.isIt) {
      // 被追者：逃离鸟群质心，跑得比追兵快一点
      const away = p5.Vector.sub(this.pos, createVector(cx, cy));
      if (away.mag() > 1) away.setMag(0.55);
      this.acc.add(away);
      this.maxSpeed = this.chaseSpeed;
      this.flapSpeed = 0.32;
    } else if (itBird) {
      // 追兵：直奔被追者
      const to = p5.Vector.sub(itBird.pos, this.pos);
      if (to.mag() > 1) to.setMag(0.5);
      this.acc.add(to);
      this.maxSpeed = this.chaseSpeed * 0.9;
      this.flapSpeed = 0.32;
    } else {
      this.maxSpeed = this.baseSpeed;
      this.flapSpeed = 0.2;
    }

    // 点击天空的聚集点
    if (gatherPoint && millis() < gatherUntil) {
      const to = p5.Vector.sub(gatherPoint, this.pos);
      if (to.mag() > 2) { to.setMag(0.6); this.acc.add(to); }
      this.maxSpeed = this.baseSpeed * 1.35;
    }

    this.edges();
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
  }

  wander() {
    this.wob += 0.008;
    const a = noise(this.wob) * TWO_PI;
    this.acc.add(p5.Vector.fromAngle(a).mult(0.3));
  }

  separate() {
    const steer = createVector(0, 0);
    let count = 0;
    for (const o of birds) {
      if (o === this) continue;
      const d = dist(this.pos.x, this.pos.y, o.pos.x, o.pos.y);
      if (d < 20 && d > 0) {
        const diff = p5.Vector.sub(this.pos, o.pos);
        diff.setMag(1 / d);
        steer.add(diff);
        count++;
      }
    }
    if (count > 0) steer.setMag(0.4);
    this.acc.add(steer);
  }

  edges() {
    const m = 60;
    if (this.pos.x < m) this.acc.add(createVector(0.35, 0));
    if (this.pos.x > width - m) this.acc.add(createVector(-0.35, 0));
    if (this.pos.y < m) this.acc.add(createVector(0, 0.35));
    if (this.pos.y > height - m) this.acc.add(createVector(0, -0.35));
  }

  show() {
    this.angle = lerpAngle(this.angle, this.vel.heading(), 0.2);
    const f = sin(frameCount * this.flapSpeed + this.flapPhase);
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);

    // 翅膀（大而醒目，上下扇动）
    fill(this.wingCol);
    push();
    rotate(f * 0.7);
    beginShape();
    vertex(0, -1);
    bezierVertex(-2, -13, -12, -16, -16, -9);
    bezierVertex(-11, -7, -6, -5, 0, -1);
    endShape(CLOSE);
    pop();

    // 身体
    fill(this.col);
    ellipse(0, 0, 13, 9);
    // 头
    circle(6, -2.5, 5.5);
    // 喙
    fill('#f7a83e');
    triangle(9.5, -3, 14, -1.5, 9.5, -0.5);
    // 眼
    fill(255);
    circle(7.5, -3.5, 2.4);
    fill(30);
    circle(7.8, -3.5, 1.2);
    // 尾
    fill(this.col);
    triangle(-6, 0, -11, -3 - f * 1.2, -11, 3 + f * 1.2);
    pop();
  }
}

/* ---------- 交互 ---------- */

function mousePressed() {
  tapAt(mouseX, mouseY);
  return false;
}

function touchStarted() {
  if (touches.length > 0) tapAt(touches[0].x, touches[0].y);
  return false;
}

function tapAt(x, y) {
  const now = millis();
  if (now - lastTap < 200) return;   // 防触摸后的模拟鼠标重复触发
  lastTap = now;

  let best = null, bestD = 1e9;
  for (const b of birds) {
    const d = dist(x, y, b.pos.x, b.pos.y);
    if (d < 26 && d < bestD) { best = b; bestD = d; }
  }
  if (best) {
    poof(best.pos.x, best.pos.y, best.col);
    setIt(best);          // 开始追逐
  } else {
    // 点天空：鸟群聚集，同时停止追逐，恢复自由飞行
    if (itBird) itBird.isIt = false;
    itBird = null;
    gatherPoint = createVector(x, y);
    gatherUntil = millis() + 1800;
  }
}

function setIt(b) {
  if (itBird) itBird.isIt = false;
  b.isIt = true;
  itBird = b;
}

function poof(x, y, col) {
  for (let i = 0; i < 10; i++) {
    const a = random(TWO_PI);
    feathers.push({
      pos: createVector(x, y),
      vel: createVector(cos(a) * random(1, 3.2), sin(a) * random(1, 3.2)),
      size: random(2, 4.5),
      life: 1,
      col: col
    });
  }
}

function drawStar(x, y, rOuter, rInner, points, col) {
  fill(col);
  noStroke();
  beginShape();
  for (let i = 0; i < points * 2; i++) {
    const r = (i % 2 === 0) ? rOuter : rInner;
    const a = -HALF_PI + i * PI / points;
    vertex(x + cos(a) * r, y + sin(a) * r);
  }
  endShape(CLOSE);
}

function lerpAngle(a, b, t) {
  let d = (b - a) % TWO_PI;
  if (d > PI) d -= TWO_PI;
  if (d < -PI) d += TWO_PI;
  return a + d * t;
}

function makeSky() {
  skyCanvas = createGraphics(width, height);
  const g = skyCanvas.drawingContext;
  const grad = g.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#79b8f2');
  grad.addColorStop(0.6, '#c9e6fd');
  grad.addColorStop(1, '#fff6da');
  g.fillStyle = grad;
  g.fillRect(0, 0, width, height);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  makeSky();
}
