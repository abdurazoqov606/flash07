export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface Results {
  multiHandLandmarks?: Landmark[][];
  multiHandedness?: Array<{
    index: number;
    score: number;
    label: 'Left' | 'Right';
  }>;
  image?: HTMLVideoElement | HTMLCanvasElement;
}

export interface HandsOptions {
  maxNumHands?: number;
  modelComplexity?: 0 | 1;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
  selfieMode?: boolean;
}

export interface HandsInstance {
  setOptions(options: HandsOptions): void;
  onResults(callback: (results: Results) => void): void;
  send(input: { image: HTMLVideoElement | HTMLCanvasElement }): Promise<void>;
  initialize(): Promise<void>;
  close(): Promise<void>;
}

declare global {
  interface Window {
    Hands?: new (config: { locateFile: (file: string) => string }) => HandsInstance;
  }
}
