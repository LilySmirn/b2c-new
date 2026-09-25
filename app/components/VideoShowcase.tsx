"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import playIcon from "@/assets/images/landing/video-big.png";

const videoUrl = "https://vkvideo.ru/video_ext.php?oid=-232253508&id=456239018&hd=2";

export default function VideoShowcase() {
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);

  const playFullscreen = () => {
    setIsPlaying(true);

    if (playerRef.current?.requestFullscreen) {
      void playerRef.current.requestFullscreen().catch(() => {
        // Keep playing inline when fullscreen mode is unavailable or denied.
      });
    }
  };

  return (
    <section className="video-showcase-section" id="video">
      <div className="video-showcase">
        <div className="video-showcase-player" ref={playerRef}>
          <iframe
            src={`${videoUrl}${isPlaying ? "&autoplay=1" : ""}`}
            title="Видео-инструкция EasyMed"
            allow="autoplay; fullscreen; accelerometer; gyroscope; picture-in-picture; encrypted-media"
            frameBorder="0"
            scrolling="no"
            allowFullScreen
          />
          {!isPlaying && (
            <button
              className="video-showcase-play"
              type="button"
              onClick={() => setIsPlaying(true)}
              aria-label="Воспроизвести видео"
            >
              <Image src={playIcon} alt="" priority />
            </button>
          )}
        </div>

        <div className="video-showcase-copy">
          <span className="video-showcase-duration">2 МИНУТЫ</span>
          <h2>Посмотрите, как EasyMed<br />экономит ваше время</h2>
          <p>Короткая видео-инструкция покажет,<br />как быстро находить нужные рекомендации<br />и применять их в работе</p>
          <button className="video-showcase-button" type="button" onClick={playFullscreen}>
            Смотреть видео
          </button>
        </div>
      </div>
    </section>
  );
}