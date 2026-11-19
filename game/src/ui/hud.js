// HUD, minimap, title screen and narrative messages for VELAMAR.
import { ROAD_HALF, ROAD_X, ROAD_Z, CITY_SPAN } from '../world/city-plan.js';

const STORY_TITLES = ['FIRST WHEELS', 'SUNSET DELIVERY', 'THE PICKUP', 'HEAT ON THE STRIP', 'WAREHOUSE RUN', 'COASTLINE GRAND PRIX', 'TOOLS OF THE TRADE', 'THE LAST TIDE'];
const RADIO_STATIONS = [
  { name: 'COAST FM', song: 'The Golden Hour' },
  { name: 'PALM RADIO', song: 'Pacific Static' },
  { name: 'VELA CLASSICS', song: 'Blue Bay Drive' },
];

export class Hud {
  constructor(player, mission, traffic) {
    this.player = player;
    this.mission = mission;
    this.traffic = traffic;
    this.el = {
      money: document.getElementById('money'),
      missionTitle: document.getElementById('mission-title'),
      objective: document.getElementById('objective'),
      chapter: document.getElementById('chapter'),
      status: document.getElementById('mission-status'),
      timer: document.getElementById('timer'),
      weapon: document.getElementById('weapon'),
      toast: document.getElementById('toast-text'),
      toastWrap: document.getElementById('toast'),
      stars: document.getElementById('stars'),
      wanted: document.getElementById('wanted'),
      readout: document.getElementById('vehicle-readout'),
      speed: document.getElementById('speed'),
      radio: document.getElementById('radio'),
      garage: document.getElementById('garage'),
      title: document.getElementById('title-screen'),
    };
    this.minimap = document.getElementById('minimap');
    this.ctx = this.minimap.getContext('2d');
    this.toastUntil = 0;
    this.toastText = 'VELAMAR — New Game';
    this.shot = null;
    this.titleOpen = false;
    this.resetToast('VELAMAR — New Game', 6);
  }

  resetToast(text, seconds = 4) {
    this.toastText = text;
    this.toastUntil = performance.now() + seconds * 1000;
    this.el.toast.textContent = text;
    this.el.toastWrap.style.display = 'block';
  }

  setTitle(open) {
    this.titleOpen = open;
    this.el.title.style.display = open ? 'flex' : 'none';
    const hide = open ? 'none' : 'block';
    for (const id of ['mission-card', 'weapon', 'minimap', 'controls', 'wanted', 'vehicle-readout', 'radio']) {
      const node = document.getElementById(id);
      if (node) node.style.display = hide;
    }
  }

  setShot(name) {
    this.shot = name;
    const data = {
      start: { money: 0, weapon: 'FISTS', wanted: 0, mission: 0, toast: 'VELAMAR — New Game', title: false },
      drive: { money: 250, weapon: 'PISTOL', wanted: 0, mission: 1, toast: 'Driving the coast road', title: false },
      chase: { money: 800, weapon: 'SMG', wanted: 5, mission: 3, toast: '5-STAR WANTED — Escape!', title: false },
      mission: { money: 100, weapon: 'FISTS', wanted: 0, mission: 2, toast: 'Follow the beacon', title: false },
    }[name];
    if (!data) return;
    this.el.money.textContent = data.money;
    this.el.weapon.textContent = data.weapon;
    this.el.stars.textContent = '★'.repeat(data.wanted) + '☆'.repeat(5 - data.wanted);
    this.el.wanted.style.display = data.wanted ? 'block' : 'none';
    this.updateMission(data.mission);
    this.resetToast(data.toast, 120);
    this.setTitle(false);
    if (name === 'drive' || name === 'chase') this.el.readout.style.display = 'flex';
    if (name === 'start' || name === 'mission') this.el.readout.style.display = 'none';
  }

  updateMission(index = this.mission.index) {
    const data = this.mission.stories[index];
    this.el.missionTitle.textContent = data.title;
    this.el.objective.textContent = data.objective;
    this.el.chapter.textContent = String(index + 1).padStart(2, '0');
    this.el.status.textContent = index === 0 ? 'NEW THREAD' : 'IN PROGRESS';
  }

  update(time) {
    const p = this.player;
    if (!this.shot) {
      this.el.money.textContent = p.money.toLocaleString('en-US');
      this.el.weapon.textContent = p.weapon.toUpperCase();
      this.el.stars.textContent = '★'.repeat(this.traffic.heat) + '☆'.repeat(5 - this.traffic.heat);
      this.el.wanted.style.display = this.traffic.heat > 0 ? 'block' : 'none';
      this.el.readout.style.display = p.inCar ? 'flex' : 'none';
      this.el.speed.textContent = String(Math.round(Math.abs(p.speed) * 3.6)).padStart(3, '0');
      this.el.radio.style.display = p.inCar ? 'block' : 'none';
      const station = RADIO_STATIONS[p.radioStation];
      this.el.radio.innerHTML = `<span>♫</span> <b>${station.name}</b><i>ON AIR · ${station.song}</i>`;
      this.el.garage.style.display = p.inCar && Math.hypot(p.position.x - 310, p.position.z - 430) < 32 ? 'block' : 'none';
      if (this.mission.index !== this.currentMission) {
        this.currentMission = this.mission.index;
        this.updateMission(this.currentMission);
      }
      const remaining = this.mission.remaining;
      this.el.timer.textContent = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(Math.floor(remaining % 60)).padStart(2, '0')}`;
    }
    if (performance.now() > this.toastUntil && !this.shot) this.el.toastWrap.style.display = 'none';
    this.drawMinimap();
  }

  drawMinimap() {
    const ctx = this.ctx;
    const canvas = this.minimap;
    const w = canvas.width, h = canvas.height;
    const p = this.player.position;
    const span = 450;
    const scale = w / span;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#324d43'; ctx.fillRect(0, 0, w, h);
    // The water occupies the west edge and the beach a thin, pale seam.
    ctx.fillStyle = '#347f90'; ctx.fillRect(0, 0, w * .18, h);
    ctx.fillStyle = '#d0bd93'; ctx.fillRect(w * .18, 0, w * .055, h);
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.scale(scale, scale); ctx.translate(-p.x, -p.z);
    ctx.fillStyle = '#60704f'; ctx.fillRect(-80, -80, CITY_SPAN + 160, CITY_SPAN + 160);
    for (const x of ROAD_X) { ctx.fillStyle = '#d4c8ae'; ctx.fillRect(x - ROAD_HALF - 3, -100, ROAD_HALF * 2 + 6, CITY_SPAN + 200); }
    for (const z of ROAD_Z) { ctx.fillStyle = '#d4c8ae'; ctx.fillRect(-100, z - ROAD_HALF - 3, CITY_SPAN + 200, ROAD_HALF * 2 + 6); }
    ctx.fillStyle = '#4d5150';
    for (const x of ROAD_X) ctx.fillRect(x - ROAD_HALF, -100, ROAD_HALF * 2, CITY_SPAN + 200);
    for (const z of ROAD_Z) ctx.fillRect(-100, z - ROAD_HALF, CITY_SPAN + 200, ROAD_HALF * 2);
    ctx.fillStyle = '#fbf0d0';
    for (const car of this.traffic.traffic.slice(0, 18)) ctx.fillRect(car.model.position.x - 1.8, car.model.position.z - 2.8, 3.6, 5.6);
    ctx.fillStyle = '#f45749';
    for (const unit of this.traffic.police) ctx.fillRect(unit.model.position.x - 2.1, unit.model.position.z - 3, 4.2, 6);
    if (this.mission.index > 0 && this.mission.current().point) {
      ctx.strokeStyle = '#ffcf64'; ctx.lineWidth = 2.5 / scale; ctx.beginPath(); ctx.arc(...this.mission.current().point, 7, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    // Player marker always points the way the character or vehicle faces.
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(-this.player.inCar ? 0 : this.player.heading);
    ctx.fillStyle = '#ffe27c'; ctx.shadowColor = '#fff0a8'; ctx.shadowBlur = 9;
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 5); ctx.lineTo(0, 3); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill(); ctx.restore();
  }
}
