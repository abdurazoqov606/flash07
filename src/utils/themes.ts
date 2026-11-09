export interface ColorTheme {
  id: string;
  name: string;
  primary: string; // Hex or CSS color
  secondary: string;
  accent: string;
  glow: string;
  boneColor: string;
  jointColor: string;
}

export const THEMES: ColorTheme[] = [
  {
    id: 'cyan',
    name: 'Cyber Cyan',
    primary: '#00f0ff',
    secondary: '#39ff88',
    accent: '#ff2bd6',
    glow: 'rgba(0, 240, 255, 0.6)',
    boneColor: 'rgba(0, 240, 255, 0.22)',
    jointColor: '#39ff88',
  },
  {
    id: 'magenta',
    name: 'Neon Magenta',
    primary: '#ff2bd6',
    secondary: '#9d4edd',
    accent: '#00f0ff',
    glow: 'rgba(255, 43, 214, 0.6)',
    boneColor: 'rgba(255, 43, 214, 0.22)',
    jointColor: '#ff70e8',
  },
  {
    id: 'emerald',
    name: 'Matrix Emerald',
    primary: '#39ff88',
    secondary: '#00e5ff',
    accent: '#ffe34d',
    glow: 'rgba(57, 255, 136, 0.6)',
    boneColor: 'rgba(57, 255, 136, 0.22)',
    jointColor: '#70ffb0',
  },
  {
    id: 'gold',
    name: 'Solar Gold',
    primary: '#ffd166',
    secondary: '#ff7b00',
    accent: '#00f0ff',
    glow: 'rgba(255, 209, 102, 0.6)',
    boneColor: 'rgba(255, 209, 102, 0.22)',
    jointColor: '#ffe58f',
  },
  {
    id: 'plasma',
    name: 'Plasma Crimson',
    primary: '#ff3366',
    secondary: '#ff9900',
    accent: '#39ff88',
    glow: 'rgba(255, 51, 102, 0.6)',
    boneColor: 'rgba(255, 51, 102, 0.22)',
    jointColor: '#ff8099',
  },
];
