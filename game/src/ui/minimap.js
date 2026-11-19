// Compact canvas map renderer: shoreline, city grid, moving agents, mission beacon and player arrow.
import { CITY_SPAN, ROAD_HALF, ROAD_X, ROAD_Z } from '../world/city-plan.js';

export class Minimap {
  constructor(canvas, player, traffic, mission) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.player = player;
    this.traffic = traffic;
    this.mission = mission;
    this.zoom = 460;
    this.cachedRoads = null;
  }

  draw() {
    const ctx = this.ctx, width = this.canvas.width, height = this.canvas.height;
    const scale = width / this.zoom;
    const player = this.player.position;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#405a47'; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#3b8190'; ctx.fillRect(0, 0, width * .17, height);
    ctx.fillStyle = '#cbb98d'; ctx.fillRect(width * .17, 0, width * .06, height);
    ctx.save(); ctx.translate(width / 2, height / 2); ctx.scale(scale, scale); ctx.translate(-player.x, -player.z);
    ctx.fillStyle = '#66744f'; ctx.fillRect(-60, -60, CITY_SPAN + 120, CITY_SPAN + 120);
    ctx.fillStyle = '#d3c4a7';
    for (const x of ROAD_X) ctx.fillRect(x - ROAD_HALF - 3, -60, ROAD_HALF * 2 + 6, CITY_SPAN + 120);
    for (const z of ROAD_Z) ctx.fillRect(-60, z - ROAD_HALF - 3, CITY_SPAN + 120, ROAD_HALF * 2 + 6);
    ctx.fillStyle = '#484e4c';
    for (const x of ROAD_X) ctx.fillRect(x - ROAD_HALF, -60, ROAD_HALF * 2, CITY_SPAN + 120);
    for (const z of ROAD_Z) ctx.fillRect(-60, z - ROAD_HALF, CITY_SPAN + 120, ROAD_HALF * 2);
    for (const agent of this.traffic.traffic) {
      ctx.fillStyle = agent.model.userData.kind === 'police' ? '#ff5547' : '#fff0cf';
      ctx.fillRect(agent.model.position.x - 2, agent.model.position.z - 3, 4, 6);
    }
    if (this.mission.index > 0 && this.mission.current().point) {
      const [x, z] = this.mission.current().point;
      ctx.strokeStyle = '#ffd46f'; ctx.lineWidth = 2 / scale;
      ctx.beginPath(); ctx.arc(x, z, 8, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    ctx.save(); ctx.translate(width / 2, height / 2);
    ctx.rotate(this.player.inCar ? -this.player.carHeading : -this.player.heading);
    ctx.fillStyle = '#ffe082'; ctx.shadowColor = '#ffe4a1'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 6); ctx.lineTo(0, 3); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}
