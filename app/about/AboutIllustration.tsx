import Image from "next/image";
import type { CSSProperties } from "react";
import screen from "@/assets/images/about/main-1.png";
import structured from "@/assets/images/about/main-2.png";
import json from "@/assets/images/about/main-3.png";
import analytics from "@/assets/images/about/main-4.png";
import api from "@/assets/images/about/main-5.png";
import styles from "./AboutIllustration.module.css";

// All positions and SVG paths share the same 1000 × 620 design canvas.
const cards = [
  { image: screen, name: "screen", x: 25, y: 180, width: 655, delay: 0 },
  { image: structured, name: "structured", x: 75, y: 10, width: 310, delay: 0.6 },
  { image: json, name: "json", x: 530, y: 10, width: 285, delay: 1.2 },
  { image: analytics, name: "analytics", x: 725, y: 215, width: 245, delay: 1.8 },
  { image: api, name: "api", x: 725, y: 430, width: 235, delay: 2.4 },
];

// Corner nodes sit at t = 0.5 on the quadratic bends, not at their control points.
const connections = [
  {
    name: "structured", delay: 0.6,
    path: "M 445 195 V 85 Q 445 65 425 65 H 365",
    nodes: [[445, 195], [440, 70], [365, 65]],
  },
  {
    name: "json", delay: 1.2,
    path: "M 490 195 V 120 Q 490 100 510 100 H 550",
    nodes: [[490, 195], [495, 105], [550, 100]],
  },
  {
    name: "analytics", delay: 1.8,
    path: "M 650 290 H 690 Q 705 290 705 275 V 115 Q 705 100 720 100 H 860 Q 875 100 875 115 V 275 Q 875 290 860 290 H 745",
    nodes: [[650, 290], [701.25, 286.25], [708.75, 103.75], [871.25, 103.75], [871.25, 286.25], [745, 290]],
  },
  {
    name: "api", delay: 2.4,
    path: "M 580 485 V 550 Q 580 570 600 570 H 685 Q 705 570 705 550 V 495 Q 705 480 720 480 H 745",
    nodes: [[580, 485], [585, 565], [700, 565], [708.75, 483.75], [745, 480]],
  },
];

export default function AboutIllustration() {
  return (
    <div className={`${styles.scene} ${styles.ready}`} aria-hidden="true">
      <svg className={styles.connections} viewBox="0 0 1000 620" fill="none">
        {connections.map((connection, index) => (
          <g key={connection.name} style={{ "--delay": `${connection.delay}s` } as CSSProperties}>
            <path className={styles.lineGlow} d={connection.path} pathLength="1" />
            <path className={styles.line} d={connection.path} pathLength="1" />
            <g className={styles.nodes}>
              {connection.nodes.map(([x, y], nodeIndex) => (
                <g key={`${x}-${y}`} className={nodeIndex > 0 && nodeIndex < connection.nodes.length - 1 ? styles.corner : undefined}>
                  <circle className={styles.nodeHalo} cx={x} cy={y} r="8" />
                  <circle className={styles.node} cx={x} cy={y} r="3.5" />
                </g>
              ))}
            </g>
            <circle
              className={styles.signal}
              r="3"
              style={{
                offsetPath: `path("${connection.path}")`,
                "--signal-delay": `${3.35 + index * 0.7}s`,
              } as CSSProperties}
            />
          </g>
        ))}
      </svg>
      {cards.map((card) => (
        <div
          key={card.name}
          className={`${styles.card} ${card.name === "screen" ? styles.screen : styles.smallCard}`}
          style={{
            left: `${card.x / 10}%`, top: `${card.y / 6.2}%`, width: `${card.width / 10}%`,
            "--delay": `${card.delay}s`,
            "--float-duration": `${4 + card.delay / 1.2}s`,
          } as CSSProperties}
        >
          <Image src={card.image} alt="" priority unoptimized draggable={false} />
        </div>
      ))}
    </div>
  );
}