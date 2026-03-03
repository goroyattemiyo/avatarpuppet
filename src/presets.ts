// ============================================================
// presets.ts — パーツ定義・表情・ポーズ・セリフのデータ
// ============================================================

/** パーツ矩形領域（元画像上の正規化座標 0〜1） */
export interface PartRegion {
  x: number; // 左上 X（0〜1）
  y: number; // 左上 Y（0〜1）
  w: number; // 幅（0〜1）
  h: number; // 高さ（0〜1）
}

/** パーツ定義 */
export interface PartDef {
  id: string;
  region: PartRegion;
  anchorX: number; // 回転中心 X（0〜1、パーツ内）
  anchorY: number; // 回転中心 Y（0〜1、パーツ内）
  zIndex: number;
  useMesh: boolean; // MeshPlane を使うか
  meshGridX?: number;
  meshGridY?: number;
}

/** Transform の差分（ターゲット値） */
export interface TransformDelta {
  x?: number;      // px オフセット
  y?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number; // ラジアン
}

/** 表情プリセット */
export interface ExpressionPreset {
  eyeL: TransformDelta;
  eyeR: TransformDelta;
  mouth: TransformDelta;
}

/** ポーズプリセット */
export interface PosePreset {
  body?: TransformDelta;
  head?: TransformDelta;
  armL?: TransformDelta;
  armR?: TransformDelta;
  zOverride?: Record<string, number>;
}

/** セリフプリセット */
export interface SpeechPreset {
  text: string;
  expression: string; // ExpressionPreset のキー名
  pose: string;       // PosePreset のキー名
}

// ============================================================
// デフォルトパーツ定義（汎用キャラ画像向け）
// ユーザーはこの値を調整して自分の画像に合わせる
// ============================================================
export const DEFAULT_PARTS: PartDef[] = [
  { id: 'body',  region: { x: 0.20, y: 0.45, w: 0.60, h: 0.55 }, anchorX: 0.5, anchorY: 0.0, zIndex: 1, useMesh: false },
  { id: 'head',  region: { x: 0.15, y: 0.00, w: 0.70, h: 0.50 }, anchorX: 0.5, anchorY: 1.0, zIndex: 3, useMesh: false },
  { id: 'eyeL',  region: { x: 0.25, y: 0.15, w: 0.15, h: 0.10 }, anchorX: 0.5, anchorY: 0.5, zIndex: 4, useMesh: true, meshGridX: 4, meshGridY: 4 },
  { id: 'eyeR',  region: { x: 0.60, y: 0.15, w: 0.15, h: 0.10 }, anchorX: 0.5, anchorY: 0.5, zIndex: 4, useMesh: true, meshGridX: 4, meshGridY: 4 },
  { id: 'mouth', region: { x: 0.35, y: 0.30, w: 0.30, h: 0.12 }, anchorX: 0.5, anchorY: 0.5, zIndex: 4, useMesh: true, meshGridX: 6, meshGridY: 4 },
  { id: 'armL',  region: { x: 0.02, y: 0.45, w: 0.20, h: 0.40 }, anchorX: 1.0, anchorY: 0.1, zIndex: 2, useMesh: false },
  { id: 'armR',  region: { x: 0.78, y: 0.45, w: 0.20, h: 0.40 }, anchorX: 0.0, anchorY: 0.1, zIndex: 2, useMesh: false },
];

// ============================================================
// 表情プリセット
// ============================================================
export const EXPRESSIONS: Record<string, ExpressionPreset> = {
  neutral: {
    eyeL:  { scaleX: 1.0, scaleY: 1.0, rotation: 0 },
    eyeR:  { scaleX: 1.0, scaleY: 1.0, rotation: 0 },
    mouth: { scaleX: 1.0, scaleY: 1.0, y: 0 },
  },
  happy: {
    eyeL:  { scaleX: 1.1, scaleY: 0.6, rotation: 0 },
    eyeR:  { scaleX: 1.1, scaleY: 0.6, rotation: 0 },
    mouth: { scaleX: 1.3, scaleY: 1.2, y: 2 },
  },
  angry: {
    eyeL:  { scaleX: 0.9, scaleY: 0.8, rotation: -0.15 },
    eyeR:  { scaleX: 0.9, scaleY: 0.8, rotation: 0.15 },
    mouth: { scaleX: 0.8, scaleY: 0.7, y: -1 },
  },
  surprised: {
    eyeL:  { scaleX: 1.3, scaleY: 1.4, rotation: 0 },
    eyeR:  { scaleX: 1.3, scaleY: 1.4, rotation: 0 },
    mouth: { scaleX: 0.7, scaleY: 1.5, y: 4 },
  },
};

// ============================================================
// ポーズプリセット
// ============================================================
export const POSES: Record<string, PosePreset> = {
  stand: {
    body: { rotation: 0, y: 0 },
    head: { rotation: 0, y: 0 },
    armL: { rotation: 0, x: 0, y: 0 },
    armR: { rotation: 0, x: 0, y: 0 },
  },
  wave: {
    body: { rotation: 0, y: 0 },
    head: { rotation: 0.05, y: 0 },
    armL: { rotation: 0, x: 0, y: 0 },
    armR: { rotation: -0.8, x: 10, y: -30 },
    zOverride: { armR: 5 },
  },
  bow: {
    body: { rotation: 0.15, y: 10 },
    head: { rotation: 0.25, y: 15 },
    armL: { rotation: 0.1, x: 0, y: 5 },
    armR: { rotation: -0.1, x: 0, y: 5 },
  },
};

// ============================================================
// セリフプリセット
// ============================================================
export const SPEECHES: Record<string, SpeechPreset> = {
  greet: {
    text: 'こんにちは！今日もよろしくね！',
    expression: 'happy',
    pose: 'wave',
  },
  angry: {
    text: 'もう！ちゃんと聞いてよ！',
    expression: 'angry',
    pose: 'stand',
  },
  bye: {
    text: 'またね！バイバイ！',
    expression: 'happy',
    pose: 'wave',
  },
  think: {
    text: 'うーん…どうしようかな…',
    expression: 'surprised',
    pose: 'stand',
  },
};
