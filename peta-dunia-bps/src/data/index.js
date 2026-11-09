// Data definitions for Peta Dunia BPS
export const BpsData = {
  // 8 Islands on the World Map (#/world)
  // Rect format: [left, top, width, height] in stage coordinates (960x560)
  islands: [
    {
      id: 'kepala',
      label: 'Kepala & Wakil Kepala BPS',
      rect: [390, 70, 180, 110],
      blockColor: '#4A90D9',
      pillColor: '#0F3D6E',
      locked: true
    },
    {
      id: 'sestama',
      label: 'Sekretariat Utama',
      rect: [40, 210, 230, 140],
      blockColor: '#4CB8A0',
      pillColor: '#1F8A70',
      locked: false,
      star: true
    },
    {
      id: 'metodologi',
      label: 'Metodologi & Informasi',
      rect: [300, 235, 200, 130],
      blockColor: '#2E6FD6',
      pillColor: '#1C4FA0',
      locked: true
    },
    {
      id: 'sosial',
      label: 'Statistik Sosial',
      rect: [530, 225, 200, 130],
      blockColor: '#8C6FD6',
      pillColor: '#5B3FB0',
      locked: true
    },
    {
      id: 'produksi',
      label: 'Statistik Produksi',
      rect: [750, 210, 190, 130],
      blockColor: '#E8963A',
      pillColor: '#C06A10',
      locked: true
    },
    {
      id: 'distribusi',
      label: 'Distribusi & Jasa',
      rect: [110, 400, 210, 120],
      blockColor: '#D9566A',
      pillColor: '#A82A40',
      locked: true
    },
    {
      id: 'neraca',
      label: 'Neraca & Analisis',
      rect: [400, 410, 210, 110],
      blockColor: '#4AA3A8',
      pillColor: '#1F7A80',
      locked: true
    },
    {
      id: 'itama',
      label: 'Inspektorat Utama',
      rect: [680, 400, 210, 120],
      blockColor: '#8A97A8',
      pillColor: '#5A6678',
      locked: true
    }
  ],

  // 7 Biro Units for Sekretariat Utama (#/island)
  biros: [
    { id: 'sdm', name: 'Biro SDM' },
    { id: 'umum', name: 'Biro Umum' },
    { id: 'perencanaan', name: 'Biro Perencanaan' },
    { id: 'keuangan', name: 'Biro Keuangan' },
    { id: 'hukum-humas', name: 'Biro Hukum & Humas' },
    { id: 'ortala', name: 'Biro Ortala' },
    { id: 'pbj', name: 'Biro Pengadaan (PBJ)' }
  ]
};
