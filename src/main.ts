// ============================================================
// main.ts — Avatar Puppet v2 (PixiJS v8 完全対応)
// ============================================================
import {
  Application,
  Container,
  Sprite,
  Texture,
  MeshPlane,
} from 'pixi.js';
import { removeBackground } from '@imgly/background-removal';
import {
  DEFAULT_PARTS,
  EXPRESSIONS,
  POSES,
  SPEECHES,
  type PartDef,
  type TransformDelta,
  type ExpressionPreset,
  type PosePreset,
} from './presets';

// ============================================================
// 定数
// ============================================================
const SMOOTH_FACTOR = 0.1;
const IDLE_AMPLITUDE_Y = 1.5;
const IDLE_AMPLITUDE_SCALE = 0.005;
const IDLE_SPEED = 2;
const MAX_IMAGE_SIZE = 2048;
const SPEECH_DURATION = 3000;
const FEATHER_SIZE = 15;

// ============================================================
// 型定義
// ============================================================
interface PartState {
  def: PartDef;
  displayObject: Sprite | MeshPlane;
  baseX: number;
  baseY: number;
  currentX: number;
  currentY: number;
  currentScaleX: number;
  currentScaleY: number;
  currentRotation: number;
  targetX: number;
  targetY: number;
  targetScaleX: number;
  targetScaleY: number;
  targetRotation: number;
}

// ============================================================
// DOM 要素
// ============================================================
const canvasArea = document.getElementById('canvas-area')!;
const speechBubble = document.getElementById('speech-bubble')!;
const loadingOverlay = document.getElementById('loading-overlay')!;

// ============================================================
// PixiJS アプリケーション
// ============================================================
const app = new Application();

async function init(): Promise<void> {
  console.log('[AvatarPuppet] init start');

  await app.init({
    background: '#1a1a2e',
    resizeTo: canvasArea,
    antialias: true,
    preference: 'webgl', // WebGL を優先（互換性重視）
  });

  canvasArea.insertBefore(app.canvas, speechBubble);
  console.log('[AvatarPuppet] PixiJS canvas inserted');

  // サンプル画像の読み込み試行 → 失敗したらプレースホルダー
  try {
    await loadCharacterImage('./sample.png');
    console.log('[AvatarPuppet] sample.png loaded');
  } catch (e) {
    console.warn('[AvatarPuppet] sample.png not found, showing placeholder', e);
    await showPlaceholder(); // ★ await する
  }

  setupUI();

  // v8: Ticker コールバックには Ticker インスタンスが渡される
  app.ticker.add((ticker) => {
    animationLoop(ticker.deltaTime);
  });

  console.log('[AvatarPuppet] init complete — ready');
}

// ============================================================
// 背景除去処理
// ============================================================
async function removeBg(source: Blob | string): Promise<HTMLImageElement> {
  showLoading('背景を除去しています…');
  try {
    let inputBlob: Blob;
    if (typeof source === 'string') {
      const res = await fetch(source);
      inputBlob = await res.blob();
    } else {
      inputBlob = source;
    }
    const resultBlob = await removeBackground(inputBlob, {
      output: { format: 'image/png' },
    });
    const url = URL.createObjectURL(resultBlob);
    const img = await loadImage(url);
    URL.revokeObjectURL(url);
    return img;
  } finally {
    hideLoading();
  }
}

function showLoading(message: string): void {
  loadingOverlay.textContent = message;
  loadingOverlay.classList.add('visible');
}

function hideLoading(): void {
  loadingOverlay.classList.remove('visible');
}

// ============================================================
// パーツ境界フェザリング
// ============================================================
function applyFeathering(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  feather: number,
): void {
  ctx.globalCompositeOperation = 'destination-in';

  // 上端
  const topGrad = ctx.createLinearGradient(0, 0, 0, feather);
  topGrad.addColorStop(0, 'rgba(0,0,0,0)');
  topGrad.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, width, feather);

  // 下端
  const bottomGrad = ctx.createLinearGradient(0, height - feather, 0, height);
  bottomGrad.addColorStop(0, 'rgba(0,0,0,1)');
  bottomGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bottomGrad;
  ctx.fillRect(0, height - feather, width, feather);

  // 左端
  const leftGrad = ctx.createLinearGradient(0, 0, feather, 0);
  leftGrad.addColorStop(0, 'rgba(0,0,0,0)');
  leftGrad.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = leftGrad;
  ctx.fillRect(0, 0, feather, height);

  // 右端
  const rightGrad = ctx.createLinearGradient(width - feather, 0, width, 0);
  rightGrad.addColorStop(0, 'rgba(0,0,0,1)');
  rightGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rightGrad;
  ctx.fillRect(width - feather, 0, feather, height);

  ctx.globalCompositeOperation = 'source-over';
}

// ============================================================
// パーツ管理
// ============================================================
const partStates: Map<string, PartState> = new Map();
const characterContainer = new Container();
let currentExpression = 'neutral';
let currentPose = 'stand';
let speechTimer: ReturnType<typeof setTimeout> | null = null;

async function loadCharacterImage(src: string): Promise<void> {
  const img = await loadImage(src);
  buildPartsFromImage(img);
}

function buildPartsFromImage(img: HTMLImageElement): void {
  const imgW = Math.min(img.naturalWidth || img.width, MAX_IMAGE_SIZE);
  const imgH = Math.min(img.naturalHeight || img.height, MAX_IMAGE_SIZE);

  console.log(`[AvatarPuppet] buildParts: ${imgW}x${imgH}`);

  characterContainer.removeChildren();
  partStates.clear();

  const areaW = canvasArea.clientWidth;
  const areaH = canvasArea.clientHeight;
  const fitScale = Math.min((areaW * 0.65) / imgW, (areaH * 0.85) / imgH, 1);

  const offsetX = (areaW - imgW * fitScale) / 2;
  const offsetY = (areaH - imgH * fitScale) / 2 + areaH * 0.05;

  for (const def of DEFAULT_PARTS) {
    const sx = Math.round(def.region.x * imgW);
    const sy = Math.round(def.region.y * imgH);
    const sw = Math.max(Math.round(def.region.w * imgW), 1);
    const sh = Math.max(Math.round(def.region.h * imgH), 1);

    // パーツ用キャンバス作成
    const partCanvas = document.createElement('canvas');
    partCanvas.width = sw;
    partCanvas.height = sh;
    const ctx = partCanvas.getContext('2d')!;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

    // フェザリング適用
    if (sw > FEATHER_SIZE * 2 && sh > FEATHER_SIZE * 2) {
      applyFeathering(ctx, sw, sh, FEATHER_SIZE);
    }

    // v8: Texture.from は HTMLCanvasElement を直接受け取れる
    const texture = Texture.from(partCanvas);

    let displayObject: Sprite | MeshPlane;

    if (def.useMesh && def.meshGridX && def.meshGridY) {
      // v8: MeshPlane はオブジェクト引数
      displayObject = new MeshPlane({
        texture,
        verticesX: def.meshGridX,
        verticesY: def.meshGridY,
      });
    } else {
      // v8: Sprite もオブジェクト引数推奨
      displayObject = new Sprite({ texture });
    }

    const scaledW = sw * fitScale;
    const scaledH = sh * fitScale;

    displayObject.width = scaledW;
    displayObject.height = scaledH;

    const baseX = offsetX + sx * fitScale + scaledW * def.anchorX;
    const baseY = offsetY + sy * fitScale + scaledH * def.anchorY;

    displayObject.x = baseX;
    displayObject.y = baseY;
    displayObject.zIndex = def.zIndex;

    // Sprite は anchor、MeshPlane は pivot を使う
    if (displayObject instanceof Sprite) {
      displayObject.anchor.set(def.anchorX, def.anchorY);
    } else {
      displayObject.pivot.set(scaledW * def.anchorX, scaledH * def.anchorY);
    }

    characterContainer.addChild(displayObject);

    partStates.set(def.id, {
      def,
      displayObject,
      baseX,
      baseY,
      currentX: 0,
      currentY: 0,
      currentScaleX: 1,
      currentScaleY: 1,
      currentRotation: 0,
      targetX: 0,
      targetY: 0,
      targetScaleX: 1,
      targetScaleY: 1,
      targetRotation: 0,
    });
  }

  characterContainer.sortableChildren = true;
  if (!characterContainer.parent) {
    app.stage.addChild(characterContainer);
  }

  console.log(`[AvatarPuppet] ${partStates.size} parts built`);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Failed to load image: ${src} — ${e}`));
    img.src = src;
  });
}

async function loadFromFile(file: File, withBgRemoval: boolean): Promise<void> {
  if (withBgRemoval) {
    const img = await removeBg(file);
    buildPartsFromImage(img);
  } else {
    const url = URL.createObjectURL(file);
    try {
      await loadCharacterImage(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

// ============================================================
// プレースホルダー（サンプル画像がない場合）
// ============================================================
async function showPlaceholder(): Promise<void> {
  const W = 512;
  const H = 768;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, W, H);

  // 体
  ctx.fillStyle = '#4a6fa5';
  ctx.beginPath();
  ctx.roundRect(152, 346, 208, 350, 20);
  ctx.fill();

  // 頭
  ctx.fillStyle = '#f5d6ba';
  ctx.beginPath();
  ctx.ellipse(256, 180, 130, 160, 0, 0, Math.PI * 2);
  ctx.fill();

  // 左目
  ctx.fillStyle = '#2c3e50';
  ctx.beginPath();
  ctx.ellipse(200, 155, 22, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(206, 148, 8, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // 右目
  ctx.fillStyle = '#2c3e50';
  ctx.beginPath();
  ctx.ellipse(312, 155, 22, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(318, 148, 8, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // 口
  ctx.strokeStyle = '#c0392b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(256, 240, 30, 0.1, Math.PI - 0.1);
  ctx.stroke();

  // 左腕
  ctx.fillStyle = '#4a6fa5';
  ctx.beginPath();
  ctx.roundRect(60, 360, 100, 260, 20);
  ctx.fill();

  // 右腕
  ctx.beginPath();
  ctx.roundRect(352, 360, 100, 260, 20);
  ctx.fill();

  // 髪
  ctx.fillStyle = '#5c3d2e';
  ctx.beginPath();
  ctx.ellipse(256, 110, 145, 110, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(111, 110, 40, 140);
  ctx.fillRect(361, 110, 40, 140);

  // Data URL 経由で HTMLImageElement を生成し、パーツ構築
  const dataUrl = canvas.toDataURL('image/png');
  await loadCharacterImage(dataUrl);

  console.log('[AvatarPuppet] placeholder character built');
}

// ============================================================
// アニメーションループ
// ============================================================
let elapsedTime = 0;

function animationLoop(deltaTime: number): void {
  // v8: deltaTime は 60fps 基準のフレーム比（1.0 = 1フレーム）
  // dt は秒単位ではなくフレーム単位でそのまま使う
  const dt = deltaTime;
  elapsedTime += dt / 60; // 秒換算のタイマー（idle breathing 用）

  for (const [id, state] of partStates) {
    let idleY = 0;
    let idleScaleY = 0;

    if (id === 'body') {
      idleY = Math.sin(elapsedTime * IDLE_SPEED) * IDLE_AMPLITUDE_Y;
      idleScaleY = Math.sin(elapsedTime * IDLE_SPEED) * IDLE_AMPLITUDE_SCALE;
    } else if (id === 'head') {
      idleY = Math.sin(elapsedTime * IDLE_SPEED + 0.5) * IDLE_AMPLITUDE_Y * 0.7;
    }

    // スムーズ補間: SMOOTH_FACTOR をフレームレート非依存で適用
    const factor = 1 - Math.pow(1 - SMOOTH_FACTOR, dt);

    state.currentX += (state.targetX - state.currentX) * factor;
    state.currentY += (state.targetY - state.currentY) * factor;
    state.currentScaleX += (state.targetScaleX - state.currentScaleX) * factor;
    state.currentScaleY += (state.targetScaleY - state.currentScaleY) * factor;
    state.currentRotation += (state.targetRotation - state.currentRotation) * factor;

    const obj = state.displayObject;
    obj.x = state.baseX + state.currentX + idleY * 0.3;
    obj.y = state.baseY + state.currentY + idleY;
    obj.scale.x = state.currentScaleX;
    obj.scale.y = state.currentScaleY + idleScaleY;
    obj.rotation = state.currentRotation;
  }
}

// ============================================================
// 表情・ポーズ・セリフ
// ============================================================
function applyExpression(name: string): void {
  const preset: ExpressionPreset | undefined = EXPRESSIONS[name];
  if (!preset) return;
  currentExpression = name;
  applyPartDelta('eyeL', preset.eyeL);
  applyPartDelta('eyeR', preset.eyeR);
  applyPartDelta('mouth', preset.mouth);
  updateActiveButton('expression-btns', 'data-expr', name);
}

function applyPose(name: string): void {
  const preset: PosePreset | undefined = POSES[name];
  if (!preset) return;
  currentPose = name;
  if (preset.body) applyPartDelta('body', preset.body);
  if (preset.head) applyPartDelta('head', preset.head);
  if (preset.armL) applyPartDelta('armL', preset.armL);
  if (preset.armR) applyPartDelta('armR', preset.armR);
  if (preset.zOverride) {
    for (const [partId, z] of Object.entries(preset.zOverride)) {
      const state = partStates.get(partId);
      if (state) state.displayObject.zIndex = z;
    }
  }
  updateActiveButton('pose-btns', 'data-pose', name);
}

function applySpeech(name: string): void {
  const preset = SPEECHES[name];
  if (!preset) return;
  applyExpression(preset.expression);
  applyPose(preset.pose);
  speechBubble.textContent = preset.text;
  speechBubble.classList.add('visible');
  if (speechTimer) clearTimeout(speechTimer);
  speechTimer = setTimeout(() => {
    speechBubble.classList.remove('visible');
  }, SPEECH_DURATION);
  updateActiveButton('speech-btns', 'data-speech', name);
}

function applyPartDelta(partId: string, delta: TransformDelta): void {
  const state = partStates.get(partId);
  if (!state) return;
  if (delta.x !== undefined) state.targetX = delta.x;
  if (delta.y !== undefined) state.targetY = delta.y;
  if (delta.scaleX !== undefined) state.targetScaleX = delta.scaleX;
  if (delta.scaleY !== undefined) state.targetScaleY = delta.scaleY;
  if (delta.rotation !== undefined) state.targetRotation = delta.rotation;
}

// ============================================================
// UI セットアップ
// ============================================================
function setupUI(): void {
  const uploadInput = document.getElementById('upload-input') as HTMLInputElement;
  const bgToggle = document.getElementById('bg-removal-toggle') as HTMLInputElement;

  uploadInput.addEventListener('change', async () => {
    const file = uploadInput.files?.[0];
    if (!file) return;
    try {
      await loadFromFile(file, bgToggle.checked);
      applyExpression(currentExpression);
      applyPose(currentPose);
    } catch (e) {
      console.error('[AvatarPuppet] Failed to load uploaded file:', e);
      alert('画像の読み込みに失敗しました。別の画像をお試しください。');
    }
  });

  document.querySelectorAll<HTMLButtonElement>('#expression-btns button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const expr = btn.dataset.expr;
      if (expr) applyExpression(expr);
    });
  });

  document.querySelectorAll<HTMLButtonElement>('#pose-btns button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pose = btn.dataset.pose;
      if (pose) applyPose(pose);
    });
  });

  document.querySelectorAll<HTMLButtonElement>('#speech-btns button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const speech = btn.dataset.speech;
      if (speech) applySpeech(speech);
    });
  });

  // 初期状態を適用
  applyExpression('neutral');
  applyPose('stand');

  console.log('[AvatarPuppet] UI setup complete');
}

function updateActiveButton(groupId: string, attr: string, value: string): void {
  document.querySelectorAll<HTMLButtonElement>(`#${groupId} button`).forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute(attr) === value);
  });
}

// ============================================================
// 起動
// ============================================================
init().catch((err) => {
  console.error('[AvatarPuppet] Fatal error during init:', err);
});
