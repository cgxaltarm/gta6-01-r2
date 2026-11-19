// Garage progression and three original radio identities, persisted with the player save.
export const RADIO = [
  { name: 'COAST FM', frequency: '88.4', color: '#f2c16e', mood: 'Golden hour / surf soul' },
  { name: 'PALM RADIO', frequency: '101.2', color: '#9ad3b2', mood: 'Island grooves / soft static' },
  { name: 'VELA CLASSICS', frequency: '94.7', color: '#a9cce3', mood: 'Blue bay / night drive' },
];

export const UPGRADES = [
  { id: 'engine', label: 'Longer gearing', price: 320, description: 'Raise the Solano GT top speed.' },
  { id: 'suspension', label: 'Coastline suspension', price: 260, description: 'Settle the coupe through a fast turn.' },
  { id: 'paint', label: 'Sunset enamel', price: 180, description: 'Give the body a fresh warm finish.' },
];

export class GarageSystem {
  constructor(player) {
    this.player = player;
    this.installed = new Set();
  }

  upgrade(id) {
    const option = UPGRADES.find(item => item.id === id);
    if (!option || this.installed.has(id) || this.player.money < option.price) return false;
    this.player.money -= option.price;
    this.installed.add(id);
    if (id === 'engine') this.player.engineMultiplier = 1.25;
    if (id === 'suspension') this.player.gripMultiplier = 1.2;
    if (id === 'paint') this.player.currentCar.children[0]?.material?.color?.setHex(0xefb568);
    this.player.save();
    return true;
  }

  available(position) {
    return Math.hypot(position.x - 310, position.z - 430) < 30;
  }
}
